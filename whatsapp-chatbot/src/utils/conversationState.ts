import * as fs from "fs/promises";
import * as path from "path";
import { WhatsAppMessage } from "../types/core/message.types";
import { ConversationState as ConversationStateType } from "../types/utils/conversation.types";
import logger from "./logger";

interface ConversationStateData {
  lastProcessedTimestamp: string | null;
  lastBotStartTime: string | null;
  processedMessageIds: Set<string>;
  chatLastProcessed: Map<string, string>;
  botSessionId: string;
}

interface SerializableState {
  lastProcessedTimestamp: string | null;
  lastBotStartTime: string | null;
  processedMessageIds: string[];
  chatLastProcessed: [string, string][];
  botSessionId: string;
  savedAt: string;
}

interface ConversationStats {
  lastProcessedTimestamp: string | null;
  lastBotStartTime: string | null;
  processedMessagesCount: number;
  trackedChatsCount: number;
  sessionId: string;
  initialized: boolean;
}

/**
 * Sistema de persistencia de estado de conversaciones
 * Evita que el bot responda a mensajes históricos cuando se reinicia
 */
export class ConversationStateManager {
  private stateFile: string;
  private state: ConversationStateData;
  private maxProcessedMessages: number;
  private initialized: boolean;

  constructor() {
    this.stateFile = path.join(__dirname, "../../data/conversation-state.json");
    this.state = {
      lastProcessedTimestamp: null,
      lastBotStartTime: null,
      processedMessageIds: new Set(),
      chatLastProcessed: new Map(),
      botSessionId: this.generateSessionId(),
    };
    this.maxProcessedMessages = 10000; // Límite para evitar que crezca indefinidamente
    this.initialized = false;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(): Promise<void> {
    try {
      // Crear directorio si no existe
      await this.ensureDataDirectory();

      // Cargar estado previo si existe
      await this.loadState();

      // Establecer timestamp de inicio de esta sesión
      const now = new Date();
      this.state.lastBotStartTime = now.toISOString();

      // Si no hay timestamp previo, usar tiempo actual (solo mensajes nuevos)
      if (!this.state.lastProcessedTimestamp) {
        this.state.lastProcessedTimestamp = now
          .toISOString()
          .replace("T", " ")
          .replace("Z", "+00:00");
        logger.info(
          `🆕 Primera ejecución - estableciendo timestamp base: ${this.state.lastProcessedTimestamp}`
        );
      } else {
        logger.info(
          `🔄 Recuperando estado - último timestamp: ${this.state.lastProcessedTimestamp}`
        );
        logger.info(
          `📊 Mensajes procesados en memoria: ${this.state.processedMessageIds.size}`
        );
        logger.info(
          `💬 Chats rastreados: ${this.state.chatLastProcessed.size}`
        );
      }

      // Generar nuevo session ID para esta ejecución
      this.state.botSessionId = this.generateSessionId();

      // Guardar estado inicial
      await this.saveState();

      this.initialized = true;
      logger.info(
        `✅ ConversationState inicializado - Session: ${this.state.botSessionId}`
      );
    } catch (error) {
      logger.error(
        `❌ Error inicializando ConversationState: ${(error as Error).message}`
      );
      // Usar valores por defecto si falla la carga
      const now = new Date();
      this.state.lastProcessedTimestamp = now
        .toISOString()
        .replace("T", " ")
        .replace("Z", "+00:00");
      this.state.lastBotStartTime = now.toISOString();
      this.initialized = true;
    }
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.stateFile);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      logger.info(`📁 Directorio de datos creado: ${dataDir}`);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, "utf8");
      const loadedState: SerializableState = JSON.parse(data);

      this.state.lastProcessedTimestamp = loadedState.lastProcessedTimestamp;
      this.state.lastBotStartTime = loadedState.lastBotStartTime;

      // Convertir arrays a Sets y Maps
      this.state.processedMessageIds = new Set(
        loadedState.processedMessageIds || []
      );
      this.state.chatLastProcessed = new Map(
        loadedState.chatLastProcessed || []
      );

