/**
 * Auto-Responses Message Handler Plugin
 * Handles casual messages with friendly auto-responses
 */

import { IMessageHandler, MessageHandlerConfig } from '../../interfaces';
import {
  User,
  Message,
  CommandResult,
  PluginMetadata,
  UserLevel,
} from '../../types';
import { Logger } from '../../utils/logger';

export class AutoResponsesHandler implements IMessageHandler {
  public readonly metadata: PluginMetadata = {
    name: 'auto-responses',
    version: '1.0.0',
    author: 'DrasBot Developer',
    description: 'Friendly auto-responses for casual messages',
    category: 'utility',
  };

  public readonly config: MessageHandlerConfig = {
    name: 'auto-responses',
    description: 'Handles greetings and casual messages with friendly responses',
    priority: 10, // Lower priority than commands
    triggers: {
      keywords: [
        'hola', 'hello', 'hi', 'buenas', 'saludos', 'que tal', 'hey',
        'buenos dias', 'buenas tardes', 'buenas noches', 'gracias', 'thanks',
        'adios', 'bye', 'hasta luego', 'nos vemos', 'chao'
      ],
      patterns: [
        /^(hola|hello|hi|buenas|hey)[\s\W]*$/i,
        /^(que tal|como estas?|como andas?)[\s\W]*$/i,
        /^(gracias|thanks?|muchas gracias)[\s\W]*$/i,
        /^(adios|bye|hasta luego|nos vemos|chao)[\s\W]*$/i,
      ],
      sentiment: 'positive',
      messageTypes: ['text']
    },
    responses: {
      templates: [
        // Greetings
        '¡Hola {userName}! 👋 ¿En qué puedo ayudarte hoy?',
        '¡Buenas {userName}! 😊 Escribe !help para ver mis comandos.',
        'Hola {userName}! ✨ ¡Es genial verte por aquí!',
        
        // Thanks responses
        '¡De nada {userName}! 😊 Siempre es un placer ayudar.',
        'No hay de qué {userName}! 🤗 Para eso estoy aquí.',
        
        // Goodbyes
        '¡Hasta luego {userName}! 👋 Que tengas un excelente día.',
        '¡Nos vemos {userName}! 😊 Vuelve pronto.',
        
        // General casual
        '¡Hola! 😊 Soy DrasBot v2.0. Escribe !help para ver todo lo que puedo hacer.',
        'Todo bien por aquí {userName}! 🤖 ¿Necesitas ayuda con algo?'
      ],
      personalized: true,
      includeUserName: true,
      includeTime: false
    },
    conditions: {
      userLevels: [UserLevel.USER, UserLevel.MODERATOR, UserLevel.ADMIN, UserLevel.OWNER],
      cooldown: 30000, // 30 seconds cooldown per user
    },
    enabled: true
  };

  private logger: Logger;
  private lastResponseTime: Map<string, number> = new Map();

  constructor() {
    this.logger = Logger.getInstance();
  }

  async canHandle(message: Message, user: User): Promise<boolean> {
    try {
      // Check if handler is enabled
      if (!this.config.enabled) {
        return false;
      }

      // Check user level permissions
      if (this.config.conditions?.userLevels && 
          !this.config.conditions.userLevels.includes(user.userLevel)) {
        return false;
      }

      // Check if message is a command (commands have priority)
      if (message.content.startsWith('!') || message.content.startsWith('/')) {
        return false;
      }

      // Check message type
      if (this.config.triggers.messageTypes && 
          !this.config.triggers.messageTypes.includes(message.message_type)) {
        return false;
      }

      // Check cooldown
      if (this.isOnCooldown(user.id.toString())) {
        return false;
      }

      // Check if message matches triggers
      return this.matchesTriggers(message.content);

    } catch (error) {
      this.logger.error('AutoResponsesHandler', 'Error checking if can handle message', error);
      return false;
    }
  }

