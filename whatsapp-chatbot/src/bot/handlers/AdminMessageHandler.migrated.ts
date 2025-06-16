import { BaseMessageHandler } from "./core/BaseMessageHandler";
import {
  HandlerContext,
  HandlerResult,
} from "../../types/handlers/message-handler.types";
import { IBotProcessor } from "../../interfaces/core/IBotProcessor";
import { IPermissionService } from "../../interfaces/services/IPermissionService";
import { IWhatsAppClient } from "../../interfaces/core/IWhatsAppClient";
import { ConfigurationService } from "../../services/ConfigurationService";
import { User } from "../../types/core/user.types";
import {
  PermissionCheck,
  Permission,
} from "../../types/services/permission.types";

/**
 * Handler especializado para comandos administrativos
 * Maneja comandos de alto privilegio y sistema
 * *** VERSIÓN MIGRADA CON CONFIGURACIÓN CENTRALIZADA ***
 */
export class AdminMessageHandler extends BaseMessageHandler {
  private botProcessor: IBotProcessor;
  private whatsappClient: IWhatsAppClient;
  private permissionService: IPermissionService;
  private configService: ConfigurationService;

  // Comandos administrativos disponibles
  private adminCommands: Record<string, string> = {
    "/admin": "Panel de administración",
    "/sudo": "Ejecutar comando con privilegios",
    "/debug": "Activar/desactivar modo debug",
    "/log": "Ver logs del sistema",
    "/restart": "Reiniciar bot (solo superadmin)",
    "/shutdown": "Apagar bot (solo superadmin)",
    "/reset": "Resetear sistema (solo superadmin)",
    "/config": "Configuración del sistema",
  };

  // Estadísticas específicas del handler administrativo
  private adminStats = {
    totalAdminCommands: 0,
    deniedCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    adminUsers: new Set<string>(),
  };

  constructor(
    botProcessor: IBotProcessor,
    whatsappClient: IWhatsAppClient,
    permissionService: IPermissionService,
    configService: ConfigurationService
  ) {
    super("admin", 10, true); // Prioridad media para comandos admin
    this.botProcessor = botProcessor;
    this.whatsappClient = whatsappClient;
    this.permissionService = permissionService;
    this.configService = configService;
  }

