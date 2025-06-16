export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  fileOptions?: {
    filename: string;
    maxSize: string;
    maxFiles: number;
  };
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  context?: string;
}
