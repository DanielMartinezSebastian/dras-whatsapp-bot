/**
 * Message Processing Pipeline
 *
 * Core service that processes incoming WhatsApp messages through various stages:
 * 1. Message validation and parsing
 * 2. User identification and registration
 * 3. Context detection and management
 * 4. Command execution or context handling
 * 5. Response generation and delivery
 */

import { Logger } from '../utils/logger';
import { DatabaseService } from './database.service';
import { WhatsAppBridgeService } from './whatsapp-bridge.service';
import { ConfigService } from './config.service';
import { PluginManagerService } from './plugin-manager.service';
import { CommandRegistryService } from './command-registry.service';
import { ContextManagerService } from './context-manager.service';
import { IMessageHandler } from '../interfaces';
import { AutoResponsesHandler } from '../plugins/auto-responses';
import {
  Message,
  User,
  ConversationContext,
  MessageType,
  CommandResult,
  ProcessingResult,
  ProcessingStage,
  ProcessingPipelineConfig,
  UserLevel,
} from '../types';

export interface IncomingMessage {
  id: string;
  from: string; // WhatsApp JID
  content: string;
  messageType: MessageType;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ResponseMessage {
  type: 'text' | 'media' | 'document' | 'location';
  content: string;
  mediaPath?: string;
  metadata: Record<string, any>;
}

export interface ProcessingContext {
  incomingMessage: IncomingMessage;
  user: User | null;
  parsedMessage: Message | null;
  conversationContext: ConversationContext | null;
  currentStage: ProcessingStage;
  results: CommandResult[];
  errors: Error[];
  metadata: Record<string, any>;
}

export interface ProcessingOptions {
  enableTypingIndicators?: boolean;
  enableReadReceipts?: boolean;
  enableBridgeIntegration?: boolean;
  typingDelay?: number;
  autoMarkAsRead?: boolean;
}

export class MessageProcessorService {
  private static instance: MessageProcessorService;
  private logger: Logger;
  // @ts-ignore - Will be used in future database implementations
  private _database: DatabaseService; // TODO: Use when implementing database queries
  private whatsappBridge: WhatsAppBridgeService;
  private config: ConfigService;
  private _pluginManager: PluginManagerService; // TODO: Use when implementing plugin integration
  private _commandRegistry: CommandRegistryService; // TODO: Use when implementing command execution
  private contextManager: ContextManagerService; // Full integration with context management
  private isProcessing: boolean = false;
  private pipelineConfig: ProcessingPipelineConfig;

  // Message Handlers for non-command messages
  private messageHandlers: IMessageHandler[] = [];

  // New bridge integration properties
  private processingOptions: ProcessingOptions;
  private bridgeHealthy: boolean = false;
  private lastBridgeCheck: Date = new Date();

  private constructor() {
    this.logger = Logger.getInstance();
    this._database = DatabaseService.getInstance();
    this.whatsappBridge = WhatsAppBridgeService.getInstance();
    this.config = ConfigService.getInstance();
    this._pluginManager = PluginManagerService.getInstance();
    this._commandRegistry = CommandRegistryService.getInstance();
    this.contextManager = ContextManagerService.getInstance();

    this.pipelineConfig = {
      maxConcurrentProcessing: 5,
      processingTimeout: 30000,
      retryFailedMessages: true,
      maxRetries: 3,
      queueSize: 100,
      enableMetrics: true,
    };

    // Initialize processing options with default values
    this.processingOptions = {
      enableTypingIndicators: true,
      enableReadReceipts: true,
      enableBridgeIntegration: true,
      typingDelay: 1000,
      autoMarkAsRead: true,
    };
  }

  public static getInstance(): MessageProcessorService {
    if (!MessageProcessorService.instance) {
      MessageProcessorService.instance = new MessageProcessorService();
    }
    return MessageProcessorService.instance;
  }

