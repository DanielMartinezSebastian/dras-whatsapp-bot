import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandCategory,
} from "../../../types/commands";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando status - Estado del sistema y estadísticas
 * Muestra información detallada sobre el estado de los servicios y rendimiento
 */
export class StatusCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "status",
      aliases: ["estado", "st"],
      description: this.getConfigMessage(
        "status.description",
        {},
        "Muestra el estado del sistema y estadísticas operativas"
      ),
      syntax: "!status",
      category: "basic" as CommandCategory,
      permissions: ["user"],
      cooldown: 5,
      examples: ["!status"],
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const statusText = await this.generateSystemStatus(context);
      return this.createSuccessResult(statusText);
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "status.error_message",
        { error: error instanceof Error ? error.message : String(error) },
        `Error obteniendo estado del sistema: ${error}`
      );
      return this.createErrorResult(errorMessage);
    }
  }

  private async generateSystemStatus(context: CommandContext): Promise<string> {
    const dbStatus = await this.getDatabaseStatus();
    const systemStats = this.getSystemStats();
    const performanceStats = this.getPerformanceStats();

    // Obtener configuración de respuesta
    const responseConfig = this.getValueByPath(
      null,
      "messages.commands.status.response"
    );
    const statusIndicators = this.getValueByPath(
      null,
      "messages.commands.status.status_indicators"
    );
    const systemDefaults = this.getValueByPath(
      null,
      "messages.commands.status.system_defaults"
    );

    let statusText =
      this.getConfigMessage(
        "messages.commands.status.response.title",
        {},
        "📊 **ESTADO DEL SISTEMA**"
      ) + "\n\n";

    // Sección de servicios
    const servicesSection = this.getValueByPath(
      null,
      "messages.commands.status.response.sections.services"
    );
    console.log(`🔍 DEBUG StatusCommand: servicesSection=`, servicesSection);

    if (servicesSection) {
      statusText += servicesSection.title + "\n";
      console.log(
        `🔍 DEBUG StatusCommand: servicesSection.items=`,
        servicesSection.items
      );
      console.log(
        `🔍 DEBUG StatusCommand: servicesSection.items is array?=`,
        Array.isArray(servicesSection.items)
      );

      if (Array.isArray(servicesSection.items)) {
        for (const item of servicesSection.items) {
          statusText +=
            this.replaceVariables(item, {
              botStatus: statusIndicators?.active || "✅ Funcionando",
              dbStatus: `${dbStatus.isConnected ? "✅" : "❌"} ${
                dbStatus.status
              }`,
              commandSystemStatus:
                systemDefaults?.command_system || "✅ TypeScript Activo",
              permissionsStatus: systemDefaults?.permissions || "✅ Activo",
              logsStatus: systemDefaults?.logs || "✅ Activo",
            }) + "\n";
        }
      } else {
        console.log(
          `🔍 DEBUG StatusCommand: servicesSection.items no es un array o es undefined`
        );
      }
      statusText += "\n";
    } else {
      console.log(`🔍 DEBUG StatusCommand: servicesSection es undefined`);
    }

    // Sección de actividad
    const activitySection = this.getValueByPath(
      null,
      "messages.commands.status.response.sections.activity"
    );
    if (activitySection) {
      statusText += activitySection.title + "\n";
      for (const item of activitySection.items) {
        statusText +=
          this.replaceVariables(item, {
            processedMessages: systemStats.processedMessages,
            commandsExecuted: systemStats.commandsExecuted,
            totalUsers: systemStats.totalUsers,
            sessionUptime: systemStats.sessionUptime,
          }) + "\n";
      }
      statusText += "\n";
    }

    // Sección de rendimiento
    const performanceSection = this.getValueByPath(
      null,
      "messages.commands.status.response.sections.performance"
    );
    if (performanceSection) {
      statusText += performanceSection.title + "\n";
      for (const item of performanceSection.items) {
        statusText +=
          this.replaceVariables(item, {
            memoryUsage: performanceStats.memoryUsage,
            cpuTime: performanceStats.cpuTime,
            uptime: performanceStats.uptime,
            nodeVersion: process.version,
            platform: process.platform,
          }) + "\n";
      }
      statusText += "\n";
    }

    // Sección de TypeScript
    const typescriptSection = this.getValueByPath(
      null,
      "messages.commands.status.response.sections.typescript"
    );
    if (typescriptSection) {
      statusText += typescriptSection.title + "\n";
      for (const item of typescriptSection.items) {
        statusText +=
          this.replaceVariables(item, {
            migrationStatus:
              statusIndicators?.migration_in_progress ||
              "✅ Migración en progreso",
            migratedCommands:
              systemDefaults?.migrated_commands ||
              "PingCommand, InfoCommand, StatusCommand",
            testsStatus: statusIndicators?.tests_passing || "✅ Todos pasando",
            coverage: systemDefaults?.coverage || "Alta",
          }) + "\n";
      }
      statusText += "\n";
    }

    // Footer
    const footerSection = this.getValueByPath(
      null,
      "messages.commands.status.response.sections.footer"
    );
    if (footerSection?.text) {
      statusText += footerSection.text;
    }

    return statusText;
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
      let message = this.getValueByPath(config, `messages.commands.${path}`);

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
    console.log(
      `🔍 DEBUG StatusCommand getValueByPath: path=${path}, config existe=${!!config}`
    );

    const result = path.split(".").reduce((current, key) => {
      console.log(
        `🔍 DEBUG StatusCommand getValueByPath: navegando key=${key}, current=${!!current}, tiene key=${
          current && current[key] !== undefined
        }`
      );
      return current?.[key];
    }, config as any);

    console.log(
      `🔍 DEBUG StatusCommand getValueByPath: resultado final=`,
      result
    );
    return result;
  }

  private async getDatabaseStatus(): Promise<{
    isConnected: boolean;
    status: string;
  }> {
    try {
      // Try to access user service to check database connection
      // This is a simple check - in a real implementation you might query the DB directly
      const hasConnection = (global as any).userService !== undefined;
      return {
        isConnected: hasConnection,
        status: hasConnection ? "Conectada" : "Desconectada",
      };
    } catch (error) {
      return {
        isConnected: false,
        status: "Error de conexión",
      };
    }
  }

  private getSystemStats(): {
    processedMessages: number;
    commandsExecuted: number;
    totalUsers: number;
    sessionUptime: string;
  } {
    // Get basic system statistics
    const startTime = (global as any).botStartTime || Date.now();
    const uptime = Date.now() - startTime;

    return {
      processedMessages: this.getProcessedMessagesCount(),
      commandsExecuted: this.getCommandsExecutedCount(),
      totalUsers: this.getTotalUsersCount(),
      sessionUptime: this.formatUptime(uptime),
    };
  }

  private getPerformanceStats(): {
    memoryUsage: number;
    cpuTime: number;
    uptime: string;
  } {
    const memoryUsage = Math.round(
      process.memoryUsage().heapUsed / 1024 / 1024
    );
    const cpuUsage = process.cpuUsage();
    const cpuTime = Math.round(cpuUsage.user / 1000);
    const processUptime = process.uptime() * 1000;

    return {
      memoryUsage,
      cpuTime,
      uptime: this.formatUptime(processUptime),
    };
  }

  private getProcessedMessagesCount(): number {
    try {
      // Try to get from global bot processor if available
      return (global as any).botProcessor?.stats?.processedCount || 0;
    } catch (error) {
      return 0;
    }
  }

  private getCommandsExecutedCount(): number {
    try {
      // Try to get from global bot processor if available
      return (global as any).botProcessor?.stats?.commandCount || 0;
    } catch (error) {
      return 0;
    }
  }

  private getTotalUsersCount(): number {
    try {
      // This would need to be implemented with actual user service
      return (global as any).userService?.getTotalUsers?.() || 0;
    } catch (error) {
      return 0;
    }
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
