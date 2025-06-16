import { BridgeClientConfig } from './types';

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
}