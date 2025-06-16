import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandCategory,
} from "../../../types/commands";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando info - Información del bot y sistema
 * Muestra estadísticas básicas del sistema y tiempo de actividad
 */
export class InfoCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "info",
      aliases: ["information", "about"],
      description: this.getConfigMessage(
        "info.description",
        {},
        "Muestra información del bot y estadísticas del sistema"
      ),
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

      // Obtener configuración del sistema
      const systemInfo = this.getValueByPath("info.system_info");
      const responseConfig = this.getValueByPath("info.response");

      // Construir respuesta usando configuración
      let response =
        this.getConfigMessage(
          "info.response.title",
          {},
          "🤖 **drasBot - Información del Sistema**"
        ) + "\n\n";

      // Sección de estadísticas
      const statsSection = this.getValueByPath(
        "info.response.sections.statistics"
      );
      if (statsSection) {
        response += statsSection.title + "\n";
        for (const item of statsSection.items) {
          response +=
            this.replaceVariables(item, {
              uptime,
              version: systemInfo?.version || "2.0.0 (Sistema TypeScript)",
              status: systemInfo?.status_active || "🟢 Operativo",
            }) + "\n";
        }
        response += "\n";
      }

      // Sección de arquitectura
      const archSection = this.getValueByPath(
        "info.response.sections.architecture"
      );
      if (archSection) {
        response += archSection.title + "\n";
        for (const item of archSection.items) {
          response +=
            this.replaceVariables(item, {
              commandSystem: systemInfo?.command_system || "Modular TypeScript",
              database: systemInfo?.database || "SQLite",
              processing: systemInfo?.processing || "Node.js + TypeScript",
            }) + "\n";
        }
        response += "\n";
      }

      // Sección de funcionalidades
      const featuresSection = this.getValueByPath(
        "info.response.sections.features"
      );
      if (featuresSection) {
        response += featuresSection.title + "\n";
        for (const item of featuresSection.items) {
          response += item + "\n";
        }
        response += "\n";
      }

      // Footer
      const footerSection = this.getValueByPath(
        "info.response.sections.footer"
      );
      if (footerSection) {
        for (const item of footerSection.items) {
          response += item + "\n";
        }
      }

      return this.createSuccessResult(response);
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "info.error_message",
        { error: error instanceof Error ? error.message : String(error) },
        `Error obteniendo información del sistema: ${error}`
      );
      return this.createErrorResult(errorMessage);
    }
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
  private replaceVariables(
    template: string,
    variables: Record<string, any> = {}
  ): string {
    if (typeof template !== "string") {
      return String(template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, "g");
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
    return path
      .split(".")
      .reduce((current, key) => current?.[key], config as any);
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
