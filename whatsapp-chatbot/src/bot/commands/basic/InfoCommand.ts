import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandCategory,
} from "../../../types/commands";

/**
 * Comando info - Información del bot y sistema
 * Muestra estadísticas básicas del sistema y tiempo de actividad
 */
export class InfoCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "info",
      aliases: ["information", "about"],
      description: "Muestra información del bot y estadísticas del sistema",
      syntax: "!info",
      category: "basic" as CommandCategory,
      permissions: ["user"],
      cooldown: 5,
      examples: ["!info"],
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const startTime = this.getSystemStartTime();
      const uptime = this.formatUptime(Date.now() - startTime.getTime());

      let response = "🤖 **drasBot - Información del Sistema**\n\n";

      response += "📊 **Estadísticas Generales:**\n";
      response += `• Tiempo activo: ${uptime}\n`;
      response += `• Versión: 2.0.0 (Sistema TypeScript)\n`;
      response += `• Estado: 🟢 Operativo\n\n`;

      response += "🏗️ **Arquitectura:**\n";
      response += `• Sistema de comandos: Modular TypeScript\n`;
      response += `• Base de datos: SQLite\n`;
      response += `• Procesamiento: Node.js + TypeScript\n\n`;

      response += "🔧 **Funcionalidades:**\n";
      response += `• ✅ Gestión de usuarios y permisos\n`;
      response += `• ✅ Sistema de comandos dinámico\n`;
      response += `• ✅ Registro y autenticación\n`;
      response += `• ✅ Logs y monitoreo\n`;
      response += `• ✅ Panel administrativo\n`;
      response += `• ✅ Migración a TypeScript\n\n`;

      response +=
        "💡 **Comandos disponibles:** Usa `!help` para ver la lista completa\n";
      response += "📞 **Soporte:** Contacta al administrador del sistema";

      return this.createSuccessResult(response);
    } catch (error) {
      return this.createErrorResult(
        `Error obteniendo información del sistema: ${error}`
      );
    }
  }

  private getSystemStartTime(): Date {
    // Try to get the actual bot start time, fallback to current process start
    try {
      // If we have access to the bot processor or global start time
      const globalStartTime = (global as any).botStartTime;
      if (globalStartTime) {
        return new Date(globalStartTime);
      }
    } catch (error) {
      // Fallback to process start time estimation
    }

    // Estimate process start time (not perfect but reasonable)
    const processUptime = process.uptime() * 1000; // Convert to milliseconds
    return new Date(Date.now() - processUptime);
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
