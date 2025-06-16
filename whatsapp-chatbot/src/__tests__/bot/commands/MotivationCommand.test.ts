import { MotivationCommand } from "../../../bot/commands/contextual/MotivationCommand";
import { CommandContext } from "../../../types/commands";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe("MotivationCommand", () => {
  let motivationCommand: MotivationCommand;
  let baseContext: CommandContext;

  beforeEach(() => {
    motivationCommand = new MotivationCommand();
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
        text: "estoy triste",
        content: "estoy triste",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      },
      args: [],
      fullText: "estoy triste",
      commandName: "motivation",
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
      const metadata = motivationCommand.metadata;

      expect(metadata.name).toBe("motivation");
      expect(metadata.aliases).toContain("motivacion");
      expect(metadata.aliases).toContain("animo");
      expect(metadata.aliases).toContain("apoyo");
      expect(metadata.category).toBe("contextual");
      expect(metadata.description).toContain("motivación y apoyo");
      expect(metadata.isAdmin).toBe(false);
      expect(metadata.isSensitive).toBe(false);
    });
  });

  describe("matches", () => {
    it("should match sadness expressions", () => {
      const sadnessRequests = [
        "estoy triste",
        "me siento mal",
        "estoy deprimido",
        "me siento solo",
        "tengo problemas",
        "estoy desanimado",
        "necesito ayuda",
        "siento dolor",
        "estoy preocupado",
        "tengo ansiedad",
      ];

      sadnessRequests.forEach((request) => {
        expect(motivationCommand.matches(request)).toBe(true);
      });
    });

    it("should match support requests", () => {
      const supportRequests = [
        "necesito que me ayudes",
        "quiero que me escuches",
        "puedes ayudarme estoy mal",
        "me siento triste necesito hablar",
        "me ayudas por favor",
      ];

      supportRequests.forEach((request) => {
        expect(motivationCommand.matches(request)).toBe(true);
      });
    });

    it("should not match unrelated messages", () => {
      const unrelatedMessages = [
        "hola como estas",
        "que tiempo hace",
        "cuéntame un chiste",
        "qué hora es",
        "información del bot",
      ];

      unrelatedMessages.forEach((message) => {
        expect(motivationCommand.matches(message)).toBe(false);
      });
    });
  });

  describe("execute", () => {
    it("should return a motivational message successfully", async () => {
      const result = await motivationCommand.execute(baseContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.response!.length).toBeGreaterThan(50); // Should be a substantial message
      expect(result.data).toBeDefined();
      expect(result.data?.commandName).toBe("motivation");
      expect(result.data?.responseType).toBe("motivation");
      expect(result.data?.userId).toBe("123");
      expect(typeof result.data?.motivationIndex).toBe("number");
      expect(typeof result.data?.supportIndex).toBe("number");
    });

    it("should include both motivational and support messages", async () => {
      const result = await motivationCommand.execute(baseContext);

      // Should contain emoji indicators of both types of messages
      expect(result.response).toMatch(/🌟|💪|🌈|✨|🦋|🌱|🔥|🌅|💎|🌸/); // Motivational emojis
      expect(result.response).toMatch(/🤗|💝|🌟|🕊️|🌻/); // Support emojis
    });

    it("should return different messages on multiple calls", async () => {
      const results: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await motivationCommand.execute(baseContext);
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

      const result = await motivationCommand.execute(baseContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain("Error generando mensaje motivacional");
      expect(result.response).toContain("más fuerte de lo que crees"); // Should include backup message
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBeDefined();

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it("should include execution time in data", async () => {
      const result = await motivationCommand.execute(baseContext);

      expect(result.data?.executionTime).toBeDefined();
      expect(typeof result.data?.executionTime).toBe("number");
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should work without user context", async () => {
      const contextWithoutUser = {
        ...baseContext,
        user: undefined,
      };

      const result = await motivationCommand.execute(contextWithoutUser);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.data?.userId).toBeUndefined();
    });
  });
});