  async handle(message: Message, user: User): Promise<CommandResult> {
    try {
      this.logger.info('AutoResponsesHandler', 'Handling casual message', {
        user: user.id,
        messageLength: message.content.length,
        trigger: this.getMatchedTrigger(message.content)
      });

      // Update cooldown
      this.lastResponseTime.set(user.id.toString(), Date.now());

      // Generate appropriate response
      const response = this.generateResponse(message.content, user);

      return {
        success: true,
        response,
        metadata: {
          handler: this.config.name,
          trigger: this.getMatchedTrigger(message.content),
          timestamp: new Date().toISOString(),
          cooldown: this.config.conditions?.cooldown || 0
        },
      };

    } catch (error) {
      this.logger.error('AutoResponsesHandler', 'Error handling message', error);
      
      return {
        success: false,
        error: 'Failed to generate auto-response',
        response: '¡Hola! 😊 Soy DrasBot v2.0. Escribe !help para ver mis comandos.'
      };
    }
  }

  public getPriority(): number {
    return this.config.priority;
  }

  private matchesTriggers(content: string): boolean {
    const normalizedContent = content.toLowerCase().trim();

    // Check keyword triggers
    if (this.config.triggers.keywords) {
      for (const keyword of this.config.triggers.keywords) {
        if (normalizedContent.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    // Check pattern triggers
    if (this.config.triggers.patterns) {
      for (const pattern of this.config.triggers.patterns) {
        if (pattern.test(normalizedContent)) {
          return true;
        }
      }
    }

    return false;
  }

  private getMatchedTrigger(content: string): string {
    const normalizedContent = content.toLowerCase().trim();

    // Check patterns first (more specific)
    if (this.config.triggers.patterns) {
      for (const pattern of this.config.triggers.patterns) {
        if (pattern.test(normalizedContent)) {
          return `pattern: ${pattern.toString()}`;
        }
      }
    }

    // Check keywords
    if (this.config.triggers.keywords) {
      for (const keyword of this.config.triggers.keywords) {
        if (normalizedContent.includes(keyword.toLowerCase())) {
          return `keyword: ${keyword}`;
        }
      }
    }

    return 'unknown';
  }

  private generateResponse(content: string, user: User): string {
    const trigger = this.getMatchedTrigger(content.toLowerCase());
    let templates: string[] = [];

    // Select appropriate templates based on trigger
    if (trigger.includes('hola') || trigger.includes('hello') || trigger.includes('hi') || trigger.includes('buenas')) {
      templates = this.config.responses.templates.filter(t => t.includes('Hola') || t.includes('Buenas'));
    } else if (trigger.includes('gracias') || trigger.includes('thanks')) {
      templates = this.config.responses.templates.filter(t => t.includes('nada') || t.includes('placer'));
    } else if (trigger.includes('adios') || trigger.includes('bye') || trigger.includes('hasta luego')) {
      templates = this.config.responses.templates.filter(t => t.includes('luego') || t.includes('vemos'));
    } else {
      // Use general templates
      templates = this.config.responses.templates.filter(t => 
        t.includes('DrasBot') || t.includes('!help') || t.includes('Todo bien')
      );
    }

    // Fallback to all templates if no specific ones found
    if (templates.length === 0) {
      templates = this.config.responses.templates;
    }

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    let response = template;
    
    if (this.config.responses.includeUserName && this.config.responses.personalized) {
      response = response.replace(/{userName}/g, user.name || 'amigo');
    }

    if (this.config.responses.includeTime) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      response = response.replace(/{time}/g, timeStr);
    }

    return response;
  }

  private isOnCooldown(userId: string): boolean {
    if (!this.config.conditions?.cooldown) {
      return false;
    }

    const lastResponse = this.lastResponseTime.get(userId);
    if (!lastResponse) {
      return false;
    }

    const timeDiff = Date.now() - lastResponse;
    return timeDiff < this.config.conditions.cooldown;
  }
}

// Export the handler class
export default AutoResponsesHandler;
