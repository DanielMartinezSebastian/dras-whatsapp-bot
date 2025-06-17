/**
 * Configuration Service
 * Manages bot configuration with hot-reload capabilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { BotConfig } from '../types';

export class ConfigService {
  private static instance: ConfigService;
  private config: BotConfig | null = null;
  private configPath: string;
  private logger: Logger;
  private watchers: Map<string, fs.FSWatcher> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.configPath =
      process.env.CONFIG_PATH || path.join(process.cwd(), 'config');
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      this.setupConfigWatchers();
      this.logger.info(
        'ConfigService',
        'Configuration service initialized successfully'
      );
    } catch (error) {
      this.logger.error(
        'ConfigService',
        'Failed to initialize configuration service',
        error
      );
      throw error;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      // Load main config
      const mainConfigPath = path.join(this.configPath, 'main.json');
      if (!fs.existsSync(mainConfigPath)) {
        throw new Error(`Main configuration file not found: ${mainConfigPath}`);
      }

      const mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf-8'));

      // Load user levels
      const userLevelsPath = path.join(this.configPath, 'user-levels.json');
      const userLevels = fs.existsSync(userLevelsPath)
        ? JSON.parse(fs.readFileSync(userLevelsPath, 'utf-8'))
        : {};

      // Load messages
      const messagesPath = path.join(this.configPath, 'messages', 'es.json');
      const messages = fs.existsSync(messagesPath)
        ? JSON.parse(fs.readFileSync(messagesPath, 'utf-8'))
        : {};

      // Merge configurations
      this.config = {
        ...mainConfig,
        userLevels,
        messages,
        paths: {
          config: this.configPath,
          data: path.join(process.cwd(), 'data'),
          logs: path.join(process.cwd(), 'logs'),
          plugins: path.join(process.cwd(), 'src', 'plugins'),
        },
      };

      this.logger.info('ConfigService', 'Configuration loaded successfully');
    } catch (error) {
      this.logger.error('ConfigService', 'Failed to load configuration', error);
      throw error;
    }
  }

  private setupConfigWatchers(): void {
    const watchPaths = [
      path.join(this.configPath, 'main.json'),
      path.join(this.configPath, 'user-levels.json'),
      path.join(this.configPath, 'messages', 'es.json'),
    ];

    watchPaths.forEach(watchPath => {
      if (fs.existsSync(watchPath)) {
        const watcher = fs.watch(watchPath, eventType => {
          if (eventType === 'change') {
            this.logger.info(
              'ConfigService',
              `Configuration file changed: ${watchPath}`
            );
            this.reloadConfig();
          }
        });
        this.watchers.set(watchPath, watcher);
      }
    });
  }

  private async reloadConfig(): Promise<void> {
    try {
      await this.loadConfig();
      this.logger.info('ConfigService', 'Configuration reloaded successfully');
    } catch (error) {
      this.logger.error(
        'ConfigService',
        'Failed to reload configuration',
        error
      );
    }
  }

  public getConfig(): BotConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call initialize() first.');
    }
    return this.config;
  }

  public getValue<T>(path: string, defaultValue?: T): T {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call initialize() first.');
    }

    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  public updateValue(path: string, value: any): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call initialize() first.');
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let target: any = this.config;

    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    if (lastKey) {
      target[lastKey] = value;
      this.logger.info(
        'ConfigService',
        `Configuration value updated: ${path} = ${JSON.stringify(value)}`
      );
    }
  }

  public async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call initialize() first.');
    }

    try {
      const mainConfigPath = path.join(this.configPath, 'main.json');
      const { userLevels, messages, paths, ...mainConfig } = this.config;

      // Save main config
      fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfig, null, 2));

      // Save user levels
      const userLevelsPath = path.join(this.configPath, 'user-levels.json');
      fs.writeFileSync(userLevelsPath, JSON.stringify(userLevels, null, 2));

      // Save messages
      const messagesPath = path.join(this.configPath, 'messages', 'es.json');
      if (!fs.existsSync(path.dirname(messagesPath))) {
        fs.mkdirSync(path.dirname(messagesPath), { recursive: true });
      }
      fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));

      this.logger.info('ConfigService', 'Configuration saved successfully');
    } catch (error) {
      this.logger.error('ConfigService', 'Failed to save configuration', error);
      throw error;
    }
  }

  public cleanup(): void {
    this.watchers.forEach((watcher, path) => {
      watcher.close();
      this.logger.debug(
        'ConfigService',
        `Stopped watching configuration file: ${path}`
      );
    });
    this.watchers.clear();
  }
}

export default ConfigService;
