import type { WhatsAppMessage, User } from "../core";

export interface ConversationState {
  userId: string;
  currentContext?: string;
  awaitingInput?: boolean;
  inputType?: "text" | "choice" | "confirmation";
  lastInteraction: Date;
  data?: Record<string, any>;
}

export interface ConversationFlow {
  id: string;
  name: string;
  steps: ConversationStep[];
  currentStep: number;
  completed: boolean;
}

export interface ConversationStep {
  id: string;
  type: "message" | "input" | "choice" | "action";
  content?: string;
  options?: string[];
  validation?: (input: string) => boolean;
  action?: (context: any) => Promise<void>;
}
