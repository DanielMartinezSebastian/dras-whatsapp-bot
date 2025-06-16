/**
 * WhatsApp Chatbot - MessageProcessor Modular
 *
 * Procesador principal de mensajes con arquitectura especializada
 * Sistema de handlers coordinados para máxima eficiencia
 *
 * @author Daniel Martinez Sebastian
 * @version 1.0.0
 * @description Coordina todos los servicios y handlers especializados
 */

const { logInfo, logError, logWarn } = require("../../utils/logger");
const UserService = require("../../services/userService");
const PermissionService = require("../../services/permissionService");

// Handlers especializados
const CommandHandler = require("../handlers/CommandHandler");
const ContextualHandler = require("../handlers/ContextualHandler");
const AdminHandler = require("../handlers/AdminHandler");

// Servicios de comandos
const UserCommandService = require("../services/UserCommandService");
const SystemCommandService = require("../services/SystemCommandService");
const ConversationService = require("../services/ConversationService");

// Procesadores específicos
const GreetingProcessor = require("../processors/GreetingProcessor");
const QuestionProcessor = require("../processors/QuestionProcessor");
const HelpProcessor = require("../processors/HelpProcessor");

/**
 * PROCESADOR PRINCIPAL DE MENSAJES
 *
 * Coordina todos los servicios y handlers especializados.
 * Reemplaza al MessageHandler monolítico anterior.
 */
class MessageProcessor {
  constructor(whatsappClient) {
    this.whatsappClient = whatsappClient;
    this.botName = process.env.BOT_NAME || "Assistant";
    this.autoReply = process.env.AUTO_REPLY === "true" || true;
    this.processedMessages = new Set();
    this.startTime = new Date();

    // Bot prefix (eliminando gradualmente su uso)
    this.botPrefix = ""; // Antes era: process.env.BOT_PREFIX || "Bot "

    // Inicializar servicios core
    this.initializeServices();

    // Inicializar handlers especializados
    this.initializeHandlers();

    // Inicializar procesadores específicos
    this.initializeProcessors();
  }

  async initializeServices() {
    try {
      // Servicios fundamentales
      this.userService = new UserService();
      await this.userService.initializeService();
      this.userServiceReady = true;

      this.permissionService = new PermissionService();
      this.conversationService = new ConversationService();

      // Servicios de comandos
      this.userCommandService = new UserCommandService(
        this.userService,
        this.permissionService
      );
      this.systemCommandService = new SystemCommandService(
        this,
        this.userService
      );

      logInfo("✅ Servicios del MessageProcessor inicializados");
    } catch (error) {
      logError(`❌ Error inicializando servicios: ${error.message}`);
      this.userServiceReady = false;
    }
  }

  initializeHandlers() {
    // Handlers principales
    this.commandHandler = new CommandHandler(this);
    this.contextualHandler = new ContextualHandler(this);
    this.adminHandler = new AdminHandler(this);

    logInfo("✅ Handlers especializados inicializados");
  }

  initializeProcessors() {
    // Procesadores específicos
    this.greetingProcessor = new GreetingProcessor(this);
    this.questionProcessor = new QuestionProcessor(this);
    this.helpProcessor = new HelpProcessor(this);

    logInfo("✅ Procesadores específicos inicializados");
  }

  // ==================== PROCESAMIENTO PRINCIPAL ====================

  async processMessage(message) {
    if (!message?.content || !message?.chatJid) {
      return;
    }

    const messageId = `${message.chatJid}_${message.timestamp || Date.now()}`;
    if (this.processedMessages.has(messageId)) {
      return;
    }

    this.processedMessages.add(messageId);

    try {
      // 1. Procesar usuario
      const user = await this.processUser(message);

      // 2. Verificar si el usuario está bloqueado
      if (user?.user_type === "block") {
        logInfo(`Mensaje ignorado - usuario bloqueado: ${user.whatsapp_jid}`);
        return;
      }

      // 3. Actualizar contexto de conversación
      const context = this.conversationService.updateContext(message, user);

      // 4. Verificar rate limiting
      if (!(await this.checkRateLimit(message, user))) {
        return;
      }

      // 5. Determinar tipo de mensaje y procesar
      const response = await this.determineResponse(message, context, user);

      // 6. Enviar respuesta si existe
      if (response) {
        await this.sendResponse(message, response, user);
      }
    } catch (error) {
      logError(`Error procesando mensaje: ${error.message}`);
    }
  }

  async processUser(message) {
    if (!this.userServiceReady) return null;

    try {
      return await this.userService.processUserFromMessage(message);
    } catch (error) {
      logError(`Error procesando usuario: ${error.message}`);
      return null;
    }
  }

