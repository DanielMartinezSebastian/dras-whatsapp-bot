import { MessageHandlerStats } from "./message-handler.types";

/**
 * Types for Contextual Handler functionality
 */

/**
 * Conversation context for tracking user interactions
 */
export interface IConversationContext {
  /** First message timestamp */
  firstMessage: Date;
  /** Total message count in conversation */
  messageCount: number;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Topics discussed in conversation */
  topics: string[];
  /** User type classification */
  userType: string;
  /** Whether conversation is ending */
  conversationEnding?: boolean;
}

/**
 * User profile information
 */
export interface IUserProfile {
  /** User phone number */
  phone: string;
  /** Display name */
  displayName?: string;
  /** User preferences */
  preferences?: Record<string, any>;
  /** Last interaction timestamp */
  lastInteraction?: Date;
}

/**
 * Message classification for contextual processing
 */
export interface IMessageClassification {
  /** Message type */
  type: MessageType;
  /** Keywords found in message */
  keywords?: string[];
  /** Question type for QUESTION messages */
  questionType?: QuestionType;
  /** Confidence level (0-1) */
  confidence?: number;
}

/**
 * Types of contextual messages
 */
export type MessageType =
  | "GREETING"
  | "FAREWELL"
  | "QUESTION"
  | "HELP_REQUEST"
  | "CONTEXTUAL"
  | "DEFAULT";

/**
 * Types of questions
 */
export type QuestionType =
  | "what"
  | "how"
  | "when"
  | "where"
  | "why"
  | "who"
  | "general";

/**
 * Time of day classifications
 */
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

/**
 * Response categories for contextual replies
 */
export type ResponseCategory =
  | "greeting_new"
  | "greeting_returning"
  | "help_request"
  | "question_general"
  | "default"
  | "farewell_general"
  | "farewell_frequent"
  | "farewell_night";

/**
 * Response replacements for templating
 */
export interface IResponseReplacements {
  /** User name */
  userName?: string;
  /** Time of day */
  timeOfDay?: TimeOfDay;
  /** Custom replacements */
  [key: string]: string | undefined;
}

/**
 * Responses configuration
 */
export interface IResponses {
  [category: string]: string[];
}

/**
 * Contextual handler statistics - extends base handler stats
 */
export interface IContextualHandlerStats extends MessageHandlerStats {
  /** Number of greetings handled */
  greetings: number;
  /** Number of farewells handled */
  farewells: number;
  /** Number of questions handled */
  questions: number;
  /** Number of help requests handled */
  helpRequests: number;
  /** Number of general messages handled */
  generalMessages: number;
  /** Number of active conversations */
  activeConversations: number;
  /** Number of conversation contexts */
  conversationContexts?: number;
  /** Average messages per conversation */
  averageMessagesPerConversation?: number;
}

/**
 * Saved conversation context data
 */
export interface ISavedConversationData {
  /** Save timestamp */
  savedAt: string;
  /** Conversations array */
  conversations: Array<{
    phone: string;
    context: IConversationContext;
  }>;
}

/**
 * Question type word mappings
 */
export interface IQuestionTypeWords {
  [questionType: string]: string[];
}
