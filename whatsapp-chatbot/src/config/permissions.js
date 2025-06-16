/**
 * SISTEMA DE PERMISOS POR TIPO DE USUARIO
 *
 * Este archivo define las restricciones de acceso a comandos y funcionalidades
 * del chatbot basado en el tipo de usuario. Es fácil de modificar y mantener.
 *
 * NIVELES DE PERMISO:
 * - 0: Sin acceso (bloqueado)
 * - 1: Acceso básico (solo comandos públicos)
 * - 2: Acceso estándar (comandos de usuario)
 * - 3: Acceso avanzado (comandos de gestión)
 * - 4: Acceso completo (administrador)
 */

class PermissionSystem {
  constructor() {
    // Definir niveles de permiso por tipo de usuario
    this.userPermissionLevels = {
      block: 0, // Usuario bloqueado - sin acceso
      customer: 1, // Cliente - acceso básico
      provider: 2, // Proveedor - acceso estándar
      employee: 3, // Empleado - acceso avanzado
      friend: 2, // Amigo - acceso estándar
      familiar: 2, // Familiar - acceso estándar
      admin: 4, // Administrador - acceso completo
    };

    // Configurar permisos por comando (sincronizado con CommandRegistry)
    this.commandPermissions = {
      // ==================== COMANDOS PÚBLICOS (Nivel 1+) ====================
      "/help": { minLevel: 1, description: "Mostrar ayuda personalizada" },
      "/info": { minLevel: 1, description: "Información del bot y sistema" },
      "/estado": { minLevel: 1, description: "Estado actual del sistema" },
      "/ping": { minLevel: 1, description: "Verificar latencia del bot" },
      "/profile": { minLevel: 1, description: "Ver perfil y estadísticas" },

      // ==================== COMANDOS DE USUARIO (Nivel 2+) ====================
      "/usertype": {
        minLevel: 2,
        description: "Ver o cambiar tipo de usuario",
      },
      "/permissions": {
        minLevel: 2,
        description: "Ver permisos y restricciones",
      },
      "/permisos": { minLevel: 2, description: "Ver permisos y restricciones" },
      "/contexto": { minLevel: 2, description: "Ver contexto de conversación" },
      "/reset": {
        minLevel: 2,
        description: "Reiniciar conversación y contexto",
      },

      // ==================== COMANDOS AVANZADOS (Nivel 3+) ====================
      "/stats": {
        minLevel: 3,
        description: "Estadísticas detalladas del sistema",
      },
      "/export": { minLevel: 3, description: "Exportar datos del sistema" },
      "/clear": { minLevel: 3, description: "Limpiar cache del sistema" },

      // ==================== COMANDOS DE ADMINISTRADOR (Nivel 4) ====================
      "/admin": {
        minLevel: 4,
        description: "Panel de administración principal",
      },
      "/users": { minLevel: 4, description: "Gestión completa de usuarios" },
      "/block": { minLevel: 4, description: "Bloquear usuario específico" },
      "/unblock": {
        minLevel: 4,
        description: "Desbloquear usuario y asignar tipo",
      },
      "/changetype": {
        minLevel: 4,
        description: "Cambiar tipo de otro usuario",
      },
      "/broadcast": { minLevel: 4, description: "Enviar mensaje masivo" },
      "/maintenance": {
        minLevel: 4,
        description: "Activar/desactivar modo mantenimiento",
      },
      "/logs": { minLevel: 4, description: "Ver logs del sistema" },
      "/backup": { minLevel: 4, description: "Crear respaldo de datos" },
    };

    // Configurar funcionalidades por nivel
    this.featurePermissions = {
      canReceiveMessages: { minLevel: 1 },
      canSendMessages: { minLevel: 1 },
      canUseCommands: { minLevel: 1 },
      canChangeOwnProfile: { minLevel: 2 },
      canViewOtherProfiles: { minLevel: 3 },
      canModifyUsers: { minLevel: 4 },
      canAccessLogs: { minLevel: 4 },
      canManageSystem: { minLevel: 4 },
    };

    // Mensajes de error personalizados por nivel
    this.permissionMessages = {
      0: "🚫 Acceso denegado - Usuario bloqueado",
      1: "⛔ Permisos insuficientes - Solo comandos básicos disponibles",
      2: "🔒 Comando no disponible para tu tipo de usuario",
      3: "👮 Comando restringido - Se requieren permisos de empleado o superior",
      insufficient: "⚠️ No tienes permisos para ejecutar este comando",
    };

    // Configuración de restricciones especiales
    this.specialRestrictions = {
      // Horarios de uso (24h format)
      timeRestrictions: {
        customer: { start: 6, end: 24 }, // 6 AM - 12 AM (más flexible)
        provider: { start: 7, end: 23 }, // 7 AM - 11 PM
        employee: { start: 0, end: 24 }, // Sin restricción
        admin: { start: 0, end: 24 }, // Sin restricción
      },

      // Límites de comandos por hora
      commandLimits: {
        customer: 30, // 30 comandos por hora (era 20)
        provider: 75, // 75 comandos por hora (era 50)
        friend: 50, // 50 comandos por hora (era 30)
        familiar: 60, // 60 comandos por hora (era 40)
        employee: 150, // 150 comandos por hora (era 100)
        admin: -1, // Sin límite
      },

      // Comandos con restricciones adicionales (requieren confirmación o registro especial)
      sensitiveCommands: [
        "/admin",
        "/block",
        "/unblock",
        "/changetype",
        "/broadcast",
        "/maintenance",
        "/logs",
        "/backup",
        "/clear",
      ],

      // Funcionalidades experimentales (solo admin y con confirmación)
      betaFeatures: ["/ai", "/experimental", "/debug", "/test", "/analyze"],
    };
  }

