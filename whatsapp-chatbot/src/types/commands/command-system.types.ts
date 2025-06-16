// Enhanced Command System Types
import type { WhatsAppMessage, User } from "../core";

export interface CommandMetadata {
  name: string;
  aliases: string[];
  description: string;
  syntax: string;
  category: CommandCategory;
  permissions: Permission[];
  cooldown: number;
  requiredRole?: import("../core/user.types").UserType;
  examples?: string[];
  isAdmin?: boolean;
  isSensitive?: boolean;
}

export interface CommandContext {
  message: WhatsAppMessage;
  user?: User;
  args: string[];
  fullText: string;
  commandName: string;
  isFromAdmin: boolean;
  timestamp: Date;
}

export interface CommandResult {
  success: boolean;
  response?: string;
  error?: string;
  shouldReply: boolean;
  action?: CommandAction;
  data?: any;
}

export interface CommandAction {
  type: CommandActionType;
  target?: string;
  data?: any;
  delay?: number;
}

export type CommandActionType =
  | "send_message"
  | "send_media"
  | "execute_system"
  | "update_user"
  | "log_action"
  | "broadcast"
  | "none";

export interface CommandValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CommandStats {
  executionCount: number;
  lastExecuted: Date;
  avgResponseTime: number;
  errorCount: number;
  popularityScore: number;
}

export type CommandCategory =
  | "general"
  | "admin"
  | "user"
  | "system"
  | "contextual"
  | "basic"
  | "diagnostic";

export type Permission =
  | "basic"
  | "user"
  | "admin"
  | "system"
  | "debug"
  | "maintenance";

export interface CommandRegistryEntry {
  instance: ICommand;
  metadata: CommandMetadata;
  stats: CommandStats;
  isActive: boolean;
}

export interface ICommand {
  readonly metadata: CommandMetadata;

  execute(context: CommandContext): Promise<CommandResult>;
  validate(context: CommandContext): CommandValidation;
  canExecute(user: User): boolean;
  getHelp(): string;
  getUsageExamples(): string[];
}

// Registry Types
export interface CommandRegistryOptions {
  autoLoad: boolean;
  caseSensitive: boolean;
  enableStats: boolean;
  defaultCooldown: number;
}

export interface CommandSearchOptions {
  category?: CommandCategory;
  permissions?: Permission[];
  includeAliases?: boolean;
  activeOnly?: boolean;
}

export interface CommandRegistryStats {
  totalCommands: number;
  totalExecutions: number;
  averageResponseTime: number;
  categoryCounts: Record<CommandCategory, number>;
  mostUsedCommands: string[];
}
