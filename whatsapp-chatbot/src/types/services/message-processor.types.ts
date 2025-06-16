/**
 * Tipos para el procesador de mensajes del chatbot
 */

/**
 * Configuración del procesador de mensajes
 */
export interface MessageProcessorConfig {
  /** Si debe normalizar el mensaje (trim y lowercase) */
  normalize?: boolean;
  /** Si debe eliminar caracteres especiales */
  removeSpecialChars?: boolean;
  /** Si debe procesar emojis */
  processEmojis?: boolean;
  /** Longitud máxima del mensaje procesado */
  maxLength?: number;
  /** Palabras a filtrar del mensaje */
  filterWords?: string[];
  /** Si debe mantener espacios múltiples */
  preserveMultipleSpaces?: boolean;
}

/**
 * Resultado del procesamiento de un mensaje
 */
export interface ProcessedMessage {
  /** Mensaje original */
  original: string;
  /** Mensaje procesado */
  processed: string;
  /** Longitud del mensaje original */
  originalLength: number;
  /** Longitud del mensaje procesado */
  processedLength: number;
  /** Si el mensaje fue modificado durante el procesamiento */
  wasModified: boolean;
  /** Metadatos del procesamiento */
  metadata: ProcessingMetadata;
}

/**
 * Metadatos del procesamiento
 */
export interface ProcessingMetadata {
  /** Timestamp del procesamiento */
  timestamp: Date;
  /** Operaciones aplicadas durante el procesamiento */
  operationsApplied: ProcessingOperation[];
  /** Tiempo de procesamiento en milisegundos */
  processingTimeMs: number;
  /** Si hubo algún warning durante el procesamiento */
  warnings: string[];
}

/**
 * Operaciones de procesamiento disponibles
 */
export type ProcessingOperation =
  | "normalize"
  | "removeSpecialChars"
  | "processEmojis"
  | "truncate"
  | "filterWords"
  | "normalizeSpaces";

/**
 * Opciones para el procesamiento de un mensaje específico
 */
export interface ProcessMessageOptions {
  /** Configuración específica para este procesamiento */
  config?: Partial<MessageProcessorConfig>;
  /** Si debe retornar metadatos detallados */
  includeMetadata?: boolean;
  /** Si debe validar el mensaje antes de procesar */
  validate?: boolean;
}

/**
 * Estadísticas del procesador de mensajes
 */
export interface MessageProcessorStats {
  /** Total de mensajes procesados */
  totalProcessed: number;
  /** Promedio de tiempo de procesamiento en ms */
  averageProcessingTime: number;
  /** Total de caracteres procesados */
  totalCharactersProcessed: number;
  /** Mensajes que fueron modificados */
  modifiedMessages: number;
  /** Última vez que se procesó un mensaje */
  lastProcessedAt?: Date;
}

/**
 * Filtro personalizado para mensajes
 */
export interface MessageFilter {
  /** Nombre del filtro */
  name: string;
  /** Función que determina si el mensaje pasa el filtro */
  predicate: (message: string) => boolean;
  /** Función que procesa el mensaje si pasa el filtro */
  transform?: (message: string) => string;
}

/**
 * Transformador personalizado para mensajes
 */
export interface MessageTransformer {
  /** Nombre del transformador */
  name: string;
  /** Función de transformación */
  transform: (message: string) => string;
  /** Prioridad del transformador (menor número = mayor prioridad) */
  priority?: number;
}
