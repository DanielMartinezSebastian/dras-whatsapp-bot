/**
 * Configuración para el LogWatcher
 */
export interface LogWatcherConfig {
  /** Ruta al archivo de log a monitorear */
  logFilePath: string;
  /** Intervalo de polling en milisegundos (opcional) */
  pollingInterval?: number;
  /** Tamaño del buffer para lectura en bytes */
  bufferSize?: number;
  /** Si debe leer el archivo existente al iniciar */
  readExistingOnStart?: boolean;
  /** Encoding del archivo (por defecto 'utf8') */
  encoding?: BufferEncoding;
}

/**
 * Estadísticas del LogWatcher
 */
export interface LogWatcherStats {
  /** Ruta del archivo siendo monitoreado */
  filePath: string;
  /** Posición actual en el archivo */
  currentPosition: number;
  /** Número total de líneas procesadas */
  linesProcessed: number;
  /** Hora de inicio del monitoreo */
  startTime: Date | null;
  /** Si está actualmente monitoreando */
  isWatching: boolean;
  /** Tamaño actual del archivo */
  currentFileSize: number;
  /** Última vez que se detectó un cambio */
  lastChangeTime: Date | null;
}

/**
 * Evento emitido cuando se detecta una nueva línea de log
 */
export interface LogEvent {
  /** Contenido de la línea de log */
  line: string;
  /** Número de línea en el archivo */
  lineNumber: number;
  /** Timestamp cuando se detectó la línea */
  timestamp: Date;
  /** Posición en bytes donde empezaba la línea */
  position: number;
}

/**
 * Opciones para procesar líneas de log
 */
export interface LogProcessingOptions {
  /** Si debe filtrar líneas vacías */
  filterEmptyLines?: boolean;
  /** Si debe trimear espacios en blanco */
  trimWhitespace?: boolean;
  /** Patrón regex para filtrar líneas */
  filterPattern?: RegExp;
  /** Función de transformación personalizada */
  transformer?: (line: string) => string | null;
}
