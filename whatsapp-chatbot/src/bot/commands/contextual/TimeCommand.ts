import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";

/**
 * Comando contextual para manejar preguntas sobre el tiempo y horarios
 */
export class TimeCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "time",
      aliases: ["que hora es", "hora", "tiempo", "fecha"],
      description: "Responde preguntas sobre el tiempo y horarios",
      syntax: "que hora es? | que fecha es? | que dia es?",
      category: "contextual",
      permissions: ["user"],
      cooldown: 2000,
      examples: [
        "que hora es?",
        "que fecha es hoy?",
        "que dia es?",
        "hora actual",
      ],
      isAdmin: false,
      isSensitive: false,
    };
  }

  /**
   * Verifica si el mensaje pregunta sobre tiempo/fecha
   */
  matches(messageText: string): boolean {
    const text = messageText.toLowerCase();

    const patterns = [
      /^(que|qué)\s+hora\s+(es|son)/i,
      /^hora\s+(actual|ahora)/i,
      /^(que|qué)\s+fecha\s+(es|tenemos)/i,
      /^(que|qué)\s+(dia|día)\s+(es|tenemos)/i,
      /^fecha\s+(actual|de\s+hoy)/i,
      /^(cuando|cuándo)\s+es/i,
      /hora$/i,
      /^tiempo$/i,
    ];

    return patterns.some((pattern) => pattern.test(text));
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const messageText = context.message.text.toLowerCase();
      const now = new Date();

      // Formatear fecha y hora en español
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Europe/Madrid",
      };

      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Madrid",
        hour12: false,
      };

      const currentDate = now.toLocaleDateString("es-ES", dateOptions);
      const currentTime = now.toLocaleTimeString("es-ES", timeOptions);
      const timeOfDay = this.getTimeOfDay();

      let response: string;
      const userName = context.user?.display_name || "Usuario";

      if (messageText.includes("hora")) {
        const greeting = this.getGreetingByTime(timeOfDay);
        response = `🕐 **Hora actual:** ${currentTime}

${greeting}, ${userName}! `;

        // Agregar contexto según la hora
        if (timeOfDay === "morning") {
          response += "¡Espero que tengas un gran día por delante! ☀️";
        } else if (timeOfDay === "afternoon") {
          response += "¡Que disfrutes tu tarde! 🌤️";
        } else if (timeOfDay === "evening") {
          response += "¡Buena tarde para relajarse! 🌅";
        } else {
          response += "¡Es hora de descansar! 🌙";
        }
      } else if (
        messageText.includes("fecha") ||
        messageText.includes("dia") ||
        messageText.includes("día")
      ) {
        response = `📅 **Fecha de hoy:** ${currentDate}

🕐 **Hora actual:** ${currentTime}

¡${this.getGreetingByTime(timeOfDay)}, ${userName}!`;
      } else {
        response = `⏰ **Información actual:**

📅 **Fecha:** ${currentDate}
🕐 **Hora:** ${currentTime}

¡${this.getGreetingByTime(
          timeOfDay
        )}, ${userName}! ¿En qué más puedo ayudarte?`;
      }

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          responseType: "time_info",
          currentDate,
          currentTime,
          timeOfDay,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response: "❌ Error obteniendo información de tiempo",
        shouldReply: true,
        error: errorMessage,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Obtiene la parte del día actual
   */
  private getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 22) return "evening";
    return "night";
  }

  /**
   * Obtiene saludo apropiado según la hora
   */
  private getGreetingByTime(timeOfDay: string): string {
    switch (timeOfDay) {
      case "morning":
        return "Buenos días";
      case "afternoon":
        return "Buenas tardes";
      case "evening":
        return "Buenas tardes";
      case "night":
        return "Buenas noches";
      default:
        return "Hola";
    }
  }
}
