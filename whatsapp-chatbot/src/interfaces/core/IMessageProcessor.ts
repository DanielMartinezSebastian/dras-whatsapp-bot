import { WhatsAppMessage, MessageClassification } from "../../types/core";

export interface IMessageProcessor {
  classifyMessage(message: WhatsAppMessage): Promise<MessageClassification>;
  extractCommand(message: WhatsAppMessage): string | null;
  isGreeting(message: WhatsAppMessage): boolean;
  isFarewell(message: WhatsAppMessage): boolean;
  isQuestion(message: WhatsAppMessage): boolean;
  isHelpRequest(message: WhatsAppMessage): boolean;
}
