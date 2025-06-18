/**
 * Basic Bot Commands Definition
 *
 * This file defines the fundamental commands for the DrasBot system.
 * Includes help, status, user configuration, and administrative commands.
 */

import { Command, UserLevel } from '../types';

/**
 * Help Command Definition
 */
export const helpCommand: Command = {
  name: 'help',
  aliases: ['ayuda', 'comandos'],
  description: 'Muestra la lista de comandos disponibles',
  category: 'general',
  userLevel: UserLevel.USER,
  examples: ['!help', '!help status', '!ayuda'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Status Command Definition
 */
export const statusCommand: Command = {
  name: 'status',
  aliases: ['estado', 'info'],
  description: 'Muestra el estado actual del bot y estadísticas',
  category: 'general',
  userLevel: UserLevel.USER,
  examples: ['!status', '!estado'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Config Command Definition
 */
export const configCommand: Command = {
  name: 'config',
  aliases: ['configuracion', 'ajustes'],
  description: 'Gestiona tu configuración personal',
  category: 'user',
  userLevel: UserLevel.USER,
  examples: ['!config', '!config language es', '!config notifications on'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Registration Command Definition
 */
export const registrationCommand: Command = {
  name: 'registro',
  aliases: ['register', 'registrar', 'signup'],
  description: 'Inicia el proceso de registro en el sistema',
  category: 'user',
  userLevel: UserLevel.USER,
  examples: ['!registro', '!register'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Users Command Definition (for moderators and admins)
 */
export const usersCommand: Command = {
  name: 'users',
  aliases: ['usuarios', 'user'],
  description: 'Gestión de usuarios del sistema',
  category: 'moderation',
  userLevel: UserLevel.MODERATOR,
  examples: ['!users', '!users list', '!users ban @user'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Admin Command Definition (for admins only)
 */
export const adminCommand: Command = {
  name: 'admin',
  aliases: ['administration', 'panel'],
  description: 'Panel de administración del bot',
  category: 'admin',
  userLevel: UserLevel.ADMIN,
  examples: ['!admin', '!admin status', '!admin restart'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Export all basic commands
 */
export const basicCommands: Command[] = [
  helpCommand,
  statusCommand,
  configCommand,
  registrationCommand,
  usersCommand,
  adminCommand,
];

export default basicCommands;
