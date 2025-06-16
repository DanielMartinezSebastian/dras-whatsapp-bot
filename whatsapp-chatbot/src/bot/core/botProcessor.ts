/**
 * WhatsApp Chatbot - BotProcessor Modular
 *
 * Procesador principal del bot que coordina el manejo de mensajes
 * Implementa arquitectura modular con TypeScript para máxima escalabilidad
 *
 * @author Daniel Martinez Sebastian
 * @version 1.0.0
 * @description Coordinador principal con handlers especializados y sistema de comandos
 */

import { IBotProcessor } from "../../interfaces/core/IBotProcessor";
import {
  ProcessingResult,
  BotProcessorConfig,
  BotProcessorStats,
  BotMessageClassification,
  BotMessageClassificationType,
} from "../../types/core/bot-processor.types";
import { WhatsAppMessage, MessageType } from "../../types/core/message.types";
import { User } from "../../types/core/user.types";
import { HandlerContext } from "../../types/handlers/message-handler.types";
import { MessageClassifier } from "./messageClassifier";
import { UserService } from "../../services/userService";
import { PermissionService } from "../../services/permissionService";
import { unifiedCommandHandler } from "../commands/core/UnifiedCommandHandler";
import { commandRegistry } from "../commands/core/CommandRegistry";
import {
  MessageHandlerRegistry,
  CommandMessageHandler,
  AdminMessageHandler,
  RegistrationMessageHandler,
  ContextualMessageHandler,
} from "../handlers";
import logger from "../../utils/logger";

/**
 * Procesador principal del bot que coordina el manejo de mensajes
 * Reemplaza al MessageHandler monolítico con una arquitectura modular
 */
export class BotProcessor implements IBotProcessor {
  private startTime: Date;
  private processedMessages: Set<string>;
  private config: BotProcessorConfig;
  private isInitialized: boolean;
  private initializationPromise: Promise<void> | null;

  // Servicios principales
  private userService: UserService | null;
  private permissionService: PermissionService;
  private messageClassifier: MessageClassifier;

  // Sistema de handlers
  private handlerRegistry: MessageHandlerRegistry;

  // Cliente de WhatsApp (puede ser null en tests)
  private whatsappClient: any;

  // Estadísticas
  private stats: {
    processedCount: number;
    commandCount: number;
    errorCount: number;
  };

  constructor(whatsappClient?: any) {
    this.startTime = new Date();
    this.processedMessages = new Set();
    this.isInitialized = false;
    this.initializationPromise = null;

    // Configuración del bot
    this.config = {
      botName: process.env.BOT_NAME || "Assistant",
      botPrefix: process.env.BOT_PREFIX || "🤖 ",
      autoReply: process.env.AUTO_REPLY === "true" || true,
      commandPrefix: process.env.COMMAND_PREFIX || "/",
      useNewCommandSystem: process.env.USE_NEW_COMMANDS === "true" || false,
      maxDailyResponses: parseInt(process.env.MAX_DAILY_RESPONSES || "100", 10),
      minResponseInterval: parseInt(
        process.env.MIN_RESPONSE_INTERVAL || "1000",
        10
      ),
    };

    // Servicios principales
    this.userService = null;
    this.permissionService = new PermissionService();
    this.messageClassifier = new MessageClassifier();

    // Cliente de WhatsApp
    this.whatsappClient = whatsappClient;

    // Inicializar sistema de handlers
    this.handlerRegistry = new MessageHandlerRegistry();

    // Estadísticas
    this.stats = {
      processedCount: 0,
      commandCount: 0,
      errorCount: 0,
    };

    // Inicializar servicios (sin await para no bloquear el constructor)
    this.initializationPromise = this.initializeAsync();
  }

  /**
   * Inicialización asíncrona sin retorno para compatibilidad con la interfaz
   */
  private async initializeAsync(): Promise<void> {
    await this.initializeServices();
  }

