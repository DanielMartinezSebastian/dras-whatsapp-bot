import {
  MessageProcessorConfig,
  ProcessedMessage,
  ProcessMessageOptions,
  MessageProcessorStats,
  MessageFilter,
  MessageTransformer,
} from "../../types/services/message-processor.types";

/**
 * Interfaz para el procesador de mensajes del chatbot
 */
export interface IMessageProcessor {
  /**
   * Procesar un mensaje de texto
   * @param message - El mensaje a procesar
   * @param options - Opciones de procesamiento
   * @returns El mensaje procesado
   */
  processMessage(
    message: string,
    options?: ProcessMessageOptions
  ): Promise<ProcessedMessage>;

  /**
   * Procesar múltiples mensajes de forma batch
   * @param messages - Array de mensajes a procesar
   * @param options - Opciones de procesamiento
   * @returns Array de mensajes procesados
   */
  processMessagesBatch(
    messages: string[],
    options?: ProcessMessageOptions
  ): Promise<ProcessedMessage[]>;

  /**
   * Validar si un mensaje es válido para procesamiento
   * @param message - El mensaje a validar
   * @returns Si el mensaje es válido
   */
  validateMessage(message: string): boolean;

  /**
   * Obtener configuración actual del procesador
   * @returns La configuración actual
   */
  getConfig(): MessageProcessorConfig;

  /**
   * Actualizar configuración del procesador
   * @param config - Nueva configuración
   */
  updateConfig(config: Partial<MessageProcessorConfig>): void;

  /**
   * Agregar un filtro personalizado
   * @param filter - El filtro a agregar
   */
  addFilter(filter: MessageFilter): void;

  /**
   * Remover un filtro por nombre
   * @param filterName - Nombre del filtro a remover
   */
  removeFilter(filterName: string): void;

  /**
   * Agregar un transformador personalizado
   * @param transformer - El transformador a agregar
   */
  addTransformer(transformer: MessageTransformer): void;

  /**
   * Remover un transformador por nombre
   * @param transformerName - Nombre del transformador a remover
   */
  removeTransformer(transformerName: string): void;

  /**
   * Obtener estadísticas del procesador
   * @returns Las estadísticas actuales
   */
  getStats(): MessageProcessorStats;

  /**
   * Resetear estadísticas del procesador
   */
  resetStats(): void;

  /**
   * Limpiar recursos del procesador
   */
  cleanup(): void;
}
