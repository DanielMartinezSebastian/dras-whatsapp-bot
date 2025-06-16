#!/usr/bin/env node

/**
 * Monitor del Sistema de Registro de Nombres
 * Proporciona métricas en tiempo real y alertas
 */

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || "./src/database/users.db";
const REFRESH_INTERVAL = 5000; // 5 segundos

console.log("📊 Monitor del Sistema de Registro de Nombres");
console.log("===============================================\n");

class RegistrationMonitor {
  constructor() {
    this.db = null;
    this.isRunning = false;
    this.stats = {};
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✅ Conectado a base de datos: ${DB_PATH}\n`);
          resolve();
        }
      });
    });
  }

  async getStats() {
    const queries = {
      // Estadísticas generales
      totalUsers: `SELECT COUNT(*) as count FROM users`,
      activeUsers: `SELECT COUNT(*) as count FROM users WHERE status = 'active'`,
      pendingUsers: `SELECT COUNT(*) as count FROM users WHERE status = 'pending_name'`,
      tempNames: `SELECT COUNT(*) as count FROM users WHERE metadata LIKE '%tempNameAssigned%'`,
      blockedUsers: `SELECT COUNT(*) as count FROM users WHERE status = 'blocked'`,

      // Registros recientes
      registersToday: `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE status = 'active' 
        AND date(created_at) = date('now')
      `,
      registersThisWeek: `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE status = 'active' 
        AND created_at >= date('now', '-7 days')
      `,

      // Problemas potenciales
      oldPending: `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE status = 'pending_name' 
        AND created_at < datetime('now', '-24 hours')
      `,

      // Tiempo promedio de registro
      avgRegistrationTime: `
        SELECT AVG((julianday(updated_at) - julianday(created_at)) * 24 * 60) as minutes
        FROM users 
        WHERE status = 'active' 
        AND updated_at > created_at
        AND created_at >= date('now', '-7 days')
      `,
    };

    const stats = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await this.executeQuery(query);
        stats[key] = result[0]?.count || result[0]?.minutes || 0;
      } catch (error) {
        console.error(`Error en query ${key}:`, error.message);
        stats[key] = 0;
      }
    }

    return stats;
  }

  executeQuery(sql) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getRecentActivity() {
    const query = `
      SELECT display_name, phone_number, status, created_at, updated_at
      FROM users 
      WHERE created_at >= datetime('now', '-1 hour')
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return await this.executeQuery(query);
  }

  async getProblemUsers() {
    const query = `
      SELECT display_name, phone_number, status, created_at, 
             (julianday('now') - julianday(created_at)) * 24 as hours_pending
      FROM users 
      WHERE status = 'pending_name' 
      AND created_at < datetime('now', '-2 hours')
      ORDER BY created_at ASC
    `;

    return await this.executeQuery(query);
  }

