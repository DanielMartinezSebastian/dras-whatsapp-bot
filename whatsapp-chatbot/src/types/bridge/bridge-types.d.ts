/**
 * Definiciones de tipos TypeScript para WhatsApp Bridge
 * 
 * Generado automáticamente por analyze-bridge-types.js
 * No editar manualmente - regenerar ejecutando el script
 * 
 * Fecha de generación: 2025-06-16T15:59:55.940Z
 */

// Tipos base del bridge
export namespace WhatsAppBridge {

  // Estructuras del bridge

  /**
   * Message - Estructura del bridge Go
   */
  export interface Message {
    /** Time (time.Time) */
    time: Date | string;
    /** Sender (string) */
    sender: string;
    /** Content (string) */
    content: string;
    /** IsFromMe (bool) */
    isfromme: boolean;
    /** MediaType (string) */
    mediatype: string;
    /** Filename (string) */
    filename: string;
  }

  /**
   * MessageStore - Estructura del bridge Go
   */
  export interface MessageStore {
    /** db (*sql.DB) */
    db?: sql.DB;
  }

  /**
   * SendMessageResponse - Estructura del bridge Go
   */
  export interface SendMessageResponse {
    /** Success (bool) */
    success: boolean;
    /** Message (string) */
    message: string;
  }

  /**
   * SendMessageRequest - Estructura del bridge Go
   */
  export interface SendMessageRequest {
    /** Recipient (string) */
    recipient: string;
    /** Message (string) */
    message: string;
    /** MediaPath (string) */
    media_path,omitempty: string;
  }

  /**
   * DownloadMediaRequest - Estructura del bridge Go
   */
  export interface DownloadMediaRequest {
    /** MessageID (string) */
    message_id: string;
    /** ChatJID (string) */
    chat_jid: string;
  }

  /**
   * DownloadMediaResponse - Estructura del bridge Go
   */
  export interface DownloadMediaResponse {
    /** Success (bool) */
    success: boolean;
    /** Message (string) */
    message: string;
    /** Filename (string) */
    filename,omitempty: string;
    /** Path (string) */
    path,omitempty: string;
  }

  /**
   * MediaDownloader - Estructura del bridge Go
   */
  export interface MediaDownloader {
    /** URL (string) */
    url: string;
    /** DirectPath (string) */
    directpath: string;
    /** MediaKey ([]byte) */
    mediakey: byte[];
    /** FileLength (uint64) */
    filelength: number;
    /** FileSHA256 ([]byte) */
    filesha256: byte[];
    /** FileEncSHA256 ([]byte) */
    fileencsha256: byte[];
    /** MediaType (whatsmeow.MediaType) */
    mediatype: whatsmeow.MediaType;
  }

  // Endpoints del bridge

  /**
   * Endpoint: POST /api/send
   * Only allow POST requests
   */
  export namespace send {
    export type Request = SendMessageRequest;
    export type Response = SendMessageResponse;
  }

  /**
   * Endpoint: POST /api/download
   * Only allow POST requests
   */
  export namespace download {
    export type Request = DownloadMediaRequest;
    export type Response = DownloadMediaResponse;
  }

  // Interface principal del cliente bridge

  /**
   * Cliente TypeScript para comunicarse con el WhatsApp Bridge
   */
  export interface IBridgeClient {
    /**
     * POST /api/send
     * Only allow POST requests
     */
    send(request: send.Request): Promise<send.Response>;

    /**
     * POST /api/download
     * Only allow POST requests
     */
    download(request: download.Request): Promise<download.Response>;

    /**
     * Verificar conexión con el bridge
     */
    ping(): Promise<boolean>;

    /**
     * Obtener estado del bridge
     */
    getStatus(): Promise<BridgeStatus>;

  }

  // Constantes del bridge

  export const BRIDGE_CONSTANTS = {
    waveformLength: 64,
  } as const;

  // Tipos utilitarios

  /**
   * Estado del bridge
   */
  export interface BridgeStatus {
    connected: boolean;
    uptime: number;
    messagesProcessed: number;
    lastActivity: string;
  }

  /**
   * Configuración del cliente bridge
   */
  export interface BridgeClientConfig {
    baseUrl: string;
    timeout: number;
    retries: number;
    apiKey?: string;
  }

  /**
   * Error del bridge
   */
  export interface BridgeError {
    code: string;
    message: string;
    details?: any;
  }

}

// Exportaciones por defecto para facilitar el uso
export type BridgeClient = WhatsAppBridge.IBridgeClient;
export type BridgeStatus = WhatsAppBridge.BridgeStatus;
export type BridgeError = WhatsAppBridge.BridgeError;
