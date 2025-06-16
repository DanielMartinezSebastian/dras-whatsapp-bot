import {
  WhatsAppMessage,
  User,
  BotMessageClassification,
  ProcessingResult,
  BotProcessorConfig,
  BotProcessorStats,
} from "../../types/core";

export interface IBotProcessor {
  /**
   * Procesa un mensaje entrante y devuelve el resultado
   */
  processMessage(
    message: WhatsAppMessage,
    user: User
  ): Promise<ProcessingResult>;

  /**
   * Inicializa los servicios del procesador
   */
  initializeServices(): Promise<boolean>;

  /**
   * Enruta un mensaje según su clasificación
   */
  routeMessage(
    message: WhatsAppMessage,
    classification: BotMessageClassification
  ): Promise<void>;

  /**
   * Verifica si el bot está listo para procesar mensajes
   */
  isReady(): boolean;

  /**
   * Espera a que la inicialización se complete
   */
  waitForInitialization(): Promise<void>;

  /**
   * Obtiene las estadísticas del procesador
   */
  getStats(): BotProcessorStats;

  /**
   * Maneja errores durante el procesamiento
   */
  handleError(message: WhatsAppMessage, error: Error): Promise<void>;

  /**
   * Cierra y limpia recursos del procesador
   */
  shutdown(): Promise<void>;

  /**
   * Actualiza la configuración del procesador
   */
  updateConfig(config: Partial<BotProcessorConfig>): void;

  /**
   * Obtiene la configuración actual del procesador
   */
  getConfig(): BotProcessorConfig;
}
