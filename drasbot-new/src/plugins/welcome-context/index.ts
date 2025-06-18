/**
 * Welcome Context Plugin
 * Handles new user welcome and onboarding flow
 */

import { IContextHandler, ContextConfig, ContextStep } from '../../interfaces';
import {
  User,
  Message,
  CommandResult,
  ConversationContext,
  PluginMetadata,
  ContextType,
} from '../../types';
import { Logger } from '../../utils/logger';

export class WelcomeContextHandler implements IContextHandler {
  public readonly metadata: PluginMetadata = {
    name: 'welcome-context',
    version: '1.0.0',
    author: 'DrasBot Developer',
    description: 'Welcome and onboarding context for new users',
    category: 'context',
  };

  public readonly config: ContextConfig = {
    name: 'welcome',
    description: 'Welcome and onboarding flow for new users',
    max_duration: 300000, // 5 minutes
    auto_exit_on_timeout: true,
    steps: [
      {
        id: 'greeting',
        name: 'Welcome Greeting',
        message_key: 'welcome.greeting',
        validation: {
          type: 'text',
          required: false,
        },
        next_step: 'name_request',
      },
      {
        id: 'name_request',
        name: 'Request Name',
        message_key: 'welcome.name_request',
        validation: {
          type: 'text',
          min_length: 2,
          max_length: 50,
          required: true,
        },
        next_step: 'language_selection',
      },
      {
        id: 'language_selection',
        name: 'Language Selection',
        message_key: 'welcome.language_selection',
        validation: {
          type: 'choice',
          choices: ['es', 'en', 'pt'],
          required: true,
        },
        next_step: 'completion',
      },
      {
        id: 'completion',
        name: 'Welcome Complete',
        message_key: 'welcome.completion',
        validation: {
          type: 'text',
          required: false,
        },
      },
    ],
    completion_reward: {
      points: 10,
    },
  };

  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async enter(
    user: User,
    initialData?: Record<string, any>
  ): Promise<ConversationContext> {
    try {
      this.logger.info(
        'WelcomeContextHandler',
        'User entering welcome context',
        {
          user: user.id,
          initialData,
        }
      );

      const context: ConversationContext = {
        id: `welcome_${user.id}_${Date.now()}`,
        user_id: user.id.toString(),
        context_type: ContextType.CONVERSATION,
        context_data: {
          step: 'greeting',
          user_data: {},
          started_at: new Date().toISOString(),
          ...initialData,
        },
        is_active: true,
        expires_at: new Date(
          Date.now() + this.config.max_duration
        ).toISOString(),
        step_index: 0,
        metadata: {
          handler: this.metadata.name,
          version: this.metadata.version,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return context;
    } catch (error) {
      this.logger.error('WelcomeContextHandler', 'Failed to enter context', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async process(
    context: ConversationContext,
    message: Message,
    user: User
  ): Promise<CommandResult> {
    try {
      this.logger.info(
        'WelcomeContextHandler',
        'Processing message in welcome context',
        {
          user: user.id,
          step: context.context_data.step,
          message: message.content,
        }
      );

      const currentStep = this.getCurrentStep(context);
      if (!currentStep) {
        return {
          success: false,
          error: 'Invalid context step',
          response: 'Lo siento, hay un problema con el flujo de bienvenida.',
        };
      }

      // Validate input
      if (!this.validateStep(context, message.content)) {
        return {
          success: false,
          error: 'Invalid input',
          response: this.getValidationErrorMessage(currentStep),
        };
      }

      // Process the step
      const response = await this.processStep(
        context,
        currentStep,
        message.content,
        user
      );

      return {
        success: true,
        response,
        metadata: {
          context: this.metadata.name,
          step: currentStep.id,
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('WelcomeContextHandler', 'Context processing failed', {
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        error: 'Context processing failed',
        response: 'Lo siento, ocurrió un error en el flujo de bienvenida.',
      };
    }
  }

  async exit(context: ConversationContext, user: User): Promise<void> {
    try {
      this.logger.info(
        'WelcomeContextHandler',
        'User exiting welcome context',
        {
          user: user.id,
          contextId: context.id,
          completed: context.context_data.completed || false,
        }
      );

      // Cleanup logic here if needed
      // For example, save completion status, award points, etc.

      if (context.context_data.completed) {
        await this.handleCompletion(context, user);
      }
    } catch (error) {
      this.logger.error('WelcomeContextHandler', 'Context exit failed', {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  validateStep(context: ConversationContext, input: string): boolean {
    const currentStep = this.getCurrentStep(context);
    if (!currentStep || !currentStep.validation) {
      return true;
    }

    const validation = currentStep.validation;
    const trimmedInput = input.trim();

    if (validation.required && !trimmedInput) {
      return false;
    }

    switch (validation.type) {
      case 'text':
        if (
          validation.min_length &&
          trimmedInput.length < validation.min_length
        ) {
          return false;
        }
        if (
          validation.max_length &&
          trimmedInput.length > validation.max_length
        ) {
          return false;
        }
        break;

      case 'choice':
        if (
          validation.choices &&
          !validation.choices.includes(trimmedInput.toLowerCase())
        ) {
          return false;
        }
        break;

      case 'regex':
        if (
          validation.pattern &&
          !new RegExp(validation.pattern).test(trimmedInput)
        ) {
          return false;
        }
        break;
    }

    return true;
  }

  getNextStep(context: ConversationContext): ContextStep | null {
    const currentStep = this.getCurrentStep(context);
    if (!currentStep || !currentStep.next_step) {
      return null;
    }

    const nextStepId =
      typeof currentStep.next_step === 'string'
        ? currentStep.next_step
        : currentStep.next_step(context.context_data);

    return this.config.steps.find(step => step.id === nextStepId) || null;
  }

  private getCurrentStep(context: ConversationContext): ContextStep | null {
    const stepId = context.context_data.step;
    return this.config.steps.find(step => step.id === stepId) || null;
  }

  private async processStep(
    context: ConversationContext,
    step: ContextStep,
    input: string,
    user: User
  ): Promise<string> {
    // Save the input data
    context.context_data.user_data[step.id] = input.trim();

    let response = '';

    switch (step.id) {
      case 'greeting':
        response = `¡Hola ${user.name}! 👋 Bienvenido/a a DrasBot.

Me da mucho gusto tenerte aquí. Voy a ayudarte a configurar tu experiencia.

¿Podrías decirme cómo te gustaría que te llame?`;
        context.context_data.step = 'name_request';
        break;

      case 'name_request':
        const preferredName = input.trim();
        context.context_data.user_data.preferred_name = preferredName;
        response = `Encantado de conocerte, ${preferredName}! 😊

Ahora, ¿qué idioma prefieres para nuestras conversaciones?

Por favor elige una opción:
• **es** - Español
• **en** - English  
• **pt** - Português`;
        context.context_data.step = 'language_selection';
        break;

      case 'language_selection':
        const language = input.trim().toLowerCase();
        context.context_data.user_data.language = language;

        const languageNames = { es: 'Español', en: 'English', pt: 'Português' };
        const langName =
          languageNames[language as keyof typeof languageNames] || language;

        response = `¡Perfecto! He configurado tu idioma como ${langName}. 🌐

${context.context_data.user_data.preferred_name}, ya tienes todo listo para empezar a usar DrasBot.

✅ **Configuración completa:**
• Nombre: ${context.context_data.user_data.preferred_name}
• Idioma: ${langName}

Puedes empezar a usar los comandos disponibles. Escribe **!help** para ver qué puedo hacer por ti.

¡Que disfrutes tu experiencia! 🚀`;

        context.context_data.step = 'completion';
        context.context_data.completed = true;
        break;

      default:
        response = 'Paso completado.';
    }

    context.updated_at = new Date().toISOString();
    return response;
  }

  private getValidationErrorMessage(step: ContextStep): string {
    const validation = step.validation;
    if (!validation) return 'Entrada inválida.';

    switch (validation.type) {
      case 'text':
        if (validation.min_length) {
          return `Por favor ingresa al menos ${validation.min_length} caracteres.`;
        }
        if (validation.max_length) {
          return `Por favor ingresa máximo ${validation.max_length} caracteres.`;
        }
        break;

      case 'choice':
        if (validation.choices) {
          return `Por favor elige una de estas opciones: ${validation.choices.join(', ')}`;
        }
        break;
    }

    return 'Por favor ingresa una respuesta válida.';
  }

  private async handleCompletion(
    context: ConversationContext,
    user: User
  ): Promise<void> {
    this.logger.info('WelcomeContextHandler', 'Welcome flow completed', {
      user: user.id,
      userData: context.context_data.user_data,
    });

    // Here you could:
    // - Update user preferences in database
    // - Award completion points
    // - Send completion notification
    // - Update user registration status
  }
}

export default WelcomeContextHandler;
