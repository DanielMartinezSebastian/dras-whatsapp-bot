/**
 * WhatsApp Bridge Service
 * Enhanced client for whatsapp-bridge API with robust error handling and retries
 */

import axios from 'axios';
import { Logger } from '../utils/logger';

export interface WhatsAppBridgeConfig {
  baseURL: string;
  port: number;
  timeout: number;
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };
  enableLogging?: boolean;
  apiKey?: string;
}

export interface SendMessageRequest {
  recipient: string;
  message: string;
  media_path?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export interface DownloadMediaRequest {
  message_id: string;
  chat_jid: string;
}

export interface DownloadMediaResponse {
  success: boolean;
  message: string;
  filename?: string;
  path?: string;
}

export interface BridgeResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: string;
}

export interface BridgeStatus {
  connected: boolean;
  uptime: number;
  messagesProcessed: number;
  lastActivity: string;
}

export interface HealthStatus {
  status: 'connected' | 'disconnected' | 'error';
  bridge_available: boolean;
  last_check: string;
  error?: string;
}

export class BridgeError extends Error {
  public code: string;
  public operation?: string;
  public details?: any;

  constructor(error: any, operation?: string) {
    const message = error.message || 'Unknown bridge error';
    super(message);

    this.name = 'BridgeError';
    if (operation) {
      this.operation = operation;
    }
    this.details = error;

    // Determinar código de error
    if (error.response?.status) {
      this.code = `HTTP_${error.response.status}`;
    } else if (error.code) {
      this.code = error.code;
    } else {
      this.code = 'UNKNOWN_ERROR';
    }
  }
}