  /**
   * Verificar si un usuario tiene permisos para ejecutar un comando
   * @param {string} userType - Tipo de usuario
   * @param {string} command - Comando a verificar
   * @returns {Object} Resultado de la verificación
   */
  checkCommandPermission(userType, command) {
    // Obtener nivel de permiso del usuario
    const userLevel = this.userPermissionLevels[userType] || 0;

    // Obtener permiso requerido para el comando
    const commandConfig = this.commandPermissions[command];

    if (!commandConfig) {
      // Comando no reconocido - permitir solo a admin
      return {
        allowed: userLevel >= 4,
        message:
          userLevel >= 4
            ? null
            : "🔍 Comando no reconocido - Solo administradores",
        level: userLevel,
        required: 4,
      };
    }

    const requiredLevel = commandConfig.minLevel;
    const allowed = userLevel >= requiredLevel;

    return {
      allowed,
      message: allowed
        ? null
        : this.getPermissionDeniedMessage(userLevel, requiredLevel),
      level: userLevel,
      required: requiredLevel,
      description: commandConfig.description,
    };
  }

  /**
   * Verificar si un usuario puede usar una funcionalidad
   * @param {string} userType - Tipo de usuario
   * @param {string} feature - Funcionalidad a verificar
   * @returns {boolean} True si tiene permisos
   */
  checkFeaturePermission(userType, feature) {
    const userLevel = this.userPermissionLevels[userType] || 0;
    const featureConfig = this.featurePermissions[feature];

    if (!featureConfig) return false;

    return userLevel >= featureConfig.minLevel;
  }

  /**
   * Verificar restricciones de horario
   * @param {string} userType - Tipo de usuario
   * @returns {Object} Resultado de verificación de horario
   */
  checkTimeRestriction(userType) {
    const restriction = this.specialRestrictions.timeRestrictions[userType];

    if (!restriction) return { allowed: true };

    const now = new Date();
    const currentHour = now.getHours();

    const allowed =
      currentHour >= restriction.start && currentHour < restriction.end;

    return {
      allowed,
      message: allowed
        ? null
        : `⏰ Acceso restringido. Horario permitido: ${restriction.start}:00 - ${restriction.end}:00`,
      currentHour,
      allowedStart: restriction.start,
      allowedEnd: restriction.end,
    };
  }

  /**
   * Verificar límites de comandos por hora
   * @param {string} userType - Tipo de usuario
   * @param {number} currentCommandCount - Comandos ejecutados en la última hora
   * @returns {Object} Resultado de verificación de límites
   */
  checkCommandLimit(userType, currentCommandCount) {
    const limit = this.specialRestrictions.commandLimits[userType];

    if (!limit || limit === -1) return { allowed: true };

    const allowed = currentCommandCount < limit;

    return {
      allowed,
      message: allowed
        ? null
        : `⚡ Límite de comandos alcanzado (${limit}/hora)`,
      current: currentCommandCount,
      limit,
    };
  }

