import { WhatsAppMessage } from "../core/message.types";

/**
 * Configuración del cliente de WhatsApp
 */
export interface WhatsAppClientConfig {
  apiBaseUrl: string;
  pollingIntervalMs: number;
  minResponseInterval: number;
  maxDailyResponses: number;
  enableRateLimiting: boolean;
  enableDuplicateFiltering: boolean;
}

/**
 * Estado de conexión del cliente
 */
export interface ConnectionState {
  connected: boolean;
  polling: boolean;
  lastHeartbeat: Date;
}

/**
 * Estadísticas del cliente de WhatsApp
 */
export interface WhatsAppClientStats {
  messagesProcessed: number;
  messagesSent: number;
  uptime: number;
  errors: number;
  duplicatesFiltered: number;
  rateLimitHits: number;
}

/**
 * Información de rate limiting por chat
 */
export interface ChatRateLimit {
  chatJid: string;
  lastResponse?: number;
  lastCommand?: number;
  dailyCount: number;
}

/**
 * Respuesta del API del bridge
 */
export interface BridgeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Mensaje enviado al bridge
 */
export interface OutgoingMessage {
  chatJid: string;
  message: string;
  type?: "text" | "image" | "document" | "audio";
  metadata?: Record<string, any>;
}

/**
 * Respuesta de envío de mensaje
 */
export interface SendMessageResult {
  success: boolean;
  data?: any;
  error?: string;
  messageId?: string;
  timestamp?: Date;
}

/**
 * Configuración de polling
 */
export interface PollingConfig {
  intervalMs: number;
  maxRetries: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

/**
 * Evento del cliente de WhatsApp
 */
export interface WhatsAppClientEvent {
  type: "message" | "connection" | "error" | "status";
  data: any;
  timestamp: Date;
}

/**
 * Filtros para consultar mensajes
 */
export interface MessageFilters {
  afterTimestamp?: string;
  chatJid?: string;
  limit?: number;
  includeFromMe?: boolean;
  enableSpamFilter?: boolean;
}
