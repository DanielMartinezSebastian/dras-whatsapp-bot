/**
 * Name Registration Message Handlers
 * Handles name registration for new users through different contexts
 */

import { Logger } from '../utils/logger';
import { DatabaseService } from '../services/database.service';
import { ContextManagerService } from '../services/context-manager.service';
import { IMessageHandler, MessageHandlerConfig } from '../interfaces';
import {
  handleSetNameCommand,
  handleNameRegistrationContext,
} from './name.handlers';
import {
  ContextType,
  User,
  Message,
  CommandResult,
  PluginContext,
  PluginMetadata,
  UserLevel,
} from '../types';

/**
 * Name Registration Context Handler
 * Handles messages when user is in name registration context
 */
export class NameRegistrationContextHandler implements IMessageHandler {
  public readonly metadata: PluginMetadata = {
    name: 'name-registration-context',
    version: '1.0.0',
    author: 'DrasBot Developer',
    description: 'Handles name registration context for users',
    category: 'utility',
  };

  public readonly config: MessageHandlerConfig = {
    name: 'name-registration-context',
    description: 'Processes messages during name registration context',
    priority: 20, // High priority for context handling
    triggers: {
      keywords: [],
      patterns: [],
      messageTypes: ['text'],
    },
    responses: {
      templates: [],
      personalized: true,
      includeUserName: false,
      includeTime: false,
    },
    enabled: true,
  };

  private logger = Logger.getInstance();
  private database = DatabaseService.getInstance();
  private contextManager = ContextManagerService.getInstance();

  async canHandle(_message: Message, user: User): Promise<boolean> {
    try {
      // Check if user has an active name registration context
      const activeContext = await this.contextManager.getActiveContext(
        user.id.toString()
      );
      return activeContext?.contextType === ContextType.REGISTRATION;
    } catch (error) {
      this.logger.error(
        'NameRegistrationContextHandler',
        'Error checking if can handle',
        { error }
      );
      return false;
    }
  }

