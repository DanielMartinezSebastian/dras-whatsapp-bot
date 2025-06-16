import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";

/**
 * Comando contextual para sugerir actividades y entretenimiento
 */
export class ActivitySuggestionCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "activitySuggestion",
      aliases: ["actividad", "sugerencia", "que hacer"],
      description: "Sugiere actividades y entretenimiento según el contexto",
      syntax: "que puedo hacer? | estoy aburrido | no se que hacer",
      category: "contextual",
      permissions: ["user"],
      cooldown: 3000,
      examples: [
        "estoy aburrido",
        "que puedo hacer?",
        "no se que hacer",
        "sugiere algo",
        "tengo tiempo libre",
      ],
      isAdmin: false,
      isSensitive: false,
    };
  }

  /**
   * Verifica si el mensaje solicita sugerencias de actividades
   */
  matches(messageText: string): boolean {
    const text = messageText.toLowerCase();

    // No capturar negaciones
    if (
      text.includes("no estoy aburrido") ||
      text.includes("ya no estoy aburrido") ||
      text.includes("no me aburro")
    ) {
      return false;
    }

    const activityKeywords = [
      "que puedo hacer",
      "estoy aburrido",
      "estoy aburrida",
      "sugiere algo",
      "que hago",
      "no se que hacer",
      "ideas para",
      "actividades",
      "entretenimiento",
      "tiempo libre",
      "recomienda",
      "diversión",
      "que hacer",
      "me aburro",
      "sugerencia",
      "plan",
      "hacer algo",
    ];

    return (
      activityKeywords.some((keyword) => text.includes(keyword)) ||
      (text.includes("que") && text.includes("hacer")) ||
      (text.includes("estoy") && text.includes("aburrido"))
    );
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const messageText = context.message.text.toLowerCase();

      // Actividades para cuando están aburridos
      if (
        messageText.includes("aburrido") ||
        messageText.includes("aburrida")
      ) {
        const boredActivities = [
          "📚 ¿Qué tal si lees un libro o artículo sobre algo que te interese?\n📱 O podrías probar una nueva app o juego",
          "🎵 ¡Escucha música nueva! Prueba un género que nunca hayas explorado\n🎨 O intenta dibujar algo, aunque sea garabatos",
          "🚶‍♂️ Una caminata corta puede cambiar tu energía completamente\n🧘‍♀️ O intenta meditar 5 minutos",
          "📞 ¿Hace tiempo que no hablas con un amigo? ¡Es buen momento para saludarlo!\n💌 O escribe en un diario",
          "🎮 Juega algo en tu teléfono o consola\n🧩 O arma un rompecabezas si tienes uno",
          "🍳 Cocina algo nuevo, aunque sea simple\n🌱 O cuida tus plantas si tienes",
          "📹 Ve un documental interesante\n✍️ O aprende algo nuevo en YouTube",
        ];

        const activityIndex = Math.floor(
          Math.random() * boredActivities.length
        );

        if (
          isNaN(activityIndex) ||
          activityIndex < 0 ||
          activityIndex >= boredActivities.length
        ) {
          throw new Error("Índice de actividad inválido");
        }

        const response =
          "¡Te entiendo! Aquí tienes algunas ideas:\n\n" +
          boredActivities[activityIndex] +
          "\n\n¿Alguna de estas te llama la atención? 😊";

        return {
          success: true,
          response,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            responseType: "bored_activities",
            activityIndex,
          },
        };
      }

      // Actividades para tiempo libre en general
      if (
        messageText.includes("tiempo libre") ||
        messageText.includes("que hacer")
      ) {
        const freeTimeActivities = [
          "🌟 **Actividades creativas:**\n• Escribir (diario, poemas, historias)\n• Dibujar o pintar\n• Hacer manualidades\n• Tocar un instrumento",
          "🏃‍♂️ **Actividades físicas:**\n• Ejercicio en casa\n• Caminar o correr\n• Yoga o estiramientos\n• Bailar con tu música favorita",
          "🧠 **Actividades mentales:**\n• Leer libros o artículos\n• Aprender algo nuevo online\n• Resolver puzzles o crucigramas\n• Practicar un idioma",
          "👥 **Actividades sociales:**\n• Llamar a familia/amigos\n• Organizar una videollamada grupal\n• Jugar juegos online con otros\n• Escribir cartas o mensajes",
          "🛠️ **Actividades productivas:**\n• Organizar tu espacio\n• Planificar metas futuras\n• Actualizar tu CV\n• Aprender una habilidad nueva",
        ];

        const categoryIndex = Math.floor(
          Math.random() * freeTimeActivities.length
        );

        if (
          isNaN(categoryIndex) ||
          categoryIndex < 0 ||
          categoryIndex >= freeTimeActivities.length
        ) {
          throw new Error("Índice de categoría inválido");
        }

        const response =
          "¡Excelente pregunta! Aquí tienes categorías de actividades:\n\n" +
          freeTimeActivities[categoryIndex] +
          "\n\n¿Te interesa alguna categoría en particular? 🤔";

        return {
          success: true,
          response,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            responseType: "free_time_activities",
            categoryIndex,
          },
        };
      }

      // Sugerencias de entretenimiento
      if (
        messageText.includes("entretenimiento") ||
        messageText.includes("diversión")
      ) {
        const entertainmentSuggestions = [
          "🎬 **Para ver:**\n• Series o películas nuevas\n• Documentales interesantes\n• Videos educativos de YouTube\n• Lives o streams",
          "🎮 **Para jugar:**\n• Juegos móviles\n• Juegos de mesa online\n• Trivia o quiz apps\n• Juegos retro en navegador",
          "🎵 **Para escuchar:**\n• Podcasts sobre temas que te gusten\n• Música de géneros nuevos\n• Audiolibros\n• Playlist según tu estado de ánimo",
          "🌐 **Para explorar:**\n• Tours virtuales de museos\n• Recetas de cocina internacional\n• Subreddits interesantes\n• Cursos gratuitos online",
        ];

        const entertainmentIndex = Math.floor(
          Math.random() * entertainmentSuggestions.length
        );

        if (
          isNaN(entertainmentIndex) ||
          entertainmentIndex < 0 ||
          entertainmentIndex >= entertainmentSuggestions.length
        ) {
          throw new Error("Índice de entretenimiento inválido");
        }

        const response =
          "¡Te ayudo con entretenimiento! 🎉\n\n" +
          entertainmentSuggestions[entertainmentIndex] +
          "\n\n¿Algo de esto te suena bien? 😄";

        return {
          success: true,
          response,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            responseType: "entertainment",
            entertainmentIndex,
          },
        };
      }

      // Sugerencias generales
      const generalSuggestions = [
        "💡 Algunas ideas que siempre funcionan:\n\n🎵 Escuchar música nueva\n📚 Leer algo interesante\n🚶‍♂️ Dar un paseo\n🎨 Ser creativo\n📞 Conectar con alguien\n\n¿Cuál te llama más la atención?",
        "🌟 ¿Qué tal si intentas algo nuevo hoy?\n\n✨ Aprende una palabra en otro idioma\n🍳 Cocina una receta simple\n📸 Toma fotos de cosas bonitas\n🧘‍♀️ Medita 5 minutos\n\n¿Te animas con alguna?",
        "🎯 Según tu estado de ánimo:\n\n😌 Si buscas relajarte: música, lectura, meditación\n⚡ Si quieres energía: ejercicio, baile, limpieza\n🧠 Si quieres aprender: cursos, documentales, podcasts\n\n¿Qué te apetece más?",
      ];

      const generalIndex = Math.floor(
        Math.random() * generalSuggestions.length
      );

      if (
        isNaN(generalIndex) ||
        generalIndex < 0 ||
        generalIndex >= generalSuggestions.length
      ) {
        throw new Error("Índice general inválido");
      }

      const response = generalSuggestions[generalIndex];

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          responseType: "general_suggestions",
          generalIndex,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response:
          "❌ Error generando sugerencias. Pero puedes intentar: ¡lee algo interesante o sal a caminar! 🚶‍♂️",
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
}
