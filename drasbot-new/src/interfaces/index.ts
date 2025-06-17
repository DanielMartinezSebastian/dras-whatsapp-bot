/**
 * Core Interfaces for DrasBot Plugin System
 */

import {
  User,
  Message,
  ConversationContext,
  CommandResult,
  PluginMetadata,
  BotConfig,
} from '../types';

/**
 * Command interface
 */
export interface ICommand {
  readonly metadata: PluginMetadata;
  readonly config: CommandConfig;

  execute(message: Message, user: User, args: string[]): Promise<CommandResult>;
  validatePermissions(user: User): boolean;
  getUsage(): string;
}

/**
 * Command configuration
 */
export interface CommandConfig {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  category: 'admin' | 'general' | 'user' | 'premium';
  min_user_level: User['user_level'];
  rate_limit?: {
    requests: number;
    window: number; // milliseconds
  };
  enabled: boolean;
}

/**
 * Context Handler interface
 */
export interface IContextHandler {
  readonly metadata: PluginMetadata;
  readonly config: ContextConfig;

  enter(
    user: User,
    initialData?: Record<string, any>
  ): Promise<ConversationContext>;
  process(
    context: ConversationContext,
    message: Message,
    user: User
  ): Promise<CommandResult>;
  exit(context: ConversationContext, user: User): Promise<void>;
  validateStep(context: ConversationContext, input: string): boolean;
  getNextStep(context: ConversationContext): ContextStep | null;
}

/**
 * Context configuration
 */
export interface ContextConfig {
  name: string;
  description: string;
  max_duration: number; // milliseconds
  auto_exit_on_timeout: boolean;
  steps: ContextStep[];
  completion_reward?: {
    points?: number;
    badge?: string;
    unlock?: string[];
  };
}

/**
 * Context step definition
 */
export interface ContextStep {
  id: string;
  name: string;
  message_key: string;
  validation?: {
    type: 'text' | 'number' | 'email' | 'phone' | 'choice' | 'regex';
    pattern?: string;
    choices?: string[];
    min_length?: number;
    max_length?: number;
    required: boolean;
  };
  next_step?: string | ((data: Record<string, any>) => string);
  on_complete?: (data: Record<string, any>) => Promise<void>;
}

/**
 * Plugin loader interface
 */
export interface IPluginLoader {
  loadCommands(): Promise<Map<string, ICommand>>;
  loadContexts(): Promise<Map<string, IContextHandler>>;
  reloadPlugin(name: string): Promise<boolean>;
  unloadPlugin(name: string): Promise<boolean>;
  getLoadedPlugins(): PluginMetadata[];
}

/**
 * Message processor interface
 */
export interface IMessageProcessor {
  processMessage(message: Message, user: User): Promise<CommandResult>;
  isCommand(content: string): boolean;
  parseCommand(content: string): { command: string; args: string[] };
  executeCommand(
    command: string,
    message: Message,
    user: User,
    args: string[]
  ): Promise<CommandResult>;
}

/**
 * Context manager interface
 */
export interface IContextManager {
  getContext(userId: string): Promise<ConversationContext | null>;
  setContext(context: ConversationContext): Promise<void>;
  clearContext(userId: string): Promise<void>;
  processContextMessage(
    context: ConversationContext,
    message: Message,
    user: User
  ): Promise<CommandResult>;
  isContextActive(userId: string): Promise<boolean>;
  cleanupExpiredContexts(): Promise<number>;
}

/**
 * Database service interface
 */
export interface IDatabaseService {
  initialize(): Promise<void>;
  close(): Promise<void>;
  createUser(
    user: Omit<User, 'id' | 'created_at' | 'updated_at'>
  ): Promise<User>;
  getUserByPhone(phone: string): Promise<User | null>;
  getUserByJid(jid: string): Promise<User | null>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  saveMessage(
    message: Omit<Message, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Message>;
  getContext(userId: string): Promise<ConversationContext | null>;
  saveContext(context: ConversationContext): Promise<void>;
  deleteContext(userId: string): Promise<void>;
  migrate(): Promise<void>;
}

/**
 * WhatsApp client interface
 */
export interface IWhatsAppClient {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sendMessage(jid: string, content: string): Promise<boolean>;
  sendMedia(jid: string, mediaPath: string, caption?: string): Promise<boolean>;
  isConnected(): boolean;
  getStatus(): { connected: boolean; authenticated: boolean; phone?: string };
  onMessage(callback: (message: Message) => void): void;
  onStatusChange(callback: (status: any) => void): void;
}

/**
 * Config service interface
 */
export interface IConfigService {
  getConfig(): BotConfig;
  getMessage(
    key: string,
    language?: string,
    params?: Record<string, any>
  ): string;
  getCommandConfig(commandName: string): CommandConfig | null;
  getContextConfig(contextName: string): ContextConfig | null;
  reloadConfig(): Promise<void>;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error | any, ...args: any[]): void;
}

/**
 * Event emitter interface
 */
export interface IEventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): boolean;
  once(event: string, listener: (...args: any[]) => void): void;
}

/**
 * Plugin registry interface
 */
export interface IPluginRegistry {
  register(plugin: ICommand | IContextHandler): void;
  unregister(name: string): void;
  get(name: string): ICommand | IContextHandler | undefined;
  getAll(): (ICommand | IContextHandler)[];
  getByCategory(category: string): (ICommand | IContextHandler)[];
}