  /**
   * Obtener mensaje de permiso denegado personalizado
   * @param {number} userLevel - Nivel del usuario
   * @param {number} requiredLevel - Nivel requerido
   * @returns {string} Mensaje de error
   */
  getPermissionDeniedMessage(userLevel, requiredLevel) {
    if (userLevel === 0) return this.permissionMessages[0];

    if (requiredLevel === 4) {
      return "👑 Comando restringido a administradores";
    }

    if (requiredLevel === 3) {
      return this.permissionMessages[3];
    }

    return this.permissionMessages.insufficient;
  }

  /**
   * Obtener lista de comandos disponibles para un tipo de usuario
   * @param {string} userType - Tipo de usuario
   * @returns {Array} Lista de comandos permitidos
   */
  getAvailableCommands(userType) {
    const userLevel = this.userPermissionLevels[userType] || 0;

    const availableCommands = [];

    for (const [command, config] of Object.entries(this.commandPermissions)) {
      if (userLevel >= config.minLevel) {
        availableCommands.push({
          command,
          description: config.description,
          level: config.minLevel,
        });
      }
    }

    return availableCommands.sort((a, b) => a.level - b.level);
  }

  /**
   * Obtener información completa de permisos para un usuario
   * @param {string} userType - Tipo de usuario
   * @returns {Object} Información detallada de permisos
   */
  getUserPermissionInfo(userType) {
    const userLevel = this.userPermissionLevels[userType] || 0;
    const availableCommands = this.getAvailableCommands(userType);
    const timeRestriction = this.checkTimeRestriction(userType);
    const commandLimit = this.specialRestrictions.commandLimits[userType];

    return {
      userType,
      level: userLevel,
      levelName: this.getLevelName(userLevel),
      availableCommands,
      totalCommands: availableCommands.length,
      timeRestriction: timeRestriction.allowed
        ? null
        : {
            start: this.specialRestrictions.timeRestrictions[userType]?.start,
            end: this.specialRestrictions.timeRestrictions[userType]?.end,
          },
      commandLimit: commandLimit === -1 ? "Sin límite" : `${commandLimit}/hora`,
      features: this.getAvailableFeatures(userType),
    };
  }

  /**
   * Obtener nombre descriptivo del nivel de permiso
   * @param {number} level - Nivel numérico
   * @returns {string} Nombre del nivel
   */
  getLevelName(level) {
    const levelNames = {
      0: "Bloqueado",
      1: "Básico",
      2: "Estándar",
      3: "Avanzado",
      4: "Administrador",
    };
    return levelNames[level] || "Desconocido";
  }

  /**
   * Obtener funcionalidades disponibles para un tipo de usuario
   * @param {string} userType - Tipo de usuario
   * @returns {Array} Lista de funcionalidades disponibles
   */
  getAvailableFeatures(userType) {
    const userLevel = this.userPermissionLevels[userType] || 0;
    const features = [];

    for (const [feature, config] of Object.entries(this.featurePermissions)) {
      if (userLevel >= config.minLevel) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Validar permisos completos (comando + horario + límites)
   * @param {string} userType - Tipo de usuario
   * @param {string} command - Comando a ejecutar
   * @param {number} commandCount - Comandos ejecutados en la última hora
   * @returns {Object} Resultado completo de validación
   */
  validateFullPermissions(userType, command, commandCount = 0) {
    const commandPermission = this.checkCommandPermission(userType, command);
    const timePermission = this.checkTimeRestriction(userType);
    const limitPermission = this.checkCommandLimit(userType, commandCount);

    const allowed =
      commandPermission.allowed &&
      timePermission.allowed &&
      limitPermission.allowed;

    let message = null;
    if (!allowed) {
      message =
        commandPermission.message ||
        timePermission.message ||
        limitPermission.message;
    }

    return {
      allowed,
      message,
      checks: {
        command: commandPermission,
        time: timePermission,
        limit: limitPermission,
      },
    };
  }
}

module.exports = PermissionSystem;
