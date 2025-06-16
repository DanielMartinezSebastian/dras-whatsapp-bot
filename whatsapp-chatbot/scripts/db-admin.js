#!/usr/bin/env node

const UserService = require("../src/services/userService");
const { logInfo, logError } = require("../src/utils/logger");

class DatabaseAdmin {
  constructor() {
    this.userService = new UserService();
  }

  async init() {
    await this.userService.initializeService();
  }

  async showStats() {
    try {
      const stats = await this.userService.getServiceStats();

      console.log("\n📊 ESTADÍSTICAS DE BASE DE DATOS:");
      console.log("═".repeat(50));
      console.log(`👥 Total usuarios: ${stats.totalUsers}`);
      console.log(`💬 Conversaciones activas: ${stats.activeConversations}`);
      console.log(`📈 Interacciones hoy: ${stats.todayInteractions}`);
      console.log("\n👤 Usuarios por tipo:");

      if (stats.usersByType && stats.usersByType.length > 0) {
        stats.usersByType.forEach((type) => {
          console.log(`   • ${type.user_type}: ${type.count}`);
        });
      } else {
        console.log("   • No hay datos disponibles");
      }
    } catch (error) {
      logError(`❌ Error obteniendo estadísticas: ${error.message}`);
    }
  }

  async listUsers(limit = 10) {
    try {
      const users = await this.userService.getAllUsers({ limit });

      console.log(`\n👥 ÚLTIMOS ${users.length} USUARIOS:`);
      console.log("═".repeat(80));

      if (users.length === 0) {
        console.log("No hay usuarios registrados.");
        return;
      }

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.whatsapp_jid}`);
        console.log(`   📞 ${user.phone_number || "Sin teléfono"}`);
        console.log(`   👤 ${user.display_name || "Sin nombre"}`);
        console.log(
          `   🏷️  ${user.user_type} | 📊 ${user.total_messages} mensajes`
        );
        console.log(
          `   📅 ${new Date(user.first_interaction).toLocaleString()}`
        );
        console.log("─".repeat(40));
      });
    } catch (error) {
      logError(`❌ Error listando usuarios: ${error.message}`);
    }
  }

  async exportUsers() {
    try {
      const users = await this.userService.getAllUsers();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `exports/users_export_${timestamp}.json`;

      const fs = require("fs");
      const path = require("path");

      // Crear directorio si no existe
      const exportDir = path.dirname(filename);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Exportar datos
      fs.writeFileSync(filename, JSON.stringify(users, null, 2));

      console.log(`\n📤 EXPORTACIÓN COMPLETADA:`);
      console.log(`   📁 Archivo: ${filename}`);
      console.log(`   👥 Usuarios exportados: ${users.length}`);
    } catch (error) {
      logError(`❌ Error exportando usuarios: ${error.message}`);
    }
  }

  async linkUserToExternal(jid, system, externalId) {
    try {
      const success = await this.userService.linkExternalId(
        jid,
        system,
        externalId,
        {
          linkedBy: "admin",
          linkedAt: new Date().toISOString(),
        }
      );

      if (success) {
        console.log(`✅ Usuario ${jid} vinculado con ${system}:${externalId}`);
      } else {
        console.log(`❌ Error vinculando usuario ${jid}`);
      }
    } catch (error) {
      logError(`❌ Error vinculando usuario: ${error.message}`);
    }
  }

  async findUserByPhone(phone) {
    try {
      const users = await this.userService.getAllUsers();
      const user = users.find((u) => u.phone_number === phone);

      if (user) {
        console.log(`\n👤 USUARIO ENCONTRADO:`);
        console.log(`   📱 JID: ${user.whatsapp_jid}`);
        console.log(`   📞 Teléfono: ${user.phone_number}`);
        console.log(`   👤 Nombre: ${user.display_name || "Sin nombre"}`);
        console.log(`   🏷️  Tipo: ${user.user_type}`);
        console.log(`   📊 Mensajes: ${user.total_messages}`);
        console.log(
          `   📅 Primera interacción: ${new Date(
            user.first_interaction
          ).toLocaleString()}`
        );
        console.log(
          `   🕐 Última interacción: ${new Date(
            user.last_interaction
          ).toLocaleString()}`
        );
      } else {
        console.log(`❌ No se encontró usuario con teléfono: ${phone}`);
      }
    } catch (error) {
      logError(`❌ Error buscando usuario: ${error.message}`);
    }
  }

  async cleanup() {
    try {
      await this.userService.userModel.cleanupExpiredStates();
      console.log("✅ Limpieza de estados expirados completada");
    } catch (error) {
      logError(`❌ Error en limpieza: ${error.message}`);
    }
  }

  async listUsersByType(userType) {
    try {
      const users = await this.userService.getUsersByType(userType);
      const UserModel = require("../src/database/models/user");

      console.log(
        `\n👥 USUARIOS TIPO: ${userType.toUpperCase()} (${UserModel.getUserTypeDescription(
          userType
        )})`
      );
      console.log("═".repeat(80));

      if (users.length === 0) {
        console.log(`No hay usuarios registrados como ${userType}.`);
        return;
      }

      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.whatsapp_jid}`);
        console.log(`   📞 ${user.phone_number}`);
        console.log(`   👤 ${user.display_name}`);
        console.log(`   📅 ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   💬 ${user.total_messages} mensajes`);
        console.log("─".repeat(40));
      });
    } catch (error) {
      logError(`❌ Error listando usuarios por tipo: ${error.message}`);
    }
  }

  async changeUserType(jid, newType) {
    try {
      const UserModel = require("../src/database/models/user");

      if (!UserModel.isValidUserType(newType)) {
        console.log(`❌ Tipo de usuario inválido: ${newType}`);
        console.log(
          `Tipos válidos: ${UserModel.getValidUserTypes().join(", ")}`
        );
        return;
      }

      const user = await this.userService.userModel.getUserByJid(jid);
      if (!user) {
        console.log(`❌ Usuario no encontrado: ${jid}`);
        return;
      }

      const oldType = user.user_type;
      await this.userService.reclassifyUser(jid, newType, "admin_change");

      console.log(`✅ Usuario reclasificado:`);
      console.log(`   JID: ${jid}`);
      console.log(
        `   Tipo anterior: ${oldType} (${UserModel.getUserTypeDescription(
          oldType
        )})`
      );
      console.log(
        `   Tipo nuevo: ${newType} (${UserModel.getUserTypeDescription(
          newType
        )})`
      );
    } catch (error) {
      logError(`❌ Error cambiando tipo de usuario: ${error.message}`);
    }
  }

  async blockUser(jid, reason = "admin_block") {
    try {
      const user = await this.userService.userModel.getUserByJid(jid);
      if (!user) {
        console.log(`❌ Usuario no encontrado: ${jid}`);
        return;
      }

      if (user.user_type === "block") {
        console.log(`⚠️ El usuario ya está bloqueado: ${jid}`);
        return;
      }

      const oldType = user.user_type;
      await this.userService.blockUser(jid, reason);

      console.log(`🚫 Usuario bloqueado:`);
      console.log(`   JID: ${jid}`);
      console.log(`   Tipo anterior: ${oldType}`);
      console.log(`   Razón: ${reason}`);
    } catch (error) {
      logError(`❌ Error bloqueando usuario: ${error.message}`);
    }
  }

  async unblockUser(jid, newType = "customer") {
    try {
      const user = await this.userService.userModel.getUserByJid(jid);
      if (!user) {
        console.log(`❌ Usuario no encontrado: ${jid}`);
        return;
      }

      if (user.user_type !== "block") {
        console.log(
          `⚠️ El usuario no está bloqueado: ${jid} (tipo actual: ${user.user_type})`
        );
        return;
      }

      await this.userService.unblockUser(jid, newType);

      console.log(`✅ Usuario desbloqueado:`);
      console.log(`   JID: ${jid}`);
      console.log(`   Nuevo tipo: ${newType}`);
    } catch (error) {
      logError(`❌ Error desbloqueando usuario: ${error.message}`);
    }
  }

  async showUserTypes() {
    const UserModel = require("../src/database/models/user");
    const userTypes = UserModel.getUserTypes();

    console.log(`\n📋 TIPOS DE USUARIO DISPONIBLES:`);
    console.log("═".repeat(50));

    Object.entries(userTypes).forEach(([key, value]) => {
      console.log(
        `• ${value.padEnd(12)} - ${UserModel.getUserTypeDescription(value)}`
      );
    });

    console.log("\n📊 USUARIOS POR TIPO:");
    console.log("─".repeat(30));

    try {
      for (const [key, type] of Object.entries(userTypes)) {
        const users = await this.userService.getUsersByType(type);
        console.log(`${type.padEnd(12)}: ${users.length} usuarios`);
      }
    } catch (error) {
      logError(`❌ Error obteniendo estadísticas por tipo: ${error.message}`);
    }
  }

  showHelp() {
    console.log(`
🗃️  ADMINISTRADOR DE BASE DE DATOS - WHATSAPP CHATBOT
═══════════════════════════════════════════════════════

COMANDOS DISPONIBLES:

📊 node scripts/db-admin.js stats
   Mostrar estadísticas de la base de datos

👥 node scripts/db-admin.js list [número]
   Listar usuarios (por defecto 10, máximo especificado)

📤 node scripts/db-admin.js export
   Exportar todos los usuarios a JSON

🔗 node scripts/db-admin.js link <jid> <sistema> <id_externo>
   Vincular usuario con sistema externo
   Ejemplo: link 34123456789@s.whatsapp.net customers CRM123

🔍 node scripts/db-admin.js find-phone <teléfono>
   Buscar usuario por número de teléfono
   Ejemplo: find-phone 34123456789

🧹 node scripts/db-admin.js cleanup
   Limpiar estados de conversación expirados

👤 node scripts/db-admin.js by-type <tipo>
   Listar usuarios por tipo

🔄 node scripts/db-admin.js change-type <jid> <nuevo_tipo>
   Cambiar tipo de usuario

🚫 node scripts/db-admin.js block <jid> [razón]
   Bloquear usuario

✅ node scripts/db-admin.js unblock <jid> [nuevo_tipo]
   Desbloquear usuario

📋 node scripts/db-admin.js user-types
   Mostrar tipos de usuario disponibles

❓ node scripts/db-admin.js help
   Mostrar esta ayuda

EJEMPLOS:
  node scripts/db-admin.js stats
  node scripts/db-admin.js list 20
  node scripts/db-admin.js find-phone 34612345678
  node scripts/db-admin.js link 34612345678@s.whatsapp.net customers CRM_001
  node scripts/db-admin.js by-type customer
  node scripts/db-admin.js change-type 34612345678@s.whatsapp.net admin
  node scripts/db-admin.js block 34612345678@s.whatsapp.net "Razón del bloqueo"
  node scripts/db-admin.js unblock 34612345678@s.whatsapp.net
`);
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
      this.showHelp();
      return;
    }

    await this.init();

    try {
      switch (command) {
        case "stats":
          await this.showStats();
          break;

        case "list":
          const limit = parseInt(args[1]) || 10;
          await this.listUsers(limit);
          break;

        case "export":
          await this.exportUsers();
          break;

        case "link":
          if (args.length < 4) {
            console.log("❌ Uso: link <jid> <sistema> <id_externo>");
            break;
          }
          await this.linkUserToExternal(args[1], args[2], args[3]);
          break;

        case "find-phone":
          if (!args[1]) {
            console.log("❌ Uso: find-phone <teléfono>");
            break;
          }
          await this.findUserByPhone(args[1]);
          break;

        case "cleanup":
          await this.cleanup();
          break;

        case "by-type":
          if (!args[1]) {
            console.log("❌ Uso: by-type <tipo>");
            break;
          }
          await this.listUsersByType(args[1]);
          break;

        case "change-type":
          if (args.length < 3) {
            console.log("❌ Uso: change-type <jid> <nuevo_tipo>");
            break;
          }
          await this.changeUserType(args[1], args[2]);
          break;

        case "block":
          await this.blockUser(args[1], args[2]);
          break;

        case "unblock":
          await this.unblockUser(args[1], args[2]);
          break;

        case "user-types":
          await this.showUserTypes();
          break;

        case "help":
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      logError(`❌ Error ejecutando comando: ${error.message}`);
    } finally {
      await this.userService.close();
      process.exit(0);
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  const admin = new DatabaseAdmin();
  admin.run().catch(console.error);
}

module.exports = DatabaseAdmin;
