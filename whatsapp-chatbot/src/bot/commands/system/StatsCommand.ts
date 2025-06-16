import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando para visualizar estadísticas del sistema
 * Solo accesible para administradores
 */
export class StatsCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "stats",
      aliases: ["estadisticas", "estadisticas-sistema"],
      description: this.getConfigMessage(
        "stats.description",
        {},
        "Muestra estadísticas del sistema"
      ),
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
   * Obtiene un mensaje de configuración con variables reemplazadas
   */
  private getConfigMessage(
    path: string,
    variables?: Record<string, any>,
    fallback?: string
  ): string {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        return fallback || "Configuración no disponible";
      }

      // Obtener mensaje desde commands
      let message = this.getValueByPath(config, `commands.${path}`);

      // Si aún no se encuentra, usar fallback
      if (!message) {
        return fallback || `Mensaje no configurado: ${path}`;
      }

      // Si es un array, tomar un elemento aleatorio
      if (Array.isArray(message)) {
        message = message[Math.floor(Math.random() * message.length)];
      }

      // Reemplazar variables si se proporcionan
      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables);
      }

      return message;
    } catch (error) {
      console.error(
        `Error obteniendo mensaje configurado para ${path}: ${
          error instanceof Error ? error.message : error
        }`
      );
      return fallback || "Error en configuración";
    }
  }

  /**
   * Reemplaza variables en un template de mensaje
   */
  private replaceVariables(template: string, variables: Record<string, any> = {}): string {
    if (typeof template !== 'string') {
      return String(template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  /**
   * Obtiene una ruta de configuración por path anidado
   */
  private getValueByPath(obj: any, path?: string): any {
    if (!path) {
      const config = this.configService.getConfiguration();
      return config;
    }
    const config = this.configService.getConfiguration();
    return path.split(".").reduce((current, key) => current?.[key], config as any);
  }

  /**
   * Obtiene estadísticas generales del sistema
   */
  private async getGeneralStats(): Promise<string> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      // Obtener configuración de respuesta
      const responseConfig = this.getValueByPath("stats.response.general");

      // Variables para plantillas
      const variables = {
        uptime: this.formatUptime(uptime),
        memoryUsed: this.formatBytes(memoryUsage.heapUsed),
        memoryTotal: this.formatBytes(memoryUsage.heapTotal),
        cpuLoad: this.getCpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        timestamp: new Date().toLocaleString()
      };

      // Construir respuesta usando configuración
      let response = this.replaceVariables(
        responseConfig?.title || "📊 ESTADÍSTICAS GENERALES DEL SISTEMA",
        variables
      ) + "\n\n";

      // Sección de rendimiento
      if (responseConfig?.sections?.performance) {
        response += this.replaceVariables(responseConfig.sections.performance.title, variables) + "\n";
        if (responseConfig.sections.performance.items) {
          for (const item of responseConfig.sections.performance.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Sección de aplicación
      if (responseConfig?.sections?.application) {
        response += this.replaceVariables(responseConfig.sections.application.title, variables) + "\n";
        if (responseConfig.sections.application.items) {
          for (const item of responseConfig.sections.application.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Footer
      if (responseConfig?.sections?.footer) {
        response += this.replaceVariables(responseConfig.sections.footer, variables);
      }

      return response;
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "stats.error_messages.general_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        `Error obteniendo estadísticas generales: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  private async getUsersStats(): Promise<string> {
    try {
      // Simulación de estadísticas de usuarios (en producción vendría del UserService)
      const defaultValues = this.getValueByPath("stats.default_values");
      const noConnection = defaultValues?.no_connection || "Sin conexión BD";
      
      // Obtener configuración de respuesta
      const responseConfig = this.getValueByPath("stats.response.users");

      // Variables para plantillas (simuladas)
      const variables = {
        totalUsers: noConnection,
        totalInteractions: noConnection,
        avgPerUser: noConnection,
        adminCount: noConnection,
        customerCount: noConnection,
        friendCount: noConnection,
        familiarCount: noConnection,
        employeeCount: noConnection,
        providerCount: noConnection,
        blockCount: noConnection
      };

      // Construir respuesta usando configuración
      let response = this.replaceVariables(
        responseConfig?.title || "� ESTADÍSTICAS DE USUARIOS",
        variables
      ) + "\n\n";

      // Sección general
      if (responseConfig?.sections?.general) {
        response += this.replaceVariables(responseConfig.sections.general.title, variables) + "\n";
        if (responseConfig.sections.general.items) {
          for (const item of responseConfig.sections.general.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Sección por tipo
      if (responseConfig?.sections?.by_type) {
        response += this.replaceVariables(responseConfig.sections.by_type.title, variables) + "\n";
        if (responseConfig.sections.by_type.items) {
          for (const item of responseConfig.sections.by_type.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Nota
      if (responseConfig?.sections?.note) {
        response += responseConfig.sections.note;
      }

      return response;
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "stats.error_messages.users_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        `Error obteniendo estadísticas de usuarios: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
      throw new Error(errorMessage);
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
