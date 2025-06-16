import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";

/**
 * Comando para mostrar permisos y comandos disponibles del usuario
 * Accesible para todos los usuarios registrados
 */
export class PermissionsCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "permissions",
      aliases: ["permisos", "comandos", "accesos"],
      description: "Muestra tus permisos y comandos disponibles",
      syntax: "!permissions",
      category: "user",
      permissions: ["user"],
      cooldown: 3,
      examples: [
        "!permissions - Muestra tus permisos y comandos disponibles",
        "!permisos - Comando en español para ver permisos",
      ],
      isAdmin: false,
      isSensitive: false,
    };
  }

  /**
   * Valida si el usuario está registrado
   */
  private validateUser(context: CommandContext): boolean {
    return context.user !== undefined && context.user !== null;
  }

  /**
   * Obtiene información de comandos según el tipo de usuario
   */
  private getUserCommands(userType: UserType): {
    levelName: string;
    userLevel: number;
    totalCommands: number;
    commandsByLevel: Record<
      number,
      Array<{ command: string; description: string }>
    >;
    restrictions: {
      commandLimit: string | number;
      timeRestriction?: { start: number; end: number };
    };
  } {
    // Mapeo de tipos de usuario a niveles
    const userLevelMap: Record<UserType, number> = {
      admin: 4,
      employee: 3,
      provider: 2,
      friend: 2,
      familiar: 2,
      customer: 1,
      block: 0,
    };

    const levelNameMap: Record<number, string> = {
      0: "Bloqueado",
      1: "Básico",
      2: "Estándar",
      3: "Avanzado",
      4: "Administrador",
    };

    const userLevel = userLevelMap[userType] || 1;
    const levelName = levelNameMap[userLevel] || "Básico";

    // Definir comandos por nivel
    const commandsByLevel: Record<
      number,
      Array<{ command: string; description: string }>
    > = {
      1: [
        {
          command: "ping",
          description: "Verificar si el bot está funcionando",
        },
        { command: "help", description: "Mostrar ayuda general" },
        { command: "info", description: "Información sobre el bot" },
        { command: "profile", description: "Ver tu perfil de usuario" },
        { command: "permissions", description: "Ver tus permisos actuales" },
      ],
      2: [
        { command: "status", description: "Estado del sistema" },
        { command: "usertype", description: "Cambiar tipo de usuario" },
      ],
      3: [
        { command: "export", description: "Exportar datos del sistema" },
        { command: "backup", description: "Crear respaldos" },
      ],
      4: [
        { command: "logs", description: "Ver logs del sistema" },
        { command: "stats", description: "Estadísticas del sistema" },
        { command: "diagnostic", description: "Diagnóstico del sistema" },
        { command: "admin", description: "Panel de administración" },
        { command: "users", description: "Gestión de usuarios" },
      ],
    };

    // Calcular total de comandos disponibles
    let totalCommands = 0;
    for (let level = 1; level <= userLevel; level++) {
      totalCommands += commandsByLevel[level]?.length || 0;
    }

    // Definir restricciones según el tipo de usuario
    const restrictions = this.getUserRestrictions(userType);

    return {
      levelName,
      userLevel,
      totalCommands,
      commandsByLevel,
      restrictions,
    };
  }

  /**
   * Obtiene las restricciones para un tipo de usuario
   */
  private getUserRestrictions(userType: UserType): {
    commandLimit: string | number;
    timeRestriction?: { start: number; end: number };
  } {
    switch (userType) {
      case "admin":
        return { commandLimit: "Sin límite" };
      case "employee":
        return { commandLimit: 100 };
      case "provider":
      case "friend":
      case "familiar":
        return {
          commandLimit: 50,
          timeRestriction: { start: 8, end: 22 },
        };
      case "customer":
        return {
          commandLimit: 20,
          timeRestriction: { start: 9, end: 20 },
        };
      case "block":
      default:
        return { commandLimit: 0 };
    }
  }

  /**
   * Obtiene estadísticas de uso simuladas
   */
  private getUserUsageStats(userJid: string): {
    commandsLastHour: number;
    totalCommands: number;
    deniedAttempts: number;
  } {
    // Simulación de estadísticas - en producción usar PermissionService
    return {
      commandsLastHour: Math.floor(Math.random() * 10),
      totalCommands: Math.floor(Math.random() * 100 + 10),
      deniedAttempts: Math.floor(Math.random() * 5),
    };
  }

  /**
   * Verifica si es horario permitido
   */
  private isWithinAllowedTime(timeRestriction?: {
    start: number;
    end: number;
  }): boolean {
    if (!timeRestriction) return true;

    const now = new Date();
    const currentHour = now.getHours();

    return (
      currentHour >= timeRestriction.start && currentHour <= timeRestriction.end
    );
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Verificar si el usuario está registrado
      if (!this.validateUser(context)) {
        return {
          success: true,
          response:
            "⚠️ Usuario no registrado. No se pueden mostrar permisos.\n\nDebes estar registrado para ver tus permisos.",
          shouldReply: true,
        };
      }

      const user = context.user!;

      // Obtener información de comandos y permisos
      const commandsInfo = this.getUserCommands(user.user_type);
      const usageStats = this.getUserUsageStats(user.whatsapp_jid);

      // Construir respuesta
      let response = `📋 **PERMISOS DE USUARIO**\n\n`;

      // Información básica del usuario
      response += `👤 **INFORMACIÓN:**\n`;
      response += `• Usuario: ${user.display_name || "Sin nombre"}\n`;
      response += `• Tipo: ${user.user_type}\n`;
      response += `• Nivel: ${commandsInfo.levelName} (${commandsInfo.userLevel})\n`;
      response += `• Comandos disponibles: ${commandsInfo.totalCommands}\n\n`;

      // Estadísticas de uso
      response += `🕒 **USO ACTUAL:**\n`;
      response += `• Comandos última hora: ${usageStats.commandsLastHour}`;
      if (typeof commandsInfo.restrictions.commandLimit === "number") {
        response += `/${commandsInfo.restrictions.commandLimit}`;
      }
      response += `\n• Total comandos ejecutados: ${usageStats.totalCommands}\n`;
      response += `• Intentos denegados: ${usageStats.deniedAttempts}\n\n`;

      // Comandos disponibles por nivel
      response += `📋 **COMANDOS DISPONIBLES:**\n`;

      const levelNames: Record<number, string> = {
        1: "Básico",
        2: "Estándar",
        3: "Avanzado",
        4: "Administrador",
      };

      for (let level = 1; level <= commandsInfo.userLevel; level++) {
        const commands = commandsInfo.commandsByLevel[level] || [];
        if (commands.length > 0) {
          response += `\n**${levelNames[level]}:**\n`;
          commands.forEach((cmd) => {
            response += `• !${cmd.command} - ${cmd.description}\n`;
          });
        }
      }

      // Restricciones
      if (
        commandsInfo.restrictions.timeRestriction ||
        (typeof commandsInfo.restrictions.commandLimit === "number" &&
          commandsInfo.restrictions.commandLimit > 0)
      ) {
        response += `\n⏰ **RESTRICCIONES:**\n`;

        if (commandsInfo.restrictions.timeRestriction) {
          const time = commandsInfo.restrictions.timeRestriction;
          const isAllowedTime = this.isWithinAllowedTime(time);
          const statusEmoji = isAllowedTime ? "🟢" : "🔴";
          response += `• Horario: ${time.start}:00 - ${time.end}:00 ${statusEmoji}\n`;
        }

        if (typeof commandsInfo.restrictions.commandLimit === "number") {
          response += `• Límite diario: ${commandsInfo.restrictions.commandLimit} comandos\n`;
        }
      }

      // Estado actual del sistema
      response += `\n🔧 **ESTADO DEL SISTEMA:**\n`;
      response += `• Sistema de permisos: 🟢 Activo\n`;
      response += `• Servicios: 🟢 Operativos\n`;
      response += `• Tu estado: ${
        user.is_active ? "🟢 Activo" : "🔴 Inactivo"
      }\n\n`;

      // Información adicional
      response += `💡 **INFORMACIÓN ADICIONAL:**\n`;
      response += `• Usa !help para ver comandos específicos\n`;
      response += `• Usa !usertype para cambiar tu tipo de usuario\n`;
      response += `• Usa !profile para ver tu perfil completo\n\n`;

      response += `🕒 Consultado: ${new Date().toLocaleString()}`;

      return {
        success: true,
        response,
        shouldReply: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response: `❌ Error obteniendo información de permisos: ${errorMessage}`,
        shouldReply: true,
        error: errorMessage,
      };
    }
  }
}
