/**
 * Context Manager Service
 *
 * Manages conversation contexts, context handlers, and context-based responses.
 * Handles context detection, persistence, and context-aware message processing.
 */

import { Logger } from '../utils/logger';
import { ConfigService } from './config.service';
import { DatabaseService } from './database.service';
import { PluginManagerService } from './plugin-manager.service';
import {
  ContextHandler,
  ContextRegistry,
  CommandResult,
  PluginContext,
  UserLevel,
  User,
  Message,
  ContextType,
} from '../types';

export interface ContextDetectionResult {
  detected: boolean;
  handler: ContextHandler | null;
  confidence: number;
  metadata: Record<string, any>;
}

export interface ContextState {
  id: string;
  userId: string;
  contextType: ContextType;
  data: Record<string, any>;
  createdAt: Date;
  lastInteraction: Date;
  expiresAt?: Date;
  active: boolean;
}

export interface ContextConfig {
  timeout: number;
  maxActiveContexts: number;
  cleanupInterval: number;
}

export class ContextManagerService {
  private static instance: ContextManagerService;
  private logger: Logger;
  private config: ConfigService;
  // @ts-ignore - Will be used in future database implementations
  private _database: DatabaseService; // TODO: Use when implementing database persistence
  // @ts-ignore - Will be used in future plugin implementations
  private _pluginManager: PluginManagerService; // TODO: Use when implementing plugin integration

  private contextHandlers: ContextRegistry = {};
  private activeContexts: Map<string, ContextState> = new Map();
  private contextConfig: ContextConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private detectionCounter: number = 0;
  private executionCounter: number = 0;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigService.getInstance();
    this._database = DatabaseService.getInstance();
    this._pluginManager = PluginManagerService.getInstance();