  async checkRateLimit(message, user) {
    const isCommand = message.content.trim().startsWith("/");

    if (this.whatsappClient.canRespondToMessage) {
      const canRespond = await this.whatsappClient.canRespondToMessage(
        message.chatJid,
        message.content,
        isCommand
      );
      if (!canRespond) {
        logInfo(
          `Rate limiting: no se puede responder al chat ${message.chatJid}`
        );
        return false;
      }
    } else {
      const canRespondToChat = await this.whatsappClient.canRespondToChat(
        message.chatJid
      );
      if (!canRespondToChat) {
        logInfo(
          `Rate limiting: no se puede responder al chat ${message.chatJid}`
        );
        return false;
      }
    }

    return true;
  }

  // ==================== DETERMINACIÓN DE RESPUESTAS ====================

  async determineResponse(message, context, user) {
    const content = message.content.trim();

    // 1. ¿Es un comando?
    if (content.startsWith("/")) {
      return await this.commandHandler.processCommand(message, context, user);
    }

    // 2. ¿Auto-reply está activado?
    if (!this.autoReply) {
      return null;
    }

    // 3. Procesar mensaje contextual
    return await this.contextualHandler.processMessage(message, context, user);
  }

  async sendResponse(message, response, user) {
    const isCommand =
      message.content.trim().startsWith("/") ||
      message.content.trim().startsWith("!");

    try {
      const result = await this.whatsappClient.sendMessage(
        message.chatJid,
        response,
        isCommand
      );

      if (result.success) {
        logInfo(
          `Respuesta enviada a ${message.chatJid}: ${response.substring(
            0,
            100
          )}...`
        );

        // Registrar respuesta en rate limiting
        if (this.whatsappClient.recordResponse) {
          await this.whatsappClient.recordResponse(message.chatJid, isCommand);
        }

        // Registrar interacción exitosa
        if (this.userServiceReady && user) {
          await this.logSuccessfulInteraction(user, response);
        }
      } else {
        logError(`Error enviando respuesta: ${result.error}`);
      }
    } catch (error) {
      logError(`Error en sendResponse: ${error.message}`);
    }
  }

  async logSuccessfulInteraction(user, response) {
    try {
      await this.userService.userModel.logInteraction(user.id, {
        interaction_type: "bot_response",
        content_summary: response.substring(0, 200),
        response_pattern: "automated_response",
        processing_time: 0,
        success: true,
      });
    } catch (error) {
      logError(`Error registrando interacción: ${error.message}`);
    }
  }

  // ==================== ACCESO A SERVICIOS ====================

  getUserService() {
    return this.userService;
  }

  getPermissionService() {
    return this.permissionService;
  }

  getConversationService() {
    return this.conversationService;
  }

  getUserCommandService() {
    return this.userCommandService;
  }

  getSystemCommandService() {
    return this.systemCommandService;
  }

  getWhatsAppClient() {
    return this.whatsappClient;
  }

  // ==================== UTILIDADES ====================

  getStats() {
    return {
      startTime: this.startTime,
      processedMessages: this.processedMessages.size,
      autoReply: this.autoReply,
      userServiceReady: this.userServiceReady,
      botName: this.botName,
      uptime: this.getUptime(),
    };
  }

  getUptime() {
    if (!this.startTime) return "Desconocido";
    const uptime = Date.now() - this.startTime.getTime();
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // ==================== MÉTODOS DE COMPATIBILIDAD ====================
  // Para mantener compatibilidad con código existente

  get processedMessages() {
    return this._processedMessages || new Set();
  }

  set processedMessages(value) {
    this._processedMessages = value;
  }

  get botName() {
    return this._botName;
  }

  set botName(value) {
    this._botName = value;
  }

  get autoReply() {
    return this._autoReply;
  }

  set autoReply(value) {
    this._autoReply = value;
  }

  // ==================== LIMPIEZA DE RECURSOS ====================

  cleanup() {
    try {
      logInfo("🧹 Limpiando MessageProcessor...");

      // Limpiar handlers especializados
      if (
        this.contextualHandler &&
        typeof this.contextualHandler.cleanup === "function"
      ) {
        this.contextualHandler.cleanup();
      }

      // Limpiar procesadores
      this.processedMessages.clear();

      // Cerrar servicios
      if (this.userService && typeof this.userService.cleanup === "function") {
        this.userService.cleanup();
      }

      logInfo("✅ MessageProcessor limpiado correctamente");
    } catch (error) {
      logError(`Error en cleanup de MessageProcessor: ${error.message}`);
    }
  }
}

module.exports = MessageProcessor;
