export interface WhatsAppMessage {
  id: string;
  messageId: string;
  chatId: string;
  chatJid: string;
  chatName?: string;
  sender: string;
  senderPhone: string;
  senderName?: string;
  text: string;
  content: string;
  timestamp: string;
  mediaType?: MediaType;
  filename?: string;
  isFromMe: boolean;
  fromMe: boolean;
  type?: MessageType;
  user?: User;
}

export type MediaType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker";
export type MessageType =
  | "COMMAND"
  | "GREETING"
  | "FAREWELL"
  | "QUESTION"
  | "HELP_REQUEST"
  | "GENERAL";

export interface MessageClassification {
  type: MessageType;
  command?: string;
  confidence: number;
  context?: Record<string, any>;
}

export interface MessageContext {
  messageCount: number;
  firstMessage: boolean;
  lastMessageTime?: Date;
  conversationState?: ConversationState;
}

// Import User and ConversationState from other files
import type { User } from "./user.types";
import type { ConversationState } from "../utils/conversation.types";
