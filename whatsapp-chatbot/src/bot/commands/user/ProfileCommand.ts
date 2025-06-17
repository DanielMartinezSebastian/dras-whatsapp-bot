import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando para mostrar el perfil del usuario
 * Accesible para todos los usuarios registrados
 */
export class ProfileCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "profile",
      aliases: ["perfil", "mi-perfil", "info-personal"],
      description: this.getConfigMessage(
        "profile.description",
        {},
        "Muestra tu perfil de usuario con estadísticas"
      ),
      syntax: "!profile",
      category: "user",
      permissions: ["user"],
      cooldown: 3,
      examples: [
        "!profile - Muestra tu información de perfil completa",
        "!perfil - Comando en español para mostrar perfil",
      ],
      isAdmin: false,
      isSensitive: false,
    };
  }

  /**
   * Valida si el usuario está registrado y puede ver su perfil
   */
  private validateUser(context: CommandContext): boolean {
    return context.user !== undefined && context.user !== null;
  }

  /**
   * Obtiene el emoji correspondiente al tipo de usuario
   */
  private getUserTypeEmoji(userType: UserType): string {
    const userTypes = this.getValueByPath(null, "messages.commands.profile.user_types");

    if (userTypes && userTypes[userType]) {
      return userTypes[userType].emoji;
    }

    // Fallback hardcodeado
    const emojiMap: Record<UserType, string> = {
      admin: "👑",
      customer: "👤",
      employee: "💼",
      provider: "🏢",
      friend: "👫",
      familiar: "👨‍👩‍👧‍👦",
      block: "🚫",
    };

    return emojiMap[userType] || "👤";
  }

  /**
   * Obtiene la descripción del tipo de usuario
   */
  private getUserTypeDescription(userType: UserType): string {
    const userTypes = this.getValueByPath(null, "messages.commands.profile.user_types");

    if (userTypes && userTypes[userType]) {
      return userTypes[userType].description;
    }

    // Fallback hardcodeado
    const descriptionMap: Record<UserType, string> = {
      admin: "Administrador del sistema",
      customer: "Cliente registrado",
      employee: "Empleado de la empresa",
      provider: "Proveedor de servicios",
      friend: "Amigo personal",
      familiar: "Miembro de la familia",
      block: "Usuario bloqueado",
    };

    return descriptionMap[userType] || "Tipo desconocido";
  }

  /**
   * Formatea una fecha para mostrar de manera legible
   */
  private formatDate(date: Date | string): string {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return this.getConfigMessage(
        "profile.default_values.date_unavailable",
        {},
        "Fecha no disponible"
      );
    }
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
   * Obtiene estadísticas simuladas del usuario
   * En producción, esto vendría del UserService
   */
  private getUserStats(user: any): {
    total_interactions: number;
    avg_processing_time: number;
    commands_executed: number;
  } {
    // Simulación de estadísticas - en producción usar UserService
    return {
      total_interactions: user.total_messages || 0,
      avg_processing_time: Math.round(Math.random() * 200 + 50), // 50-250ms
      commands_executed: Math.round((user.total_messages || 0) * 0.3), // ~30% son comandos
    };
  }

  /**
   * Calcula el tiempo de actividad del usuario
   */
  private getActivityTime(user: any): string {
    try {
      const registeredDate = new Date(user.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - registeredDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return "1 día";
      } else if (diffDays < 30) {
        return `${diffDays} días`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? "mes" : "meses"}`;
      } else {
        const years = Math.floor(diffDays / 365);
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        return `${years} ${years === 1 ? "año" : "años"}${
          remainingMonths > 0
            ? ` y ${remainingMonths} ${remainingMonths === 1 ? "mes" : "meses"}`
            : ""
        }`;
      }
    } catch (error) {
      return "No disponible";
    }
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Verificar si el usuario está registrado
      if (!this.validateUser(context)) {
        const errorMessage = this.getConfigMessage(
          "profile.error_messages.not_registered",
          {},
          "❌ Perfil no disponible - usuario no registrado.\n\nDebes estar registrado para ver tu perfil."
        );
        return {
          success: true,
          response: errorMessage,
          shouldReply: true,
        };
      }

      const user = context.user!;

      // Obtener estadísticas del usuario
      const stats = this.getUserStats(user);

      // Obtener información del tipo de usuario
      const typeEmoji = this.getUserTypeEmoji(user.user_type);
      const typeDescription = this.getUserTypeDescription(user.user_type);

      // Calcular confianza de clasificación (simulada)
      const confidence =
        (user.metadata as any)?.classification_confidence ||
        Math.round(Math.random() * 30 + 70);

      // Obtener configuración de respuesta
      const responseConfig = this.getValueByPath(null, "messages.commands.profile.response");
      const statusIndicators = this.getValueByPath(null, "messages.commands.profile.status_indicators");
      const defaultValues = this.getValueByPath(null, "messages.commands.profile.default_values");

      // Variables para plantillas
      const variables = {
        typeEmoji,
        displayName: user.display_name,
        userType: user.user_type,
        typeDescription,
        phoneNumber: user.phone_number,
        whatsappJid: user.whatsapp_jid,
        statusIndicator: user.is_active
          ? statusIndicators?.active || "🟢 Activo"
          : statusIndicators?.inactive || "� Inactivo",
        registeredDate: this.formatDate(user.created_at),
        lastActivity: user.last_message_at
          ? this.formatDate(user.last_message_at)
          : defaultValues?.last_activity || "No disponible",
        activityTime: this.getActivityTime(user),
        totalInteractions: stats.total_interactions,
        commandsExecuted: stats.commands_executed,
        avgProcessingTime: stats.avg_processing_time,
        confidence,
        language:
          user.metadata?.language || defaultValues?.language || "No detectado",
        timezone:
          user.metadata?.timezone ||
          defaultValues?.timezone ||
          "No configurada",
        preferencesCount: user.metadata?.preferences
          ? Object.keys(user.metadata.preferences).length
          : 0,
        timestamp: new Date().toLocaleString(),
      };

      // Construir respuesta usando configuración
      let response =
        this.replaceVariables(
          responseConfig?.title || "{typeEmoji} **TU PERFIL DE USUARIO**",
          variables
        ) + "\n\n";

      // Procesar cada sección
      if (responseConfig?.sections) {
        const sections = [
          "personal",
          "dates",
          "statistics",
          "configuration",
          "actions",
        ];

        for (const sectionKey of sections) {
          const section = responseConfig.sections[sectionKey];
          if (section) {
            response += section.title + "\n";

            if (section.items) {
              for (const item of section.items) {
                response += this.replaceVariables(item, variables) + "\n";
              }
            }
            response += "\n";
          }
        }

        // Footer
        if (responseConfig.sections.footer?.text) {
          response += this.replaceVariables(
            responseConfig.sections.footer.text,
            variables
          );
        }
      }

      return {
        success: true,
        response,
        shouldReply: true,
      };
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "profile.error_messages.general_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        `❌ Error obteniendo perfil de usuario: ${
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
