import { JokeCommand } from "../../../bot/commands/contextual/JokeCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

describe("JokeCommand", () => {
  let jokeCommand: JokeCommand;
  let baseContext: CommandContext;
  let mockUser: User;

  beforeEach(() => {
    jokeCommand = new JokeCommand();

    mockUser = {
      id: 1,
      whatsapp_jid: "123456789@s.whatsapp.net",
      phone_number: "123456789",
      display_name: "Test User",
      user_type: "customer",
      created_at: new Date(),
      updated_at: new Date(),
      total_messages: 0,
      is_active: true,
    };

    baseContext = {
      message: {
        id: "test-msg-1",
        messageId: "test-msg-1",
        chatId: "test-chat",
        chatJid: "test-chat@g.us",
        chatName: "Test Chat",
        sender: mockUser.whatsapp_jid,
        senderPhone: mockUser.phone_number,
        senderName: mockUser.display_name,
        text: "cuentame un chiste",
        content: "cuentame un chiste",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        user: mockUser,
      },
      user: mockUser,
      args: [],
      commandName: "joke",
      fullText: "cuentame un chiste",
      isFromAdmin: false,
      timestamp: new Date(),
    };
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = jokeCommand.metadata;

      expect(metadata.name).toBe("joke");
      expect(metadata.aliases).toContain("chiste");
      expect(metadata.aliases).toContain("humor");
      expect(metadata.category).toBe("contextual");
      expect(metadata.description).toContain("chistes y humor");
      expect(metadata.isAdmin).toBe(false);
      expect(metadata.isSensitive).toBe(false);
    });
  });

  describe("matches", () => {
    it("should match joke-related requests", () => {
      const jokeRequests = [
        "cuentame un chiste",
        "hazme reir",
        "algo gracioso",
        "estoy aburrido",
        "quiero humor",
        "una broma",
        "algo divertido",
        "entretenme",
      ];

      jokeRequests.forEach((request) => {
        expect(jokeCommand.matches(request)).toBe(true);
      });
    });

    it("should not match when user says they are no longer bored", () => {
      const negativeRequests = [
        "ya no estoy aburrido",
        "no estoy aburrido",
        "ya no necesito chistes",
      ];

      negativeRequests.forEach((request) => {
        expect(jokeCommand.matches(request)).toBe(false);
      });
    });

    it("should not match non-humor related messages", () => {
      const nonHumorMessages = [
        "hola como estas",
        "que hora es",
        "necesito ayuda",
        "gracias por todo",
        "informacion del sistema",
      ];

      nonHumorMessages.forEach((message) => {
        expect(jokeCommand.matches(message)).toBe(false);
      });
    });
  });

  describe("execute", () => {
    it("should provide a joke with follow-up", async () => {
      const result = await jokeCommand.execute(baseContext);

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response!.length).toBeGreaterThan(10);
      expect(result.shouldReply).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.responseType).toBe("joke");
    });

    it("should include execution metadata", async () => {
      const result = await jokeCommand.execute(baseContext);

      expect(result.data).toBeDefined();
      expect(result.data?.commandName).toBe("joke");
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.data?.timestamp).toBeInstanceOf(Date);
      expect(result.data?.userId).toBe("1");
      expect(typeof result.data?.jokeIndex).toBe("number");
    });

    it("should provide different jokes on multiple calls", async () => {
      const results = await Promise.all([
        jokeCommand.execute(baseContext),
        jokeCommand.execute(baseContext),
        jokeCommand.execute(baseContext),
        jokeCommand.execute(baseContext),
        jokeCommand.execute(baseContext),
      ]);

      // Check that all calls succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
      });

      // Check that we get some variety (not all the same)
      const responses = results.map((r) => r.response);
      const uniqueResponses = new Set(responses);

      // With 5 calls and multiple jokes available, we should get some variety
      // (allowing for possibility of duplicates due to randomness)
      expect(uniqueResponses.size).toBeGreaterThan(1);
    });

    it("should handle errors gracefully", async () => {
      // Force an error by mocking Math.random to return invalid value
      const originalRandom = Math.random;
      Math.random = jest.fn(() => NaN);

      const result = await jokeCommand.execute(baseContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain("Error generando chiste");
      expect(result.response).toContain("humor!"); // Should include backup joke
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBeDefined();

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it("should work with different types of humor requests", async () => {
      const humorRequests = [
        "estoy aburrido",
        "hazme reir",
        "algo gracioso",
        "humor",
      ];

      for (const request of humorRequests) {
        const context = {
          ...baseContext,
          message: {
            ...baseContext.message,
            text: request,
            content: request,
          },
        };

        const result = await jokeCommand.execute(context);
        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
      }
    });
  });

  describe("canExecute", () => {
    it("should return true for any user", () => {
      expect(jokeCommand.canExecute(mockUser)).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate command context successfully", () => {
      const validation = jokeCommand.validate(baseContext);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
