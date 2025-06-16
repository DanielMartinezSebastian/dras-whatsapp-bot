import { TimeCommand } from "../../../bot/commands/contextual/TimeCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

describe("TimeCommand", () => {
  let timeCommand: TimeCommand;
  let baseContext: CommandContext;
  let mockUser: User;

  beforeEach(() => {
    timeCommand = new TimeCommand();

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
        text: "que hora es?",
        content: "que hora es?",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        user: mockUser,
      },
      user: mockUser,
      args: [],
      commandName: "time",
      fullText: "que hora es?",
      isFromAdmin: false,
      timestamp: new Date(),
    };
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = timeCommand.metadata;

      expect(metadata.name).toBe("time");
      expect(metadata.aliases).toContain("hora");
      expect(metadata.category).toBe("contextual");
      expect(metadata.description).toContain("tiempo y horarios");
      expect(metadata.isAdmin).toBe(false);
      expect(metadata.isSensitive).toBe(false);
    });
  });

  describe("matches", () => {
    it("should match time-related questions", () => {
      const timeQuestions = [
        "que hora es?",
        "qué hora es?",
        "hora actual",
        "que fecha es hoy?",
        "que dia es?",
        "fecha actual",
        "hora",
      ];

      timeQuestions.forEach((question) => {
        expect(timeCommand.matches(question)).toBe(true);
      });
    });

    it("should not match non-time related messages", () => {
      const nonTimeMessages = [
        "hola como estas",
        "cuentame un chiste",
        "necesito ayuda",
        "gracias por todo",
      ];

      nonTimeMessages.forEach((message) => {
        expect(timeCommand.matches(message)).toBe(false);
      });
    });
  });

  describe("execute", () => {
    it("should provide current time when asked about time", async () => {
      const result = await timeCommand.execute(baseContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Hora actual:");
      expect(result.response).toContain("Test User");
      expect(result.shouldReply).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.responseType).toBe("time_info");
      expect(result.data?.currentTime).toBeDefined();
    });

    it("should provide date when asked about date", async () => {
      const dateContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: "que fecha es hoy?",
          content: "que fecha es hoy?",
        },
      };

      const result = await timeCommand.execute(dateContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Fecha de hoy:");
      expect(result.response).toContain("Hora actual:");
      expect(result.shouldReply).toBe(true);
      expect(result.data?.currentDate).toBeDefined();
    });

    it("should provide complete time info for general queries", async () => {
      const generalContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: "tiempo",
          content: "tiempo",
        },
      };

      const result = await timeCommand.execute(generalContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Información actual:");
      expect(result.response).toContain("Fecha:");
      expect(result.response).toContain("Hora:");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // Simulate an error by providing invalid context
      const invalidContext = {
        ...baseContext,
        message: {
          ...baseContext.message,
          text: null as any,
        },
      };

      const result = await timeCommand.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain(
        "Error obteniendo información de tiempo"
      );
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBeDefined();
    });

    it("should include execution metadata", async () => {
      const result = await timeCommand.execute(baseContext);

      expect(result.data).toBeDefined();
      expect(result.data?.commandName).toBe("time");
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.data?.timestamp).toBeInstanceOf(Date);
      expect(result.data?.userId).toBe("1");
    });
  });

  describe("time utility methods", () => {
    it("should correctly identify time of day", () => {
      // Mock the Date constructor to test different times
      const originalDate = Date;

      // Test morning (8 AM)
      global.Date = jest.fn(() => ({ getHours: () => 8 })) as any;
      expect((timeCommand as any).getTimeOfDay()).toBe("morning");

      // Test afternoon (2 PM)
      global.Date = jest.fn(() => ({ getHours: () => 14 })) as any;
      expect((timeCommand as any).getTimeOfDay()).toBe("afternoon");

      // Test evening (7 PM)
      global.Date = jest.fn(() => ({ getHours: () => 19 })) as any;
      expect((timeCommand as any).getTimeOfDay()).toBe("evening");

      // Test night (11 PM)
      global.Date = jest.fn(() => ({ getHours: () => 23 })) as any;
      expect((timeCommand as any).getTimeOfDay()).toBe("night");

      // Restore original Date
      global.Date = originalDate;
    });

    it("should provide appropriate greetings for time of day", () => {
      expect((timeCommand as any).getGreetingByTime("morning")).toBe(
        "Buenos días"
      );
      expect((timeCommand as any).getGreetingByTime("afternoon")).toBe(
        "Buenas tardes"
      );
      expect((timeCommand as any).getGreetingByTime("evening")).toBe(
        "Buenas tardes"
      );
      expect((timeCommand as any).getGreetingByTime("night")).toBe(
        "Buenas noches"
      );
      expect((timeCommand as any).getGreetingByTime("unknown")).toBe("Hola");
    });
  });

  describe("canExecute", () => {
    it("should return true for any user", () => {
      expect(timeCommand.canExecute(mockUser)).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate command context successfully", () => {
      const validation = timeCommand.validate(baseContext);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
