const { logInfo, logError } = require("../../utils/logger");
const path = require("path");
const fs = require("fs").promises;

/**
 * Handler especializado para mensajes contextuales y conversaciones naturales
 * Maneja saludos, preguntas, ayuda y conversaciones generales
 */
class ContextualHandler {
  constructor(botProcessor) {
    this.botProcessor = botProcessor;
    this.whatsappClient = botProcessor.whatsappClient;
    // Usar getter para userService para acceso lazy
    this.getUserService = () => botProcessor.userService;

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

    // Cargar contexto si existe
    this.loadConversationContext();

    // Respuestas configurables
    this.responses = this.loadResponses();

    // Estadísticas
    this.stats = {
      totalContextualMessages: 0,
      greetings: 0,
      farewells: 0,
      questions: 0,
      helpRequests: 0,
      generalMessages: 0,
      activeConversations: 0,
    };
  }

  /**
   * Maneja un mensaje contextual
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} classification - Clasificación del mensaje
   */
  async handle(message, classification) {
    try {
      this.stats.totalContextualMessages++;

      // Extraer el número sin @s.whatsapp.net para los logs
      const phoneJid = message.senderPhone;
      const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;

      logInfo(
        `🔍 HANDLE: Procesando mensaje para ${phone}, tipo: ${classification.type}`
      );

      // Actualizar contexto antes de procesar
      this.updateConversationContext(message);

      // Obtener contexto de la conversación
      const context = this.getConversationContext(message.senderPhone);

      logInfo(
        `🔍 HANDLE: Procesando mensaje contextual: ${classification.type}`,
        {
          senderPhone: message.senderPhone,
          messageLength: (message.text || "").length,
          hasContext: !!context,
          messageCount: context?.messageCount || 0,
        }
      );

      // Procesar según el tipo específico
      switch (classification.type) {
        case "GREETING":
          await this.handleGreeting(message, context);
          break;
        case "FAREWELL":
          await this.handleFarewell(message, context);
          break;
        case "QUESTION":
          await this.handleQuestion(message, context, classification);
          break;
        case "HELP_REQUEST":
          await this.handleHelpRequest(message, context);
          break;
        case "CONTEXTUAL":
          await this.handleContextualMessage(message, context, classification);
          break;
        default:
          await this.handleDefault(message, context);
      }
    } catch (error) {
      logError(`Error procesando mensaje contextual:`, error);
      await this.handleContextualError(message, error);
    }
  }

