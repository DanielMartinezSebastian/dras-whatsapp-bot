/**
 * Logger Utility
 * Provides centralized logging functionality for DrasBot
 */

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logDir: string = 'logs';
  private logFile: string = 'drasbot.log';

  private constructor() {
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setLogDirectory(dir: string): void {
    this.logDir = dir;
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, category: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const dataStr = data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${levelStr}] [${category}] ${message}${dataStr}`;
  }

  private writeToFile(formattedMessage: string): void {
    const logPath = path.join(this.logDir, this.logFile);
    fs.appendFileSync(logPath, formattedMessage + '\n');
  }

  private log(level: LogLevel, category: string, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(level, category, message, data);
    
    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // File output
    this.writeToFile(formattedMessage);
  }

  public debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  public info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  public warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  public error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  public getLogHistory(lines: number = 100): LogEntry[] {
    const logPath = path.join(this.logDir, this.logFile);
    
    if (!fs.existsSync(logPath)) {
      return [];
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    const logLines = content.trim().split('\n').slice(-lines);
    
    return logLines.map(line => {
      const match = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+?)( \| Data: (.+))?$/);
      if (match) {
        return {
          timestamp: match[1],
          level: LogLevel[match[2] as keyof typeof LogLevel],
          category: match[3],
          message: match[4],
          data: match[6] ? JSON.parse(match[6]) : undefined
        };
      }
      return {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        category: 'unknown',
        message: line
      };
    });
  }

  public clearLogs(): void {
    const logPath = path.join(this.logDir, this.logFile);
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  }
}

export default Logger;
