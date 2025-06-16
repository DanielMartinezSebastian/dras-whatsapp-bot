import { IPermissionService } from "../interfaces/services/IPermissionService";
import { User, UserType } from "../types/core/user.types";
import {
  PermissionResult,
  PermissionCheck,
  PermissionConfig,
} from "../types/services/permission.types";
import { Permission } from "../types/commands/command.types";
import logger from "../utils/logger";

interface CommandUsageStats {
  commands: number[];
  totalCommands: number;
  firstCommand: number;
  lastCommand: number;
}

interface AccessDeniedAttempt {
  command: string;
  reason: string;
  timestamp: number;
  date: string;
}

interface UserUsageStats {
  commandsLastHour: number;
  totalCommands: number;
  deniedAttempts: number;
  firstActivity: Date | null;
  lastActivity: Date | null;
  recentDeniedCommands?: AccessDeniedAttempt[];
}

interface PermissionValidation {
  allowed: boolean;
  message: string;
  checks?: Record<string, any>;
}

interface FullPermissionResult {
  allowed: boolean;
  message: string;
  reason: string;
  userLevel?: number;
  checks?: Record<string, any>;
}

/**
 * Servicio para gestionar permisos y estadísticas de uso de comandos
 */
export class PermissionService implements IPermissionService {
  private config: PermissionConfig;
  private commandUsageStats: Map<string, CommandUsageStats>;
  private accessDeniedLog: Map<string, AccessDeniedAttempt[]>;
  private timeWindow: number;
  private cleanupInterval: NodeJS.Timeout;

  // Niveles de permisos por tipo de usuario
  private userPermissionLevels: Record<UserType, number> = {
    admin: 5,
    employee: 4,
    provider: 3,
    friend: 2,
    familiar: 2,
    customer: 1,
    block: 0,
  };

  // Límites de comandos por hora por tipo de usuario
  private commandLimits: Record<UserType, number> = {
    admin: 1000,
    employee: 100,
    provider: 50,
    friend: 30,
    familiar: 30,
    customer: 10,
    block: 0,
  };