  /**
   * Maneja saludos
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} context - Contexto de conversación
   */
  async handleGreeting(message, context = null) {
    this.stats.greetings++;

    // Extraer el número de teléfono sin el @s.whatsapp.net
    const phoneJid = message.senderPhone;
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;
    const now = new Date(); // Asegurar que tenemos la referencia a now para cálculos de tiempo

    // Log detallado para diagnóstico
    logInfo(`🔍 GREETING: Procesando saludo para: ${phoneJid}`);
    logInfo(`🔍 GREETING: Número normalizado: ${phone}`);

    // Verificación explícita del contexto
    if (context) {
      logInfo(
        `🔍 GREETING: Contexto recibido directamente: messageCount=${context.messageCount}, firstMessage=${context.firstMessage}`
      );
    } else {
      logInfo(
        `🔍 GREETING: No se recibió contexto directo, buscando en Map...`
      );

      // Verificar si hay contexto en el Map - IMPORTANTE para usuarios recurrentes
      const storedContext = this.conversationContext.get(phone);
      if (storedContext) {
        logInfo(
          `🔍 GREETING: Contexto encontrado en Map: messageCount=${storedContext.messageCount}, firstMessage=${storedContext.firstMessage}`
        );
        context = storedContext;
      } else {
        logInfo(
          `🔍 GREETING: No se encontró ningún contexto para ${phone} - ¡ESTE ES UN ERROR CRÍTICO!`
        );

        // Este caso no debería ocurrir nunca, porque updateConversationContext siempre crea un contexto
        // Si ocurre, hay un problema serio en el flujo de la aplicación
        logInfo(
          `🔍 GREETING: Creando contexto de emergencia con messageCount=1`
        );

        // Crear un contexto de emergencia para no romper el flujo
        context = {
          firstMessage: now,
          messageCount: 1, // Ya es el primer mensaje
          lastActivity: now,
          topics: [],
          userType: "unknown",
        };

        // Guardar este contexto para futuros mensajes
        this.conversationContext.set(phone, context);

        // Guardar contexto inmediatamente para evitar pérdida en caso de reinicio
        this.saveConversationContext();
      }
    }

    // Obtener información del remitente para personalizar el saludo
    logInfo(`🔍 GREETING: Obteniendo nombre para usuario ${phone}`);
    const userName = await this.getUserName(message.senderPhone);
    logInfo(`🔍 GREETING: Nombre obtenido para saludo: "${userName}"`);

    const timeOfDay = this.getTimeOfDay();
    logInfo(`🔍 GREETING: Hora del día detectada: ${timeOfDay}`);

    // Evaluar si es usuario recurrente - Verificación más estricta
    const isReturningUser = context && context.messageCount > 1;

    // Log detallado para diagnóstico
    logInfo(
      `🔍 GREETING: ¿Usuario recurrente?: ${
        isReturningUser ? "Sí" : "No"
      } (messageCount=${context?.messageCount || 0})`
    );
    logInfo(
      `🔍 GREETING: Tiempo desde primer mensaje: ${
        context?.firstMessage
          ? Math.round((now - context.firstMessage) / (1000 * 60)) + " minutos"
          : "N/A"
      }`
    );

    // Dumping all conversation contexts for debugging
    logInfo(`🔍 GREETING: Dump de todos los contextos guardados:`);
    for (const [key, value] of this.conversationContext.entries()) {
      logInfo(
        `🔍 GREETING: - ${key}: messageCount=${value.messageCount}, lastActivity=${value.lastActivity}, firstMessage=${value.firstMessage}`
      );
    }

    let response;
    if (isReturningUser) {
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

    // DEPURACIÓN TEMPORAL: Log completo del mensaje antes de enviar
    logInfo(`🚨 DEBUG TEMPORAL: Enviando mensaje completo: "${response}"`);
    logInfo(`🚨 DEBUG TEMPORAL: Tipo de response: ${typeof response}`);
    logInfo(`🚨 DEBUG TEMPORAL: Response.length: ${response.length}`);

    await this.whatsappClient.sendMessage(message.senderPhone, response, false);

    // Ofrecer ayuda adicional solo si la respuesta no incluye ya información de ayuda
    if (!response.includes("puedo ayudarte") && !response.includes("/help")) {
      setTimeout(async () => {
        const helpPrompt =
          "¿En qué puedo ayudarte hoy? Puedes usar /help para ver todos los comandos disponibles.";

        // DEPURACIÓN TEMPORAL: Log del mensaje de ayuda
        logInfo(
          `🚨 DEBUG TEMPORAL HELP: Enviando mensaje de ayuda: "${helpPrompt}"`
        );
        logInfo(`🚨 DEBUG TEMPORAL HELP: Tipo: ${typeof helpPrompt}`);

        await this.whatsappClient.sendMessage(
          message.senderPhone,
          helpPrompt,
          false
        );
      }, 2000);
    }
  }

  /**
   * Maneja despedidas
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} context - Contexto de conversación
   */
  async handleFarewell(message, context = null) {
    this.stats.farewells = (this.stats.farewells || 0) + 1;

    // Extraer el número de teléfono sin el @s.whatsapp.net
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
    let responseCategory;
    let replacements = {
      userName,
      timeOfDay: this.getTimeBasedGreeting(timeOfDay),
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

    // Enviar respuesta de despedida
    await this.whatsappClient.sendMessage(message.senderPhone, response, false);

    // Guardar contexto con información de despedida
    this.saveConversationContext();
  }

  /**
   * Maneja preguntas
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} context - Contexto de conversación
   * @param {Object} classification - Clasificación del mensaje
   */
  async handleQuestion(message, context = null, classification) {
    this.stats.questions++;

    const questionType = classification.questionType || "general";
    const questionText = message.text.toLowerCase();

    // Detectar preguntas específicas sobre el bot
    if (this.isBotRelatedQuestion(questionText)) {
      await this.handleBotQuestion(message, questionText);
      return;
    }

    // Responder según el tipo de pregunta
    let response;
    const questionTypeWords = {
      what: ["what", "qué", "que", "cual", "cuál", "cuales", "cuáles"],
      how: ["how", "cómo", "como"],
      when: ["when", "cuándo", "cuando"],
      where: ["where", "dónde", "donde"],
      why: ["why", "por qué", "porque", "por que"],
      who: ["who", "quién", "quien", "quienes", "quiénes"],
    };

    // Detect question type from multiple languages
    let detectedType = "default";
    for (const [type, words] of Object.entries(questionTypeWords)) {
      if (words.some((word) => questionText.includes(word))) {
        detectedType = type;
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

    await this.whatsappClient.sendMessage(message.senderPhone, response, false);
  }

  /**
   * Maneja solicitudes de ayuda
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} context - Contexto de conversación
   */
  async handleHelpRequest(message, context = null) {
    this.stats.helpRequests++;

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

      await this.whatsappClient.sendMessage(
        message.senderPhone,
        response,
        false
      );
    } else {
      const response = this.getRandomResponse("help_general");
      await this.whatsappClient.sendMessage(
        message.senderPhone,
        response,
        false
      );
    }
  }

  /**
   * Maneja mensajes contextuales generales
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} context - Contexto de conversación
   * @param {Object} classification - Clasificación del mensaje
   */
  async handleContextualMessage(message, context = null, classification) {
    const keywords = classification.keywords || [];
    const messageText = message.text.toLowerCase();

    // Procesar según palabras clave
    if (keywords.includes("explicar") || keywords.includes("explicame")) {
      await this.handleExplanationRequest(message, messageText);
    } else if (keywords.includes("ejemplo") || keywords.includes("ejemplos")) {
      await this.handleExampleRequest(message, messageText);
    } else if (
      keywords.includes("información") ||
      keywords.includes("informacion")
    ) {
      await this.handleInformationRequest(message, messageText);
    } else {
      await this.handleDefault(message, context);
    }
  }

  /**
   * Maneja mensajes por defecto
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} context - Contexto de conversación
   */
  async handleDefault(message, context = null) {
    this.stats.generalMessages++;

    if (!this.botProcessor.autoReply) {
      return; // No responder automáticamente si está deshabilitado
    }

    const response = this.getRandomResponse("default");
    await this.whatsappClient.sendMessage(message.senderPhone, response, false);
  }

  /**
   * Verifica si es una pregunta relacionada con el bot
   * @param {string} questionText - Texto de la pregunta
   * @returns {boolean} True si es sobre el bot
   */
  isBotRelatedQuestion(questionText) {
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
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} questionText - Texto de la pregunta
   */
  async handleBotQuestion(message, questionText) {
    let response;

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
• Aprende de las interacciones

¿Te gustaría saber algo específico?`;
    } else {
      response = `🤖 Soy un asistente virtual diseñado para ayudarte.

Puedes preguntarme sobre mis funciones usando /info o explorar mis comandos con /help.`;
    }

    await this.whatsappClient.sendMessage(message.senderPhone, response, false);
  }

  /**
   * Maneja diferentes tipos de preguntas "qué"
   */
  handleWhatQuestion(questionText) {
    if (questionText.includes("es esto") || questionText.includes("es eso")) {
      return "🤔 Para ayudarte mejor, ¿podrías ser más específico sobre qué quieres saber?";
    }
    return "🤔 Esa es una buena pregunta. ¿Podrías darme más contexto para ayudarte mejor?";
  }

  /**
   * Maneja diferentes tipos de preguntas "cómo"
   */
  handleHowQuestion(questionText) {
    if (questionText.includes("funciona")) {
      return "⚙️ Te puedo explicar cómo funcionan mis características. Usa /info para conocer más sobre mí.";
    }
    return "🛠 Para darte instrucciones específicas, necesito saber exactamente qué quieres hacer. ¿Puedes ser más específico?";
  }

  /**
   * Maneja otros tipos de preguntas
   */
  handleWhenQuestion(questionText) {
    return "⏰ Las preguntas sobre tiempo requieren contexto específico. ¿A qué te refieres exactamente?";
  }

  handleWhereQuestion(questionText) {
    return "📍 Para preguntas sobre ubicación, necesito más detalles sobre qué buscas.";
  }

  handleWhyQuestion(questionText) {
    return "🤔 Esa es una pregunta interesante. ¿Podrías darme más contexto para darte una respuesta útil?";
  }

  handleWhoQuestion(questionText) {
    if (questionText.includes("eres") || questionText.includes("eres tu")) {
      return "🤖 Soy tu asistente virtual. Usa /info para conocer más sobre mí.";
    }
    return "👤 Para preguntas sobre personas específicas, necesito más información.";
  }

  /**
   * Maneja solicitudes de explicación
   */
  async handleExplanationRequest(message, messageText) {
    const response = `📚 *Explicación*

Me complace explicarte cosas, pero necesito saber específicamente qué quieres que te explique.

Puedo explicarte sobre:
• Mis funciones y comandos
• Cómo usar características específicas
• Información técnica básica

¿Sobre qué te gustaría que te explique?`;

    await this.whatsappClient.sendMessage(message.senderPhone, response, false);
  }

  /**
   * Maneja solicitudes de ejemplos
   */
  async handleExampleRequest(message, messageText) {
    const response = `💡 *Ejemplos*

Aquí tienes algunos ejemplos de cómo interactuar conmigo:

*Comandos básicos:*
• /help - Ver ayuda
• /info - Mi información
• /estado - Estado del sistema

*Preguntas naturales:*
• "¿Qué puedes hacer?"
• "¿Cómo funciona esto?"
• "Explícame los comandos"

¿Te gustaría ver ejemplos de algo específico?`;

    await this.whatsappClient.sendMessage(message.senderPhone, response, false);
  }

  /**
   * Maneja solicitudes de información
   */
  async handleInformationRequest(message, messageText) {
    const response = `ℹ️ *Información Disponible*

Puedo proporcionarte información sobre:
• El bot y sus funciones (/info)
• Estado del sistema (/estado)
• Tu perfil de usuario (/profile)
• Comandos disponibles (/help)

¿Qué información específica necesitas?`;

    await this.whatsappClient.sendMessage(message.senderPhone, response, false);
  }

  /**
   * Actualiza el contexto de conversación
   * @param {Object} message - Mensaje de WhatsApp
   */
  updateConversationContext(message) {
    // Extraer el número de teléfono sin el @s.whatsapp.net
    const phoneJid = message.senderPhone;
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;
    const now = new Date();

    // Obtener contexto existente
    let context = this.conversationContext.get(phone);

    // Logs de depuración detallados
    if (context) {
      logInfo(
        `🔍 CONTEXTO ANTES: ${phone} - messageCount: ${context.messageCount}, lastActivity: ${context.lastActivity}`
      );
      logInfo(
        `🔍 CONTEXTO DETALLE: ${phone} - firstMessage: ${
          context.firstMessage
        }, userType: ${context.userType}, topics: ${
          context.topics?.length || 0
        }`
      );
    } else {
      logInfo(
        `🔍 CONTEXTO NUEVO: ${phone} - Inicializando contexto de conversación`
      );
      context = {
        firstMessage: now,
        messageCount: 0,
        lastActivity: now,
        topics: [],
        userType: "unknown",
      };
      logInfo(
        `🔍 CONTEXTO CREADO: ${phone} - Estructura completa creada con messageCount=0`
      );
    }

    // Incrementar contador de mensajes - Log ANTES del incremento
    logInfo(
      `🔍 INCREMENTANDO messageCount de ${context.messageCount} a ${
        context.messageCount + 1
      } para ${phone}`
    );
    context.messageCount++;
    context.lastActivity = now;
    context.topics.push({
      timestamp: now,
      text: message.text?.substring(0, 100) || "",
      type: "incoming",
    });

    // Mantener solo los últimos 10 topics
    if (context.topics.length > 10) {
      context.topics = context.topics.slice(-10);
    }

    // Guardar contexto actualizado
    this.conversationContext.set(phone, context);
    this.lastMessageTime.set(phone, now);

    // Log después de la actualización
    logInfo(
      `🔍 CONTEXTO DESPUÉS: ${phone} - messageCount: ${context.messageCount}, lastActivity: ${now}`
    );

    // Marcar que hay cambios pendientes
    this.pendingChanges = true;

    // Guardar periódicamente (no en cada mensaje)
    const currentTime = Date.now();
    if (currentTime - this.lastSaveTime > this.saveInterval) {
      this.saveConversationContext();
      this.lastSaveTime = currentTime;
      this.pendingChanges = false;
    }

    // Actualizar estadísticas
    this.stats.activeConversations = this.conversationContext.size;
  }

  /**
   * Obtiene el contexto de conversación
   * @param {string} phoneJid - Número de teléfono o JID
   * @returns {Object|null} Contexto de conversación
   */
  getConversationContext(phoneJid) {
    // Extraer el número de teléfono sin el @s.whatsapp.net
    const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;

    // Log detallado para depuración
    logInfo(
      `🔍 GET_CONTEXT: Buscando contexto para: ${phone} (original: ${phoneJid})`
    );

    // Obtener contexto
    const context = this.conversationContext.get(phone);

    if (context) {
      logInfo(
        `🔍 GET_CONTEXT: Contexto encontrado para ${phone}: messageCount=${context.messageCount}`
      );
    } else {
      logInfo(`🔍 GET_CONTEXT: No se encontró contexto para ${phone}`);

      // Verificar si hay algún contexto guardado
      if (this.conversationContext.size > 0) {
        logInfo(
          `🔍 GET_CONTEXT: Hay ${this.conversationContext.size} contextos en memoria:`
        );
        for (const [key, value] of this.conversationContext.entries()) {
          logInfo(
            `🔍 GET_CONTEXT: - ${key}: messageCount=${value.messageCount}`
          );
        }
      } else {
        logInfo(`🔍 GET_CONTEXT: No hay contextos en memoria`);
      }
    }

    return context || null;
  }

  /**
   * Obtiene el nombre del usuario
   * @param {string} phoneJid - Número de teléfono o JID
   * @returns {string} Nombre del usuario o genérico
   */
  async getUserName(phoneJid) {
    try {
      // Extraer el número de teléfono sin el @s.whatsapp.net
      const phone = phoneJid.includes("@") ? phoneJid.split("@")[0] : phoneJid;

      logInfo(
        `ContextualHandler: Buscando nombre para: ${phone} (original: ${phoneJid})`
      );

      const userService = this.getUserService();
      logInfo(`ContextualHandler: UserService obtenido: ${!!userService}`);
      logInfo(
        `ContextualHandler: UserServiceReady: ${this.botProcessor.userServiceReady}`
      );

      if (this.botProcessor.userServiceReady && userService) {
        const user = await userService.getUserByPhone(phone);
        logInfo(
          `ContextualHandler: Usuario encontrado: ${JSON.stringify(user)}`
        );
        return user?.display_name || "Usuario";
      } else {
        logInfo("ContextualHandler: UserService no está listo o no disponible");
      }
    } catch (error) {
      logError("Error obteniendo nombre de usuario:", error);
    }
    return "Usuario";
  }

  /**
   * Obtiene la parte del día (mañana, tarde, noche)
   * @returns {string} Parte del día
   */
  getTimeOfDay() {
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
   * @param {string} timeOfDay - Parte del día (morning, afternoon, evening, night)
   * @returns {string} Saludo apropiado para la hora
   */
  getTimeBasedGreeting(timeOfDay) {
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
   * Maneja errores contextuales
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Error} error - Error ocurrido
   */
  async handleContextualError(message, error) {
    const response =
      "Lo siento, ocurrió un problema procesando tu mensaje. Por favor intenta de nuevo.";

    try {
      await this.whatsappClient.sendMessage(
        message.senderPhone,
        response,
        false
      );
    } catch (sendError) {
      logError("Error enviando mensaje de error contextual:", sendError);
    }
  }

  /**
   * Carga respuestas configurables
   * @returns {Object} Objeto con respuestas categorizadas
   */
  loadResponses() {
    // Definir respuestas con marcadores de posición que se reemplazarán en tiempo de ejecución
    return {
      greeting_new: [
        `¡Hola {userName}! 👋 Es un placer conocerte. Soy tu asistente virtual.`,
        `¡{timeOfDayGreeting} {userName}! 🌟 Bienvenido/a.`,
        "¡Hola! 😊 Soy tu asistente y estoy aquí para ayudarte.",
      ],
      greeting_returning: [
        `¡Hola de nuevo {userName}! 👋 Me alegra verte por aquí.`,
        `¡{timeOfDayGreeting} de nuevo {userName}! ¿En qué puedo ayudarte hoy?`,
        `¡Es bueno verte otra vez {userName}! 😊 ¿Cómo va todo?`,
      ],
      // Agregar otras categorías de respuestas según sea necesario
      help_request: [
        "Estoy aquí para ayudarte. Puedes usar /help para ver todos los comandos disponibles.",
        "Claro, estos son los comandos que puedes usar: /help, /info, /status. ¿Necesitas más información?",
        "Puedo asistirte con varias tareas. Escribe /help para ver todas las opciones disponibles.",
      ],
      question_default: [
        "Buena pregunta. Déjame buscar esa información para ti.",
        "Estoy procesando tu consulta. Dame un momento para encontrar la mejor respuesta.",
        "Interesante pregunta. Te responderé en breve.",
      ],
      default: [
        "Estoy aquí para ayudarte. ¿Hay algo específico en lo que pueda asistirte?",
        "¿Necesitas ayuda con algo en particular?",
        "¿En qué más puedo ayudarte hoy?",
      ],
      farewell_general: [
        "¡Hasta luego, {userName}! Que tengas un gran día.",
        "Adiós, {userName}. ¡Vuelve pronto!",
        "¡Hasta la próxima, {userName}! Cuídate.",
      ],
      farewell_frequent: [
        "¡Hasta luego, {userName}! Siempre es un placer ayudarte.",
        "Adiós, {userName}. ¡Gracias por ser un usuario frecuente!",
        "¡Hasta la próxima, {userName}! Espero verte pronto.",
      ],
      farewell_night: [
        "Buenas noches, {userName}. Que descanses bien.",
        "Hasta mañana, {userName}. ¡Dulces sueños!",
        "Adiós, {userName}. Que tengas una noche tranquila.",
      ],
    };
  }

  /**
   * Obtiene una respuesta aleatoria de una categoría
   * @param {string} category - Categoría de respuesta
   * @param {Object} replacements - Objeto con variables para reemplazar en la respuesta
   */
  getRandomResponse(category, replacements = {}) {
    try {
      const responses = this.responses[category] || this.responses.default;
      if (!responses || responses.length === 0) {
        return "Estoy aquí para ayudarte.";
      }

      // Seleccionar una respuesta aleatoria
      const randomIndex = Math.floor(Math.random() * responses.length);
      let response = responses[randomIndex];

      // Reemplazar marcadores de posición con valores reales
      Object.keys(replacements).forEach((key) => {
        const value = replacements[key];
        response = response.replace(new RegExp(`{${key}}`, "g"), value || "");
      });

      // Agregar reemplazo especial para timeOfDayGreeting basado en timeOfDay
      if (replacements.timeOfDay && response.includes("{timeOfDayGreeting}")) {
        const timeOfDayMap = {
          morning: "Buenos días",
          afternoon: "Buenas tardes",
          evening: "Buenas tardes",
          night: "Buenas noches",
        };

        const greeting = timeOfDayMap[replacements.timeOfDay] || "Hola";
        response = response.replace(/{timeOfDayGreeting}/g, greeting);
      }

      return response;
    } catch (error) {
      logError("Error al obtener respuesta aleatoria:", error);
      return "Estoy aquí para ayudarte.";
    }
  }

  /**
   * Obtiene estadísticas del handler
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      conversationContexts: this.conversationContext.size,
      averageMessagesPerConversation:
        this.stats.activeConversations > 0
          ? Math.round(
              this.stats.totalContextualMessages /
                this.stats.activeConversations
            )
          : 0,
    };
  }

  /**
   * Limpia contextos antiguos (llamar periódicamente)
   */
  cleanupOldContexts() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [phone, context] of this.conversationContext) {
      if (now - context.lastActivity > maxAge) {
        this.conversationContext.delete(phone);
        this.lastMessageTime.delete(phone);
      }
    }

    this.stats.activeConversations = this.conversationContext.size;
  }

  /**
   * Carga el contexto de conversación desde un archivo
   */
  async loadConversationContext() {
    try {
      logInfo(
        `🔍 LOAD_CONTEXT: Intentando cargar contexto desde ${this.contextFilePath}`
      );

      const data = await fs.readFile(this.contextFilePath, "utf8");
      const savedContext = JSON.parse(data);

      logInfo(
        `🔍 LOAD_CONTEXT: Archivo de contexto encontrado, fecha de guardado: ${
          savedContext.savedAt || "desconocida"
        }`
      );

      // Restaurar el Map con los datos guardados
      if (savedContext && savedContext.conversations) {
        logInfo(
          `🔍 LOAD_CONTEXT: Encontradas ${savedContext.conversations.length} conversaciones en el archivo`
        );

        savedContext.conversations.forEach((item) => {
          try {
            // Reconstruir fechas (JSON.parse las convierte a strings)
            if (item.context.firstMessage) {
              const parsedDate = new Date(item.context.firstMessage);
              if (!isNaN(parsedDate.getTime())) {
                item.context.firstMessage = parsedDate;
              } else {
                // Si la fecha no es válida, establecer una fecha actual
                logWarn(
                  `🔍 LOAD_CONTEXT: Fecha firstMessage inválida para ${item.phone}, usando fecha actual`
                );
                item.context.firstMessage = new Date();
              }
            } else {
              // Si no hay fecha, establecer una fecha actual
              logWarn(
                `🔍 LOAD_CONTEXT: Sin fecha firstMessage para ${item.phone}, usando fecha actual`
              );
              item.context.firstMessage = new Date();
            }

            if (item.context.lastActivity) {
              const parsedDate = new Date(item.context.lastActivity);
              if (!isNaN(parsedDate.getTime())) {
                item.context.lastActivity = parsedDate;
              } else {
                // Si la fecha no es válida, establecer una fecha actual
                logWarn(
                  `🔍 LOAD_CONTEXT: Fecha lastActivity inválida para ${item.phone}, usando fecha actual`
                );
                item.context.lastActivity = new Date();
              }
            } else {
              // Si no hay fecha, establecer una fecha actual
              logWarn(
                `🔍 LOAD_CONTEXT: Sin fecha lastActivity para ${item.phone}, usando fecha actual`
              );
              item.context.lastActivity = new Date();
            }

            // Reconstruir fechas en topics si existen
            if (item.context.topics && Array.isArray(item.context.topics)) {
              item.context.topics.forEach((topic) => {
                if (topic.timestamp) {
                  const parsedDate = new Date(topic.timestamp);
                  if (!isNaN(parsedDate.getTime())) {
                    topic.timestamp = parsedDate;
                  } else {
                    // Si la fecha no es válida, establecer una fecha actual
                    topic.timestamp = new Date();
                  }
                } else {
                  // Si no hay fecha, establecer una fecha actual
                  topic.timestamp = new Date();
                }
              });
            }

            // Asegurar que messageCount sea un número
            if (typeof item.context.messageCount !== "number") {
              logWarn(
                `🔍 LOAD_CONTEXT: messageCount no es un número para ${item.phone}, corrigiendo`
              );
              // Convertir a número o establecer a 1 si no es posible
              item.context.messageCount =
                parseInt(item.context.messageCount) || 1;
            }

            logInfo(
              `🔍 LOAD_CONTEXT: Cargando contexto para ${item.phone}: messageCount=${item.context.messageCount}`
            );
            this.conversationContext.set(item.phone, item.context);
          } catch (itemError) {
            logError(
              `🔍 LOAD_CONTEXT: Error procesando contexto para ${item.phone}: ${itemError.message}`
            );
          }
        });

        logInfo(
          `🔍 LOAD_CONTEXT: Contexto cargado con ${this.conversationContext.size} conversaciones`
        );

        // Log de todas las conversaciones cargadas
        for (const [key, value] of this.conversationContext.entries()) {
          logInfo(
            `🔍 LOAD_CONTEXT: - ${key}: messageCount=${value.messageCount}, lastActivity=${value.lastActivity}, firstMessage=${value.firstMessage}`
          );
        }
      } else {
        logInfo(
          `🔍 LOAD_CONTEXT: El archivo no contiene datos de conversación válidos`
        );
      }
    } catch (error) {
      // Es normal que falle si el archivo no existe la primera vez
      if (error.code !== "ENOENT") {
        logError(`🔍 LOAD_CONTEXT: Error cargando contexto: ${error.message}`);
      } else {
        logInfo(
          `🔍 LOAD_CONTEXT: No se encontró archivo de contexto previo, iniciando con contexto vacío`
        );
      }
    }
  }

  /**
   * Guarda el contexto conversacional en el archivo
   */
  async saveConversationContext() {
    try {
      logInfo(`🔍 SAVE_CONTEXT: Guardando contexto de conversaciones...`);

      // Convertir el Map a un formato serializable
      const conversations = [];
      for (const [phone, context] of this.conversationContext.entries()) {
        logInfo(
          `🔍 SAVE_CONTEXT: Preparando contexto para ${phone}: messageCount=${context.messageCount}`
        );
        conversations.push({
          phone,
          context,
        });
      }

      const dataToSave = {
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
      } catch (err) {
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
      logError(`🔍 SAVE_CONTEXT: Error guardando contexto: ${error.message}`);
    }
  }

  /**
   * Limpia recursos y guarda el estado
   */
  async cleanup() {
    logInfo("🔍 CLEANUP: Iniciando limpieza del ContextualHandler...");

    // Guardar el contexto siempre al cerrar
    logInfo(
      `🔍 CLEANUP: Guardando contexto final con ${this.conversationContext.size} conversaciones`
    );

    try {
      // Forzar guardado del contexto independientemente de los cambios pendientes
      await this.saveConversationContext();
      logInfo("🔍 CLEANUP: Contexto guardado exitosamente");
    } catch (error) {
      logError(`🔍 CLEANUP: Error guardando contexto: ${error.message}`);
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
}

module.exports = ContextualHandler;
