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
import { ConfigurationService } from "../../services/ConfigurationService";

/**
 * Handler para procesar comandos del bot
 */
export class CommandMessageHandler extends BaseMessageHandler {
  private commandRegistry: CommandRegistry;
  private commandHandler: UnifiedCommandHandler;
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super("command", 1); // Alta prioridad para comandos
    this.commandRegistry = commandRegistry; // Usar la instancia singleton
    this.commandHandler = new UnifiedCommandHandler();
    this.configService = configService;

    // Cargar comandos al inicializar
    try {
      const loadedCount = this.loadBasicCommands();
      console.log(
        `🔍 DEBUG CommandHandler: Cargados ${loadedCount} comandos básicos manualmente`
      );
    } catch (error) {
      console.error(
        this.getConfigMessage(
          "commands.loading_error",
          {},
          "🔍 DEBUG CommandHandler: Error cargando comandos:"
        ),
        error
      );
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
        new HelpCommand(this.configService),
        new PingCommand(this.configService),
        new InfoCommand(this.configService),
        new StatusCommand(this.configService),
        new ProfileCommand(this.configService),
        new PermissionsCommand(this.configService),
        new AdminPanelCommand(this.configService),
        new DiagnosticCommand(this.configService),
        new UsersCommand(this.configService),
        new AdminSystemCommand(this.configService),
        new LogsCommand(this.configService),
        new StatsCommand(this.configService),
      ];

      for (const command of commands) {
        try {
          this.commandRegistry.register(command);
          loadedCount++;
        } catch (error) {
          console.warn(
            this.getConfigMessage(
              "command_registration_error",
              { commandName: command.metadata?.name },
              `⚠️ Error registrando comando ${command.metadata?.name}:`
            ),
            error
          );
        }
      }

      return loadedCount;
    } catch (error) {
      console.error(
        this.getConfigMessage(
          "commands_import_error",
          {},
          "Error importing commands:"
        ),
        error
      );
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
          error: this.getConfigMessage(
            "command_extraction_error",
            {},
            "No se pudo extraer el nombre del comando"
          ),
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
          this.getConfigMessage(
            "execution_error",
            { error: result.error },
            result.error || "Error ejecutando comando"
          ),
          {
            commandName: commandName,
            commandResult: result,
          }
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : this.getConfigMessage("unknown_error", {}, "Error desconocido");
      console.error("Error procesando comando:", error);
      return this.createErrorResult(
        this.getConfigMessage(
          "processing_error",
          { error: errorMessage },
          `Error procesando comando: ${errorMessage}`
        )
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

  /**
   * Obtiene un mensaje de la configuración con soporte para plantillas y variables
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

      // Obtener mensaje desde commands, messages o errors
      let message =
        this.getValueByPath(config, `commands.${path}`) ||
        this.getValueByPath(config, `messages.${path}`) ||
        this.getValueByPath(config, `errors.${path}`);

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
      return fallback || "Error en configuración";
    }
  }

  /**
   * Reemplaza variables en una plantilla
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    let result = template;

    // Reemplazar variables básicas
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        String(value || "")
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
}
