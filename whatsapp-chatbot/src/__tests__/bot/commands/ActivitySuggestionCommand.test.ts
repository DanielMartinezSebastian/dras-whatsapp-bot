import { ActivitySuggestionCommand } from "../../../bot/commands/contextual/ActivitySuggestionCommand";
import { CommandContext } from "../../../types/commands";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe("ActivitySuggestionCommand", () => {
  let activityCommand: ActivitySuggestionCommand;
  let baseContext: CommandContext;

  beforeEach(() => {
    activityCommand = new ActivitySuggestionCommand();
    baseContext = {
      message: {
        id: "test-message-1",
        messageId: "test-message-1",
        chatId: "test-chat-1",
        chatJid: "test-chat-1@g.us",
        chatName: "Test Chat",
        sender: "1234567890@s.whatsapp.net",
        senderPhone: "1234567890",
        senderName: "Test User",
        text: "estoy aburrido",
        content: "estoy aburrido",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      },
      args: [],
      fullText: "estoy aburrido",
      commandName: "activitySuggestion",
      isFromAdmin: false,
      timestamp: new Date(),
      user: {
        id: 123,
        whatsapp_jid: "1234567890@s.whatsapp.net",
        phone_number: "1234567890",
        display_name: "Test User",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 5,
        is_active: true,
      },
    };
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = activityCommand.metadata;

      expect(metadata.name).toBe("activitySuggestion");
      expect(metadata.aliases).toContain("actividad");
      expect(metadata.aliases).toContain("sugerencia");
      expect(metadata.aliases).toContain("que hacer");
      expect(metadata.category).toBe("contextual");
      expect(metadata.description).toContain("actividades y entretenimiento");
      expect(metadata.isAdmin).toBe(false);
      expect(metadata.isSensitive).toBe(false);
    });
  });

  describe("matches", () => {
    it("should match boredom expressions", () => {
      const boredMessages = [
        "estoy aburrido",
        "estoy aburrida",
        "me aburro",
        "que puedo hacer?",
        "no se que hacer",
        "sugiere algo",
        "que hago ahora",
      ];

      boredMessages.forEach((message) => {
        expect(activityCommand.matches(message)).toBe(true);
      });
    });

    it("should match activity requests", () => {
      const activityRequests = [
        "que hacer en mi tiempo libre",
        "necesito entretenimiento",
        "ideas para diversión",
        "actividades recomendadas",
        "planes para hoy",
        "hacer algo divertido",
      ];

      activityRequests.forEach((request) => {
        expect(activityCommand.matches(request)).toBe(true);
      });
    });

    it("should not match when user says they are not bored", () => {
      const notBoredMessages = [
        "no estoy aburrido",
        "ya no estoy aburrido",
        "no me aburro nunca",
      ];

      notBoredMessages.forEach((message) => {
        expect(activityCommand.matches(message)).toBe(false);
      });
    });

    it("should not match unrelated messages", () => {
      const unrelatedMessages = [
        "hola como estas",
        "que hora es",
        "cuéntame un chiste",
        "necesito ayuda técnica",
      ];

      unrelatedMessages.forEach((message) => {
        expect(activityCommand.matches(message)).toBe(false);
      });
    });
  });

  describe("execute", () => {
    it("should provide bored activities for boredom messages", async () => {
      const boredContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: "estoy aburrido",
          content: "estoy aburrido",
        },
      };

      const result = await activityCommand.execute(boredContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toContain("¡Te entiendo!");
      expect(result.response).toContain("ideas");
      expect(result.data?.responseType).toBe("bored_activities");
      expect(typeof result.data?.activityIndex).toBe("number");
    });

    it("should provide free time activities for general requests", async () => {
      const freeTimeContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: "que hacer en mi tiempo libre",
          content: "que hacer en mi tiempo libre",
        },
      };

      const result = await activityCommand.execute(freeTimeContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toContain("categorías de actividades");
      expect(result.data?.responseType).toBe("free_time_activities");
      expect(typeof result.data?.categoryIndex).toBe("number");
    });

    it("should provide entertainment suggestions", async () => {
      const entertainmentContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: "necesito entretenimiento",
          content: "necesito entretenimiento",
        },
      };

      const result = await activityCommand.execute(entertainmentContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toContain("entretenimiento");
      expect(result.data?.responseType).toBe("entertainment");
      expect(typeof result.data?.entertainmentIndex).toBe("number");
    });

    it("should provide general suggestions for other requests", async () => {
      const generalContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: "sugiere algo",
          content: "sugiere algo",
        },
      };

      const result = await activityCommand.execute(generalContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.data?.responseType).toBe("general_suggestions");
      expect(typeof result.data?.generalIndex).toBe("number");
    });

    it("should return different suggestions on multiple calls", async () => {
      const results: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await activityCommand.execute(baseContext);
        if (result.response) {
          results.push(result.response);
        }
      }

      // Should have some variety (allowing for possibility of duplicates due to randomness)
      const uniqueResponses = new Set(results);
      expect(uniqueResponses.size).toBeGreaterThan(1);
    });

    it("should handle errors gracefully", async () => {
      // Force an error by mocking Math.random to return invalid value
      const originalRandom = Math.random;
      Math.random = jest.fn(() => NaN);

      const result = await activityCommand.execute(baseContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain("Error generando sugerencias");
      expect(result.response).toContain("lee algo interesante"); // Should include backup suggestion
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBeDefined();

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it("should include execution time in data", async () => {
      const result = await activityCommand.execute(baseContext);

      expect(result.data?.executionTime).toBeDefined();
      expect(typeof result.data?.executionTime).toBe("number");
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should work without user context", async () => {
      const contextWithoutUser = {
        ...baseContext,
        user: undefined,
      };

      const result = await activityCommand.execute(contextWithoutUser);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.data?.userId).toBeUndefined();
    });

    it("should include appropriate emojis in responses", async () => {
      const result = await activityCommand.execute(baseContext);

      // Should contain emojis that make the response more engaging
      expect(result.response).toMatch(
        /[📚🎵🚶‍♂️🧘‍♀️📞🎮🍳📹✍️🌟🏃‍♂️🧠👥🛠️🎬🎮🎵🌐💡⚡😌🧠]/
      );
    });
  });
});