  constructor(config?: Partial<PermissionConfig>) {
    this.config = {
      strictMode: false,
      defaultPermissions: ["user"],
      adminOverride: true,
      ...config,
    };

    this.commandUsageStats = new Map();
    this.accessDeniedLog = new Map();
    this.timeWindow = 60 * 60 * 1000; // 1 hora en milisegundos

    // Limpiar estadísticas cada hora
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldStats();
    }, this.timeWindow);
  }

  /**
   * Verificar permisos completos para ejecutar un comando
   */
  async checkFullPermissions(
    user: User,
    command: string
  ): Promise<FullPermissionResult> {
    if (!user) {
      return {
        allowed: false,
        message: "Usuario no encontrado",
        reason: "user_not_found",
      };
    }

    const userType = user.user_type;
    const chatJid = user.whatsapp_jid;

    // Obtener estadísticas de uso actuales
    const commandCount = this.getCommandCount(chatJid);

    // Validar permisos completos
    const validation = this.validateFullPermissions(
      userType,
      command,
      commandCount
    );

    // Registrar intento de acceso
    this.logAccessAttempt(chatJid, command, validation.allowed, userType);

    if (!validation.allowed) {
      // Registrar acceso denegado
      this.recordAccessDenied(chatJid, command, validation.message);

      logger.info(
        `🚫 Acceso denegado - Usuario: ${chatJid} (${userType}), Comando: ${command}, Razón: ${validation.message}`
      );
    } else {
      // Incrementar contador de comandos
      this.incrementCommandCount(chatJid);

      logger.info(
        `✅ Comando autorizado - Usuario: ${chatJid} (${userType}), Comando: ${command}`
      );
    }

    return {
      allowed: validation.allowed,
      message: validation.message,
      reason: validation.allowed ? "authorized" : "insufficient_permissions",
    };
  }

  /**
   * Verificar si un usuario tiene un permiso específico
   */
  hasPermission(user: User, permission: Permission): boolean {
    const userLevel = this.userPermissionLevels[user.user_type] || 0;
    const requiredLevel = this.getPermissionLevel(permission);

    return userLevel >= requiredLevel;
  }

  /**
   * Otorgar permiso a un usuario (no implementado en esta versión básica)
   */
  async grantPermission(user: User, permission: Permission): Promise<boolean> {
    // En un sistema más complejo, esto actualizaría la base de datos
    logger.warn(
      `grantPermission no implementado para usuario ${user.whatsapp_jid}`
    );
    return false;
  }

  /**
   * Revocar permiso de un usuario (no implementado en esta versión básica)
   */
  async revokePermission(user: User, permission: Permission): Promise<boolean> {
    // En un sistema más complejo, esto actualizaría la base de datos
    logger.warn(
      `revokePermission no implementado para usuario ${user.whatsapp_jid}`
    );
    return false;
  }

  /**
   * Obtener permisos de un usuario
   */
  getUserPermissions(user: User): Permission[] {
    const permissions: Permission[] = [];

    if (this.hasPermission(user, "user")) permissions.push("user");
    if (this.hasPermission(user, "moderator")) permissions.push("moderator");
    if (this.hasPermission(user, "admin")) permissions.push("admin");
    if (this.hasPermission(user, "system")) permissions.push("system");

    return permissions;
  }

  /**
   * Verificar permisos con contexto adicional
   */
  async checkPermission(check: PermissionCheck): Promise<PermissionResult> {
    const hasPermission = this.hasPermission(
      check.user,
      check.requiredPermission
    );

    return {
      granted: hasPermission,
      reason: hasPermission ? "permission_granted" : "insufficient_permissions",
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private validateFullPermissions(
    userType: UserType,
    command: string,
    commandCount: number
  ): PermissionValidation {
    const userLevel = this.userPermissionLevels[userType] || 0;
    const commandLimit = this.commandLimits[userType] || 0;

    // Verificar si el usuario está bloqueado
    if (userType === "block") {
      return {
        allowed: false,
        message: "🚫 Usuario bloqueado",
      };
    }

    // Verificar límite de comandos por hora
    if (commandCount >= commandLimit) {
      return {
        allowed: false,
        message: `⏰ Límite de comandos alcanzado (${commandLimit}/hora)`,
      };
    }

    // Verificar permisos específicos del comando
    const requiredLevel = this.getCommandRequiredLevel(command);
    if (userLevel < requiredLevel) {
      return {
        allowed: false,
        message: `🔒 Permisos insuficientes para el comando ${command}`,
      };
    }

    return {
      allowed: true,
      message: "Comando autorizado",
    };
  }

  private getPermissionLevel(permission: Permission): number {
    const levels: Record<Permission, number> = {
      user: 1,
      moderator: 3,
      admin: 4,
      system: 5,
    };
    return levels[permission] || 0;
  }

  private getCommandRequiredLevel(command: string): number {
    // Comandos administrativos requieren nivel alto
    const adminCommands = ["admin", "users", "stats", "config", "shutdown"];
    if (adminCommands.some((cmd) => command.includes(cmd))) {
      return 4; // Nivel admin
    }

    // Comandos de moderación requieren nivel medio
    const moderatorCommands = ["kick", "ban", "mute", "warn"];
    if (moderatorCommands.some((cmd) => command.includes(cmd))) {
      return 3; // Nivel moderador
    }

    // Comandos básicos requieren nivel mínimo
    return 1;
  }

  private getCommandCount(chatJid: string): number {
    const userStats = this.commandUsageStats.get(chatJid);
    if (!userStats) return 0;

    const now = Date.now();
    const oneHourAgo = now - this.timeWindow;

    // Filtrar comandos de la última hora
    const recentCommands = userStats.commands.filter(
      (timestamp) => timestamp > oneHourAgo
    );

    return recentCommands.length;
  }

  private incrementCommandCount(chatJid: string): void {
    const now = Date.now();

    if (!this.commandUsageStats.has(chatJid)) {
      this.commandUsageStats.set(chatJid, {
        commands: [],
        totalCommands: 0,
        firstCommand: now,
        lastCommand: now,
      });
    }

    const userStats = this.commandUsageStats.get(chatJid)!;
    userStats.commands.push(now);
    userStats.totalCommands++;
    userStats.lastCommand = now;
  }

  private recordAccessDenied(
    chatJid: string,
    command: string,
    reason: string
  ): void {
    const now = Date.now();

    if (!this.accessDeniedLog.has(chatJid)) {
      this.accessDeniedLog.set(chatJid, []);
    }

    const deniedAttempts = this.accessDeniedLog.get(chatJid)!;
    deniedAttempts.push({
      command,
      reason,
      timestamp: now,
      date: new Date(now).toISOString(),
    });

    // Mantener solo los últimos 50 intentos por usuario
    if (deniedAttempts.length > 50) {
      deniedAttempts.splice(0, deniedAttempts.length - 50);
    }
  }

  private logAccessAttempt(
    chatJid: string,
    command: string,
    allowed: boolean,
    userType: UserType
  ): void {
    const logMessage = `${
      allowed ? "✅" : "🚫"
    } ${chatJid} (${userType}) -> ${command}`;
    logger.debug(logMessage);
  }

  private cleanupOldStats(): void {
    const now = Date.now();
    const cutoff = now - this.timeWindow;

    // Limpiar estadísticas de comandos antiguos
    for (const [chatJid, stats] of this.commandUsageStats.entries()) {
      stats.commands = stats.commands.filter((timestamp) => timestamp > cutoff);

      // Remover entrada si no hay comandos recientes
      if (stats.commands.length === 0 && stats.lastCommand < cutoff) {
        this.commandUsageStats.delete(chatJid);
      }
    }

    // Limpiar intentos de acceso denegado antiguos
    for (const [chatJid, attempts] of this.accessDeniedLog.entries()) {
      const recentAttempts = attempts.filter(
        (attempt) => attempt.timestamp > cutoff
      );

      if (recentAttempts.length === 0) {
        this.accessDeniedLog.delete(chatJid);
      } else {
        this.accessDeniedLog.set(chatJid, recentAttempts);
      }
    }

    logger.debug("🧹 Estadísticas de permisos limpias");
  }

  // ==================== MÉTODOS PÚBLICOS ADICIONALES ====================

  /**
   * Obtener estadísticas de uso para un usuario
   */
  getUserUsageStats(chatJid: string): UserUsageStats {
    const commandStats = this.commandUsageStats.get(chatJid);
    const deniedStats = this.accessDeniedLog.get(chatJid) || [];

    if (!commandStats) {
      return {
        commandsLastHour: 0,
        totalCommands: 0,
        deniedAttempts: deniedStats.length,
        firstActivity: null,
        lastActivity: null,
      };
    }

    const now = Date.now();
    const oneHourAgo = now - this.timeWindow;

    const commandsLastHour = commandStats.commands.filter(
      (timestamp) => timestamp > oneHourAgo
    ).length;

    return {
      commandsLastHour,
      totalCommands: commandStats.totalCommands,
      deniedAttempts: deniedStats.length,
      firstActivity: new Date(commandStats.firstCommand),
      lastActivity: new Date(commandStats.lastCommand),
      recentDeniedCommands: deniedStats.slice(-5), // Últimos 5 intentos denegados
    };
  }

  /**
   * Obtener comandos disponibles para un tipo de usuario
   */
  getUserCommands(userType: UserType): string[] {
    const userLevel = this.userPermissionLevels[userType] || 0;
    const commands: string[] = [];

    // Comandos básicos (nivel 1+)
    if (userLevel >= 1) {
      commands.push("help", "info", "ping", "status");
    }

    // Comandos estándar (nivel 2+)
    if (userLevel >= 2) {
      commands.push("search", "weather", "reminder");
    }

    // Comandos de moderación (nivel 3+)
    if (userLevel >= 3) {
      commands.push("warn", "timeout", "reports");
    }

    // Comandos administrativos (nivel 4+)
    if (userLevel >= 4) {
      commands.push("users", "stats", "config", "ban", "unban");
    }

    // Comandos de sistema (nivel 5)
    if (userLevel >= 5) {
      commands.push("shutdown", "restart", "backup", "logs");
    }

    return commands;
  }

  /**
   * Cerrar el servicio y limpiar recursos
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.commandUsageStats.clear();
    this.accessDeniedLog.clear();
    logger.info("PermissionService cerrado correctamente");
  }
}
