/**
 * Unified command handler for processing commands
 * Centralizes execution logic, permissions and cooldowns
 */
import { ICommandHandler } from "../../../interfaces/commands/ICommandHandler";
import { ICommand } from "../../../interfaces/commands/ICommand";
import {
  CommandContext,
  CommandResult,
  CommandCategory,
  CommandValidation,
} from "../../../types/commands";
import { WhatsAppMessage, User } from "../../../types/core";
import { Logger } from "../../../utils/logger";
import { PermissionService } from "../../../services/permissionService";
import { commandRegistry } from "./CommandRegistry";

interface CooldownEntry {
  userId: string;
  commandName: string;
  expiresAt: Date;
}

interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecuted: Date;
  averageResponseTime: number;
}

export class UnifiedCommandHandler implements ICommandHandler {
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private executionStats: Map<string, ExecutionStats> = new Map();
  private logger!: Logger;
  private permissionService!: PermissionService;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    try {
      this.logger = require("../../../utils/logger");
    } catch (error) {
      this.logger = {
        logInfo: (msg: string) => console.log(`[INFO] ${msg}`),
        logError: (msg: string) => console.error(`[ERROR] ${msg}`),
        logWarn: (msg: string) => console.warn(`[WARN] ${msg}`),
      } as Logger;
    }

