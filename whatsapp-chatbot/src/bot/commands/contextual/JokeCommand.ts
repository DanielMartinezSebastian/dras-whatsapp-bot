import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";

/**
 * Comando contextual para compartir chistes y humor ligero
 */
export class JokeCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "joke",
      aliases: ["chiste", "humor", "broma"],
      description: "Comparte chistes y humor ligero",
      syntax: "cuentame un chiste, hazme reir, algo gracioso",
      category: "contextual",
      permissions: ["user"],
      cooldown: 3000,
      examples: [
        "cuentame un chiste",
        "hazme reir",
        "algo gracioso",
        "estoy aburrido",
      ],
      isAdmin: false,
      isSensitive: false,
    };
  }

  /**
   * Verifica si el mensaje solicita un chiste o humor
   */
  matches(messageText: string): boolean {
    const text = messageText.toLowerCase();

    // No capturar si ya no está aburrido o si es negación
    if (
      text.includes("ya no estoy aburrido") ||
      text.includes("no estoy aburrido") ||
      text.includes("ya no necesito")
    ) {
      return false;
    }

    const humorKeywords = [
      "chiste",
      "gracioso",
      "divertido",
      "humor",
      "broma",
      "reir",
      "risa",
      "entretenme",
      "anime",
      "sonreir",
      "alegre",
      "chistoso",
      "comico",
      "cómico",
    ];

    return (
      humorKeywords.some((keyword) => text.includes(keyword)) ||
      (text.includes("algo") &&
        (text.includes("gracioso") || text.includes("divertido"))) ||
      (text.includes("hazme") && text.includes("reir")) ||
      (text.includes("cuentame") && text.includes("chiste")) ||
      (text.includes("estoy aburrido") && !text.includes("ya no"))
    );
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const jokes = [
        "😄 ¿Por qué los pájaros vuelan hacia el sur en invierno? Porque es muy lejos para caminar. 🐦",
        "🤖 ¿Cómo se llama un robot que toma la ruta más larga? R2-Desvío.",
        "😂 ¿Qué le dice un semáforo a otro? No me mires que me estoy cambiando. 🚦",
        "🍕 ¿Por qué la pizza fue al psicólogo? Porque tenía problemas de autoestima... se sentía muy plana.",
        "📱 ¿Cuál es el colmo de un WhatsApp? Que le llegue un mensaje de texto. 📨",
        "🤓 ¿Por qué los programadores prefieren el modo oscuro? Porque la luz atrae a los bugs. 🐛",
        "🐟 ¿Cómo se llama el pez más negativo? Pes-imista.",
        "⚡ ¿Qué hace una abeja en el gimnasio? Zum-ba. 🐝",
        "🎸 ¿Por qué las guitarras van al dentista? Porque tienen muchas cuerdas. 🦷",
        "🌮 ¿Cuál es el taco favorito de los programadores? El tac-overflow.",
        "💻 ¿Por qué los ordenadores nunca se sienten solos? Porque siempre están conectados a la red.",
        "🚗 ¿Qué le dice un coche a otro coche? ¡Qué motor más bonito tienes!",
        "🎭 ¿Por qué los actores siempre están felices? Porque viven de la representación.",
        "📚 ¿Cuál es el libro favorito de los electricistas? El manual de corriente alterna.",
        "🏠 ¿Por qué las casas nunca se quejan? Porque tienen mucha paciencia estructural.",
      ];

      const followUps = [
        "\n\n¿Te gustó? ¿Quieres que te cuente otro? 😊",
        "\n\n¡Espero haberte hecho sonreír! 😄",
        "\n\nSi necesitas más humor, solo pídelo. 😃",
        "\n\n¿Te animé el día? ¡Me alegra ayudar! 🌟",
        "\n\n¡Espero que te haya arrancado una sonrisa! 😁",
        "\n\n¿Necesitas más entretenimiento? ¡Estoy aquí! 🎉",
      ];

      const randomIndex = Math.floor(Math.random() * jokes.length);
      const followUpIndex = Math.floor(Math.random() * followUps.length);

      // Verificar índices válidos
      if (
        isNaN(randomIndex) ||
        randomIndex < 0 ||
        randomIndex >= jokes.length
      ) {
        throw new Error("Índice de chiste inválido");
      }

      if (
        isNaN(followUpIndex) ||
        followUpIndex < 0 ||
        followUpIndex >= followUps.length
      ) {
        throw new Error("Índice de seguimiento inválido");
      }

      const randomJoke = jokes[randomIndex];
      const followUp = followUps[followUpIndex];
      const response = randomJoke + followUp;

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          responseType: "joke",
          jokeIndex: randomIndex,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response:
          "❌ Error generando chiste. ¡Pero aquí va uno rápido: ¿Por qué falló el comando? Porque no tenía humor! 😅",
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
