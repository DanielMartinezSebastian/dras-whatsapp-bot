import { BaseMessageHandler } from "./core/BaseMessageHandler";
import {
  HandlerContext,
  HandlerResult,
} from "../../types/handlers/message-handler.types";
import { IBotProcessor } from "../../interfaces/core/IBotProcessor";
import { IPermissionService } from "../../interfaces/services/IPermissionService";
import { IWhatsAppClient } from "../../interfaces/core/IWhatsAppClient";
import { User } from "../../types/core/user.types";
import {
  PermissionCheck,
  Permission,
} from "../../types/services/permission.types";

/**
 * Handler especializado para comandos administrativos
 * Maneja comandos de alto privilegio y sistema
 */
export class AdminMessageHandler extends BaseMessageHandler {
  private botProcessor: IBotProcessor;
  private whatsappClient: IWhatsAppClient;
  private permissionService: IPermissionService;

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
    permissionService: IPermissionService
  ) {
    super("admin", 10, true); // Prioridad media para comandos admin
    this.botProcessor = botProcessor;
    this.whatsappClient = whatsappClient;
    this.permissionService = permissionService;
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

      return this.createErrorResult(
        `Error ejecutando comando administrativo: ${errorMessage}`,
        {
          command: context.message.text?.split(" ")[0],
          error: errorMessage,
        }
      );
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
        return this.createErrorResult(
          `Comando administrativo no reconocido: ${command}`
        );
    }
  }

  /**
   * Maneja el panel de administración
   */
  private async handleAdminPanel(
    context: HandlerContext
  ): Promise<HandlerResult> {
    const stats = this.getAdminStats();
    const response = `🛡️ *Panel de Administración*

📊 *Estadísticas del Sistema:*
• Comandos admin ejecutados: ${stats.totalAdminCommands}
• Comandos exitosos: ${stats.successfulCommands}
• Comandos fallidos: ${stats.failedCommands}
• Comandos denegados: ${stats.deniedCommands}
• Usuarios admin activos: ${stats.adminUsers}

🔧 *Comandos Disponibles:*
${Object.entries(this.adminCommands)
  .map(([cmd, desc]) => `• ${cmd} - ${desc}`)
  .join("\n")}

⚡ *Estado del Bot:* Activo
🕒 *Última actualización:* ${new Date().toLocaleString("es-ES")}`;

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
      return this.createErrorResult("Uso: /sudo <comando>");
    }

    // Por ahora retornamos un mensaje indicando que la funcionalidad está en desarrollo
    return this.createSuccessResult(
      `🔧 Funcionalidad sudo en desarrollo.\nComando solicitado: ${args.join(
        " "
      )}`,
      { sudoCommand: args.join(" ") }
    );
  }

  /**
   * Maneja toggle de debug
   */
  private async handleDebugToggle(
    context: HandlerContext
  ): Promise<HandlerResult> {
    // Por ahora simulamos el toggle
    return this.createSuccessResult(
      "🐛 Modo debug alterado (funcionalidad en desarrollo)",
      { debugToggled: true }
    );
  }

  /**
   * Maneja comando de logs
   */
  private async handleLogCommand(
    context: HandlerContext,
    args: string[]
  ): Promise<HandlerResult> {
    const logType = args[0] || "recent";

    return this.createSuccessResult(
      `📄 Logs del sistema (${logType}):\n\n` +
        `[INFO] ${new Date().toISOString()} - Sistema funcionando correctamente\n` +
        `[INFO] ${new Date().toISOString()} - Handler administrativo activo\n` +
        `\n💡 Funcionalidad completa de logs en desarrollo`,
      { logType, timestamp: new Date() }
    );
  }

  /**
   * Maneja comando de reinicio
   */
  private async handleRestartCommand(
    context: HandlerContext
  ): Promise<HandlerResult> {
    return this.createSuccessResult(
      "🔄 Solicitud de reinicio registrada.\n\n⚠️ Funcionalidad de reinicio en desarrollo",
      { restartRequested: true }
    );
  }

  /**
   * Maneja comando de apagado
   */
  private async handleShutdownCommand(
    context: HandlerContext
  ): Promise<HandlerResult> {
    return this.createSuccessResult(
      "🛑 Solicitud de apagado registrada.\n\n⚠️ Funcionalidad de apagado en desarrollo",
      { shutdownRequested: true }
    );
  }

  /**
   * Maneja comando de reset
   */
  private async handleResetCommand(
    context: HandlerContext
  ): Promise<HandlerResult> {
    return this.createSuccessResult(
      "🔄 Solicitud de reset del sistema registrada.\n\n⚠️ Funcionalidad de reset en desarrollo",
      { resetRequested: true }
    );
  }

  /**
   * Maneja comando de configuración
   */
  private async handleConfigCommand(
    context: HandlerContext,
    args: string[]
  ): Promise<HandlerResult> {
    if (args.length === 0) {
      return this.createSuccessResult(
        "⚙️ *Configuración del Sistema*\n\n" +
          "📋 Para ver configuración: /config show\n" +
          "✏️ Para editar: /config set <clave> <valor>\n" +
          "\n💡 Funcionalidad completa en desarrollo",
        { configAction: "help" }
      );
    }

    const action = args[0];
    if (action === "show") {
      return this.createSuccessResult(
        "⚙️ *Configuración Actual*\n\n" +
          "• Debug: false\n" +
          "• Auto-reply: true\n" +
          "• Max responses: 100/día\n" +
          "\n💡 Configuración completa en desarrollo",
        { configAction: "show" }
      );
    }

    return this.createSuccessResult(
      `⚙️ Acción de configuración: ${action}\n\n💡 Funcionalidad completa en desarrollo`,
      { configAction: action, args: args.slice(1) }
    );
  }

  /**
   * Maneja denegación de permisos
   */
  private async handlePermissionDenied(
    context: HandlerContext,
    command: string
  ): Promise<HandlerResult> {
    const response = `🚫 *Acceso Denegado*

No tienes permisos para ejecutar el comando: ${command}

📞 Contacta con un administrador si necesitas acceso.`;

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
