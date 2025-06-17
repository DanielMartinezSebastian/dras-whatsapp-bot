/**
 * Command Registry Integration
 * 
 * This file integrates command definitions with their handlers and
 * provides utilities for registering commands in the CommandRegistryService.
 */

import { CommandRegistryService } from '../services/command-registry.service';
import { Logger } from '../utils/logger';
import { basicCommands } from './basic.commands';
import { commandHandlers } from './basic.handlers';
import { Command } from '../types';

/**
 * Register all basic commands with their handlers
 */
export const registerBasicCommands = async (): Promise<void> => {
  const logger = Logger.getInstance();
  const commandRegistry = CommandRegistryService.getInstance();
  
  logger.info('CommandRegistration', 'Registering basic commands...');
  
  try {
    for (const command of basicCommands) {
      // Register the command definition
      commandRegistry.registerCommand(command);
      
      logger.info('CommandRegistration', `✅ Registered command: ${command.name}`, {
        aliases: command.aliases,
        category: command.category,
        userLevel: command.userLevel,
      });
    }
    
    logger.info('CommandRegistration', `✅ Successfully registered ${basicCommands.length} basic commands`);
    
  } catch (error) {
    logger.error('CommandRegistration', 'Failed to register basic commands', { error });
    throw error;
  }
};

/**
 * Get command handler by name or alias
 */
export const getCommandHandler = (commandName: string): ((message: any, context: any) => Promise<any>) | null => {
  const normalizedName = commandName.toLowerCase();
  
  // Check direct mapping first
  const handlers = commandHandlers as Record<string, any>;
  if (handlers[normalizedName]) {
    return handlers[normalizedName];
  }
  
  // Check if any command has this as an alias
  for (const command of basicCommands) {
    if (command.name === normalizedName || command.aliases.includes(normalizedName)) {
      // Map command name to handler
      const handlerKey = Object.keys(handlers).find(key => {
        const handlerCommand = basicCommands.find(cmd => 
          cmd.name === key || cmd.aliases.includes(key)
        );
        return handlerCommand && (handlerCommand.name === command.name);
      });
      
      if (handlerKey && handlers[handlerKey]) {
        return handlers[handlerKey];
      }
    }
  }
  
  return null;
};

/**
 * Get command definition by name or alias
 */
export const getCommandDefinition = (commandName: string): Command | null => {
  const normalizedName = commandName.toLowerCase();
  
  for (const command of basicCommands) {
    if (command.name === normalizedName || command.aliases.includes(normalizedName)) {
      return command;
    }
  }
  
  return null;
};

/**
 * Check if command exists
 */
export const commandExists = (commandName: string): boolean => {
  return getCommandDefinition(commandName) !== null;
};

/**
 * Get all available commands for a user level
 */
export const getAvailableCommands = (userLevel: number): Command[] => {
  return basicCommands.filter(command => {
    // Convert UserLevel enum to number for comparison
    const commandLevelValue = Object.values(require('../types').UserLevel).indexOf(command.userLevel);
    return userLevel >= commandLevelValue;
  });
};

/**
 * Command execution helper
 */
export const executeCommand = async (
  commandName: string, 
  message: any, 
  context: any
): Promise<any> => {
  const handler = getCommandHandler(commandName);
  
  if (!handler) {
    return {
      success: false,
      message: `❌ Comando "${commandName}" no encontrado.`,
      data: { error: 'command_not_found', commandName }
    };
  }
  
  try {
    return await handler(message, context);
  } catch (error) {
    const logger = Logger.getInstance();
    logger.error('CommandExecution', `Error executing command: ${commandName}`, { error });
    
    return {
      success: false,
      message: 'Error al ejecutar el comando. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};

export default {
  registerBasicCommands,
  getCommandHandler,
  getCommandDefinition,
  commandExists,
  getAvailableCommands,
  executeCommand,
};
