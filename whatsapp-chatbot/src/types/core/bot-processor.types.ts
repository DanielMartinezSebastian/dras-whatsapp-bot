// Core Bot Types
import { WhatsAppMessage, MessageType } from "./message.types";
import { User } from "./user.types";

export interface BotMessageClassification {
  type: BotMessageClassificationType;
  subtype?: string;
  confidence: number;
  patterns: string[];
  context?: BotMessageContext;
}

export type BotMessageClassificationType =
  | "command"
  | "greeting"
  | "farewell"
  | "question"
  | "help"
  | "contextual"
  | "unknown";

export interface BotMessageContext {
  isCommand: boolean;
  isGreeting: boolean;
  isFarewell: boolean;
  isQuestion: boolean;
  needsHelp: boolean;
  hasEmotionalContent: boolean;
  keywords: string[];
  sentiment?: "positive" | "negative" | "neutral";
}

export interface ProcessingResult {
  success: boolean;
  response?: string;
  action?: BotAction;
  error?: string;
  shouldReply: boolean;
  classification: BotMessageClassification;
}

export interface BotAction {
  type: BotActionType;
  data?: any;
  delay?: number;
}

export type BotActionType =
  | "send_message"
  | "execute_command"
  | "start_registration"
  | "update_context"
  | "log_interaction"
  | "no_action";

export interface BotProcessorConfig {
  botName: string;
  botPrefix: string;
  autoReply: boolean;
  commandPrefix: string;
  useNewCommandSystem: boolean;
  maxDailyResponses: number;
  minResponseInterval: number;
}

export interface ClassificationPatterns {
  admin: RegExp;
  user: RegExp;
  system: RegExp;
}

export interface BotProcessorStats {
  startTime: Date;
  processedMessages: number;
  totalCommands: number;
  totalErrors: number;
  uptime: number;
}
