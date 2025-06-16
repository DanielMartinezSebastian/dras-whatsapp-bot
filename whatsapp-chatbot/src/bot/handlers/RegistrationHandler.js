const { logInfo, logError } = require("../../utils/logger");

/**
 * Handler especializado para el proceso de registro de nuevos usuarios
 * Coordina el flujo de solicitud y validación de nombres
 */
class RegistrationHandler {
  constructor(botProcessor) {
    this.botProcessor = botProcessor;
    this.whatsappClient = botProcessor.whatsappClient;
    this.userService = botProcessor.userService;
    this.registrationService = null; // Se inicializará después

    // Estadísticas del handler
    this.stats = {
      registrationsStarted: 0,
      registrationsCompleted: 0,
      registrationsFailed: 0,
      tempNamesAssigned: 0,
    };
  }

  /**
   * Inicializa el handler con el servicio de registro
   * @param {Object} registrationService - Servicio de registro
   */
  initialize(registrationService) {
    this.registrationService = registrationService;

    // Configurar métodos del servicio para coordinación
    this.registrationService.updateUserName = this.updateUserName.bind(this);
    this.registrationService.sendMessage = this.sendMessage.bind(this);
    this.registrationService.notifyNewUserRegistered =
      this.notifyNewUserRegistered.bind(this);
  }

  /**
   * Maneja el proceso de registro para un nuevo usuario
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} user - Usuario (puede ser null para nuevos usuarios)
   */
  async handle(message, user = null) {
    try {
      // Verificar si el usuario necesita registrar su nombre
      if (!this.registrationService.needsNameRegistration(user)) {
        // Usuario ya tiene nombre válido, continuar con flujo normal
        return { requiresRegistration: false, user };
      }

      this.stats.registrationsStarted++;

      // Verificar si ya está en proceso de registro
      if (this.registrationService.pendingRegistrations.has(message.chatJid)) {
        // Procesar respuesta de nombre
        return await this.processNameInput(message, user);
      } else {
        // Iniciar nuevo proceso de registro
        return await this.startNewRegistration(message, user);
      }
    } catch (error) {
      this.stats.registrationsFailed++;
      logError(`Error en RegistrationHandler para ${message.chatJid}:`, error);
      await this.handleRegistrationError(message, error);
      return { requiresRegistration: true, error: error.message };
    }
  }

  /**
   * Inicia un nuevo proceso de registro
   * @param {Object} message - Mensaje del usuario
   * @param {Object} user - Usuario actual
   */
  async startNewRegistration(message, user) {
    try {
      await this.registrationService.startRegistration(message, user);

      logInfo(`Nuevo registro iniciado para: ${message.chatJid}`);

      return {
        requiresRegistration: true,
        status: "registration_started",
        message: "Proceso de registro iniciado",
      };
    } catch (error) {
      logError(`Error iniciando registro para ${message.chatJid}:`, error);
      throw error;
    }
  }

  /**
   * Procesa la entrada de nombre del usuario
   * @param {Object} message - Mensaje con el nombre
   * @param {Object} user - Usuario actual
   */
  async processNameInput(message, user) {
    try {
      const result = await this.registrationService.processNameResponse(
        message,
        user
      );

      if (result.success) {
        if (result.message === "registration_completed") {
          this.stats.registrationsCompleted++;
          logInfo(`Registro completado para: ${message.chatJid}`);
        } else if (result.message === "temp_name_assigned") {
          this.stats.tempNamesAssigned++;
          logInfo(`Nombre temporal asignado para: ${message.chatJid}`);
        }

        return {
          requiresRegistration: false,
          user: result.user,
          status: result.message,
        };
      } else {
        // Nombre inválido, continuar con registro
        return {
          requiresRegistration: true,
          status: "invalid_name_retry",
          attempts: result.attempts,
        };
      }
    } catch (error) {
      logError(`Error procesando nombre para ${message.chatJid}:`, error);
      throw error;
    }
  }

  /**
   * Verifica si un mensaje es parte del flujo de registro
   * @param {Object} message - Mensaje a verificar
   * @returns {boolean} True si es parte del registro
   */
  isRegistrationFlow(message) {
    return this.registrationService.pendingRegistrations.has(message.chatJid);
  }

  /**
   * Maneja el comando para cambiar nombre
   * @param {Object} message - Mensaje con el comando
   * @param {Array} args - Argumentos del comando
   * @param {Object} user - Usuario actual
   */
  async handleChangeName(message, args, user) {
    try {
      const newName = args.join(" ").trim();

      if (!newName) {
        const response = `Para cambiar tu nombre, escribe:
*/cambiar nombre [tu nuevo nombre]*

Ejemplo: */cambiar nombre María González*`;

        await this.sendMessage(message.chatJid, response);
        return;
      }

      // Usar validación del servicio de registro
      const validation = this.registrationService.validateName(
        newName,
        user?.phone_number
      );

      if (!validation.isValid) {
        await this.sendMessage(message.chatJid, validation.message);
        return;
      }

      // Actualizar nombre en la base de datos
      const updatedUser = await this.updateUserName(user, validation.cleanName);

      const response = `✅ *Nombre actualizado exitosamente*

Tu nuevo nombre es: *${validation.cleanName}*`;

      await this.sendMessage(message.chatJid, response);

      logInfo(
        `Nombre actualizado para ${message.chatJid}: ${validation.cleanName}`
      );

      return { success: true, user: updatedUser };
    } catch (error) {
      logError(`Error actualizando nombre para ${message.chatJid}:`, error);
      await this.sendMessage(
        message.chatJid,
        "❌ Hubo un error al actualizar tu nombre. Intenta nuevamente."
      );
      throw error;
    }
  }

