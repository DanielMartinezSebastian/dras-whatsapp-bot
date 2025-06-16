import { PingCommand } from "../../../bot/commands/basic/PingCommand";
import type { CommandContext, CommandResult } from "../../../types/commands";
import type { WhatsAppMessage, User } from "../../../types/core";

describe("PingCommand", () => {
  let pingCommand: PingCommand;
  let mockContext: CommandContext;

  beforeEach(() => {
    pingCommand = new PingCommand();

    const mockUser: User = {
      id: 1,
      whatsapp_jid: "1234567890@s.whatsapp.net",
      phone_number: "1234567890",
      display_name: "Test User",
      user_type: "customer",
      created_at: new Date(),
      updated_at: new Date(),
      total_messages: 5,
      is_active: true,
    };

    const mockMessage: WhatsAppMessage = {
      id: "msg1",
      messageId: "msg1",
      chatId: "chat1",
      chatJid: "1234567890@s.whatsapp.net",
      sender: "1234567890@s.whatsapp.net",
      senderPhone: "1234567890",
      text: "/ping",
      content: "/ping",
      timestamp: new Date().toISOString(),
      isFromMe: false,
      fromMe: false,
    };

    mockContext = {
      message: mockMessage,
      user: mockUser,
      args: [],
      fullText: "/ping",
      commandName: "ping",
      isFromAdmin: false,
      timestamp: new Date(),
    };
  });

  describe("Metadata", () => {
    test("should have correct metadata", () => {
      const metadata = pingCommand.metadata;

      expect(metadata.name).toBe("ping");
      expect(metadata.aliases).toContain("test");
      expect(metadata.aliases).toContain("connection");
      expect(metadata.description).toContain("Test de conexión");
      expect(metadata.syntax).toBe("/ping");
      expect(metadata.category).toBe("basic");
      expect(metadata.permissions).toContain("user");
      expect(metadata.cooldown).toBe(3);
    });
  });

  describe("Execution", () => {
    test("should execute successfully and return pong response", async () => {
      const result: CommandResult = await pingCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response).toContain("🏓 **Pong!**");
      expect(result.response).toContain("Tiempo de respuesta:");
      expect(result.response).toContain("Estado del bot:");
    });

    test("should measure response time", async () => {
      const startTime = Date.now();
      const result: CommandResult = await pingCommand.execute(mockContext);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.response).toMatch(/Tiempo de respuesta: \d+ms/);

      // The response time should be reasonable (less than test execution time)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // Should execute quickly
    });

    test("should include performance message", async () => {
      const result: CommandResult = await pingCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toMatch(
        /(⚡ \*\*Rendimiento óptimo\*\*|✅ \*\*Buen rendimiento\*\*|⚠️ \*\*Rendimiento regular\*\*|🚨 \*\*Rendimiento bajo\*\*)/
      );
    });

    test("should include connection status", async () => {
      const result: CommandResult = await pingCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toMatch(
        /(🟢 Excelente|🟡 Bueno|🟠 Regular|🔴 Lento)/
      );
    });

    test("should include timestamp", async () => {
      const result: CommandResult = await pingCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Timestamp:");
      expect(result.response).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Time format HH:MM:SS
    });
  });

  describe("Permission Validation", () => {
    test("should allow user with basic permissions", () => {
      if (mockContext.user) {
        const canExecute = pingCommand.canExecute(mockContext.user);
        expect(canExecute).toBe(true);
      } else {
        expect(true).toBe(true); // Skip if no user
      }
    });

    test("should allow admin users", () => {
      if (mockContext.user) {
        const adminUser = {
          ...mockContext.user,
          user_type: "admin" as const,
          whatsapp_jid: mockContext.user.whatsapp_jid,
          phone_number: mockContext.user.phone_number,
          display_name: mockContext.user.display_name,
        };
        const canExecute = pingCommand.canExecute(adminUser);
        expect(canExecute).toBe(true);
      } else {
        expect(true).toBe(true); // Skip if no user
      }
    });
  });

  describe("Help and Usage", () => {
    test("should provide help information", () => {
      const help = pingCommand.getHelp();

      expect(help).toContain("ping");
      expect(help).toContain("Test de conexión");
      expect(help).toContain("/ping");
      expect(help).toContain("basic");
    });

    test("should provide usage examples", () => {
      const examples = pingCommand.getUsageExamples();

      expect(examples).toContain("/ping");
      expect(examples).toContain("/test");
    });
  });

  describe("Validation", () => {
    test("should validate context successfully", () => {
      const validation = pingCommand.validate(mockContext);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should validate with invalid context", () => {
      const invalidContext = {
        ...mockContext,
        message: null as any,
      };

      const validation = pingCommand.validate(invalidContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