  /**
   * Inicializa los servicios del procesador
   */
  async initializeServices(): Promise<boolean> {
    try {
      logger.info("🤖 BotProcessor: Inicializando servicios...");

      // Inicializar UserService
      logger.info("👥 BotProcessor: Inicializando UserService...");
      this.userService = new UserService();
      await this.userService.init();
      logger.info("✅ BotProcessor: UserService inicializado correctamente");

      // Inicializar sistema de comandos si está habilitado
      if (this.config.useNewCommandSystem) {
        logger.info("🔧 BotProcessor: Inicializando sistema de comandos...");
        try {
          const loadedCommands = commandRegistry.loadCommands();
          logger.info(`✅ BotProcessor: ${loadedCommands} comandos cargados`);
        } catch (error) {
          logger.warn(`⚠️ BotProcessor: Error cargando comandos: ${error}`);
          // No es crítico, el bot puede funcionar sin comandos
        }
      }

      // Inicializar sistema de handlers
      await this.initializeHandlers();

      // Marcar como inicializado
      this.isInitialized = true;
      logger.info(
        "🎉 BotProcessor: Todos los servicios inicializados correctamente"
      );

      return true;
    } catch (error) {
      logger.error(
        `❌ Error inicializando servicios del BotProcessor: ${
          (error as Error).message
        }`
      );
      this.stats.errorCount++;
      return false;
    }
  }

  /**
   * Procesa un mensaje entrante y devuelve el resultado
   */
  async processMessage(
    message: WhatsAppMessage,
    user: User
  ): Promise<ProcessingResult> {
    try {
      // Esperar a que la inicialización se complete
      await this.waitForInitialization();

      // Verificar si ya fue procesado
      if (this.hasProcessedMessage(message.id)) {
        return {
          success: true,
          shouldReply: false,
          classification: { type: "unknown", confidence: 0, patterns: [] },
          response: "Mensaje ya procesado",
        };
      }

      // Clasificar el mensaje
      const classification = this.messageClassifier.classifyMessage(
        message.text || ""
      );

      // Marcar como procesado
      this.markMessageAsProcessed(message.id);
      this.stats.processedCount++;

      // Procesar según la clasificación
      const result = await this.processClassifiedMessage(
        message,
        user,
        classification
      );

      if (classification.type === "command") {
        this.stats.commandCount++;
      }

      return result;
    } catch (error) {
      this.stats.errorCount++;
      return await this.handleErrorWithResult(message, error as Error);
    }
  }

  /**
   * Procesa un mensaje ya clasificado usando el sistema de handlers
   */
  private async processClassifiedMessage(
    message: WhatsAppMessage,
    user: User,
    classification: BotMessageClassification
  ): Promise<ProcessingResult> {
    try {
      // Crear contexto para los handlers
      const context: HandlerContext = {
        message,
        user,
        classification: {
          type: this.mapBotClassificationToMessageType(classification.type),
          command:
            classification.type === "command"
              ? message.text?.split(" ")[0]
              : undefined,
          confidence: classification.confidence,
          context: classification.context,
        },
        timestamp: new Date(),
      };

      // Obtener handlers que pueden manejar este contexto
      const availableHandlers =
        this.handlerRegistry.getHandlersForContext(context);

      if (availableHandlers.length === 0) {
        // Fallback a respuesta básica si no hay handlers disponibles
        return this.getFallbackResponse(classification);
      }

      // Intentar procesar con cada handler hasta encontrar uno que lo maneje
      for (const handler of availableHandlers) {
        try {
          const result = await handler.handle(context);

          if (result.handled) {
            logger.info(`✅ Mensaje procesado por ${handler.name}`);

            // Debug log para ver qué está retornando el handler
            console.log("🔍 DEBUG BotProcessor: Handler result:", {
              success: result.success,
              action: result.action,
              hasResponse: !!result.response,
              responseLength: result.response?.length || 0,
            });

            const shouldReply = result.action === "reply";
            console.log("🔍 DEBUG BotProcessor: shouldReply =", shouldReply);

            return {
              success: true,
              response: result.response || "",
              shouldReply: shouldReply,
              classification,
              action: {
                type: result.action === "reply" ? "send_message" : "no_action",
                data: { response: result.response },
              },
            };
          }
        } catch (error) {
          logger.warn(
            `⚠️ Error en handler ${handler.name}: ${(error as Error).message}`
          );
          // Continuar con el siguiente handler
        }
      }

      // Si ningún handler pudo procesar el mensaje, usar fallback
      logger.info(
        "🔄 Ningún handler pudo procesar el mensaje, usando respuesta fallback"
      );
      return this.getFallbackResponse(classification);
    } catch (error) {
      throw new Error(
        `Error procesando mensaje clasificado: ${(error as Error).message}`
      );
    }
  }