  // ==================== MÉTODOS DE COORDINACIÓN ====================

  /**
   * Actualiza el nombre del usuario en la base de datos
   * @param {Object} user - Usuario a actualizar
   * @param {string} name - Nuevo nombre
   * @param {boolean} isTemporary - Si es nombre temporal
   * @returns {Object} Usuario actualizado
   */
  async updateUserName(user, name, isTemporary = false) {
    try {
      logInfo(
        `🔧 DEBUG: Iniciando updateUserName para ${user?.whatsapp_jid} con nombre: "${name}"`
      );
      logInfo(`🔧 DEBUG: UserService disponible: ${!!this.userService}`);
      logInfo(
        `🔧 DEBUG: updateUserByJid disponible: ${typeof this.userService
          ?.updateUserByJid}`
      );

      const updateData = {
        display_name: name,
        profile_name: name,
        status: "active",
        updated_at: new Date().toISOString(),
      };

      // Marcar si necesita revisión manual (nombres temporales)
      if (isTemporary) {
        const currentMetadata =
          typeof user?.metadata === "string"
            ? JSON.parse(user?.metadata || "{}")
            : user?.metadata || {};

        updateData.metadata = JSON.stringify({
          ...currentMetadata,
          needsNameUpdate: true,
          tempNameAssigned: true,
          tempNameDate: new Date().toISOString(),
        });
      } else {
        // Limpiar flags de nombre temporal si existe
        const metadata =
          typeof user?.metadata === "string"
            ? JSON.parse(user?.metadata || "{}")
            : user?.metadata || {};

        delete metadata.needsNameUpdate;
        delete metadata.tempNameAssigned;
        metadata.nameRegisteredDate = new Date().toISOString();
        updateData.metadata = JSON.stringify(metadata);
      }

      // Actualizar en la base de datos usando UserService
      if (user) {
        const updatedUser = await this.userService.updateUserByJid(
          user.whatsapp_jid,
          updateData
        );
        logInfo(
          `Usuario actualizado exitosamente: ${user.whatsapp_jid} -> ${name}`
        );
        return updatedUser;
      } else {
        logError("Error: usuario no proporcionado para updateUserName");
        throw new Error("Usuario requerido para actualizar nombre");
      }
    } catch (error) {
      logError(
        `Error actualizando nombre de usuario para ${user?.whatsapp_jid}:`,
        error
      );
      logError(`Error details - Stack:`, error.stack);
      logError(`Error details - Message:`, error.message);
      logError(`Error details - Name:`, error.name);
      throw error;
    }
  }

  /**
   * Envía mensaje al usuario
   * @param {string} chatJid - JID del chat
   * @param {string} message - Mensaje a enviar
   */
  async sendMessage(chatJid, message) {
    try {
      // Extraer número de teléfono del JID
      const phoneMatch = chatJid.match(/(\d+)@s\.whatsapp\.net/);
      const phoneNumber = phoneMatch ? phoneMatch[1] : chatJid;

      // Usar el cliente de WhatsApp del BotProcessor
      await this.whatsappClient.sendMessage(
        phoneNumber,
        this.botProcessor.botPrefix + message,
        false // isCommand = false para mensajes de registro
      );
    } catch (error) {
      logError(`Error enviando mensaje a ${chatJid}:`, error);
      throw error;
    }
  }

  /**
   * Notifica a administradores sobre nuevo usuario registrado
   * @param {string} phoneNumber - Número de teléfono
   * @param {string} name - Nombre del usuario
   */
  async notifyNewUserRegistered(phoneNumber, name) {
    try {
      // Obtener usuarios administradores
      const adminUsers = await this.userService.getUsersByType("admin");

      if (adminUsers && adminUsers.length > 0) {
        const notification = `🎉 *Nuevo usuario registrado*

👤 Nombre: ${name}
📱 Teléfono: ${phoneNumber}
⏰ Fecha: ${new Date().toLocaleString("es-ES")}`;

        // Enviar notificación a cada administrador
        for (const admin of adminUsers) {
          if (admin.phone_number) {
            try {
              await this.whatsappClient.sendMessage(
                admin.phone_number,
                notification
              );
            } catch (error) {
              logError(
                `Error notificando a admin ${admin.phone_number}:`,
                error
              );
            }
          }
        }
      }

      logInfo(`Nuevo usuario registrado: ${name} (${phoneNumber})`);
    } catch (error) {
      logError("Error notificando nuevo usuario:", error);
    }
  }

  /**
   * Maneja errores durante el registro
   * @param {Object} message - Mensaje que causó el error
   * @param {Error} error - Error ocurrido
   */
  async handleRegistrationError(message, error) {
    try {
      const errorMessage =
        "Lo siento, ocurrió un error durante el registro. Por favor intenta de nuevo más tarde.";
      await this.sendMessage(message.chatJid, errorMessage);
    } catch (sendError) {
      logError("Error enviando mensaje de error de registro:", sendError);
    }
  }

  /**
   * Obtiene estadísticas del handler
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      registrationService: this.registrationService
        ? this.registrationService.getStats()
        : null,
    };
  }

  /**
   * Limpia recursos del handler
   */
  async cleanup() {
    try {
      if (this.registrationService) {
        await this.registrationService.close();
      }
      logInfo("RegistrationHandler: Recursos limpiados");
    } catch (error) {
      logError("Error limpiando RegistrationHandler:", error);
    }
  }
}

module.exports = RegistrationHandler;
