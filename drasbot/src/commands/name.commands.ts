/**
 * Name Registration Commands
 * Commands for handling user name registration and management
 */

import { Command, UserLevel } from '../types';

/**
 * Me llamo Command - Set user name
 */
export const setNameCommand: Command = {
  name: 'mellamo',
  aliases: ['soy', 'llamame', 'mi-nombre', 'nombre', 'name'],
  description: 'Establece tu nombre en el sistema',
  category: 'user',
  userLevel: UserLevel.USER,
  examples: [
    '!mellamo Juan',
    '!soy María',
    '!llamame Pedro',
    '!nombre Ana',
    'me llamo Carlos',
    'soy Laura',
    'llamame Diego',
  ],
  enabled: true,
  plugin: 'basic',
};

/**
 * Who am I Command - Show current user name
 */
export const whoAmICommand: Command = {
  name: 'quien-soy',
  aliases: ['mi-info', 'whoami'],
  description: 'Muestra tu información de perfil actual',
  category: 'user',
  userLevel: UserLevel.USER,
  examples: ['!quien-soy', '!mi-info'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Profile Command (Spanish) - Show current user profile
 */
export const profileCommand: Command = {
  name: 'perfil',
  aliases: ['mi-perfil'],
  description: 'Muestra tu perfil de usuario',
  category: 'user',
  userLevel: UserLevel.USER,
  examples: ['!perfil', '!mi-perfil'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Profile Command (English) - Show current user profile
 */
export const profileEnCommand: Command = {
  name: 'profile',
  aliases: ['my-profile', 'user-profile'],
  description: 'Shows your user profile',
  category: 'user',
  userLevel: UserLevel.USER,
  examples: ['!profile', '!my-profile'],
  enabled: true,
  plugin: 'basic',
};

/**
 * Export name registration commands
 */
export const nameCommands: Command[] = [
  setNameCommand,
  whoAmICommand,
  profileCommand,
  profileEnCommand,
];
