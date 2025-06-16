const axios = require("axios");
const EventEmitter = require("events");
const { logInfo, logError, logWarn } = require("../utils/logger");
const { dbConnection } = require("../database/connection");
const ConversationState = require("../utils/conversationState");

class WhatsAppClient extends EventEmitter {
  constructor() {
    super();
    this.apiBaseUrl = process.env.BRIDGE_URL || "http://127.0.0.1:8080";

    // 🚨 SOLUCIÓN DEFINITIVA: Timestamp al momento de construcción del objeto
    // Usar hora local con timezone correcto para evitar problemas de comparación
    const now = new Date();
    now.setSeconds(now.getSeconds() + 10); // Solo 10 segundos de margen

    // Obtener timestamp en timezone local (formato EXACTO que usa la base de datos)
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    // Calcular offset de timezone en formato +HH:MM
    const offset = now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset <= 0 ? "+" : "-";
    const timezoneString = `${offsetSign}${offsetHours
      .toString()
      .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`;

    this.lastProcessedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${timezoneString}`;
    this.botStartTimestamp = now.toISOString();

    logInfo(`🔄 Bot iniciado - Timestamp UTC: ${this.botStartTimestamp}`);
    logInfo(
      `🚨 POLÍTICA ANTI-HISTORIAL: Solo procesando mensajes desde ${this.lastProcessedTimestamp}`
    );

    this.pollInterval = null;
    this.isPolling = false;
    this.pollingIntervalMs = parseInt(process.env.POLLING_INTERVAL) || 5000; // Aumentado a 5 segundos

    // Sistema de prevención de duplicados y rate limiting
    this.processedMessageIds = new Set();
    this.lastResponseTime = new Map(); // chatJid -> timestamp
    this.minResponseInterval = 20000; // 20 segundos mínimo entre respuestas por chat (era 30)
    this.maxDailyResponses = 100; // Máximo 100 respuestas por día por chat (era 50)
    this.dailyResponseCount = new Map(); // chatJid -> count
    this.lastDayReset = new Date().getDate(); // Sistema mejorado de estado de conversaciones

    // Referencia al UserService para verificar privilegios
    this.userService = null;

    this.conversationState = new ConversationState();
  }

  async connect() {
    try {
      // Verificar que el bridge esté disponible
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error("Bridge no está disponible");
      }

      logInfo("🔌 Conectado al WhatsApp Bridge");

      // Inicializar sistema de estado de conversaciones
      await this.conversationState.initialize();

      logInfo(
        `🚨 POLÍTICA ANTI-HISTORIAL: Solo procesando mensajes desde ${this.lastProcessedTimestamp}`
      );

      // Iniciar polling para nuevos mensajes
      this.startMessagePolling();

      return true;
    } catch (error) {
      logError(`❌ Error conectando al bridge: ${error.message}`);
      return false;
    }
  }

  startMessagePolling() {
    if (this.isPolling) {
      logWarn("⚠️  Polling ya está activo");
      return;
    }

    this.isPolling = true;
    logInfo(`🔄 Iniciando polling cada ${this.pollingIntervalMs}ms`);

    this.pollInterval = setInterval(async () => {
      await this.checkForNewMessages();
    }, this.pollingIntervalMs);
  }

  async checkForNewMessages() {
    try {
      if (!dbConnection.isReady()) {
        return; // Base de datos no disponible
      }

      // Resetear contadores diarios si es necesario
      this.resetDailyCountersIfNeeded();

      // DEBUG: Mostrar timestamp que se está usando para la consulta
      logInfo(
        `🔍 DEBUG: Consultando mensajes desde timestamp: ${this.lastProcessedTimestamp}`
      );

      const newMessages = await dbConnection.getMessagesSince(
        this.lastProcessedTimestamp
      );

      if (newMessages.length > 0) {
        logInfo(
          `📨 Encontrados ${newMessages.length} mensajes nuevos desde ${this.lastProcessedTimestamp}`
        );

        // DEBUG: Mostrar timestamps de los primeros mensajes encontrados
        const firstFew = newMessages.slice(0, 3);
        firstFew.forEach((msg, i) => {
          logInfo(
            `🔍 DEBUG: Mensaje ${i + 1} - Timestamp: ${
              msg.timestamp
            }, Contenido: "${msg.content?.substring(0, 30)}..."`
          );
        });

        for (const messageRow of newMessages) {
          const message = this.formatMessage(messageRow);

          // FILTRADO MEJORADO: Usar el sistema de estado para validar si debe procesarse
          if (!this.conversationState.shouldProcessMessage(message)) {
            // Actualizar timestamp sin procesar
            this.lastProcessedTimestamp = messageRow.timestamp;
            continue;
          }

          // Filtrar duplicados (mantenemos por compatibilidad)
          if (this.processedMessageIds.has(messageRow.id)) {
            logInfo(
              `⏭️  Mensaje ${messageRow.id} ya procesado en memoria local`
            );
            await this.conversationState.markMessageProcessed(message);
            this.lastProcessedTimestamp = messageRow.timestamp;
            continue;
          }

          // Verificar límites de respuesta por mensaje específico
          const isCommand =
            messageRow.content &&
            (messageRow.content.trim().startsWith("/") ||
              messageRow.content.trim().startsWith("!"));
          if (
            !(await this.canRespondToMessage(
              messageRow.chat_jid,
              messageRow.content,
              isCommand
            ))
          ) {
            logInfo(
              `🚫 Chat ${messageRow.chat_jid} ha alcanzado límite de respuestas`
            );
            this.processedMessageIds.add(messageRow.id);
            await this.conversationState.markMessageProcessed(message);
            this.lastProcessedTimestamp = messageRow.timestamp;
            continue;
          }

          // Marcar como procesado ANTES de emitir
          this.processedMessageIds.add(messageRow.id);
          await this.conversationState.markMessageProcessed(message);

          // Log del mensaje válido
          logInfo(
            `✅ Procesando mensaje válido ID: ${messageRow.id} de ${messageRow.chat_jid}`
          );
          logInfo(
            `   📝 Contenido: ${(messageRow.content || "").substring(0, 100)}${
              messageRow.content && messageRow.content.length > 100 ? "..." : ""
            }`
          );
          logInfo(`   ⏰ Timestamp: ${messageRow.timestamp}`);

          // Emitir mensaje para procesamiento
          this.emit("message", message);

          // Actualizar último timestamp procesado
          this.lastProcessedTimestamp = messageRow.timestamp;
        }
      } else {
        // No hay mensajes nuevos - esto es el comportamiento esperado tras reinicio
        logInfo(
          `😴 No hay mensajes nuevos desde ${this.lastProcessedTimestamp} - Sistema funcionando correctamente`
        );
      }
    } catch (error) {
      logError(`Error verificando mensajes: ${error.message}`);
    }
  }

  formatMessage(messageRow) {
    return {
      id: messageRow.id,
      messageId: messageRow.id, // Alias para compatibilidad
      chatId: messageRow.chat_jid, // Para BotProcessor
      chatJid: messageRow.chat_jid, // Para compatibilidad
      chatName: messageRow.chat_name || messageRow.chat_jid,
      sender: messageRow.sender,
      senderPhone: messageRow.sender, // Para BotProcessor
      text: messageRow.content || "", // Para MessageClassifier
      content: messageRow.content || "", // Para compatibilidad
      timestamp: messageRow.timestamp,
      mediaType: messageRow.media_type,
      filename: messageRow.filename,
      isFromMe: messageRow.is_from_me === 1,
      fromMe: messageRow.is_from_me === 1, // Alias para compatibilidad
    };
  }

  async sendMessage(recipient, message, isCommand = false) {
    try {
      // Verificar si podemos responder a este mensaje específico (más inteligente)
      const canRespond = await this.canRespondToMessage(
        recipient,
        message,
        isCommand
      );

      if (!canRespond) {
        logWarn(
          `🚫 No se puede enviar mensaje a ${recipient}: límite de respuestas alcanzado`
        );
        return { success: false, error: "Rate limit exceeded" };
      }

      logInfo(
        `📤 Enviando mensaje a ${recipient}: ${message.substring(0, 50)}...`
      );

      const response = await axios.post(
        `${this.apiBaseUrl}/api/send`,
        {
          recipient: recipient,
          message: message,
        },
        {
          timeout: 15000, // Aumentado a 15 segundos
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        logInfo(`✅ Mensaje enviado exitosamente`);
        // Registrar la respuesta para rate limiting
        await this.recordResponse(recipient);
        return { success: true, data: response.data };
      } else {
        logError(`❌ Respuesta inesperada del bridge`);
        return { success: false, error: "Respuesta inesperada" };
      }
    } catch (error) {
      logError(`❌ Error enviando mensaje: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/send`,
        {
          test: "ping",
        },
        { timeout: 5000 }
      );

      // Si obtenemos "Recipient is required", significa que está funcionando
      return response.status === 200;
    } catch (error) {
      if (error.response && error.response.data) {
        const responseData = error.response.data.toString().trim();
        if (responseData === "Recipient is required") {
          logInfo(`✅ Bridge funcionando correctamente`);
          return true; // El bridge está funcionando
        }
      }
      logError(`❌ Conexión fallida: ${error.message}`);
      return false;
    }
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    logInfo("🛑 Polling detenido");
  }

  async disconnect() {
    this.stopPolling();

    // Guardar estado antes de cerrar
    if (this.conversationState) {
      try {
        await this.conversationState.close();
        logInfo("💾 Estado de conversaciones guardado correctamente");
      } catch (error) {
        logError(`❌ Error guardando estado al cerrar: ${error.message}`);
      }
    }

    logInfo("🔌 Cliente WhatsApp desconectado");
  }

  // Método para obtener información de estado
  getStatus() {
    return {
      connected: this.pollInterval !== null,
      lastProcessed: this.lastProcessedTimestamp,
      polling: this.isPolling,
      bridgeUrl: this.apiBaseUrl,
    };
  }

  /**
   * Inicializar referencia al servicio de usuarios
   * @param {UserService} userService - Servicio de usuarios
   */
  setUserService(userService) {
    this.userService = userService;
  }

  /**
   * Verificar si un usuario es admin
   * @param {string} chatJid - JID del chat/usuario
   * @returns {Promise<boolean>} True si es admin
   */
  async isAdminUser(chatJid) {
    if (!this.userService) return false;

    try {
      // Normalizar JID - Si no tiene @, agregarlo
      let normalizedJid = chatJid;
      if (!chatJid.includes("@")) {
        normalizedJid = `${chatJid}@s.whatsapp.net`;
      }

      const user = await this.userService.getUserByJid(normalizedJid);
      const isAdmin = user && user.user_type === "admin";

      return isAdmin;
    } catch (error) {
      logError(`❌ Error verificando admin para ${chatJid}: ${error.message}`);
      return false;
    }
  }

  // Métodos de rate limiting y control
  resetDailyCountersIfNeeded() {
    const currentDay = new Date().getDate();
    if (currentDay !== this.lastDayReset) {
      logInfo("🔄 Reiniciando contadores diarios de respuestas");
      this.dailyResponseCount.clear();
      this.lastDayReset = currentDay;
    }
  }

  async canRespondToChat(chatJid) {
    // ✅ PRIVILEGIOS ADMIN: Sin límites de rate limiting
    const isAdmin = await this.isAdminUser(chatJid);
    if (isAdmin) {
      logInfo(`👑 Usuario admin ${chatJid} - Sin límites de respuesta`);
      return true;
    }

    const now = Date.now();

    // Verificar intervalo mínimo entre respuestas
    const lastResponse = this.lastResponseTime.get(chatJid);
    if (lastResponse && now - lastResponse < this.minResponseInterval) {
      return false;
    }

    // Verificar límite diario
    const dailyCount = this.dailyResponseCount.get(chatJid) || 0;
    if (dailyCount >= this.maxDailyResponses) {
      return false;
    }

    return true;
  }

  // Rate limiting inteligente basado en el tipo de conversación
  async canRespondToMessage(chatJid, messageContent, isCommand = false) {
    const now = Date.now();

    // ✅ PRIVILEGIOS ADMIN: Sin límites de rate limiting
    const isAdmin = await this.isAdminUser(chatJid);
    if (isAdmin) {
      logInfo(`👑 Usuario admin ${chatJid} - Sin límites de respuesta`);
      return true;
    }

    // Los comandos tienen prioridad y menor restricción
    if (isCommand) {
      const lastCommand = this.lastResponseTime.get(chatJid + "_command");
      if (lastCommand && now - lastCommand < 5000) {
        // 5 segundos para comandos
        return false;
      }
      return true;
    }

    // Verificar límite diario primero
    const dailyCount = this.dailyResponseCount.get(chatJid) || 0;
    if (dailyCount >= this.maxDailyResponses) {
      logInfo(
        `📊 Usuario ${chatJid} ha alcanzado el límite diario (${dailyCount}/${this.maxDailyResponses})`
      );
      return false;
    }

    // Para usuarios con pocas respuestas hoy, ser más permisivo
    if (dailyCount < 5) {
      const lastResponse = this.lastResponseTime.get(chatJid);
      if (lastResponse && now - lastResponse < 3000) {
        // Solo 3 segundos para usuarios nuevos/con pocas interacciones
        logInfo(
          `⏰ Usuario ${chatJid} debe esperar 3s entre respuestas (count: ${dailyCount})`
        );
        return false;
      }
      return true;
    }

    // Verificar intervalo mínimo estándar para usuarios regulares
    const lastResponse = this.lastResponseTime.get(chatJid);
    if (lastResponse && now - lastResponse < this.minResponseInterval) {
      const timeLeft = Math.ceil(
        (this.minResponseInterval - (now - lastResponse)) / 1000
      );
      logInfo(
        `⏰ Usuario ${chatJid} debe esperar ${timeLeft}s más (count: ${dailyCount})`
      );
      return false;
    }

    // Rate limiting más flexible para preguntas directas
    if (messageContent && messageContent.includes("?")) {
      // Preguntas tienen intervalo reducido
      const questionInterval = 10000; // 10 segundos para preguntas
      if (lastResponse && now - lastResponse < questionInterval) {
        const timeLeft = Math.ceil(
          (questionInterval - (now - lastResponse)) / 1000
        );
        logInfo(`❓ Pregunta de ${chatJid} debe esperar ${timeLeft}s más`);
        return false;
      }
    }

    return true;
  }

  async recordResponse(chatJid, isCommand = false) {
    // ✅ PRIVILEGIOS ADMIN: No registrar contadores para admin
    const isAdmin = await this.isAdminUser(chatJid);
    if (isAdmin) {
      logInfo(
        `👑 Usuario admin ${chatJid} - No se registran límites de respuesta`
      );
      return;
    }

    const now = Date.now();
    this.lastResponseTime.set(chatJid, now);

    // Para comandos, registrar también tiempo específico
    if (isCommand) {
      this.lastResponseTime.set(chatJid + "_command", now);
    }

    const currentCount = this.dailyResponseCount.get(chatJid) || 0;
    this.dailyResponseCount.set(chatJid, currentCount + 1);

    logInfo(
      `📊 Respuestas hoy para ${chatJid}: ${currentCount + 1}/${
        this.maxDailyResponses
      } ${isCommand ? "(comando)" : ""}`
    );
  }
}

module.exports = WhatsAppClient;
