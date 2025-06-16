/**
 * Comando para mostrar información del bot
 * Migrado desde CommandHandler.handleInfoCommand
 */
const Command = require("../core/Command");

class InfoCommand extends Command {
  get name() {
    return "info";
  }
  get description() {
    return "Muestra información detallada del bot";
  }
  get syntax() {
    return "!info";
  }
  get aliases() {
    return ["informacion", "bot-info"];
  }
  get category() {
    return "general";
  }
  get cooldown() {
    return 5;
  }

  async execute(message, args, bot) {
    try {
      const uptime = this.formatUptime(process.uptime() * 1000);
      const userCount = await this.getUserCount(bot);
      const stats = bot.getStats ? bot.getStats() : null;

      let infoText = `🤖 *Información del Bot*\n\n`;

      infoText += `📋 *Detalles:*\n`;
      infoText += `• Nombre: ${process.env.BOT_NAME || "DrasBot"}\n`;
      infoText += `• Versión: 2.0 Modular (Nuevo Sistema)\n`;
      infoText += `• Estado: ✅ Activo\n`;
      infoText += `• Uptime: ${uptime}\n\n`;

      infoText += `🔧 *Configuración:*\n`;
      infoText += `• Servidor: Local seguro\n`;
      infoText += `• Acceso: Solo localhost\n`;
      infoText += `• Auto-reply: ✅ Activo\n`;
      infoText += `• Sistema Anti-spam: ✅ Activo\n\n`;

      infoText += `📊 *Estadísticas:*\n`;
      infoText += `• Usuarios registrados: ${userCount}\n`;
      infoText += `• Mensajes procesados: ${
        stats ? stats.processedMessages : "N/A"
      }\n`;

      // Estadísticas del nuevo sistema de comandos
      if (stats && stats.newCommandSystem) {
        infoText += `• Comandos disponibles: ${stats.newCommandSystem.registryStats.totalCommands}\n`;
        infoText += `• Ejecuciones de comandos: ${stats.newCommandSystem.handlerStats.totalExecutions}\n`;
      }

      infoText += `\n💻 *Sistema:*\n`;
      infoText += `• Node.js: ${process.version}\n`;
      infoText += `• Memoria: ${Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024
      )}MB\n`;
      infoText += `• Plataforma: ${process.platform}\n`;

      // Información adicional del nuevo sistema
      if (stats && stats.newCommandSystem) {
        infoText += `\n🆕 *Nuevo Sistema de Comandos:*\n`;
        infoText += `• Estado: ${
          stats.newCommandSystem.enabled ? "✅ Activo" : "⚠️ Inactivo"
        }\n`;
        infoText += `• Prefijo: ${stats.newCommandSystem.commandPrefix}\n`;
        infoText += `• Tasa de éxito: ${stats.newCommandSystem.handlerStats.successRate}%\n`;
      }

      await message.reply(infoText);
    } catch (error) {
      console.error("Error en comando info:", error);
      await message.reply(
        this.formatResponse("Error al obtener información del bot.", "error")
      );
    }
  }

  formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;

    return result;
  }

  async getUserCount(bot) {
    try {
      if (
        bot.userService &&
        typeof bot.userService.getUserCount === "function"
      ) {
        return await bot.userService.getUserCount();
      }
      return "N/A";
    } catch (error) {
      console.error("Error obteniendo conteo de usuarios:", error);
      return "Error";
    }
  }
}

module.exports = InfoCommand;
