#!/usr/bin/env node

/**
 * Script para generar un cliente TypeScript tipado para el WhatsApp Bridge
 *
 * Este script genera:
 * 1. Cliente TypeScript con métodos tipados
 * 2. Manejadores de error específicos
 * 3. Middleware para logging y retry
 * 4. Tests unitarios básicos
 *
 * Uso: node scripts/generate-bridge-client.js
 */

const fs = require("fs");
const path = require("path");

class BridgeClientGenerator {
  constructor() {
    this.outputDir = path.resolve(__dirname, "../whatsapp-chatbot/src/bridge");
    this.testsDir = path.resolve(
      __dirname,
      "../whatsapp-chatbot/src/__tests__/bridge"
    );
  }

  /**
   * Generar todos los archivos del cliente
   */
  generate() {
    this.ensureDirectories();

    console.log("🔧 Generando cliente TypeScript para WhatsApp Bridge...\n");

    // Generar archivos principales
    this.generateBridgeClient();
    this.generateBridgeTypes();
    this.generateBridgeError();
    this.generateBridgeConfig();
    this.generateBridgeUtils();
    this.generateTests();
    this.generateIndex();
    this.generateDocumentation();

    console.log("✅ Cliente bridge generado exitosamente!");
    console.log(`📁 Archivos generados en: ${this.outputDir}`);
    console.log(`🧪 Tests generados en: ${this.testsDir}`);
  }

