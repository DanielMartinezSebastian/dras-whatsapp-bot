import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando para mostrar permisos y comandos disponibles del usuario
 * Accesible para todos los usuarios registrados
 */
export class PermissionsCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "permissions",
      aliases: ["permisos", "comandos", "accesos"],
      description: this.getConfigMessage(
        "permissions.description",
        {},
        "Muestra tus permisos y comandos disponibles"
      ),
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
   * Obtiene un mensaje de configuración con variables reemplazadas
   */
  private getConfigMessage(
    path: string,
    variables?: Record<string, any>,
    fallback?: string
  ): string {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        return fallback || "Configuración no disponible";
      }

      // Obtener mensaje desde commands
      let message = this.getValueByPath(config, `messages.commands.${path}`);

      // Si aún no se encuentra, usar fallback
      if (!message) {
        return fallback || `Mensaje no configurado: ${path}`;
      }

      // Si es un array, tomar un elemento aleatorio
      if (Array.isArray(message)) {
        message = message[Math.floor(Math.random() * message.length)];
      }

      // Reemplazar variables si se proporcionan
      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables);
      }

      return message;
    } catch (error) {
      console.error(
        `Error obteniendo mensaje configurado para ${path}: ${
          error instanceof Error ? error.message : error
        }`
      );
      return fallback || "Error en configuración";
    }
  }

  /**
   * Reemplaza variables en un template de mensaje
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any> = {}
  ): string {
    if (typeof template !== "string") {
      return String(template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(value));
    }
    return result;
  }

  /**
   * Obtiene una ruta de configuración por path anidado
   */
  private getValueByPath(obj: any, path?: string): any {
    if (!path) {
      const config = this.configService.getConfiguration();
      return config;
    }
    const config = this.configService.getConfiguration();
    return path
      .split(".")
      .reduce((current, key) => current?.[key], config as any);
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
    // Obtener mapeos desde configuración
    const userTypeMapping = this.getValueByPath(
      "permissions.user_type_mapping"
    ) || {
      admin: 4,
      employee: 3,
      provider: 2,
      friend: 2,
      familiar: 2,
      customer: 1,
      block: 0,
    };

    const userLevels = this.getValueByPath(null, "messages.commands.permissions.user_levels") || {
      0: { name: "Bloqueado", emoji: "🚫" },
      1: { name: "Básico", emoji: "📚" },
      2: { name: "Estándar", emoji: "⭐" },
      3: { name: "Avanzado", emoji: "🏆" },
      4: { name: "Administrador", emoji: "👑" },
    };

    const userLevel = userTypeMapping[userType] || 1;
    const levelInfo = userLevels[userLevel] || { name: "Básico", emoji: "📚" };
    const levelName = levelInfo.name;

    // Obtener comandos por nivel desde configuración
    const commandsByLevelConfig =
      this.getValueByPath(null, "messages.commands.permissions.commands_by_level") || {};
    const commandsByLevel: Record<
      number,
      Array<{ command: string; description: string }>
    > = {};

    // Convertir configuración a formato esperado
    for (const [level, commands] of Object.entries(commandsByLevelConfig)) {
      const levelNum = parseInt(level);
      commandsByLevel[levelNum] = Array.isArray(commands) ? commands : [];
    }

    // Calcular total de comandos disponibles
    let totalCommands = 0;
    for (let level = 1; level <= userLevel; level++) {
      totalCommands += commandsByLevel[level]?.length || 0;
    }

    // Obtener restricciones desde configuración
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
    const restrictionsConfig = this.getValueByPath(null, "messages.commands.permissions.restrictions");

    if (restrictionsConfig && restrictionsConfig[userType]) {
      const userRestriction = restrictionsConfig[userType];
      return {
        commandLimit: userRestriction.command_limit,
        timeRestriction: userRestriction.time_restriction,
      };
    }

    // Fallback hardcodeado
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
        const errorMessage = this.getConfigMessage(
          "permissions.error_messages.not_registered",
          {},
          "⚠️ Usuario no registrado. No se pueden mostrar permisos.\n\nDebes estar registrado para ver tus permisos."
        );
        return {
          success: true,
          response: errorMessage,
          shouldReply: true,
        };
      }

      const user = context.user!;

      // Obtener información de comandos y permisos
      const commandsInfo = this.getUserCommands(user.user_type);
      const usageStats = this.getUserUsageStats(user.whatsapp_jid);

      // Obtener configuración de respuesta
      const responseConfig = this.getValueByPath(null, "messages.commands.permissions.response");
      const userLevels = this.getValueByPath(null, "messages.commands.permissions.user_levels");

      // Construir texto límite de comandos
      let commandLimitText = "";
      if (typeof commandsInfo.restrictions.commandLimit === "number") {
        commandLimitText = `/${commandsInfo.restrictions.commandLimit}`;
      }

      // Variables para plantillas
      const variables = {
        displayName: user.display_name || "Sin nombre",
        userType: user.user_type,
        levelName: commandsInfo.levelName,
        userLevel: commandsInfo.userLevel,
        totalCommands: commandsInfo.totalCommands,
        commandsLastHour: usageStats.commandsLastHour,
        commandLimitText,
        totalCommandsExecuted: usageStats.totalCommands,
        deniedAttempts: usageStats.deniedAttempts,
        userStatus: user.is_active ? "🟢 Activo" : "🔴 Inactivo",
        timestamp: new Date().toLocaleString(),
      };

      // Construir respuesta usando configuración
      let response =
        this.replaceVariables(
          responseConfig?.title || "� **PERMISOS DE USUARIO**",
          variables
        ) + "\n\n";

      // Sección de información del usuario
      if (responseConfig?.sections?.user_info) {
        response +=
          this.replaceVariables(
            responseConfig.sections.user_info.title,
            variables
          ) + "\n";
        if (responseConfig.sections.user_info.items) {
          for (const item of responseConfig.sections.user_info.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Sección de estadísticas de uso
      if (responseConfig?.sections?.usage_stats) {
        response +=
          this.replaceVariables(
            responseConfig.sections.usage_stats.title,
            variables
          ) + "\n";
        if (responseConfig.sections.usage_stats.items) {
          for (const item of responseConfig.sections.usage_stats.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Comandos disponibles por nivel
      if (responseConfig?.sections?.commands_section) {
        response +=
          this.replaceVariables(
            responseConfig.sections.commands_section.title,
            variables
          ) + "\n";

        for (let level = 1; level <= commandsInfo.userLevel; level++) {
          const commands = commandsInfo.commandsByLevel[level] || [];
          if (commands.length > 0) {
            const levelInfo = userLevels?.[level];
            const levelName = levelInfo?.name || `Nivel ${level}`;
            response += `\n**${levelName}:**\n`;
            commands.forEach((cmd) => {
              response += `• !${cmd.command} - ${cmd.description}\n`;
            });
          }
        }
        response += "\n";
      }

      // Restricciones
      if (
        commandsInfo.restrictions.timeRestriction ||
        (typeof commandsInfo.restrictions.commandLimit === "number" &&
          commandsInfo.restrictions.commandLimit > 0)
      ) {
        if (responseConfig?.sections?.restrictions) {
          response +=
            this.replaceVariables(
              responseConfig.sections.restrictions.title,
              variables
            ) + "\n";

          if (
            commandsInfo.restrictions.timeRestriction &&
            responseConfig.sections.restrictions.time_restriction
          ) {
            const time = commandsInfo.restrictions.timeRestriction;
            const isAllowedTime = this.isWithinAllowedTime(time);
            const statusEmoji = isAllowedTime ? "🟢" : "🔴";
            const restrictionVars = {
              start: time.start,
              end: time.end,
              statusEmoji,
            };
            response +=
              this.replaceVariables(
                responseConfig.sections.restrictions.time_restriction,
                restrictionVars
              ) + "\n";
          }

          if (
            typeof commandsInfo.restrictions.commandLimit === "number" &&
            responseConfig.sections.restrictions.command_limit
          ) {
            const limitVars = { limit: commandsInfo.restrictions.commandLimit };
            response +=
              this.replaceVariables(
                responseConfig.sections.restrictions.command_limit,
                limitVars
              ) + "\n";
          }
          response += "\n";
        }
      }

      // Estado del sistema
      if (responseConfig?.sections?.system_status) {
        response +=
          this.replaceVariables(
            responseConfig.sections.system_status.title,
            variables
          ) + "\n";
        if (responseConfig.sections.system_status.items) {
          for (const item of responseConfig.sections.system_status.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Información adicional
      if (responseConfig?.sections?.additional_info) {
        response +=
          this.replaceVariables(
            responseConfig.sections.additional_info.title,
            variables
          ) + "\n";
        if (responseConfig.sections.additional_info.items) {
          for (const item of responseConfig.sections.additional_info.items) {
            response += this.replaceVariables(item, variables) + "\n";
          }
        }
        response += "\n";
      }

      // Footer
      if (responseConfig?.sections?.footer?.text) {
        response += this.replaceVariables(
          responseConfig.sections.footer.text,
          variables
        );
      }

      return {
        success: true,
        response,
        shouldReply: true,
      };
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "permissions.error_messages.general_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        `❌ Error obteniendo información de permisos: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );

      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        error: errorMessage,
      };
    }
  }
}
