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

export type CommandCategory =
  | "general"
  | "admin"
  | "user"
  | "system"
  | "moderation";
export type Permission = "user" | "admin" | "moderator" | "system";

export interface CommandExecutionContext {
  message: WhatsAppMessage;
  args: string[];
  user: User;
  bot: any; // Will be properly typed when IBotProcessor is created
}

export interface CommandExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
  shouldContinue?: boolean;
}
