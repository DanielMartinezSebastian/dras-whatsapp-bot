const { logInfo, logError } = require("../../utils/logger");

/**
 * Handler especializado para comandos administrativos
 * Maneja comandos de alto privilegio y sistema
 */
class AdminHandler {
  constructor(botProcessor) {
    this.botProcessor = botProcessor;
    this.whatsappClient = botProcessor.whatsappClient;
    this.permissionService = botProcessor.permissionService;

    // Comandos administrativos disponibles
    this.adminCommands = {
      "/admin": "Panel de administración",
      "/sudo": "Ejecutar comando con privilegios",
      "/debug": "Activar/desactivar modo debug",
      "/log": "Ver logs del sistema",
      "/restart": "Reiniciar bot (solo superadmin)",
      "/shutdown": "Apagar bot (solo superadmin)",
      "/reset": "Resetear sistema (solo superadmin)",
      "/config": "Configuración del sistema",
    };

    // Estadísticas
    this.stats = {
      totalAdminCommands: 0,
      deniedCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      adminUsers: new Set(),
    };
  }

  /**
   * Maneja un comando administrativo
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} classification - Clasificación del mensaje
   */
  async handle(message, classification) {
    try {
      this.stats.totalAdminCommands++;

      const command = classification.command;
      const args = (message.text || "").split(" ").slice(1);

      logInfo(`Comando administrativo solicitado: ${command}`, {
        senderPhone: message.senderPhone,
        args: args,
      });

      // Verificar permisos administrativos
      const hasAdminPermission = await this.verifyAdminPermissions(
        message,
        command
      );
      if (!hasAdminPermission) {
        this.stats.deniedCommands++;
        await this.handlePermissionDenied(message, command);
        return;
      }

      // Registrar usuario admin
      this.stats.adminUsers.add(message.senderPhone);

      // Ejecutar comando administrativo
      await this.executeAdminCommand(message, command, args);

      this.stats.successfulCommands++;
    } catch (error) {
      this.stats.failedCommands++;
      logError(
        `Error ejecutando comando administrativo ${classification.command}:`,
        error
      );
      await this.handleAdminCommandError(
        message,
        classification.command,
        error
      );
    }
  }

  /**
   * Verifica permisos administrativos
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando a verificar
   * @returns {boolean} True si tiene permisos
   */
  async verifyAdminPermissions(message, command) {
    try {
      const senderPhone = message.senderPhone;
      const chatJid = message.chatJid;
      logInfo(
        `🔍 DEBUG AdminHandler: Verificando permisos para ${senderPhone}, comando: ${command}, JID: ${chatJid}`
      );

      // Verificar si botProcessor existe
      if (!this.botProcessor) {
        logError("❌ DEBUG AdminHandler: botProcessor no está disponible");
        return false;
      }

      // Verificar si userService existe y tiene el método
      if (
        !this.botProcessor.userService ||
        typeof this.botProcessor.userService.getUserByJid !== "function"
      ) {
        logError(
          "❌ DEBUG AdminHandler: userService no está disponible o no tiene getUserByJid"
        );
        return false;
      }

      // Obtener el usuario de la base de datos usando el JID
      logInfo(
        `🔍 DEBUG AdminHandler: Obteniendo usuario de la base de datos usando JID: ${chatJid}`
      );
      const user = await this.botProcessor.userService.getUserByJid(chatJid);
      if (!user) {
        logInfo(
          `❌ DEBUG AdminHandler: Usuario no encontrado para JID: ${chatJid}`
        );
        return false;
      }

      logInfo(`✅ DEBUG AdminHandler: Usuario encontrado:`, {
        phone: user.phone_number,
        type: user.user_type,
        displayName: user.display_name,
        jid: user.whatsapp_jid,
      });

      // Verificar si permissionService existe
      if (!this.permissionService) {
        logError("❌ DEBUG AdminHandler: permissionService no está disponible");
        return false;
      }

      // Usar checkPermissions del PermissionService
      logInfo(`🔍 DEBUG AdminHandler: Llamando checkPermissions...`);
      const permissionCheck = await this.permissionService.checkPermissions(
        user,
        command
      );

      logInfo(
        `✅ DEBUG AdminHandler: Verificación de permisos para ${command}:`,
        {
          senderPhone,
          userType: user.user_type,
          allowed: permissionCheck.allowed,
          reason: permissionCheck.reason || "N/A",
          message: permissionCheck.message || "N/A",
        }
      );

      return permissionCheck.allowed;
    } catch (error) {
      logError(
        "❌ DEBUG AdminHandler: Error verificando permisos administrativos:",
        error
      );
      logError("❌ DEBUG AdminHandler: Stack trace:", error.stack);
      return false;
    }
  }