  /**
   * Proporciona una respuesta básica cuando no hay handlers disponibles
   */
  private getFallbackResponse(
    classification: BotMessageClassification
  ): ProcessingResult {
    let response = "";
    let shouldReply = false;

    switch (classification.type) {
      case "greeting":
        response = `¡Hola! Soy ${this.config.botName}. ¿En qué puedo ayudarte?`;
        shouldReply = this.config.autoReply;
        break;

      case "farewell":
        response = "¡Hasta luego! Que tengas un excelente día.";
        shouldReply = this.config.autoReply;
        break;

      case "help":
        response = `Estoy aquí para ayudarte. Usa ${this.config.commandPrefix}help para ver los comandos disponibles.`;
        shouldReply = true;
        break;

      case "question":
        response =
          "Interesante pregunta. ¿Podrías ser más específico para poder ayudarte mejor?";
        shouldReply = this.config.autoReply;
        break;

      default:
        response = "No entiendo lo que me dices. ¿Puedes ser más específico?";
        shouldReply = this.config.autoReply;
    }

    return {
      success: true,
      response,
      shouldReply,
      classification,
      action: {
        type: shouldReply ? "send_message" : "no_action",
        data: { response },
      },
    };
  }

  /**
   * Procesa un comando
   */
  private async processCommand(
    message: WhatsAppMessage,
    user: User
  ): Promise<string> {
    try {
      // Si el nuevo sistema de comandos está habilitado, usarlo
      if (this.config.useNewCommandSystem) {
        logger.info("🔧 Procesando comando con nuevo sistema");

        // Primero intentar manejar comandos contextuales
        const contextualHandled =
          await unifiedCommandHandler.handleContextualCommand(
            message,
            user,
            null // El bot cliente se puede pasar después si es necesario
          );

        if (contextualHandled) {
          return ""; // El comando contextual ya manejó la respuesta
        }

        // Luego intentar manejar comandos con prefijo
        const commandResult = await unifiedCommandHandler.handleCommand(
          message,
          user
        );

        if (
          commandResult.success &&
          commandResult.shouldReply &&
          commandResult.response
        ) {
          return commandResult.response;
        } else if (!commandResult.success && commandResult.error) {
          return commandResult.error;
        }

        // Si no se encontró comando, continuar con el sistema legacy
      }

      // Sistema de comandos legacy (fallback)
      const text = message.text || "";
      const command = text.split(" ")[0].toLowerCase();

      // Verificar permisos básicos
      if (!this.userService) {
        return "Servicio de usuarios no disponible";
      }

      // Comandos básicos sin verificación de permisos
      switch (command) {
        case "/help":
        case "/ayuda":
          return this.getHelpMessage(user);

        case "/ping":
          return "🏓 Pong!";

        case "/status":
          return this.getStatusMessage();

        case "/commands":
        case "/comandos":
          return this.getCommandsInfo();

        default:
          return `Comando no reconocido: ${command}. Usa /help para ver los comandos disponibles.`;
      }
    } catch (error) {
      logger.error(`Error procesando comando: ${(error as Error).message}`);
      return "Error procesando el comando";
    }
  }

  /**
   * Procesa un mensaje contextual
   */
  private async processContextualMessage(
    message: WhatsAppMessage,
    user: User,
    classification: BotMessageClassification
  ): Promise<string> {
    const keywords = classification.context?.keywords || [];

    if (keywords.includes("triste") || keywords.includes("deprimido")) {
      return "Lamento que te sientas así. Si necesitas hablar, estoy aquí para escucharte.";
    }

    if (keywords.includes("feliz") || keywords.includes("contento")) {
      return "¡Qué bueno que te sientas así! Me alegra saberlo.";
    }

    if (keywords.includes("tiempo") || keywords.includes("clima")) {
      return "No tengo acceso a información del clima en tiempo real, pero puedo ayudarte con otras cosas.";
    }

    return "Entiendo lo que me dices. ¿Hay algo específico en lo que pueda ayudarte?";
  }