  /**
   * Initialize the message processor
   */
  public async initialize(): Promise<void> {
    this.logger.info(
      'MessageProcessor',
      'Initializing Message Processing Pipeline...'
    );

    // Initialize all services
    await this._pluginManager.initialize();
    await this._commandRegistry.initialize();
    await this.contextManager.initialize();

    // Initialize message handlers
    this.initializeMessageHandlers();

    // Load pipeline configuration
    const pipelineConfig = this.config.getValue('pipeline', {});
    if (pipelineConfig) {
      this.pipelineConfig = { ...this.pipelineConfig, ...pipelineConfig };
    }

    // Load processing options from config
    const processingOptionsConfig = this.config.getValue(
      'processing_options',
      {}
    );
    if (processingOptionsConfig) {
      this.processingOptions = {
        ...this.processingOptions,
        ...processingOptionsConfig,
      };
    }

    // Check bridge health on initialization
    if (this.processingOptions.enableBridgeIntegration) {
      await this.checkBridgeHealth();
      this.logger.info('MessageProcessor', 'Bridge health check completed', {
        healthy: this.bridgeHealthy,
        lastCheck: this.lastBridgeCheck,
      });
    }

    this.logger.info(
      'MessageProcessor',
      '✅ Message Processing Pipeline initialized',
      {
        ...this.pipelineConfig,
        processingOptions: this.processingOptions,
        bridgeHealthy: this.bridgeHealthy,
      }
    );
  }

  /**
   * Initialize message handlers for non-command messages
   */
  private initializeMessageHandlers(): void {
    this.logger.info('MessageProcessor', 'Initializing message handlers...');

    // Add auto-responses handler
    this.messageHandlers.push(new AutoResponsesHandler());

    // Sort handlers by priority (higher priority first)
    this.messageHandlers.sort((a, b) => b.getPriority() - a.getPriority());

    this.logger.info(
      'MessageProcessor',
      `Loaded ${this.messageHandlers.length} message handlers`
    );
  }

