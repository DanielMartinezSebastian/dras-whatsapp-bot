import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";

/**
 * Comando contextual para proporcionar palabras de motivación y apoyo
 */
export class MotivationCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "motivation",
      aliases: ["motivacion", "animo", "apoyo"],
      description: "Proporciona palabras de motivación y apoyo emocional",
      syntax: "estoy triste | necesito animo | me siento mal",
      category: "contextual",
      permissions: ["user"],
      cooldown: 3000,
      examples: [
        "estoy triste",
        "necesito animo",
        "me siento mal",
        "estoy desanimado",
      ],
      isAdmin: false,
      isSensitive: false,
    };
  }

  /**
   * Verifica si el mensaje expresa tristeza o necesidad de apoyo
   */
  matches(messageText: string): boolean {
    const text = messageText.toLowerCase();

    const sadnessKeywords = [
      "triste",
      "mal",
      "deprimido",
      "solo",
      "sola",
      "problemas",
      "desanimado",
      "ayuda",
      "apoyo",
      "perdido",
      "perdida",
      "dolor",
      "sufro",
      "llorar",
      "angustia",
      "ansiedad",
      "miedo",
      "preocupado",
      "preocupada",
      "estres",
      "estrés",
    ];

    const supportKeywords = [
      "necesito",
      "quiero",
      "puedes",
      "ayudar",
      "escuchar",
      "hablar",
      "contar",
      "confiar",
      "desahogar",
    ];

    return (
      sadnessKeywords.some((keyword) => text.includes(keyword)) ||
      (supportKeywords.some((keyword) => text.includes(keyword)) &&
        (text.includes("me siento") ||
          text.includes("estoy") ||
          text.includes("me"))) ||
      (text.includes("me") && text.includes("ayuda"))
    );
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const motivationalMessages = [
        "🌟 Recuerda que cada día es una nueva oportunidad para ser mejor. Tú puedes con esto y mucho más.",
        "💪 Los momentos difíciles no duran, pero las personas fuertes sí. Eres más resiliente de lo que crees.",
        "🌈 Después de la tormenta siempre viene la calma. Este momento difícil también pasará.",
        "✨ No importa qué tan lento vayas, siempre y cuando no te detengas. Cada paso cuenta.",
        "🦋 A veces necesitamos atravesar momentos oscuros para apreciar la luz. Estás creciendo.",
        "🌱 Como las plantas necesitan lluvia para crecer, tú necesitas estos desafíos para fortalecerte.",
        "🔥 Dentro de ti hay una llama que ninguna dificultad puede apagar. Confía en tu fuerza interior.",
        "🌅 Cada amanecer es una página en blanco. Hoy puedes escribir algo hermoso en tu historia.",
        "💎 La presión hace diamantes. Lo que estás viviendo te está convirtiendo en alguien extraordinario.",
        "🌸 Eres como una flor que florece en su momento perfecto. Ten paciencia contigo mismo.",
      ];

      const supportMessages = [
        "\n\n🤗 Recuerda que no estás solo en esto. Siempre hay alguien dispuesto a escucharte.",
        "\n\n💝 Eres valioso tal como eres. Tu presencia en este mundo hace la diferencia.",
        "\n\n🌟 Si necesitas hablar con alguien, no dudes en buscar ayuda profesional o confiar en un amigo.",
        "\n\n🕊️ Respira profundo, tómate tu tiempo y recuerda que mereces ser feliz.",
        "\n\n🌻 Pequeños pasos cada día te llevarán lejos. No tengas prisa, ve a tu ritmo.",
      ];

      const motivationIndex = Math.floor(
        Math.random() * motivationalMessages.length
      );
      const supportIndex = Math.floor(Math.random() * supportMessages.length);

      // Verificar índices válidos
      if (
        isNaN(motivationIndex) ||
        motivationIndex < 0 ||
        motivationIndex >= motivationalMessages.length
      ) {
        throw new Error("Índice de mensaje motivacional inválido");
      }

      if (
        isNaN(supportIndex) ||
        supportIndex < 0 ||
        supportIndex >= supportMessages.length
      ) {
        throw new Error("Índice de mensaje de apoyo inválido");
      }

      const randomMotivation = motivationalMessages[motivationIndex];
      const randomSupport = supportMessages[supportIndex];
      const response = randomMotivation + randomSupport;

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          responseType: "motivation",
          motivationIndex,
          supportIndex,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response:
          "❌ Error generando mensaje motivacional. Pero recuerda: ¡eres más fuerte de lo que crees! 💪",
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