  displayStats(stats) {
    // Limpiar pantalla
    console.clear();

    const now = new Date().toLocaleString("es-ES");
    console.log("📊 Monitor del Sistema de Registro de Nombres");
    console.log(`🕒 Actualizado: ${now}\n`);

    // Estadísticas principales
    console.log("📈 ESTADÍSTICAS GENERALES");
    console.log("─".repeat(40));
    console.log(`👥 Total de usuarios:      ${stats.totalUsers}`);
    console.log(`✅ Usuarios activos:       ${stats.activeUsers}`);
    console.log(`⏳ Pendientes de nombre:   ${stats.pendingUsers}`);
    console.log(`🏷️  Nombres temporales:    ${stats.tempNames}`);
    console.log(`🚫 Usuarios bloqueados:    ${stats.blockedUsers}`);
    console.log("");

    // Actividad reciente
    console.log("📅 REGISTROS RECIENTES");
    console.log("─".repeat(40));
    console.log(`📆 Hoy:                    ${stats.registersToday}`);
    console.log(`📊 Esta semana:            ${stats.registersThisWeek}`);
    console.log(
      `⏱️  Tiempo promedio:        ${
        stats.avgRegistrationTime
          ? stats.avgRegistrationTime.toFixed(1) + " min"
          : "N/A"
      }`
    );
    console.log("");

    // Alertas
    console.log("🚨 ALERTAS");
    console.log("─".repeat(40));
    if (stats.oldPending > 0) {
      console.log(`⚠️  ${stats.oldPending} usuarios pendientes > 24h`);
    }
    if (stats.tempNames > 0) {
      console.log(`🏷️  ${stats.tempNames} usuarios con nombres temporales`);
    }
    if (stats.pendingUsers > 10) {
      console.log(`📊 Muchos usuarios pendientes (${stats.pendingUsers})`);
    }
    if (
      stats.oldPending === 0 &&
      stats.tempNames === 0 &&
      stats.pendingUsers <= 10
    ) {
      console.log("✅ Sin alertas - Sistema funcionando correctamente");
    }
    console.log("");

    // Ratios útiles
    const completionRate =
      stats.totalUsers > 0
        ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
        : 0;
    const tempNameRate =
      stats.activeUsers > 0
        ? ((stats.tempNames / stats.activeUsers) * 100).toFixed(1)
        : 0;

    console.log("📊 RATIOS CLAVE");
    console.log("─".repeat(40));
    console.log(`🎯 Tasa de completación:   ${completionRate}%`);
    console.log(`🏷️  Tasa de nombres temp:   ${tempNameRate}%`);
    console.log("");
  }

  async displayRecentActivity() {
    const activities = await this.getRecentActivity();

    if (activities.length > 0) {
      console.log("🕒 ACTIVIDAD RECIENTE (última hora)");
      console.log("─".repeat(60));
      activities.forEach((user) => {
        const time = new Date(user.created_at).toLocaleTimeString("es-ES");
        const name = user.display_name || "Sin nombre";
        const phone = user.phone_number || "Sin teléfono";
        const status =
          user.status === "active"
            ? "✅"
            : user.status === "pending_name"
            ? "⏳"
            : "❓";

        console.log(`${status} ${time} - ${name} (${phone})`);
      });
      console.log("");
    }
  }

  async displayProblems() {
    const problems = await this.getProblemUsers();

    if (problems.length > 0) {
      console.log("⚠️  USUARIOS CON PROBLEMAS");
      console.log("─".repeat(60));
      problems.forEach((user) => {
        const hours = user.hours_pending.toFixed(1);
        const phone = user.phone_number || "Sin teléfono";
        console.log(`⏰ ${hours}h pendiente - ${phone}`);
      });
      console.log("");
    }
  }

  async start() {
    this.isRunning = true;

    while (this.isRunning) {
      try {
        const stats = await this.getStats();
        this.displayStats(stats);

        await this.displayRecentActivity();
        await this.displayProblems();

        console.log("💡 Comandos disponibles:");
        console.log("   Ctrl+C - Salir");
        console.log("   r - Refrescar ahora");
        console.log(
          `   Actualización automática cada ${REFRESH_INTERVAL / 1000}s`
        );

        // Esperar intervalo
        await new Promise((resolve) => setTimeout(resolve, REFRESH_INTERVAL));
      } catch (error) {
        console.error("Error obteniendo estadísticas:", error.message);
        await new Promise((resolve) => setTimeout(resolve, REFRESH_INTERVAL));
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.db) {
      this.db.close();
    }
  }
}

// Configurar señales del sistema
const monitor = new RegistrationMonitor();

process.on("SIGINT", () => {
  console.log("\n\n👋 Cerrando monitor...");
  monitor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  monitor.stop();
  process.exit(0);
});

// Manejar input del teclado
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", (key) => {
  if (key.toString() === "r" || key.toString() === "R") {
    // Forzar refresh inmediato
    console.log("🔄 Refrescando...");
  }
});

// Iniciar monitor
async function main() {
  try {
    console.log("🚀 Iniciando monitor...");
    await monitor.init();
    await monitor.start();
  } catch (error) {
    console.error("❌ Error iniciando monitor:", error.message);
    process.exit(1);
  }
}

main();
