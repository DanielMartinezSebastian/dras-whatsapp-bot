import {
  WhatsAppClientStats,
  SendMessageResult,
  MessageFilters,
} from "../../types/whatsapp/client.types";

/**
 * Interface básica para el cliente de WhatsApp
 */
export interface IWhatsAppClient {
  /**
   * Establece conexión con el bridge de WhatsApp
   */
  connect(): Promise<boolean>;

  /**
   * Cierra la conexión con el bridge
   */
  disconnect(): Promise<void>;

  /**
   * Envía un mensaje de texto
   */
  sendMessage(
    chatJid: string,
    message: string,
    filters?: MessageFilters
  ): Promise<SendMessageResult>;

  /**
   * Prueba la conexión con el bridge
   */
  testConnection(): Promise<boolean>;

  /**
   * Obtiene las estadísticas del cliente
   */
  getStats(): WhatsAppClientStats;

  /**
   * Obtiene el estado actual del cliente
   */
  getStatus(): any;

  /**
   * Establece el servicio de usuarios
   */
  setUserService(userService: any): void;

  /**
   * Verifica si un usuario es administrador
   */
  isAdminUser(chatJid: string): Promise<boolean>;

  /**
   * Verifica si se puede responder a un chat
   */
  canRespondToChat(chatJid: string): Promise<boolean>;

  /**
   * Verifica si se puede responder a un mensaje específico
   */
  canRespondToMessage(
    chatJid: string,
    messageContent: string,
    isCommand?: boolean
  ): Promise<boolean>;

  /**
   * Registra una respuesta para rate limiting
   */
  recordResponse(chatJid: string, isCommand?: boolean): Promise<void>;

  /**
   * Limpia el cache de mensajes procesados
   */
  clearProcessedCache(): void;

  /**
   * Configura filtros de mensajes
   */
  setMessageFilters(filters: MessageFilters): void;
}
