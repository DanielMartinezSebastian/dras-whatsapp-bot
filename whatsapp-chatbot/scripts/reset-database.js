#!/usr/bin/env node

/**
 * Script de Reset de Base de Datos
 * Remueve la base de datos existente y la recrea con los nuevos esquemas
 * para el Sistema de Registro de Nombres
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./src/database/users.db";
const BACKUP_PATH = `${DB_PATH}.backup.${Date.now()}`;

console.log("🔄 Script de Reset de Base de Datos - Sistema de Registro");
console.log("========================================================\n");

// Colores para output
const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m",
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function backupExistingDatabase() {
  if (fs.existsSync(DB_PATH)) {
    log("yellow", `📋 Creando backup de la base de datos existente...`);
    try {
      fs.copyFileSync(DB_PATH, BACKUP_PATH);
      log("green", `✅ Backup creado: ${BACKUP_PATH}`);
      return true;
    } catch (error) {
      log("red", `❌ Error creando backup: ${error.message}`);
      return false;
    }
  } else {
    log("blue", `ℹ️  No existe base de datos previa`);
    return true;
  }
}

async function removeOldDatabase() {
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      log("green", `✅ Base de datos anterior removida`);
    } catch (error) {
      log("red", `❌ Error removiendo base de datos: ${error.message}`);
      throw error;
    }
  }
}

async function createNewDatabase() {
  return new Promise((resolve, reject) => {
    // Asegurar que el directorio existe
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      log("blue", `📁 Directorio creado: ${dbDir}`);
    }

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        log("red", `❌ Error creando nueva base de datos: ${err.message}`);
        reject(err);
      } else {
        log("green", `✅ Nueva base de datos creada: ${DB_PATH}`);
        resolve(db);
      }
    });
  });
}

async function createTables(db) {
  log("blue", `📊 Creando tablas con esquemas actualizados...`);

  const tables = [
    // Tabla principal de usuarios CON SOPORTE PARA REGISTRO
    {
      name: "users",
      sql: `CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_jid TEXT UNIQUE NOT NULL,
        phone_number TEXT,
        display_name TEXT,
        profile_name TEXT,
        business_name TEXT,
        first_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        user_type TEXT DEFAULT 'customer', -- customer, provider, employee, admin, friend, familiar, block
        status TEXT DEFAULT 'pending_name', -- pending_name, active, blocked, archived
        language TEXT DEFAULT 'es',
        timezone TEXT,
        metadata TEXT, -- JSON string para datos adicionales (incluyendo flags de registro)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    },

    // Tabla de estados de conversación
    {
      name: "conversation_states",
      sql: `CREATE TABLE conversation_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        chat_jid TEXT NOT NULL,
        current_state TEXT DEFAULT 'idle', -- idle, waiting_response, processing, pending_name
        context_data TEXT, -- JSON string para contexto de la conversación
        last_command TEXT,
        session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
    },

    // Tabla de interacciones para analytics
    {
      name: "user_interactions",
      sql: `CREATE TABLE user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        interaction_type TEXT NOT NULL, -- message, command, media, registration, etc.
        content_summary TEXT,
        response_pattern TEXT, -- qué patrón del diccionario se activó
        processing_time INTEGER, -- tiempo en ms
        success BOOLEAN DEFAULT 1,
        error_message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
    },

    // Tabla de integración externa
    {
      name: "external_integrations",
      sql: `CREATE TABLE external_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        external_system TEXT NOT NULL, -- 'customers', 'providers', 'crm', etc.
        external_id TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending', -- pending, synced, error
        last_sync DATETIME,
        integration_data TEXT, -- JSON para datos específicos
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, external_system)
      )`,
    },

    // Tabla específica para seguimiento de registros de nombres
    {
      name: "registration_logs",
      sql: `CREATE TABLE registration_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        chat_jid TEXT NOT NULL,
        action_type TEXT NOT NULL, -- 'started', 'attempt', 'completed', 'failed', 'temp_assigned'
        attempt_number INTEGER DEFAULT 1,
        name_attempted TEXT,
        validation_result TEXT, -- JSON con detalles de validación
        error_message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
    },
  ];

  for (const table of tables) {
    try {
      await executeSQL(db, table.sql);
      log("green", `  ✅ Tabla '${table.name}' creada`);
    } catch (error) {
      log("red", `  ❌ Error creando tabla '${table.name}': ${error.message}`);
      throw error;
    }
  }
}

async function createIndexes(db) {
  log("blue", `📇 Creando índices optimizados...`);

  const indexes = [
    // Índices básicos
    "CREATE INDEX IF NOT EXISTS idx_users_jid ON users(whatsapp_jid)",
    "CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)",
    "CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type)",
    "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)", // NUEVO para registro
    "CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name)", // NUEVO

    // Índices para estados de conversación
    "CREATE INDEX IF NOT EXISTS idx_conversation_states_user ON conversation_states(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_conversation_states_chat ON conversation_states(chat_jid)",
    "CREATE INDEX IF NOT EXISTS idx_conversation_states_state ON conversation_states(current_state)", // NUEVO

    // Índices para interacciones
    "CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type)",
    "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON user_interactions(timestamp)",

    // Índices para integraciones externas
    "CREATE INDEX IF NOT EXISTS idx_external_user ON external_integrations(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_external_system ON external_integrations(external_system)",

    // Índices para logs de registro
    "CREATE INDEX IF NOT EXISTS idx_registration_logs_user ON registration_logs(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_registration_logs_jid ON registration_logs(chat_jid)",
    "CREATE INDEX IF NOT EXISTS idx_registration_logs_action ON registration_logs(action_type)",
    "CREATE INDEX IF NOT EXISTS idx_registration_logs_timestamp ON registration_logs(timestamp)",
  ];

  for (const indexSQL of indexes) {
    try {
      await executeSQL(db, indexSQL);
    } catch (error) {
      // Los índices pueden fallar si ya existen, no es crítico
      if (!error.message.includes("already exists")) {
        log("yellow", `  ⚠️ Warning creando índice: ${error.message}`);
      }
    }
  }

  log("green", `✅ Índices creados`);
}

async function insertTestData(db) {
  log("blue", `📝 Insertando datos de prueba...`);

  const testUsers = [
    {
      jid: "34600000001@s.whatsapp.net",
      phone: "34600000001",
      name: "Usuario Admin",
      type: "admin",
      status: "active",
    },
    {
      jid: "34600000002@s.whatsapp.net",
      phone: "34600000002",
      name: "María García",
      type: "customer",
      status: "active",
    },
    {
      jid: "34600000003@s.whatsapp.net",
      phone: "34600000003",
      name: null, // Usuario pendiente de registro
      type: "customer",
      status: "pending_name",
    },
  ];

  for (const user of testUsers) {
    try {
      const sql = `INSERT INTO users (
        whatsapp_jid, phone_number, display_name, user_type, status, 
        metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

      const metadata = JSON.stringify({
        test_user: true,
        created_by: "reset_script",
      });

      await executeSQL(db, sql, [
        user.jid,
        user.phone,
        user.name,
        user.type,
        user.status,
        metadata,
      ]);

      log(
        "green",
        `  ✅ Usuario de prueba: ${user.name || "Pendiente"} (${user.type})`
      );
    } catch (error) {
      log(
        "yellow",
        `  ⚠️ Error insertando usuario de prueba: ${error.message}`
      );
    }
  }
}

async function executeSQL(db, sql, params = []) {
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

async function verifyDatabase(db) {
  log("blue", `🔍 Verificando integridad de la base de datos...`);

  try {
    // Verificar integridad
    const integrityResult = await new Promise((resolve, reject) => {
      db.get("PRAGMA integrity_check", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (integrityResult && integrityResult.integrity_check === "ok") {
      log("green", `✅ Integridad verificada`);
    } else {
      log(
        "red",
        `❌ Problemas de integridad: ${integrityResult?.integrity_check}`
      );
    }

    // Verificar tablas
    const tables = await new Promise((resolve, reject) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type='table'",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    log("green", `✅ Tablas creadas: ${tables.map((t) => t.name).join(", ")}`);

    // Verificar datos de prueba
    const userCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    log("green", `✅ Usuarios de prueba: ${userCount}`);

    // Estadísticas por estado
    const statusStats = await new Promise((resolve, reject) => {
      db.all(
        "SELECT status, COUNT(*) as count FROM users GROUP BY status",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    log("blue", `📊 Estadísticas por estado:`);
    statusStats.forEach((stat) => {
      log("blue", `   ${stat.status}: ${stat.count} usuarios`);
    });
  } catch (error) {
    log("red", `❌ Error verificando base de datos: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    console.log(`🎯 Objetivo: Resetear base de datos con esquema actualizado`);
    console.log(`📍 Ubicación: ${DB_PATH}`);
    console.log(`🕒 Timestamp: ${new Date().toLocaleString("es-ES")}\n`);

    // Paso 1: Crear backup
    const backupSuccess = await backupExistingDatabase();
    if (!backupSuccess) {
      throw new Error("No se pudo crear backup de la base de datos");
    }

    // Paso 2: Remover base de datos antigua
    await removeOldDatabase();

    // Paso 3: Crear nueva base de datos
    const db = await createNewDatabase();

    // Paso 4: Crear tablas
    await createTables(db);

    // Paso 5: Crear índices
    await createIndexes(db);

    // Paso 6: Insertar datos de prueba
    await insertTestData(db);

    // Paso 7: Verificar todo
    await verifyDatabase(db);

    // Cerrar conexión
    await new Promise((resolve) => {
      db.close((err) => {
        if (err) {
          log("yellow", `⚠️ Warning cerrando DB: ${err.message}`);
        }
        resolve();
      });
    });

    console.log("\n" + "=".repeat(60));
    log("green", "🎉 RESET DE BASE DE DATOS COMPLETADO EXITOSAMENTE");
    console.log("=".repeat(60));

    console.log("\n📋 Resumen:");
    console.log(`   ✅ Base de datos resetada: ${DB_PATH}`);
    console.log(`   ✅ Backup creado: ${BACKUP_PATH}`);
    console.log(`   ✅ Esquemas actualizados para Sistema de Registro`);
    console.log(`   ✅ Datos de prueba insertados`);
    console.log(`   ✅ Índices optimizados creados`);

    console.log("\n🚀 Próximos pasos:");
    console.log("   1. Reiniciar el bot: npm run restart");
    console.log("   2. Probar registro con usuario nuevo");
    console.log("   3. Monitorear: ./monitor-registration.js");
    console.log("   4. Verificar logs: tail -f logs/chatbot.log");

    console.log("\n💡 Nota:");
    log(
      "yellow",
      "   Todos los usuarios existentes fueron marcados como pendientes de registro"
    );
    log(
      "yellow",
      "   El sistema solicitará nombres a usuarios sin nombres válidos"
    );
  } catch (error) {
    log("red", `\n💥 ERROR DURANTE EL RESET: ${error.message}`);
    console.error(error.stack);

    console.log("\n🔄 Para restaurar desde backup:");
    console.log(`   cp ${BACKUP_PATH} ${DB_PATH}`);

    process.exit(1);
  }
}

// Confirmación antes de proceder
console.log("⚠️  ADVERTENCIA: Este script eliminará la base de datos actual");
console.log("   Se creará un backup automáticamente");
console.log("   Todos los datos existentes se perderán (excepto el backup)");
console.log("");

// Si se ejecuta con --force, no pedir confirmación
if (process.argv.includes("--force")) {
  main();
} else {
  // Pedir confirmación
  process.stdout.write(
    '¿Continuar con el reset? (escriba "SI" para confirmar): '
  );

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (input) => {
    const answer = input.trim().toUpperCase();

    if (answer === "SI" || answer === "YES" || answer === "SÍ") {
      console.log("");
      main();
    } else {
      log("yellow", "❌ Reset cancelado por el usuario");
      process.exit(0);
    }
  });
}
