const { logInfo, logError } = require("../../utils/logger");

/**
 * Handler especializado para comandos básicos y de usuario
 * Maneja comandos públicos y de uso general
 */
class CommandHandler {
  constructor(botProcessor) {
    this.botProcessor = botProcessor;
    this.whatsappClient = botProcessor.whatsappClient;
    this.userService = botProcessor.userService;
    this.permissionService = botProcessor.permissionService;

    // Comandos básicos disponibles
    this.basicCommands = {
      "/help": "Ayuda y comandos disponibles",
      "/info": "Información del bot",
      "/status": "Estado del sistema",
      "/ping": "Verificar conectividad",
      "/profile": "Perfil de usuario",
      "/usertype": "Cambiar tipo de usuario",
      "/permissions": "Ver permisos",
      "/stats": "Estadísticas básicas",
      "/cambiar": "Cambiar información personal",
      "/nombre": "Cambiar nombre",
    };

    // Estadísticas
    this.stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
    };
  }

  /**
   * Maneja un comando básico
   * @param {Object} message - Mensaje de WhatsApp
   * @param {Object} classification - Clasificación del mensaje
   */
  async handle(message, classification) {
    try {
      this.stats.totalCommands++;

      const command = classification.command;
      const args = (message.text || "").split(" ").slice(1);

      logInfo(`Comando básico solicitado: ${command}`, {
        senderPhone: message.senderPhone,
        args: args,
      });

      // Obtener información del usuario
      const user = await this.userService.getUserByJid(message.chatJid);

      // Verificar permisos para comandos que lo requieren
      if (await this.requiresPermissionCheck(command)) {
        const hasPermission = await this.verifyCommandPermissions(
          message,
          command,
          user
        );
        if (!hasPermission) {
          await this.handlePermissionDenied(message, command);
          return;
        }
      }

      // Ejecutar comando
      await this.executeCommand(message, command, args, user);

      this.stats.successfulCommands++;
    } catch (error) {
      this.stats.failedCommands++;
      logError(
        `Error ejecutando comando básico ${classification.command}:`,
        error
      );
      await this.handleCommandError(message, classification.command, error);
    }
  }

  /**
   * Verifica si un comando requiere verificación de permisos
   * @param {string} command - Comando a verificar
   * @returns {boolean} True si requiere verificación
   */
  async requiresPermissionCheck(command) {
    const publicCommands = ["/help", "/info", "/ping"];
    return !publicCommands.includes(command);
  }

  /**
   * Verifica permisos para ejecutar un comando
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando a verificar
   * @param {Object} user - Usuario que ejecuta el comando
   * @returns {boolean} True si tiene permisos
   */
  async verifyCommandPermissions(message, command, user) {
    if (!user) {
      // Permitir algunos comandos sin registro
      const allowedWithoutUser = ["/help", "/info", "/ping"];
      return allowedWithoutUser.includes(command);
    }

    if (!this.permissionService) {
      return true; // Si no hay servicio de permisos, permitir
    }

    const permissionCheck = await this.permissionService.checkPermissions(
      user,
      command
    );
    return permissionCheck.allowed;
  }

  /**
   * Ejecuta un comando específico
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando a ejecutar
   * @param {Array} args - Argumentos del comando
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async executeCommand(message, command, args, user) {
    let response;

    switch (command) {
      case "/help":
        response = await this.handleHelpCommand(args, user);
        break;

      case "/info":
        response = await this.handleInfoCommand(user);
        break;

      case "/status":
        response = await this.handleStatusCommand(user);
        break;

      case "/ping":
        response = await this.handlePingCommand();
        break;

      case "/profile":
        response = await this.handleProfileCommand(user);
        break;

      case "/usertype":
        response = await this.handleUserTypeCommand(args, user);
        break;

      case "/permissions":
        response = await this.handlePermissionsCommand(user);
        break;

      case "/stats":
        response = await this.handleStatsCommand(user);
        break;

      case "/cambiar":
      case "/nombre":
        response = await this.handleChangeNameCommand(args, user, message);
        break;

      default:
        response = await this.handleUnknownCommand(command);
    }

    // Enviar respuesta
    if (response) {
      await this.whatsappClient.sendMessage(
        message.senderPhone,
        this.botProcessor.botPrefix + response,
        true // isCommand = true
      );
    }
  }

  /**
   * Maneja comando de ayuda
   * @param {Array} args - Argumentos del comando
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handleHelpCommand(args, user) {
    if (args.length > 0) {
      // Ayuda específica de un comando
      const commandName = args[0].startsWith("/") ? args[0] : `/${args[0]}`;
      return this.getCommandHelp(commandName);
    }

    // Ayuda general
    const userLevel = user?.user_type || "guest";

    let helpText = `🤖 *Ayuda del Bot*

📋 *Comandos Básicos:*
• /help - Esta ayuda
• /info - Información del bot
• /ping - Verificar conectividad
• /status - Estado del sistema`;

    if (user) {
      helpText += `

👤 *Comandos de Usuario:*
• /profile - Ver tu perfil
• /usertype - Cambiar tipo de usuario
• /stats - Estadísticas básicas`;

      if (userLevel === "admin") {
        helpText += `

🔧 *Comandos Admin:*
• /admin - Panel de administración
• /sudo - Ejecutar con privilegios
• /debug - Modo debug`;
      }
    }

    helpText += `

💡 *Consejos:*
• Usa /help <comando> para ayuda específica
• Los comandos distinguen mayúsculas/minúsculas`;

    return helpText;
  }

  /**
   * Maneja comando de información
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handleInfoCommand(user) {
    const uptime = this.formatUptime(process.uptime() * 1000);
    const userCount = this.userService ? await this.getUserCount() : "N/A";

    return `🤖 *Información del Bot*

📋 *Detalles:*
• Nombre: ${process.env.BOT_NAME || "DrasBot"}
• Versión: 2.0 Modular
• Estado: ✅ Activo
• Uptime: ${uptime}

🔧 *Configuración:*
• Servidor: Local seguro
• Acceso: Solo localhost
• Auto-reply: ✅ Activo
• Sistema Anti-spam: ✅ Activo

📊 *Estadísticas:*
• Usuarios registrados: ${userCount}
• Mensajes procesados: ${this.botProcessor.processedMessages.size}

💻 *Sistema:*
• Node.js: ${process.version}
• Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
• Plataforma: ${process.platform}`;
  }

  /**
   * Maneja comando de estado
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handleStatusCommand(user) {
    const stats = this.botProcessor.getStats();
    const dbStatus = this.userService ? "✅ Conectada" : "❌ Desconectada";

    let statusText = `📊 *Estado del Sistema*

🚦 *Servicios:*
• Bot Principal: ✅ Funcionando
• Base de Datos: ${dbStatus}
• Permisos: ✅ Activo
• Sistema Anti-Spam: ✅ Activo

📈 *Actividad:*
• Mensajes procesados: ${
      stats.processedMessages || this.botProcessor.processedMessages.size
    }
• Usuarios activos: ${this.stats.totalCommands}
• Comandos ejecutados: ${this.stats.successfulCommands}
• Tasa de éxito: ${this.getSuccessRate()}%

⚡ *Rendimiento:*
• Memoria usada: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
• CPU tiempo: ${Math.round(process.cpuUsage().user / 1000)}ms
• Uptime: ${this.formatUptime(process.uptime() * 1000)}`;

    return statusText;
  }

  /**
   * Maneja comando ping
   */
  async handlePingCommand() {
    const startTime = Date.now();

    // Simular una operación de base de datos
    let dbLatency = "N/A";
    if (this.userService) {
      try {
        await this.userService.getServiceStats();
        dbLatency = `${Date.now() - startTime}ms`;
      } catch (error) {
        dbLatency = "Error";
      }
    }

    const responseTime = Date.now() - startTime;

    return `🏓 *Pong!*

⚡ *Latencias:*
• Bot: ${responseTime}ms
• Base de datos: ${dbLatency}
• Memoria libre: ${Math.round(process.memoryUsage().free / 1024 / 1024)}MB

🔍 *Detalles:*
• Timestamp: ${new Date().toLocaleString()}
• Respuesta: ✅ Exitosa`;
  }

  /**
   * Maneja comando de perfil
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handleProfileCommand(user) {
    if (!user) {
      return `👤 *Perfil de Usuario*

⚠️ No estás registrado en el sistema.
Envía cualquier mensaje para registrarte automáticamente.

💡 Una vez registrado podrás:
• Ver tu perfil completo
• Cambiar tipo de usuario
• Acceder a comandos avanzados`;
    }

    const userTypeDescriptions = {
      admin: "Administrador del sistema",
      employee: "Empleado de la empresa",
      provider: "Proveedor de servicios",
      customer: "Cliente",
      friend: "Amigo",
      familiar: "Familia",
      block: "Usuario bloqueado",
    };

    const typeDescription =
      userTypeDescriptions[user.user_type] || "Tipo desconocido";
    const profileEmoji =
      user.user_type === "admin"
        ? "👑"
        : user.user_type === "employee"
        ? "👷"
        : "👤";

    return `${profileEmoji} *Tu Perfil*

👤 *Información Personal:*
• Nombre: ${user.display_name || "Sin nombre"}
• Tipo: ${user.user_type} (${typeDescription})
• Teléfono: ${user.phone_number}
• Registrado: ${new Date(user.created_at).toLocaleString()}
• Última actividad: ${new Date(user.last_interaction).toLocaleString()}

📊 *Estadísticas:*
• Interacciones totales: ${user.total_messages}
• Estado: ${user.status}
• Idioma: ${user.language || "No detectado"}

💡 Usa /usertype para cambiar tu tipo de usuario`;
  }

  /**
   * Maneja comando de tipo de usuario
   * @param {Array} args - Argumentos del comando
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handleUserTypeCommand(args, user) {
    if (!user) {
      return "⚠️ Necesitas estar registrado para cambiar tu tipo de usuario.";
    }

    if (args.length === 0) {
      return `🏷️ *Tipo de Usuario Actual: ${user.user_type}*

📝 *Tipos Disponibles:*
• customer - Cliente (predeterminado)
• friend - Amigo
• familiar - Familia
• employee - Empleado
• provider - Proveedor

💡 Uso: /usertype <tipo>
Ejemplo: /usertype friend`;
    }

    const newType = args[0].toLowerCase();
    const validTypes = [
      "customer",
      "friend",
      "familiar",
      "employee",
      "provider",
    ];

    if (!validTypes.includes(newType)) {
      return `❌ Tipo inválido: ${newType}

Tipos válidos: ${validTypes.join(", ")}`;
    }

    // Solo admins pueden asignarse como admin
    if (newType === "admin" && user.user_type !== "admin") {
      return "❌ No puedes asignarte como administrador.";
    }

    try {
      await this.userService.updateUserType(user.whatsapp_jid, newType);
      return `✅ Tipo de usuario actualizado de "${user.user_type}" a "${newType}"`;
    } catch (error) {
      logError(`Error actualizando tipo de usuario: ${error.message}`);
      return "❌ Error actualizando tipo de usuario. Inténtalo de nuevo.";
    }
  }

  /**
   * Maneja comando de permisos
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handlePermissionsCommand(user) {
    if (!user) {
      return "⚠️ Necesitas estar registrado para ver permisos.";
    }

    if (!this.permissionService) {
      return "❌ Sistema de permisos no disponible.";
    }

    const permissions = this.permissionService.getUserPermissions(user);

    return `🔐 *Tus Permisos*

👤 *Usuario:* ${user.display_name || user.phone_number}
🏷️ *Tipo:* ${user.user_type}
📊 *Nivel:* ${permissions.level || "Básico"}

✅ *Comandos Permitidos:*
${permissions.allowedCommands?.join("\n• ") || "• Comandos básicos"}

⚠️ *Restricciones:*
${
  permissions.restrictions?.length > 0
    ? permissions.restrictions.join("\n• ")
    : "• Ninguna restricción especial"
}`;
  }

  /**
   * Maneja comando de estadísticas
   * @param {Object} user - Usuario que ejecuta el comando
   */
  async handleStatsCommand(user) {
    const botStats = this.botProcessor.getStats();

    let statsMessage = `📊 *Estadísticas del Bot*

🤖 *Bot:*
• Mensajes procesados: ${
      botStats.processedMessages || this.botProcessor.processedMessages.size
    }
• Uptime: ${this.formatUptime(process.uptime() * 1000)}

📈 *Comandos:*
• Total ejecutados: ${this.stats.totalCommands}
• Exitosos: ${this.stats.successfulCommands}
• Fallos: ${this.stats.failedCommands}
• Tasa de éxito: ${this.getSuccessRate()}%`;

    // Agregar estadísticas de base de datos si está disponible
    if (this.userService) {
      try {
        const dbStats = await this.userService.getServiceStats();
        statsMessage += `

💾 *Base de Datos:*
• Usuarios registrados: ${dbStats.totalUsers || "N/A"}
• Interacciones totales: ${dbStats.todayInteractions || "N/A"}`;
      } catch (error) {
        statsMessage += `\n\n💾 Base de Datos: Error obteniendo estadísticas`;
      }
    }

    return statsMessage;
  }

  /**
   * Maneja comando desconocido
   * @param {string} command - Comando desconocido
   */
  async handleUnknownCommand(command) {
    return `❓ *Comando no reconocido:* ${command}

💡 Usa /help para ver los comandos disponibles.`;
  }

  /**
   * Obtiene ayuda específica de un comando
   * @param {string} command - Comando para obtener ayuda
   */
  getCommandHelp(command) {
    const help = {
      "/help":
        "🤖 /help [comando] - Muestra ayuda general o específica de un comando",
      "/info": "ℹ️ /info - Muestra información detallada del bot",
      "/status": "📊 /status - Muestra el estado actual del sistema",
      "/ping": "🏓 /ping - Verifica la conectividad del bot",
      "/profile": "👤 /profile - Muestra tu perfil de usuario",
      "/usertype": "🏷️ /usertype [tipo] - Cambia tu tipo de usuario",
      "/permissions": "🔐 /permissions - Muestra tus permisos actuales",
      "/stats": "📈 /stats - Muestra estadísticas del bot",
    };

    return help[command] || `❓ No hay ayuda disponible para: ${command}`;
  }

  /**
   * Maneja permisos denegados
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando denegado
   */
  async handlePermissionDenied(message, command) {
    const response = `🚫 *Acceso Denegado*

El comando ${command} requiere permisos que no tienes.

💡 *Posibles soluciones:*
• Registrarte en el sistema
• Cambiar tu tipo de usuario
• Contactar a un administrador`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Maneja errores en comandos
   * @param {Object} message - Mensaje de WhatsApp
   * @param {string} command - Comando que falló
   * @param {Error} error - Error ocurrido
   */
  async handleCommandError(message, command, error) {
    const response = `❌ *Error Ejecutando Comando*

Ha ocurrido un error al procesar: ${command}

🔧 El problema ha sido registrado y será revisado.
Inténtalo de nuevo en unos momentos.`;

    await this.whatsappClient.sendMessage(
      message.senderPhone,
      this.botProcessor.botPrefix + response
    );
  }

  /**
   * Obtiene estadísticas del comando handler
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.getSuccessRate(),
      availableCommands: Object.keys(this.basicCommands).length,
    };
  }

  /**
   * Calcula la tasa de éxito
   */
  getSuccessRate() {
    if (this.stats.totalCommands === 0) return 100;
    return Math.round(
      (this.stats.successfulCommands / this.stats.totalCommands) * 100
    );
  }

  /**
   * Formatea tiempo de actividad
   * @param {number} uptime - Tiempo en milisegundos
   */
  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / (1000 * 60)) % 60;
    const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Obtiene el conteo de usuarios
   */
  async getUserCount() {
    try {
      const stats = await this.userService.getServiceStats();
      return stats.totalUsers || 0;
    } catch (error) {
      return "N/A";
    }
  }

  /**
   * Maneja el comando para cambiar nombre
   * @param {Array} args - Argumentos del comando
   * @param {Object} user - Usuario que ejecuta el comando
   * @param {Object} message - Mensaje original
   * @returns {string} Respuesta del comando
   */
  async handleChangeNameCommand(args, user, message) {
    try {
      // Verificar que el usuario exista
      if (!user) {
        return "❌ Error: No se pudo encontrar tu información de usuario.";
      }

      // Obtener handler de registro del botProcessor
      const registrationHandler = this.botProcessor.registrationHandler;
      if (!registrationHandler) {
        return "❌ Error: Servicio de registro no disponible.";
      }

      // Determinar argumentos según el comando
      let nameArgs = args;
      if (args[0] === "nombre") {
        // Comando: /cambiar nombre Juan
        nameArgs = args.slice(1);
      }
      // Si es /nombre directamente, usar todos los args

      // Delegar al handler de registro
      const result = await registrationHandler.handleChangeName(
        message,
        nameArgs,
        user
      );

      if (result && result.success) {
        return `✅ Tu nombre ha sido actualizado correctamente.`;
      }

      // Si no hay resultado, significa que se envió la respuesta directamente
      return null;
    } catch (error) {
      logError(`Error en comando cambiar nombre:`, error);
      return "❌ Ocurrió un error al cambiar tu nombre. Por favor intenta nuevamente.";
    }
  }
}

module.exports = CommandHandler;
