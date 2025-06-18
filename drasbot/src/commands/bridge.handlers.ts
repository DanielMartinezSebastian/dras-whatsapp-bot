/**
 * WhatsApp Bridge Command Handlers
 *
 * This file implements handlers for bridge-specific commands.
 * Includes bridge status, chat listing, message history, QR code, and health check handlers.
 */

import { Logger } from '../utils/logger';
import { WhatsAppBridgeService } from '../services/whatsapp-bridge.service';
import { PluginContext, CommandResult, UserLevel, Message } from '../types';

/**
 * Bridge Status Command Handler - Shows detailed bridge status
 */
export const handleBridgeCommand = async (
  _message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();

  try {
    const whatsappBridge = WhatsAppBridgeService.getInstance();

    // Get bridge status and info
    const status = whatsappBridge.getStatus();
    const isAvailable = await whatsappBridge.isAvailable();

    let bridgeInfo;
    let connectionStatus;

    try {
      bridgeInfo = await whatsappBridge.getBridgeInfo();
      connectionStatus = await whatsappBridge.getConnectionStatus();
    } catch (error) {
      logger.warn('BridgeCommand', 'Failed to get detailed bridge info', {
        error,
      });
    }

    // Build bridge status message
    let statusText = `🌉 **Estado del Bridge WhatsApp**\n\n`;

    // Connection status
    statusText += `**🔗 Estado de Conexión:**\n`;
    statusText += `• Bridge disponible: ${isAvailable ? '✅ Sí' : '❌ No'}\n`;
    statusText += `• Estado interno: ${status.connected ? '✅ Conectado' : '❌ Desconectado'}\n`;

    if (connectionStatus) {
      statusText += `• Estado WhatsApp: ${connectionStatus.connected ? '✅ Conectado' : '❌ Desconectado'}\n`;
      statusText += `• Número conectado: ${connectionStatus.user_info?.phone || 'N/A'}\n`;
    }

    statusText += `• Última verificación: ${status.lastHealthCheck || 'N/A'}\n\n`;

    // Bridge information
    if (bridgeInfo) {
      statusText += `**ℹ️ Información del Bridge:**\n`;
      statusText += `• Versión: ${bridgeInfo.version || 'N/A'}\n`;
      statusText += `• Uptime: ${bridgeInfo.uptime || 'N/A'}\n`;
      statusText += `• Configuración activa: ${bridgeInfo.config ? '✅' : '❌'}\n\n`;
    }

    // Configuration details (for admins only)
    if (
      context.user.userLevel === UserLevel.ADMIN ||
      context.user.userLevel === UserLevel.OWNER
    ) {
      const config = whatsappBridge.getConfig();
      statusText += `**⚙️ Configuración del Bridge:**\n`;
      statusText += `• URL Base: ${config.baseURL}:${config.port}\n`;
      statusText += `• Timeout: ${config.timeout}ms\n`;
      statusText += `• Reintentos: ${config.retry?.maxRetries || 'N/A'}\n`;
      statusText += `• Delay entre reintentos: ${config.retry?.retryDelay || 'N/A'}ms\n\n`;
    }

    statusText += `⏰ Consultado: ${new Date().toLocaleString('es-ES')}`;

    return {
      success: true,
      message: statusText,
      data: {
        type: 'bridge_status',
        status,
        isAvailable,
        bridgeInfo,
        connectionStatus,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('BridgeCommand', 'Error executing bridge command', { error });
    return {
      success: false,
      message: 'Error al obtener el estado del bridge. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * Chat List Command Handler - Shows available chats
 */
export const handleChatsCommand = async (
  message: Message,
  _context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const args = message.content.split(' ').slice(1);

  try {
    const whatsappBridge = WhatsAppBridgeService.getInstance();

    // Check if bridge is available
    const isAvailable = await whatsappBridge.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        message: '❌ El bridge de WhatsApp no está disponible en este momento.',
        data: { error: 'bridge_not_available' },
      };
    }

    // Parse limit parameter
    const limit = args.length > 0 ? parseInt(args[0]) : 10;
    const validLimit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 50);

    // Get chat list
    const chatList = await whatsappBridge.getChatList();

    if (!chatList || !chatList.chats || chatList.chats.length === 0) {
      return {
        success: true,
        message: '📭 No se encontraron chats disponibles.',
        data: { type: 'empty_chat_list', limit: validLimit },
      };
    }

    // Limit the results
    const limitedChats = chatList.chats.slice(0, validLimit);

    // Build chat list message
    let chatsText = `💬 **Lista de Chats (${limitedChats.length}/${validLimit})**\n\n`;

    limitedChats.forEach((chat, index) => {
      const lastMessageTime = chat.last_message_time
        ? new Date(chat.last_message_time).toLocaleString('es-ES', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'N/A';

      chatsText += `**${index + 1}.** ${chat.name || 'Sin nombre'}\n`;
      chatsText += `   📞 ${chat.jid}\n`;
      chatsText += `   📬 ${chat.unread_count || 0} sin leer\n`;
      chatsText += `   ⏰ ${lastMessageTime}\n\n`;
    });

    chatsText += `💡 **Tip:** Usa \`!history [id_chat]\` para ver el historial de mensajes.`;

    return {
      success: true,
      message: chatsText,
      data: {
        type: 'chat_list',
        chats: chatList,
        limit: validLimit,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('ChatsCommand', 'Error executing chats command', { error });
    return {
      success: false,
      message: 'Error al obtener la lista de chats. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * Message History Command Handler - Shows message history for a chat
 */
export const handleHistoryCommand = async (
  message: Message,
  _context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const args = message.content.split(' ').slice(1);

  try {
    const whatsappBridge = WhatsAppBridgeService.getInstance();

    // Check if bridge is available
    const isAvailable = await whatsappBridge.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        message: '❌ El bridge de WhatsApp no está disponible en este momento.',
        data: { error: 'bridge_not_available' },
      };
    }

    // Parse parameters
    let chatId: string | undefined;
    let limit = 10;

    if (args.length === 0) {
      // No arguments - show current chat history
      chatId = message.user_id; // Using user_id as fallback
    } else if (args.length === 1) {
      // One argument - could be chatId or limit
      if (/^\d+$/.test(args[0])) {
        // It's a number, treat as limit for current chat
        limit = Math.min(parseInt(args[0]), 50);
        chatId = message.user_id; // Using user_id as fallback
      } else {
        // It's a chatId
        chatId = args[0];
      }
    } else {
      // Two arguments - chatId and limit
      chatId = args[0];
      limit = Math.min(parseInt(args[1]) || 10, 50);
    }

    if (!chatId) {
      return {
        success: false,
        message:
          '❌ No se pudo determinar el chat. Proporciona un ID de chat válido.',
        data: { error: 'invalid_chat_id' },
      };
    }

    // Get message history
    const messageHistory = await whatsappBridge.getMessageHistory({
      chat_jid: chatId,
      limit,
    });

    if (
      !messageHistory ||
      !messageHistory.messages ||
      messageHistory.messages.length === 0
    ) {
      return {
        success: true,
        message: `📭 No se encontraron mensajes en el historial para este chat.\n\n**Chat ID:** ${chatId}`,
        data: { type: 'empty_history', chatId, limit },
      };
    }

    // Build history message
    let historyText = `📜 **Historial de Mensajes (${messageHistory.messages.length}/${limit})**\n`;
    historyText += `📞 **Chat:** ${chatId}\n\n`;

    messageHistory.messages.forEach((msg, index) => {
      const timestamp = new Date(msg.timestamp).toLocaleString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const sender = msg.is_from_me
        ? '👤 Tú'
        : `👥 ${msg.sender || 'Desconocido'}`;
      const content =
        msg.content.length > 100
          ? msg.content.substring(0, 100) + '...'
          : msg.content;

      historyText += `**${index + 1}.** ${sender} (${timestamp})\n`;
      historyText += `   ${content}\n`;

      if (msg.media_type) {
        historyText += `   📎 Tipo: ${msg.media_type}\n`;
      }

      historyText += `\n`;
    });

    historyText += `💡 **Tip:** Usa \`!history ${chatId} [número]\` para ver más mensajes.`;

    return {
      success: true,
      message: historyText,
      data: {
        type: 'message_history',
        chatId,
        messages: messageHistory,
        limit,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('HistoryCommand', 'Error executing history command', {
      error,
    });
    return {
      success: false,
      message: 'Error al obtener el historial de mensajes. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * QR Code Command Handler - Gets QR code for WhatsApp connection (Admin only)
 */
export const handleQrCommand = async (
  _message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();

  try {
    // Check user permission
    if (
      context.user.userLevel !== UserLevel.ADMIN &&
      context.user.userLevel !== UserLevel.OWNER
    ) {
      return {
        success: false,
        message: '❌ No tienes permisos para ejecutar este comando.',
        data: { error: 'insufficient_permissions' },
      };
    }

    const whatsappBridge = WhatsAppBridgeService.getInstance();

    // Check if bridge is available
    const isAvailable = await whatsappBridge.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        message: '❌ El bridge de WhatsApp no está disponible en este momento.',
        data: { error: 'bridge_not_available' },
      };
    }

    // Get QR code
    const qrData = await whatsappBridge.getQRCode();

    if (!qrData || !qrData.qr_code) {
      return {
        success: false,
        message:
          '❌ No se pudo obtener el código QR. El dispositivo podría estar ya conectado.',
        data: { error: 'qr_not_available' },
      };
    }

    let qrText = `📱 **Código QR para WhatsApp**\n\n`;
    qrText += `**Estado:** ${qrData.success ? 'Generado' : 'Error'}\n`;
    qrText += `**Mensaje:** ${qrData.message}\n\n`;
    qrText += `**Código QR:**\n\`\`\`\n${qrData.qr_code}\n\`\`\`\n\n`;
    qrText += `💡 **Instrucciones:**\n`;
    qrText += `1. Abre WhatsApp en tu teléfono\n`;
    qrText += `2. Ve a Menú > Dispositivos vinculados\n`;
    qrText += `3. Toca "Vincular un dispositivo"\n`;
    qrText += `4. Escanea este código QR\n\n`;
    qrText += `⚠️ **Nota:** Este código es sensible, no lo compartas.`;

    return {
      success: true,
      message: qrText,
      data: {
        type: 'qr_code',
        qrData,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('QrCommand', 'Error executing QR command', { error });
    return {
      success: false,
      message: 'Error al obtener el código QR. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * Bridge Health Command Handler - Performs health check (Admin only)
 */
export const handleBridgeHealthCommand = async (
  _message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();

  try {
    // Check user permission
    if (
      context.user.userLevel !== UserLevel.ADMIN &&
      context.user.userLevel !== UserLevel.OWNER
    ) {
      return {
        success: false,
        message: '❌ No tienes permisos para ejecutar este comando.',
        data: { error: 'insufficient_permissions' },
      };
    }

    const whatsappBridge = WhatsAppBridgeService.getInstance();

    let healthText = `🔬 **Verificación de Salud del Bridge**\n\n`;
    healthText += `⏳ Ejecutando verificaciones...\n\n`;

    // Perform health check
    const healthResult = await whatsappBridge.performHealthCheck();

    // Update message with results
    healthText = `🔬 **Verificación de Salud del Bridge**\n\n`;

    healthText += `**🔗 Conectividad:**\n`;
    healthText += `• Bridge disponible: ${healthResult.bridge_available ? '✅ Sí' : '❌ No'}\n`;
    healthText += `• Estado: ${healthResult.status}\n`;
    healthText += `• Última verificación: ${healthResult.last_check}\n\n`;

    healthText += `**📊 Estado del Servicio:**\n`;
    healthText += `• Estado general: ${healthResult.status === 'connected' ? '✅ Saludable' : '❌ Problema detectado'}\n`;

    if (healthResult.error) {
      healthText += `• Error: ${healthResult.error}\n`;
    }

    healthText += `\n⏰ Verificación completada: ${new Date().toLocaleString('es-ES')}`;

    return {
      success: true,
      message: healthText,
      data: {
        type: 'bridge_health',
        healthResult,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error(
      'BridgeHealthCommand',
      'Error executing bridge health command',
      { error }
    );
    return {
      success: false,
      message: 'Error al verificar la salud del bridge. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * Command handlers map for easy access
 */
export const bridgeCommandHandlers = {
  bridge: handleBridgeCommand,
  chats: handleChatsCommand,
  history: handleHistoryCommand,
  qr: handleQrCommand,
  bridgehealth: handleBridgeHealthCommand,
};

/**
 * Export individual handlers for easy importing
 */
export {
  handleBridgeCommand as bridge,
  handleChatsCommand as chats,
  handleHistoryCommand as history,
  handleQrCommand as qr,
  handleBridgeHealthCommand as bridgeHealth,
};
