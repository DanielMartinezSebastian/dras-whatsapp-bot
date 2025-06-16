import { IMessageClassifier } from "../../interfaces/core/IMessageClassifier";
import {
  BotMessageClassification,
  BotMessageClassificationType,
  ClassifierPatterns,
  DetailedClassification,
  ClassifierConfig,
  ClassificationContext,
} from "../../types/core/message-classifier.types";
import { WhatsAppMessage } from "../../types/core/message.types";
import logger from "../../utils/logger";

/**
 * Clasificador de mensajes que determina el tipo y contexto
 * Separa la lógica de clasificación del procesamiento
 */
export class MessageClassifier implements IMessageClassifier {
  private patterns!: ClassifierPatterns;
  private contextualKeywords!: string[];
  private config: ClassifierConfig;

  constructor(config?: Partial<ClassifierConfig>) {
    this.config = {
      enableEmotionalAnalysis: true,
      enableContextualKeywords: true,
      confidenceThreshold: 0.7,
      maxKeywords: 10,
      ...config,
    };

    this.initializePatterns();
    this.initializeContextualKeywords();
  }

  private initializePatterns(): void {
    this.patterns = {
      commandPatterns: {
        admin:
          /^\/(admin|sudo|root|system|debug|log|restart|shutdown|reset|config)/i,
        user: /^\/(help|info|estado|profile|usertype|permisos|contexto|ping|start|conversationstate|antispam)/i,
        system: /^\/(status|health|version|uptime)/i,
      },
      greetingPatterns:
        /^(hola|hi|hello|buenas|hey|saludos|que tal|buenos días|buenas tardes|buenas noches)/i,
      farewellPatterns:
        /^(adiós|adios|bye\s*bye|bye|goodbye|chao|chau|ciao|hasta luego|hasta la vista|nos vemos|me voy|hasta pronto|que tengas buen día|que tengas buena noche|que descanses|hasta mañana|see you)(\s|$|!|\.|\,)|^hasta(\s|$|!|\.|\,)(?!.*que)/i,
      questionPatterns:
        /^(qué|que|como|cómo|cuál|cual|cuándo|cuando|dónde|donde|por qué|porque|quién|quien)\s|\?$/i,
      helpPatterns:
        /^(help|ayuda|auxilio|socorro|no sé|no se|no entiendo|no comprendo|comandos|opciones)|necesito\s*(ayuda|help)/i,
    };
  }

  private initializeContextualKeywords(): void {
    this.contextualKeywords = [
      // Explicaciones y información
      "explicar",
      "explicame",
      "dime",
      "cuéntame",
      "información",
      "informacion",
      "detalles",
      "más",
      "mas",
      "ejemplo",
      "ejemplos",
      "tutorial",

      // Palabras emocionales
      "triste",
      "aburrido",
      "aburrida",
      "aburro",
      "deprimido",
      "deprimida",
      "solo",
      "sola",
      "soledad",
      "cansado",
      "cansada",
      "estresado",
      "estresada",
      "ansioso",
      "ansiosa",
      "feliz",
      "contento",
      "contenta",
      "alegre",
      "motivado",
      "motivada",

      // Palabras de agradecimiento
      "gracias",
      "thank",
      "thanks",
      "agradezco",
      "agradecimiento",

      // Actividades y tiempo
      "hacer",
      "tiempo",
      "clima",
      "lluvia",
      "sol",
      "nublado",
      "calor",
      "frio",
      "frío",
      "temperatura",

      // Conversación general
      "charlar",
      "conversar",
      "hablar",
      "platicar",
      "contar",
      "chiste",
      "broma",
      "gracioso",
      "divertido",
      "entretenido",
      "actividad",
      "sugerencia",
      "recomendación",
      "consejo",
    ];
  }