  /**
   * Process an incoming message through the pipeline
   */
  public async processMessage(
    incomingMessage: IncomingMessage
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Create processing context
    const context: ProcessingContext = {
      incomingMessage,
      user: null,
      parsedMessage: null,
      conversationContext: null,
      currentStage: 'validation',
      results: [],
      errors: [],
      metadata: {
        startTime,
        processingId: `proc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    };

    this.logger.info(
      'MessageProcessor',
      `🔄 Processing message ${context.metadata.processingId}`,
      {
        from: incomingMessage.from,
        messageType: incomingMessage.messageType,
        contentLength: incomingMessage.content.length,
      }
    );

    try {
      // Mark message as read at the beginning of processing
      if (this.processingOptions.autoMarkAsRead) {
        await this.markMessageAsRead(incomingMessage.id, incomingMessage.from);
      }

      // Send typing indicator before processing starts
      await this.sendTypingIndicator(incomingMessage.from);

      // Stage 1: Validation and Parsing
      await this.validateAndParseMessage(context);

      // Stage 2: User Identification
      await this.identifyUser(context);

      // Stage 3: Context Detection
      await this.detectContext(context);

      // Stage 4: Command/Context Processing
      await this.processCommand(context);

      // Stage 5: Response Generation
      await this.generateResponse(context);

      // Stop typing indicator after processing
      await this.stopTypingIndicator(incomingMessage.from);

      const processingTime = Date.now() - startTime;

      this.logger.info(
        'MessageProcessor',
        `✅ Message processed successfully`,
        {
          processingId: context.metadata.processingId,
          processingTime: `${processingTime}ms`,
          resultsCount: context.results.length,
        }
      );

      return {
        success: true,
        processingId: context.metadata.processingId,
        processingTime,
        results: context.results,
        user: context.user,
        message: context.parsedMessage,
        context: context.conversationContext,
      };
    } catch (error) {
      // Ensure typing indicator is stopped even on error
      await this.stopTypingIndicator(incomingMessage.from);

      const processingTime = Date.now() - startTime;

      this.logger.error('MessageProcessor', `❌ Message processing failed`, {
        processingId: context.metadata.processingId,
        processingTime: `${processingTime}ms`,
        stage: context.currentStage,
        error: error instanceof Error ? error.message : String(error),
      });

      context.errors.push(
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        success: false,
        processingId: context.metadata.processingId,
        processingTime,
        results: context.results,
        errors: context.errors,
        user: context.user,
        message: context.parsedMessage,
        context: context.conversationContext,
      };
    }
  }

  /**
   * Stage 1: Validate and parse the incoming message
   */
  private async validateAndParseMessage(
    context: ProcessingContext
  ): Promise<void> {
    context.currentStage = 'validation';

    const { incomingMessage } = context;

    // Basic validation
    if (!incomingMessage.from || !incomingMessage.content.trim()) {
      throw new Error('Invalid message: missing sender or content');
    }

    // Create Message entity
    const message: Message = {
      id: incomingMessage.id,
      created_at: incomingMessage.timestamp,
      updated_at: incomingMessage.timestamp,
      user_id: '', // Will be filled in user identification stage
      whatsapp_message_id: incomingMessage.id,
      content: incomingMessage.content.trim(),
      message_type: incomingMessage.messageType,
      is_from_bot: false,
      processed: false,
      metadata: {
        sender_jid: incomingMessage.from,
        ...incomingMessage.metadata,
      },
    };

    context.parsedMessage = message;

    this.logger.debug('MessageProcessor', 'Message validated and parsed', {
      messageId: message.id,
      messageType: message.message_type,
      contentLength: message.content.length,
    });
  }

  /**
   * Stage 2: Identify or create user
   */
  private async identifyUser(context: ProcessingContext): Promise<void> {
    context.currentStage = 'user_identification';

    const { incomingMessage } = context;

    try {
      // Extract phone number from JID
      const phoneNumber = incomingMessage.from.split('@')[0];

      // Try to find existing user
      let user = await this.findUserByPhone(phoneNumber);

      if (!user) {
        // Create new user
        user = await this.createNewUser(phoneNumber, incomingMessage.from);
        this.logger.info('MessageProcessor', '👤 New user created', {
          phone: phoneNumber,
          userId: user.id,
        });
      } else {
        // Update last activity
        await this.updateUserLastActivity(user.id.toString());
      }

      context.user = user;

      // Update message with user ID
      if (context.parsedMessage) {
        context.parsedMessage.user_id = user.id.toString();
      }
    } catch (error) {
      this.logger.error(
        'MessageProcessor',
        'User identification failed',
        error
      );
      throw new Error(
        `User identification failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stage 3: Detect conversation context
   */
  private async detectContext(context: ProcessingContext): Promise<void> {
    context.currentStage = 'context_detection';

    if (!context.user || !context.parsedMessage) {
      throw new Error('User or message not available for context detection');
    }

    try {
      // Check if user has an active context
      // TODO: Fix type issues with ContextManagerService
      // const userContextInfo = await this.contextManager.getUserContextInfo(context.user.id);

      // For now, use a simplified approach
      const userContextInfo = { hasContext: false };

      if (userContextInfo.hasContext) {
        // Implementation will be completed when type issues are resolved
        this.logger.debug('MessageProcessor', 'Active context found for user');
      } else {
        // Try to detect new context from message content (simplified)
        this.logger.debug(
          'MessageProcessor',
          'No context detected for message'
        );
      }
    } catch (error) {
      this.logger.error('MessageProcessor', 'Context detection failed', error);
      // Context detection failure is not critical, continue processing
    }
  }

  /**
   * Stage 4: Process command or context
   */
  private async processCommand(context: ProcessingContext): Promise<void> {
    context.currentStage = 'command_processing';

    if (!context.user || !context.parsedMessage) {
      throw new Error('Missing user or message data');
    }

    try {
      const botConfig = this.config.getValue('bot', {}) as any;
      const prefix = botConfig?.prefix || '!';
      const content = context.parsedMessage.content;

      // Check if it's a command (starts with prefix)
      if (content.startsWith(prefix)) {
        await this.processAsCommand(context, content, prefix);
      } else if (context.conversationContext) {
        await this.processAsContextMessage(context);
      } else {
        // Default processing (auto-reply, etc.)
        await this.processAsGeneralMessage(context);
      }
    } catch (error) {
      this.logger.error('MessageProcessor', 'Command processing failed', error);
      throw error;
    }
  }

  /**
   * Process message as a command
   */
  private async processAsCommand(
    context: ProcessingContext,
    content: string,
    prefix: string
  ): Promise<void> {
    const commandParts = content.substring(prefix.length).trim().split(/\s+/);
    const commandName = commandParts[0].toLowerCase();
    const args = commandParts.slice(1);

    this.logger.info('MessageProcessor', '⚡ Processing command', {
      command: commandName,
      argsCount: args.length,
      userId: context.user?.id,
    });

    // For now, create a simple result
    // TODO: Integrate with Command Registry when implemented
    const result: CommandResult = {
      success: true,
      command: commandName,
      executionTime: 0,
      response: {
        type: 'text',
        content: `Command "${commandName}" received. Implementation pending.`,
        metadata: {},
      },
      data: {
        command: commandName,
        args,
        user: context.user,
      },
    };

    context.results.push(result);
  }

  /**
   * Process message as context message
   */
  private async processAsContextMessage(
    context: ProcessingContext
  ): Promise<void> {
    if (!context.conversationContext || !context.user || !context.parsedMessage)
      return;

    this.logger.info('MessageProcessor', '💬 Processing context message', {
      contextType: context.conversationContext.context_type,
      contextId: context.conversationContext.id,
      userId: context.user.id,
    });

    try {
      // Use the Context Manager to execute the context (simplified for now)
      // TODO: Fix type issues with ContextManagerService
      // const contextResult = await this.contextManager.executeContext(
      //   context.user,
      //   context.parsedMessage
      // );

      // Simplified context result for now
      const contextResult = {
        success: true,
        message: `Context message processed for ${context.conversationContext.context_type} context.`,
        data: {},
      };

      // Convert the context result to a command result
      const result: CommandResult = {
        success: contextResult.success,
        command: 'context_message',
        executionTime: 0,
        ...(contextResult.message && { response: contextResult.message }),
        data: {
          context: context.conversationContext,
          user: context.user,
          contextResult: contextResult,
        },
      };

      context.results.push(result);

      this.logger.info('MessageProcessor', '✅ Context message processed', {
        success: contextResult.success,
        contextType: context.conversationContext.context_type,
      });
    } catch (error) {
      this.logger.error(
        'MessageProcessor',
        'Context message processing failed',
        { error }
      );

      const result: CommandResult = {
        success: false,
        command: 'context_message',
        executionTime: 0,
        error: error instanceof Error ? error.message : String(error),
        data: {
          context: context.conversationContext,
          user: context.user,
        },
      };

      context.results.push(result);
    }
  }

  /**
   * Process message as general message
   */
  private async processAsGeneralMessage(
    context: ProcessingContext
  ): Promise<void> {
    this.logger.info('MessageProcessor', '📝 Processing general message', {
      userId: context.user?.id,
      messageType: context.parsedMessage?.message_type,
    });

    // Try message handlers for non-command messages
    if (context.parsedMessage && context.user) {
      for (const handler of this.messageHandlers) {
        try {
          const canHandle = await handler.canHandle(
            context.parsedMessage,
            context.user
          );
          if (canHandle) {
            this.logger.info(
              'MessageProcessor',
              `🎯 Message handled by ${handler.metadata.name}`,
              {
                userId: context.user.id,
                handler: handler.metadata.name,
              }
            );

            const result = await handler.handle(
              context.parsedMessage,
              context.user
            );
            if (result.success) {
              context.results.push(result);
              return; // Stop processing after first successful handler
            }
          }
        } catch (error) {
          this.logger.error(
            'MessageProcessor',
            `Error in message handler ${handler.metadata.name}`,
            error
          );
        }
      }
    }

    // Fallback: Check if auto-reply is enabled
    const botConfig = this.config.getValue('bot', {}) as any;
    if (botConfig?.features?.auto_reply) {
      const result: CommandResult = {
        success: true,
        command: 'auto_reply',
        executionTime: 0,
        response: {
          type: 'text',
          content:
            'Hello! Thank you for your message. DrasBot v2.0 is processing your request.',
          metadata: {},
        },
        data: {
          type: 'auto_reply',
          user: context.user,
        },
      };

      context.results.push(result);
    }
  }

  /**
   * Stage 5: Generate and send responses
   */
  private async generateResponse(context: ProcessingContext): Promise<void> {
    context.currentStage = 'response_generation';

    if (context.results.length === 0) {
      return; // No responses to send
    }

    for (const result of context.results) {
      if (result.response && result.success) {
        try {
          await this.sendResponse(context, result);
        } catch (error) {
          this.logger.error('MessageProcessor', 'Failed to send response', {
            command: result.command,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Send a response via WhatsApp Bridge
   */
  private async sendResponse(
    context: ProcessingContext,
    result: CommandResult
  ): Promise<void> {
    if (!result.response || !context.user) return;

    const recipient = context.incomingMessage.from;

    try {
      // Handle both string and ResponseMessage types
      if (typeof result.response === 'string') {
        await this.whatsappBridge.sendTextMessage(recipient, result.response);
      } else {
        const response = result.response as ResponseMessage;

        switch (response.type) {
          case 'text':
            await this.whatsappBridge.sendTextMessage(
              recipient,
              response.content
            );
            break;

          case 'media':
            if (response.mediaPath) {
              await this.whatsappBridge.sendMediaMessage(
                recipient,
                response.mediaPath,
                response.content
              );
            }
            break;

          default:
            this.logger.warn('MessageProcessor', 'Unknown response type', {
              type: response.type,
            });
        }
      }

      this.logger.debug('MessageProcessor', 'Response sent successfully', {
        recipient,
        type:
          typeof result.response === 'string'
            ? 'text'
            : (result.response as ResponseMessage).type,
        command: result.command,
      });
    } catch (error) {
      this.logger.error(
        'MessageProcessor',
        'Failed to send response via bridge',
        error
      );
      throw error;
    }
  }

  /**
   * Database helper methods - using the database service
   */
  private async findUserByPhone(_phone: string): Promise<User | null> {
    // TODO: Implement with actual database query
    // Example: return await this._database.query('SELECT * FROM users WHERE phone = ?', [phone]);
    return null;
  }

  private async createNewUser(
    phone: string,
    whatsappJid: string
  ): Promise<User> {
    // TODO: Implement with actual database insertion
    const user: User = {
      id: Date.now(), // Simple numeric ID
      jid: whatsappJid,
      phoneNumber: phone,
      name: phone, // Default name
      userLevel: UserLevel.USER,
      isRegistered: false,
      registrationDate: null,
      lastActivity: new Date(),
      messageCount: 0,
      banned: false,
      preferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return user;
  }

  private async updateUserLastActivity(userId: string): Promise<void> {
    // TODO: Implement with actual database update
    this.logger.debug('MessageProcessor', 'User last activity updated', {
      userId,
    });
  }

  /**
   * Configuration and status methods
   */
  public getConfig(): ProcessingPipelineConfig {
    return { ...this.pipelineConfig };
  }

  public updateConfig(config: Partial<ProcessingPipelineConfig>): void {
    this.pipelineConfig = { ...this.pipelineConfig, ...config };
    this.logger.info(
      'MessageProcessor',
      'Pipeline configuration updated',
      this.pipelineConfig
    );
  }

  /**
   * Configure processing options for bridge integration
   */
  public setProcessingOptions(options: Partial<ProcessingOptions>): void {
    this.processingOptions = { ...this.processingOptions, ...options };
    this.logger.info('MessageProcessor', 'Processing options updated', options);
  }

  /**
   * Get current processing options
   */
  public getProcessingOptions(): ProcessingOptions {
    return { ...this.processingOptions };
  }

  /**
   * Check bridge health and update status
   */
  private async checkBridgeHealth(): Promise<boolean> {
    if (!this.processingOptions.enableBridgeIntegration) {
      return false;
    }

    try {
      const healthStatus = await this.whatsappBridge.performHealthCheck();
      this.bridgeHealthy = healthStatus.bridge_available;
      this.lastBridgeCheck = new Date();

      if (!this.bridgeHealthy) {
        this.logger.warn(
          'MessageProcessor',
          'Bridge health check failed',
          healthStatus
        );
      }

      return this.bridgeHealthy;
    } catch (error) {
      this.bridgeHealthy = false;
      this.lastBridgeCheck = new Date();
      this.logger.error('MessageProcessor', 'Bridge health check error', error);
      return false;
    }
  }

  /**
   * Start periodic bridge health monitoring
   */
  public startBridgeHealthMonitoring(intervalMinutes: number = 5): void {
    if (!this.processingOptions.enableBridgeIntegration) {
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    setInterval(async () => {
      await this.checkBridgeHealth();
    }, intervalMs);

    this.logger.info(
      'MessageProcessor',
      `Bridge health monitoring started (interval: ${intervalMinutes}min)`
    );
  }

  /**
   * Get bridge integration status
   */
  public getBridgeStatus(): {
    healthy: boolean;
    lastCheck: Date;
    options: ProcessingOptions;
  } {
    return {
      healthy: this.bridgeHealthy,
      lastCheck: this.lastBridgeCheck,
      options: this.processingOptions,
    };
  }

  /**
   * Send typing indicator if enabled and bridge is healthy
   */
  private async sendTypingIndicator(recipient: string): Promise<void> {
    if (
      !this.processingOptions.enableBridgeIntegration ||
      !this.processingOptions.enableTypingIndicators ||
      !this.bridgeHealthy
    ) {
      return;
    }

    try {
      await this.whatsappBridge.sendTyping(recipient, true);
      this.logger.debug('MessageProcessor', 'Typing indicator sent', {
        recipient,
      });

      // Add configured delay to simulate natural typing
      if (
        this.processingOptions.typingDelay &&
        this.processingOptions.typingDelay > 0
      ) {
        await new Promise(resolve =>
          setTimeout(resolve, this.processingOptions.typingDelay)
        );
      }
    } catch (error) {
      this.logger.warn('MessageProcessor', 'Failed to send typing indicator', {
        recipient,
        error,
      });
    }
  }

  /**
   * Stop typing indicator if enabled and bridge is healthy
   */
  private async stopTypingIndicator(recipient: string): Promise<void> {
    if (
      !this.processingOptions.enableBridgeIntegration ||
      !this.processingOptions.enableTypingIndicators ||
      !this.bridgeHealthy
    ) {
      return;
    }

    try {
      await this.whatsappBridge.sendTyping(recipient, false);
      this.logger.debug('MessageProcessor', 'Typing indicator stopped', {
        recipient,
      });
    } catch (error) {
      this.logger.warn('MessageProcessor', 'Failed to stop typing indicator', {
        recipient,
        error,
      });
    }
  }

  /**
   * Mark message as read if enabled and bridge is healthy
   */
  private async markMessageAsRead(
    messageId: string,
    chatJid: string
  ): Promise<void> {
    if (
      !this.processingOptions.enableBridgeIntegration ||
      !this.processingOptions.enableReadReceipts ||
      !this.bridgeHealthy
    ) {
      return;
    }

    try {
      await this.whatsappBridge.markAsRead(messageId, chatJid);
      this.logger.debug('MessageProcessor', 'Message marked as read', {
        messageId,
        chatJid,
      });
    } catch (error) {
      this.logger.warn('MessageProcessor', 'Failed to mark message as read', {
        messageId,
        chatJid,
        error,
      });
    }
  }

  /**
   * Shutdown the processor
   */
  public async shutdown(): Promise<void> {
    this.logger.info(
      'MessageProcessor',
      '🔌 Shutting down Message Processing Pipeline...'
    );

    // Wait for current processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.info(
      'MessageProcessor',
      '✅ Message Processing Pipeline shut down'
    );
  }
}

export default MessageProcessorService;
