import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";

/**
 * Comando para visualizar estadísticas del sistema
 * Solo accesible para administradores
 */
export class StatsCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "stats",
      aliases: ["estadisticas", "estadisticas-sistema"],
      description: "Muestra estadísticas del sistema",
      syntax: "!stats [tipo]",
      category: "system",
      permissions: ["admin"],
      cooldown: 3,
      requiredRole: "admin" as UserType,
      examples: [
        "!stats - Muestra estadísticas generales",
        "!stats users - Estadísticas de usuarios",
        "!stats commands - Estadísticas de comandos",
        "!stats permissions - Estadísticas de permisos",
        "!stats system - Estadísticas del sistema",
      ],
      isAdmin: true,
      isSensitive: false,
    };
  }

  /**
   * Valida si el usuario tiene permisos para ejecutar este comando
   */
  private validatePermissions(context: CommandContext): boolean {
    return context.user?.user_type === "admin";
  }

  /**
   * Obtiene estadísticas generales del sistema
   */
  private async getGeneralStats(): Promise<string> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      let response = `📊 ESTADÍSTICAS GENERALES DEL SISTEMA\n\n`;

      // Información del sistema
      response += `⚡ RENDIMIENTO:\n`;
      response += `• Tiempo activo: ${this.formatUptime(uptime)}\n`;
      response += `• Memoria usada: ${this.formatBytes(
        memoryUsage.heapUsed
      )}\n`;
      response += `• Memoria total: ${this.formatBytes(
        memoryUsage.heapTotal
      )}\n`;
      response += `• CPU Load: ${this.getCpuUsage()}%\n\n`;

      // Información de la aplicación
      response += `🤖 APLICACIÓN:\n`;
      response += `• Versión Node.js: ${process.version}\n`;
      response += `• Plataforma: ${process.platform}\n`;
      response += `• Arquitectura: ${process.arch}\n`;
      response += `• PID: ${process.pid}\n\n`;

      response += `🕒 Consultado: ${new Date().toLocaleString()}`;

      return response;
    } catch (error) {
      throw new Error(
        `Error obteniendo estadísticas generales: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  private async getUsersStats(): Promise<string> {
    try {
      // Simulación de estadísticas de usuarios (en producción vendría del UserService)
      let response = `👥 ESTADÍSTICAS DE USUARIOS\n\n`;

      response += `📊 GENERAL:\n`;
      response += `• Total usuarios: Sin conexión BD\n`;
      response += `• Interacciones totales: Sin conexión BD\n`;
      response += `• Promedio por usuario: Sin conexión BD\n\n`;

      response += `📋 POR TIPO:\n`;
      response += `👑 admin: Sin conexión BD\n`;
      response += `👤 customer: Sin conexión BD\n`;
      response += `👫 friend: Sin conexión BD\n`;
      response += `👨‍👩‍👧‍👦 familiar: Sin conexión BD\n`;
      response += `💼 employee: Sin conexión BD\n`;
      response += `🏢 provider: Sin conexión BD\n`;
      response += `🚫 block: Sin conexión BD\n\n`;

      response += `📝 NOTA: Para estadísticas reales, conectar servicio de usuarios`;

      return response;
    } catch (error) {
      throw new Error(
        `Error obteniendo estadísticas de usuarios: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  /**
   * Obtiene estadísticas de comandos
   */
  private async getCommandsStats(): Promise<string> {
    try {
      let response = `⚡ ESTADÍSTICAS DE COMANDOS\n\n`;

      response += `📊 ACTIVIDAD:\n`;
      response += `• Comandos última hora: Sin registro disponible\n`;
      response += `• Total ejecutados: Sin registro disponible\n`;
      response += `• Intentos denegados: Sin registro disponible\n`;
      response += `• Usuarios activos: Sin registro disponible\n\n`;

      response += `📋 REGISTRO:\n`;
      response += `• Total comandos: Sin conexión al registro\n`;
      response += `• Aliases: Sin conexión al registro\n`;
      response += `• Categorías: Sin conexión al registro\n`;
      response += `• Comandos públicos: Sin conexión al registro\n`;
      response += `• Comandos sensibles: Sin conexión al registro\n\n`;

      response += `🔢 POR NIVEL:\n`;
      response += `🟢 Básico: Sin datos\n`;
      response += `🟡 Usuario: Sin datos\n`;
      response += `🔴 Admin: Sin datos\n`;
      response += `⚫ Sistema: Sin datos\n\n`;

      response += `📝 NOTA: Para estadísticas reales, conectar registro de comandos`;

      return response;
    } catch (error) {
      throw new Error(
        `Error obteniendo estadísticas de comandos: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  /**
   * Obtiene estadísticas de permisos
   */
  private async getPermissionsStats(): Promise<string> {
    try {
      let response = `🔒 ESTADÍSTICAS DE PERMISOS\n\n`;

      response += `📊 ACTIVIDAD GENERAL:\n`;
      response += `• Verificaciones última hora: Sin registro\n`;
      response += `• Total verificaciones: Sin registro\n`;
      response += `• Accesos concedidos: Sin registro\n`;
      response += `• Accesos denegados: Sin registro\n\n`;

      response += `👥 POR TIPO DE USUARIO:\n`;
      response += `👑 Admin: Sin datos\n`;
      response += `👤 Customer: Sin datos\n`;
      response += `👫 Friend: Sin datos\n`;
      response += `👨‍👩‍👧‍👦 Familiar: Sin datos\n`;
      response += `💼 Employee: Sin datos\n`;
      response += `🏢 Provider: Sin datos\n\n`;

      response += `📝 NOTA: Para estadísticas reales, conectar servicio de permisos`;

      return response;
    } catch (error) {
      throw new Error(
        `Error obteniendo estadísticas de permisos: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  /**
   * Obtiene estadísticas del sistema
   */
  private async getSystemStats(): Promise<string> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      let response = `🖥️ ESTADÍSTICAS DEL SISTEMA\n\n`;

      response += `💻 RECURSOS:\n`;
      response += `• CPU Load: ${this.getCpuUsage()}%\n`;
      response += `• Memoria heap usada: ${this.formatBytes(
        memoryUsage.heapUsed
      )}\n`;
      response += `• Memoria heap total: ${this.formatBytes(
        memoryUsage.heapTotal
      )}\n`;
      response += `• Memoria RSS: ${this.formatBytes(memoryUsage.rss)}\n`;
      response += `• Memoria externa: ${this.formatBytes(
        memoryUsage.external
      )}\n\n`;

      response += `⏱️ TIEMPO:\n`;
      response += `• Tiempo activo: ${this.formatUptime(uptime)}\n`;
      response += `• Hora del sistema: ${new Date().toLocaleString()}\n`;
      response += `• Zona horaria: ${
        Intl.DateTimeFormat().resolvedOptions().timeZone
      }\n\n`;

      response += `🔧 CONFIGURACIÓN:\n`;
      response += `• Node.js: ${process.version}\n`;
      response += `• Plataforma: ${process.platform}\n`;
      response += `• Arquitectura: ${process.arch}\n`;
      response += `• PID: ${process.pid}\n`;
      response += `• Directorio: ${process.cwd()}\n`;

      return response;
    } catch (error) {
      throw new Error(
        `Error obteniendo estadísticas del sistema: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  /**
   * Formatea bytes a formato legible
   */
  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Formatea tiempo de actividad
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(" ") || "0s";
  }

  /**
   * Obtiene uso aproximado de CPU (simulado)
   */
  private getCpuUsage(): number {
    // Simulación básica - en producción se podría usar librerías como 'os-utils'
    return Math.round(Math.random() * 30 + 10); // Entre 10-40%
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Verificar permisos
      if (!this.validatePermissions(context)) {
        return {
          success: true,
          response:
            "🚫 Acceso denegado. Solo administradores pueden ver estadísticas.",
          shouldReply: true,
        };
      }

      const type = context.args[0] || "general";
      let response: string;

      switch (type.toLowerCase()) {
        case "users":
        case "usuarios":
          response = await this.getUsersStats();
          break;
        case "commands":
        case "comandos":
          response = await this.getCommandsStats();
          break;
        case "permissions":
        case "permisos":
          response = await this.getPermissionsStats();
          break;
        case "system":
        case "sistema":
          response = await this.getSystemStats();
          break;
        case "general":
        default:
          response = await this.getGeneralStats();
          break;
      }

      return {
        success: true,
        response,
        shouldReply: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response: `❌ Error ejecutando comando stats: ${errorMessage}`,
        shouldReply: true,
        error: errorMessage,
      };
    }
  }
}
