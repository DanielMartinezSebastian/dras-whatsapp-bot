/**
 * Core Types for DrasBot
 *
 * Base types and interfaces used throughout the application
 */

/**
 * User Level Enum
 */
export enum UserLevel {
  BANNED = 'banned',
  USER = 'user', 
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  OWNER = 'owner'
}
export type UserType = 'normal' | 'block' | 'vip';
export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contact';

/**
 * Context Type Enum
 */
export enum ContextType {
  COMMAND = 'command',
  CONVERSATION = 'conversation',
  REGISTRATION = 'registration',
  SURVEY = 'survey',
  SUPPORT = 'support',
  CUSTOM = 'custom',
  GENERAL = 'general',
  CONFIGURATION = 'configuration'
}

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * User entity
 */
export interface User extends BaseEntity {
  phone: string;
  whatsapp_jid: string;
  display_name: string;
  user_level: UserLevel;
  level: UserLevel; // Alias for user_level
  user_type: UserType;
  language: string;
  is_registered: boolean;
  last_activity: string;
  preferences: UserPreferences;
  metadata: Record<string, any>;
}

/**
 * User preferences
 */
export interface UserPreferences {
  notifications: boolean;
  auto_reply: boolean;
  language: string;
  timezone: string;
  privacy_level: 'open' | 'normal' | 'strict';
  [key: string]: any;
}

/**
 * Message entity
 */
export interface Message extends BaseEntity {
  user_id: string;
  whatsapp_message_id: string;
  content: string;
  message_type: MessageType;
  is_from_bot: boolean;
  processed: boolean;
  response_to?: string;
  metadata: MessageMetadata;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  sender_name?: string;
  media_url?: string;
  media_filename?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  contact?: {
    name: string;
    phone: string;
  };
  [key: string]: any;
}

/**
 * Conversation context
 */
export interface ConversationContext extends BaseEntity {
  user_id: string;
  context_type: ContextType;
  context_data: Record<string, any>;
  is_active: boolean;
  expires_at?: string;
  step_index: number;
  metadata: Record<string, any>;
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  command?: string;
  executionTime?: number;
  response?: ResponseMessage | string;
  context?: Partial<ConversationContext>;
  metadata?: Record<string, any>;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  category: 'command' | 'context' | 'service' | 'utility';
  dependencies?: string[];
  permissions?: string[];
  config?: Record<string, any>;
}

/**
 * Configuration types
 */
export interface BotConfig {
  name: string;
  prefix: string;
  language: string;
  timezone: string;
  features: {
    plugins: boolean;
    contexts: boolean;
    web_panel: boolean;
    api: boolean;
  };
  performance: {
    message_polling_interval: number;
    context_cleanup_interval: number;
    cache_ttl: number;
  };
  security: {
    rate_limit_window: number;
    rate_limit_max_requests: number;
    allowed_origins?: string[];
  };
  userLevels?: Record<string, any>;
  messages?: Record<string, any>;
  paths?: {
    config: string;
    data: string;
    logs: string;
    plugins: string;
  };
}

/**
 * Database query options
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  where?: Record<string, any>;
}

/**
 * Service status
 */
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime?: number;
  memory_usage?: number;
  cpu_usage?: number;
  last_error?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  request_id?: string;
}

/**
 * Processing stages
 */
export type ProcessingStage =
  | 'validation'
  | 'user_identification'
  | 'context_detection'
  | 'command_processing'
  | 'response_generation'
  | 'completed'
  | 'error';

/**
 * Processing pipeline configuration
 */
export interface ProcessingPipelineConfig {
  maxConcurrentProcessing: number;
  processingTimeout: number;
  retryFailedMessages: boolean;
  maxRetries: number;
  queueSize: number;
  enableMetrics: boolean;
}

/**
 * Processing result
 */
export interface ProcessingResult {
  success: boolean;
  processingId: string;
  processingTime: number;
  results: CommandResult[];
  errors?: Error[];
  user?: User | null;
  message?: Message | null;
  context?: ConversationContext | null;
}

/**
 * Response types
 */
export interface ResponseMessage {
  type: 'text' | 'media' | 'document' | 'location';
  content: string;
  mediaPath?: string;
  metadata: Record<string, any>;
}

/**
 * Enhanced command result with proper response structure
 */
export interface EnhancedCommandResult {
  success: boolean;
  command: string;
  executionTime: number;
  response?: ResponseMessage;
  data?: Record<string, any>;
  error?: string;
}

// Plugin System Types
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  category: 'command' | 'context' | 'middleware' | 'utility';
  priority: number;
  dependencies?: string[];
  config?: Record<string, any>;
}

export interface PluginContext {
  user: User;
  message: Message;
  conversationContext?: ConversationContext;
  config: any; // ConfigService
  database: any; // DatabaseService  
  logger: any; // Logger
  whatsappBridge: any; // WhatsAppBridgeService
}

export interface Plugin {
  info: PluginInfo;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  execute(context: PluginContext): Promise<CommandResult>;
  validateConfig?(config: Record<string, any>): boolean;
}

export interface Command {
  name: string;
  aliases: string[];
  description: string;
  category: string;
  userLevel: UserLevel;
  cooldown?: number;
  parameters?: CommandParameter[];
  examples?: string[];
  enabled: boolean;
  plugin: string;
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'user' | 'text';
  required: boolean;
  description: string;
  validation?: RegExp;
  defaultValue?: any;
}

export interface CommandRegistry {
  [key: string]: Command;
}

export interface ContextHandler {
  name: string;
  description: string;
  priority: number;
  patterns: RegExp[];
  userLevel: UserLevel;
  plugin: string;
  execute(context: PluginContext): Promise<CommandResult>;
}

export interface ContextRegistry {
  [key: string]: ContextHandler;
}

export interface PluginManager {
  loadPlugin(pluginPath: string): Promise<Plugin>;
  unloadPlugin(pluginName: string): Promise<void>;
  getPlugin(name: string): Plugin | null;
  getAllPlugins(): Plugin[];
  getEnabledPlugins(): Plugin[];
  enablePlugin(name: string): Promise<void>;
  disablePlugin(name: string): Promise<void>;
  reloadPlugin(name: string): Promise<void>;
  validateDependencies(plugin: Plugin): boolean;
}

export interface MiddlewareHandler {
  name: string;
  priority: number;
  execute(context: PluginContext, next: () => Promise<CommandResult>): Promise<CommandResult>;
}

export interface PluginConfig {
  pluginsDirectory: string;
  autoLoad: boolean;
  enabledPlugins: string[];
  disabledPlugins: string[];
  pluginConfigs: Record<string, Record<string, any>>;
}
