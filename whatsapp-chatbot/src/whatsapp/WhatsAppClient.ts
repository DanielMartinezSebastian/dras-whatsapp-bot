import axios, { AxiosResponse } from "axios";
import { EventEmitter } from "events";
import { IWhatsAppClient } from "../interfaces/whatsapp/IWhatsAppClient";
import {
  WhatsAppClientConfig,
  WhatsAppClientStats,
  ConnectionState,
  SendMessageResult,
  MessageFilters,
  BridgeResponse,
  OutgoingMessage,
  ChatRateLimit,
} from "../types/whatsapp/client.types";
import { WhatsAppMessage } from "../types/core/message.types";
import { logInfo, logError, logWarn } from "../utils/logger";

/**
 * Cliente TypeScript para WhatsApp Bridge
 * Migración del cliente legacy con arquitectura moderna
 */
export class WhatsAppClient extends EventEmitter implements IWhatsAppClient {
  private config: WhatsAppClientConfig;
  private connectionState: ConnectionState;
  private stats: WhatsAppClientStats;

  // Control de polling
  private pollInterval: NodeJS.Timeout | null;
  private isPolling: boolean;

  // Sistema anti-duplicados y rate limiting
  private processedMessageIds: Set<string>;
  private chatRateLimits: Map<string, ChatRateLimit>;

  // Timestamps
  private lastProcessedTimestamp!: string;
  private botStartTimestamp!: string;
  private connectTime?: Date;

  // Estado de conversaciones y servicios
  private conversationState: any; // TODO: Migrar ConversationState a TypeScript
  private userService: any; // TODO: Migrar UserService a TypeScript

  // Control de contadores diarios
  private lastDayReset: number;

  constructor(config?: Partial<WhatsAppClientConfig>) {
    super();

    // Configuración por defecto
    this.config = {
      apiBaseUrl: process.env.BRIDGE_URL || "http://127.0.0.1:8080",
      pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL || "5000", 10),
      minResponseInterval: 20000, // 20 segundos
      maxDailyResponses: 100,
      enableRateLimiting: true,
      enableDuplicateFiltering: true,
      ...config,
    };

    // Inicializar estado de conexión
    this.connectionState = {
      connected: false,
      polling: false,
      lastHeartbeat: new Date(),
    };

    // Inicializar estadísticas
    this.stats = {
      messagesProcessed: 0,
      messagesSent: 0,
      uptime: 0,
      errors: 0,
      duplicatesFiltered: 0,
      rateLimitHits: 0,
    };

    // Control de polling
    this.pollInterval = null;
    this.isPolling = false;

    // Sistema anti-duplicados y rate limiting
    this.processedMessageIds = new Set<string>();
    this.chatRateLimits = new Map<string, ChatRateLimit>();

    // Inicializar timestamps con la misma lógica del cliente legacy
    this.initializeTimestamps();

    // Inicializar estado de conversaciones con lazy loading
    this.initializeConversationState();
    this.userService = null;

    // Control de contadores diarios
    this.lastDayReset = new Date().getDate();

