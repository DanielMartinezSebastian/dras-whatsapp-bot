import * as fs from "fs";
import { EventEmitter } from "events";
import { logInfo, logError } from "../utils/logger";
import { ILogWatcher } from "../interfaces/services/ILogWatcher";
import {
  LogWatcherConfig,
  LogWatcherStats,
  LogEvent,
  LogProcessingOptions,
} from "../types/services/log-watcher.types";

/**
 * Servicio para monitorear archivos de log en tiempo real
 * Detecta cambios en archivos y emite eventos con nuevas líneas
 */
export class LogWatcher extends EventEmitter implements ILogWatcher {
  public readonly config: LogWatcherConfig;

  private _isWatching: boolean = false;
  private _currentPosition: number = 0;
  private _linesProcessed: number = 0;
  private _startTime: Date | null = null;
  private _lastChangeTime: Date | null = null;
  private fileDescriptor: number | null = null;
  private watchInterval?: NodeJS.Timeout;
  private abortController?: AbortController;

  constructor(config: LogWatcherConfig) {
    super();

    this.config = {
      pollingInterval: 1000, // 1 segundo por defecto
      bufferSize: 64 * 1024, // 64KB por defecto
      readExistingOnStart: false,
      encoding: "utf8",
      ...config,
    };

    // Validar configuración
    if (!this.config.logFilePath) {
      throw new Error("logFilePath es requerido en la configuración");
    }
  }

  get isWatching(): boolean {
    return this._isWatching;
  }

  get currentPosition(): number {
    return this._currentPosition;
  }

