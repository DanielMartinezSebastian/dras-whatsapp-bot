/**
 * Core Types for DrasBot
 * 
 * Base types and interfaces used throughout the application
 */

export type UserLevel = 'guest' | 'user' | 'premium' | 'admin' | 'super_admin';
export type UserType = 'normal' | 'block' | 'vip';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact';
export type ContextType = 'command' | 'conversation' | 'registration' | 'survey' | 'support' | 'custom';

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
  response: string;
  context?: Partial<ConversationContext>;
  metadata?: Record<string, any>;
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