  /**
   * Clasifica un mensaje y determina su tipo y contexto
   */
  classifyMessage(message: string): BotMessageClassification {
    const text = message.trim().toLowerCase();

    if (!text) {
      return {
        type: "unknown",
        confidence: 0,
        patterns: [],
        context: this.createBasicContext(text),
      };
    }

    // Verificar comandos primero
    if (this.isCommand(text)) {
      return {
        type: "command",
        confidence: 0.9,
        patterns: ["command"],
        context: this.createMessageContext(text),
      };
    }

    // Verificar saludos
    if (this.isGreeting(text)) {
      return {
        type: "greeting",
        confidence: 0.85,
        patterns: ["greeting"],
        context: this.createMessageContext(text),
      };
    }

    // Verificar despedidas
    if (this.isFarewell(text)) {
      return {
        type: "farewell",
        confidence: 0.85,
        patterns: ["farewell"],
        context: this.createMessageContext(text),
      };
    }

    // Verificar preguntas
    if (this.isQuestion(text)) {
      return {
        type: "question",
        confidence: 0.8,
        patterns: ["question"],
        context: this.createMessageContext(text),
      };
    }

    // Verificar solicitudes de ayuda
    if (this.needsHelp(text)) {
      return {
        type: "help",
        confidence: 0.8,
        patterns: ["help"],
        context: this.createMessageContext(text),
      };
    }

    // Si tiene palabras contextuales, clasificar como contextual
    const keywords = this.extractContextualKeywords(text);
    if (keywords.length > 0) {
      return {
        type: "contextual",
        confidence: 0.7,
        patterns: keywords,
        context: this.createMessageContext(text),
      };
    }

    // Mensaje no clasificado
    return {
      type: "unknown",
      confidence: 0.5,
      patterns: [],
      context: this.createMessageContext(text),
    };
  }

  /**
   * Clasificación detallada con análisis completo
   */
  classifyMessageDetailed(message: string): DetailedClassification {
    const basicClassification = this.classifyMessage(message);
    const text = message.trim().toLowerCase();

    const secondaryTypes: BotMessageClassificationType[] = [];
    const matchedPatterns: string[] = [...basicClassification.patterns];

    // Verificar tipos secundarios
    if (basicClassification.type !== "greeting" && this.isGreeting(text)) {
      secondaryTypes.push("greeting");
    }
    if (basicClassification.type !== "question" && this.isQuestion(text)) {
      secondaryTypes.push("question");
    }
    if (basicClassification.type !== "help" && this.needsHelp(text)) {
      secondaryTypes.push("help");
    }

    const keywords = this.extractContextualKeywords(text);
    const context: ClassificationContext = {
      hasEmotionalKeywords: this.hasEmotionalKeywords(text),
      hasTimeKeywords: this.hasTimeKeywords(text),
      hasConversationKeywords: this.hasConversationKeywords(text),
      keywordCategories: this.categorizeKeywords(keywords),
    };

    return {
      primaryType: basicClassification.type,
      secondaryTypes,
      confidence: basicClassification.confidence,
      matchedPatterns,
      context,
      suggestedResponse: this.generateSuggestedResponse(
        basicClassification.type,
        context
      ),
    };
  }

  /**
   * Verifica si el mensaje es un comando
   */
  isCommand(message: string): boolean {
    const text = message.trim();
    return text.startsWith("/") || text.startsWith("!");
  }

  /**
   * Verifica si el mensaje es un saludo
   */
  isGreeting(message: string): boolean {
    return this.patterns.greetingPatterns.test(message.trim());
  }

  /**
   * Verifica si el mensaje es una despedida
   */
  isFarewell(message: string): boolean {
    return this.patterns.farewellPatterns.test(message.trim());
  }

  /**
   * Verifica si el mensaje es una pregunta
   */
  isQuestion(message: string): boolean {
    return this.patterns.questionPatterns.test(message.trim());
  }

  /**
   * Verifica si el mensaje necesita ayuda
   */
  needsHelp(message: string): boolean {
    return this.patterns.helpPatterns.test(message.trim());
  }

  /**
   * Extrae palabras clave contextuales del mensaje
   */
  extractContextualKeywords(message: string): string[] {
    if (!this.config.enableContextualKeywords) {
      return [];
    }

    const text = message.toLowerCase();
    const foundKeywords = this.contextualKeywords.filter((keyword) =>
      text.includes(keyword)
    );

    return foundKeywords.slice(0, this.config.maxKeywords);
  }