export class WhatsAppBridgeService {
  private static instance: WhatsAppBridgeService;
  private logger: Logger;
  private config: WhatsAppBridgeConfig;
  private httpClient: any;
  private connected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private retryCount: number = 0;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = {
      baseURL: 'http://127.0.0.1',
      port: 8080,
      timeout: 15000,
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
      },
      enableLogging: true,
    };

    this.httpClient = this.createHttpClient();
    this.setupInterceptors();
  }

  public static getInstance(): WhatsAppBridgeService {
    if (!WhatsAppBridgeService.instance) {
      WhatsAppBridgeService.instance = new WhatsAppBridgeService();
    }
    return WhatsAppBridgeService.instance;
  }

  private createHttpClient(): any {
    const baseURL = `${this.config.baseURL}:${this.config.port}`;

    return axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config: any) => {
        if (this.config.enableLogging) {
          this.logger.info(
            'WhatsAppBridge',
            `Request: ${config.method?.toUpperCase()} ${config.url}`
          );
        }
        return config;
      },
      (error: any) => {
        this.logger.error('WhatsAppBridge', 'Request Error', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response: any) => {
        if (this.config.enableLogging) {
          this.logger.info(
            'WhatsAppBridge',
            `Response: ${response.status} ${response.config.url}`
          );
        }
        return response;
      },
      async (error: any) => {
        const originalRequest = error.config;

        // Retry logic
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          (error.response?.status && error.response.status >= 500)
        ) {
          if (
            this.retryCount < (this.config.retry?.maxRetries || 3) &&
            !originalRequest._retry
          ) {
            this.retryCount++;
            originalRequest._retry = true;

            this.logger.warn(
              'WhatsAppBridge',
              `Retrying request (${this.retryCount}/${this.config.retry?.maxRetries})...`
            );

            await this.delay(
              (this.config.retry?.retryDelay || 1000) * this.retryCount
            );
            return this.httpClient(originalRequest);
          }
        }

        this.retryCount = 0;
        this.logger.error('WhatsAppBridge', 'Response Error', error.message);
        throw new BridgeError(error);
      }
    );
  }

  public configure(config: Partial<WhatsAppBridgeConfig>): void {
    this.config = { ...this.config, ...config };
    this.httpClient = this.createHttpClient();
    this.setupInterceptors();
    this.logger.info('WhatsAppBridge', 'Configuration updated', this.config);
  }

  public getConfig(): WhatsAppBridgeConfig {
    return { ...this.config };
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info(
        'WhatsAppBridge',
        'Initializing WhatsApp Bridge connection...'
      );

      // Test connection to bridge
      const health = await this.checkBridgeHealth();

      if (health.bridge_available) {
        this.connected = true;
        this.logger.info(
          'WhatsAppBridge',
          'Successfully connected to WhatsApp Bridge'
        );
      } else {
        this.connected = false;
        this.logger.error(
          'WhatsAppBridge',
          'WhatsApp Bridge is not available'
        );
      }
    } catch (error) {
      this.connected = false;
      this.logger.error(
        'WhatsAppBridge',
        'Failed to initialize WhatsApp Bridge',
        error
      );
      // Do not re-throw - allow graceful degradation
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info('WhatsAppBridge', 'Disconnected from WhatsApp Bridge');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private async checkBridgeHealth(): Promise<HealthStatus> {
    try {
      // Use the same ping strategy as the legacy client
      await this.httpClient.post('/api/send', {
        recipient: 'ping_test_12345@invalid.whatsapp.net',
        message: 'ping_test',
      });

      this.lastHealthCheck = new Date();

      return {
        status: 'connected',
        bridge_available: true,
        last_check: this.lastHealthCheck.toISOString(),
      };
    } catch (error: any) {
      this.lastHealthCheck = new Date();

      // Analyze error to determine if bridge is available
      if (error instanceof BridgeError) {
        const status = error.code;

        // HTTP errors mean bridge is responding
        if (
          status === 'HTTP_400' ||
          status === 'HTTP_500' ||
          status.startsWith('HTTP_')
        ) {
          return {
            status: 'connected',
            bridge_available: true,
            last_check: this.lastHealthCheck.toISOString(),
          };
        }

        // Network errors mean bridge is not available
        if (
          status === 'NETWORK_ERROR' ||
          status === 'ECONNREFUSED' ||
          status === 'ETIMEDOUT'
        ) {
          return {
            status: 'error',
            bridge_available: false,
            last_check: this.lastHealthCheck.toISOString(),
            error: error.message,
          };
        }
      }

      // Fallback error analysis
      const status = error.response?.status;
      const data = error.response?.data;

      // Error 400 with validation means bridge is working
      if (status === 400) {
        if (typeof data === 'string') {
          if (
            data.includes('Recipient is required') ||
            data.includes('Message or media path is required') ||
            data.includes('Invalid request format')
          ) {
            return {
              status: 'connected',
              bridge_available: true,
              last_check: this.lastHealthCheck.toISOString(),
            };
          }
        }
      }

      // Error 500 means bridge is working but WhatsApp might not be connected
      if (status === 500) {
        return {
          status: 'connected',
          bridge_available: true,
          last_check: this.lastHealthCheck.toISOString(),
        };
      }

      // Connection errors mean bridge is not available
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          status: 'error',
          bridge_available: false,
          last_check: this.lastHealthCheck.toISOString(),
          error: error.message,
        };
      }

      // Other HTTP errors still mean bridge is responding
      if (status >= 400 && status < 600) {
        return {
          status: 'connected',
          bridge_available: true,
          last_check: this.lastHealthCheck.toISOString(),
        };
      }

      return {
        status: 'error',
        bridge_available: false,
        last_check: this.lastHealthCheck.toISOString(),
        error: error.message,
      };
    }
  }

  public async ping(): Promise<boolean> {
    try {
      const health = await this.checkBridgeHealth();
      return health.bridge_available;
    } catch {
      return false;
    }
  }

  public async getBridgeStatus(): Promise<BridgeStatus> {
    try {
      const isConnected = await this.ping();

      return {
        connected: isConnected,
        uptime: 0, // Not available from bridge
        messagesProcessed: 0, // Not available from bridge
        lastActivity: new Date().toISOString(),
      };
    } catch (error) {
      throw new BridgeError(error, 'getBridgeStatus');
    }
  }

  public async isAvailable(): Promise<boolean> {
    try {
      return await this.ping();
    } catch {
      return false;
    }
  }

  public async getHealth(): Promise<HealthStatus> {
    return this.checkBridgeHealth();
  }

  public formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    return phone.replace(/\D/g, '');
  }

  public createJID(phone: string): string {
    const cleanPhone = this.formatPhoneNumber(phone);
    return `${cleanPhone}@s.whatsapp.net`;
  }

  public isGroupJID(jid: string): boolean {
    return jid.includes('@g.us');
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<BridgeResponse<T>> {
    try {
      let response: any;

      if (method === 'POST') {
        response = await this.httpClient.post(endpoint, data);
      } else {
        response = await this.httpClient.get(endpoint);
      }

      return this.handleResponse(response);
    } catch (error: any) {
      throw new BridgeError(error, `${method} ${endpoint}`);
    }
  }

  private handleResponse<T = any>(response: any): BridgeResponse<T> {
    // If response is an object with success, use it directly
    if (typeof response.data === 'object' && 'success' in response.data) {
      return response.data;
    }

    // If response is string "OK" or similar, convert to standard format
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async sendMessage(
    recipient: string,
    message: string,
    mediaPath?: string
  ): Promise<SendMessageResponse> {
    if (!recipient) {
      throw new Error('Recipient is required');
    }

    if (!message && !mediaPath) {
      throw new Error('Message is required');
    }

    if (!this.connected) {
      throw new Error('WhatsApp Bridge is not connected');
    }

    try {
      // Determine if recipient is already a JID or needs formatting
      let formattedRecipient = recipient;
      if (!recipient.includes('@')) {
        formattedRecipient = this.createJID(recipient);
      }

      const requestData: SendMessageRequest = {
        recipient: formattedRecipient,
        message: message || '',
        ...(mediaPath && { media_path: mediaPath }),
      };

      this.logger.info(
        'WhatsAppBridge',
        `Sending message to ${formattedRecipient}`,
        { hasMedia: !!mediaPath, messageLength: message?.length || 0 }
      );

      const bridgeResponse = await this.makeRequest<SendMessageResponse>(
        'POST',
        '/api/send',
        requestData
      );

      // Extract actual response data
      const response: SendMessageResponse = {
        success: bridgeResponse.success,
        message: bridgeResponse.message || 'Message sent',
      };

      if (bridgeResponse.data?.messageId) {
        response.messageId = bridgeResponse.data.messageId;
      }

      if (response.success) {
        this.logger.info('WhatsAppBridge', 'Message sent successfully', {
          recipient: formattedRecipient,
        });
      } else {
        this.logger.error(
          'WhatsAppBridge',
          'Failed to send message',
          response.message
        );
      }

      return response;
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error sending message', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  public async downloadMedia(
    messageId: string,
    chatJID: string
  ): Promise<DownloadMediaResponse> {
    if (!messageId) {
      throw new Error('Message ID is required');
    }

    if (!chatJID) {
      throw new Error('Chat JID is required');
    }

    if (!this.connected) {
      throw new Error('WhatsApp Bridge is not connected');
    }

    try {
      const requestData: DownloadMediaRequest = {
        message_id: messageId,
        chat_jid: chatJID,
      };

      this.logger.info(
        'WhatsAppBridge',
        `Downloading media for message ${messageId}`
      );

      const bridgeResponse = await this.makeRequest<DownloadMediaResponse>(
        'POST',
        '/api/download',
        requestData
      );

      // Extract actual response data
      const response: DownloadMediaResponse = {
        success: bridgeResponse.success,
        message: bridgeResponse.message || 'Media download completed',
      };

      if (bridgeResponse.data?.filename) {
        response.filename = bridgeResponse.data.filename;
      }

      if (bridgeResponse.data?.path) {
        response.path = bridgeResponse.data.path;
      }

      if (response.success) {
        this.logger.info('WhatsAppBridge', 'Media downloaded successfully', {
          filename: response.filename,
          path: response.path,
        });
      } else {
        this.logger.error(
          'WhatsAppBridge',
          'Failed to download media',
          response.message
        );
      }

      return response;
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error downloading media', error);
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  public async sendTextMessage(
    recipient: string,
    message: string
  ): Promise<boolean> {
    try {
      const response = await this.sendMessage(recipient, message);
      return response.success;
    } catch (error) {
      return false;
    }
  }

  public async sendMediaMessage(
    recipient: string,
    mediaPath: string,
    caption?: string
  ): Promise<boolean> {
    try {
      const response = await this.sendMessage(
        recipient,
        caption || '',
        mediaPath
      );
      return response.success;
    } catch (error) {
      return false;
    }
  }

  public getStatus(): {
    connected: boolean;
    config: WhatsAppBridgeConfig;
    lastHealthCheck: string;
  } {
    return {
      connected: this.connected,
      config: this.getConfig(),
      lastHealthCheck: this.lastHealthCheck.toISOString(),
    };
  }

  public async destroy(): Promise<void> {
    try {
      // Clear axios interceptors safely
      if (this.httpClient?.interceptors) {
        if (this.httpClient.interceptors.request && typeof this.httpClient.interceptors.request.clear === 'function') {
          this.httpClient.interceptors.request.clear();
        }
        if (this.httpClient.interceptors.response && typeof this.httpClient.interceptors.response.clear === 'function') {
          this.httpClient.interceptors.response.clear();
        }
      }

      this.connected = false;

      if (this.config.enableLogging) {
        this.logger.info('WhatsAppBridge', 'Bridge client destroyed');
      }
    } catch (error) {
      // Ignore errors during cleanup
      if (this.config.enableLogging) {
        this.logger.warn('WhatsAppBridge', 'Error during destroy cleanup', { error });
      }
    }
  }

  /**
   * Get QR code for WhatsApp connection
   */
  public async getQRCode(): Promise<QRCodeResponse> {
    try {
      this.logger.info('WhatsAppBridge', 'Requesting QR code...');

      const bridgeResponse = await this.makeRequest<QRCodeResponse>(
        'GET',
        '/api/qr'
      );

      const result: QRCodeResponse = {
        success: bridgeResponse.success,
        message: bridgeResponse.message || 'QR code request completed',
      };

      if (bridgeResponse.data?.qr_code) {
        result.qr_code = bridgeResponse.data.qr_code;
      }

      if (result.success) {
        this.logger.info('WhatsAppBridge', 'QR code retrieved successfully');
      } else {
        this.logger.warn(
          'WhatsAppBridge',
          'Failed to get QR code',
          result.message
        );
      }

      return result;
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error getting QR code', error);
      throw new BridgeError(error, 'getQRCode');
    }
  }

  /**
   * Get connection status and user info
   */
  public async getConnectionStatus(): Promise<ConnectionStatusResponse> {
    try {
      this.logger.info('WhatsAppBridge', 'Checking connection status...');

      const bridgeResponse = await this.makeRequest<ConnectionStatusResponse>(
        'GET',
        '/api/status'
      );

      const result: ConnectionStatusResponse = {
        success: bridgeResponse.success,
        connected: bridgeResponse.data?.connected || false,
      };

      if (bridgeResponse.data?.user_info) {
        result.user_info = bridgeResponse.data.user_info;
      }

      if (bridgeResponse.data?.last_seen) {
        result.last_seen = bridgeResponse.data.last_seen;
      }

      if (result.success) {
        this.connected = result.connected;
        this.logger.info('WhatsAppBridge', 'Connection status retrieved', {
          connected: this.connected,
        });
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        'WhatsAppBridge',
        'Error getting connection status',
        error
      );
      this.connected = false;
      throw new BridgeError(error, 'getConnectionStatus');
    }
  }

  /**
   * Get list of chats
   */
  public async getChatList(): Promise<ChatListResponse> {
    if (!this.connected) {
      throw new Error('WhatsApp Bridge is not connected');
    }

    try {
      this.logger.info('WhatsAppBridge', 'Fetching chat list...');

      const bridgeResponse = await this.makeRequest<ChatListResponse>(
        'GET',
        '/api/chats'
      );

      const result: ChatListResponse = {
        success: bridgeResponse.success,
        chats: bridgeResponse.data?.chats || [],
      };

      if (result.success) {
        this.logger.info('WhatsAppBridge', 'Chat list retrieved successfully', {
          chatCount: result.chats.length,
        });
      }

      return result;
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error getting chat list', error);
      throw new BridgeError(error, 'getChatList');
    }
  }

  /**
   * Get message history for a specific chat
   */
  public async getMessageHistory(
    request: MessageHistoryRequest
  ): Promise<MessageHistoryResponse> {
    if (!this.connected) {
      throw new Error('WhatsApp Bridge is not connected');
    }

    if (!request.chat_jid) {
      throw new Error('Chat JID is required');
    }

    try {
      this.logger.info('WhatsAppBridge', 'Fetching message history', {
        chatJid: request.chat_jid,
        limit: request.limit || 50,
      });

      const bridgeResponse = await this.makeRequest<MessageHistoryResponse>(
        'POST',
        '/api/messages/history',
        request
      );

      const result: MessageHistoryResponse = {
        success: bridgeResponse.success,
        messages: bridgeResponse.data?.messages || [],
        total_count: bridgeResponse.data?.total_count || 0,
      };

      if (result.success) {
        this.logger.info(
          'WhatsAppBridge',
          'Message history retrieved successfully',
          {
            messageCount: result.messages.length,
          }
        );
      }

      return result;
    } catch (error: any) {
      this.logger.error(
        'WhatsAppBridge',
        'Error getting message history',
        error
      );
      throw new BridgeError(error, 'getMessageHistory');
    }
  }

  /**
   * Send typing indicator
   */
  public async sendTyping(
    jid: string,
    isTyping: boolean = true
  ): Promise<boolean> {
    if (!this.connected) {
      throw new Error('WhatsApp Bridge is not connected');
    }

    if (!jid) {
      throw new Error('JID is required');
    }

    try {
      this.logger.info('WhatsAppBridge', 'Sending typing indicator', {
        jid,
        isTyping,
      });

      const bridgeResponse = await this.makeRequest<{ success: boolean }>(
        'POST',
        '/api/typing',
        { jid, isTyping }
      );

      return bridgeResponse.success;
    } catch (error: any) {
      this.logger.error(
        'WhatsAppBridge',
        'Error sending typing indicator',
        error
      );
      return false;
    }
  }

  /**
   * Mark message as read
   */
  public async markAsRead(jid: string, messageId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('WhatsApp Bridge is not connected');
    }

    if (!jid || !messageId) {
      throw new Error('JID and message ID are required');
    }

    try {
      this.logger.info('WhatsAppBridge', 'Marking message as read', {
        jid,
        messageId,
      });

      const bridgeResponse = await this.makeRequest<{ success: boolean }>(
        'POST',
        '/api/read',
        { jid, messageId }
      );

      return bridgeResponse.success;
    } catch (error: any) {
      this.logger.error(
        'WhatsAppBridge',
        'Error marking message as read',
        error
      );
      return false;
    }
  }

  /**
   * Disconnect from WhatsApp (via bridge)
   */
  public async disconnectFromBridge(): Promise<boolean> {
    try {
      this.logger.info(
        'WhatsAppBridge',
        'Disconnecting from WhatsApp via bridge...'
      );

      const bridgeResponse = await this.makeRequest<{ success: boolean }>(
        'POST',
        '/api/disconnect'
      );

      if (bridgeResponse.success) {
        this.connected = false;
        this.logger.info('WhatsAppBridge', 'Disconnected successfully');
      }

      return bridgeResponse.success;
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error during disconnection', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Get bridge version and info
   */
  public async getBridgeInfo(): Promise<any> {
    try {
      this.logger.info('WhatsAppBridge', 'Getting bridge info...');

      const bridgeResponse = await this.makeRequest<any>('GET', '/api/info');

      return bridgeResponse.data || { success: bridgeResponse.success };
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error getting bridge info', error);
      throw new BridgeError(error, 'getBridgeInfo');
    }
  }

  /**
   * Health check with comprehensive status
   */
  public async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const status = await this.checkBridgeHealth();
      const responseTime = Date.now() - startTime;

      this.logger.info('WhatsAppBridge', 'Health check completed', {
        status: status.status,
        responseTime: `${responseTime}ms`,
      });

      const healthStatus: HealthStatus = {
        status: status.status,
        bridge_available: status.bridge_available,
        last_check: new Date().toISOString(),
      };

      if (status.error) {
        healthStatus.error = status.error;
      }

      return healthStatus;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.logger.error('WhatsAppBridge', 'Health check failed', {
        error: error.message,
        responseTime: `${responseTime}ms`,
      });

      return {
        status: 'error',
        bridge_available: false,
        last_check: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  public updateConfig(newConfig: Partial<WhatsAppBridgeConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Recreate axios instance if base URL changed
    if (newConfig.baseURL || newConfig.port) {
      this.httpClient = this.createHttpClient();
      this.setupInterceptors();
    }
  }
}

export default WhatsAppBridgeService;

// Extended interfaces for advanced bridge functionality
export interface QRCodeResponse {
  success: boolean;
  qr_code?: string;
  message: string;
}

export interface ConnectionStatusResponse {
  success: boolean;
  connected: boolean;
  user_info?: {
    phone: string;
    name: string;
    jid: string;
  };
  last_seen?: string;
}

export interface ChatListResponse {
  success: boolean;
  chats: Array<{
    jid: string;
    name: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
  }>;
}

export interface MessageHistoryRequest {
  chat_jid: string;
  limit?: number;
  offset?: number;
}

export interface MessageHistoryResponse {
  success: boolean;
  messages: Array<{
    id: string;
    content: string;
    timestamp: string;
    sender: string;
    is_from_me: boolean;
    media_type?: string;
    filename?: string;
  }>;
  total_count: number;
}

export interface ContactInfo {
  success: boolean;
  jid: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  status?: string;
}

export interface GroupInfo {
  success: boolean;
  jid: string;
  name: string;
  description?: string;
  participants: Array<{
    jid: string;
    name: string;
    is_admin: boolean;
  }>;
  created_at?: string;
}
