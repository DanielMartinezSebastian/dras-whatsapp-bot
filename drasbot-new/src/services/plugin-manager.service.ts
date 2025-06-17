/**
 * Plugin Manager Service
 * 
 * Manages the plugin ecosystem for the WhatsApp bot.
 * Handles plugin loading, unloading, dependency resolution, and lifecycle management.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../utils/logger';
import { ConfigService } from './config.service';
import { DatabaseService } from './database.service';
import { WhatsAppBridgeService } from './whatsapp-bridge.service';
import {
  Plugin,
  PluginConfig,
  PluginContext,
  PluginManager as IPluginManager,
  CommandResult,
  User,
  Message,
  ConversationContext
} from '../types';

export class PluginManagerService implements IPluginManager {
  private static instance: PluginManagerService;
  private logger: Logger;
  private config: ConfigService;
  private database: DatabaseService;
  private whatsappBridge: WhatsAppBridgeService;
  
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private pluginDependencies: Map<string, string[]> = new Map();
  private pluginConfig: PluginConfig;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigService.getInstance();
    this.database = DatabaseService.getInstance();
    this.whatsappBridge = WhatsAppBridgeService.getInstance();
    
    this.pluginConfig = {
      pluginsDirectory: './plugins',
      autoLoad: true,
      enabledPlugins: [],
      disabledPlugins: [],
      pluginConfigs: {}
    };
  }

  public static getInstance(): PluginManagerService {
    if (!PluginManagerService.instance) {
      PluginManagerService.instance = new PluginManagerService();
    }
    return PluginManagerService.instance;
  }

  /**
   * Initialize the Plugin Manager
   */
  public async initialize(): Promise<void> {
    this.logger.info('PluginManager', 'Initializing Plugin Manager...');

    try {
      // Load plugin configuration
      this.pluginConfig = this.config.getValue('plugins', this.pluginConfig);
      
      // Ensure plugins directory exists
      await this.ensurePluginDirectory();
      
      // Auto-load plugins if enabled
      if (this.pluginConfig.autoLoad) {
        await this.loadAllPlugins();
      }

      this.logger.info('PluginManager', `Plugin Manager initialized with ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('PluginManager', 'Failed to initialize Plugin Manager', { error });
      throw error;
    }
  }

  /**
   * Load a plugin from file path
   */
  public async loadPlugin(pluginPath: string): Promise<Plugin> {
    this.logger.debug('PluginManager', `Loading plugin from: ${pluginPath}`);

    try {
      // Resolve absolute path
      const absolutePath = path.resolve(pluginPath);
      
      // Check if file exists
      await fs.access(absolutePath);
      
      // Dynamic import of the plugin
      const pluginModule = await import(absolutePath);
      const PluginClass = pluginModule.default || pluginModule;
      
      if (!PluginClass) {
        throw new Error('Plugin does not export a default class');
      }
      
      // Create plugin instance
      const plugin: Plugin = new PluginClass();
      
      // Validate plugin interface
      this.validatePluginInterface(plugin);
      
      // Check for conflicts
      if (this.plugins.has(plugin.info.name)) {
        throw new Error(`Plugin '${plugin.info.name}' is already loaded`);
      }
      
      // Validate dependencies
      if (!this.validateDependencies(plugin)) {
        throw new Error(`Plugin '${plugin.info.name}' has unmet dependencies`);
      }
      
      // Initialize plugin
      await plugin.initialize();
      
      // Register plugin
      this.plugins.set(plugin.info.name, plugin);
      this.pluginDependencies.set(plugin.info.name, plugin.info.dependencies || []);
      
      // Enable plugin if it's in the enabled list
      if (this.pluginConfig.enabledPlugins.includes(plugin.info.name)) {
        this.enabledPlugins.add(plugin.info.name);
      }

      this.logger.info('PluginManager', `Plugin '${plugin.info.name}' loaded successfully`, {
        version: plugin.info.version,
        category: plugin.info.category
      });

      return plugin;
    } catch (error) {
      this.logger.error('PluginManager', `Failed to load plugin from '${pluginPath}'`, { error });
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  public async unloadPlugin(pluginName: string): Promise<void> {
    this.logger.debug('PluginManager', `Unloading plugin: ${pluginName}`);

    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' is not loaded`);
    }

    try {
      // Check for dependent plugins
      const dependentPlugins = this.getDependentPlugins(pluginName);
      if (dependentPlugins.length > 0) {
        throw new Error(`Cannot unload plugin '${pluginName}'. Other plugins depend on it: ${dependentPlugins.join(', ')}`);
      }

      // Shutdown plugin
      await plugin.shutdown();
      
      // Remove from registries
      this.plugins.delete(pluginName);
      this.enabledPlugins.delete(pluginName);
      this.pluginDependencies.delete(pluginName);

      this.logger.info('PluginManager', `Plugin '${pluginName}' unloaded successfully`);
    } catch (error) {
      this.logger.error('PluginManager', `Failed to unload plugin '${pluginName}'`, { error });
      throw error;
    }
  }

  /**
   * Get a specific plugin
   */
  public getPlugin(name: string): Plugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * Get all loaded plugins
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins only
   */
  public getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      this.enabledPlugins.has(plugin.info.name)
    );
  }

  /**
   * Enable a plugin
   */
  public async enablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not loaded`);
    }

    if (this.enabledPlugins.has(name)) {
      this.logger.warn('PluginManager', `Plugin '${name}' is already enabled`);
      return;
    }

    // Check dependencies
    if (!this.validateDependencies(plugin)) {
      throw new Error(`Cannot enable plugin '${name}'. Dependencies are not met`);
    }

    this.enabledPlugins.add(name);
    this.logger.info('PluginManager', `Plugin '${name}' enabled`);
  }

  /**
   * Disable a plugin
   */
  public async disablePlugin(name: string): Promise<void> {
    if (!this.enabledPlugins.has(name)) {
      this.logger.warn('PluginManager', `Plugin '${name}' is already disabled`);
      return;
    }

    // Check for dependent plugins
    const dependentPlugins = this.getDependentPlugins(name);
    if (dependentPlugins.length > 0) {
      throw new Error(`Cannot disable plugin '${name}'. Other plugins depend on it: ${dependentPlugins.join(', ')}`);
    }

    this.enabledPlugins.delete(name);
    this.logger.info('PluginManager', `Plugin '${name}' disabled`);
  }

  /**
   * Reload a plugin
   */
  public async reloadPlugin(name: string): Promise<void> {
    this.logger.info('PluginManager', `Reloading plugin: ${name}`);

    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' is not loaded`);
    }

    const wasEnabled = this.enabledPlugins.has(name);

    try {
      // Unload plugin
      await this.unloadPlugin(name);
      
      // Find plugin file path (this is a simplified approach)
      const pluginPath = path.join(this.pluginConfig.pluginsDirectory, `${name}.plugin.js`);
      
      // Reload plugin
      await this.loadPlugin(pluginPath);
      
      // Re-enable if it was enabled before
      if (wasEnabled) {
        await this.enablePlugin(name);
      }

      this.logger.info('PluginManager', `Plugin '${name}' reloaded successfully`);
    } catch (error) {
      this.logger.error('PluginManager', `Failed to reload plugin '${name}'`, { error });
      throw error;
    }
  }

  /**
   * Validate plugin dependencies
   */
  public validateDependencies(plugin: Plugin): boolean {
    if (!plugin.info.dependencies || plugin.info.dependencies.length === 0) {
      return true;
    }

    for (const dependency of plugin.info.dependencies) {
      const dependencyPlugin = this.plugins.get(dependency);
      if (!dependencyPlugin || !this.enabledPlugins.has(dependency)) {
        this.logger.warn('PluginManager', `Plugin '${plugin.info.name}' has unmet dependency: ${dependency}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a plugin in a given context
   */
  public async executePlugin(pluginName: string, context: PluginContext): Promise<CommandResult> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' is not loaded`);
    }

    if (!this.enabledPlugins.has(pluginName)) {
      throw new Error(`Plugin '${pluginName}' is not enabled`);
    }

    try {
      const startTime = Date.now();
      const result = await plugin.execute(context);
      const executionTime = Date.now() - startTime;

      this.logger.debug('PluginManager', `Plugin '${pluginName}' executed`, {
        executionTime,
        success: result.success
      });

      return result;
    } catch (error) {
      this.logger.error('PluginManager', `Plugin '${pluginName}' execution failed`, { error });
      throw error;
    }
  }

  /**
   * Create plugin context
   */
  public createPluginContext(
    user: User,
    message: Message,
    conversationContext?: ConversationContext
  ): PluginContext {
    const contextObj: any = {
      user,
      message,
      config: this.config,
      database: this.database,
      logger: this.logger,
      whatsappBridge: this.whatsappBridge
    };

    if (conversationContext) {
      contextObj.conversationContext = conversationContext;
    }

    return contextObj as PluginContext;
  }

  /**
   * Get plugin statistics
   */
  public getPluginStats(): Record<string, any> {
    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: this.enabledPlugins.size,
      disabledPlugins: this.plugins.size - this.enabledPlugins.size,
      categories: this.getPluginsByCategory(),
      dependencies: Object.fromEntries(this.pluginDependencies)
    };
  }

  /**
   * Private helper methods
   */

  private async ensurePluginDirectory(): Promise<void> {
    try {
      await fs.access(this.pluginConfig.pluginsDirectory);
    } catch {
      await fs.mkdir(this.pluginConfig.pluginsDirectory, { recursive: true });
      this.logger.info('PluginManager', `Created plugins directory: ${this.pluginConfig.pluginsDirectory}`);
    }
  }

  private async loadAllPlugins(): Promise<void> {
    try {
      const files = await fs.readdir(this.pluginConfig.pluginsDirectory);
      const pluginFiles = files.filter(file => file.endsWith('.plugin.js'));

      for (const file of pluginFiles) {
        const pluginPath = path.join(this.pluginConfig.pluginsDirectory, file);
        try {
          await this.loadPlugin(pluginPath);
        } catch (error) {
          this.logger.error('PluginManager', `Failed to auto-load plugin: ${file}`, { error });
        }
      }
    } catch (error) {
      this.logger.error('PluginManager', 'Failed to auto-load plugins', { error });
    }
  }

  private validatePluginInterface(plugin: any): void {
    if (!plugin.info || typeof plugin.info !== 'object') {
      throw new Error('Plugin must have an info property');
    }

    const requiredFields = ['name', 'version', 'description', 'author', 'category'];
    for (const field of requiredFields) {
      if (!plugin.info[field]) {
        throw new Error(`Plugin info must have a '${field}' field`);
      }
    }

    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin must have an initialize method');
    }

    if (typeof plugin.shutdown !== 'function') {
      throw new Error('Plugin must have a shutdown method');
    }

    if (typeof plugin.execute !== 'function') {
      throw new Error('Plugin must have an execute method');
    }
  }

  private getDependentPlugins(pluginName: string): string[] {
    const dependents: string[] = [];
    
    for (const [name, dependencies] of this.pluginDependencies) {
      if (dependencies.includes(pluginName)) {
        dependents.push(name);
      }
    }
    
    return dependents;
  }

  private getPluginsByCategory(): Record<string, number> {
    const categories: Record<string, number> = {};
    
    for (const plugin of this.plugins.values()) {
      const category = plugin.info.category;
      categories[category] = (categories[category] || 0) + 1;
    }
    
    return categories;
  }
}
