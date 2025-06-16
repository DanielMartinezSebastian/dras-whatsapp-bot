import {
  ConversationState,
  ConversationFlow,
} from "../../types/utils/conversation.types";
import { WhatsAppMessage, User } from "../../types/core";

export interface IContextualHandler {
  startConversation(user: User, flowId: string): Promise<ConversationState>;
  continueConversation(
    state: ConversationState,
    message: WhatsAppMessage
  ): Promise<ConversationState>;
  endConversation(state: ConversationState): Promise<void>;
  getActiveConversations(): Map<string, ConversationState>;
  registerFlow(flow: ConversationFlow): boolean;
}
