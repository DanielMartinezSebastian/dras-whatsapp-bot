import type { WhatsAppMessage, User, MessageClassification } from "../core";

export interface MessageHandlerConfig {
  enableGreetings: boolean;
  enableFarewells: boolean;
  enableHelp: boolean;
  maxResponseLength: number;
  cooldownMinutes: number;
}

/**
 * Contexto para el procesamiento de mensajes
 */
export interface HandlerContext {
  message: WhatsAppMessage;
  user?: User;
  classification: MessageClassification;
  previousMessages?: WhatsAppMessage[];
  bot?: any; // Will be properly typed when IBotProcessor is created
  timestamp: Date;
}

/**
 * Resultado del procesamiento de un mensaje
 */
export interface HandlerResult {
  handled: boolean;
  success: boolean;
  response?: string;
  shouldContinue?: boolean;
  error?: string;
  action?: MessageAction;
  data?: any;
}

/**
 * Tipos de acciones que puede realizar un handler
 */
export type MessageAction =
  | "reply"
  | "forward"
  | "react"
  | "ignore"
  | "escalate"
  | "log";

/**
 * Estadísticas de un message handler
 */
export interface MessageHandlerStats {
  totalMessages: number;
  handledMessages: number;
  failedMessages: number;
  successRate: number;
  averageResponseTime: number;
}
