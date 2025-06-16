import { IMessageHandler } from "./IMessageHandler";
import {
  IConversationContext,
  IMessageClassification,
  IContextualHandlerStats,
  TimeOfDay,
  ResponseCategory,
  IResponseReplacements,
} from "../../types/handlers/contextual-handler.types";
import { WhatsAppMessage } from "../../types/core/message.types";

/**
 * Interface for Contextual Message Handler
 * Handles greetings, farewells, questions, help requests and general conversation
 */
export interface IContextualMessageHandler extends IMessageHandler {
  /**
   * Handle greeting messages
   * @param message - WhatsApp message
   * @param context - Conversation context
   */
  handleGreeting(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<void>;

  /**
   * Handle farewell messages
   * @param message - WhatsApp message
   * @param context - Conversation context
   */
  handleFarewell(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<void>;

  /**
   * Handle question messages
   * @param message - WhatsApp message
   * @param context - Conversation context
   * @param classification - Message classification
   */
  handleQuestion(
    message: WhatsAppMessage,
    context: IConversationContext | null,
    classification: IMessageClassification
  ): Promise<void>;

  /**
   * Handle help request messages
   * @param message - WhatsApp message
   * @param context - Conversation context
   */
  handleHelpRequest(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<void>;

  /**
   * Handle contextual messages
   * @param message - WhatsApp message
   * @param context - Conversation context
   * @param classification - Message classification
   */
  handleContextualMessage(
    message: WhatsAppMessage,
    context: IConversationContext | null,
    classification: IMessageClassification
  ): Promise<void>;

  /**
   * Handle default messages
   * @param message - WhatsApp message
   * @param context - Conversation context
   */
  handleDefault(
    message: WhatsAppMessage,
    context?: IConversationContext | null
  ): Promise<void>;

  /**
   * Update conversation context for a message
   * @param message - WhatsApp message
   */
  updateConversationContext(message: WhatsAppMessage): void;

  /**
   * Get conversation context for a phone number
   * @param phoneJid - Phone JID
   * @returns Conversation context or null
   */
  getConversationContext(phoneJid: string): IConversationContext | null;

  /**
   * Get user name from phone number
   * @param phoneJid - Phone JID
   * @returns User name or generic name
   */
  getUserName(phoneJid: string): Promise<string>;

  /**
   * Get time of day classification
   * @returns Time of day
   */
  getTimeOfDay(): TimeOfDay;

  /**
   * Get time-based greeting
   * @param timeOfDay - Time of day
   * @returns Appropriate greeting
   */
  getTimeBasedGreeting(timeOfDay: TimeOfDay): string;

  /**
   * Get random response from category
   * @param category - Response category
   * @param replacements - Template replacements
   * @returns Response text
   */
  getRandomResponse(
    category: ResponseCategory | string,
    replacements?: IResponseReplacements
  ): string;

  /**
   * Check if message is bot-related question
   * @param questionText - Question text
   * @returns True if bot-related
   */
  isBotRelatedQuestion(questionText: string): boolean;

  /**
   * Handle bot-related questions
   * @param message - WhatsApp message
   * @param questionText - Question text
   */
  handleBotQuestion(
    message: WhatsAppMessage,
    questionText: string
  ): Promise<void>;

  /**
   * Handle explanation requests
   * @param message - WhatsApp message
   * @param messageText - Message text
   */
  handleExplanationRequest(
    message: WhatsAppMessage,
    messageText: string
  ): Promise<void>;

  /**
   * Handle example requests
   * @param message - WhatsApp message
   * @param messageText - Message text
   */
  handleExampleRequest(
    message: WhatsAppMessage,
    messageText: string
  ): Promise<void>;

  /**
   * Handle information requests
   * @param message - WhatsApp message
   * @param messageText - Message text
   */
  handleInformationRequest(
    message: WhatsAppMessage,
    messageText: string
  ): Promise<void>;

  /**
   * Handle "what" questions
   * @param questionText - Question text
   * @returns Response
   */
  handleWhatQuestion(questionText: string): string;

  /**
   * Handle "how" questions
   * @param questionText - Question text
   * @returns Response
   */
  handleHowQuestion(questionText: string): string;

  /**
   * Handle "when" questions
   * @param questionText - Question text
   * @returns Response
   */
  handleWhenQuestion(questionText: string): string;

  /**
   * Handle "where" questions
   * @param questionText - Question text
   * @returns Response
   */
  handleWhereQuestion(questionText: string): string;

  /**
   * Handle "why" questions
   * @param questionText - Question text
   * @returns Response
   */
  handleWhyQuestion(questionText: string): string;

  /**
   * Handle "who" questions
   * @param questionText - Question text
   * @returns Response
   */
  handleWhoQuestion(questionText: string): string;

  /**
   * Handle contextual errors
   * @param message - WhatsApp message
   * @param error - Error object
   */
  handleContextualError(message: WhatsAppMessage, error: Error): Promise<void>;

  /**
   * Load conversation context from file
   */
  loadConversationContext(): Promise<void>;

  /**
   * Save conversation context to file
   */
  saveConversationContext(): Promise<void>;

  /**
   * Clean up old contexts
   */
  cleanupOldContexts(): void;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;

  /**
   * Get handler statistics
   * @returns Statistics object
   */
  getStats(): IContextualHandlerStats;
}
