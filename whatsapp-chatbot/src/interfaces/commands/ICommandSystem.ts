// Command System Interfaces
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
  CommandValidation,
  CommandRegistryEntry,
  CommandRegistryOptions,
  CommandSearchOptions,
  CommandRegistryStats,
  CommandCategory,
  Permission,
} from "../../types/commands/command-system.types";
import { User } from "../../types/core";

export interface ICommand {
  readonly metadata: CommandMetadata;

  /**
   * Ejecuta el comando con el contexto proporcionado
   */
  execute(context: CommandContext): Promise<CommandResult>;

  /**
   * Valida si el comando puede ser ejecutado con el contexto dado
   */
  validate(context: CommandContext): CommandValidation;

  /**
   * Verifica si el usuario tiene permisos para ejecutar este comando
   */
  canExecute(user: User): boolean;

  /**
   * Obtiene el mensaje de ayuda del comando
   */
  getHelp(): string;

  /**
   * Obtiene ejemplos de uso del comando
   */
  getUsageExamples(): string[];
}

export interface ICommandRegistry {
  /**
   * Registra un comando en el registry
   */
  register(command: ICommand): Promise<boolean>;

  /**
   * Desregistra un comando del registry
   */
  unregister(commandName: string): boolean;

  /**
   * Busca un comando por nombre o alias
   */
  findCommand(name: string): CommandRegistryEntry | null;

  /**
   * Busca comandos según criterios específicos
   */
  searchCommands(options: CommandSearchOptions): CommandRegistryEntry[];

  /**
   * Obtiene todos los comandos de una categoría
   */
  getCommandsByCategory(category: CommandCategory): CommandRegistryEntry[];

  /**
   * Obtiene comandos disponibles para un usuario específico
   */
  getAvailableCommands(user: User): CommandRegistryEntry[];

  /**
   * Carga comandos automáticamente desde directorios
   */
  loadCommands(directory?: string): Promise<number>;

  /**
   * Ejecuta un comando por nombre
   */
  executeCommand(
    commandName: string,
    context: CommandContext
  ): Promise<CommandResult>;

  /**
   * Verifica si un comando existe
   */
  hasCommand(name: string): boolean;

  /**
   * Obtiene estadísticas del registry
   */
  getStats(): CommandRegistryStats;

  /**
   * Obtiene lista de todos los comandos registrados
   */
  getAllCommands(): CommandRegistryEntry[];

  /**
   * Actualiza la configuración del registry
   */
  updateOptions(options: Partial<CommandRegistryOptions>): void;

  /**
   * Limpia el registry de comandos
   */
  clear(): void;
}

export interface ICommandHandler {
  /**
   * Maneja la ejecución de un comando
   */
  handleCommand(context: CommandContext): Promise<CommandResult>;

  /**
   * Parsea un mensaje para extraer el comando y argumentos
   */
  parseCommand(message: string): { command: string; args: string[] } | null;

  /**
   * Verifica si un mensaje es un comando
   */
  isCommand(message: string): boolean;

  /**
   * Obtiene el prefijo de comandos actual
   */
  getCommandPrefix(): string;

  /**
   * Actualiza el prefijo de comandos
   */
  setCommandPrefix(prefix: string): void;
}
