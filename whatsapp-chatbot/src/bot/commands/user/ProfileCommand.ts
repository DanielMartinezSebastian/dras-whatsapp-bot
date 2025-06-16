import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";

/**
 * Comando para mostrar el perfil del usuario
 * Accesible para todos los usuarios registrados
 */
export class ProfileCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "profile",
      aliases: ["perfil", "mi-perfil", "info-personal"],
      description: "Muestra tu perfil de usuario con estadísticas",
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
      return "Fecha no disponible";
    }
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
        return {
          success: true,
          response:
            "❌ Perfil no disponible - usuario no registrado.\n\nDebes estar registrado para ver tu perfil.",
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

      // Construir respuesta del perfil
      let response = `${typeEmoji} **TU PERFIL DE USUARIO**\n\n`;

      // Información básica
      response += `👤 **INFORMACIÓN PERSONAL:**\n`;
      response += `• Nombre: ${user.display_name}\n`;
      response += `• Tipo: ${user.user_type} (${typeDescription})\n`;
      response += `• Teléfono: ${user.phone_number}\n`;
      response += `• WhatsApp JID: ${user.whatsapp_jid}\n`;
      response += `• Estado: ${
        user.is_active ? "🟢 Activo" : "🔴 Inactivo"
      }\n\n`;

      // Fechas importantes
      response += `📅 **FECHAS:**\n`;
      response += `• Registrado: ${this.formatDate(user.created_at)}\n`;
      response += `• Última actividad: ${
        user.last_message_at
          ? this.formatDate(user.last_message_at)
          : "No disponible"
      }\n`;
      response += `• Tiempo activo: ${this.getActivityTime(user)}\n\n`;

      // Estadísticas de uso
      response += `📊 **ESTADÍSTICAS:**\n`;
      response += `• Interacciones totales: ${stats.total_interactions}\n`;
      response += `• Comandos ejecutados: ${stats.commands_executed}\n`;
      response += `• Tiempo promedio: ${stats.avg_processing_time}ms\n`;
      response += `• Confianza clasificación: ${confidence}%\n\n`;

      // Configuración y metadata
      if (user.metadata) {
        response += `⚙️ **CONFIGURACIÓN:**\n`;
        response += `• Idioma: ${user.metadata.language || "No detectado"}\n`;
        response += `• Zona horaria: ${
          user.metadata.timezone || "No configurada"
        }\n`;
        if (user.metadata.preferences) {
          const prefCount = Object.keys(user.metadata.preferences).length;
          response += `• Preferencias: ${prefCount} configuradas\n`;
        }
        response += `\n`;
      }

      // Información adicional y ayuda
      response += `💡 **ACCIONES DISPONIBLES:**\n`;
      response += `• Usa !usertype para cambiar tu tipo de usuario\n`;
      response += `• Usa !permissions para ver tus permisos\n`;
      response += `• Usa !help para ver comandos disponibles\n\n`;

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
        response: `❌ Error obteniendo perfil de usuario: ${errorMessage}`,
        shouldReply: true,
        error: errorMessage,
      };
    }
  }
}