      logger.info(`📁 Estado cargado desde archivo`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.error(`Error cargando estado: ${(error as Error).message}`);
      }
      // Si no existe el archivo o hay error, usar estado vacío
    }
  }

  private async saveState(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Limpiar mensajes procesados si excede el límite
      if (this.state.processedMessageIds.size > this.maxProcessedMessages) {
        const idsArray = Array.from(this.state.processedMessageIds);
        // Mantener solo los más recientes (últimos 5000)
        this.state.processedMessageIds = new Set(idsArray.slice(-5000));
        logger.info(
          `🧹 Limpieza de mensajes procesados: manteniendo ${this.state.processedMessageIds.size} IDs`
        );
      }

      // Preparar datos para serialización
      const stateToSave: SerializableState = {
        lastProcessedTimestamp: this.state.lastProcessedTimestamp,
        lastBotStartTime: this.state.lastBotStartTime,
        processedMessageIds: Array.from(this.state.processedMessageIds),
        chatLastProcessed: Array.from(this.state.chatLastProcessed.entries()),
        botSessionId: this.state.botSessionId,
        savedAt: new Date().toISOString(),
      };

      await fs.writeFile(this.stateFile, JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      logger.error(`❌ Error guardando estado: ${(error as Error).message}`);
    }
  }

  /**
   * Verifica si un mensaje debe ser procesado
   */
  shouldProcessMessage(message: WhatsAppMessage): boolean {
    if (!this.initialized) {
      logger.warn("ConversationState no inicializado");
      return false;
    }

    const messageId = message.id;
    const messageTimestamp = message.timestamp;
    const chatJid = message.chatJid;

    // 1. Verificar si ya fue procesado por ID
    if (this.state.processedMessageIds.has(messageId)) {
      logger.info(`⏭️  Mensaje ${messageId} ya procesado (por ID)`);
      return false;
    }

    // 2. Verificar si el mensaje es anterior al último timestamp procesado globalmente
    if (
      this.state.lastProcessedTimestamp &&
      messageTimestamp <= this.state.lastProcessedTimestamp
    ) {
      logger.info(
        `⏭️  Mensaje ${messageId} es anterior al último procesado (${messageTimestamp} <= ${this.state.lastProcessedTimestamp})`
      );
      return false;
    }

    // 3. Verificar si el mensaje es anterior al último procesado para este chat específico
    const chatLastTimestamp = this.state.chatLastProcessed.get(chatJid);
    if (chatLastTimestamp && messageTimestamp <= chatLastTimestamp) {
      logger.info(
        `⏭️  Mensaje ${messageId} es anterior al último procesado para chat ${chatJid}`
      );
      return false;
    }

    // 4. Verificar si el mensaje es muy antiguo (más de 1 hora antes del inicio del bot)
    if (this.state.lastBotStartTime) {
      const botStartTime = new Date(this.state.lastBotStartTime);
      const msgTime = new Date(messageTimestamp);
      const oneHourBeforeStart = new Date(
        botStartTime.getTime() - 60 * 60 * 1000
      );

      if (msgTime < oneHourBeforeStart) {
        logger.info(
          `⏭️  Mensaje ${messageId} es demasiado antiguo (anterior a 1 hora del inicio del bot)`
        );
        return false;
      }
    }

    // 5. Verificar si el mensaje es del propio bot
    if (message.isFromMe) {
      logger.info(`⏭️  Mensaje ${messageId} es del propio bot`);
      return false;
    }

    return true;
  }

  /**
   * Marca un mensaje como procesado
   */
  async markMessageProcessed(message: WhatsAppMessage): Promise<void> {
    if (!this.initialized) return;

    const messageId = message.id;
    const messageTimestamp = message.timestamp;
    const chatJid = message.chatJid;

    // Agregar a procesados
    this.state.processedMessageIds.add(messageId);

    // Actualizar timestamp global si es más reciente
    if (
      !this.state.lastProcessedTimestamp ||
      messageTimestamp > this.state.lastProcessedTimestamp
    ) {
      this.state.lastProcessedTimestamp = messageTimestamp;
    }

    // Actualizar timestamp para este chat específico
    const currentChatTimestamp = this.state.chatLastProcessed.get(chatJid);
    if (!currentChatTimestamp || messageTimestamp > currentChatTimestamp) {
      this.state.chatLastProcessed.set(chatJid, messageTimestamp);
    }

    // Guardar estado cada 10 mensajes procesados
    if (this.state.processedMessageIds.size % 10 === 0) {
      await this.saveState();
    }
  }

  /**
   * Obtiene el último timestamp procesado
   */
  getLastProcessedTimestamp(): string | null {
    return this.state.lastProcessedTimestamp;
  }

  /**
   * Obtiene estadísticas del estado actual
   */
  getStats(): ConversationStats {
    return {
      lastProcessedTimestamp: this.state.lastProcessedTimestamp,
      lastBotStartTime: this.state.lastBotStartTime,
      processedMessagesCount: this.state.processedMessageIds.size,
      trackedChatsCount: this.state.chatLastProcessed.size,
      sessionId: this.state.botSessionId,
      initialized: this.initialized,
    };
  }

  /**
   * Limpia el estado (usar con precaución)
   */
  async reset(): Promise<void> {
    logger.warn("🗑️  Reseteando estado de conversaciones");
    const now = new Date();
    this.state = {
      lastProcessedTimestamp: now
        .toISOString()
        .replace("T", " ")
        .replace("Z", "+00:00"),
      lastBotStartTime: now.toISOString(),
      processedMessageIds: new Set(),
      chatLastProcessed: new Map(),
      botSessionId: this.generateSessionId(),
    };
    await this.saveState();
  }

  /**
   * Cierra y guarda el estado
   */
  async close(): Promise<void> {
    await this.saveState();
    logger.info("💾 Estado de conversaciones guardado al cerrar");
  }
}

// Crear instancia singleton
const conversationState = new ConversationStateManager();

export default conversationState;
