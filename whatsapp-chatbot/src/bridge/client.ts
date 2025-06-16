import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import {
  BridgeClientConfig,
  BridgeResponse,
  BridgeError,
  BridgeStatus,
} from "./types";
import { BridgeClientError } from "./error";
import { logInfo, logError, logWarn } from "../utils/logger";

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
      baseUrl: process.env.BRIDGE_URL || "http://127.0.0.1:8080",
      timeout: 15000,
      retries: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...config,
    };

    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
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
          logInfo(
            `🌐 Bridge Request: ${config.method?.toUpperCase()} ${config.url}`
          );
        }
        return config;
      },
      (error) => {
        logError(`❌ Bridge Request Error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        if (this.config.enableLogging) {
          logInfo(
            `✅ Bridge Response: ${response.status} ${response.config.url}`
          );
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Retry logic
        if (
          error.code === "ECONNREFUSED" ||
          error.code === "ETIMEDOUT" ||
          (error.response?.status && error.response.status >= 500)
        ) {
          if (
            this.retryCount < this.config.retries &&
            !originalRequest._retry
          ) {
            this.retryCount++;
            originalRequest._retry = true;

            logWarn(
              `⚠️ Retrying request (${this.retryCount}/${this.config.retries})...`
            );

            await this.delay(this.config.retryDelay * this.retryCount);
            return this.axios(originalRequest);
          }
        }

        this.retryCount = 0;
        logError(`❌ Bridge Response Error: ${error.message}`);
        throw new BridgeClientError(error);
      }
    );
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(
    recipient: string,
    message: string
  ): Promise<BridgeResponse<any>> {
    try {
      const response = await this.axios.post("/api/send", {
        recipient,
        message,
      });

      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, "sendMessage");
    }
  }

  /**
   * Enviar archivo multimedia
   */
  async sendMedia(
    recipient: string,
    mediaPath: string,
    message?: string
  ): Promise<BridgeResponse<any>> {
    try {
      const response = await this.axios.post("/api/send", {
        recipient,
        message: message || "",
        media_path: mediaPath,
      });

      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, "sendMedia");
    }
  }

  /**
   * Descargar multimedia de un mensaje
   */
  async downloadMedia(
    messageId: string,
    chatJid: string
  ): Promise<
    BridgeResponse<{
      filename: string;
      path: string;
    }>
  > {
    try {
      const response = await this.axios.post("/api/download", {
        message_id: messageId,
        chat_jid: chatJid,
      });

      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error, "downloadMedia");
    }
  }

  /**
   * Verificar estado de conexión con WhatsApp
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.axios.post("/api/send", {
        recipient: "ping_test_12345@invalid.whatsapp.net", // Número inválido para ping
        message: "ping_test", // Mensaje de test
      });

      // Si llega aquí, el bridge procesó la request (aunque el envío falle)
      return true;
    } catch (error: any) {
      // Si es BridgeClientError, extraer información del error original
      if (error instanceof BridgeClientError) {
        const status = error.code; // El código ya está formateado como HTTP_500, etc.

        // Error HTTP indica que el bridge está respondiendo
        if (
          status === "HTTP_400" ||
          status === "HTTP_500" ||
          status.startsWith("HTTP_")
        ) {
          return true;
        }

        // Errores de red - bridge no disponible
        if (
          status === "NETWORK_ERROR" ||
          status === "ECONNREFUSED" ||
          status === "ETIMEDOUT"
        ) {
          return false;
        }
      }

      // Fallback: analizar error original si no es BridgeClientError
      const status = error.response?.status;
      const data = error.response?.data;

      // Error 400 con validación significa que el bridge está funcionando
      if (status === 400) {
        if (typeof data === "string") {
          // Estos errores indican que el bridge está operativo
          if (
            data.includes("Recipient is required") ||
            data.includes("Message or media path is required") ||
            data.includes("Invalid request format")
          ) {
            return true;
          }
        }
      }

      // Error 500 puede significar que el bridge está funcionando pero WhatsApp no conectado
      if (status === 500) {
        return true; // El bridge responde, aunque WhatsApp no esté conectado
      }

      // Errores de conexión (red) - bridge no disponible
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        return false;
      }

      // Otros errores HTTP pero con respuesta = bridge funcionando
      if (status >= 400 && status < 600) {
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
        lastActivity: new Date().toISOString(),
      };
    } catch (error) {
      throw this.handleError(error, "getStatus");
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
          "Content-Type": "application/json",
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
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
    if (typeof response.data === "object" && "success" in response.data) {
      return response.data;
    }

    // Si la respuesta es string "OK" o similar, convertir a formato estándar
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manejar errores
   */
  private handleError(error: any, operation: string): BridgeClientError {
    logError(`❌ Error en ${operation}: ${error.message}`);
    return new BridgeClientError(error, operation);
  }

  /**
   * Delay para retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cerrar conexiones y limpiar recursos
   */
  async destroy(): Promise<void> {
    // Axios no requiere cleanup específico, pero podemos limpiar interceptores
    this.axios.interceptors.request.clear();
    this.axios.interceptors.response.clear();

    if (this.config.enableLogging) {
      logInfo("🔌 Bridge client destroyed");
    }
  }
}

export default WhatsAppBridgeClient;
