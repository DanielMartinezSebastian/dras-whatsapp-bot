/**
 * Centralized registry for managing all bot commands
 * Handles registration, search and automatic loading of commands
 */
import fs from "fs";
import path from "path";
import { ICommandRegistry } from "../../../interfaces/commands/ICommandRegistry";
import { ICommand } from "../../../interfaces/commands/ICommand";
import {
  CommandRegistryEntry,
  CommandRegistryOptions,
  CommandSearchOptions,
  CommandStats,
  CommandRegistryStats,
  CommandCategory,
} from "../../../types/commands";
import { Logger } from "../../../utils/logger";

export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, CommandRegistryEntry> = new Map();
  private aliases: Map<string, string> = new Map();
  private categories: Map<CommandCategory, Set<string>> = new Map();
  private logger!: Logger;
  private isLoaded: boolean = false;
  private options: CommandRegistryOptions;

  constructor(options: Partial<CommandRegistryOptions> = {}) {
    this.options = {
      autoLoad: true,
      caseSensitive: false,
      enableStats: true,
      defaultCooldown: 0,
      ...options,
    };

    this.initializeLogger();
  }

  private initializeLogger(): void {
    try {
      const logger = require("../../../utils/logger");
      this.logger = logger.default || logger;
    } catch (error) {
      // Fallback logger if the main logger doesn't exist
      this.logger = {
        logInfo: (msg: string) => console.log(`[INFO] ${msg}`),
        logError: (msg: string) => console.error(`[ERROR] ${msg}`),
        logWarn: (msg: string) => console.warn(`[WARN] ${msg}`),
      } as any;
    }
  }

  register(commandInstance: ICommand): boolean {
    try {
      // Validate that it's a valid command instance
      if (!commandInstance.metadata?.name || !commandInstance.execute) {
        throw new Error(`Invalid command: missing name or execute method`);
      }

      const commandName = this.options.caseSensitive
        ? commandInstance.metadata.name
        : commandInstance.metadata.name.toLowerCase();

      if (this.commands.has(commandName)) {
        throw new Error(`Command "${commandName}" is already registered`);
      }

      // Create registry entry
      const entry: CommandRegistryEntry = {
        instance: commandInstance,
        metadata: commandInstance.metadata,
        stats: this.createInitialStats(),
        isActive: true,
      };

      this.commands.set(commandName, entry);

      // Register in category
      const category = commandInstance.metadata.category || "general";
      if (!this.categories.has(category)) {
        this.categories.set(category, new Set());
      }
      this.categories.get(category)!.add(commandName);

      // Register aliases
      if (
        commandInstance.metadata.aliases &&
        Array.isArray(commandInstance.metadata.aliases)
      ) {
        for (const alias of commandInstance.metadata.aliases) {
          const aliasKey = this.options.caseSensitive
            ? alias
            : alias.toLowerCase();
          if (this.aliases.has(aliasKey)) {
            this.logger.logWarn(
              `Alias "${aliasKey}" is already registered and will be overwritten`
            );
          }
          this.aliases.set(aliasKey, commandName);
        }
      }

      this.logger.logInfo(`Command "${commandName}" registered successfully`);
      return true;
    } catch (error) {
      this.logger.logError(`Error registering command: ${error}`);
      return false;
    }
  }

  get(commandNameOrAlias: string): ICommand | null {
    if (!commandNameOrAlias) return null;

    const searchKey = this.options.caseSensitive
      ? commandNameOrAlias
      : commandNameOrAlias.toLowerCase();

    // Search for direct command
    const entry = this.commands.get(searchKey);
    if (entry && entry.isActive) {
      this.updateCommandStats(searchKey);
      return entry.instance;
    }

    // Search by alias
    if (this.aliases.has(searchKey)) {
      const actualCommandName = this.aliases.get(searchKey)!;
      const aliasEntry = this.commands.get(actualCommandName);
      if (aliasEntry && aliasEntry.isActive) {
        this.updateCommandStats(actualCommandName);
        return aliasEntry.instance;
      }
    }

    return null;
  }

  search(options: CommandSearchOptions): ICommand[] {
    const results: ICommand[] = [];

    for (const [name, entry] of this.commands) {
      if (!entry.isActive && options.activeOnly !== false) {
        continue;
      }

      // Filter by category
      if (options.category && entry.metadata.category !== options.category) {
        continue;
      }

      // Filter by permissions
      if (options.permissions && options.permissions.length > 0) {
        const hasRequiredPermission = options.permissions.some((permission) =>
          entry.metadata.permissions.includes(permission)
        );
        if (!hasRequiredPermission) {
          continue;
        }
      }

      results.push(entry.instance);
    }

    return results;
  }

  getAll(): ICommand[] {
    return Array.from(this.commands.values())
      .filter((entry) => entry.isActive)
      .map((entry) => entry.instance);
  }

  getByCategory(category: CommandCategory): ICommand[] {
    if (!this.categories.has(category)) {
      return [];
    }

    const commandNames = Array.from(this.categories.get(category)!);
    return commandNames
      .map((name) => this.commands.get(name))
      .filter(
        (entry): entry is CommandRegistryEntry =>
          entry !== undefined && entry.isActive
      )
      .map((entry) => entry.instance);
  }

  getCategories(): CommandCategory[] {
    return Array.from(this.categories.keys());
  }

  enable(commandName: string): boolean {
    const entry = this.commands.get(
      this.options.caseSensitive ? commandName : commandName.toLowerCase()
    );
    if (entry) {
      entry.isActive = true;
      this.logger.logInfo(`Command "${commandName}" enabled`);
      return true;
    }
    return false;
  }

  disable(commandName: string): boolean {
    const entry = this.commands.get(
      this.options.caseSensitive ? commandName : commandName.toLowerCase()
    );
    if (entry) {
      entry.isActive = false;
      this.logger.logInfo(`Command "${commandName}" disabled`);
      return true;
    }
    return false;
  }

  // Method to load all commands from directories
  loadCommands(): number {
    if (this.isLoaded) {
      this.logger.logInfo("Commands have already been loaded previously");
      return this.commands.size;
    }

    const baseCommandsPath = path.join(__dirname, "..");
    let loadedCount = 0;

    // Recursive function to load commands
    const loadCommandsFromDir = (dirPath: string): void => {
      try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const item of items) {
          const itemPath = path.join(dirPath, item.name);

          // If it's a directory, enter recursively (except core)
          if (item.isDirectory() && item.name !== "core") {
            loadCommandsFromDir(itemPath);
            continue;
          }

          // If it's a valid source file (filter out .d.ts files)
          if (
            item.isFile() &&
            ((item.name.endsWith(".ts") && !item.name.endsWith(".d.ts")) ||
              (item.name.endsWith(".js") && !item.name.endsWith(".d.ts"))) &&
            !item.name.startsWith("index.") &&
            !dirPath.endsWith("core")
          ) {
            try {
              // Clear cache if exists to allow reload
              delete require.cache[require.resolve(itemPath)];

              const CommandClass = require(itemPath);
              const ActualCommandClass = CommandClass.default || CommandClass;

              // Verify it's a valid class
              if (typeof ActualCommandClass === "function") {
                const commandInstance = new ActualCommandClass();
                if (this.register(commandInstance)) {
                  loadedCount++;
                }
              }
            } catch (error) {
              this.logger.logError(
                `Error loading command from ${itemPath}: ${error}`
              );
            }
          }
        }
      } catch (error) {
        this.logger.logError(`Error reading directory ${dirPath}: ${error}`);
      }
    };

    // Start loading from the base commands directory
    try {
      loadCommandsFromDir(baseCommandsPath);
      this.isLoaded = true;
      this.logger.logInfo(`Successfully loaded ${loadedCount} commands`);
    } catch (error) {
      this.logger.logError(`Error during command loading: ${error}`);
    }

    return loadedCount;
  }

  // Method to reload commands (useful during development)
  reloadCommands(): number {
    this.commands.clear();
    this.aliases.clear();
    this.categories.clear();
    this.isLoaded = false;

    return this.loadCommands();
  }

  // Method to get registry statistics
  getStats(): CommandRegistryStats {
    const enabledCommands = Array.from(this.commands.values()).filter(
      (entry) => entry.isActive
    );
    const categoryCounts = {} as Record<CommandCategory, number>;

    // Initialize category counts
    for (const category of this.categories.keys()) {
      categoryCounts[category] = 0;
    }

    // Count commands by category
    for (const entry of enabledCommands) {
      categoryCounts[entry.metadata.category]++;
    }

    // Get most used commands (only those with at least one execution)
    const sortedByUsage = enabledCommands
      .filter((entry) => entry.stats.executionCount > 0)
      .sort((a, b) => b.stats.executionCount - a.stats.executionCount)
      .slice(0, 5)
      .map((entry) => entry.metadata.name);

    return {
      totalCommands: enabledCommands.length,
      totalExecutions: enabledCommands.reduce(
        (sum, entry) => sum + entry.stats.executionCount,
        0
      ),
      averageResponseTime: this.calculateAverageResponseTime(enabledCommands),
      categoryCounts,
      mostUsedCommands: sortedByUsage,
    };
  }

  private createInitialStats(): CommandStats {
    return {
      executionCount: 0,
      lastExecuted: new Date(),
      avgResponseTime: 0,
      errorCount: 0,
      popularityScore: 0,
    };
  }

  private updateCommandStats(commandName: string): void {
    if (!this.options.enableStats) return;

    const entry = this.commands.get(commandName);
    if (entry) {
      entry.stats.executionCount++;
      entry.stats.lastExecuted = new Date();
      // Popularity score can be calculated based on frequency and recency
      entry.stats.popularityScore = entry.stats.executionCount * 0.1;
    }
  }

  private calculateAverageResponseTime(
    entries: CommandRegistryEntry[]
  ): number {
    if (entries.length === 0) return 0;

    const totalTime = entries.reduce(
      (sum, entry) => sum + entry.stats.avgResponseTime,
      0
    );
    return totalTime / entries.length;
  }
}

// Export a single instance for the entire application
export const commandRegistry = new CommandRegistry();