  /**
   * Crear directorios necesarios
   */
  ensureDirectories() {
    [this.outputDir, this.testsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generar cliente principal
   */
  generateBridgeClient() {
    const content = `import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { BridgeClientConfig, BridgeResponse, BridgeError, BridgeStatus } from './types';
import { BridgeClientError } from './error';
import { logInfo, logError, logWarn } from '../utils/logger';

/**
 * Cliente TypeScript tipado para WhatsApp Bridge
 * 
 * Proporciona una interfaz completamente tipada para comunicarse
 * con el bridge de WhatsApp escrito en Go.
 */
export class WhatsAppBridgeClient {
  private axios: AxiosInstance;
  private config: BridgeClientConfig;
  private retryCount: number = 0;

  constructor(config: Partial<BridgeClientConfig> = {}) {
    this.config = {
      baseUrl: process.env.BRIDGE_URL || 'http://127.0.0.1:8080',
      timeout: 15000,
      retries: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...config
    };

    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': \`Bearer \${this.config.apiKey}\` })
      }
    });

    this.setupInterceptors();
  }

  /**
   * Configurar interceptores de request/response
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        if (this.config.enableLogging) {
          logInfo(\`🌐 Bridge Request: \${config.method?.toUpperCase()} \${config.url}\`);
        }
        return config;
      },
      (error) => {
        logError(\`❌ Bridge Request Error: \${error.message}\`);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        if (this.config.enableLogging) {
          logInfo(\`✅ Bridge Response: \${response.status} \${response.config.url}\`);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Retry logic
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          (error.response?.status && error.response.status >= 500)
        ) {
          if (this.retryCount < this.config.retries && !originalRequest._retry) {
            this.retryCount++;
            originalRequest._retry = true;

            logWarn(\`⚠️ Retrying request (\${this.retryCount}/\${this.config.retries})...\`);
            
            await this.delay(this.config.retryDelay * this.retryCount);
            return this.axios(originalRequest);
          }
        }

        this.retryCount = 0;
        logError(\`❌ Bridge Response Error: \${error.message}\`);
        throw new BridgeClientError(error);
      }
    );
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(recipient: string, message: string): Promise<BridgeResponse<any>> {
    try {
      const response = await this.axios.post('/api/send', {
        recipient,
        message
      });

      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Enviar archivo multimedia
   */
  async sendMedia(recipient: string, mediaPath: string, message?: string): Promise<BridgeResponse<any>> {
    try {
      const response = await this.axios.post('/api/send', {
        recipient,
        message: message || '',
        media_path: mediaPath
      });

      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'sendMedia');
    }
  }

  /**
   * Descargar multimedia de un mensaje
   */
  async downloadMedia(messageId: string, chatJid: string): Promise<BridgeResponse<{
    filename: string;
    path: string;
  }>> {
    try {
      const response = await this.axios.post('/api/download', {
        message_id: messageId,
        chat_jid: chatJid
      });

      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, 'downloadMedia');
    }
  }

  /**
   * Verificar estado de conexión con WhatsApp
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.axios.post('/api/send', {
        test: 'ping'
      });

      return response.status === 200;
    } catch (error: any) {
      // Si obtenemos "Recipient is required", significa que está funcionando
      if (error.response?.data?.includes?.('Recipient is required')) {
        return true;
      }
      return false;
    }
  }

  /**
   * Obtener estado del bridge
   */
  async getStatus(): Promise<BridgeStatus> {
    try {
      // El bridge Go no tiene endpoint de status específico,
      // pero podemos inferir el estado basado en ping
      const isConnected = await this.ping();
      
      return {
        connected: isConnected,
        uptime: 0, // No disponible desde el bridge
        messagesProcessed: 0, // No disponible desde el bridge
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      throw this.handleError(error, 'getStatus');
    }
  }

  /**
   * Verificar si el bridge está disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.ping();
    } catch {
      return false;
    }
  }

  /**
   * Actualizar configuración del cliente
   */
  updateConfig(newConfig: Partial<BridgeClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recrear instancia de axios si cambió la URL base
    if (newConfig.baseUrl) {
      this.axios = axios.create({
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': \`Bearer \${this.config.apiKey}\` })
        }
      });
      this.setupInterceptors();
    }
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): BridgeClientConfig {
    return { ...this.config };
  }

  /**
   * Manejar respuesta exitosa
   */
  private handleResponse<T = any>(response: AxiosResponse): BridgeResponse<T> {
    // Si la respuesta es un objeto con success, usarlo directamente
    if (typeof response.data === 'object' && 'success' in response.data) {
      return response.data;
    }

    // Si la respuesta es string "OK" o similar, convertir a formato estándar
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Manejar errores
   */
  private handleError(error: any, operation: string): BridgeClientError {
    logError(\`❌ Error en \${operation}: \${error.message}\`);
    return new BridgeClientError(error, operation);
  }

  /**
   * Delay para retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cerrar conexiones y limpiar recursos
   */
  async destroy(): Promise<void> {
    // Axios no requiere cleanup específico, pero podemos limpiar interceptores
    this.axios.interceptors.request.clear();
    this.axios.interceptors.response.clear();
    
    if (this.config.enableLogging) {
      logInfo('🔌 Bridge client destroyed');
    }
  }
}

export default WhatsAppBridgeClient;`;

    fs.writeFileSync(path.join(this.outputDir, "client.ts"), content);
    console.log("✅ Cliente principal generado");
  }

  /**
   * Generar tipos específicos del bridge
   */
  generateBridgeTypes() {
    const content = `/**
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
}`;

    fs.writeFileSync(path.join(this.outputDir, "types.ts"), content);
    console.log("✅ Tipos generados");
  }

  /**
   * Generar clase de error específica
   */
  generateBridgeError() {
    const content = `import { BridgeError } from './types';

/**
 * Error específico del WhatsApp Bridge Client
 */
export class BridgeClientError extends Error implements BridgeError {
  public readonly code: string;
  public readonly details?: any;
  public readonly operation?: string;
  public readonly originalError?: Error;

  constructor(error: any, operation?: string) {
    let message = 'Unknown bridge error';
    let code = 'UNKNOWN_ERROR';
    let details: any;

    if (error.response) {
      // Error de respuesta HTTP
      const status = error.response.status;
      const data = error.response.data;
      
      message = typeof data === 'string' ? data : data?.message || \`HTTP \${status} Error\`;
      code = \`HTTP_\${status}\`;
      details = {
        status,
        data,
        headers: error.response.headers
      };
    } else if (error.request) {
      // Error de red/conexión
      message = 'Network error - unable to reach bridge';
      code = 'NETWORK_ERROR';
      details = {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      };
    } else if (error.message) {
      // Error general
      message = error.message;
      code = error.code || 'GENERAL_ERROR';
      details = error;
    }

    super(message);
    
    this.name = 'BridgeClientError';
    this.code = code;
    this.details = details;
    this.operation = operation;
    this.originalError = error;

    // Mantener stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BridgeClientError);
    }
  }

  /**
   * Verificar si es un error de conexión
   */
  isConnectionError(): boolean {
    return this.code === 'NETWORK_ERROR' || 
           this.code === 'ECONNREFUSED' || 
           this.code === 'ETIMEDOUT';
  }

  /**
   * Verificar si es un error de autenticación
   */
  isAuthError(): boolean {
    return this.code === 'HTTP_401' || this.code === 'HTTP_403';
  }

  /**
   * Verificar si es un error del lado del servidor
   */
  isServerError(): boolean {
    return this.code.startsWith('HTTP_5');
  }

  /**
   * Verificar si es un error del lado del cliente
   */
  isClientError(): boolean {
    return this.code.startsWith('HTTP_4');
  }

  /**
   * Verificar si el error es recuperable (se puede reintentar)
   */
  isRetryable(): boolean {
    return this.isConnectionError() || 
           this.isServerError() || 
           this.code === 'HTTP_429'; // Rate limit
  }

  /**
   * Obtener información detallada del error
   */
  getErrorInfo(): {
    code: string;
    message: string;
    operation?: string;
    retryable: boolean;
    timestamp: string;
  } {
    return {
      code: this.code,
      message: this.message,
      operation: this.operation,
      retryable: this.isRetryable(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Convertir a JSON para logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      details: this.details,
      stack: this.stack,
      timestamp: new Date().toISOString()
    };
  }
}`;

    fs.writeFileSync(path.join(this.outputDir, "error.ts"), content);
    console.log("✅ Clases de error generadas");
  }

  /**
   * Generar configuraciones predefinidas
   */
  generateBridgeConfig() {
    const content = `import { BridgeClientConfig } from './types';

/**
 * Configuraciones predefinidas para el WhatsApp Bridge Client
 */

// Configuración por defecto
export const DEFAULT_CONFIG: BridgeClientConfig = {
  baseUrl: process.env.BRIDGE_URL || 'http://127.0.0.1:8080',
  timeout: 15000,
  retries: 3,
  retryDelay: 1000,
  enableLogging: true
};

// Configuración para desarrollo
export const DEVELOPMENT_CONFIG: BridgeClientConfig = {
  ...DEFAULT_CONFIG,
  timeout: 30000,
  retries: 5,
  retryDelay: 2000,
  enableLogging: true
};

// Configuración para producción
export const PRODUCTION_CONFIG: BridgeClientConfig = {
  ...DEFAULT_CONFIG,
  timeout: 10000,
  retries: 2,
  retryDelay: 500,
  enableLogging: false
};

// Configuración para testing
export const TEST_CONFIG: BridgeClientConfig = {
  ...DEFAULT_CONFIG,
  baseUrl: 'http://localhost:8080',
  timeout: 5000,
  retries: 1,
  retryDelay: 100,
  enableLogging: false
};

/**
 * Obtener configuración basada en el entorno
 */
export function getConfigForEnvironment(env: string = process.env.NODE_ENV || 'development'): BridgeClientConfig {
  switch (env.toLowerCase()) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'test':
    case 'testing':
      return TEST_CONFIG;
    case 'development':
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Validar configuración del cliente
 */
export function validateConfig(config: Partial<BridgeClientConfig>): string[] {
  const errors: string[] = [];

  if (config.baseUrl) {
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('baseUrl must be a valid URL');
    }
  }

  if (config.timeout !== undefined && (config.timeout < 1000 || config.timeout > 300000)) {
    errors.push('timeout must be between 1000 and 300000 ms');
  }

  if (config.retries !== undefined && (config.retries < 0 || config.retries > 10)) {
    errors.push('retries must be between 0 and 10');
  }

  if (config.retryDelay !== undefined && (config.retryDelay < 100 || config.retryDelay > 10000)) {
    errors.push('retryDelay must be between 100 and 10000 ms');
  }

  return errors;
}`;

    fs.writeFileSync(path.join(this.outputDir, "config.ts"), content);
    console.log("✅ Configuraciones generadas");
  }

  /**
   * Generar utilidades del bridge
   */
  generateBridgeUtils() {
    const content = `import { MessageInfo, ChatInfo, MessageType } from './types';

/**
 * Utilidades para trabajar con el WhatsApp Bridge
 */

/**
 * Validar formato de número de teléfono
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Formato básico: solo números, entre 8 y 15 dígitos
  const phoneRegex = /^\\d{8,15}$/;
  return phoneRegex.test(phone.replace(/[^\\d]/g, ''));
}

/**
 * Formatear número de teléfono para WhatsApp
 */
export function formatPhoneNumber(phone: string): string {
  // Remover todos los caracteres no numéricos
  const cleaned = phone.replace(/[^\\d]/g, '');
  
  // Si no tiene código de país, asumir que es nacional (ejemplo: México +52)
  if (cleaned.length === 10) {
    return \`52\${cleaned}\`;
  }
  
  return cleaned;
}

/**
 * Verificar si un JID es de un grupo
 */
export function isGroupJid(jid: string): boolean {
  return jid.includes('@g.us');
}

/**
 * Verificar si un JID es de un contacto individual
 */
export function isContactJid(jid: string): boolean {
  return jid.includes('@s.whatsapp.net');
}

/**
 * Extraer número de teléfono de un JID
 */
export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0];
}

/**
 * Crear JID a partir de número de teléfono
 */
export function createJidFromPhone(phone: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  return \`\${formattedPhone}@s.whatsapp.net\`;
}

/**
 * Determinar tipo de mensaje basado en contenido y metadata
 */
export function getMessageType(message: MessageInfo): MessageType {
  if (message.media_type) {
    switch (message.media_type) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'audio';
      case 'document':
        return 'document';
      default:
        return 'text';
    }
  }
  return 'text';
}

/**
 * Verificar si un mensaje tiene multimedia
 */
export function hasMedia(message: MessageInfo): boolean {
  return !!message.media_type && message.media_type !== 'text';
}

/**
 * Obtener extensión de archivo basada en tipo de media
 */
export function getFileExtension(mediaType: string, filename?: string): string {
  if (filename) {
    const ext = filename.split('.').pop();
    if (ext) return ext.toLowerCase();
  }

  switch (mediaType) {
    case 'image':
      return 'jpg';
    case 'video':
      return 'mp4';
    case 'audio':
      return 'ogg';
    case 'document':
      return 'pdf';
    default:
      return 'bin';
  }
}

/**
 * Verificar si un archivo es una imagen
 */
export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? imageExtensions.includes(ext) : false;
}

/**
 * Verificar si un archivo es un video
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? videoExtensions.includes(ext) : false;
}

/**
 * Verificar si un archivo es audio
 */
export function isAudioFile(filename: string): boolean {
  const audioExtensions = ['ogg', 'mp3', 'wav', 'aac', 'm4a', 'flac'];
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? audioExtensions.includes(ext) : false;
}

/**
 * Formatear timestamp a fecha legible
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return timestamp;
  }
}

/**
 * Calcular tiempo transcurrido desde un timestamp
 */
export function getTimeAgo(timestamp: string): string {
  try {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return \`hace \${diffDays} día\${diffDays > 1 ? 's' : ''}\`;
    } else if (diffHours > 0) {
      return \`hace \${diffHours} hora\${diffHours > 1 ? 's' : ''}\`;
    } else if (diffMinutes > 0) {
      return \`hace \${diffMinutes} minuto\${diffMinutes > 1 ? 's' : ''}\`;
    } else {
      return 'hace un momento';
    }
  } catch {
    return 'tiempo desconocido';
  }
}

/**
 * Limpiar texto de mensaje (remover caracteres especiales, etc.)
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/[\\x00-\\x1F\\x7F]/g, '') // Remover caracteres de control
    .replace(/\\s+/g, ' ') // Normalizar espacios
    .trim();
}

/**
 * Truncar mensaje a longitud específica
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Verificar si un mensaje es un comando (empieza con /)
 */
export function isCommand(message: string): boolean {
  return message.trim().startsWith('/');
}

/**
 * Extraer comando y argumentos de un mensaje
 */
export function parseCommand(message: string): { command: string; args: string[] } {
  const trimmed = message.trim();
  if (!trimmed.startsWith('/')) {
    return { command: '', args: [] };
  }

  const parts = trimmed.substring(1).split(/\\s+/);
  const command = parts[0] || '';
  const args = parts.slice(1);

  return { command, args };
}`;

    fs.writeFileSync(path.join(this.outputDir, "utils.ts"), content);
    console.log("✅ Utilidades generadas");
  }

  /**
   * Generar tests unitarios
   */
  generateTests() {
    const content = `import { WhatsAppBridgeClient } from '../client';
import { BridgeClientError } from '../error';
import { DEFAULT_CONFIG, validateConfig } from '../config';
import * as utils from '../utils';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WhatsAppBridgeClient', () => {
  let client: WhatsAppBridgeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create
    mockedAxios.create = jest.fn(() => ({
      ...mockedAxios,
      interceptors: {
        request: { use: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), clear: jest.fn() }
      }
    }));

    client = new WhatsAppBridgeClient();
  });

  afterEach(async () => {
    await client.destroy();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe(DEFAULT_CONFIG.baseUrl);
      expect(config.timeout).toBe(DEFAULT_CONFIG.timeout);
    });

    it('should accept custom config', () => {
      const customClient = new WhatsAppBridgeClient({
        baseUrl: 'http://custom:9090',
        timeout: 5000
      });

      const config = customClient.getConfig();
      expect(config.baseUrl).toBe('http://custom:9090');
      expect(config.timeout).toBe(5000);
    });
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const mockResponse = {
        data: { success: true, message: 'Message sent' }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await client.sendMessage('1234567890', 'Hello World');

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/send', {
        recipient: '1234567890',
        message: 'Hello World'
      });
    });

    it('should handle send message error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(client.sendMessage('1234567890', 'Hello'))
        .rejects.toThrow(BridgeClientError);
    });
  });

  describe('sendMedia', () => {
    it('should send media message successfully', async () => {
      const mockResponse = {
        data: { success: true, message: 'Media sent' }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await client.sendMedia('1234567890', '/path/to/image.jpg', 'Check this out');

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/send', {
        recipient: '1234567890',
        message: 'Check this out',
        media_path: '/path/to/image.jpg'
      });
    });
  });

  describe('downloadMedia', () => {
    it('should download media successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          filename: 'image.jpg',
          path: '/downloads/image.jpg'
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await client.downloadMedia('msg123', 'chat456@s.whatsapp.net');

      expect(result.success).toBe(true);
      expect(result.data?.filename).toBe('image.jpg');
    });
  });

  describe('ping', () => {
    it('should return true when bridge is available', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const isAvailable = await client.ping();

      expect(isAvailable).toBe(true);
    });

    it('should return true when bridge responds with "Recipient is required"', async () => {
      const error = new Error('Bad Request');
      (error as any).response = {
        data: 'Recipient is required'
      };
      mockedAxios.post.mockRejectedValue(error);

      const isAvailable = await client.ping();

      expect(isAvailable).toBe(true);
    });

    it('should return false when bridge is not available', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Connection refused'));

      const isAvailable = await client.ping();

      expect(isAvailable).toBe(false);
    });
  });
});

describe('BridgeClientError', () => {
  it('should create error from axios error', () => {
    const axiosError = {
      response: {
        status: 404,
        data: 'Not found'
      }
    };

    const error = new BridgeClientError(axiosError, 'testOperation');

    expect(error.code).toBe('HTTP_404');
    expect(error.message).toBe('Not found');
    expect(error.operation).toBe('testOperation');
  });

  it('should identify connection errors', () => {
    const connectionError = {
      code: 'ECONNREFUSED'
    };

    const error = new BridgeClientError(connectionError);

    expect(error.isConnectionError()).toBe(true);
    expect(error.isRetryable()).toBe(true);
  });
});

describe('Config validation', () => {
  it('should validate valid config', () => {
    const errors = validateConfig({
      baseUrl: 'http://localhost:8080',
      timeout: 5000,
      retries: 2
    });

    expect(errors).toHaveLength(0);
  });

  it('should detect invalid URL', () => {
    const errors = validateConfig({
      baseUrl: 'invalid-url'
    });

    expect(errors).toContain('baseUrl must be a valid URL');
  });

  it('should detect invalid timeout', () => {
    const errors = validateConfig({
      timeout: 500 // Too low
    });

    expect(errors).toContain('timeout must be between 1000 and 300000 ms');
  });
});

describe('Utils', () => {
  describe('isValidPhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(utils.isValidPhoneNumber('1234567890')).toBe(true);
      expect(utils.isValidPhoneNumber('52123456789')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(utils.isValidPhoneNumber('123')).toBe(false);
      expect(utils.isValidPhoneNumber('abc123')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone number correctly', () => {
      expect(utils.formatPhoneNumber('1234567890')).toBe('521234567890');
      expect(utils.formatPhoneNumber('+52 123 456 7890')).toBe('5212345567890');
    });
  });

  describe('JID utilities', () => {
    it('should identify group JIDs', () => {
      expect(utils.isGroupJid('123456@g.us')).toBe(true);
      expect(utils.isGroupJid('123456@s.whatsapp.net')).toBe(false);
    });

    it('should create JID from phone', () => {
      expect(utils.createJidFromPhone('1234567890')).toBe('521234567890@s.whatsapp.net');
    });

    it('should extract phone from JID', () => {
      expect(utils.extractPhoneFromJid('1234567890@s.whatsapp.net')).toBe('1234567890');
    });
  });

  describe('parseCommand', () => {
    it('should parse commands correctly', () => {
      const result = utils.parseCommand('/help arg1 arg2');
      expect(result.command).toBe('help');
      expect(result.args).toEqual(['arg1', 'arg2']);
    });

    it('should handle non-commands', () => {
      const result = utils.parseCommand('hello world');
      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });
  });
});`;

    fs.writeFileSync(
      path.join(this.testsDir, "bridge-client.test.ts"),
      content
    );
    console.log("✅ Tests generados");
  }

  /**
   * Generar archivo index para exportaciones
   */
  generateIndex() {
    const content = `/**
 * WhatsApp Bridge Client
 * 
 * Cliente TypeScript completamente tipado para comunicarse
 * con el WhatsApp Bridge escrito en Go.
 */

// Cliente principal
export { WhatsAppBridgeClient, default } from './client';

// Tipos
export type {
  BridgeClientConfig,
  BridgeResponse,
  BridgeStatus,
  BridgeError,
  SendMessageRequest,
  SendMessageResponse,
  DownloadMediaRequest,
  DownloadMediaResponse,
  MessageInfo,
  ChatInfo,
  MessageType,
  ChatType,
  MessageFilters
} from './types';

// Error handling
export { BridgeClientError } from './error';

// Configuraciones
export {
  DEFAULT_CONFIG,
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  TEST_CONFIG,
  getConfigForEnvironment,
  validateConfig
} from './config';

// Utilidades
export * as BridgeUtils from './utils';

// Re-export default para facilitar imports
export { WhatsAppBridgeClient as default } from './client';`;

    fs.writeFileSync(path.join(this.outputDir, "index.ts"), content);
    console.log("✅ Archivo index generado");
  }

  /**
   * Generar documentación
   */
  generateDocumentation() {
    const content = `# WhatsApp Bridge Client

Cliente TypeScript completamente tipado para comunicarse con el WhatsApp Bridge escrito en Go.

## Instalación

\`\`\`bash
# El cliente está incluido en el proyecto
# No requiere instalación adicional
\`\`\`

## Uso Básico

\`\`\`typescript
import { WhatsAppBridgeClient } from '../bridge';

// Crear cliente con configuración por defecto
const client = new WhatsAppBridgeClient();

// O con configuración personalizada
const client = new WhatsAppBridgeClient({
  baseUrl: 'http://localhost:8080',
  timeout: 10000,
  retries: 2
});

// Verificar disponibilidad
const isAvailable = await client.isAvailable();
console.log('Bridge disponible:', isAvailable);

// Enviar mensaje de texto
const result = await client.sendMessage('1234567890', 'Hola mundo!');
console.log('Mensaje enviado:', result.success);

// Enviar imagen
const mediaResult = await client.sendMedia(
  '1234567890', 
  '/path/to/image.jpg', 
  'Mira esta imagen'
);

// Descargar multimedia
const download = await client.downloadMedia('messageId', 'chatJid');
console.log('Archivo descargado en:', download.data?.path);
\`\`\`

## API Reference

### WhatsAppBridgeClient

#### Constructor

\`\`\`typescript
new WhatsAppBridgeClient(config?: Partial<BridgeClientConfig>)
\`\`\`

#### Métodos

##### sendMessage(recipient, message)
Envía un mensaje de texto.

\`\`\`typescript
await client.sendMessage('1234567890', 'Hola mundo!');
\`\`\`

##### sendMedia(recipient, mediaPath, message?)
Envía un archivo multimedia con mensaje opcional.

\`\`\`typescript
await client.sendMedia('1234567890', '/path/to/file.jpg', 'Descripción');
\`\`\`

##### downloadMedia(messageId, chatJid)
Descarga multimedia de un mensaje específico.

\`\`\`typescript
const result = await client.downloadMedia('msgId', 'chatJid');
console.log('Archivo:', result.data?.path);
\`\`\`

##### ping()
Verifica si el bridge está disponible.

\`\`\`typescript
const available = await client.ping();
\`\`\`

##### getStatus()
Obtiene el estado actual del bridge.

\`\`\`typescript
const status = await client.getStatus();
console.log('Conectado:', status.connected);
\`\`\`

## Configuración

### Configuraciones Predefinidas

\`\`\`typescript
import { 
  DEFAULT_CONFIG, 
  DEVELOPMENT_CONFIG, 
  PRODUCTION_CONFIG,
  getConfigForEnvironment 
} from '../bridge';

// Usar configuración por entorno
const config = getConfigForEnvironment(process.env.NODE_ENV);
const client = new WhatsAppBridgeClient(config);
\`\`\`

### Opciones de Configuración

\`\`\`typescript
interface BridgeClientConfig {
  baseUrl: string;        // URL del bridge (default: http://127.0.0.1:8080)
  timeout: number;        // Timeout en ms (default: 15000)
  retries: number;        // Número de reintentos (default: 3)
  retryDelay: number;     // Delay entre reintentos (default: 1000)
  apiKey?: string;        // API key para autenticación
  enableLogging: boolean; // Habilitar logs (default: true)
}
\`\`\`

## Manejo de Errores

\`\`\`typescript
import { BridgeClientError } from '../bridge';

try {
  await client.sendMessage('invalid', 'test');
} catch (error) {
  if (error instanceof BridgeClientError) {
    console.log('Código de error:', error.code);
    console.log('Es recuperable:', error.isRetryable());
    console.log('Es error de conexión:', error.isConnectionError());
  }
}
\`\`\`

## Utilidades

El cliente incluye utilidades para trabajar con números de teléfono, JIDs y mensajes:

\`\`\`typescript
import { BridgeUtils } from '../bridge';

// Validar número de teléfono
const isValid = BridgeUtils.isValidPhoneNumber('1234567890');

// Formatear número
const formatted = BridgeUtils.formatPhoneNumber('+52 123 456 7890');

// Crear JID
const jid = BridgeUtils.createJidFromPhone('1234567890');

// Verificar tipo de archivo
const isImage = BridgeUtils.isImageFile('photo.jpg');

// Parsear comandos
const { command, args } = BridgeUtils.parseCommand('/help comando');
\`\`\`

## Testing

\`\`\`bash
# Ejecutar tests del bridge client
npm test -- bridge-client.test.ts
\`\`\`

## Logging

El cliente incluye logging automático de requests y responses. Para deshabilitarlo:

\`\`\`typescript
const client = new WhatsAppBridgeClient({
  enableLogging: false
});
\`\`\`

## Cleanup

Siempre limpia los recursos al finalizar:

\`\`\`typescript
// Al finalizar la aplicación
await client.destroy();
\`\`\``;

    fs.writeFileSync(path.join(this.outputDir, "README.md"), content);
    console.log("✅ Documentación generada");
  }
}

// Función principal
function main() {
  console.log("🚀 Generando cliente TypeScript para WhatsApp Bridge...\n");

  try {
    const generator = new BridgeClientGenerator();
    generator.generate();

    console.log("\n🎉 ¡Cliente bridge generado exitosamente!");
    console.log("\n📋 Próximos pasos:");
    console.log("  1. Revisar los archivos generados");
    console.log(
      "  2. Instalar dependencias si es necesario: npm install axios"
    );
    console.log("  3. Ejecutar tests: npm test bridge-client.test.ts");
    console.log("  4. Integrar el cliente en tu aplicación");
    console.log(
      "  5. Actualizar imports existentes para usar el nuevo cliente"
    );
  } catch (error) {
    console.error("❌ Error generando cliente:", error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = BridgeClientGenerator;
