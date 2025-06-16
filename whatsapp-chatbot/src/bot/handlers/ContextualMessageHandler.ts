import { promises as fs } from "fs";
import * as path from "path";
import { BaseMessageHandler } from "./core/BaseMessageHandler";
import { IContextualMessageHandler } from "../../interfaces/handlers/IContextualMessageHandler";
import {
  HandlerContext,
  HandlerResult,
} from "../../types/handlers/message-handler.types";
import {
  IConversationContext,
  IMessageClassification,
  IContextualHandlerStats,
  TimeOfDay,
  ResponseCategory,
  IResponseReplacements,
  IUserProfile,
  IResponses,
  ISavedConversationData,
  IQuestionTypeWords,
  QuestionType,
} from "../../types/handlers/contextual-handler.types";
import { WhatsAppMessage } from "../../types/core/message.types";
import { logInfo, logError, logWarn } from "../../utils/logger";
import { ConfigurationService } from "../../services/ConfigurationService";

/**
 * Handler especializado para mensajes contextuales y conversaciones naturales
 * Maneja saludos, preguntas, ayuda y conversaciones generales
 */
export class ContextualMessageHandler
  extends BaseMessageHandler
  implements IContextualMessageHandler
{
  private contextFilePath: string;
  private lastSaveTime: number;
  private saveInterval: number;
  private pendingChanges: boolean;
  private conversationContext: Map<string, IConversationContext>;
  private userProfiles: Map<string, IUserProfile>;
  private lastMessageTime: Map<string, Date>;
  private responses: IResponses;
  private contextualStats: IContextualHandlerStats;
  private botProcessor: any;
  private whatsappClient: any;
  private configService: ConfigurationService;

  // Sistema para manejar solicitud de nombres
  private awaitingNameUsers: Set<string>;

  constructor(botProcessor: any, configService: ConfigurationService) {
    super("ContextualHandler", 8); // Priority 8 for contextual handling

    this.botProcessor = botProcessor;
    this.whatsappClient = botProcessor.whatsappClient;
    this.configService = configService;

    // Ruta del archivo de contexto
    this.contextFilePath = path.join(
      __dirname,
      "../../../data/conversation-context.json"
    );

    // Control de guardado periódico
    this.lastSaveTime = Date.now();
    this.saveInterval = 60000; // Guardar cada minuto como máximo
    this.pendingChanges = false;

    // Sistema de contexto de conversaciones
    this.conversationContext = new Map();
    this.userProfiles = new Map();
    this.lastMessageTime = new Map();

    // Sistema para manejar solicitud de nombres
    this.awaitingNameUsers = new Set();

    // Cargar contexto si existe
    this.loadConversationContext();

    // Respuestas configurables - se obtienen via ConfigurationService
    this.responses = {}; // Se mantendrá por compatibilidad pero no se usará

    // Estadísticas específicas del handler contextual
    this.contextualStats = {
      totalMessages: 0,
      handledMessages: 0,
      failedMessages: 0,
      successRate: 0,
      averageResponseTime: 0,
      greetings: 0,
      farewells: 0,
      questions: 0,
      helpRequests: 0,
      generalMessages: 0,
      activeConversations: 0,
    };
  }

  /**
   * Getter para userService (lazy loading)
   */
  private getUserService() {
    return this.botProcessor.userService;
  }

  /**
   * Verifica si puede manejar el mensaje
   */
  public canHandle(context: HandlerContext): boolean {
    const { message, classification } = context;

    // Si estamos esperando el nombre de este usuario, podemos manejar cualquier mensaje
    if (this.awaitingNameUsers.has(message.chatJid)) {
      return true;
    }

    // El handler contextual puede manejar cualquier tipo de mensaje clasificado como contextual
    const contextualTypes = [
      "GREETING",
      "FAREWELL",
      "QUESTION",
      "HELP_REQUEST",
      "CONTEXTUAL",
      "GENERAL",
    ];

    return contextualTypes.includes(classification.type || "");
  }

  /**
   * Maneja un mensaje contextual
   */
  public async handle(context: HandlerContext): Promise<HandlerResult> {
    return await super.handle(context);
  }

  /**
   * Implementación del método abstracto de BaseMessageHandler
   */
  protected async processMessage(
    context: HandlerContext
  ): Promise<HandlerResult> {
    try {
      const { message, classification } = context;

      // Extraer el número sin @s.whatsapp.net para los logs
      const phoneJid = message.chatJid; // Usar chatJid para consistencia
      const phone = message.senderPhone; // Solo el número para logs

      logInfo(
        `🔍 HANDLE: Procesando mensaje para ${phone}, tipo: ${classification.type}`
      );

      // Verificar si el usuario está esperando proporcionar su nombre
      if (this.awaitingNameUsers.has(phoneJid)) {
        const nameResponse = await this.handleNameResponse(message);
        if (nameResponse.success) {
          return nameResponse;
        }
      }

      // Actualizar contexto antes de procesar
      this.updateConversationContext(message);

      // Obtener contexto de la conversación
      const conversationContext = this.getConversationContext(phoneJid);

      logInfo(
        `🔍 HANDLE: Procesando mensaje contextual: ${classification.type}`
      );

      // Procesar según el tipo específico
      const messageClassification: IMessageClassification = {
        type: classification.type as any,
        keywords: [],
        questionType: "general",
        confidence: classification.confidence || 0.8,
      };

      // Verificar si el usuario quiere cambiar su nombre
      const nameChangeRequest = await this.detectNameChangeRequest(message);
      if (nameChangeRequest) {
        return await this.handleNameChangeRequest(message, nameChangeRequest);
      }

      let result: HandlerResult;

      switch (classification.type) {
        case "GREETING":
          result = await this.handleGreeting(message, conversationContext);
          this.contextualStats.greetings++;
          break;
        case "FAREWELL":
          result = await this.handleFarewell(message, conversationContext);
          this.contextualStats.farewells++;
          break;
        case "QUESTION":
          result = await this.handleQuestion(
            message,
            conversationContext,
            messageClassification
          );
          this.contextualStats.questions++;
          break;
        case "HELP_REQUEST":
          result = await this.handleHelpRequest(message, conversationContext);
          this.contextualStats.helpRequests++;
          break;
        case "GENERAL":
          result = await this.handleContextualMessage(
            message,
            conversationContext,
            messageClassification
          );
          break;
        default:
          result = await this.handleDefault(message, conversationContext);
          this.contextualStats.generalMessages++;
      }

      this.contextualStats.handledMessages++;

      return result;
    } catch (error) {
      logError(
        `Error procesando mensaje contextual: ${
          error instanceof Error ? error.message : error
        }`
      );
      this.contextualStats.failedMessages++;

      return await this.handleContextualError(context.message, error as Error);
    }
  }

  /**
   * Maneja saludos
   */
  public async handleGreeting(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<HandlerResult> {
    // Extraer el número de teléfono sin el @s.whatsapp.net
    const phoneJid = message.senderPhone;
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;
    const now = new Date();

    logInfo(`🔍 GREETING: Procesando saludo para: ${phoneJid}`);
    logInfo(`🔍 GREETING: Número normalizado: ${phone}`);

    // Verificación explícita del contexto
    if (!context) {
      logInfo(
        `🔍 GREETING: No se recibió contexto directo, buscando en Map...`
      );

      const storedContext = this.conversationContext.get(phone);
      if (storedContext) {
        logInfo(
          `🔍 GREETING: Contexto encontrado en Map: messageCount=${storedContext.messageCount}, firstMessage=${storedContext.firstMessage}`
        );
        context = storedContext;
      } else {
        logInfo(
          `🔍 GREETING: No se encontró ningún contexto para ${phone} - creando contexto de emergencia`
        );

        context = {
          firstMessage: now,
          messageCount: 1,
          lastActivity: now,
          topics: [],
          userType: "unknown",
        };

        this.conversationContext.set(phone, context);
        this.saveConversationContext();
      }
    }

    // Verificar si el usuario necesita registrar su nombre ANTES de obtener el nombre
    const userService = this.getUserService();
    let needsName = false;
    let user = null;

    if (userService) {
      try {
        user = await userService.getUserByPhone(phone);
        needsName = user && this.needsDisplayName(user, phone);

        logInfo(
          `🔍 GREETING: Usuario encontrado: ${
            user ? "Sí" : "No"
          }, needsName: ${needsName}`
        );

        if (needsName && !this.awaitingNameUsers.has(phoneJid)) {
          logInfo(
            `🔍 GREETING: Usuario ${phone} necesita proporcionar nombre - solicitando`
          );
          this.awaitingNameUsers.add(phoneJid);
          return await this.requestUserName(phoneJid);
        }
      } catch (error) {
        logError(
          `Error verificando usuario: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }

    // Si estamos esperando el nombre, no procesar saludo normal
    if (this.awaitingNameUsers.has(phoneJid)) {
      logInfo(
        `🔍 GREETING: Usuario ${phone} está en proceso de registro de nombre - ignorando saludo`
      );
      return {
        handled: false,
        success: true,
        action: "ignore",
      };
    }

    // Obtener el nombre del usuario (ahora sabemos que tiene nombre válido)
    const userName = user?.display_name || "Usuario";
    logInfo(`🔍 GREETING: Nombre obtenido para saludo: "${userName}"`);

    const timeOfDay = this.getTimeOfDay();
    logInfo(`🔍 GREETING: Hora del día detectada: ${timeOfDay}`);

    // Evaluar si es usuario recurrente
    const isReturningUser = context && context.messageCount > 1;

    logInfo(
      `🔍 GREETING: ¿Usuario recurrente?: ${
        isReturningUser ? "Sí" : "No"
      } (messageCount=${context?.messageCount || 0})`
    );

    let response: string;
    if (isReturningUser && userName !== "Usuario") {
      logInfo(
        `🔍 GREETING: SELECCIONANDO RESPUESTA PARA USUARIO RECURRENTE: ${phone}`
      );
      response = this.getRandomResponse("greeting_returning", {
        userName,
        timeOfDay,
      });
    } else {
      logInfo(
        `🔍 GREETING: SELECCIONANDO RESPUESTA PARA USUARIO NUEVO: ${phone}`
      );
      response = this.getRandomResponse("greeting_new", {
        userName,
        timeOfDay,
      });
    }

    logInfo(`ContextualHandler: Respuesta generada: "${response}"`);

    // En lugar de enviar directamente, retornar la respuesta
    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: {
        handlerName: this.name,
        isGreeting: true,
        isReturningUser,
        userName,
        timeOfDay,
      },
    };
  }

  /**
   * Maneja despedidas
   */
  public async handleFarewell(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<HandlerResult> {
    const phoneJid = message.senderPhone;
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;

    logInfo(`🔍 FAREWELL: Procesando despedida para: ${phoneJid}`);

    // Obtener información del remitente para personalizar la despedida
    const userName = await this.getUserName(message.senderPhone);
    const timeOfDay = this.getTimeOfDay();

    logInfo(`🔍 FAREWELL: Nombre obtenido para despedida: "${userName}"`);
    logInfo(`🔍 FAREWELL: Hora del día detectada: ${timeOfDay}`);

    // Determinar si es un usuario frecuente
    const isFrequentUser = context && context.messageCount > 5;

    // Marcar que la conversación está terminando
    if (context) {
      context.conversationEnding = true;
      context.lastActivity = new Date();
    }

    // Seleccionar respuesta apropiada según contexto
    let responseCategory: ResponseCategory;
    const replacements: IResponseReplacements = {
      userName,
      timeOfDay,
    };

    if (isFrequentUser) {
      responseCategory = "farewell_frequent";
    } else if (timeOfDay === "night") {
      responseCategory = "farewell_night";
    } else {
      responseCategory = "farewell_general";
    }

    const response = this.getRandomResponse(responseCategory, replacements);

    logInfo(`🔍 FAREWELL: Enviando respuesta: "${response}"`);

    // En lugar de enviar directamente, retornar la respuesta
    // Guardar contexto con información de despedida
    this.saveConversationContext();

    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: {
        handlerName: this.name,
        isFarewell: true,
        isFrequentUser,
        userName,
        timeOfDay,
      },
    };
  }

  /**
   * Maneja preguntas
   */
  public async handleQuestion(
    message: WhatsAppMessage,
    context: IConversationContext | null,
    classification: IMessageClassification
  ): Promise<HandlerResult> {
    const questionType = classification.questionType || "general";
    const questionText = message.text.toLowerCase();

    // Detectar preguntas específicas sobre el bot
    if (this.isBotRelatedQuestion(questionText)) {
      return await this.handleBotQuestion(message, questionText);
    }

    // Responder según el tipo de pregunta
    let response: string;
    const questionTypeWords: IQuestionTypeWords = {
      what: ["what", "qué", "que", "cual", "cuál", "cuales", "cuáles"],
      how: ["how", "cómo", "como"],
      when: ["when", "cuándo", "cuando"],
      where: ["where", "dónde", "donde"],
      why: ["why", "por qué", "porque", "por que"],
      who: ["who", "quién", "quien", "quienes", "quiénes"],
    };

    // Detect question type from multiple languages
    let detectedType: QuestionType = "general";
    for (const [type, words] of Object.entries(questionTypeWords)) {
      if (words.some((word) => questionText.includes(word))) {
        detectedType = type as QuestionType;
        break;
      }
    }

    switch (detectedType) {
      case "what":
        response = this.handleWhatQuestion(questionText);
        break;
      case "how":
        response = this.handleHowQuestion(questionText);
        break;
      case "when":
        response = this.handleWhenQuestion(questionText);
        break;
      case "where":
        response = this.handleWhereQuestion(questionText);
        break;
      case "why":
        response = this.handleWhyQuestion(questionText);
        break;
      case "who":
        response = this.handleWhoQuestion(questionText);
        break;
      default:
        response = this.getRandomResponse("question_general");
    }

    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: {
        handlerName: this.name,
        questionType: detectedType,
        classification,
      },
    };
  }

  /**
   * Maneja solicitudes de ayuda
   */
  public async handleHelpRequest(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<HandlerResult> {
    const helpText = message.text.toLowerCase();

    // Detectar tipo específico de ayuda
    if (helpText.includes("comando") || helpText.includes("función")) {
      const response = `🆘 *Ayuda con Comandos*

Los comandos principales son:
• /help - Lista completa de comandos
• /info - Información sobre el bot
• /estado - Estado del sistema
• /profile - Tu perfil de usuario

¿Necesitas ayuda con algún comando específico?`;

      return {
        handled: true,
        success: true,
        response: response,
        action: "reply",
        data: { handlerName: this.name, isHelpRequest: true, isNewUser: true },
      };
    } else {
      const response = this.getRandomResponse("help_request");
      return {
        handled: true,
        success: true,
        response: response,
        action: "reply",
        data: { handlerName: this.name, isHelpRequest: true, isNewUser: false },
      };
    }
  }

  /**
   * Maneja mensajes contextuales generales
   */
  public async handleContextualMessage(
    message: WhatsAppMessage,
    context: IConversationContext | null,
    classification: IMessageClassification
  ): Promise<HandlerResult> {
    const keywords = classification.keywords || [];
    const messageText = message.text.toLowerCase();

    // Procesar según palabras clave
    // Migración en progreso - por ahora retornar resultado por defecto
    const response = this.getRandomResponse("contextual_general");
    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: { handlerName: this.name, messageType: "contextual" },
    };
  }

  /**
   * Maneja mensajes por defecto
   */
  public async handleDefault(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<HandlerResult> {
    if (!this.botProcessor.autoReply) {
      return {
        handled: false,
        success: true,
        action: "ignore",
      }; // No responder automáticamente si está deshabilitado
    }

    const response = this.getRandomResponse("default");
    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: { handlerName: this.name, messageType: "default" },
    };
  }

  /**
   * Actualiza el contexto de conversación
   */
  public updateConversationContext(message: WhatsAppMessage): void {
    const phoneJid = message.senderPhone;
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;
    const now = new Date();

    logInfo(`🔍 UPDATE_CONTEXT: Actualizando contexto para: ${phone}`);

    let context = this.conversationContext.get(phone);

    if (!context) {
      // Crear nuevo contexto para usuario nuevo
      context = {
        firstMessage: now,
        messageCount: 1,
        lastActivity: now,
        topics: [],
        userType: "new",
      };

      logInfo(`🔍 UPDATE_CONTEXT: Creando nuevo contexto para ${phone}`);
    } else {
      // Actualizar contexto existente
      context.messageCount++;
      context.lastActivity = now;

      logInfo(
        `🔍 UPDATE_CONTEXT: Actualizando contexto existente para ${phone}: messageCount=${context.messageCount}`
      );
    }

    this.conversationContext.set(phone, context);
    this.lastMessageTime.set(phone, now);
    this.pendingChanges = true;

    // Guardar contexto periódicamente
    const currentTime = Date.now();
    if (
      this.pendingChanges &&
      currentTime - this.lastSaveTime > this.saveInterval
    ) {
      this.saveConversationContext();
      this.lastSaveTime = currentTime;
      this.pendingChanges = false;
    }

    // Actualizar estadísticas
    this.contextualStats.activeConversations = this.conversationContext.size;
  }

  /**
   * Obtiene el contexto de conversación
   */
  public getConversationContext(phoneJid: string): IConversationContext | null {
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;

    logInfo(
      `🔍 GET_CONTEXT: Buscando contexto para: ${phone} (original: ${phoneJid})`
    );

    const context = this.conversationContext.get(phone);

    if (context) {
      logInfo(
        `🔍 GET_CONTEXT: Contexto encontrado para ${phone}: messageCount=${context.messageCount}`
      );
    } else {
      logInfo(`🔍 GET_CONTEXT: No se encontró contexto para ${phone}`);
    }

    return context || null;
  }

  /**
   * Verifica si un usuario necesita proporcionar un display_name válido
   */
  private needsDisplayName(user: any, phone: string): boolean {
    // Casos donde el usuario necesita proporcionar un nombre:
    // 1. No tiene display_name
    // 2. display_name está vacío
    // 3. display_name es igual al número de teléfono
    // 4. display_name solo contiene números (probablemente auto-generado)

    if (!user.display_name || user.display_name.trim() === "") {
      return true;
    }

    const displayName = user.display_name.trim();

    // Si el display_name es igual al número de teléfono
    if (displayName === phone || displayName === user.phone_number) {
      return true;
    }

    // Si el display_name solo contiene números (probablemente auto-generado)
    if (/^\d+$/.test(displayName)) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene el nombre del usuario
   */
  public async getUserName(phoneJid: string): Promise<string> {
    try {
      const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;

      const userService = this.getUserService();

      if (userService) {
        const user = await userService.getUserByPhone(phone);

        // Si el usuario existe pero no tiene display_name válido, marcar para solicitud
        if (user && this.needsDisplayName(user, phone)) {
          // Solo marcar si no está ya en proceso de solicitud
          if (!this.awaitingNameUsers.has(phoneJid)) {
            // No llamar requestUserName aquí, solo marcarlo para solicitud posterior
            this.awaitingNameUsers.add(phoneJid);
          }
          return "Usuario"; // Usar temporalmente hasta que proporcione el nombre
        }

        return user?.display_name || "Usuario";
      }
    } catch (error) {
      logError(
        `Error obteniendo nombre de usuario: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
    return "Usuario";
  }

  /**
   * Maneja la respuesta cuando el usuario proporciona su nombre
   */
  private async handleNameResponse(
    message: WhatsAppMessage
  ): Promise<HandlerResult> {
    try {
      const phoneJid = message.chatJid; // Usar chatJid que contiene el JID completo
      const phone = message.senderPhone; // Solo el número para logs
      const name = message.text.trim();

      // Validar que el nombre no esté vacío y sea razonable
      if (name.length < 1 || name.length > 50) {
        const invalidMessage = this.getConfigMessage(
          "registration.name_invalid",
          {},
          "Por favor, proporciona un nombre válido (entre 1 y 50 caracteres)."
        );
        return {
          handled: true,
          success: false,
          response: invalidMessage,
          action: "reply",
          data: { handlerName: this.name, nameValidation: "invalid" },
        };
      }

      // Actualizar el nombre del usuario en la base de datos
      const userService = this.getUserService();
      if (userService) {
        await userService.updateUser(phoneJid, { display_name: name });

        // Remover de la lista de usuarios esperando nombre
        this.awaitingNameUsers.delete(phoneJid);

        logInfo(`✅ Nombre actualizado para ${phone}: "${name}"`);

        // Enviar confirmación personalizada
        const responses = [
          `¡Perfecto, ${name}! 😊 Es un gusto conocerte. Desde ahora te llamaré por tu nombre.`,
          `¡Excelente, ${name}! 👋 Ya tengo tu nombre guardado. ¿En qué puedo ayudarte?`,
          `¡Hola ${name}! 🎉 Gracias por decirme tu nombre. Ahora nuestras conversaciones serán más personales.`,
        ];

        const randomResponse =
          responses[Math.floor(Math.random() * responses.length)];

        return {
          handled: true,
          success: true,
          response: randomResponse,
          action: "reply",
          data: { handlerName: this.name, nameRegistered: name },
        };
      } else {
        throw new Error("UserService no disponible");
      }
    } catch (error) {
      logError(
        `Error guardando nombre de usuario: ${
          error instanceof Error ? error.message : error
        }`
      );

      // En caso de error, remover de la lista y notificar
      this.awaitingNameUsers.delete(message.chatJid);
      const errorMessage = this.getConfigMessage(
        "registration.name_error",
        {},
        "Hubo un problema guardando tu nombre. Por favor, inténtalo más tarde."
      );

      return {
        handled: true,
        success: false,
        response: errorMessage,
        action: "reply",
        data: { handlerName: this.name, error: "name_save_failed" },
      };
    }
  }

  /**
   * Solicita el nombre al usuario si no lo tiene registrado
   */
  private async requestUserName(phoneJid: string): Promise<HandlerResult> {
    try {
      // Agregar a la lista de usuarios esperando respuesta
      this.awaitingNameUsers.add(phoneJid);

      const randomRequest = this.getConfigMessage(
        "registration.name_request",
        {},
        "¡Hola! 👋 Me encantaría conocerte mejor. ¿Podrías decirme tu nombre para personalizar nuestras conversaciones?"
      );

      logInfo(`📝 Solicitando nombre a usuario: ${phoneJid}`);

      return {
        handled: true,
        success: true,
        response: randomRequest,
        action: "reply",
        data: { handlerName: this.name, nameRequest: true },
      };
    } catch (error) {
      logError(
        `Error solicitando nombre: ${
          error instanceof Error ? error.message : error
        }`
      );
      // Remover de la lista si hay error
      this.awaitingNameUsers.delete(phoneJid);

      return {
        handled: true,
        success: false,
        response: "Error interno solicitando nombre",
        action: "reply",
        data: { handlerName: this.name, error: "name_request_failed" },
      };
    }
  }

  /**
   * Obtiene la parte del día
   */
  public getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return "morning";
    } else if (hour >= 12 && hour < 18) {
      return "afternoon";
    } else if (hour >= 18 && hour < 22) {
      return "evening";
    } else {
      return "night";
    }
  }

  /**
   * Obtiene un saludo basado en la hora del día
   */
  public getTimeBasedGreeting(timeOfDay: TimeOfDay): string {
    switch (timeOfDay) {
      case "morning":
        return "Buenos días";
      case "afternoon":
        return "Buenas tardes";
      case "evening":
        return "Buenas tardes";
      case "night":
        return "Buenas noches";
      default:
        return "Hola";
    }
  }

  /**
   * Obtiene un saludo basado en la hora del día actual
   */
  public getTimeOfDayGreeting(): string {
    const timeOfDay = this.getTimeOfDay();
    return this.getTimeBasedGreeting(timeOfDay);
  }

  /**
   * Obtiene una respuesta aleatoria de una categoría usando ConfigurationService
   */
  public getRandomResponse(
    category: ResponseCategory | string,
    replacements: IResponseReplacements = {}
  ): string {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        logError("ConfigurationService no disponible");
        return "Estoy aquí para ayudarte.";
      }

      // Intentar múltiples rutas para encontrar las respuestas
      let responses = null;

      // 1. Buscar en messages.contextual
      responses = this.getValueByPath(
        config,
        `messages.contextual.${category}`
      );

      // 2. Si no se encuentra, buscar en responses.contextual (para compatibilidad)
      if (!responses) {
        responses = this.getValueByPath(
          config,
          `responses.contextual.${category}`
        );
      }

      // 3. Si no se encuentra, buscar en contextual directamente
      if (!responses) {
        responses = this.getValueByPath(config, `contextual.${category}`);
      }

      // Si no hay respuestas, usar fallback
      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        logWarn(`No se encontraron respuestas para categoría: ${category}`);
        return "Estoy aquí para ayudarte.";
      }

      // Seleccionar respuesta aleatoria
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      // Agregar timeOfDayGreeting si no está en replacements
      const finalReplacements = {
        ...replacements,
        timeOfDayGreeting: this.getTimeOfDayGreeting(),
        ...replacements, // Permitir sobrescribir timeOfDayGreeting si se proporciona
      };

      // Reemplazar variables
      return this.replaceVariables(randomResponse, finalReplacements);
    } catch (error) {
      logError(
        `Error al obtener respuesta aleatoria para ${category}: ${
          error instanceof Error ? error.message : error
        }`
      );
      return "Estoy aquí para ayudarte.";
    }
  }

  /**
   * Verifica si es una pregunta relacionada con el bot
   */
  public isBotRelatedQuestion(questionText: string): boolean {
    const botKeywords = [
      "bot",
      "asistente",
      "assistant",
      "función",
      "funcion",
      "comando",
      "ayuda",
      "servicio",
      "que haces",
      "que puedes",
      "como funciona",
    ];

    return botKeywords.some((keyword) => questionText.includes(keyword));
  }

  /**
   * Maneja preguntas sobre el bot
   */
  public async handleBotQuestion(
    message: WhatsAppMessage,
    questionText: string
  ): Promise<HandlerResult> {
    let response: string;

    if (
      questionText.includes("que haces") ||
      questionText.includes("que puedes")
    ) {
      response = `🤖 *Soy tu asistente virtual*

Puedo ayudarte con:
• Responder preguntas básicas
• Ejecutar comandos del sistema
• Gestionar tu perfil de usuario
• Proporcionar información del bot
• Administrar conversaciones

Usa /help para ver todos los comandos disponibles.`;
    } else if (questionText.includes("como funciona")) {
      response = `⚙️ *Cómo funciono*

Soy un bot de WhatsApp que:
• Procesa mensajes automáticamente
• Clasifica y responde según el contexto
• Mantiene conversaciones naturales
• Ejecuta comandos específicos

¿Hay algo específico que te gustaría saber?`;
    } else {
      response = this.getRandomResponse("question_general");
    }

    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: { handlerName: this.name, botQuestion: true },
    };
  }

  /**
   * Maneja solicitudes de explicación
   */
  public async handleExplanationRequest(
    message: WhatsAppMessage,
    messageText: string
  ): Promise<HandlerResult> {
    const response =
      "Me gustaría explicarte más sobre eso. ¿Podrías ser más específico sobre qué necesitas que te explique?";

    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: { handlerName: this.name, explanationRequest: true },
    };
  }

  /**
   * Maneja solicitudes de ejemplos
   */
  public async handleExampleRequest(
    message: WhatsAppMessage,
    messageText: string
  ): Promise<HandlerResult> {
    const response =
      "Puedo darte ejemplos. ¿Sobre qué tema específico necesitas ejemplos?";

    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: { handlerName: this.name, exampleRequest: true },
    };
  }

  /**
   * Maneja solicitudes de información
   */
  public async handleInformationRequest(
    message: WhatsAppMessage,
    messageText: string
  ): Promise<HandlerResult> {
    const response =
      "Estoy aquí para proporcionarte información. ¿Qué información específica necesitas?";

    return {
      handled: true,
      success: true,
      response: response,
      action: "reply",
      data: { handlerName: this.name, informationRequest: true },
    };
  }

  // Métodos de preguntas específicas
  public handleWhatQuestion(questionText: string): string {
    return "Esa es una buena pregunta sobre 'qué'. Permíteme buscar la información más relevante para ti.";
  }

  public handleHowQuestion(questionText: string): string {
    return "Te ayudo a entender 'cómo' funciona eso. Déjame explicarte paso a paso.";
  }

  public handleWhenQuestion(questionText: string): string {
    return "Para responder 'cuándo', necesito un poco más de contexto. ¿Podrías ser más específico?";
  }

  public handleWhereQuestion(questionText: string): string {
    return "Sobre la ubicación o 'dónde', puedo ayudarte a encontrar esa información.";
  }

  public handleWhyQuestion(questionText: string): string {
    return "Esa es una excelente pregunta sobre 'por qué'. Te explico las razones.";
  }

  public handleWhoQuestion(questionText: string): string {
    return "Sobre 'quién' o 'quiénes', permíteme buscar esa información para ti.";
  }

  /**
   * Maneja errores contextuales
   */
  public async handleContextualError(
    message: WhatsAppMessage,
    error: Error
  ): Promise<HandlerResult> {
    logError(
      `Error en ContextualHandler para ${message.senderPhone}: ${error.message}`
    );

    const errorResponse = this.getConfigMessage(
      "errors.general_processing",
      {},
      "Lo siento, he tenido un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?"
    );

    return {
      handled: true,
      success: false,
      response: errorResponse,
      action: "reply",
      data: {
        handlerName: this.name,
        error: error.message,
        isError: true,
      },
    };
  }

  /**
   * Carga el contexto de conversación desde archivo
   */
  public async loadConversationContext(): Promise<void> {
    try {
      logInfo(
        `🔍 LOAD_CONTEXT: Intentando cargar contexto desde ${this.contextFilePath}`
      );

      const data = await fs.readFile(this.contextFilePath, "utf8");
      const savedContext: ISavedConversationData = JSON.parse(data);

      logInfo(
        `🔍 LOAD_CONTEXT: Archivo de contexto encontrado, fecha de guardado: ${
          savedContext.savedAt || "desconocida"
        }`
      );

      if (savedContext && savedContext.conversations) {
        logInfo(
          `🔍 LOAD_CONTEXT: Encontradas ${savedContext.conversations.length} conversaciones en el archivo`
        );

        savedContext.conversations.forEach((item) => {
          try {
            // Reconstruir fechas
            if (item.context.firstMessage) {
              const parsedDate = new Date(item.context.firstMessage);
              if (!isNaN(parsedDate.getTime())) {
                item.context.firstMessage = parsedDate;
              } else {
                logWarn(
                  `🔍 LOAD_CONTEXT: Fecha firstMessage inválida para ${item.phone}, usando fecha actual`
                );
                item.context.firstMessage = new Date();
              }
            } else {
              item.context.firstMessage = new Date();
            }

            if (item.context.lastActivity) {
              const parsedDate = new Date(item.context.lastActivity);
              if (!isNaN(parsedDate.getTime())) {
                item.context.lastActivity = parsedDate;
              } else {
                item.context.lastActivity = new Date();
              }
            } else {
              item.context.lastActivity = new Date();
            }

            this.conversationContext.set(item.phone, item.context);
            logInfo(
              `🔍 LOAD_CONTEXT: Cargado contexto para ${item.phone}: messageCount=${item.context.messageCount}`
            );
          } catch (itemError) {
            logError(
              `🔍 LOAD_CONTEXT: Error procesando contexto para ${item.phone}: ${
                itemError instanceof Error ? itemError.message : itemError
              }`
            );
          }
        });

        logInfo(
          `🔍 LOAD_CONTEXT: Total de ${this.conversationContext.size} contextos cargados`
        );
      }
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        logInfo(
          `🔍 LOAD_CONTEXT: No se encontró archivo de contexto, iniciando con contexto vacío`
        );
      } else {
        logError(
          `🔍 LOAD_CONTEXT: Error cargando contexto: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }
  }

  /**
   * Guarda el contexto de conversación
   */
  public async saveConversationContext(): Promise<void> {
    try {
      const conversations: Array<{
        phone: string;
        context: IConversationContext;
      }> = [];

      for (const [phone, context] of this.conversationContext.entries()) {
        logInfo(
          `🔍 SAVE_CONTEXT: Preparando contexto para ${phone}: messageCount=${context.messageCount}`
        );
        conversations.push({
          phone,
          context,
        });
      }

      const dataToSave: ISavedConversationData = {
        savedAt: new Date().toISOString(),
        conversations,
      };

      logInfo(
        `🔍 SAVE_CONTEXT: Total de ${conversations.length} conversaciones a guardar`
      );

      // Crear directorio si no existe
      const dir = path.dirname(this.contextFilePath);
      try {
        await fs.mkdir(dir, { recursive: true });
        logInfo(`🔍 SAVE_CONTEXT: Directorio verificado: ${dir}`);
      } catch (err: any) {
        if (err.code !== "EEXIST") {
          logError(`🔍 SAVE_CONTEXT: Error creando directorio: ${err.message}`);
          throw err;
        }
      }

      await fs.writeFile(
        this.contextFilePath,
        JSON.stringify(dataToSave, null, 2)
      );
      logInfo(
        `🔍 SAVE_CONTEXT: Contexto guardado exitosamente en ${this.contextFilePath}`
      );
    } catch (error) {
      logError(
        `🔍 SAVE_CONTEXT: Error guardando contexto: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Limpia contextos antiguos
   */
  public cleanupOldContexts(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [phone, context] of this.conversationContext) {
      if (now.getTime() - context.lastActivity.getTime() > maxAge) {
        this.conversationContext.delete(phone);
        this.lastMessageTime.delete(phone);
      }
    }

    this.contextualStats.activeConversations = this.conversationContext.size;
  }

  /**
   * Obtiene estadísticas del handler
   */
  public getStats(): IContextualHandlerStats {
    return {
      ...this.contextualStats,
      conversationContexts: this.conversationContext.size,
      averageMessagesPerConversation:
        this.contextualStats.activeConversations > 0
          ? Math.round(
              this.contextualStats.totalMessages /
                this.contextualStats.activeConversations
            )
          : 0,
    };
  }

  /**
   * Limpia recursos y guarda el estado
   */
  public async cleanup(): Promise<void> {
    logInfo("🔍 CLEANUP: Iniciando limpieza del ContextualHandler...");

    logInfo(
      `🔍 CLEANUP: Guardando contexto final con ${this.conversationContext.size} conversaciones`
    );

    try {
      await this.saveConversationContext();
      logInfo("🔍 CLEANUP: Contexto guardado exitosamente");
    } catch (error) {
      logError(
        `🔍 CLEANUP: Error guardando contexto: ${
          error instanceof Error ? error.message : error
        }`
      );
    }

    // Limpiar el contexto de memoria
    logInfo("🔍 CLEANUP: Limpiando contexto de memoria");
    this.conversationContext.clear();
    this.userProfiles.clear();
    this.lastMessageTime.clear();

    logInfo(
      "🔍 CLEANUP: Recursos del ContextualHandler liberados correctamente"
    );
  }

  /**
   * Detecta si el usuario quiere cambiar su nombre
   */
  private async detectNameChangeRequest(
    message: WhatsAppMessage
  ): Promise<string | null> {
    const originalText = message.text?.trim() || "";
    const textLower = originalText.toLowerCase();

    // Patrones para detectar solicitudes de cambio de nombre
    const nameChangePatterns = [
      /^mi nombre es (.+)$/i,
      /^me llamo (.+)$/i,
      /^soy (.+)$/i,
      /^cambiar mi nombre a (.+)$/i,
      /^cambiar nombre a (.+)$/i,
      /^quiero cambiar mi nombre a (.+)$/i,
      /^ahora me llamo (.+)$/i,
      /^prefiero que me llames (.+)$/i,
      /^llámame (.+)$/i,
      /^llamame (.+)$/i,
      /^mi nuevo nombre es (.+)$/i,
      /^actualizar nombre a (.+)$/i,
      /^dime (.+)$/i,
    ];

    for (const pattern of nameChangePatterns) {
      // Hacer el match con el texto original para preservar mayúsculas
      const match = originalText.match(pattern);
      if (match && match[1]) {
        const newName = match[1].trim();
        // Validar que el nombre sea razonable
        if (
          newName.length >= 1 &&
          newName.length <= 50 &&
          !this.isOnlyNumbers(newName)
        ) {
          return newName;
        }
      }
    }

    return null;
  }

  /**
   * Maneja solicitudes de cambio de nombre
   */
  private async handleNameChangeRequest(
    message: WhatsAppMessage,
    newName: string
  ): Promise<HandlerResult> {
    try {
      const phoneJid = message.chatJid;
      const phone = message.senderPhone;

      logInfo(
        `🔄 NAME_CHANGE: Usuario ${phone} quiere cambiar su nombre a "${newName}"`
      );

      // Obtener el nombre actual del usuario
      const currentName = await this.getUserName(phoneJid);

      // Si el nombre es el mismo, no hacer nada
      if (currentName === newName) {
        return {
          handled: true,
          success: true,
          response: `Ya te llamo ${newName}. 😊`,
          action: "reply",
          data: {
            handlerName: this.name,
            nameChanged: false,
            reason: "same_name",
          },
        };
      }

      // Actualizar el nombre del usuario en la base de datos
      const userService = this.getUserService();
      if (userService) {
        await userService.updateUser(phoneJid, { display_name: newName });

        logInfo(
          `✅ NAME_CHANGE: Nombre actualizado para ${phone}: "${currentName}" -> "${newName}"`
        );

        // Enviar confirmación personalizada
        const responses = [
          `¡Perfecto! Ahora te llamaré ${newName}. 😊`,
          `¡Entendido! A partir de ahora eres ${newName} para mí. 👍`,
          `¡Listo! He actualizado tu nombre a ${newName}. ✨`,
          `¡Genial! Ahora te conozco como ${newName}. 🎉`,
        ];

        if (currentName && currentName !== phone) {
          responses.push(
            `¡Hecho! Cambié tu nombre de ${currentName} a ${newName}. 🔄`
          );
        }

        const randomResponse =
          responses[Math.floor(Math.random() * responses.length)];

        return {
          handled: true,
          success: true,
          response: randomResponse,
          action: "reply",
          data: {
            handlerName: this.name,
            nameChanged: true,
            newName,
            previousName: currentName,
          },
        };
      } else {
        throw new Error("UserService no disponible");
      }
    } catch (error) {
      logError(
        `❌ NAME_CHANGE: Error cambiando nombre: ${
          error instanceof Error ? error.message : error
        }`
      );

      return {
        handled: true,
        success: false,
        response:
          "Hubo un problema cambiando tu nombre. Por favor, inténtalo más tarde.",
        action: "reply",
        data: {
          handlerName: this.name,
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      };
    }
  }

  /**
   * Verifica si una cadena contiene solo números
   */
  private isOnlyNumbers(text: string): boolean {
    return /^\d+$/.test(text.trim());
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

      // Obtener mensaje desde responses o messages
      let message =
        this.getValueByPath(config, `responses.${path}`) ||
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
      logError(
        `Error obteniendo mensaje configurado para ${path}: ${
          error instanceof Error ? error.message : error
        }`
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

    // Agregar reemplazo especial para timeOfDayGreeting basado en timeOfDay
    if (variables.timeOfDay && result.includes("{timeOfDayGreeting}")) {
      const timeOfDayMap: Record<string, string> = {
        morning: "Buenos días",
        afternoon: "Buenas tardes",
        evening: "Buenas tardes",
        night: "Buenas noches",
      };

      const greeting = timeOfDayMap[variables.timeOfDay as string] || "Hola";
      result = result.replace(/{timeOfDayGreeting}/g, greeting);
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
