// Interface for Message Classifier
import {
  BotMessageClassification,
  BotMessageClassificationType,
  ClassifierPatterns,
  DetailedClassification,
  ClassifierConfig,
} from "../../types/core/message-classifier.types";

export interface IMessageClassifier {
  /**
   * Clasifica un mensaje y determina su tipo y contexto
   */
  classifyMessage(message: string): BotMessageClassification;

  /**
   * Clasificación detallada con análisis completo
   */
  classifyMessageDetailed(message: string): DetailedClassification;

  /**
   * Verifica si el mensaje es un comando
   */
  isCommand(message: string): boolean;

  /**
   * Verifica si el mensaje es un saludo
   */
  isGreeting(message: string): boolean;

  /**
   * Verifica si el mensaje es una despedida
   */
  isFarewell(message: string): boolean;

  /**
   * Verifica si el mensaje es una pregunta
   */
  isQuestion(message: string): boolean;

  /**
   * Verifica si el mensaje necesita ayuda
   */
  needsHelp(message: string): boolean;

  /**
   * Extrae palabras clave contextuales del mensaje
   */
  extractContextualKeywords(message: string): string[];

  /**
   * Analiza el sentimiento del mensaje
   */
  analyzeSentiment(message: string): "positive" | "negative" | "neutral";

  /**
   * Obtiene los patrones de clasificación actuales
   */
  getPatterns(): ClassifierPatterns;

  /**
   * Actualiza la configuración del clasificador
   */
  updateConfig(config: Partial<ClassifierConfig>): void;
}
