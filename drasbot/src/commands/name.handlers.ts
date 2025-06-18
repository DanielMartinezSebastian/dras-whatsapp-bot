/**
 * Name Registration Handlers
 * Handlers for user name registration and management commands
 */

import { Logger } from '../utils/logger';
import { DatabaseService } from '../services/database.service';
import { ContextManagerService } from '../services/context-manager.service';
import { PluginContext, CommandResult, Message, ContextType } from '../types';

/**
 * Validates a display name
 */
function validateDisplayName(name: string): {
  valid: boolean;
  reason?: string;
} {
  // Remove extra whitespace
  const trimmedName = name.trim();

  // Check if empty
  if (!trimmedName) {
    return { valid: false, reason: 'El nombre no puede estar vacío' };
  }

  // Check length (minimum 2, maximum 50 characters)
  if (trimmedName.length < 2) {
    return {
      valid: false,
      reason: 'El nombre debe tener al menos 2 caracteres',
    };
  }

  if (trimmedName.length > 50) {
    return {
      valid: false,
      reason: 'El nombre no puede tener más de 50 caracteres',
    };
  }

  // Check if it contains only numbers (phone number check)
  if (/^\d+$/.test(trimmedName)) {
    return {
      valid: false,
      reason: 'El nombre no puede ser solo números (parece un teléfono)',
    };
  }

  // Check for phone number patterns (+, country codes, etc.)
  if (/^[\+]?[\d\s\-\(\)]{8,}$/.test(trimmedName)) {
    return {
      valid: false,
      reason: 'El nombre no puede ser un número de teléfono',
    };
  }

  // Check for valid characters (letters, numbers, spaces, some special chars)
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\.\-_]+$/.test(trimmedName)) {
    return { valid: false, reason: 'El nombre contiene caracteres no válidos' };
  }

  return { valid: true };
}

/**
 * Set Name Command Handler
 */