    logInfo(`🔄 Bot iniciado - Timestamp UTC: ${this.botStartTimestamp}`);
    logInfo(
      `🚨 POLÍTICA ANTI-HISTORIAL: Solo procesando mensajes desde ${this.lastProcessedTimestamp}`
    );
  }
  isConnected(): boolean {
    throw new Error("Method not implemented.");
  }
  getConnectionState(): ConnectionState {
    throw new Error("Method not implemented.");
  }
  sendImage(
    chatJid: string,
    imagePath: string,
    caption?: string
  ): Promise<SendMessageResult> {
    throw new Error("Method not implemented.");
  }
  sendDocument(
    chatJid: string,
    documentPath: string,
    filename?: string
  ): Promise<SendMessageResult> {
    throw new Error("Method not implemented.");
  }
  sendAudio(chatJid: string, audioPath: string): Promise<SendMessageResult> {
    throw new Error("Method not implemented.");
  }
  getMessages(filters?: MessageFilters): Promise<WhatsAppMessage[]> {
    throw new Error("Method not implemented.");
  }
  updateConfig(config: Partial<WhatsAppClientConfig>): void {
    throw new Error("Method not implemented.");
  }
  stopMessagePolling(): void {
    throw new Error("Method not implemented.");
  }
  canSendToChat(chatJid: string): boolean {
    throw new Error("Method not implemented.");
  }
  markMessageAsProcessed(messageId: string): void {
    throw new Error("Method not implemented.");
  }
  isMessageProcessed(messageId: string): boolean {
    throw new Error("Method not implemented.");
  }

  /**
   * Inicializar timestamps usando la misma lógica del cliente legacy
   */
  private initializeTimestamps(): void {
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
  }

  /**
   * Conectar al bridge de WhatsApp
   */
  async connect(): Promise<boolean> {
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

      // Actualizar estado de conexión
      this.connectionState.connected = true;
      this.connectTime = new Date();

      // Iniciar polling para nuevos mensajes
      this.startMessagePolling();

      return true;
    } catch (error) {
      logError(`❌ Error conectando al bridge: ${(error as Error).message}`);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Iniciar polling de mensajes
   */
  private startMessagePolling(): void {
    if (this.isPolling) {
      logWarn("⚠️  Polling ya está activo");
      return;
    }

    this.isPolling = true;
    this.connectionState.polling = true;
    logInfo(`🔄 Iniciando polling cada ${this.config.pollingIntervalMs}ms`);

    this.pollInterval = setInterval(async () => {
      await this.checkForNewMessages();
    }, this.config.pollingIntervalMs);
  }

  /**
   * Verificar nuevos mensajes en la base de datos
   */
  private async checkForNewMessages(): Promise<void> {
    try {
      const dbConnection = this.getDbConnection();
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
        firstFew.forEach((msg: any, i: number) => {
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
            this.stats.duplicatesFiltered++;
            continue;
          }

          // Verificar límites de respuesta por chat
          if (!(await this.canRespondToChat(messageRow.chat_jid))) {
            logInfo(
              `🚫 Chat ${messageRow.chat_jid} ha alcanzado límite de respuestas`
            );
            this.processedMessageIds.add(messageRow.id);
            await this.conversationState.markMessageProcessed(message);
            this.lastProcessedTimestamp = messageRow.timestamp;
            this.stats.rateLimitHits++;
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
          this.stats.messagesProcessed++;

          // Actualizar último timestamp procesado
          this.lastProcessedTimestamp = messageRow.timestamp;
        }
      } else {
        // No hay mensajes nuevos - esto es el comportamiento esperado tras reinicio
        logInfo(
          `😴 No hay mensajes nuevos desde ${this.lastProcessedTimestamp} - Sistema funcionando correctamente`
        );
      }

      // Actualizar heartbeat
      this.connectionState.lastHeartbeat = new Date();
    } catch (error) {
      logError(`Error verificando mensajes: ${(error as Error).message}`);
      this.stats.errors++;
    }
  }

  /**
   * Formatear mensaje de la base de datos para uso interno
   */
  private formatMessage(messageRow: any): WhatsAppMessage {
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

  /**
   * Enviar mensaje a través del bridge
   */
  async sendMessage(
    recipient: string,
    message: string,
    filters?: MessageFilters
  ): Promise<SendMessageResult> {
    try {
      // Verificar si podemos responder a este chat (con privilegios admin)
      const canRespond = await this.canRespondToChat(recipient);

      if (!canRespond) {
        logWarn(
          `🚫 No se puede enviar mensaje a ${recipient}: límite de respuestas alcanzado`
        );
        this.stats.rateLimitHits++;
        return { success: false, error: "Rate limit exceeded" };
      }

      logInfo(
        `📤 Enviando mensaje a ${recipient}: ${message.substring(0, 50)}...`
      );

      const response: AxiosResponse<BridgeResponse> = await axios.post(
        `${this.config.apiBaseUrl}/api/send`,
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
        this.stats.messagesSent++;
        return { success: true, data: response.data };
      } else {
        logError(`❌ Respuesta inesperada del bridge`);
        this.stats.errors++;
        return { success: false, error: "Respuesta inesperada" };
      }
    } catch (error) {
      logError(`❌ Error enviando mensaje: ${(error as Error).message}`);
      this.stats.errors++;
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Probar conexión con el bridge
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.config.apiBaseUrl}/api/send`,
        {
          test: "ping",
        },
        { timeout: 5000 }
      );

      // Si obtenemos "Recipient is required", significa que está funcionando
      return response.status === 200;
    } catch (error: any) {
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

  /**
   * Detener polling de mensajes
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    this.connectionState.polling = false;
    logInfo("🛑 Polling detenido");
  }

  /**
   * Desconectar del bridge
   */
  async disconnect(): Promise<void> {
    this.stopPolling();

    // Guardar estado antes de cerrar
    if (this.conversationState) {
      try {
        await this.conversationState.close();
        logInfo("💾 Estado de conversaciones guardado correctamente");
      } catch (error) {
        logError(
          `❌ Error guardando estado al cerrar: ${(error as Error).message}`
        );
      }
    }

    this.connectionState.connected = false;
    logInfo("🔌 Cliente WhatsApp desconectado");
  }

  /**
   * Obtener estado actual del cliente
   */
  getStatus(): any {
    return {
      connected: this.connectionState.connected,
      lastProcessed: this.lastProcessedTimestamp,
      polling: this.isPolling,
      bridgeUrl: this.config.apiBaseUrl,
      stats: this.stats,
      uptime: this.connectTime ? Date.now() - this.connectTime.getTime() : 0,
    };
  }

  /**
   * Obtener estadísticas del cliente
   */
  getStats(): WhatsAppClientStats {
    if (this.connectTime) {
      this.stats.uptime = Date.now() - this.connectTime.getTime();
    }
    return { ...this.stats };
  }

  /**
   * Establecer referencia al servicio de usuarios
   */
  setUserService(userService: any): void {
    this.userService = userService;
  }

  /**
   * Verificar si un usuario es admin
   */
  async isAdminUser(chatJid: string): Promise<boolean> {
    if (!this.userService) return false;

    try {
      // Normalizar JID - Si no tiene @, agregarlo
      let normalizedJid = chatJid;
      if (!chatJid.includes("@")) {
        normalizedJid = `${chatJid}@s.whatsapp.net`;
      }

      const user = await this.userService.getUserByJid(normalizedJid);
      const isAdmin = !!(user && user.user_type === "admin");

      return isAdmin;
    } catch (error) {
      logError(
        `❌ Error verificando admin para ${chatJid}: ${
          (error as Error).message
        }`
      );
      return false;
    }
  }

  /**
   * Resetear contadores diarios si es necesario
   */
  private resetDailyCountersIfNeeded(): void {
    const currentDay = new Date().getDate();
    if (currentDay !== this.lastDayReset) {
      logInfo("🔄 Reiniciando contadores diarios de respuestas");
      this.chatRateLimits.clear();
      this.lastDayReset = currentDay;
    }
  }

  /**
   * Verificar si se puede responder a un chat
   */
  async canRespondToChat(chatJid: string): Promise<boolean> {
    if (!this.config.enableRateLimiting) {
      return true;
    }

    // ✅ PRIVILEGIOS ADMIN: Sin límites de rate limiting
    const isAdmin = await this.isAdminUser(chatJid);
    if (isAdmin) {
      logInfo(`👑 Usuario admin ${chatJid} - Sin límites de respuesta`);
      return true;
    }

    const now = Date.now();
    const rateLimit = this.chatRateLimits.get(chatJid);

    if (!rateLimit) {
      return true;
    }

    // Verificar intervalo mínimo entre respuestas
    if (
      rateLimit.lastResponse &&
      now - rateLimit.lastResponse < this.config.minResponseInterval
    ) {
      return false;
    }

    // Verificar límite diario
    if (rateLimit.dailyCount >= this.config.maxDailyResponses) {
      return false;
    }

    return true;
  }

  /**
   * Verificar si se puede responder a un mensaje específico
   */
  async canRespondToMessage(
    chatJid: string,
    messageContent: string,
    isCommand = false
  ): Promise<boolean> {
    if (!this.config.enableRateLimiting) {
      return true;
    }

    const now = Date.now();

    // ✅ PRIVILEGIOS ADMIN: Sin límites de rate limiting
    const isAdmin = await this.isAdminUser(chatJid);
    if (isAdmin) {
      logInfo(`👑 Usuario admin ${chatJid} - Sin límites de respuesta`);
      return true;
    }

    const rateLimit = this.chatRateLimits.get(chatJid);

    // Los comandos tienen prioridad y menor restricción
    if (isCommand) {
      const lastCommand = rateLimit?.lastCommand;
      if (lastCommand && now - lastCommand < 5000) {
        // 5 segundos para comandos
        return false;
      }
      return true;
    }

    // Verificar intervalo mínimo estándar
    if (
      rateLimit?.lastResponse &&
      now - rateLimit.lastResponse < this.config.minResponseInterval
    ) {
      return false;
    }

    // Verificar límite diario
    if (rateLimit && rateLimit.dailyCount >= this.config.maxDailyResponses) {
      return false;
    }

    // Rate limiting más flexible para preguntas directas
    if (messageContent && messageContent.includes("?")) {
      // Preguntas tienen intervalo reducido
      const questionInterval = 15000; // 15 segundos para preguntas
      if (
        rateLimit?.lastResponse &&
        now - rateLimit.lastResponse < questionInterval
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Registrar respuesta para rate limiting
   */
  async recordResponse(chatJid: string, isCommand = false): Promise<void> {
    if (!this.config.enableRateLimiting) {
      return;
    }

    // ✅ PRIVILEGIOS ADMIN: No registrar contadores para admin
    const isAdmin = await this.isAdminUser(chatJid);
    if (isAdmin) {
      logInfo(
        `👑 Usuario admin ${chatJid} - No se registran límites de respuesta`
      );
      return;
    }

    const now = Date.now();
    const existingLimit = this.chatRateLimits.get(chatJid);

    const rateLimit: ChatRateLimit = {
      chatJid,
      lastResponse: now,
      dailyCount: (existingLimit?.dailyCount || 0) + 1,
      lastCommand: isCommand ? now : existingLimit?.lastCommand,
    };

    this.chatRateLimits.set(chatJid, rateLimit);

    logInfo(
      `📊 Respuestas hoy para ${chatJid}: ${rateLimit.dailyCount}/${
        this.config.maxDailyResponses
      } ${isCommand ? "(comando)" : ""}`
    );
  }

  /**
   * Limpiar cache de IDs procesados (mantenimiento)
   */
  clearProcessedCache(): void {
    this.processedMessageIds.clear();
    logInfo("🧹 Cache de mensajes procesados limpiado");
  }

  /**
   * Configurar filtros de mensajes
   */
  setMessageFilters(filters: MessageFilters): void {
    // Implementar lógica de filtros según sea necesario
    logInfo("📋 Filtros de mensajes configurados");
  }

  /**
   * Inicializar ConversationState con lazy loading
   */
  private initializeConversationState(): void {
    try {
      const ConversationState = require("../utils/conversationState");
      this.conversationState = new ConversationState();
    } catch (error) {
      logWarn("ConversationState no disponible en entorno de test");
      // Mock básico para tests
      this.conversationState = {
        initialize: () => Promise.resolve(),
        shouldProcessMessage: () => true,
        markMessageProcessed: () => Promise.resolve(),
        close: () => Promise.resolve(),
      };
    }
  }

  /**
   * Obtener conexión a la base de datos con lazy loading
   */
  private getDbConnection(): any {
    try {
      const { dbConnection } = require("../database/connection");
      return dbConnection;
    } catch (error) {
      logWarn("Database connection no disponible en entorno de test");
      // Mock básico para tests
      return {
        isReady: () => true,
        getMessagesSince: () => Promise.resolve([]),
      };
    }
  }
}

// Exportación por defecto para compatibilidad
export default WhatsAppClient;
