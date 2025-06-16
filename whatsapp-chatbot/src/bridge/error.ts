import { BridgeError } from './types';

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
      
      message = typeof data === 'string' ? data : data?.message || `HTTP ${status} Error`;
      code = `HTTP_${status}`;
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
}