    this.contextConfig = {
      timeout: 300000, // 5 minutes
      maxActiveContexts: 100,
      cleanupInterval: 60000, // 1 minute
    };
  }

  public static getInstance(): ContextManagerService {
    if (!ContextManagerService.instance) {
      ContextManagerService.instance = new ContextManagerService();
    }
    return ContextManagerService.instance;
  }

  /**
   * Initialize the Context Manager
   */
  public async initialize(): Promise<void> {
    this.logger.info('ContextManager', 'Initializing Context Manager...');

    try {
      // Load configuration
      const configData = this.config.getValue(
        'context',
        {}
      ) as Partial<ContextConfig>;
      this.contextConfig = { ...this.contextConfig, ...configData };

      // Start context cleanup timer
      this.startContextCleanup();

      // Register default handlers
      await this.registerDefaultHandlers();

      this.logger.info('ContextManager', `✅ Context Manager initialized`, {
        timeout: this.contextConfig.timeout,
        maxActiveContexts: this.contextConfig.maxActiveContexts,
        registeredHandlers: Object.keys(this.contextHandlers).length,
      });
    } catch (error) {
      this.logger.error(
        'ContextManager',
        'Failed to initialize Context Manager',
        { error }
      );
      throw error;
    }
  }

  /**
   * Register a context handler
   */
  public registerHandler(handler: ContextHandler): boolean {
    try {
      const handlerKey = this.getHandlerKey(handler);

      if (this.contextHandlers[handlerKey]) {
        this.logger.warn(
          'ContextManager',
          `Context handler '${handlerKey}' is already registered`
        );
        return false;
      }

      this.contextHandlers[handlerKey] = handler;
      this.logger.info(
        'ContextManager',
        `Registered context handler: ${handlerKey}`
      );
      return true;
    } catch (error) {
      this.logger.error(
        'ContextManager',
        'Failed to register context handler',
        { error }
      );
      return false;
    }
  }

  /**
   * Get a context handler by type
   */
  public getHandler(contextType: ContextType): ContextHandler | null {
    for (const handler of Object.values(this.contextHandlers)) {
      if (this.getHandlerContextType(handler) === contextType) {
        return handler;
      }
    }
    return null;
  }

  /**
   * Get all registered handlers
   */
  public getRegisteredHandlers(): ContextHandler[] {
    return Object.values(this.contextHandlers);
  }

  /**
   * Unregister a context handler
   */
  public unregisterHandler(contextType: ContextType): boolean {
    const handler = this.getHandler(contextType);
    if (!handler) {
      return false;
    }

    const handlerKey = this.getHandlerKey(handler);
    delete this.contextHandlers[handlerKey];
    this.logger.info(
      'ContextManager',
      `Unregistered context handler: ${handlerKey}`
    );
    return true;
  }

  /**
   * Detect context from message content
   */
  public async detectContext(
    content: string,
    user: User
  ): Promise<ContextDetectionResult> {
    try {
      this.detectionCounter++;

      let bestMatch: ContextHandler | null = null;
      let bestConfidence = 0;
      let bestMetadata: Record<string, any> = {};

      const lowerContent = content.toLowerCase();

      for (const handler of Object.values(this.contextHandlers)) {
        // Check user level requirements
        const requiredLevel = this.getHandlerRequiredLevel(handler);
        if (
          this.getUserLevelValue(user.userLevel) <
          this.getUserLevelValue(requiredLevel)
        ) {
          continue;
        }

        // Check keywords if defined
        const keywords = this.getHandlerKeywords(handler);
        if (keywords && keywords.length > 0) {
          let keywordMatches = 0;
          const foundKeywords: string[] = [];

          for (const keyword of keywords) {
            if (lowerContent.includes(keyword.toLowerCase())) {
              keywordMatches++;
              foundKeywords.push(keyword);
            }
          }

          if (keywordMatches > 0) {
            const confidence = keywordMatches / keywords.length;
            if (confidence > bestConfidence) {
              bestMatch = handler;
              bestConfidence = confidence;
              bestMetadata = {
                matchedKeywords: foundKeywords,
                totalKeywords: keywords.length,
              };
            }
          }
        }
      }

      return {
        detected: bestMatch !== null,
        handler: bestMatch,
        confidence: bestConfidence,
        metadata: bestMetadata,
      };
    } catch (error) {
      this.logger.error('ContextManager', 'Failed to detect context', {
        error,
        content: content.substring(0, 50),
      });
      return {
        detected: false,
        handler: null,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Create a new context
   */
  public async createContext(
    userId: string,
    contextType: ContextType,
    data: Record<string, any> = {}
  ): Promise<ContextState> {
    const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.contextConfig.timeout);

    const context: ContextState = {
      id: contextId,
      userId,
      contextType,
      data,
      createdAt: now,
      lastInteraction: now,
      expiresAt,
      active: true,
    };

    this.activeContexts.set(contextId, context);

    this.logger.info(
      'ContextManager',
      `Created context ${contextId} for user ${userId}`,
      {
        contextType,
        expiresAt: expiresAt.toISOString(),
      }
    );

    return context;
  }

  /**
   * Get active context for user
   */
  public async getActiveContext(userId: string): Promise<ContextState | null> {
    for (const context of this.activeContexts.values()) {
      if (
        context.userId === userId &&
        context.active &&
        new Date() < (context.expiresAt || new Date())
      ) {
        return context;
      }
    }
    return null;
  }

  /**
   * Update context data
   */
  public async updateContext(
    contextId: string,
    data: Record<string, any>
  ): Promise<boolean> {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      return false;
    }

    context.data = { ...context.data, ...data };
    context.lastInteraction = new Date();

    this.logger.debug('ContextManager', `Updated context ${contextId}`, {
      data,
    });
    return true;
  }

  /**
   * Expire a context
   */
  public async expireContext(contextId: string): Promise<boolean> {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      return false;
    }

    context.active = false;
    this.activeContexts.delete(contextId);

    this.logger.info('ContextManager', `Expired context ${contextId}`);
    return true;
  }

  /**
   * Clear all contexts for a user
   */
  public async clearUserContexts(userId: string): Promise<boolean> {
    let cleared = 0;

    for (const [contextId, context] of this.activeContexts.entries()) {
      if (context.userId === userId) {
        this.activeContexts.delete(contextId);
        cleared++;
      }
    }

    this.logger.info(
      'ContextManager',
      `Cleared ${cleared} contexts for user ${userId}`
    );
    return cleared > 0;
  }

  /**
   * Get context configuration
   */
  public getConfig(): ContextConfig {
    return { ...this.contextConfig };
  }

  /**
   * Update context configuration
   */
  public updateConfig(config: Partial<ContextConfig>): void {
    this.contextConfig = { ...this.contextConfig, ...config };
    this.logger.info(
      'ContextManager',
      'Context configuration updated',
      this.contextConfig
    );
  }

  /**
   * Get context statistics
   */
  public getStats(): {
    activeContexts: number;
    totalHandlers: number;
    totalDetections: number;
    totalExecutions: number;
  } {
    return {
      activeContexts: this.activeContexts.size,
      totalHandlers: Object.keys(this.contextHandlers).length,
      totalDetections: this.detectionCounter,
      totalExecutions: this.executionCounter,
    };
  }

  /**
   * Shutdown the context manager
   */
  public async shutdown(): Promise<void> {
    this.logger.info('ContextManager', 'Shutting down Context Manager...');

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Clear all active contexts
    this.activeContexts.clear();

    // Clear handlers
    this.contextHandlers = {};

    this.logger.info('ContextManager', '✅ Context Manager shut down');
  }

  /**
   * Execute a context handler with a message
   */
  public async executeContext(
    user: User,
    message: Message,
    contextState?: ContextState
  ): Promise<CommandResult> {
    try {
      this.executionCounter++;

      // Check if user has an active context
      let context =
        contextState || (await this.getActiveContext(user.id.toString()));

      if (!context) {
        // Try to detect new context
        const detection = await this.detectContext(message.content, user);

        if (detection.detected && detection.handler) {
          // Create new context
          context = await this.createContext(
            user.id.toString(),
            this.getHandlerContextType(detection.handler),
            {
              detectionMetadata: detection.metadata,
            }
          );

          this.logger.info(
            'ContextManager',
            `🔄 Created new context for user ${user.id}`,
            {
              contextType: context.contextType,
              confidence: detection.confidence,
            }
          );
        } else {
          // No context detected or available
          return {
            success: false,
            message: 'No hay un contexto activo disponible',
            data: {
              reason: 'no_context_available',
            },
          };
        }
      }

      // Get handler for this context
      const handler = this.getHandler(context.contextType);
      if (!handler) {
        this.logger.warn(
          'ContextManager',
          `No handler found for context type: ${context.contextType}`
        );
        await this.expireContext(context.id);
        return {
          success: false,
          message: 'El contexto ya no está disponible',
          data: {
            reason: 'handler_not_found',
            contextType: context.contextType,
          },
        };
      }

      // Update context with last interaction
      await this.updateContext(context.id, {
        lastMessage: message.content,
        messageCount: (context.data.messageCount || 0) + 1,
      });

      // Execute the handler
      const handlerResult = await this.executeContextHandler(
        handler,
        user,
        message,
        context
      );

      // Check if context should be expired after execution
      if (handlerResult.data?.expireContext) {
        await this.expireContext(context.id);
        this.logger.info(
          'ContextManager',
          `Context ${context.id} expired after handler execution`
        );
      }

      return handlerResult;
    } catch (error) {
      this.logger.error('ContextManager', 'Failed to execute context', {
        error,
        userId: user.id,
      });
      return {
        success: false,
        message: 'Error al procesar el contexto',
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Check if user has an active context and what type
   */
  public async getUserContextInfo(userId: string): Promise<{
    hasContext: boolean;
    contextType?: ContextType;
    contextId?: string;
    data?: Record<string, any>;
  }> {
    const context = await this.getActiveContext(userId);

    if (context) {
      return {
        hasContext: true,
        contextType: context.contextType,
        contextId: context.id,
        data: context.data,
      };
    }

    return {
      hasContext: false,
    };
  }

  /**
   * Force create a context of a specific type
   */
  public async createSpecificContext(
    userId: string,
    contextType: ContextType,
    initialData: Record<string, any> = {}
  ): Promise<ContextState> {
    // Clear any existing contexts for this user
    await this.clearUserContexts(userId);

    // Create new context
    const context = await this.createContext(userId, contextType, initialData);

    this.logger.info(
      'ContextManager',
      `Force created context ${contextType} for user ${userId}`,
      {
        contextId: context.id,
      }
    );

    return context;
  }

  /**
   * Register default system context handlers
   */
  public async registerDefaultHandlers(): Promise<void> {
    this.logger.info(
      'ContextManager',
      'Registering default context handlers...'
    );

    // Registration context handler
    const registrationHandler: ContextHandler = {
      name: 'registration_context',
      description: 'Handles user registration process',
      handler: async (
        message: Message,
        // @ts-ignore - context parameter needed for interface compatibility
        context: PluginContext
      ): Promise<CommandResult> => {
        const contextData = context.metadata?.contextData || {};
        const step = contextData.step || 'start';

        switch (step) {
          case 'start':
            // Update context to ask for name
            await this.updateContext(context.metadata?.contextId, {
              step: 'name',
            });
            return {
              success: true,
              message: '👋 ¡Hola! Para comenzar, ¿cuál es tu nombre?',
              data: { nextStep: 'name' },
            };

          case 'name':
            // Save name and ask for confirmation
            await this.updateContext(context.metadata?.contextId, {
              step: 'confirm',
              name: message.content.trim(),
            });
            return {
              success: true,
              message: `Perfecto, ${message.content.trim()}! ¿Confirmas tu registro? (sí/no)`,
              data: { nextStep: 'confirm' },
            };

          case 'confirm':
            const response = message.content.toLowerCase().trim();
            if (response === 'sí' || response === 'si' || response === 'yes') {
              return {
                success: true,
                message:
                  '✅ ¡Registro completado! Ya puedes usar todos los comandos disponibles.',
                data: {
                  nextStep: 'completed',
                  expireContext: true,
                  registrationCompleted: true,
                },
              };
            } else if (response === 'no' || response === 'not') {
              return {
                success: true,
                message:
                  '❌ Registro cancelado. Puedes comenzar de nuevo cuando quieras.',
                data: {
                  expireContext: true,
                  registrationCancelled: true,
                },
              };
            } else {
              return {
                success: true,
                message:
                  'Por favor responde "sí" o "no" para confirmar tu registro.',
                data: { nextStep: 'confirm' },
              };
            }

          default:
            return {
              success: false,
              message: 'Error en el proceso de registro. Inténtalo de nuevo.',
              data: { expireContext: true },
            };
        }
      },
      metadata: {
        keywords: ['registro', 'registrar', 'comenzar', 'empezar', 'start'],
        userLevel: UserLevel.USER,
      },
    };

    // Configuration context handler
    const configurationHandler: ContextHandler = {
      name: 'configuration_context',
      description: 'Handles user configuration changes',
      handler: async (
        message: Message,
        // @ts-ignore - context parameter needed for interface compatibility
        context: PluginContext
      ): Promise<CommandResult> => {
        const contextData = context.metadata?.contextData || {};
        const setting = contextData.setting;

        if (!setting) {
          return {
            success: false,
            message: 'Error: No se especificó qué configuración cambiar.',
            data: { expireContext: true },
          };
        }

        const value = message.content.trim();

        // TODO: Implement actual configuration saving to database
        await this.updateContext(context.metadata?.contextId, {
          [`${setting}_value`]: value,
          completed: true,
        });

        return {
          success: true,
          message: `✅ Configuración "${setting}" actualizada a: ${value}`,
          data: {
            expireContext: true,
            configurationUpdated: true,
            setting,
            value,
          },
        };
      },
      metadata: {
        keywords: ['configurar', 'config', 'ajustar', 'cambiar'],
        userLevel: UserLevel.USER,
      },
    };

    // Conversation context handler (basic)
    const conversationHandler: ContextHandler = {
      name: 'conversation_context',
      description: 'Handles general conversation flow',
      handler: async (
        message: Message,
        // @ts-ignore - context parameter needed for interface compatibility
        context: PluginContext
      ): Promise<CommandResult> => {
        // For now, just acknowledge the message and provide basic responses
        const responses = [
          'Entiendo. ¿Hay algo específico en lo que pueda ayudarte?',
          'Interesante. ¿Te gustaría usar algún comando específico?',
          'Comprendo. Escribe !help para ver todos los comandos disponibles.',
          'De acuerdo. ¿Necesitas ayuda con algo en particular?',
        ];

        const randomResponse =
          responses[Math.floor(Math.random() * responses.length)];

        return {
          success: true,
          message: randomResponse,
          data: {
            conversationType: 'general',
            messageLength: message.content.length,
          },
        };
      },
      metadata: {
        keywords: [], // No specific keywords - fallback handler
        userLevel: UserLevel.USER,
      },
    };

    // Register all handlers
    this.registerHandler(registrationHandler);
    this.registerHandler(configurationHandler);
    this.registerHandler(conversationHandler);

    this.logger.info(
      'ContextManager',
      '✅ Default context handlers registered',
      {
        handlersCount: Object.keys(this.contextHandlers).length,
      }
    );
  }

  /**
   * Private helper methods
   */

  private getHandlerKey(handler: ContextHandler): string {
    return handler.name || 'unknown';
  }

  private getHandlerContextType(handler: ContextHandler): ContextType {
    // Since ContextHandler doesn't have a type property, we'll try to infer it
    // from the handler name or metadata
    const name = handler.name.toLowerCase();

    if (name.includes('registration') || name.includes('register')) {
      return ContextType.REGISTRATION;
    } else if (name.includes('conversation') || name.includes('chat')) {
      return ContextType.CONVERSATION;
    } else if (name.includes('command') || name.includes('cmd')) {
      return ContextType.COMMAND_SEQUENCE;
    } else if (name.includes('config') || name.includes('setting')) {
      return ContextType.CONFIGURATION;
    }

    return ContextType.CONVERSATION; // Default
  }

  private getHandlerRequiredLevel(handler: ContextHandler): UserLevel {
    // Try to get required level from handler metadata or default to USER
    if ('userLevel' in handler) {
      return handler.userLevel as UserLevel;
    }

    // Also check metadata.userLevel
    if (
      'metadata' in handler &&
      handler.metadata &&
      typeof handler.metadata === 'object'
    ) {
      const metadata = handler.metadata as Record<string, any>;
      if (metadata.userLevel) {
        return metadata.userLevel as UserLevel;
      }
    }

    return UserLevel.USER;
  }

  private getHandlerKeywords(handler: ContextHandler): string[] | null {
    // Try to get keywords from handler metadata
    if (
      'metadata' in handler &&
      handler.metadata &&
      typeof handler.metadata === 'object'
    ) {
      const metadata = handler.metadata as Record<string, any>;
      if (metadata.keywords && Array.isArray(metadata.keywords)) {
        return metadata.keywords;
      }
    }
    return null;
  }

  private getUserLevelValue(level: UserLevel): number {
    switch (level) {
      case UserLevel.BANNED:
        return 0;
      case UserLevel.USER:
        return 1;
      case UserLevel.MODERATOR:
        return 2;
      case UserLevel.ADMIN:
        return 3;
      case UserLevel.OWNER:
        return 4;
      default:
        return 1;
    }
  }

  private startContextCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredContexts();
    }, this.contextConfig.cleanupInterval);
  }

  private cleanupExpiredContexts(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [contextId, context] of this.activeContexts.entries()) {
      if (context.expiresAt && now > context.expiresAt) {
        this.activeContexts.delete(contextId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(
        'ContextManager',
        `Cleaned up ${cleaned} expired contexts`
      );
    }
  }

  /**
   * Execute a specific context handler
   */
  private async executeContextHandler(
    handler: ContextHandler,
    user: User,
    message: Message,
    context: ContextState
  ): Promise<CommandResult> {
    try {
      // Create plugin context for the handler
      const pluginContext: PluginContext = {
        user,
        config: this.config,
        logger: this.logger,
        database: this._database,
        whatsappBridge: null, // Will be set by MessageProcessor
        metadata: {
          contextId: context.id,
          contextType: context.contextType,
          contextData: context.data,
        },
      };

      // Execute the handler
      if (typeof handler.handler === 'function') {
        const result = await handler.handler(message, pluginContext);

        this.logger.debug('ContextManager', `Context handler executed`, {
          handlerName: handler.name,
          contextId: context.id,
          success: result.success,
        });

        return result;
      } else {
        this.logger.error(
          'ContextManager',
          `Handler function not found for ${handler.name}`
        );
        return {
          success: false,
          message: 'Error en la configuración del contexto',
          data: {
            reason: 'invalid_handler',
          },
        };
      }
    } catch (error) {
      this.logger.error('ContextManager', 'Failed to execute context handler', {
        error,
        handlerName: handler.name,
        contextId: context.id,
      });

      return {
        success: false,
        message: 'Error al ejecutar el contexto',
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

export default ContextManagerService;
