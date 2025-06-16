/**
 * Abstract base class for all bot commands
 * Defines the common interface that all commands must implement
 */
import { ICommand } from "../../../interfaces/commands/ICommand";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandValidation,
  CommandCategory,
  Permission,
} from "../../../types/commands";
import { User } from "../../../types/core";
import { Logger } from "../../../utils/logger";

export abstract class Command implements ICommand {
  protected logger!: Logger;

  constructor() {
    this.initializeLogger();
    this.validateImplementation();
  }

  private initializeLogger(): void {
    try {
      const logger = require("../../../utils/logger");
      this.logger = logger;
    } catch (error) {
      // Fallback logger if the main logger doesn't exist
      this.logger = {
        logInfo: (msg: string) => console.log(`[INFO] ${msg}`),
        logError: (msg: string) => console.error(`[ERROR] ${msg}`),
        logWarn: (msg: string) => console.warn(`[WARN] ${msg}`),
      } as Logger;
    }
  }

  // Abstract properties that must be implemented by subclasses
  abstract get metadata(): CommandMetadata;

  // Properties with default values that can be overridden
  get name(): string {
    return this.metadata.name;
  }

  get description(): string {
    return this.metadata.description;
  }

  get syntax(): string {
    return this.metadata.syntax;
  }

  get aliases(): string[] {
    return this.metadata.aliases || [];
  }

  get permissions(): Permission[] {
    return this.metadata.permissions || ["user"];
  }

  get cooldown(): number {
    return this.metadata.cooldown || 0;
  }

  get category(): CommandCategory {
    return this.metadata.category || "general";
  }

  // Abstract methods that must be implemented by subclasses
  abstract execute(context: CommandContext): Promise<CommandResult>;

  // Default implementation methods
  validate(context: CommandContext): CommandValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation - can be overridden by subclasses
    if (!context.message || !context.user || !context.args) {
      errors.push("Invalid command context");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  canExecute(user: User): boolean {
    // Check if user has required permissions
    if (
      this.metadata.requiredRole &&
      user.user_type !== this.metadata.requiredRole
    ) {
      return false;
    }

    // Check permissions
    const hasPermission = this.permissions.some((permission) => {
      switch (permission) {
        case "user":
          return true; // All users have basic permission
        case "admin":
          return user.user_type === "admin";
        case "system":
          return user.user_type === "admin"; // Only admins can execute system commands
        default:
          return false;
      }
    });

    return hasPermission;
  }

  getHelp(): string {
    const examples = this.getUsageExamples();
    let help = `**${this.name}**\n`;
    help += `📋 *Descripción:* ${this.description}\n`;
    help += `🔧 *Sintaxis:* ${this.syntax}\n`;
    help += `📁 *Categoría:* ${this.category}\n`;

    if (this.aliases.length > 0) {
      help += `🏷️ *Alias:* ${this.aliases.join(", ")}\n`;
    }

    if (examples.length > 0) {
      help += `💡 *Ejemplos:*\n${examples.join("\n")}`;
    }

    return help;
  }

  getUsageExamples(): string[] {
    return this.metadata.examples || [`${this.syntax}`];
  }

  // Validation method to ensure implementation is correct
  private validateImplementation(): void {
    // This will be checked at runtime when accessing metadata
    setTimeout(() => {
      try {
        const metadata = this.metadata;
        if (!metadata.name || !metadata.description || !metadata.syntax) {
          throw new Error(
            "Command metadata must include name, description, and syntax"
          );
        }
      } catch (error) {
        this.logger.logError(`Command implementation error: ${error}`);
        throw error;
      }
    }, 0);
  }

  // Utility method for argument validation
  protected validateArgs(
    args: string[],
    minArgs: number = 0,
    maxArgs: number = Infinity
  ): boolean {
    if (args.length < minArgs) {
      throw new Error(
        `Este comando requiere al menos ${minArgs} argumento(s). Uso: ${this.syntax}`
      );
    }
    if (args.length > maxArgs) {
      throw new Error(
        `Este comando acepta máximo ${maxArgs} argumento(s). Uso: ${this.syntax}`
      );
    }
    return true;
  }

  // Utility method for formatting responses
  protected formatResponse(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ): string {
    const icons: Record<string, string> = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };

    return `${icons[type] || icons.info} ${message}`;
  }

  // Utility method to create a success result
  protected createSuccessResult(response?: string, data?: any): CommandResult {
    return {
      success: true,
      response,
      shouldReply: true,
      data,
    };
  }

  // Utility method to create an error result
  protected createErrorResult(error: string): CommandResult {
    return {
      success: false,
      error,
      shouldReply: true,
    };
  }
}