  /**
   * Enruta un mensaje según su clasificación
   */
  async routeMessage(
    message: WhatsAppMessage,
    classification: BotMessageClassification
  ): Promise<void> {
    // Esta implementación puede ser expandida para diferentes tipos de routing
    logger.info(`📮 Enrutando mensaje tipo: ${classification.type}`);
  }

  /**
   * Verifica si el bot está listo para procesar mensajes
   */
  isReady(): boolean {
    return this.isInitialized && this.userService !== null;
  }

  /**
   * Espera a que la inicialización se complete
   */
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Obtiene las estadísticas del procesador
   */
  getStats(): BotProcessorStats {
    return {
      startTime: this.startTime,
      processedMessages: this.stats.processedCount,
      totalCommands: this.stats.commandCount,
      totalErrors: this.stats.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Obtiene estadísticas del sistema de handlers
   */
  getHandlerStats(): {
    totalHandlers: number;
    enabledHandlers: number;
    disabledHandlers: number;
  } {
    return this.handlerRegistry.getStats();
  }

  /**
   * Obtiene información de todos los handlers registrados
   */
  getRegisteredHandlers(): string[] {
    return this.handlerRegistry.getHandlerNames();
  }

  /**
   * Maneja errores durante el procesamiento
   */
  async handleError(message: WhatsAppMessage, error: Error): Promise<void> {
    logger.error(`❌ Error procesando mensaje ${message.id}: ${error.message}`);
    this.stats.errorCount++;
  }

  /**
   * Maneja errores y retorna resultado para uso interno
   */
  private async handleErrorWithResult(
    message: WhatsAppMessage,
    error: Error
  ): Promise<ProcessingResult> {
    await this.handleError(message, error);

    return {
      success: false,
      error: error.message,
      shouldReply: false,
      classification: { type: "unknown", confidence: 0, patterns: [] },
    };
  }

  /**
   * Cierra y limpia recursos del procesador
   */
  async shutdown(): Promise<void> {
    try {
      logger.info("🔄 Cerrando BotProcessor...");

      if (this.userService) {
        await this.userService.close();
      }

      this.permissionService.close();
      this.processedMessages.clear();

      logger.info("✅ BotProcessor cerrado correctamente");
    } catch (error) {
      logger.error(
        `❌ Error cerrando BotProcessor: ${(error as Error).message}`
      );
    }
  }

  /**
   * Actualiza la configuración del procesador
   */
  updateConfig(config: Partial<BotProcessorConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info("⚙️ Configuración del BotProcessor actualizada", config);
  }

  /**
   * Obtiene la configuración actual del procesador
   */
  getConfig(): BotProcessorConfig {
    return { ...this.config };
  }

  /**
   * Verifica si un mensaje ya fue procesado
   */
  hasProcessedMessage(messageId: string): boolean {
    return this.processedMessages.has(messageId);
  }

  /**
   * Marca un mensaje como procesado
   */
  markMessageAsProcessed(messageId: string): void {
    this.processedMessages.add(messageId);

    // Limpiar mensajes antiguos si hay demasiados
    if (this.processedMessages.size > 1000) {
      const messages = Array.from(this.processedMessages);
      messages.slice(0, 500).forEach((id) => this.processedMessages.delete(id));
    }
  }

  // Métodos de utilidad privados

  private getHelpMessage(user: User): string {
    return `
🤖 *${this.config.botName} - Comandos Disponibles*

*Comandos Básicos:*
${this.config.commandPrefix}help - Muestra esta ayuda
${this.config.commandPrefix}ping - Verifica que el bot responda
${this.config.commandPrefix}status - Estado del sistema

*Para más información, contacta con un administrador.*
    `.trim();
  }

  private getStatusMessage(): string {
    const stats = this.getStats();
    const uptimeMinutes = Math.floor(stats.uptime / (1000 * 60));

    return `
🔧 *Estado del Bot*

✅ Estado: Operativo
⏱️ Tiempo activo: ${uptimeMinutes} minutos
📨 Mensajes procesados: ${stats.processedMessages}
⚡ Comandos ejecutados: ${stats.totalCommands}
❌ Errores: ${stats.totalErrors}
    `.trim();
  }

  private getCommandsInfo(): string {
    if (!this.config.useNewCommandSystem) {
      return "Sistema de comandos legacy activo. Usa /help para ver comandos disponibles.";
    }

    try {
      const registryStats = commandRegistry.getStats();
      const categories = commandRegistry.getCategories();

      let info = `🔧 *Sistema de Comandos Avanzado*\n\n`;
      info += `📊 **Estadísticas:**\n`;
      info += `• Total comandos: ${registryStats.totalCommands}\n`;
      info += `• Ejecuciones: ${registryStats.totalExecutions}\n`;
      info += `• Categorías: ${categories.length}\n\n`;

      info += `📁 **Categorías disponibles:**\n`;
      categories.forEach((category) => {
        const count = registryStats.categoryCounts[category] || 0;
        info += `• ${category}: ${count} comandos\n`;
      });

      if (registryStats.mostUsedCommands.length > 0) {
        info += `\n⭐ **Comandos populares:**\n`;
        registryStats.mostUsedCommands.slice(0, 3).forEach((cmd, index) => {
          info += `${index + 1}. /${cmd}\n`;
        });
      }

      return info;
    } catch (error) {
      logger.error(`Error obteniendo info de comandos: ${error}`);
      return "Error obteniendo información del sistema de comandos.";
    }
  }

  /**
   * Inicializa el sistema de handlers de mensajes
   */
  private async initializeHandlers(): Promise<void> {
    try {
      logger.info("🔧 BotProcessor: Inicializando sistema de handlers...");

      // Verificar que los servicios requeridos estén disponibles
      if (!this.userService) {
        throw new Error("UserService no inicializado");
      }

      // Registrar CommandMessageHandler
      const commandHandler = new CommandMessageHandler();
      this.handlerRegistry.register(commandHandler);
      logger.info("✅ CommandMessageHandler registrado");

      // Registrar AdminMessageHandler (necesita IBotProcessor, IWhatsAppClient, IPermissionService)
      // Por ahora usar this como IBotProcessor y crear un mock client básico
      const mockWhatsAppClient = {
        sendMessage: async () => ({ success: true }),
        isConnected: () => true,
        getConnectionState: () => "open",
        close: async () => {},
      };

      const adminHandler = new AdminMessageHandler(
        this,
        mockWhatsAppClient as any,
        this.permissionService
      );
      this.handlerRegistry.register(adminHandler);
      logger.info("✅ AdminMessageHandler registrado");

      // Registrar RegistrationMessageHandler (necesita RegistrationService)
      // TODO: Descomentar cuando RegistrationService sea migrado a TypeScript
      /*
      try {
        // Importar dinámicamente para evitar dependencias circulares
        const { RegistrationService } = await import("../../services/registrationService");
        const registrationService = new RegistrationService();
        
        const registrationHandler = new RegistrationMessageHandler(
          this,
          mockWhatsAppClient as any,
          registrationService
        );
        this.handlerRegistry.register(registrationHandler);
        logger.info("✅ RegistrationMessageHandler registrado");
      } catch (error) {
        logger.warn(`⚠️ No se pudo registrar RegistrationMessageHandler: ${error}`);
      }
      */
      logger.info(
        "⏳ RegistrationMessageHandler omitido (RegistrationService no migrado aún)"
      );

      // Registrar ContextualMessageHandler
      try {
        const contextualHandler = new ContextualMessageHandler(this);
        this.handlerRegistry.register(contextualHandler);
        logger.info("✅ ContextualMessageHandler registrado");
      } catch (error) {
        logger.warn(
          `⚠️ No se pudo registrar ContextualMessageHandler: ${error}`
        );
        // No es crítico, continuar sin handler contextual
      }

      const stats = this.handlerRegistry.getStats();
      logger.info(
        `🎉 Sistema de handlers inicializado: ${stats.totalHandlers} handlers, ${stats.enabledHandlers} habilitados`
      );
    } catch (error) {
      logger.error(
        `❌ Error inicializando handlers: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Mapea un tipo de clasificación del bot a un tipo de mensaje de handler
   */
  private mapBotClassificationToMessageType(
    botType: BotMessageClassificationType
  ): MessageType {
    switch (botType) {
      case "command":
        return "COMMAND";
      case "greeting":
        return "GREETING";
      case "farewell":
        return "FAREWELL";
      case "question":
        return "QUESTION";
      case "help":
        return "HELP_REQUEST";
      default:
        return "GENERAL";
    }
  }
}
