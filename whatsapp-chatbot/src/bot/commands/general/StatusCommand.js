/**
 * Comando para mostrar el estado del bot
 */
const Command = require("../core/Command");
const commandRegistry = require("../core/CommandRegistry");
const unifiedCommandHandler = require("../core/UnifiedCommandHandler");

class StatusCommand extends Command {
  get name() {
    return "status";
  }
  get description() {
    return "Muestra el estado actual del bot";
  }
  get syntax() {
    return "!status";
  }
  get aliases() {
    return ["estado", "info"];
  }
  get category() {
    return "general";
  }
  get cooldown() {
    return 10;
  } // 10 segundos de cooldown

  async execute(message, args, bot) {
    try {
      const registryStats = commandRegistry.getStats();
      const handlerStats = unifiedCommandHandler.getGlobalStats();
      const uptime = process.uptime();

      let statusText = "*🤖 Estado del Bot*\n\n";

      // Información general
      statusText += `*Tiempo activo:* ${this.formatUptime(uptime)}\n`;
      statusText += `*Memoria usada:* ${this.formatMemory(
        process.memoryUsage().heapUsed
      )}\n`;
      statusText += `*Versión Node.js:* ${process.version}\n\n`;

      // Estadísticas de comandos
      statusText += `*📊 Estadísticas de Comandos*\n`;
      statusText += `• Comandos cargados: ${registryStats.totalCommands}\n`;
      statusText += `• Aliases registrados: ${registryStats.totalAliases}\n`;
      statusText += `• Categorías: ${registryStats.categories}\n`;
      statusText += `• Ejecuciones totales: ${handlerStats.totalExecutions}\n`;
      statusText += `• Tasa de éxito: ${handlerStats.successRate}%\n`;
      statusText += `• Cooldowns activos: ${handlerStats.activeCooldowns}\n\n`;

      statusText += this.formatResponse(
        "Bot funcionando correctamente",
        "success"
      );

      await message.reply(statusText);
    } catch (error) {
      console.error("Error en comando status:", error);
      await message.reply(
        this.formatResponse("Error al obtener el estado del bot.", "error")
      );
    }
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;

    return result;
  }

  formatMemory(bytes) {
    const mb = (bytes / 1024 / 1024).toFixed(2);
    return `${mb} MB`;
  }
}

module.exports = StatusCommand;
