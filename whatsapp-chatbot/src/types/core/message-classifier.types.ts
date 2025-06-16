// Message Classifier Types
import { BotMessageClassificationType } from "./bot-processor.types";

export interface ClassifierPatterns {
  commandPatterns: {
    admin: RegExp;
    user: RegExp;
    system: RegExp;
  };
  greetingPatterns: RegExp;
  farewellPatterns: RegExp;
  questionPatterns: RegExp;
  helpPatterns: RegExp;
}

export interface ClassificationContext {
  hasEmotionalKeywords: boolean;
  hasTimeKeywords: boolean;
  hasConversationKeywords: boolean;
  keywordCategories: string[];
}

export interface DetailedClassification {
  primaryType: BotMessageClassificationType;
  secondaryTypes: BotMessageClassificationType[];
  confidence: number;
  matchedPatterns: string[];
  context: ClassificationContext;
  suggestedResponse?: string;
}

export interface ClassifierConfig {
  enableEmotionalAnalysis: boolean;
  enableContextualKeywords: boolean;
  confidenceThreshold: number;
  maxKeywords: number;
}

// Re-export from bot-processor for convenience
export type {
  BotMessageClassification,
  BotMessageClassificationType,
  BotMessageContext,
} from "./bot-processor.types";