  /**
   * Inicia el monitoreo del archivo de log
   */
  async startWatching(options?: LogProcessingOptions): Promise<void> {
    if (this._isWatching) {
      throw new Error("LogWatcher ya está monitoreando");
    }

    try {
      // Verificar que el archivo existe
      const isValid = await this.isFileValid();
      if (!isValid) {
        throw new Error(
          `Archivo de log no existe o no es accesible: ${this.config.logFilePath}`
        );
      }

      // Abrir el archivo
      this.fileDescriptor = fs.openSync(this.config.logFilePath, "r");

      // Si se debe leer el archivo existente al inicio
      if (this.config.readExistingOnStart) {
        const existingEvents = await this.readFullFile(options);
        // Emitir eventos para el contenido existente
        for (const event of existingEvents) {
          this.emit("newLog", event);
        }
      } else {
        // Posicionarse al final del archivo
        const stats = fs.fstatSync(this.fileDescriptor);
        this._currentPosition = stats.size;
      }

      // Configurar el controlador de cancelación
      this.abortController = new AbortController();

      // Iniciar el polling
      this.startPolling(options);

      this._isWatching = true;
      this._startTime = new Date();

      logInfo(`LogWatcher iniciado para: ${this.config.logFilePath}`);
      this.emit("started");
    } catch (error) {
      logError(`Error iniciando LogWatcher: ${(error as Error).message}`);
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Detiene el monitoreo del archivo de log
   */
  async stopWatching(): Promise<void> {
    if (!this._isWatching) {
      return;
    }

    try {
      // Cancelar el polling
      if (this.abortController) {
        this.abortController.abort();
      }

      // Limpiar el intervalo
      if (this.watchInterval) {
        clearInterval(this.watchInterval);
        this.watchInterval = undefined;
      }

      // Cerrar el archivo
      if (this.fileDescriptor !== null) {
        fs.closeSync(this.fileDescriptor);
        this.fileDescriptor = null;
      }

      this._isWatching = false;

      logInfo(`LogWatcher detenido para: ${this.config.logFilePath}`);
      this.emit("stopped");
    } catch (error) {
      logError(`Error deteniendo LogWatcher: ${(error as Error).message}`);
      this.emit("error", error as Error);
    }
  }

  /**
   * Lee nuevas líneas desde la última posición
   */
  async readNewLines(options?: LogProcessingOptions): Promise<LogEvent[]> {
    if (this.fileDescriptor === null) {
      throw new Error("Archivo no está abierto para lectura");
    }

    try {
      const stats = fs.fstatSync(this.fileDescriptor);
      const currentFileSize = stats.size;

      // Si no hay nuevos datos
      if (currentFileSize <= this._currentPosition) {
        return [];
      }

      // Leer nuevos datos
      const bytesToRead = currentFileSize - this._currentPosition;
      const buffer = Buffer.alloc(
        Math.min(bytesToRead, this.config.bufferSize!)
      );

      const bytesRead = fs.readSync(
        this.fileDescriptor,
        buffer,
        0,
        buffer.length,
        this._currentPosition
      );

      if (bytesRead === 0) {
        return [];
      }

      // Convertir a string y procesar líneas
      const text = buffer.subarray(0, bytesRead).toString(this.config.encoding);
      const lines = text.split("\n");

      // Si no terminamos en nueva línea, la última línea puede estar incompleta
      let completeLines = lines;
      let incompleteLastLine = false;

      if (!text.endsWith("\n") && lines.length > 0) {
        // Remover la última línea incompleta y no avanzar la posición completamente
        completeLines = lines.slice(0, -1);
        incompleteLastLine = true;
      }

      // Procesar líneas y crear eventos
      const events: LogEvent[] = [];
      let linePosition = this._currentPosition;

      for (const line of completeLines) {
        const processedLine = this.processLine(line, options);

        if (processedLine !== null) {
          this._linesProcessed++;

          events.push({
            line: processedLine,
            lineNumber: this._linesProcessed,
            timestamp: new Date(),
            position: linePosition,
          });
        }

        // Actualizar posición (línea + salto de línea)
        linePosition += Buffer.byteLength(line, this.config.encoding) + 1;
      }

      // Actualizar posición actual
      if (incompleteLastLine) {
        // Solo avanzar hasta el inicio de la línea incompleta
        this._currentPosition = linePosition;
      } else {
        this._currentPosition = currentFileSize;
      }

      this._lastChangeTime = new Date();

      return events;
    } catch (error) {
      logError(`Error leyendo nuevas líneas: ${(error as Error).message}`);
      this.emit("error", error as Error);
      return [];
    }
  }

  /**
   * Lee todo el archivo desde el inicio
   */
  async readFullFile(options?: LogProcessingOptions): Promise<LogEvent[]> {
    if (this.fileDescriptor === null) {
      throw new Error("Archivo no está abierto para lectura");
    }

    try {
      const originalPosition = this._currentPosition;
      this._currentPosition = 0;
      this._linesProcessed = 0;

      const stats = fs.fstatSync(this.fileDescriptor);
      const fileSize = stats.size;

      const allEvents: LogEvent[] = [];

      while (this._currentPosition < fileSize) {
        const events = await this.readNewLines(options);
        allEvents.push(...events);

        // Evitar bucle infinito si no hay progreso
        if (events.length === 0) {
          break;
        }
      }

      return allEvents;
    } catch (error) {
      logError(`Error leyendo archivo completo: ${(error as Error).message}`);
      this.emit("error", error as Error);
      return [];
    }
  }

  /**
   * Actualiza la configuración del LogWatcher
   */
  updateConfig(newConfig: Partial<LogWatcherConfig>): void {
    if (this._isWatching) {
      throw new Error(
        "No se puede actualizar configuración mientras se está monitoreando"
      );
    }

    Object.assign(this.config, newConfig);
  }

  /**
   * Obtiene estadísticas del LogWatcher
   */
  getStats(): LogWatcherStats {
    let currentFileSize = 0;

    try {
      if (this.fileDescriptor !== null) {
        const stats = fs.fstatSync(this.fileDescriptor);
        currentFileSize = stats.size;
      }
    } catch (error) {
      // Ignorar errores de estadísticas
    }

    return {
      filePath: this.config.logFilePath,
      currentPosition: this._currentPosition,
      linesProcessed: this._linesProcessed,
      startTime: this._startTime,
      isWatching: this._isWatching,
      currentFileSize,
      lastChangeTime: this._lastChangeTime,
    };
  }

  /**
   * Verifica si el archivo existe y es accesible
   */
  async isFileValid(): Promise<boolean> {
    try {
      await fs.promises.access(this.config.logFilePath, fs.constants.R_OK);
      const stats = await fs.promises.stat(this.config.logFilePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Resetea la posición de lectura al inicio del archivo
   */
  resetPosition(): void {
    this._currentPosition = 0;
    this._linesProcessed = 0;
  }

  /**
   * Establece la posición de lectura en el archivo
   */
  setPosition(position: number): void {
    if (position < 0) {
      throw new Error("La posición no puede ser negativa");
    }

    this._currentPosition = position;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Inicia el polling del archivo
   */
  private startPolling(options?: LogProcessingOptions): void {
    this.watchInterval = setInterval(async () => {
      if (this.abortController?.signal.aborted) {
        return;
      }

      try {
        const events = await this.readNewLines(options);

        if (events.length > 0) {
          this.emit("fileChanged", this.getStats());

          // Emitir evento para cada nueva línea
          for (const event of events) {
            this.emit("newLog", event);
          }
        }
      } catch (error) {
        this.emit("error", error as Error);
      }
    }, this.config.pollingInterval);
  }

  /**
   * Procesa una línea según las opciones
   */
  private processLine(
    line: string,
    options?: LogProcessingOptions
  ): string | null {
    let processedLine = line;

    // Aplicar opciones de procesamiento
    if (options?.trimWhitespace !== false) {
      processedLine = processedLine.trim();
    }

    if (options?.filterEmptyLines !== false && processedLine === "") {
      return null;
    }

    if (options?.filterPattern && !options.filterPattern.test(processedLine)) {
      return null;
    }

    if (options?.transformer) {
      processedLine = options.transformer(processedLine) || "";
      if (processedLine === "") {
        return null;
      }
    }

    return processedLine;
  }

  /**
   * Limpia recursos al destruir la instancia
   */
  async close(): Promise<void> {
    await this.stopWatching();
    this.removeAllListeners();
  }
}
