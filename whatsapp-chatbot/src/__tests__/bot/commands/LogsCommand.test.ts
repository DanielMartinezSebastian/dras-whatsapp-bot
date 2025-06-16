import { LogsCommand } from "../../../bot/commands/system/LogsCommand";
import { CommandContext, CommandResult } from "../../../types/commands";
import { User } from "../../../types/core";
import * as fs from "fs/promises";
import * as path from "path";

// Mock logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock fs promises
jest.mock("fs/promises");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("LogsCommand", () => {
  let logsCommand: LogsCommand;
  let mockUser: User;
  let mockAdminUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    logsCommand = new LogsCommand();

    mockUser = {
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

    mockAdminUser = {
      ...mockUser,
      user_type: "admin",
      display_name: "Admin User",
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
        text: "!logs",
        content: "!logs",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        type: "COMMAND",
        user: mockUser,
      },
      user: mockUser,
      args: [],
      fullText: "!logs",
      commandName: "logs",
      isFromAdmin: false,
      timestamp: new Date(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = logsCommand.metadata;

      expect(metadata.name).toBe("logs");
      expect(metadata.aliases).toContain("log");
      expect(metadata.aliases).toContain("archivo-log");
      expect(metadata.description).toBe("Muestra los logs del sistema");
      expect(metadata.category).toBe("system");
      expect(metadata.requiredRole).toBe("admin");
      expect(metadata.isAdmin).toBe(true);
      expect(metadata.isSensitive).toBe(true);
      expect(metadata.examples).toBeDefined();
      expect(metadata.examples!.length).toBeGreaterThan(0);
    });
  });

  describe("execute", () => {
    it("should deny access to non-admin users", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🚫 Acceso denegado");
      expect(result.shouldReply).toBe(true);
    });

    it("should allow access to admin users", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["error", "10"],
      };

      const mockLogContent = `
[2025-01-15 10:00:00] ERROR: Test error 1
[2025-01-15 10:01:00] ERROR: Test error 2
[2025-01-15 10:02:00] ERROR: Test error 3
      `.trim();

      mockFs.readFile.mockResolvedValue(mockLogContent);

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("📋 LOGS DEL SISTEMA (ERROR)");
      expect(result.response).toContain("error-0.log");
      expect(result.response).toContain("Test error");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle invalid log type", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["invalid-type"],
      };

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("❌ Tipo de log no válido");
      expect(result.response).toContain("invalid-type");
      expect(result.shouldReply).toBe(true);
    });

    it("should limit maximum lines", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["error", "300"], // Over the 200 limit
      };

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("❌ Máximo 200 líneas permitidas");
      expect(result.shouldReply).toBe(true);
    });

    it("should use default values when no args provided", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: [],
      };

      const mockLogContent = "Test log content";
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("📋 LOGS DEL SISTEMA (ERROR)"); // Default type
      expect(result.response).toContain("error-0.log"); // Default file
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("error-0.log"),
        "utf8"
      );
    });

    it("should handle different log types correctly", async () => {
      const testCases = [
        { type: "error", expectedFile: "error-0.log" },
        { type: "info", expectedFile: "out-0.log" },
        { type: "combined", expectedFile: "combined-0.log" },
        { type: "all", expectedFile: "combined-0.log" },
        { type: "security", expectedFile: "security.log" },
      ];

      for (const testCase of testCases) {
        const context = {
          ...baseContext,
          user: mockAdminUser,
          args: [testCase.type],
        };

        mockFs.readFile.mockResolvedValue("Test log content");

        await logsCommand.execute(context);

        expect(mockFs.readFile).toHaveBeenCalledWith(
          expect.stringContaining(testCase.expectedFile),
          "utf8"
        );

        mockFs.readFile.mockClear();
      }
    });

    it("should handle file read errors", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["error"],
      };

      mockFs.readFile.mockRejectedValue(new Error("File not found"));

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(false);
      expect(result.response).toContain("❌ Error ejecutando comando logs");
      expect(result.response).toContain("File not found");
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBe(
        "Error leyendo archivo de logs: File not found"
      );
    });

    it("should truncate long responses", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["error", "50"],
      };

      // Create a very long log content that will exceed 4000 characters
      const longLogLine = "A".repeat(100);
      const manyLines = Array(50).fill(longLogLine);
      const mockLogContent = manyLines.join("\n");

      mockFs.readFile.mockResolvedValue(mockLogContent);

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response!.length).toBeLessThanOrEqual(4000);
      if (result.response!.length === 4000) {
        expect(result.response).toContain("[TRUNCADO]");
      }
    });

    it("should handle empty log files", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["error"],
      };

      mockFs.readFile.mockResolvedValue("   \n  \n   "); // Only whitespace

      const result = await logsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("📝 No hay entradas de log recientes");
      expect(result.shouldReply).toBe(true);
    });
  });

  describe("canExecute", () => {
    it("should return false for non-admin users", () => {
      expect(logsCommand.canExecute(mockUser)).toBe(false);
    });

    it("should return true for admin users", () => {
      expect(logsCommand.canExecute(mockAdminUser)).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate command context", () => {
      const validation = logsCommand.validate(baseContext);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation with invalid context", () => {
      const invalidContext = { ...baseContext, message: undefined } as any;
      const validation = logsCommand.validate(invalidContext);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
