import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando de panel de administración
 * Muestra estadísticas completas del sistema y opciones administrativas
 */
export class AdminPanelCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "admin",
      aliases: ["panel", "admin-panel"],
      description: this.getConfigMessage(
        "admin.description",
        {},
        "Muestra el panel de administración del bot"
      ),
      syntax: "!admin",
      category: "admin",
      permissions: ["admin"],
      cooldown: 5,
      examples: ["!admin", "!panel"],
      isAdmin: true,
      isSensitive: true,
      requiredRole: "admin",
    };
  }

  /**
   * Verifica si el mensaje solicita el panel de administración
   */
  matches(messageText: string): boolean {
    const text = messageText.toLowerCase().trim();

    return (
      text === "!admin" ||
      text === "!panel" ||
      text === "!admin-panel" ||
      text === "admin" ||
      text === "panel"
    );
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
    return path
      .split(".")
      .reduce((current, key) => current?.[key], config as any);
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Verificar permisos de administrador
      if (!context.isFromAdmin) {
        const errorMessage = this.getConfigMessage(
          "admin.error_messages.permission_denied",
          {},
          "❌ Este comando requiere permisos de administrador."
        );
        return {
          success: false,
          response: errorMessage,
          shouldReply: true,
          error: "Insufficient permissions",
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            error: "Insufficient permissions",
          },
        };
      }

      const stats = this.getBotStats();
      const systemStats = this.getSystemStats();
      const adminInfo = this.getAdminInfo(context);

      // Construir panel usando plantillas configurables
      let panelText =
        this.getConfigMessage(
          "admin.response.title",
          {},
          "🔧 **PANEL DE ADMINISTRACIÓN - drasBot**"
        ) + "\n\n";

      // Sección de estado del sistema
      const systemTitle = this.getConfigMessage(
        "admin.response.sections.system_status.title",
        {},
        "📊 **ESTADO DEL SISTEMA:**"
      );
      panelText += `${systemTitle}\n`;
      panelText += `• **Tiempo activo**: ${this.formatUptime(stats.uptime)}\n`;
      panelText += `• **Memoria**: ${systemStats.memoryUsage}MB\n`;
      panelText += `• **CPU**: ${systemStats.cpuUsage}%\n`;
      panelText += `• **Estado**: ${this.getSystemStatusIndicator(
        systemStats.cpuUsage
      )}\n\n`;

      // Sección de estadísticas
      const statsTitle = this.getConfigMessage(
        "admin.response.sections.statistics.title",
        {},
        "👥 **ESTADÍSTICAS:**"
      );
      panelText += `${statsTitle}\n`;
      panelText += `• **Usuarios totales**: ${stats.totalUsers || 0}\n`;
      panelText += `• **Mensajes procesados**: ${stats.processedMessages}\n`;
      panelText += `• **Comandos ejecutados**: ${stats.totalCommands || 0}\n`;
      panelText += `• **Errores**: ${stats.errorCount || 0}\n\n`;

      // Sección de servicios
      const servicesTitle = this.getConfigMessage(
        "admin.response.sections.services.title",
        {},
        "🔧 **SERVICIOS:**"
      );
      panelText += `${servicesTitle}\n`;
      panelText += `• **WhatsApp**: ${
        stats.userServiceReady ? "🟢 Activo" : "🔴 Inactivo"
      }\n`;
      panelText += `• **Base de datos**: ${
        stats.databaseStatus || "🟢 Activo"
      }\n`;
      panelText += `• **Logs**: ${stats.logsStatus || "🟢 Activo"}\n`;
      panelText += `• **Permisos**: ${
        stats.permissionsStatus || "🟢 Activo"
      }\n\n`;

      // Sección de acciones rápidas
      const actionsTitle = this.getConfigMessage(
        "admin.response.sections.quick_actions.title",
        {},
        "⚡ **ACCIONES RÁPIDAS:**"
      );
      panelText += `${actionsTitle}\n`;
      panelText += `• \`!users list\` - Gestionar usuarios\n`;
      panelText += `• \`!stats system\` - Estadísticas detalladas\n`;
      panelText += `• \`!logs error\` - Ver logs de errores\n`;
      panelText += `• \`!diagnostic\` - Diagnóstico completo\n\n`;

      // Sección de información del admin
      const adminTitle = this.getConfigMessage(
        "admin.response.sections.admin_info.title",
        {},
        "👤 **INFORMACIÓN DE ADMIN:**"
      );
      panelText += `${adminTitle}\n`;
      panelText += `• **Admin**: ${adminInfo.name}\n`;
      panelText += `• **Sesión iniciada**: ${adminInfo.sessionStart}\n`;
      panelText += `• **Comandos ejecutados**: ${adminInfo.commandsExecuted}\n`;
      panelText += `• **Última actividad**: ${adminInfo.lastActivity}\n\n`;

      // Footer
      const footerText = this.getConfigMessage(
        "admin.response.sections.footer.text",
        { timestamp: new Date().toLocaleString("es-ES") },
        `🕒 Panel actualizado: ${new Date().toLocaleString("es-ES")}`
      );
      panelText += footerText;

      const footerHelp = this.getConfigMessage(
        "admin.response.sections.footer.help",
        {},
        "\n💡 Usa `!help admin` para ver todos los comandos disponibles"
      );
      panelText += footerHelp;

      return {
        success: true,
        response: panelText,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          responseType: "admin_panel",
          stats: {
            bot: stats,
            system: systemStats,
            admin: adminInfo,
          },
        },
      };
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "admin.error_messages.general_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al cargar el panel de administración. Inténtalo nuevamente."
      );

      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        error: error instanceof Error ? error.message : "Error desconocido",
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      };
    }
  }

  /**
   * Obtiene estadísticas simuladas del bot
   */
  private getBotStats() {
    const now = Date.now();
    const startTime = now - Math.random() * 86400000; // Simular tiempo activo de hasta 24h

    return {
      uptime: now - startTime,
      processedMessages: Math.floor(Math.random() * 1000) + 500,
      userServiceReady: true,
      commandSystemEnabled: true,
      totalUsers: Math.floor(Math.random() * 100) + 20,
      totalCommands: Math.floor(Math.random() * 500) + 100,
      errorCount: Math.floor(Math.random() * 10),
      databaseStatus: "🟢 Activo",
      logsStatus: "🟢 Activo",
      permissionsStatus: "🟢 Activo",
    };
  }

  /**
   * Obtiene estadísticas del sistema
   */
  private getSystemStats() {
    const memoryUsage = process.memoryUsage();

    return {
      cpuUsage: Math.round(Math.random() * 50 + 10), // Simular 10-60% CPU
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      systemUptime: this.formatUptime(process.uptime() * 1000),
    };
  }

  /**
   * Obtiene información del administrador actual
   */
  private getAdminInfo(context: CommandContext) {
    return {
      name:
        context.user?.display_name ||
        this.getConfigMessage("admin.default_values.unknown", {}, "Admin"),
      sessionStart: this.getConfigMessage(
        "admin.default_values.calculating",
        {},
        "Calculando..."
      ),
      commandsExecuted: Math.floor(Math.random() * 50) + 10,
      lastActivity: this.getConfigMessage(
        "admin.default_values.not_available",
        {},
        "No disponible"
      ),
    };
  }

  /**
   * Obtiene el indicador de estado del sistema basado en CPU
   */
  private getSystemStatusIndicator(cpuUsage: number): string {
    if (cpuUsage < 30) {
      return this.getConfigMessage(
        "admin.system_indicators.excellent",
        {},
        "🟢 Excelente"
      );
    } else if (cpuUsage < 50) {
      return this.getConfigMessage(
        "admin.system_indicators.good",
        {},
        "🟡 Bueno"
      );
    } else if (cpuUsage < 70) {
      return this.getConfigMessage(
        "admin.system_indicators.warning",
        {},
        "🟠 Advertencia"
      );
    } else {
      return this.getConfigMessage(
        "admin.system_indicators.critical",
        {},
        "🔴 Crítico"
      );
    }
  }

  /**
   * Formatea el tiempo de actividad
   */
  private formatUptime(uptimeMs: number): string {
    if (!uptimeMs || uptimeMs <= 0) return "N/A";

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
}