export const handleSetNameCommand = async (
  message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const database = DatabaseService.getInstance();
  const contextManager = ContextManagerService.getInstance();

  try {
    // Parse the message to extract the name
    const content = message.content.trim();
    let name = '';

    // Handle different patterns
    if (content.startsWith('!')) {
      // Command format: !mellamo Juan, !soy María, etc.
      const parts = content.split(' ');
      if (parts.length > 1) {
        name = parts.slice(1).join(' ').trim();
      }
    } else {
      // Natural language format: "me llamo Juan", "soy María", "llamame Pedro"
      const lowerContent = content.toLowerCase();

      if (lowerContent.startsWith('me llamo ')) {
        name = content.substring(9).trim();
      } else if (lowerContent.startsWith('soy ')) {
        name = content.substring(4).trim();
      } else if (
        lowerContent.startsWith('llamame ') ||
        lowerContent.startsWith('llámame ')
      ) {
        name = content.substring(8).trim();
      } else if (lowerContent.startsWith('mi nombre es ')) {
        name = content.substring(13).trim();
      }
    }

    // If no name provided, start registration context
    if (!name) {
      // Create name registration context
      await contextManager.createContext(
        context.user.id.toString(),
        ContextType.REGISTRATION,
        {
          step: 'awaiting_name',
          attempts: 0,
          startedAt: new Date().toISOString(),
        }
      );

      const helpText =
        `👋 **Registro de Nombre**\n\n` +
        `Para personalizar tu experiencia, necesito que me digas tu nombre.\n\n` +
        `**Puedes escribir:**\n` +
        `• "Me llamo [tu nombre]"\n` +
        `• "Soy [tu nombre]"\n` +
        `• "Llamame [tu nombre]"\n` +
        `• "Mi nombre es [tu nombre]"\n` +
        `• O simplemente escribe tu nombre\n\n` +
        `**Ejemplos:**\n` +
        `• Me llamo Juan\n` +
        `• Soy María\n` +
        `• Llamame Pedro\n\n` +
        `⚠️ **Nota:** Tu nombre no puede ser un número de teléfono.`;

      return {
        success: true,
        message: helpText,
        data: {
          type: 'name_registration_started',
          contextCreated: true,
          timeout: 300000,
        },
      };
    }

    // Validate the provided name
    const validation = validateDisplayName(name);
    if (!validation.valid) {
      return {
        success: false,
        message:
          `❌ **Nombre no válido:** ${validation.reason}\n\n` +
          `Por favor, intenta con un nombre diferente.`,
        data: {
          type: 'validation_error',
          reason: validation.reason,
          providedName: name,
        },
      };
    }

    // Always get fresh user data from database to avoid stale context
    const userJid = context.user.jid; // Use the actual JID instead of constructing it
    let existingUser = await database.getUserByJid(userJid);

    if (!existingUser) {
      // Create the user first
      const now = new Date();
      existingUser = await database.createUser({
        phoneNumber: context.user.phoneNumber || context.user.id.toString(),
        jid: userJid,
        name: name,
        isRegistered: true,
        userLevel: context.user.userLevel || 'user',
        registrationDate: now,
        lastActivity: now,
        messageCount: 0,
        banned: false,
        preferences: {},
      });

      logger.info('NameRegistration', 'Created new user with name', {
        userId: context.user.id,
        name: name,
      });
    } else {
      // Log the current state before update
      logger.info('NameRegistration', 'Before update - Current user state', {
        userId: context.user.id,
        contextUserName: context.user.name || 'undefined',
        databaseUserName: existingUser.name,
        newNameRequested: name,
      });

      // Update existing user's display name in database
      const updatedUser = await database.updateUser(
        existingUser.id.toString(),
        {
          name: name,
          isRegistered: true,
        }
      );

      logger.info('NameRegistration', 'Updated existing user name', {
        userId: context.user.id,
        oldName: existingUser.name,
        newName: name,
        updateSuccess: !!updatedUser,
      });

      // Update existingUser reference with fresh data
      existingUser = updatedUser;
    }

    // Clear any active name registration context
    await contextManager.clearUserContexts(context.user.id.toString());

    // Log before returning response
    logger.info('NameRegistration', 'About to return success response', {
      userId: context.user.id,
      newName: name,
      hasMessage: true,
    });

    return {
      success: true,
      message:
        getRandomNameConfirmationMessage(name) + getRandomMotivationalText(),
      data: {
        type: 'name_registered',
        newName: name,
        wasRegistered: context.user.isRegistered || false,
      },
    };
  } catch (error) {
    logger.error('NameRegistration', 'Error in set name command', {
      error,
      userId: context.user.id,
    });

    return {
      success: false,
      message:
        '❌ **Error interno**\n\n' +
        'Hubo un problema al registrar tu nombre. Por favor, inténtalo de nuevo más tarde.',
      data: {
        type: 'internal_error',
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

/**
 * Who Am I Command Handler
 */
export const handleWhoAmICommand = async (
  _message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  const logger = Logger.getInstance();

  try {
    const user = context.user;
    const displayName = user.name || 'Sin nombre';
    const isRegistered = user.isRegistered || false;
    const userLevel = user.userLevel;
    const lastActivity = user.lastActivity
      ? new Date(user.lastActivity).toLocaleString('es-ES')
      : 'Desconocido';

    let profileText = `👤 **Tu Perfil**\n\n`;
    profileText += `**Nombre:** ${displayName}${!isRegistered ? ' ⚠️ Sin registrar' : ''}\n`;
    profileText += `**Teléfono:** ${user.phoneNumber || 'No disponible'}\n`;
    profileText += `**Nivel:** ${userLevel}\n`;
    profileText += `**Estado:** ${isRegistered ? '✅ Registrado' : '❌ No registrado'}\n`;
    profileText += `**Última actividad:** ${lastActivity}\n\n`;

    if (!isRegistered || displayName === 'Sin nombre') {
      profileText += `💡 **¿Quieres personalizar tu perfil?**\n`;
      profileText += `Puedes establecer tu nombre escribiendo:\n`;
      profileText += `• "Me llamo [tu nombre]"\n`;
      profileText += `• "Soy [tu nombre]"\n`;
      profileText += `• "Llamame [tu nombre]"\n`;
      profileText += `• O usa: \`!mellamo [tu nombre]\``;
    }

    return {
      success: true,
      message: profileText,
      data: {
        type: 'profile_info',
        displayName,
        isRegistered,
        userLevel,
        phoneNumber: user.phoneNumber,
        lastActivity: user.lastActivity,
      },
    };
  } catch (error) {
    logger.error('NameRegistration', 'Error in who am I command', {
      error,
      userId: context.user.id,
    });

    return {
      success: false,
      message:
        '❌ Error al obtener tu información de perfil. Inténtalo de nuevo.',
      data: {
        type: 'internal_error',
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};

/**
 * Handle name registration context
 */
export const handleNameRegistrationContext = async (
  message: Message,
  context: PluginContext,
  contextData: any
): Promise<CommandResult> => {
  const logger = Logger.getInstance();
  const database = DatabaseService.getInstance();
  const contextManager = ContextManagerService.getInstance();

  try {
    const content = message.content.trim();
    const currentAttempts = contextData.attempts || 0;

    // Parse the name from natural language
    let name = content;
    const lowerContent = content.toLowerCase();

    if (lowerContent.startsWith('me llamo ')) {
      name = content.substring(9).trim();
    } else if (lowerContent.startsWith('soy ')) {
      name = content.substring(4).trim();
    } else if (
      lowerContent.startsWith('llamame ') ||
      lowerContent.startsWith('llámame ')
    ) {
      name = content.substring(8).trim();
    } else if (lowerContent.startsWith('mi nombre es ')) {
      name = content.substring(13).trim();
    }

    // Validate the name
    const validation = validateDisplayName(name);
    if (!validation.valid) {
      const newAttempts = currentAttempts + 1;

      // Update context with new attempt count
      const activeContext = await contextManager.getActiveContext(
        context.user.id.toString()
      );
      if (activeContext) {
        await contextManager.updateContext(activeContext.id, {
          ...contextData,
          attempts: newAttempts,
          lastAttempt: new Date().toISOString(),
        });
      }

      let errorMessage = `❌ **${validation.reason}**\n\n`;

      if (newAttempts >= 3) {
        // Clear context after 3 failed attempts
        await contextManager.clearUserContexts(context.user.id.toString());

        errorMessage +=
          `Después de 3 intentos, he cancelado el registro de nombre.\n\n` +
          `Puedes intentar de nuevo cuando quieras escribiendo:\n` +
          `• "Me llamo [tu nombre]"\n` +
          `• \`!mellamo [tu nombre]\``;
      } else {
        errorMessage +=
          `Por favor, intenta con un nombre diferente.\n\n` +
          `**Recordatorio:** Puedes escribir:\n` +
          `• "Me llamo [tu nombre]"\n` +
          `• "Soy [tu nombre]"\n` +
          `• "Llamame [tu nombre]"\n` +
          `• O simplemente tu nombre\n\n` +
          `Intento ${newAttempts} de 3.`;
      }

      return {
        success: false,
        message: errorMessage,
        data: {
          type: 'validation_error',
          reason: validation.reason,
          attempts: newAttempts,
          contextCleared: newAttempts >= 3,
        },
      };
    }

    // Valid name provided, update user
    await database.updateUser(context.user.id.toString(), {
      name: name,
      isRegistered: true,
    });

    // Clear the registration context
    await contextManager.clearUserContexts(context.user.id.toString());

    logger.info('NameRegistration', 'User name registered through context', {
      userId: context.user.id,
      name,
      attempts: currentAttempts + 1,
    });

    return {
      success: true,
      message:
        getRandomNameConfirmationMessage(name) + getRandomMotivationalText(),
      data: {
        type: 'name_registered_via_context',
        name,
        attempts: currentAttempts + 1,
      },
    };
  } catch (error) {
    logger.error('NameRegistration', 'Error in name registration context', {
      error,
      userId: context.user.id,
    });

    // Clear context on error
    await contextManager.clearUserContexts(context.user.id.toString());

    return {
      success: false,
      message:
        '❌ **Error interno**\n\n' +
        'Hubo un problema al registrar tu nombre. El proceso ha sido cancelado.\n\n' +
        'Puedes intentar de nuevo escribiendo "me llamo [tu nombre]".',
      data: {
        type: 'internal_error',
        error: error instanceof Error ? error.message : String(error),
        contextCleared: true,
      },
    };
  }
};

/**
 * Generate random confirmation message for name registration
 */
function getRandomNameConfirmationMessage(name: string): string {
  const responses = [
    // Mensajes entusiastas
    `🎉 **¡Ey ${name}!** ¡Ya te tengo guardado! 🚀`,
    `✨ **¡Listo ${name}!** Ahora ya sé quién eres 😎`,
    `🔥 **¡Qué tal ${name}!** Perfecto, ya estás registrado 💪`,
    `⚡ **¡Wola ${name}!** Tu nombre está en el sistema 🎯`,
    `🌟 **¡Hey ${name}!** ¡Registrado como un campeón! 🏆`,
    
    // Mensajes casuales
    `👋 **¡Hola ${name}!** Ya te conozco oficialmente`,
    `😄 **¡Buenas ${name}!** Listo, ya estás en mi agenda`,
    `🎈 **¡Ey ${name}!** Perfecto, ahora ya sabemos quién eres`,
    `✌️ **¡Qué pasa ${name}!** Todo guardado correctamente`,
    `🤙 **¡Bueno ${name}!** Ya tienes tu lugar aquí`,
    
    // Mensajes divertidos
    `🦾 **¡${name} en la casa!** Registro completado, jefe`,
    `🎭 **¡Encantado ${name}!** Ya eres parte de la familia`,
    `🎪 **¡Bienvenido ${name}!** El bot te saluda oficialmente`,
    `🌈 **¡Presente ${name}!** Tu nombre ya está en mi memoria`,
    `� **¡Registrado ${name}!** Ahora eres alguien especial aquí`,
    
    // Mensajes con toque personal
    `💫 **¡Genial ${name}!** Me gusta tu nombre, la verdad`,
    `� **¡Súper ${name}!** Buen nombre, me gusta cómo suena`,
    `⭐ **¡Perfecto ${name}!** Nombre guay, ya estás listo`,
    `🎯 **¡Fantástico ${name}!** Tu nombre mola, registro exitoso`,
    `💎 **¡Excelente ${name}!** Qué buen nombre has elegido`,
    
    // Mensajes cortos y directos
    `✅ **¡Listo ${name}!** Ya estás registrado`,
    `🚀 **¡Hecho ${name}!** Todo perfecto`,
    `🔥 **¡Ya está ${name}!** Registrado con éxito`,
    `⚡ **¡Perfecto ${name}!** Listo para empezar`,
    `🎉 **¡Genial ${name}!** Bienvenido al sistema`,
    
    // Mensajes con emojis únicos
    `🦄 **¡Mítico ${name}!** Ya eres parte de esto`,
    `� **¡Volando ${name}!** Registro completado`,
    `🎸 **¡Rockea ${name}!** Ya estás dentro`,
    `🎮 **¡Player ${name}!** Listo para jugar`,
    `� **¡Sabroso ${name}!** Como tu registro, perfecto`,
    
    // Mensajes únicos y creativos
    `🌮 **¡Órale ${name}!** Ya tienes tu lugar aquí`,
    `� **¡Suena bien ${name}!** Registro musical`,
    `� **¡Espectacular ${name}!** El show puede comenzar`,
    `🏆 **¡Campeón ${name}!** Registro de oro`,
    `🌍 **¡Global ${name}!** Conectado al mundo`,
  ];

  // Select a random response
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

/**
 * Generate additional motivational text for name registration
 */
function getRandomMotivationalText(): string {
  const motivationalTexts = [
    // Mensajes de ayuda directos
    `\n\n💡 Escribe \`!help\` para ver qué puedo hacer`,
    `\n\n🚀 Prueba \`!help\` para descubrir mis funciones`,
    `\n\n✨ Usa \`!help\` para explorar mis comandos`,
    `\n\n⭐ Escribe \`!help\` para ver la lista completa`,
    `\n\n🎯 Prueba \`!help\` para conocer todo lo disponible`,
    
    // Mensajes casuales
    `\n\n😎 ¡Ahora ya puedes usar todo! Escribe \`!help\``,
    `\n\n🔥 ¡Todo desbloqueado! Prueba \`!help\` a ver qué sale`,
    `\n\n🎈 ¡Listo para la acción! Usa \`!help\` para empezar`,
    `\n\n🌟 ¡Ya tienes acceso VIP! Escribe \`!help\``,
    `\n\n🎊 ¡Bienvenido oficialmente! Prueba \`!help\``,
    
    // Mensajes con humor
    `\n\n🤖 Beep boop, configuración completa. \`!help\` para continuar`,
    `\n\n🎮 Achievement unlocked! Usa \`!help\` para ver tus poderes`,
    `\n\n🍕 Registro tan bueno como una pizza. \`!help\` para el menú`,
    `\n\n🦄 Magia completada. Escribe \`!help\` para los hechizos`,
    `\n\n� Despegamos. Usa \`!help\` para ver el mapa`,
    
    // Mensajes simples
    `\n\n📱 Comando disponible: \`!help\``,
    `\n\n� Lista de comandos: \`!help\``,
    `\n\n� Explorar funciones: \`!help\``,
    `\n\n📚 Manual de usuario: \`!help\``,
    `\n\n🎯 Siguiente paso: \`!help\``,
    
    // Sin texto adicional (a veces menos es más)
    ``,
    ``,
    ``,
  ];

  const randomIndex = Math.floor(Math.random() * motivationalTexts.length);
  return motivationalTexts[randomIndex];
}

/**
 * Handle Profile Command (Spanish)
 */
export const handleProfileCommand = async (
  message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  // Reutilizar la lógica del comando quien-soy
  return await handleWhoAmICommand(message, context);
};

/**
 * Handle Profile Command (English)
 */
export const handleProfileEnCommand = async (
  message: Message,
  context: PluginContext
): Promise<CommandResult> => {
  // Reutilizar la lógica del comando quien-soy
  return await handleWhoAmICommand(message, context);
};
