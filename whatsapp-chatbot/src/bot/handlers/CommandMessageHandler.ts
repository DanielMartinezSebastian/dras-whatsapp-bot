import { BaseMessageHandler } from "./core/BaseMessageHandler";
import {
  HandlerContext,
  HandlerResult,
} from "../../types/handlers/message-handler.types";
import {
  CommandRegistry,
  commandRegistry,
} from "../commands/core/CommandRegistry";
import { UnifiedCommandHandler } from "../commands/core/UnifiedCommandHandler";
import { CommandContext } from "../../types/commands/command-system.types";

/**
 * Handler para procesar comandos del bot
 */
export class CommandMessageHandler extends BaseMessageHandler {
  private commandRegistry: CommandRegistry;
  private commandHandler: UnifiedCommandHandler;

  constructor() {
    super("command", 1); // Alta prioridad para comandos
    this.commandRegistry = commandRegistry; // Usar la instancia singleton
    this.commandHandler = new UnifiedCommandHandler();

    // Cargar comandos al inicializar
    try {
      const loadedCount = this.loadBasicCommands();
      console.log(
        `🔍 DEBUG CommandHandler: Cargados ${loadedCount} comandos básicos manualmente`
      );
    } catch (error) {
      console.error("🔍 DEBUG CommandHandler: Error cargando comandos:", error);
    }
  }

  /**
   * Carga comandos básicos manualmente para evitar problemas con auto-loading
   */
  private loadBasicCommands(): number {
    try {
      // Importar y registrar comandos básicos
      const { HelpCommand } = require("../commands/basic/HelpCommand");
      const { PingCommand } = require("../commands/basic/PingCommand");
      const { InfoCommand } = require("../commands/basic/InfoCommand");
      const { StatusCommand } = require("../commands/basic/StatusCommand");

      // Importar comandos de usuario
      const { ProfileCommand } = require("../commands/user/ProfileCommand");
      const {
        PermissionsCommand,
      } = require("../commands/user/PermissionsCommand");

      // Importar comandos de administración
      const {
        AdminPanelCommand,
      } = require("../commands/admin/AdminPanelCommand");
      const {
        DiagnosticCommand,
      } = require("../commands/admin/DiagnosticCommand");
      const { UsersCommand } = require("../commands/admin/UsersCommand");
      const {
        AdminSystemCommand,
      } = require("../commands/admin/AdminSystemCommand");

      // Importar comandos de sistema
      const { LogsCommand } = require("../commands/system/LogsCommand");
      const { StatsCommand } = require("../commands/system/StatsCommand");

      let loadedCount = 0;

      // Registrar comandos
      const commands = [
        new HelpCommand(),
        new PingCommand(),
        new InfoCommand(),
        new StatusCommand(),
        new ProfileCommand(),
        new PermissionsCommand(),
        new AdminPanelCommand(),
        new DiagnosticCommand(),
        new UsersCommand(),
        new AdminSystemCommand(),
        new LogsCommand(),
        new StatsCommand(),
      ];

      for (const command of commands) {
        try {
          this.commandRegistry.register(command);
          loadedCount++;
        } catch (error) {
          console.warn(
            `⚠️ Error registrando comando ${command.metadata?.name}:`,
            error
          );
        }
      }

      return loadedCount;
    } catch (error) {
      console.error("Error importing commands:", error);
      return 0;
    }
  }

  /**
   * Verifica si puede manejar el mensaje
   */
  canHandle(context: HandlerContext): boolean {
    const message = context.message;
    const text = (message.text || message.content || "").trim();

    if (!text) return false;

    // Verificar si empieza con un prefijo de comando
    if (text.startsWith("!") || text.startsWith("/")) {
      return true;
    }

    // Verificar si el clasificador detectó un comando
    if (context.classification?.type === "COMMAND") {
      return true;
    }

    // Verificar si algún comando puede manejar el texto usando metadata
    const commands = this.commandRegistry.getAll();
    return commands.some((command) => {
      // Verificar si el texto coincide con el nombre del comando
      const commandName =
        text.startsWith("!") || text.startsWith("/")
          ? text.slice(1).split(" ")[0].toLowerCase()
          : text.toLowerCase();

      return (
        command.metadata.name === commandName ||
        command.metadata.aliases?.includes(commandName)
      );
    });
  }

  /**
   * Procesa el comando
   */
  protected async processMessage(
    context: HandlerContext
  ): Promise<HandlerResult> {
    try {
      const message = context.message;
      const commandText = message.text || message.content || "";

      // Extraer nombre del comando usando la misma lógica del canHandle
      const commandName =
        commandText.startsWith("!") || commandText.startsWith("/")
          ? commandText.slice(1).split(" ")[0].toLowerCase()
          : commandText.toLowerCase();

      // Debug logs temporales
      console.log("🔍 DEBUG CommandHandler: Procesando comando:", commandName);
      console.log("🔍 DEBUG CommandHandler: Texto del mensaje:", commandText);
      console.log("🔍 DEBUG CommandHandler: Usuario:", context.user);

      if (!commandName) {
        return {
          handled: false,
          success: false,
          error: "No se pudo extraer el nombre del comando",
        };
      }

      // Preparar contexto del comando
      const commandContext: CommandContext = {
        message: message, // Usar el mensaje completo
        user: context.user,
        args: commandText.split(" ").slice(1),
        fullText: commandText,
        commandName: commandName,
        isFromAdmin: this.isAdminUser(context.user),
        timestamp: context.timestamp || new Date(),
      };

      // Debug logs para el contexto del comando
      console.log("🔍 DEBUG CommandHandler: Contexto preparado:", {
        commandName,
        args: commandContext.args,
        userType: context.user?.user_type || "unknown",
      });

      // Ejecutar comando usando el sistema unificado
      const result = await this.commandHandler.handleCommand(
        commandContext.message,
        context.user!
      );

      console.log("🔍 DEBUG CommandHandler: Resultado del comando:", {
        success: result.success,
        shouldReply: result.shouldReply,
        hasResponse: !!result.response,
        responseLength: result.response?.length || 0,
        error: result.error,
      });

      if (result.success) {
        if (result.shouldReply && result.response) {
          return this.createSuccessResult(result.response, {
            commandName: commandName,
            commandResult: result,
            executionTime: result.data?.executionTime,
            responseType: result.data?.responseType,
          });
        } else {
          // Comando ejecutado exitosamente pero sin respuesta
          return {
            handled: true,
            success: true,
            action: "ignore", // Indicar que no hay acción de respuesta
            data: {
              handlerName: this.name,
              commandName: commandName,
              commandResult: result,
              timestamp: new Date(),
            },
          };
        }
      } else {
        return this.createErrorResult(
          result.error || "Error ejecutando comando",
          {
            commandName: commandName,
            commandResult: result,
          }
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error("Error procesando comando:", error);
      return this.createErrorResult(
        `Error procesando comando: ${errorMessage}`
      );
    }
  }

  /**
   * Verifica si el usuario es administrador
   */
  private isAdminUser(user?: any): boolean {
    return user?.user_type === "admin";
  }

  /**
   * Obtiene información del handler
   */
  getHandlerInfo(): any {
    const commands = this.commandRegistry.getAll();
    return {
      name: this.name,
      priority: this.priority,
      enabled: this.enabled,
      registeredCommands: commands.length,
      commandList: commands.map((cmd) => cmd.metadata.name),
      stats: this.getStats(),
    };
  }
}