  /**
   * Ejecuta un comando administrativo
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando a ejecutar
   * @param {Array} args - Argumentos del comando
   */
  async executeAdminCommand(message, command, args) {
    switch (command) {
      case "/admin":
        await this.handleAdminPanel(message);
        break;

      case "/sudo":
        await this.handleSudoCommand(message, args);
        break;

      case "/debug":
        await this.handleDebugMode(message, args);
        break;

      case "/log":
        await this.handleLogCommand(message, args);
        break;

      case "/restart":
        await this.handleRestartCommand(message);
        break;

      case "/shutdown":
        await this.handleShutdownCommand(message);
        break;

      case "/reset":
        await this.handleResetCommand(message, args);
        break;

      case "/config":
        await this.handleConfigCommand(message, args);
        break;

      default:
        await this.handleUnknownAdminCommand(message, command);
    }
  }

  /**
   * Maneja el panel de administración
   * @param {Object} message - Mensaje de WhatsApp
   */
  async handleAdminPanel(message) {
    const stats = this.botProcessor.getStats();
    const systemStats = this.getSystemStats();

    const response = `🔧 *Panel de Administración*

📊 *Estadísticas del Bot:*
• Tiempo activo: ${this.formatUptime(stats.uptime)}
• Mensajes procesados: ${stats.processedMessages}
• Estado servicios: ${stats.userServiceReady ? "✅" : "❌"}

📈 *Estadísticas del Sistema:*
• Comandos admin ejecutados: ${this.stats.totalAdminCommands}
• Comandos denegados: ${this.stats.deniedCommands}
• Tasa de éxito: ${this.getSuccessRate()}%
• Usuarios admin activos: ${this.stats.adminUsers.size}

🛠 *Comandos Disponibles:*
${Object.entries(this.adminCommands)
  .map(([cmd, desc]) => `• ${cmd} - ${desc}`)
  .join("\n")}

⚠️ *Comandos de Sistema (SuperAdmin):*
• /restart - Reiniciar bot
• /shutdown - Apagar bot  
• /reset - Resetear sistema`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja comando sudo
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Array} args - Argumentos del comando
   */
  async handleSudoCommand(message, args) {
    if (args.length === 0) {
      const response =
        "⚠️ Uso: /sudo <comando>\n\nEjecuta un comando con privilegios administrativos.";
      await this.whatsappClient.sendMessage(
        message.senderPhone,
        this.botProcessor.botPrefix + response
      );
      return;
    }

    const sudoCommand = args.join(" ");
    logInfo(`Ejecutando comando sudo: ${sudoCommand}`, {
      admin: message.senderPhone,
    });

    const response = `🔧 Ejecutando con privilegios: ${sudoCommand}

⚠️ Esta funcionalidad está en desarrollo.
Por seguridad, solo comandos específicos están permitidos.`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja modo debug
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Array} args - Argumentos del comando
   */
  async handleDebugMode(message, args) {
    const action = args[0]?.toLowerCase();

    let response;
    if (action === "on" || action === "enable") {
      process.env.DEBUG_MODE = "true";
      response =
        "🐛 Modo debug ACTIVADO\n\nSe mostrarán logs detallados en consola.";
    } else if (action === "off" || action === "disable") {
      process.env.DEBUG_MODE = "false";
      response = "✅ Modo debug DESACTIVADO\n\nLogs vuelven al nivel normal.";
    } else {
      const isDebugOn = process.env.DEBUG_MODE === "true";
      response = `🐛 *Estado del Modo Debug:* ${
        isDebugOn ? "ACTIVADO" : "DESACTIVADO"
      }

Uso:
• /debug on - Activar modo debug
• /debug off - Desactivar modo debug`;
    }

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja comando de logs
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Array} args - Argumentos del comando
   */
  async handleLogCommand(message, args) {
    const logType = args[0]?.toLowerCase() || "recent";

    const response = `📋 *Logs del Sistema*

Tipo solicitado: ${logType}

⚠️ Por seguridad, los logs detallados se envían solo por consola.
  
📊 *Resumen de Actividad:*
• Mensajes procesados: ${this.botProcessor.getStats().processedMessages}
• Comandos ejecutados: ${this.stats.totalAdminCommands}
• Errores recientes: 0

Use /debug on para logs detallados en tiempo real.`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja comando de reinicio
   * @param {Object} message - Mensaje de WhatsApp
   */
  async handleRestartCommand(message) {
    const response = `🔄 *Reinicio del Bot Solicitado*

⚠️ Esta operación reiniciará completamente el bot.
Los usuarios pueden experimentar una breve interrupción.

✅ Confirmación requerida del SuperAdmin: ${message.senderPhone}

⏳ El reinicio se completará en aproximadamente 10 segundos...`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );

    // Log crítico
    logInfo(`🔄 REINICIO SOLICITADO por SuperAdmin: ${message.senderPhone}`);

    // Aquí se implementaría la lógica real de reinicio
    // Por seguridad, se requiere implementación adicional
  }

