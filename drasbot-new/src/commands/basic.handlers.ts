/**
 * Basic Command Handlers
 * 
 * This file implements handlers for the fundamental commands for the DrasBot system.
 * Includes help, status, user configuration, and registration commands.
 */

import { Logger } from '../utils/logger';
import { WhatsAppBridgeService } from '../services/whatsapp-bridge.service';
import { ContextManagerService } from '../services/context-manager.service';
import {
  PluginContext,
  CommandResult,
  UserLevel,
  Message,
  ContextType,
} from '../types';

/**
 * Help Command Handler - Shows available commands
 */
export const handleHelpCommand = async (message: Message, context: PluginContext): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const args = message.content.split(' ').slice(1);
  
  try {
    if (args.length > 0) {
      // Show help for specific command
      const commandName = args[0].toLowerCase();
      
      // TODO: Get command details from CommandRegistry
      return {
        success: true,
        message: `📖 **Ayuda para el comando: ${commandName}**\n\n` +
                `Información detallada del comando aquí.\n\n` +
                `Usa \`!help\` para ver todos los comandos disponibles.`,
        data: { commandName, type: 'specific_help' }
      };
    }
    
    // Show general help
    const userLevel = context.user.userLevel;
    let helpText = `🤖 **DrasBot - Comandos Disponibles**\n\n`;
    
    // Basic commands for all users
    helpText += `**📋 Comandos Generales:**\n`;
    helpText += `• \`!help\` - Muestra esta ayuda\n`;
    helpText += `• \`!status\` - Estado del bot\n`;
    helpText += `• \`!config\` - Configuración personal\n`;
    helpText += `• \`!registro\` - Registrarse en el sistema\n\n`;
    
    // Moderator commands
    if (userLevel === UserLevel.MODERATOR || userLevel === UserLevel.ADMIN || userLevel === UserLevel.OWNER) {
      helpText += `**🛡️ Comandos de Moderación:**\n`;
      helpText += `• \`!users\` - Gestión de usuarios\n`;
      helpText += `• \`!stats\` - Estadísticas del bot\n\n`;
    }
    
    // Admin commands
    if (userLevel === UserLevel.ADMIN || userLevel === UserLevel.OWNER) {
      helpText += `**⚙️ Comandos de Administración:**\n`;
      helpText += `• \`!admin\` - Panel de administración\n`;
      helpText += `• \`!plugins\` - Gestión de plugins\n`;
      helpText += `• \`!backup\` - Backup del sistema\n\n`;
    }
    
    helpText += `💡 **Tip:** Usa \`!help [comando]\` para más información sobre un comando específico.`;
    
    return {
      success: true,
      message: helpText,
      data: { type: 'general_help', userLevel }
    };
    
  } catch (error) {
    logger.error('HelpCommand', 'Error executing help command', { error });
    return {
      success: false,
      message: 'Error al mostrar la ayuda. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};

/**
 * Status Command Handler - Shows bot status and statistics
 */
export const handleStatusCommand = async (_message: Message, context: PluginContext): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  
  try {
    const whatsappBridge = WhatsAppBridgeService.getInstance();
    const contextManager = ContextManagerService.getInstance();
    
    // Get system status
    const bridgeStatus = whatsappBridge.getStatus();
    const contextStats = contextManager.getStats();
    
    // Build status message
    let statusText = `🤖 **Estado del DrasBot**\n\n`;
    
    // Basic system status
    statusText += `**🔗 Conexión WhatsApp:**\n`;
    statusText += `• Estado: ${bridgeStatus.connected ? '✅ Conectado' : '❌ Desconectado'}\n`;
    statusText += `• Última verificación: ${bridgeStatus.lastHealthCheck || 'N/A'}\n\n`;
    
    // Context statistics
    statusText += `**📊 Contextos Activos:**\n`;
    statusText += `• Contextos activos: ${contextStats.activeContexts}\n`;
    statusText += `• Handlers registrados: ${contextStats.totalHandlers}\n`;
    statusText += `• Detecciones realizadas: ${contextStats.totalDetections}\n`;
    statusText += `• Ejecuciones totales: ${contextStats.totalExecutions}\n\n`;
    
    // User level specific information
    if (context.user.userLevel === UserLevel.ADMIN || context.user.userLevel === UserLevel.OWNER) {
      statusText += `**⚙️ Información de Sistema:**\n`;
      statusText += `• Uptime: ${process.uptime().toFixed(0)}s\n`;
      statusText += `• Memoria usada: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
      statusText += `• Versión Node.js: ${process.version}\n\n`;
    }
    
    statusText += `⏰ Última actualización: ${new Date().toLocaleString('es-ES')}`;
    
    return {
      success: true,
      message: statusText,
      data: { 
        type: 'status_info', 
        bridgeStatus, 
        contextStats,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error('StatusCommand', 'Error executing status command', { error });
    return {
      success: false,
      message: 'Error al obtener el estado del bot. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};

/**
 * Config Command Handler - User configuration management
 */
export const handleConfigCommand = async (message: Message, context: PluginContext): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const contextManager = ContextManagerService.getInstance();
  const args = message.content.split(' ').slice(1);
  
  try {
    if (args.length === 0) {
      // Show current configuration
      const userPrefs = context.user.preferences;
      
      let configText = `⚙️ **Tu Configuración Actual**\n\n`;
      configText += `**🔔 Notificaciones:** ${userPrefs.notifications ? 'Activadas' : 'Desactivadas'}\n`;
      configText += `**🤖 Respuesta automática:** ${userPrefs.auto_reply ? 'Activada' : 'Desactivada'}\n`;
      configText += `**🌍 Idioma:** ${userPrefs.language || 'es'}\n`;
      configText += `**🕐 Zona horaria:** ${userPrefs.timezone || 'UTC'}\n`;
      configText += `**🔒 Privacidad:** ${userPrefs.privacy_level || 'normal'}\n\n`;
      
      configText += `💡 **Cambiar configuración:**\n`;
      configText += `• \`!config notifications on/off\`\n`;
      configText += `• \`!config auto_reply on/off\`\n`;
      configText += `• \`!config language es/en\`\n`;
      configText += `• \`!config privacy open/normal/strict\``;
      
      return {
        success: true,
        message: configText,
        data: { type: 'show_config', preferences: userPrefs }
      };
    }
    
    if (args.length === 1) {
      const setting = args[0].toLowerCase();
      
      // Start configuration context for this setting
      await contextManager.createSpecificContext(
        context.user.id.toString(),
        ContextType.CONFIGURATION,
        {
          setting,
          step: 'awaiting_value',
          userId: context.user.id
        }
      );
      
      let settingName = '';
      let currentValue = '';
      let options = '';
      
      switch (setting) {
        case 'notifications':
        case 'notificaciones':
          settingName = 'Notificaciones';
          currentValue = context.user.preferences.notifications ? 'activadas' : 'desactivadas';
          options = 'on/off, activar/desactivar, sí/no';
          break;
        case 'auto_reply':
        case 'respuesta_automatica':
          settingName = 'Respuesta automática';
          currentValue = context.user.preferences.auto_reply ? 'activada' : 'desactivada';
          options = 'on/off, activar/desactivar, sí/no';
          break;
        case 'language':
        case 'idioma':
          settingName = 'Idioma';
          currentValue = context.user.preferences.language || 'es';
          options = 'es, en';
          break;
        case 'privacy':
        case 'privacidad':
          settingName = 'Nivel de privacidad';
          currentValue = context.user.preferences.privacy_level || 'normal';
          options = 'open, normal, strict';
          break;
        default:
          return {
            success: false,
            message: `❌ Configuración "${setting}" no reconocida.\n\nUsa \`!config\` para ver las opciones disponibles.`,
            data: { error: 'unknown_setting', setting }
          };
      }
      
      return {
        success: true,
        message: `⚙️ **Configurar ${settingName}**\n\n` +
                `Valor actual: **${currentValue}**\n\n` +
                `Escribe el nuevo valor (${options}):`,
        data: { 
          type: 'config_prompt', 
          setting, 
          settingName, 
          currentValue,
          contextCreated: true
        }
      };
    }
    
    if (args.length >= 2) {
      const setting = args[0].toLowerCase();
      const value = args.slice(1).join(' ').toLowerCase();
      
      // TODO: Implement actual configuration update to database
      // For now, we'll just simulate the update
      
      let updateMessage = '';
      let success = true;
      
      switch (setting) {
        case 'notifications':
        case 'notificaciones':
          const notifValue = ['on', 'activar', 'sí', 'si', 'yes', 'true'].includes(value);
          updateMessage = `✅ Notificaciones ${notifValue ? 'activadas' : 'desactivadas'} correctamente.`;
          break;
        case 'auto_reply':
        case 'respuesta_automatica':
          const autoValue = ['on', 'activar', 'sí', 'si', 'yes', 'true'].includes(value);
          updateMessage = `✅ Respuesta automática ${autoValue ? 'activada' : 'desactivada'} correctamente.`;
          break;
        case 'language':
        case 'idioma':
          if (['es', 'en'].includes(value)) {
            updateMessage = `✅ Idioma cambiado a ${value === 'es' ? 'Español' : 'English'} correctamente.`;
          } else {
            success = false;
            updateMessage = `❌ Idioma "${value}" no soportado. Usa: es, en`;
          }
          break;
        case 'privacy':
        case 'privacidad':
          if (['open', 'normal', 'strict'].includes(value)) {
            updateMessage = `✅ Nivel de privacidad cambiado a "${value}" correctamente.`;
          } else {
            success = false;
            updateMessage = `❌ Nivel de privacidad "${value}" no válido. Usa: open, normal, strict`;
          }
          break;
        default:
          success = false;
          updateMessage = `❌ Configuración "${setting}" no reconocida.`;
      }
      
      return {
        success,
        message: updateMessage,
        data: { 
          type: success ? 'config_updated' : 'config_error', 
          setting, 
          value,
          updated: success
        }
      };
    }
    
    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      message: 'Error en el comando de configuración.',
      data: { error: 'unexpected_flow' }
    };
    
  } catch (error) {
    logger.error('ConfigCommand', 'Error executing config command', { error });
    return {
      success: false,
      message: 'Error al gestionar la configuración. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};

/**
 * Registration Command Handler - User registration process
 */
export const handleRegistrationCommand = async (_message: Message, context: PluginContext): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const contextManager = ContextManagerService.getInstance();
  
  try {
    // Check if user is already registered
    if (context.user.isRegistered) {
      return {
        success: true,
        message: `✅ Ya estás registrado en el sistema, ${context.user.name}!\n\n` +
                `Usa \`!help\` para ver los comandos disponibles.`,
        data: { type: 'already_registered', userId: context.user.id }
      };
    }
    
    // Check if user already has an active registration context
    const activeContext = await contextManager.getActiveContext(context.user.id.toString());
    if (activeContext && activeContext.contextType === ContextType.REGISTRATION) {
      return {
        success: true,
        message: `🔄 Ya tienes un proceso de registro en curso.\n\n` +
                `Continúa respondiendo a las preguntas o escribe \`!cancelar\` para empezar de nuevo.`,
        data: { type: 'registration_in_progress', contextId: activeContext.id }
      };
    }
    
    // Start registration context
    await contextManager.createSpecificContext(
      context.user.id.toString(),
      ContextType.REGISTRATION,
      {
        step: 'start',
        userId: context.user.id,
        startedAt: new Date().toISOString()
      }
    );
    
    return {
      success: true,
      message: `🎉 **¡Bienvenido al proceso de registro de DrasBot!**\n\n` +
              `Te ayudaré a configurar tu cuenta paso a paso.\n\n` +
              `Para comenzar, ¿cuál es tu nombre?`,
      data: { 
        type: 'registration_started', 
        userId: context.user.id,
        contextCreated: true
      }
    };
    
  } catch (error) {
    logger.error('RegistrationCommand', 'Error executing registration command', { error });
    return {
      success: false,
      message: 'Error al iniciar el registro. Inténtalo de nuevo.',
      data: { error: error instanceof Error ? error.message : String(error) }
    };
  }
};

/**
 * Command handler mapping
 */
export const commandHandlers = {
  help: handleHelpCommand,
  ayuda: handleHelpCommand,
  comandos: handleHelpCommand,
  
  status: handleStatusCommand,
  estado: handleStatusCommand,
  info: handleStatusCommand,
  
  config: handleConfigCommand,
  configuracion: handleConfigCommand,
  ajustes: handleConfigCommand,
  
  registro: handleRegistrationCommand,
  register: handleRegistrationCommand,
  registrar: handleRegistrationCommand,
  signup: handleRegistrationCommand,
};

export default commandHandlers;