  async handle(message: Message, user: User): Promise<CommandResult> {
    try {
      // Get the active context
      const activeContext = await this.contextManager.getActiveContext(
        user.id.toString()
      );

      if (
        !activeContext ||
        activeContext.contextType !== ContextType.REGISTRATION
      ) {
        return {
          success: false,
          message: 'No hay un proceso de registro de nombre activo.',
          data: { type: 'no_active_context' },
        };
      }

      // Create plugin context
      const pluginContext: PluginContext = {
        user,
        message,
        database: this.database,
        whatsappBridge: null as any, // Not needed for this context
        config: null as any, // Not needed for this context
        logger: this.logger,
      };

      // Handle the name registration
      return await handleNameRegistrationContext(
        message,
        pluginContext,
        activeContext.data
      );
    } catch (error) {
      this.logger.error(
        'NameRegistrationContextHandler',
        'Error handling context',
        {
          error,
          userId: user.id,
        }
      );

      return {
        success: false,
        message:
          '❌ Error interno al procesar el registro de nombre. Inténtalo de nuevo.',
        data: {
          type: 'internal_error',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  getPriority(): number {
    return this.config.priority || 20;
  }
}

/**
 * Name Detection Handler
 * Detects when users say their name in natural language
 */
export class NameDetectionHandler implements IMessageHandler {
  public readonly metadata: PluginMetadata = {
    name: 'name-detection',
    version: '1.0.0',
    author: 'DrasBot Developer',
    description: 'Detects when users mention their name in natural language',
    category: 'utility',
  };

  public readonly config: MessageHandlerConfig = {
    name: 'name-detection',
    description: 'Detects natural language name mentions',
    priority: 15,
    triggers: {
      keywords: ['me llamo', 'soy', 'llamame', 'mi nombre es'],
      patterns: [
        /^me llamo /i,
        /^soy /i,
        /^llamame /i,
        /^llámame /i,
        /^mi nombre es /i,
        /^hola,?\s*soy /i,
        /^hola,?\s*me llamo /i,
      ],
      messageTypes: ['text'],
    },
    responses: {
      templates: [],
      personalized: true,
      includeUserName: false,
      includeTime: false,
    },
    enabled: true,
  };

  private logger = Logger.getInstance();
  private database = DatabaseService.getInstance();
  private contextManager = ContextManagerService.getInstance();

  async canHandle(message: Message, user: User): Promise<boolean> {
    try {
      // Skip if message is a command
      if (message.content.startsWith('!') || message.content.startsWith('/')) {
        return false;
      }

      // Check if user already has an active context
      const activeContext = await this.contextManager.getActiveContext(
        user.id.toString()
      );
      if (activeContext) {
        return false;
      }

      // Check if message contains name patterns
      const content = message.content.toLowerCase().trim();
      const namePatterns = this.config.triggers.patterns || [];

      return namePatterns.some(pattern => pattern.test(content));
    } catch (error) {
      this.logger.error(
        'NameDetectionHandler',
        'Error checking if can handle',
        { error }
      );
      return false;
    }
  }

  async handle(message: Message, user: User): Promise<CommandResult> {
    try {
      this.logger.info(
        'NameDetectionHandler',
        'Detected natural name mention',
        {
          userId: user.id,
          content: message.content,
        }
      );

      // Create plugin context
      const pluginContext: PluginContext = {
        user,
        message,
        database: this.database,
        whatsappBridge: null as any, // Not needed for this handler
        config: null as any, // Not needed for this handler
        logger: this.logger,
      };

      // Use the same logic as the set name command
      return await handleSetNameCommand(message, pluginContext);
    } catch (error) {
      this.logger.error(
        'NameDetectionHandler',
        'Error handling name detection',
        {
          error,
          userId: user.id,
        }
      );

      return {
        success: false,
        message: '❌ Error al procesar tu nombre. Inténtalo de nuevo.',
        data: {
          type: 'internal_error',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  getPriority(): number {
    return this.config.priority || 15;
  }
}

/**
 * New User Welcome Handler
 * Welcomes new users and prompts them to set their name
 */
export class NewUserWelcomeHandler implements IMessageHandler {
  public readonly metadata: PluginMetadata = {
    name: 'new-user-welcome',
    version: '1.0.0',
    author: 'DrasBot Developer',
    description: 'Welcomes new users and prompts them to set their name',
    category: 'utility',
  };

  public readonly config: MessageHandlerConfig = {
    name: 'new-user-welcome',
    description: 'Welcomes new users and initiates name registration',
    priority: 5,
    triggers: {
      keywords: ['hola', 'hello', 'hi', 'buenas', 'hey'],
      patterns: [
        /^hola/i,
        /^buenos/i,
        /^buenas/i,
        /^ey/i,
        /^hey/i,
        /^hi/i,
        /^hello/i,
        /^que tal/i,
        /^qué tal/i,
        /^como estas/i,
        /^cómo estás/i,
      ],
      messageTypes: ['text'],
    },
    responses: {
      templates: [],
      personalized: true,
      includeUserName: false,
      includeTime: false,
    },
    conditions: {
      userLevels: [
        UserLevel.USER,
        UserLevel.MODERATOR,
        UserLevel.ADMIN,
        UserLevel.OWNER,
      ],
    },
    enabled: true,
  };

  private logger = Logger.getInstance();
  private contextManager = ContextManagerService.getInstance();

  async canHandle(message: Message, user: User): Promise<boolean> {
    try {
      // Only for unregistered users with very few messages
      if (user.isRegistered || user.messageCount > 3) {
        return false;
      }

      // Skip if message is a command
      if (message.content.startsWith('!') || message.content.startsWith('/')) {
        return false;
      }

      // Check if user already has an active context
      const activeContext = await this.contextManager.getActiveContext(
        user.id.toString()
      );
      if (activeContext) {
        return false;
      }

      // Check if it's a greeting or general message
      const content = message.content.toLowerCase().trim();
      const greetingPatterns = this.config.triggers.patterns || [];

      return (
        greetingPatterns.some(pattern => pattern.test(content)) ||
        (content.length > 2 && content.length < 100)
      );
    } catch (error) {
      this.logger.error(
        'NewUserWelcomeHandler',
        'Error checking if can handle',
        { error }
      );
      return false;
    }
  }

  async handle(_message: Message, user: User): Promise<CommandResult> {
    try {
      this.logger.info('NewUserWelcomeHandler', 'Welcoming new user', {
        userId: user.id,
        messageCount: user.messageCount,
      });

      // Create name registration context
      await this.contextManager.createContext(
        user.id.toString(),
        ContextType.REGISTRATION,
        {
          step: 'awaiting_name',
          attempts: 0,
          triggered_by: 'welcome',
          startedAt: new Date().toISOString(),
        }
      );

      const welcomeMessage =
        `👋 **¡Hola y bienvenido a DrasBot!**\n\n` +
        `Veo que es la primera vez que chateas conmigo. Para darte una mejor experiencia, me gustaría conocerte mejor.\n\n` +
        `**¿Cómo te llamas?**\n\n` +
        `Puedes decirme tu nombre de cualquiera de estas formas:\n` +
        `• "Me llamo [tu nombre]"\n` +
        `• "Soy [tu nombre]"\n` +
        `• "Llamame [tu nombre]"\n` +
        `• O simplemente escribe tu nombre\n\n` +
        `**Ejemplos:**\n` +
        `• Me llamo María\n` +
        `• Soy Carlos\n` +
        `• Ana\n\n` +
        `💡 **Nota:** Tu nombre me ayudará a personalizar nuestras conversaciones.`;

      return {
        success: true,
        message: welcomeMessage,
        data: {
          type: 'new_user_welcome',
          contextCreated: true,
          messageCount: user.messageCount,
        },
      };
    } catch (error) {
      this.logger.error(
        'NewUserWelcomeHandler',
        'Error handling new user welcome',
        {
          error,
          userId: user.id,
        }
      );

      return {
        success: false,
        message:
          '👋 ¡Hola y bienvenido! Hubo un pequeño error, pero puedes decirme tu nombre cuando quieras escribiendo "me llamo [tu nombre]".',
        data: {
          type: 'welcome_error',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  getPriority(): number {
    return this.config.priority || 5;
  }
}
