/**
 * Tipos TypeScript para WhatsApp Bridge
 */

// Configuración del cliente bridge
export interface BridgeClientConfig {
  /** URL base del bridge (default: http://127.0.0.1:8080) */
  baseUrl: string;
  
  /** Timeout para requests en ms (default: 15000) */
  timeout: number;
  
  /** Número de reintentos en caso de error (default: 3) */
  retries: number;
  
  /** Delay entre reintentos en ms (default: 1000) */
  retryDelay: number;
  
  /** API key para autenticación (opcional) */
  apiKey?: string;
  
  /** Habilitar logging (default: true) */
  enableLogging: boolean;
}

// Respuesta estándar del bridge
export interface BridgeResponse<T = any> {
  /** Indica si la operación fue exitosa */
  success: boolean;
  
  /** Datos de respuesta */
  data?: T;
  
  /** Mensaje de error o información */
  message?: string;
  
  /** Timestamp de la respuesta */
  timestamp?: string;
}

// Estado del bridge
export interface BridgeStatus {
  /** Si el bridge está conectado a WhatsApp */
  connected: boolean;
  
  /** Tiempo de actividad en ms */
  uptime: number;
  
  /** Número de mensajes procesados */
  messagesProcessed: number;
  
  /** Timestamp de última actividad */
  lastActivity: string;
}

// Error del bridge
export interface BridgeError {
  /** Código de error */
  code: string;
  
  /** Mensaje de error */
  message: string;
  
  /** Detalles adicionales del error */
  details?: any;
  
  /** Operación que causó el error */
  operation?: string;
}

// Request para enviar mensaje
export interface SendMessageRequest {
  /** Destinatario (número de teléfono o JID) */
  recipient: string;
  
  /** Contenido del mensaje */
  message: string;
  
  /** Ruta del archivo multimedia (opcional) */
  media_path?: string;
}

// Response para enviar mensaje
export interface SendMessageResponse {
  /** Si el mensaje fue enviado exitosamente */
  success: boolean;
  
  /** Mensaje de estado */
  message: string;
  
  /** ID del mensaje enviado (si disponible) */
  messageId?: string;
}

// Request para descargar multimedia
export interface DownloadMediaRequest {
  /** ID del mensaje que contiene el multimedia */
  message_id: string;
  
  /** JID del chat */
  chat_jid: string;
}

// Response para descargar multimedia
export interface DownloadMediaResponse {
  /** Si la descarga fue exitosa */
  success: boolean;
  
  /** Mensaje de estado */
  message: string;
  
  /** Nombre del archivo descargado */
  filename?: string;
  
  /** Ruta absoluta del archivo */
  path?: string;
}

// Información de mensaje de la base de datos
export interface MessageInfo {
  /** ID único del mensaje */
  id: string;
  
  /** JID del chat */
  chat_jid: string;
  
  /** Remitente del mensaje */
  sender: string;
  
  /** Contenido del mensaje */
  content: string;
  
  /** Timestamp del mensaje */
  timestamp: string;
  
  /** Si el mensaje es del usuario actual */
  is_from_me: boolean;
  
  /** Tipo de multimedia (si aplica) */
  media_type?: string;
  
  /** Nombre del archivo (si aplica) */
  filename?: string;
}

// Información de chat
export interface ChatInfo {
  /** JID del chat */
  jid: string;
  
  /** Nombre del chat */
  name: string;
  
  /** Timestamp del último mensaje */
  last_message_time: string;
}

// Tipos utilitarios
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';
export type ChatType = 'individual' | 'group';

// Filtros para consultas
export interface MessageFilters {
  /** Filtrar por tipo de mensaje */
  messageType?: MessageType;
  
  /** Filtrar por chat específico */
  chatJid?: string;
  
  /** Filtrar desde fecha */
  fromDate?: string;
  
  /** Filtrar hasta fecha */
  toDate?: string;
  
  /** Solo mensajes propios */
  fromMeOnly?: boolean;
  
  /** Límite de resultados */
  limit?: number;
}