#!/usr/bin/env node

/**
 * Script de migración para actualizar la base de datos
 * Agrega soporte para el sistema de registro de nombres
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./src/database/users.db";

console.log("🔄 Iniciando migración de base de datos...");
console.log(`📁 Ruta de la base de datos: ${DB_PATH}`);

// Asegurar que el directorio existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Directorio creado: ${dbDir}`);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Error conectando a la base de datos:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Conectado a la base de datos");
  }
});

// Función para ejecutar SQL con promesa
function runSQL(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Función para verificar si una columna existe
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const exists = rows.some((row) => row.name === columnName);
        resolve(exists);
      }
    });
  });
}

async function migrate() {
  try {
    console.log("🔄 Ejecutando migraciones...");

    // 1. Verificar y actualizar el estado por defecto de usuarios
    console.log("📝 Verificando esquema de usuarios...");

    // Verificar si la tabla users existe
    const tableExists = await new Promise((resolve, reject) => {
      db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`,
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (!tableExists) {
      console.log("🏗️ Creando tabla de usuarios...");
      await runSQL(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_jid TEXT UNIQUE NOT NULL,
        phone_number TEXT,
        display_name TEXT,
        profile_name TEXT,
        business_name TEXT,
        first_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        user_type TEXT DEFAULT 'customer',
        status TEXT DEFAULT 'pending_name',
        language TEXT DEFAULT 'es',
        timezone TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log("✅ Tabla users creada");
    } else {
      console.log("✅ Tabla users existe");
    }

    // 2. Actualizar usuarios existentes sin nombres válidos
    console.log("🔄 Actualizando usuarios existentes...");

    // Marcar usuarios que necesitan registro de nombre
    await runSQL(`
      UPDATE users 
      SET status = 'pending_name', 
          updated_at = CURRENT_TIMESTAMP 
      WHERE (
        display_name IS NULL 
        OR display_name = phone_number 
        OR display_name LIKE '%Usuario_%'
        OR length(replace(display_name, ' ', '')) < 2
      ) 
      AND status != 'blocked'
    `);

    const updatedUsers = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM users WHERE status = 'pending_name'`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    console.log(`📝 ${updatedUsers} usuarios marcados para registro de nombre`);

    // 3. Crear índices adicionales si no existen
    console.log("🔄 Creando índices...");

    try {
      await runSQL(
        `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`
      );
      await runSQL(
        `CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name)`
      );
      console.log("✅ Índices creados");
    } catch (error) {
      console.log("⚠️ Algunos índices ya existían:", error.message);
    }

    // 4. Verificar otras tablas necesarias
    console.log("🔄 Verificando tablas complementarias...");

    // Tabla de estados de conversación
    await runSQL(`CREATE TABLE IF NOT EXISTS conversation_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      chat_jid TEXT NOT NULL,
      current_state TEXT DEFAULT 'idle',
      context_data TEXT,
      last_command TEXT,
      session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Tabla de interacciones
    await runSQL(`CREATE TABLE IF NOT EXISTS user_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      interaction_type TEXT NOT NULL,
      content_summary TEXT,
      response_pattern TEXT,
      processing_time INTEGER,
      success BOOLEAN DEFAULT 1,
      error_message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    console.log("✅ Tablas complementarias verificadas");

    // 5. Limpiar datos inconsistentes
    console.log("🧹 Limpiando datos inconsistentes...");

    // Limpiar nombres que son solo números
    await runSQL(`
      UPDATE users 
      SET display_name = NULL, 
          status = 'pending_name',
          updated_at = CURRENT_TIMESTAMP
      WHERE display_name REGEXP '^[0-9]+$'
      AND status != 'blocked'
    `);

    // 6. Estadísticas finales
    console.log("📊 Generando estadísticas...");

    const stats = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          status,
          COUNT(*) as count
        FROM users 
        GROUP BY status
      `,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log("\n📊 Estadísticas de usuarios por estado:");
    stats.forEach((stat) => {
      console.log(`   ${stat.status}: ${stat.count} usuarios`);
    });

    console.log("\n✅ Migración completada exitosamente!");
    console.log("\n📝 Próximos pasos:");
    console.log("   1. Reinicia el bot para cargar los nuevos servicios");
    console.log(
      "   2. Los usuarios existentes serán solicitados para registrar su nombre"
    );
    console.log(
      "   3. Los nuevos usuarios pasarán por el flujo de registro automático"
    );
  } catch (error) {
    console.error("❌ Error durante la migración:", error.message);
    throw error;
  }
}

// Ejecutar migración
migrate()
  .then(() => {
    db.close((err) => {
      if (err) {
        console.error("❌ Error cerrando base de datos:", err.message);
      } else {
        console.log("🔒 Base de datos cerrada");
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error("❌ Migración fallida:", error);
    db.close();
    process.exit(1);
  });
