/**
 * Random Messages Utility
 * Centralized system for managing and generating random responses across the bot
 *
 * @version 1.0.0
 * @author DrasBot Team
 */

import path from 'path';
import fs from 'fs';

// Types for configuration
interface RandomResponsesConfig {
  name_confirmations: string[];
  motivational_texts: string[];
  greetings: string[];
  thanks_responses: string[];
  goodbyes: string[];
  general_casual: string[];
  context_fallbacks: string[];
}

interface MessagesConfig {
  random_responses: RandomResponsesConfig;
  [key: string]: any;
}

interface PlaceholderReplacements {
  [key: string]: string;
}

/**
 * Utility class for managing random responses
 */
export class RandomMessagesUtil {
  private static instance: RandomMessagesUtil;
  private config: MessagesConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(__dirname, '../../config/messages/es.json');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RandomMessagesUtil {
    if (!RandomMessagesUtil.instance) {
      RandomMessagesUtil.instance = new RandomMessagesUtil();
    }
    return RandomMessagesUtil.instance;
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): MessagesConfig {
    if (!this.config) {
      try {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      } catch (error) {
        console.error('Error loading random messages config:', error);
        // Fallback configuration
        this.config = {
          random_responses: {
            name_confirmations: [
              '✅ **¡Perfecto {name}!** Tu registro está completo.',
            ],
            motivational_texts: [
              '\n\n💡 Escribe `!help` para ver qué puedo hacer',
            ],
            greetings: ['¡Hola! 😊 ¿En qué puedo ayudarte?'],
            thanks_responses: ['¡De nada! 😊 Siempre es un placer ayudar.'],
            goodbyes: ['¡Hasta luego! 👋 Que tengas un excelente día.'],
            general_casual: [
              '¡Hola! 😊 Soy DrasBot v2.0. Escribe !help para ver mis comandos.',
            ],
            context_fallbacks: [
              'Entiendo. ¿Hay algo específico en lo que pueda ayudarte?',
            ],
          },
        };
      }
    }
    return this.config!;
  }

  /**
   * Get a random message from a specific category
   */
  public getRandomMessage(
    category: keyof RandomResponsesConfig,
    replacements: PlaceholderReplacements = {}
  ): string {
    const config = this.loadConfig();
    const messages = config.random_responses[category];

    if (!messages || messages.length === 0) {
      console.warn(`No messages found for category: ${category}`);
      return 'Mensaje no disponible';
    }

    // Select random message
    const randomIndex = Math.floor(Math.random() * messages.length);
    let message = messages[randomIndex];

    // Replace placeholders
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      message = message.replace(regex, value);
    });

    return message;
  }

  /**
   * Get a random name confirmation message
   * Maintains compatibility with existing code
   */
  public getRandomNameConfirmation(name: string): string {
    return this.getRandomMessage('name_confirmations', { name });
  }

  /**
   * Get a random motivational text
   * Maintains compatibility with existing code
   */
  public getRandomMotivationalText(): string {
    return this.getRandomMessage('motivational_texts');
  }

  /**
   * Get a random greeting
   */
  public getRandomGreeting(userName: string = 'amigo'): string {
    return this.getRandomMessage('greetings', { userName });
  }

  /**
   * Get a random thanks response
   */
  public getRandomThanksResponse(userName: string = 'amigo'): string {
    return this.getRandomMessage('thanks_responses', { userName });
  }

  /**
   * Get a random goodbye
   */
  public getRandomGoodbye(userName: string = 'amigo'): string {
    return this.getRandomMessage('goodbyes', { userName });
  }

  /**
   * Get a random casual response
   */
  public getRandomCasualResponse(userName: string = 'amigo'): string {
    return this.getRandomMessage('general_casual', { userName });
  }

  /**
   * Get a random context fallback response
   */
  public getRandomContextFallback(): string {
    return this.getRandomMessage('context_fallbacks');
  }

  /**
   * Get multiple random messages (useful for combinations)
   */
  public getCombinedRandomMessage(
    categories: Array<keyof RandomResponsesConfig>,
    replacements: PlaceholderReplacements = {}
  ): string {
    return categories
      .map(category => this.getRandomMessage(category, replacements))
      .join('');
  }

  /**
   * Get a complete name registration response (confirmation + motivational)
   * This maintains exact compatibility with existing functionality
   */
  public getCompleteNameRegistrationMessage(name: string): string {
    const confirmation = this.getRandomNameConfirmation(name);
    const motivational = this.getRandomMotivationalText();
    return confirmation + motivational;
  }

  /**
   * Get all available categories
   */
  public getAvailableCategories(): Array<keyof RandomResponsesConfig> {
    const config = this.loadConfig();
    return Object.keys(config.random_responses) as Array<
      keyof RandomResponsesConfig
    >;
  }

  /**
   * Get count of messages in a category
   */
  public getCategoryCount(category: keyof RandomResponsesConfig): number {
    const config = this.loadConfig();
    return config.random_responses[category]?.length || 0;
  }

  /**
   * Get statistics about all categories
   */
  public getStatistics(): Record<keyof RandomResponsesConfig, number> {
    const categories = this.getAvailableCategories();
    const stats = {} as Record<keyof RandomResponsesConfig, number>;

    categories.forEach(category => {
      stats[category] = this.getCategoryCount(category);
    });

    return stats;
  }
}

// Export convenience functions for backward compatibility
export const randomMessages = RandomMessagesUtil.getInstance();

export const getRandomNameConfirmationMessage = (name: string): string => {
  return randomMessages.getRandomNameConfirmation(name);
};

export const getRandomMotivationalText = (): string => {
  return randomMessages.getRandomMotivationalText();
};

export const getRandomGreeting = (userName?: string): string => {
  return randomMessages.getRandomGreeting(userName);
};

export const getRandomThanksResponse = (userName?: string): string => {
  return randomMessages.getRandomThanksResponse(userName);
};

export const getRandomGoodbye = (userName?: string): string => {
  return randomMessages.getRandomGoodbye(userName);
};

export const getRandomCasualResponse = (userName?: string): string => {
  return randomMessages.getRandomCasualResponse(userName);
};

export const getRandomContextFallback = (): string => {
  return randomMessages.getRandomContextFallback();
};

export default RandomMessagesUtil;
