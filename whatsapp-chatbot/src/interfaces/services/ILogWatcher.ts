import { EventEmitter } from "events";
import {
  LogWatcherConfig,
  LogWatcherStats,
  LogEvent,
  LogProcessingOptions,
} from "../../types/services/log-watcher.types";

/**
 * Interfaz para el servicio de monitoreo de archivos de log
 */
export interface ILogWatcher extends EventEmitter {
  /**
   * Configuración actual del LogWatcher
   */
  readonly config: LogWatcherConfig;

  /**
   * Si está actualmente monitoreando el archivo
   */
  readonly isWatching: boolean;

  /**
   * Posición actual en el archivo
   */
  readonly currentPosition: number;

  /**
   * Inicia el monitoreo del archivo de log
   * @param options Opciones de procesamiento
   */
  startWatching(options?: LogProcessingOptions): Promise<void>;

  /**
   * Detiene el monitoreo del archivo de log
   */
  stopWatching(): Promise<void>;

  /**
   * Lee nuevas líneas desde la última posición
   * @param options Opciones de procesamiento
   */
  readNewLines(options?: LogProcessingOptions): Promise<LogEvent[]>;

  /**
   * Lee todo el archivo desde el inicio
   * @param options Opciones de procesamiento
   */
  readFullFile(options?: LogProcessingOptions): Promise<LogEvent[]>;

  /**
   * Actualiza la configuración del LogWatcher
   * @param newConfig Nueva configuración
   */
  updateConfig(newConfig: Partial<LogWatcherConfig>): void;

  /**
   * Obtiene estadísticas del LogWatcher
   * @returns Estadísticas actuales
   */
  getStats(): LogWatcherStats;

  /**
   * Verifica si el archivo existe y es accesible
   * @returns True si el archivo es válido
   */
  isFileValid(): Promise<boolean>;

  /**
   * Resetea la posición de lectura al inicio del archivo
   */
  resetPosition(): void;

  /**
   * Establece la posición de lectura en el archivo
   * @param position Nueva posición en bytes
   */
  setPosition(position: number): void;

  /**
   * Eventos emitidos por el LogWatcher:
   * - 'newLog': Nueva línea de log detectada
   * - 'error': Error durante el monitoreo
   * - 'started': Monitoreo iniciado
   * - 'stopped': Monitoreo detenido
   * - 'fileChanged': Archivo modificado
   */

  // EventEmitter events
  on(event: "newLog", listener: (logEvent: LogEvent) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "started", listener: () => void): this;
  on(event: "stopped", listener: () => void): this;
  on(event: "fileChanged", listener: (stats: LogWatcherStats) => void): this;

  emit(event: "newLog", logEvent: LogEvent): boolean;
  emit(event: "error", error: Error): boolean;
  emit(event: "started"): boolean;
  emit(event: "stopped"): boolean;
  emit(event: "fileChanged", stats: LogWatcherStats): boolean;
}