  /**
   * Analiza el sentimiento del mensaje
   */
  analyzeSentiment(message: string): "positive" | "negative" | "neutral" {
    if (!this.config.enableEmotionalAnalysis) {
      return "neutral";
    }

    const text = message.toLowerCase();

    const positiveWords = [
      "feliz",
      "contento",
      "alegre",
      "motivado",
      "gracias",
      "bien",
      "excelente",
      "genial",
    ];
    const negativeWords = [
      "triste",
      "aburrido",
      "deprimido",
      "solo",
      "cansado",
      "estresado",
      "ansioso",
      "mal",
    ];

    const positiveCount = positiveWords.filter((word) =>
      text.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      text.includes(word)
    ).length;

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  /**
   * Obtiene los patrones de clasificación actuales
   */
  getPatterns(): ClassifierPatterns {
    return { ...this.patterns };
  }

  /**
   * Actualiza la configuración del clasificador
   */
  updateConfig(config: Partial<ClassifierConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info(`📝 Configuración del clasificador actualizada`, config);
  }

  // Métodos privados auxiliares

  private createBasicContext(text: string) {
    return {
      isCommand: this.isCommand(text),
      isGreeting: false,
      isFarewell: false,
      isQuestion: false,
      needsHelp: false,
      hasEmotionalContent: false,
      keywords: [],
      sentiment: "neutral" as const,
    };
  }

  private createMessageContext(text: string) {
    return {
      isCommand: this.isCommand(text),
      isGreeting: this.isGreeting(text),
      isFarewell: this.isFarewell(text),
      isQuestion: this.isQuestion(text),
      needsHelp: this.needsHelp(text),
      hasEmotionalContent: this.hasEmotionalKeywords(text),
      keywords: this.extractContextualKeywords(text),
      sentiment: this.analyzeSentiment(text),
    };
  }

  private hasEmotionalKeywords(text: string): boolean {
    const emotionalWords = [
      "triste",
      "feliz",
      "aburrido",
      "contento",
      "deprimido",
      "alegre",
      "solo",
      "motivado",
    ];
    return emotionalWords.some((word) => text.toLowerCase().includes(word));
  }

  private hasTimeKeywords(text: string): boolean {
    const timeWords = [
      "tiempo",
      "hora",
      "día",
      "noche",
      "mañana",
      "tarde",
      "cuando",
    ];
    return timeWords.some((word) => text.toLowerCase().includes(word));
  }

  private hasConversationKeywords(text: string): boolean {
    const conversationWords = [
      "charlar",
      "conversar",
      "hablar",
      "platicar",
      "contar",
    ];
    return conversationWords.some((word) => text.toLowerCase().includes(word));
  }

  private categorizeKeywords(keywords: string[]): string[] {
    const categories: string[] = [];

    const emotionalWords = ["triste", "feliz", "aburrido", "contento"];
    const informationalWords = [
      "explicar",
      "información",
      "detalles",
      "ejemplo",
    ];
    const socialWords = ["charlar", "conversar", "hablar"];

    if (keywords.some((k) => emotionalWords.includes(k)))
      categories.push("emotional");
    if (keywords.some((k) => informationalWords.includes(k)))
      categories.push("informational");
    if (keywords.some((k) => socialWords.includes(k)))
      categories.push("social");

    return categories;
  }

  private generateSuggestedResponse(
    type: BotMessageClassificationType,
    context: ClassificationContext
  ): string | undefined {
    switch (type) {
      case "greeting":
        return "¡Hola! ¿En qué puedo ayudarte?";
      case "farewell":
        return "¡Hasta luego! Que tengas un buen día.";
      case "help":
        return "Estoy aquí para ayudarte. Puedes usar /help para ver los comandos disponibles.";
      case "question":
        if (context.keywordCategories.includes("informational")) {
          return "Te ayudo con esa información. ¿Podrías ser más específico?";
        }
        return "Interesante pregunta. Déjame ayudarte con eso.";
      default:
        return undefined;
    }
  }
}
