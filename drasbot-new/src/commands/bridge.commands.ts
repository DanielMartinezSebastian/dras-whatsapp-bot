/**
 * WhatsApp Bridge Commands Definition
 *
 * This file defines commands for interacting with the WhatsApp Bridge functionality.
 * Includes bridge status, chat management, and message history commands.
 */

import { Command, UserLevel } from '../types';

/**
 * Bridge Status Command Definition
 */
export const bridgeCommand: Command = {
  name: 'bridge',
  aliases: ['conexion', 'puente'],
  description: 'Muestra el estado detallado del bridge de WhatsApp',
  category: 'bridge',
  userLevel: UserLevel.USER,
  examples: ['!bridge', '!conexion'],
  enabled: true,
  plugin: 'bridge',
};

/**
 * Chat List Command Definition
 */
export const chatsCommand: Command = {
  name: 'chats',
  aliases: ['conversaciones', 'lista'],
  description: 'Muestra la lista de chats recientes disponibles',
  category: 'bridge',
  userLevel: UserLevel.USER,
  examples: ['!chats', '!chats 10', '!conversaciones'],
  enabled: true,
  plugin: 'bridge',
};

/**
 * Message History Command Definition
 */
export const historyCommand: Command = {
  name: 'history',
  aliases: ['historial', 'mensajes'],
  description: 'Muestra el historial de mensajes de un chat específico',
  category: 'bridge',
  userLevel: UserLevel.USER,
  examples: [
    '!history',
    '!history 5521234567890@s.whatsapp.net',
    '!historial 10',
    '!mensajes 5521234567890@s.whatsapp.net 20',
  ],
  enabled: true,
  plugin: 'bridge',
};

/**
 * QR Code Command Definition
 */
export const qrCommand: Command = {
  name: 'qr',
  aliases: ['codigo', 'conectar'],
  description: 'Obtiene el código QR para conectar WhatsApp (solo admins)',
  category: 'bridge',
  userLevel: UserLevel.ADMIN,
  examples: ['!qr', '!codigo', '!conectar'],
  enabled: true,
  plugin: 'bridge',
};

/**
 * Bridge Health Command Definition
 */
export const bridgeHealthCommand: Command = {
  name: 'bridgehealth',
  aliases: ['salud-bridge', 'health'],
  description: 'Verifica la salud y conectividad del bridge (solo admins)',
  category: 'bridge',
  userLevel: UserLevel.ADMIN,
  examples: ['!bridgehealth', '!salud-bridge', '!health'],
  enabled: true,
  plugin: 'bridge',
};

/**
 * All bridge commands array
 */
export const bridgeCommands: Command[] = [
  bridgeCommand,
  chatsCommand,
  historyCommand,
  qrCommand,
  bridgeHealthCommand,
];

/**
 * Export individual commands for easy importing
 */
export {
  bridgeCommand as bridge,
  chatsCommand as chats,
  historyCommand as history,
  qrCommand as qr,
  bridgeHealthCommand as bridgeHealth,
};
