import * as fs from "fs";
import * as path from "path";
import { LogLevel, LoggerConfig, LogEntry } from "../types/utils/logger.types";

export class Logger {
  private config: LoggerConfig;
  private logFilePath: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: "info",
      enableConsole: true,
      enableFile: true,
      fileOptions: {
        filename: "chatbot.log",
        maxSize: "10MB",
        maxFiles: 5,
      },
      ...config,
    };

    this.logFilePath = path.join(
      __dirname,
      "../../logs",
      this.config.fileOptions!.filename
    );
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logsDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    };

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? `[${entry.context}]` : "";
    const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";

    return `[${level}] ${timestamp}${context}: ${entry.message}${meta}`;
  }

  private writeToFile(formattedMessage: string): void {
    if (!this.config.enableFile) return;

    try {
      fs.appendFileSync(this.logFilePath, formattedMessage + "\n");
    } catch (error) {
      console.error("Error escribiendo al log:", (error as Error).message);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const icons: Record<LogLevel, string> = {
      debug: "🔍",
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
      fatal: "💀",
    };

    const icon = icons[entry.level];
    const message = `${icon}  ${entry.message}`;

    switch (entry.level) {
      case "debug":
        console.debug(message);
        break;
      case "info":
        console.log(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
      case "fatal":
        console.error(message);
        break;
    }
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    context?: string
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      meta,
      context,
    };

    const formattedMessage = this.formatMessage(entry);

    this.writeToConsole(entry);
    this.writeToFile(formattedMessage);
  }

  debug(message: string, meta?: Record<string, any>, context?: string): void {
    this.log("debug", message, meta, context);
  }

  info(message: string, meta?: Record<string, any>, context?: string): void {
    this.log("info", message, meta, context);
  }

  warn(message: string, meta?: Record<string, any>, context?: string): void {
    this.log("warn", message, meta, context);
  }

  warning(message: string, meta?: Record<string, any>, context?: string): void {
    this.warn(message, meta, context);
  }

  error(message: string, meta?: Record<string, any>, context?: string): void {
    this.log("error", message, meta, context);
  }

  fatal(message: string, meta?: Record<string, any>, context?: string): void {
    this.log("fatal", message, meta, context);
  }

  // Métodos para compatibilidad con el logger legacy
  logInfo(message: string): void {
    this.info(message);
  }

  logError(message: string): void {
    this.error(message);
  }

  logWarning(message: string): void {
    this.warn(message);
  }

  logWarn(message: string): void {
    this.warn(message);
  }
}

// Crear instancia singleton para mantener compatibilidad
const defaultLogger = new Logger();

// Exportar funciones legacy para compatibilidad
export const logInfo = (message: string): void =>
  defaultLogger.logInfo(message);
export const logError = (message: string): void =>
  defaultLogger.logError(message);
export const logWarning = (message: string): void =>
  defaultLogger.logWarning(message);
export const logWarn = (message: string): void =>
  defaultLogger.logWarn(message);

export default defaultLogger;
