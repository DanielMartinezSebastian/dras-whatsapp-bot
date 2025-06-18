/**
 * TestCommand Command Plugin
 * A test command plugin for DrasBot
 */

import { ICommand, CommandConfig } from '../../interfaces';
import {
  User,
  Message,
  CommandResult,
  PluginMetadata,
  UserLevel,
} from '../../types';
import { Logger } from '../../utils/logger';

export class TestCommandCommand implements ICommand {
  public readonly metadata: PluginMetadata = {
    name: 'test-command',
    version: '1.0.0',
    author: 'DrasBot Developer',
    description: 'A test command plugin for DrasBot',
    category: 'command',
  };

  public readonly config: CommandConfig = {
    name: 'testcommand',
    aliases: ['test', 'demo'],
    description: 'A test command plugin for DrasBot',
    usage: '!testcommand [options]',
    category: 'general',
    min_user_level: UserLevel.USER,
    enabled: true,
  };

  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  async execute(
    message: Message,
    user: User,
    args: string[]
  ): Promise<CommandResult> {
    try {
      this.logger.info('TestCommandCommand', 'Executing command', {
        user: user.id,
        message: message.content,
        args,
      });

      // Test command logic
      const response = this.generateResponse(user, args);

      return {
        success: true,
        response,
        metadata: {
          command: this.config.name,
          executedAt: new Date().toISOString(),
          args,
        },
      };
    } catch (error) {
      this.logger.error('TestCommandCommand', 'Command execution failed', {
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        error: 'Command execution failed',
        response: 'Lo siento, ocurrió un error al procesar tu comando.',
      };
    }
  }

  private generateResponse(user: User, args: string[]): string {
    return `¡Hola ${user.name}! Este es el comando de prueba ${this.config.name}.
    
✅ El sistema de plugins está funcionando correctamente.
🕒 Ejecutado el: ${new Date().toLocaleString('es-ES')}
👤 Usuario: ${user.name} (${user.userLevel})
� Argumentos: ${args.length > 0 ? args.join(', ') : 'ninguno'}

📋 Configuración del comando:
   • Nombre: ${this.config.name}
   • Aliases: ${this.config.aliases?.join(', ') || 'ninguno'}
   • Categoría: ${this.config.category}
   • Nivel mínimo: ${this.config.min_user_level}`;
  }

  validatePermissions(user: User): boolean {
    // Check if user level meets minimum requirement
    const userLevels = [
      UserLevel.BANNED,
      UserLevel.USER,
      UserLevel.MODERATOR,
      UserLevel.ADMIN,
      UserLevel.OWNER,
    ];
    const userLevelIndex = userLevels.indexOf(user.userLevel);
    const requiredLevelIndex = userLevels.indexOf(this.config.min_user_level);

    if (userLevelIndex === -1 || requiredLevelIndex === -1) {
      return false;
    }

    return userLevelIndex >= requiredLevelIndex && !user.banned;
  }

  getUsage(): string {
    return `${this.config.usage}

${this.config.description}

Este comando es una demostración del sistema de plugins de DrasBot v2.0.

Ejemplos:
  !${this.config.name}           - Uso básico
  !${this.config.aliases?.[0]}   - Usando alias
  !${this.config.name} test arg  - Con argumentos

Características:
  ✓ Logging automático
  ✓ Validación de permisos
  ✓ Manejo de errores
  ✓ Metadata del comando
  ✓ Soporte para aliases
`;
  }
}

export default TestCommandCommand;
