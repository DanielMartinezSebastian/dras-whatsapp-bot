import { LogsCommand } from "../../../bot/commands/system/LogsCommand";
import { StatsCommand } from "../../../bot/commands/system/StatsCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";
import * as fs from "fs/promises";

// Mock logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock fs promises
jest.mock("fs/promises");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("System Commands Integration", () => {
  let logsCommand: LogsCommand;
  let statsCommand: StatsCommand;
  let mockAdminUser: User;
  let mockUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    logsCommand = new LogsCommand();
    statsCommand = new StatsCommand();

    mockAdminUser = {
      id: 1,
      whatsapp_jid: "1234567890@s.whatsapp.net",
      phone_number: "1234567890",
      display_name: "Admin User",
      user_type: "admin",
      created_at: new Date(),
      updated_at: new Date(),
      total_messages: 10,
      is_active: true,
    };

    mockUser = {
      ...mockAdminUser,
      user_type: "customer",
      display_name: "Regular User",
    };

    baseContext = {
      message: {
        id: "test-msg-id",
        messageId: "test-msg-id",
        chatId: "1234567890@s.whatsapp.net",
        chatJid: "1234567890@s.whatsapp.net",
        chatName: "Test Chat",
        sender: "1234567890@s.whatsapp.net",
        senderPhone: "1234567890",
        senderName: "Test User",
        text: "!command",
        content: "!command",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        type: "COMMAND",
        user: mockAdminUser,
      },
      user: mockAdminUser,
      args: [],
      fullText: "!command",
      commandName: "command",
      isFromAdmin: true,
      timestamp: new Date(),
    };

    jest.clearAllMocks();
  });

  describe("Commands Registry", () => {
    it("should have all system commands with correct metadata", () => {
      const commands = [logsCommand, statsCommand];

      commands.forEach((command) => {
        expect(command.metadata).toBeDefined();
        expect(command.metadata.name).toBeDefined();
        expect(command.metadata.category).toBe("system");
        expect(command.metadata.requiredRole).toBe("admin");
        expect(command.metadata.isAdmin).toBe(true);
        expect(command.metadata.permissions).toContain("admin");
      });
    });

    it("should have unique command names", () => {
      const commands = [logsCommand, statsCommand];
      const names = commands.map((cmd) => cmd.metadata.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it("should have valid aliases without conflicts", () => {
      const commands = [logsCommand, statsCommand];
      const allAliases: string[] = [];

      commands.forEach((command) => {
        allAliases.push(command.metadata.name);
        allAliases.push(...command.metadata.aliases);
      });

      const uniqueAliases = new Set(allAliases);
      expect(uniqueAliases.size).toBe(allAliases.length);
    });
  });

  describe("Permission Consistency", () => {
    it("should deny access to regular users for all system commands", async () => {
      const commands = [logsCommand, statsCommand];
      const userContext = { ...baseContext, user: mockUser };

      for (const command of commands) {
        const result = await command.execute(userContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain("🚫 Acceso denegado");
        expect(result.shouldReply).toBe(true);
      }
    });

    it("should allow access to admin users for all system commands", async () => {
      const commands = [logsCommand, statsCommand];
      const adminContext = { ...baseContext, user: mockAdminUser };

      // Mock fs for logs command
      mockFs.readFile.mockResolvedValue("Mock log content");

      for (const command of commands) {
        const result = await command.execute(adminContext);

        expect(result.success).toBe(true);
        expect(result.response).not.toContain("🚫 Acceso denegado");
        expect(result.shouldReply).toBe(true);
      }
    });

    it("should validate permissions using canExecute method", () => {
      const commands = [logsCommand, statsCommand];

      commands.forEach((command) => {
        expect(command.canExecute(mockUser)).toBe(false);
        expect(command.canExecute(mockAdminUser)).toBe(true);
      });
    });
  });

  describe("Error Handling Consistency", () => {
    it("should handle errors gracefully in all commands", async () => {
      const adminContext = { ...baseContext, user: mockAdminUser };

      // Force an error in logs command by making fs.readFile fail
      mockFs.readFile.mockRejectedValue(new Error("File system error"));

      const logsResult = await logsCommand.execute(adminContext);
      expect(logsResult.success).toBe(false);
      expect(logsResult.error).toBeDefined();
      expect(logsResult.response).toContain("❌ Error");

      // Stats command should not have errors under normal conditions
      const statsResult = await statsCommand.execute(adminContext);
      expect(statsResult.success).toBe(true);
    });

    it("should validate contexts properly", () => {
      const commands = [logsCommand, statsCommand];

      commands.forEach((command) => {
        // Valid context
        const validation = command.validate(baseContext);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Invalid context
        const invalidContext = { ...baseContext, message: undefined } as any;
        const invalidValidation = command.validate(invalidContext);
        expect(invalidValidation.isValid).toBe(false);
        expect(invalidValidation.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Response Format Consistency", () => {
    it("should return consistent response format", async () => {
      const commands = [logsCommand, statsCommand];
      const adminContext = { ...baseContext, user: mockAdminUser };

      mockFs.readFile.mockResolvedValue("Mock log content");

      for (const command of commands) {
        const result = await command.execute(adminContext);

        // All commands should return CommandResult with these properties
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("response");
        expect(result).toHaveProperty("shouldReply");
        expect(typeof result.success).toBe("boolean");
        expect(typeof result.response).toBe("string");
        expect(typeof result.shouldReply).toBe("boolean");
      }
    });

    it("should use emojis and proper formatting", async () => {
      const adminContext = { ...baseContext, user: mockAdminUser };
      mockFs.readFile.mockResolvedValue("Mock log content");

      const logsResult = await logsCommand.execute(adminContext);
      expect(logsResult.response).toMatch(/[📋📄📊🕒]/); // Should contain emojis

      const statsResult = await statsCommand.execute(adminContext);
      expect(statsResult.response).toMatch(/[📊⚡🤖💻🖥️]/); // Should contain emojis
    });
  });

  describe("Command Arguments Handling", () => {
    it("should handle various argument patterns", async () => {
      const adminContext = { ...baseContext, user: mockAdminUser };
      mockFs.readFile.mockResolvedValue("Mock log content");

      // Test logs command with different arguments
      const logsTestCases = [
        { args: [], shouldSucceed: true },
        { args: ["error"], shouldSucceed: true },
        { args: ["info", "50"], shouldSucceed: true },
        { args: ["invalid"], shouldSucceed: true }, // Should handle gracefully
      ];

      for (const testCase of logsTestCases) {
        const context = { ...adminContext, args: testCase.args };
        const result = await logsCommand.execute(context);

        if (testCase.shouldSucceed) {
          expect(result.response).toBeDefined();
        }
      }

      // Test stats command with different arguments
      const statsTestCases = [
        { args: [], expectedContent: "GENERALES" },
        { args: ["users"], expectedContent: "USUARIOS" },
        { args: ["commands"], expectedContent: "COMANDOS" },
        { args: ["system"], expectedContent: "SISTEMA" },
      ];

      for (const testCase of statsTestCases) {
        const context = { ...adminContext, args: testCase.args };
        const result = await statsCommand.execute(context);

        expect(result.success).toBe(true);
        expect(result.response).toContain(testCase.expectedContent);
      }
    });
  });

  describe("Performance and Reliability", () => {
    it("should execute commands within reasonable time", async () => {
      const adminContext = { ...baseContext, user: mockAdminUser };
      mockFs.readFile.mockResolvedValue("Mock log content");

      const commands = [logsCommand, statsCommand];

      for (const command of commands) {
        const startTime = Date.now();
        await command.execute(adminContext);
        const executionTime = Date.now() - startTime;

        // Commands should execute in less than 1 second
        expect(executionTime).toBeLessThan(1000);
      }
    });

    it("should handle concurrent executions", async () => {
      const adminContext = { ...baseContext, user: mockAdminUser };
      mockFs.readFile.mockResolvedValue("Mock log content");

      // Execute multiple commands concurrently
      const promises = [
        logsCommand.execute(adminContext),
        statsCommand.execute(adminContext),
        logsCommand.execute({ ...adminContext, args: ["info"] }),
        statsCommand.execute({ ...adminContext, args: ["system"] }),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.response).toBeDefined();
      });
    });
  });
});