  /**
   * Maneja comando de apagado
   * @param {Object} message - Mensaje de WhatsApp
   */
  async handleShutdownCommand(message) {
    const response = `🛑 *Apagado del Bot Solicitado*

⚠️ Esta operación apagará completamente el bot.
Requerirá intervención manual para reiniciar.

✅ Confirmación requerida del SuperAdmin: ${message.senderPhone}

⏳ El apagado se completará en aproximadamente 15 segundos...`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );

    // Log crítico
    logInfo(`🛑 APAGADO SOLICITADO por SuperAdmin: ${message.senderPhone}`);

    // Aquí se implementaría la lógica real de apagado
    // Por seguridad, se requiere implementación adicional
  }

  /**
   * Maneja comando de reset
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Array} args - Argumentos del comando
   */
  async handleResetCommand(message, args) {
    const resetType = args[0]?.toLowerCase() || "all";

    const response = `🔄 *Reset del Sistema Solicitado*

Tipo de reset: ${resetType}

⚠️ OPERACIÓN DESTRUCTIVA - Esta acción no se puede deshacer.

Opciones disponibles:
• stats - Resetear solo estadísticas
• conversations - Resetear contextos de conversación  
• all - Reset completo del sistema

✅ Confirmación requerida del SuperAdmin: ${message.senderPhone}

⏳ Para confirmar, envíe: /confirm-reset ${resetType}`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja configuración del sistema
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Array} args - Argumentos del comando
   */
  async handleConfigCommand(message, args) {
    const configAction = args[0]?.toLowerCase();

    if (!configAction) {
      const response = `⚙️ *Configuración del Sistema*

Variables de entorno actuales:
• BOT_NAME: ${process.env.BOT_NAME || "Assistant"}
• BOT_PREFIX: "${process.env.BOT_PREFIX || "Bot "}"
• AUTO_REPLY: ${process.env.AUTO_REPLY || "true"}
• DEBUG_MODE: ${process.env.DEBUG_MODE || "false"}

Comandos disponibles:
• /config show - Mostrar configuración completa
• /config set <variable> <valor> - Cambiar variable
• /config reset - Restaurar valores por defecto`;

      await this.whatsappClient.sendMessage(
        message.senderPhone,
        this.botProcessor.botPrefix + response
      );
    } else {
      await this.handleConfigSubcommand(message, configAction, args.slice(1));
    }
  }

  /**
   * Maneja subcomandos de configuración
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} action - Acción de configuración
   * @param {Array} args - Argumentos adicionales
   */
  async handleConfigSubcommand(message, action, args) {
    let response = "⚙️ Subcomando de configuración no implementado aún.";

    switch (action) {
      case "show":
        response =
          "📋 Configuración completa disponible en logs por seguridad.";
        break;
      case "set":
        response = "✏️ Modificación de configuración en desarrollo.";
        break;
      case "reset":
        response = "🔄 Reset de configuración en desarrollo.";
        break;
    }

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja comando administrativo desconocido
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando desconocido
   */
  async handleUnknownAdminCommand(message, command) {
    const response = `❌ Comando administrativo desconocido: ${command}

Usa /admin para ver el panel de administración.`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja permisos denegados para comandos admin
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando denegado
   */
  async handlePermissionDenied(message, command) {
    const response = `🚫 *Acceso Denegado*

Comando: ${command}
Usuario: ${message.senderPhone}

Este comando requiere privilegios administrativos.
Contacta un SuperAdmin si necesitas acceso.`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );

    // Log de seguridad
    logInfo(
      `🚫 Acceso denegado a comando admin: ${command} por ${message.senderPhone}`
    );
  }

  /**
   * Maneja errores en comandos administrativos
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando que falló
   * @param {Error} error - Error ocurrido
   */
  async handleAdminCommandError(message, command, error) {
    const response = `❌ Error en comando administrativo: ${command}

El error ha sido registrado para revisión.
Contacta soporte técnico si el problema persiste.`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );

    // Log de error crítico
    logError(
      `❌ Error crítico en comando admin ${command} por ${message.senderPhone}:`,
      error
    );
  }

  /**
   * Formatea tiempo de actividad
   * @param {number} uptime - Tiempo en milisegundos
   * @returns {string} Tiempo formateado
   */
  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Obtiene tasa de éxito
   * @returns {number} Tasa de éxito en porcentaje
   */
  getSuccessRate() {
    if (this.stats.totalAdminCommands === 0) return 100;
    return Math.round(
      (this.stats.successfulCommands / this.stats.totalAdminCommands) * 100
    );
  }

  /**
   * Obtiene estadísticas del sistema
   * @returns {Object} Estadísticas del sistema
   */
  getSystemStats() {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  /**
   * Obtiene estadísticas del handler
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      adminUsers: Array.from(this.stats.adminUsers),
      successRate: this.getSuccessRate() + "%",
    };
  }
}

module.exports = AdminHandler;
