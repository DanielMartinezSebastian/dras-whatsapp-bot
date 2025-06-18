/**
 * Command Registry Service
 *
 * Manages command registration, lookup, execution, and validation.
 * Handles command discovery from plugins and provides centralized command management.
 */

import { Logger } from '../utils/logger';
import { ConfigService } from './config.service';
import { PluginManagerService } from './plugin-manager.service';
import { commandHandlers } from '../commands/basic.handlers';
import {
  Command,
  CommandRegistry,
  CommandResult,
  PluginContext,
  UserLevel,
  User,
  Message,
} from '../types';

export interface CommandExecutionContext {
  command: Command;
  args: string[];
  rawInput: string;
  parsedParams: Record<string, any>;
  user: User;
  message: Message;
}

export interface CommandValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class CommandRegistryService {
  private static instance: CommandRegistryService;
  private logger: Logger;
  private config: ConfigService;
  private pluginManager: PluginManagerService;

  private commands: CommandRegistry = {};
  private commandAliases: Map<string, string> = new Map();
  private commandCooldowns: Map<string, Map<string, number>> = new Map();
  private commandUsageStats: Map<string, number> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigService.getInstance();
    this.pluginManager = PluginManagerService.getInstance();
  }

  public static getInstance(): CommandRegistryService {
    if (!CommandRegistryService.instance) {
      CommandRegistryService.instance = new CommandRegistryService();
    }
    return CommandRegistryService.instance;
  }

  /**
   * Initialize the Command Registry
   */
  public async initialize(): Promise<void> {
    this.logger.info('CommandRegistry', 'Initializing Command Registry...');

    try {
      // Load commands from plugins
      await this.discoverCommands();

      // Register command aliases
      this.registerAliases();

      this.logger.info(
        'CommandRegistry',
        `Command Registry initialized with ${Object.keys(this.commands).length} commands`
      );
    } catch (error) {
      this.logger.error(
        'CommandRegistry',
        'Failed to initialize Command Registry',
        { error }
      );
      throw error;
    }
  }

  /**
   * Register a command
   */
  public registerCommand(command: Command): void {
    if (this.commands[command.name]) {
      this.logger.warn(
        'CommandRegistry',
        `Command '${command.name}' is already registered. Overwriting...`
      );
    }

    // Validate command structure
    const validation = this.validateCommand(command);
    if (!validation.valid) {
      throw new Error(
        `Invalid command '${command.name}': ${validation.errors.join(', ')}`
      );
    }

    this.commands[command.name] = command;

    // Register aliases
    for (const alias of command.aliases) {
      this.commandAliases.set(alias, command.name);
    }

    this.logger.debug(
      'CommandRegistry',
      `Command '${command.name}' registered`,
      {
        aliases: command.aliases,
        category: command.category,
        userLevel: command.userLevel,
      }
    );
  }

  /**
   * Unregister a command
   */
  public unregisterCommand(commandName: string): void {
    const command = this.commands[commandName];
    if (!command) {
      this.logger.warn(
        'CommandRegistry',
        `Command '${commandName}' is not registered`
      );
      return;
    }

    // Remove aliases
    for (const alias of command.aliases) {
      this.commandAliases.delete(alias);
    }

    // Remove command
    delete this.commands[commandName];

    // Clear cooldowns
    this.commandCooldowns.delete(commandName);

    this.logger.debug(
      'CommandRegistry',
      `Command '${commandName}' unregistered`
    );
  }

  /**
   * Get a command by name or alias
   */
  public getCommand(name: string): Command | null {
    // Direct lookup
    if (this.commands[name]) {
      return this.commands[name];
    }

    // Alias lookup
    const actualName = this.commandAliases.get(name);
    if (actualName && this.commands[actualName]) {
      return this.commands[actualName];
    }

    return null;
  }

  /**
   * Get all commands
   */
  public getAllCommands(): Command[] {
    return Object.values(this.commands);
  }

  /**
   * Get commands by category
   */
  public getCommandsByCategory(category: string): Command[] {
    return Object.values(this.commands).filter(
      command => command.category === category
    );
  }

  /**
   * Get commands available to user level
   */
  public getCommandsForUserLevel(userLevel: UserLevel): Command[] {
    return Object.values(this.commands).filter(command =>
      this.isUserLevelSufficient(userLevel, command.userLevel)
    );
  }

  /**
   * Parse command from message
   */
  public parseCommand(
    message: string
  ): { command: string; args: string[] } | null {
    const prefix = this.config.getValue('bot.commandPrefix', '!');

    if (!message.startsWith(prefix)) {
      return null;
    }

    const content = message.slice(prefix.length).trim();
    if (!content) {
      return null;
    }

    const parts = content.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * Execute a command
   */
  public async executeCommand(
    commandName: string,
    args: string[],
    user: User,
    _message: Message,
    pluginContext: PluginContext
  ): Promise<CommandResult> {
    this.logger.info(
      'CommandRegistry',
      `Attempting to execute command '${commandName}'`
    );

    const command = this.getCommand(commandName);

    this.logger.info(
      'CommandRegistry',
      `Command lookup result for '${commandName}'`,
      {
        found: !!command,
        commandName,
        availableCommands: Object.keys(this.commands),
      }
    );

    if (!command) {
      return {
        success: false,
        command: commandName,
        executionTime: 0,
        error: `Command '${commandName}' not found`,
      };
    }

    // Check if command is enabled
    if (!command.enabled) {
      return {
        success: false,
        command: commandName,
        executionTime: 0,
        error: `Command '${commandName}' is disabled`,
      };
    }

    // Check user permissions
    if (!this.isUserLevelSufficient(user.userLevel, command.userLevel)) {
      return {
        success: false,
        command: commandName,
        executionTime: 0,
        error: `Insufficient permissions to execute '${commandName}'`,
      };
    }

    // Check cooldown
    if (!this.checkCooldown(command.name, user.id.toString())) {
      const remainingTime = this.getRemainingCooldown(
        command.name,
        user.id.toString()
      );
      return {
        success: false,
        command: commandName,
        executionTime: 0,
        error: `Command '${commandName}' is on cooldown. Wait ${remainingTime}s`,
      };
    }

    try {
      const startTime = Date.now();

      // Parse parameters
      const parsedParams = this.parseParameters(command, args);

      // Validate parameters
      const validation = this.validateParameters(command, parsedParams);
      if (!validation.valid) {
        return {
          success: false,
          command: commandName,
          executionTime: Date.now() - startTime,
          error: `Invalid parameters: ${validation.errors.join(', ')}`,
        };
      }

      // Execute command based on plugin type
      let result: CommandResult;

      if (command.plugin === 'basic') {
        // Handle basic commands through direct handlers
        const handler =
          commandHandlers[commandName as keyof typeof commandHandlers];

        if (handler) {
          this.logger.info(
            'CommandRegistry',
            `Executing basic command '${commandName}' through handler`
          );

          result = await handler(_message, pluginContext);

          this.logger.info(
            'CommandRegistry',
            `Command '${commandName}' handler result`,
            {
              success: result.success,
              hasMessage: !!result.message,
              messageLength: result.message ? result.message.length : 0,
            }
          );
        } else {
          throw new Error(
            `No handler found for basic command '${commandName}'`
          );
        }
      } else {
        // Execute command via plugin manager for other plugins
        result = await this.pluginManager.executePlugin(
          command.plugin,
          pluginContext
        );
      }

      const executionTime = Date.now() - startTime;

      // Update cooldown
      this.updateCooldown(command.name, user.id.toString());

      // Update usage stats
      this.updateUsageStats(command.name);

      this.logger.debug(
        'CommandRegistry',
        `Command '${commandName}' executed`,
        {
          user: user.id,
          executionTime,
          success: result.success,
        }
      );

      return {
        ...result,
        command: commandName,
        executionTime,
      };
    } catch (error) {
      this.logger.error(
        'CommandRegistry',
        `Command '${commandName}' execution failed`,
        { error }
      );
      return {
        success: false,
        command: commandName,
        executionTime: Date.now(),
        error: `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get command help
   */
  public getCommandHelp(commandName: string): string | null {
    const command = this.getCommand(commandName);
    if (!command) {
      return null;
    }

    let help = `**${command.name}** - ${command.description}\n`;
    help += `Category: ${command.category}\n`;
    help += `User Level: ${command.userLevel}\n`;

    if (command.aliases.length > 0) {
      help += `Aliases: ${command.aliases.join(', ')}\n`;
    }

    if (command.parameters && command.parameters.length > 0) {
      help += '\n**Parameters:**\n';
      for (const param of command.parameters) {
        const required = param.required ? '[Required]' : '[Optional]';
        help += `• ${param.name} (${param.type}) ${required}: ${param.description}\n`;
      }
    }

    if (command.examples && command.examples.length > 0) {
      help += '\n**Examples:**\n';
      for (const example of command.examples) {
        help += `• ${example}\n`;
      }
    }

    return help;
  }

  /**
   * Get command statistics
   */
  public getCommandStats(): Record<string, any> {
    return {
      totalCommands: Object.keys(this.commands).length,
      totalAliases: this.commandAliases.size,
      categoriesCount: this.getCategoriesCount(),
      usageStats: Object.fromEntries(this.commandUsageStats),
      topCommands: this.getTopCommands(10),
    };
  }

  /**
   * Private helper methods
   */

  private async discoverCommands(): Promise<void> {
    // This would typically scan plugins for commands
    // For now, we'll implement a basic discovery mechanism
    this.logger.info('CommandRegistry', 'Discovering commands from plugins...');

    // Register basic commands from the basic commands module
    try {
      const { basicCommands } = await import('../commands/basic.commands');

      this.logger.info(
        'CommandRegistry',
        `Found ${basicCommands.length} basic commands to register`
      );

      basicCommands.forEach(command => {
        this.logger.info(
          'CommandRegistry',
          `Registering basic command: ${command.name}`
        );
        this.registerCommand(command);
      });

      this.logger.info(
        'CommandRegistry',
        `Successfully registered ${basicCommands.length} basic commands`
      );
    } catch (error) {
      this.logger.error('CommandRegistry', 'Failed to load basic commands', {
        error,
      });
      throw error;
    }

    // TODO: Implement command discovery from other plugins
    // This would involve scanning plugin metadata and extracting command definitions
  }

  private registerAliases(): void {
    for (const command of Object.values(this.commands)) {
      for (const alias of command.aliases) {
        this.commandAliases.set(alias, command.name);
      }
    }
  }

  private validateCommand(command: Command): CommandValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!command.name || command.name.trim() === '') {
      errors.push('Command name is required');
    }

    if (!command.description || command.description.trim() === '') {
      errors.push('Command description is required');
    }

    if (!command.category || command.category.trim() === '') {
      errors.push('Command category is required');
    }

    if (!command.plugin || command.plugin.trim() === '') {
      errors.push('Command plugin is required');
    }

    if (!Object.values(UserLevel).includes(command.userLevel)) {
      errors.push('Invalid user level');
    }

    if (command.cooldown && command.cooldown < 0) {
      errors.push('Cooldown cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private parseParameters(
    command: Command,
    args: string[]
  ): Record<string, any> {
    const parsed: Record<string, any> = {};

    if (!command.parameters) {
      return parsed;
    }

    for (let i = 0; i < command.parameters.length; i++) {
      const param = command.parameters[i];
      const value = args[i];

      if (value !== undefined) {
        parsed[param.name] = this.convertParameterType(value, param.type);
      } else if (param.defaultValue !== undefined) {
        parsed[param.name] = param.defaultValue;
      }
    }

    return parsed;
  }

  private validateParameters(
    command: Command,
    params: Record<string, any>
  ): CommandValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!command.parameters) {
      return { valid: true, errors, warnings };
    }

    for (const param of command.parameters) {
      const value = params[param.name];

      if (param.required && (value === undefined || value === null)) {
        errors.push(`Parameter '${param.name}' is required`);
        continue;
      }

      if (value !== undefined && param.validation) {
        if (typeof value === 'string' && !param.validation.test(value)) {
          errors.push(
            `Parameter '${param.name}' does not match required format`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private convertParameterType(value: string, type: string): any {
    switch (type) {
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'boolean':
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
      default:
        return value;
    }
  }

  private isUserLevelSufficient(
    userLevel: UserLevel,
    requiredLevel: UserLevel
  ): boolean {
    const levels = [
      UserLevel.BANNED,
      UserLevel.USER,
      UserLevel.MODERATOR,
      UserLevel.ADMIN,
      UserLevel.OWNER,
    ];
    return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
  }

  private checkCooldown(commandName: string, userId: string): boolean {
    const command = this.commands[commandName];
    if (!command || !command.cooldown) {
      return true;
    }

    const userCooldowns = this.commandCooldowns.get(commandName);
    if (!userCooldowns) {
      return true;
    }

    const lastUsed = userCooldowns.get(userId);
    if (!lastUsed) {
      return true;
    }

    return Date.now() - lastUsed >= command.cooldown * 1000;
  }

  private getRemainingCooldown(commandName: string, userId: string): number {
    const command = this.commands[commandName];
    if (!command || !command.cooldown) {
      return 0;
    }

    const userCooldowns = this.commandCooldowns.get(commandName);
    if (!userCooldowns) {
      return 0;
    }

    const lastUsed = userCooldowns.get(userId);
    if (!lastUsed) {
      return 0;
    }

    const elapsed = Date.now() - lastUsed;
    const remaining = command.cooldown * 1000 - elapsed;
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  private updateCooldown(commandName: string, userId: string): void {
    if (!this.commandCooldowns.has(commandName)) {
      this.commandCooldowns.set(commandName, new Map());
    }

    const userCooldowns = this.commandCooldowns.get(commandName)!;
    userCooldowns.set(userId, Date.now());
  }

  private updateUsageStats(commandName: string): void {
    const current = this.commandUsageStats.get(commandName) || 0;
    this.commandUsageStats.set(commandName, current + 1);
  }

  private getCategoriesCount(): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const command of Object.values(this.commands)) {
      categories[command.category] = (categories[command.category] || 0) + 1;
    }

    return categories;
  }

  private getTopCommands(
    limit: number
  ): Array<{ command: string; usage: number }> {
    return Array.from(this.commandUsageStats.entries())
      .map(([command, usage]) => ({ command, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);
  }

  /**
   * Get available commands for a specific user (respects user level and permissions)
   */
  public getAvailableCommands(user: User): Command[] {
    return Object.values(this.commands).filter(
      command => command.enabled && this.canUserExecute(command.name, user)
    );
  }

  /**
   * Check if a user can execute a specific command
   */
  public canUserExecute(commandName: string, user: User): boolean {
    const command = this.getCommand(commandName);
    if (!command) {
      return false;
    }

    // Check if command is enabled
    if (!command.enabled) {
      return false;
    }

    // Check user level permissions
    return this.isUserLevelSufficient(user.userLevel, command.userLevel);
  }
}