  /**
   * Obtiene un mensaje desde la configuración con fallback
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

      // Intentar obtener desde admin-responses primero, después desde messages
      let message =
        this.getValueByPath(config, `admin_responses.${path}`) ||
        this.getValueByPath(config, `messages.${path}`);

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
        `Error obteniendo mensaje configurado para ${path}:`,
        error
      );
      return fallback || `Error obteniendo mensaje: ${path}`;
    }
  }

  /**
   * Reemplaza variables en un string usando placeholders {variable}
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        String(value)
      );
    }
    return result;
  }

  /**
   * Obtiene un valor de un objeto usando una ruta de punto
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Verifica si el mensaje es un comando administrativo
   */
  canHandle(context: HandlerContext): boolean {
    if (!context.message?.text) {
      return false;
    }

    const text = context.message.text.trim();

    // Verificar si es un comando administrativo directo
    const command = text.split(" ")[0].toLowerCase();
    if (this.adminCommands[command]) {
      return true;
    }

    // Verificar si el clasificador detectó un comando administrativo específico
    if (
      context.classification?.type === "COMMAND" &&
      context.classification?.command
    ) {
      const classifiedCommand = context.classification.command;
      if (this.adminCommands[classifiedCommand]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Procesa el comando administrativo
   */
  protected async processMessage(
    context: HandlerContext
  ): Promise<HandlerResult> {
    try {
      this.adminStats.totalAdminCommands++;

      const message = context.message;
      const text = message.text?.trim() || "";
      const parts = text.split(" ");
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      console.log(`Comando administrativo solicitado: ${command}`, {
        senderPhone: message.senderPhone,
        args: args,
      });

      // Verificar permisos administrativos
      const hasAdminPermission = await this.verifyAdminPermissions(
        context,
        command
      );
      if (!hasAdminPermission) {
        this.adminStats.deniedCommands++;
        return await this.handlePermissionDenied(context, command);
      }

      // Registrar usuario admin
      this.adminStats.adminUsers.add(message.senderPhone || "");

      // Ejecutar comando administrativo
      const result = await this.executeAdminCommand(context, command, args);

      this.adminStats.successfulCommands++;
      return result;
    } catch (error) {
      this.adminStats.failedCommands++;
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      console.error(`Error ejecutando comando administrativo:`, error);

      // Obtener mensaje de error desde configuración
      const errorResponse = this.getConfigMessage(
        "errors.command_execution",
        {
          command: context.message.text?.split(" ")[0],
          error: errorMessage,
        },
        `Error ejecutando comando administrativo: ${errorMessage}`
      );

      return this.createErrorResult(errorResponse, {
        command: context.message.text?.split(" ")[0],
        error: errorMessage,
      });
    }
  }

  /**
   * Verifica permisos administrativos
   */
  private async verifyAdminPermissions(
    context: HandlerContext,
    command: string
  ): Promise<boolean> {
    try {
      const message = context.message;
      const senderPhone = message.senderPhone;
      const chatJid = message.chatJid;

      console.log(
        `🔍 DEBUG AdminHandler: Verificando permisos para ${senderPhone}, comando: ${command}, JID: ${chatJid}`
      );

      // Usar el usuario del contexto si está disponible
      let user = context.user;

      // Si no hay usuario en el contexto, no podemos verificar permisos
      if (!user) {
        console.log(
          `❌ DEBUG AdminHandler: Usuario no disponible para verificar permisos`
        );
        return false;
      }

      console.log(`✅ DEBUG AdminHandler: Usuario encontrado:`, {
        phone: user.phone_number,
        type: user.user_type,
        displayName: user.display_name,
        jid: user.whatsapp_jid,
      });

      // Usar checkPermission del PermissionService
      console.log(`🔍 DEBUG AdminHandler: Llamando checkPermission...`);
      const permissionCheck: PermissionCheck = {
        user: user,
        requiredPermission: "admin",
        context: `admin_command_${command}`,
      };
      const result = await this.permissionService.checkPermission(
        permissionCheck
      );

      console.log(
        `✅ DEBUG AdminHandler: Verificación de permisos para ${command}:`,
        {
          senderPhone,
          userType: user.user_type,
          granted: result.granted,
          reason: result.reason || "N/A",
        }
      );

      return result.granted;
    } catch (error) {
      console.error(
        "❌ DEBUG AdminHandler: Error verificando permisos administrativos:",
        error
      );
      return false;
    }
  }

  /**
   * Ejecuta un comando administrativo
   */
  private async executeAdminCommand(
    context: HandlerContext,
    command: string,
    args: string[]
  ): Promise<HandlerResult> {
    switch (command) {
      case "/admin":
        return await this.handleAdminPanel(context);
      case "/sudo":
        return await this.handleSudoCommand(context, args);
      case "/debug":
        return await this.handleDebugToggle(context);
      case "/log":
        return await this.handleLogCommand(context, args);
      case "/restart":
        return await this.handleRestartCommand(context);
      case "/shutdown":
        return await this.handleShutdownCommand(context);
      case "/reset":
        return await this.handleResetCommand(context);
      case "/config":
        return await this.handleConfigCommand(context, args);
      default:
        const unknownCommandMsg = this.getConfigMessage(
          "commands.unknown_command",
          {
            command,
          },
          `Comando administrativo no reconocido: ${command}`
        );
        return this.createErrorResult(unknownCommandMsg);
    }
  }

  /**
   * Maneja el panel de administración
   */
  private async handleAdminPanel(
    context: HandlerContext
  ): Promise<HandlerResult> {
    const stats = this.getAdminStats();

    // Obtener plantillas desde la configuración
    const header = this.getConfigMessage(
      "panel.header",
      {},
      "🛡️ *Panel de Administración*"
    );
    const statsTitle = this.getConfigMessage(
      "panel.stats_title",
      {},
      "📊 *Estadísticas del Sistema:*"
    );
    const commandsTitle = this.getConfigMessage(
      "panel.commands_title",
      {},
      "🔧 *Comandos Disponibles:*"
    );
    const footer = this.getConfigMessage(
      "panel.footer",
      {
        timestamp: new Date().toLocaleString("es-ES"),
      },
      "⚡ *Estado del Bot:* Activo\n🕒 *Última actualización:* {timestamp}"
    );

    const systemStatus = this.getConfigMessage(
      "panel.system_status",
      {
        totalAdminCommands: stats.totalAdminCommands,
        successfulCommands: stats.successfulCommands,
        failedCommands: stats.failedCommands,
        deniedCommands: stats.deniedCommands,
        adminUsers: stats.adminUsers,
      },
      `• Comandos admin ejecutados: ${stats.totalAdminCommands}
• Comandos exitosos: ${stats.successfulCommands}
• Comandos fallidos: ${stats.failedCommands}
• Comandos denegados: ${stats.deniedCommands}
• Usuarios admin activos: ${stats.adminUsers}`
    );

    const response = `${header}

${statsTitle}
${systemStatus}

${commandsTitle}
${Object.entries(this.adminCommands)
  .map(([cmd, desc]) => `• ${cmd} - ${desc}`)
  .join("\n")}

${footer}`;

    return this.createSuccessResult(response, { panelType: "admin", stats });
  }

  /**
   * Maneja comando sudo
   */
  private async handleSudoCommand(
    context: HandlerContext,
    args: string[]
  ): Promise<HandlerResult> {
    if (args.length === 0) {
      const usageMessage = this.getConfigMessage(
        "sudo.usage",
        {},
        "Uso: /sudo <comando>"
      );
      return this.createErrorResult(usageMessage);
    }

    const response = this.getConfigMessage(
      "sudo.development",
      {
        command: args.join(" "),
      },
      `🔧 Funcionalidad sudo en desarrollo.\nComando solicitado: ${args.join(
        " "
      )}`
    );

    return this.createSuccessResult(response, { sudoCommand: args.join(" ") });
  }

  /**
   * Maneja toggle de debug
   */
  private async handleDebugToggle(
    context: HandlerContext
  ): Promise<HandlerResult> {
    const response = this.getConfigMessage(
      "debug.toggle",
      {},
      "🐛 Modo debug alterado (funcionalidad en desarrollo)"
    );
    return this.createSuccessResult(response, { debugToggled: true });
  }

  /**
   * Maneja comando de logs
   */
  private async handleLogCommand(
    context: HandlerContext,
    args: string[]
  ): Promise<HandlerResult> {
    const logType = args[0] || "recent";

    const response = this.getConfigMessage(
      "logs.system",
      {
        logType,
        timestamp: new Date().toISOString(),
      },
      `📄 Logs del sistema (${logType}):\n\n` +
        `[INFO] ${new Date().toISOString()} - Sistema funcionando correctamente\n` +
        `[INFO] ${new Date().toISOString()} - Handler administrativo activo\n` +
        `\n💡 Funcionalidad completa de logs en desarrollo`
    );

    return this.createSuccessResult(response, {
      logType,
      timestamp: new Date(),
    });
  }

  /**
   * Maneja comando de reinicio
   */
  private async handleRestartCommand(
    context: HandlerContext
  ): Promise<HandlerResult> {
    const response = this.getConfigMessage(
      "system.restart",
      {},
      "🔄 Solicitud de reinicio registrada.\n\n⚠️ Funcionalidad de reinicio en desarrollo"
    );
    return this.createSuccessResult(response, { restartRequested: true });
  }

  /**
   * Maneja comando de apagado
   */
  private async handleShutdownCommand(
    context: HandlerContext
  ): Promise<HandlerResult> {
    const response = this.getConfigMessage(
      "system.shutdown",
      {},
      "🛑 Solicitud de apagado registrada.\n\n⚠️ Funcionalidad de apagado en desarrollo"
    );
    return this.createSuccessResult(response, { shutdownRequested: true });
  }

  /**
   * Maneja comando de reset
   */
  private async handleResetCommand(
    context: HandlerContext
  ): Promise<HandlerResult> {
    const response = this.getConfigMessage(
      "system.reset",
      {},
      "🔄 Solicitud de reset del sistema registrada.\n\n⚠️ Funcionalidad de reset en desarrollo"
    );
    return this.createSuccessResult(response, { resetRequested: true });
  }

  /**
   * Maneja comando de configuración
   */
  private async handleConfigCommand(
    context: HandlerContext,
    args: string[]
  ): Promise<HandlerResult> {
    if (args.length === 0) {
      const helpMessage = this.getConfigMessage(
        "config.help",
        {},
        "⚙️ *Configuración del Sistema*\n\n" +
          "📋 Para ver configuración: /config show\n" +
          "✏️ Para editar: /config set <clave> <valor>\n" +
          "\n💡 Funcionalidad completa en desarrollo"
      );
      return this.createSuccessResult(helpMessage, { configAction: "help" });
    }

    const action = args[0];
    if (action === "show") {
      const showMessage = this.getConfigMessage(
        "config.show",
        {},
        "⚙️ *Configuración Actual*\n\n" +
          "• Debug: false\n" +
          "• Auto-reply: true\n" +
          "• Max responses: 100/día\n" +
          "\n💡 Configuración completa en desarrollo"
      );
      return this.createSuccessResult(showMessage, { configAction: "show" });
    }

    const actionMessage = this.getConfigMessage(
      "config.action",
      { action },
      `⚙️ Acción de configuración: ${action}\n\n💡 Funcionalidad completa en desarrollo`
    );
    return this.createSuccessResult(actionMessage, {
      configAction: action,
      args: args.slice(1),
    });
  }

  /**
   * Maneja denegación de permisos
   */
  private async handlePermissionDenied(
    context: HandlerContext,
    command: string
  ): Promise<HandlerResult> {
    const response = this.getConfigMessage(
      "permissions.denied",
      {
        command,
      },
      `🚫 *Acceso Denegado*

No tienes permisos para ejecutar el comando: ${command}

📞 Contacta con un administrador si necesitas acceso.`
    );

    return this.createErrorResult(response, {
      deniedCommand: command,
      reason: "insufficient_permissions",
    });
  }

  /**
   * Obtiene estadísticas específicas del handler administrativo
   */
  getAdminStats() {
    return {
      ...this.getStats(),
      ...this.adminStats,
      adminUsers: this.adminStats.adminUsers.size, // Convertir Set a número
    };
  }

  /**
   * Obtiene la lista de comandos administrativos disponibles
   */
  getAvailableCommands(): Record<string, string> {
    return { ...this.adminCommands };
  }

  /**
   * Reinicia las estadísticas específicas del handler administrativo
   */
  resetAdminStats(): void {
    this.adminStats = {
      totalAdminCommands: 0,
      deniedCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      adminUsers: new Set<string>(),
    };
    this.resetStats();
  }
}