    try {
      this.permissionService = require("../../../services/permissionService");
    } catch (error) {
      // Fallback permission service
      this.permissionService = {
        async checkPermission(): Promise<boolean> {
          return true;
        },
      } as any;
    }
  }

  /**
   * Handles contextual commands that don't require prefixes
   */
  async handleContextualCommand(
    message: WhatsAppMessage,
    user: User,
    bot: any
  ): Promise<boolean> {
    try {
      const messageText = message.text || message.content || "";

      // Search for contextual commands that match the message
      const contextualCommands = commandRegistry.getByCategory("contextual");

      if (contextualCommands.length === 0) {
        // If no commands are loaded, try to load them automatically
        const stats = commandRegistry.getStats();
        if (stats.totalCommands === 0) {
          this.logger.logInfo("Attempting to load commands automatically...");
          const loadedCount = commandRegistry.loadCommands();
          this.logger.logInfo(`Loaded ${loadedCount} commands automatically`);

          // Try again with newly loaded commands
          const retryContextualCommands =
            commandRegistry.getByCategory("contextual");
          if (retryContextualCommands.length > 0) {
            return await this.processContextualCommands(
              retryContextualCommands,
              message,
              user,
              messageText,
              bot
            );
          }
        }
        return false;
      }

      return await this.processContextualCommands(
        contextualCommands,
        message,
        user,
        messageText,
        bot
      );
    } catch (error) {
      this.logger.logError(`Error in handleContextualCommand: ${error}`);
      return false;
    }
  }

  /**
   * Main command handling method
   */
  async handleCommand(
    message: WhatsAppMessage,
    user: User
  ): Promise<CommandResult> {
    try {
      const parsed = this.parseCommand(message);
      if (!parsed) {
        return this.createErrorResult("Could not parse command");
      }

      const { command: commandName, args } = parsed;

      // Get command from registry
      const command = commandRegistry.get(commandName);
      if (!command) {
        return this.createErrorResult(`Command "${commandName}" not found`);
      }

      // Check permissions
      if (!this.canExecuteCommand(commandName, user)) {
        return this.createErrorResult(
          "You don't have permission to execute this command"
        );
      }

      // Check cooldown
      if (this.isOnCooldown(user.whatsapp_jid, commandName)) {
        const remainingTime = this.getRemainingCooldown(
          user.whatsapp_jid,
          commandName
        );
        return this.createErrorResult(
          `Command is on cooldown. Please wait ${remainingTime}s`
        );
      }

      // Create execution context
      const context: CommandContext = {
        message,
        user,
        args,
        fullText: message.text || message.content || "",
        commandName,
        isFromAdmin: user.user_type === "admin",
        timestamp: new Date(),
      };

      // Validate command context
      const validation = command.validate(context);
      if (!validation.isValid) {
        return this.createErrorResult(
          `Validation failed: ${validation.errors.join(", ")}`
        );
      }

      // Execute command
      const startTime = Date.now();
      const result = await command.execute(context);
      const executionTime = Date.now() - startTime;

      // Apply cooldown if command was successful
      if (result.success) {
        this.applyCooldown(
          user.whatsapp_jid,
          commandName,
          command.metadata.cooldown
        );
      }

      // Update execution statistics
      this.updateExecutionStats(commandName, result.success, executionTime);

      return result;
    } catch (error) {
      this.logger.logError(`Error executing command: ${error}`);
      return this.createErrorResult(`Execution error: ${error}`);
    }
  }

  parseCommand(
    message: WhatsAppMessage
  ): { command: string; args: string[] } | null {
    const text = message.text || message.content || "";

    // Check for command prefix
    if (!text.startsWith("/") && !text.startsWith("!")) {
      return null;
    }

    const parts = text.slice(1).trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) {
      return null;
    }

    // Debug log para verificar el parsing
    console.log("🔍 DEBUG UnifiedCommandHandler parseCommand:", {
      originalText: text,
      parts: parts,
      command: parts[0].toLowerCase(),
      args: parts.slice(1),
    });

    return {
      command: parts[0].toLowerCase(),
      args: parts.slice(1),
    };
  }

  canExecuteCommand(commandName: string, user: User): boolean {
    const command = commandRegistry.get(commandName);
    if (!command) {
      return false;
    }

    return command.canExecute(user);
  }

  private async processContextualCommands(
    commands: ICommand[],
    message: WhatsAppMessage,
    user: User,
    messageText: string,
    bot: any
  ): Promise<boolean> {
    for (const command of commands) {
      try {
        // For contextual commands, we need to check if they match the message
        // This requires extending the ICommand interface or using duck typing
        const contextualCommand = command as any;

        if (
          contextualCommand.matches &&
          typeof contextualCommand.matches === "function"
        ) {
          const matches = contextualCommand.matches(messageText);
          if (matches) {
            this.logger.logInfo(
              `Executing contextual command: ${command.metadata.name}`
            );

            const context: CommandContext = {
              message,
              user,
              args: [],
              fullText: messageText,
              commandName: command.metadata.name,
              isFromAdmin: user.user_type === "admin",
              timestamp: new Date(),
            };

            const result = await command.execute(context);
            if (result.success) {
              return true; // Command was handled successfully
            }
          }
        }
      } catch (error) {
        this.logger.logError(
          `Error in contextual command ${command.metadata.name}: ${error}`
        );
      }
    }

    return false;
  }

  private isOnCooldown(userId: string, commandName: string): boolean {
    const cooldownKey = `${userId}:${commandName}`;
    const cooldown = this.cooldowns.get(cooldownKey);

    if (!cooldown) {
      return false;
    }

    if (cooldown.expiresAt > new Date()) {
      return true;
    }

    // Cooldown expired, remove it
    this.cooldowns.delete(cooldownKey);
    return false;
  }

  private getRemainingCooldown(userId: string, commandName: string): number {
    const cooldownKey = `${userId}:${commandName}`;
    const cooldown = this.cooldowns.get(cooldownKey);

    if (!cooldown) {
      return 0;
    }

    const remaining = Math.ceil(
      (cooldown.expiresAt.getTime() - Date.now()) / 1000
    );
    return Math.max(0, remaining);
  }

  private applyCooldown(
    userId: string,
    commandName: string,
    cooldownSeconds: number
  ): void {
    if (cooldownSeconds <= 0) {
      return;
    }

    const cooldownKey = `${userId}:${commandName}`;
    const expiresAt = new Date(Date.now() + cooldownSeconds * 1000);

    this.cooldowns.set(cooldownKey, {
      userId,
      commandName,
      expiresAt,
    });
  }

  private updateExecutionStats(
    commandName: string,
    success: boolean,
    executionTime: number
  ): void {
    let stats = this.executionStats.get(commandName);

    if (!stats) {
      stats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecuted: new Date(),
        averageResponseTime: 0,
      };
    }

    stats.totalExecutions++;
    stats.lastExecuted = new Date();

    if (success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    // Update average response time
    const totalTime =
      stats.averageResponseTime * (stats.totalExecutions - 1) + executionTime;
    stats.averageResponseTime = totalTime / stats.totalExecutions;

    this.executionStats.set(commandName, stats);
  }

  private createErrorResult(error: string): CommandResult {
    return {
      success: false,
      error,
      shouldReply: true,
    };
  }

  // Public method to get execution statistics
  getExecutionStats(): Map<string, ExecutionStats> {
    return new Map(this.executionStats);
  }

  // Public method to clear cooldowns (useful for admin commands)
  clearCooldowns(): void {
    this.cooldowns.clear();
    this.logger.logInfo("All cooldowns cleared");
  }

  // Public method to clear cooldown for specific user/command
  clearCooldown(userId: string, commandName?: string): void {
    if (commandName) {
      const cooldownKey = `${userId}:${commandName}`;
      this.cooldowns.delete(cooldownKey);
      this.logger.logInfo(
        `Cooldown cleared for user ${userId}, command ${commandName}`
      );
    } else {
      // Clear all cooldowns for user
      for (const [key] of this.cooldowns) {
        if (key.startsWith(`${userId}:`)) {
          this.cooldowns.delete(key);
        }
      }
      this.logger.logInfo(`All cooldowns cleared for user ${userId}`);
    }
  }
}

// Export a single instance for the entire application
export const unifiedCommandHandler = new UnifiedCommandHandler();
