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
        retryDelay: 1000
      },
      enableLogging: true
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
        'Accept': 'application/json',
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        })
      }
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config: any) => {
        if (this.config.enableLogging) {
          this.logger.info('WhatsAppBridge', `Request: ${config.method?.toUpperCase()} ${config.url}`);
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
          this.logger.info('WhatsAppBridge', `Response: ${response.status} ${response.config.url}`);
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

            await this.delay((this.config.retry?.retryDelay || 1000) * this.retryCount);
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
      this.logger.info('WhatsAppBridge', 'Initializing WhatsApp Bridge connection...');
      
      // Test connection to bridge
      const health = await this.checkBridgeHealth();
      
      if (health.bridge_available) {
        this.connected = true;
        this.logger.info('WhatsAppBridge', 'Successfully connected to WhatsApp Bridge');
      } else {
        throw new Error('WhatsApp Bridge is not available');
      }
    } catch (error) {
      this.connected = false;
      this.logger.error('WhatsAppBridge', 'Failed to initialize WhatsApp Bridge', error);
      throw error;
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
        message: 'ping_test'
      });
      
      this.lastHealthCheck = new Date();
      
      return {
        status: 'connected',
        bridge_available: true,
        last_check: this.lastHealthCheck.toISOString()
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
            last_check: this.lastHealthCheck.toISOString()
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
            error: error.message
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
              last_check: this.lastHealthCheck.toISOString()
            };
          }
        }
      }
      
      // Error 500 means bridge is working but WhatsApp might not be connected
      if (status === 500) {
        return {
          status: 'connected',
          bridge_available: true,
          last_check: this.lastHealthCheck.toISOString()
        };
      }
      
      // Connection errors mean bridge is not available
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          status: 'error',
          bridge_available: false,
          last_check: this.lastHealthCheck.toISOString(),
          error: error.message
        };
      }
      
      // Other HTTP errors still mean bridge is responding
      if (status >= 400 && status < 600) {
        return {
          status: 'connected',
          bridge_available: true,
          last_check: this.lastHealthCheck.toISOString()
        };
      }
      
      return {
        status: 'error',
        bridge_available: false,
        last_check: this.lastHealthCheck.toISOString(),
        error: error.message
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
        lastActivity: new Date().toISOString()
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
      timestamp: new Date().toISOString()
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
        ...(mediaPath && { media_path: mediaPath })
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
        message: bridgeResponse.message || 'Message sent'
      };

      if (bridgeResponse.data?.messageId) {
        response.messageId = bridgeResponse.data.messageId;
      }

      if (response.success) {
        this.logger.info('WhatsAppBridge', 'Message sent successfully', {
          recipient: formattedRecipient
        });
      } else {
        this.logger.error('WhatsAppBridge', 'Failed to send message', response.message);
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
        chat_jid: chatJID
      };

      this.logger.info('WhatsAppBridge', `Downloading media for message ${messageId}`);

      const bridgeResponse = await this.makeRequest<DownloadMediaResponse>(
        'POST',
        '/api/download',
        requestData
      );

      // Extract actual response data
      const response: DownloadMediaResponse = {
        success: bridgeResponse.success,
        message: bridgeResponse.message || 'Media download completed'
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
          path: response.path
        });
      } else {
        this.logger.error('WhatsAppBridge', 'Failed to download media', response.message);
      }

      return response;
    } catch (error: any) {
      this.logger.error('WhatsAppBridge', 'Error downloading media', error);
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  public async sendTextMessage(recipient: string, message: string): Promise<boolean> {
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
      const response = await this.sendMessage(recipient, caption || '', mediaPath);
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
      lastHealthCheck: this.lastHealthCheck.toISOString()
    };
  }

  public async destroy(): Promise<void> {
    // Clear axios interceptors
    this.httpClient.interceptors.request.clear();
    this.httpClient.interceptors.response.clear();
    
    this.connected = false;
    
    if (this.config.enableLogging) {
      this.logger.info('WhatsAppBridge', 'Bridge client destroyed');
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
