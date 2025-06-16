import { StatsCommand } from "../../../bot/commands/system/StatsCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

describe("StatsCommand", () => {
  let statsCommand: StatsCommand;
  let mockUser: User;
  let mockAdminUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    statsCommand = new StatsCommand();

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
        text: "!stats",
        content: "!stats",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        type: "COMMAND",
        user: mockUser,
      },
      user: mockUser,
      args: [],
      fullText: "!stats",
      commandName: "stats",
      isFromAdmin: false,
      timestamp: new Date(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = statsCommand.metadata;

      expect(metadata.name).toBe("stats");
      expect(metadata.aliases).toContain("estadisticas");
      expect(metadata.aliases).toContain("estadisticas-sistema");
      expect(metadata.description).toBe("Muestra estadísticas del sistema");
      expect(metadata.category).toBe("system");
      expect(metadata.requiredRole).toBe("admin");
      expect(metadata.isAdmin).toBe(true);
      expect(metadata.isSensitive).toBe(false);
      expect(metadata.examples).toBeDefined();
      expect(metadata.examples!.length).toBeGreaterThan(0);
    });
  });

  describe("execute", () => {
    it("should deny access to non-admin users", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🚫 Acceso denegado");
      expect(result.shouldReply).toBe(true);
    });

    it("should show general stats by default for admin users", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: [],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain(
        "📊 ESTADÍSTICAS GENERALES DEL SISTEMA"
      );
      expect(result.response).toContain("⚡ RENDIMIENTO:");
      expect(result.response).toContain("🤖 APLICACIÓN:");
      expect(result.response).toContain("Tiempo activo:");
      expect(result.response).toContain("Memoria usada:");
      expect(result.response).toContain("Versión Node.js:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show users stats when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["users"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("👥 ESTADÍSTICAS DE USUARIOS");
      expect(result.response).toContain("📊 GENERAL:");
      expect(result.response).toContain("📋 POR TIPO:");
      expect(result.response).toContain("admin:");
      expect(result.response).toContain("customer:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show commands stats when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["commands"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("⚡ ESTADÍSTICAS DE COMANDOS");
      expect(result.response).toContain("📊 ACTIVIDAD:");
      expect(result.response).toContain("📋 REGISTRO:");
      expect(result.response).toContain("🔢 POR NIVEL:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show permissions stats when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["permissions"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🔒 ESTADÍSTICAS DE PERMISOS");
      expect(result.response).toContain("📊 ACTIVIDAD GENERAL:");
      expect(result.response).toContain("👥 POR TIPO DE USUARIO:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show system stats when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["system"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🖥️ ESTADÍSTICAS DEL SISTEMA");
      expect(result.response).toContain("💻 RECURSOS:");
      expect(result.response).toContain("⏱️ TIEMPO:");
      expect(result.response).toContain("🔧 CONFIGURACIÓN:");
      expect(result.response).toContain("CPU Load:");
      expect(result.response).toContain("Memoria heap");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle Spanish aliases", async () => {
      const testCases = [
        { arg: "usuarios", expectedContent: "👥 ESTADÍSTICAS DE USUARIOS" },
        { arg: "comandos", expectedContent: "⚡ ESTADÍSTICAS DE COMANDOS" },
        { arg: "permisos", expectedContent: "🔒 ESTADÍSTICAS DE PERMISOS" },
        { arg: "sistema", expectedContent: "🖥️ ESTADÍSTICAS DEL SISTEMA" },
      ];

      for (const testCase of testCases) {
        const context = {
          ...baseContext,
          user: mockAdminUser,
          args: [testCase.arg],
        };

        const result = await statsCommand.execute(context);

        expect(result.success).toBe(true);
        expect(result.response).toContain(testCase.expectedContent);
        expect(result.shouldReply).toBe(true);
      }
    });

    it("should fall back to general stats for unknown types", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["unknown-type"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain(
        "📊 ESTADÍSTICAS GENERALES DEL SISTEMA"
      );
      expect(result.shouldReply).toBe(true);
    });

    it("should format memory values correctly", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["system"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      // Should contain formatted memory values
      expect(result.response).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB)/);
      expect(result.shouldReply).toBe(true);
    });

    it("should format uptime correctly", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["general"],
      };

      const result = await statsCommand.execute(context);

      expect(result.success).toBe(true);
      // Should contain formatted uptime
      expect(result.response).toMatch(/Tiempo activo: \d+/);
      expect(result.shouldReply).toBe(true);
    });
  });

  describe("canExecute", () => {
    it("should return false for non-admin users", () => {
      expect(statsCommand.canExecute(mockUser)).toBe(false);
    });

    it("should return true for admin users", () => {
      expect(statsCommand.canExecute(mockAdminUser)).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate command context", () => {
      const validation = statsCommand.validate(baseContext);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation with invalid context", () => {
      const invalidContext = { ...baseContext, message: undefined } as any;
      const validation = statsCommand.validate(invalidContext);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
