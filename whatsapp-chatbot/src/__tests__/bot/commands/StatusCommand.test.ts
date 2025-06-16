import type { CommandContext, CommandResult } from "../../../types/commands";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  default: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logWarning: jest.fn(),
  },
}));

const { StatusCommand } = require("../../../bot/commands/basic/StatusCommand");

describe("StatusCommand", () => {
  let statusCommand: any;
  let mockContext: CommandContext;

  beforeEach(() => {
    statusCommand = new StatusCommand();

    mockContext = {
      message: {
        id: "test-message-id",
        messageId: "test-msg-1",
        chatId: "test-chat",
        chatJid: "test@g.us",
        sender: "sender",
        senderPhone: "123456789",
        text: "!status",
        content: "!status",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      },
      args: [],
      fullText: "!status",
      commandName: "status",
      isFromAdmin: false,
      timestamp: new Date(),
      user: {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "Test User",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 5,
        is_active: true,
      },
    };
  });

  describe("Metadata", () => {
    test("should have correct metadata", () => {
      const metadata = statusCommand.metadata;

      expect(metadata.name).toBe("status");
      expect(metadata.aliases).toContain("estado");
      expect(metadata.aliases).toContain("st");
      expect(metadata.description).toContain("estado del sistema");
      expect(metadata.category).toBe("basic");
      expect(metadata.permissions).toContain("user");
      expect(metadata.syntax).toBe("!status");
    });
  });

  describe("Execution", () => {
    test("should provide system status", async () => {
      const result: CommandResult = await statusCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("📊 **ESTADO DEL SISTEMA**");
      expect(result.response).toContain("🚦 **Servicios:**");
      expect(result.response).toContain("• Bot Principal: ✅ Funcionando");
      expect(result.response).toContain("• Base de Datos:");
      expect(result.response).toContain(
        "• Sistema de Comandos: ✅ TypeScript Activo"
      );
    });

    test("should include activity statistics", async () => {
      const result: CommandResult = await statusCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("📈 **Actividad:**");
      expect(result.response).toContain("• Mensajes procesados:");
      expect(result.response).toContain("• Comandos ejecutados:");
      expect(result.response).toContain("• Usuarios registrados:");
      expect(result.response).toContain("• Sesión actual:");
    });

    test("should include performance metrics", async () => {
      const result: CommandResult = await statusCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("⚡ **Rendimiento:**");
      expect(result.response).toContain("• Memoria usada:");
      expect(result.response).toContain("• CPU tiempo:");
      expect(result.response).toContain("• Uptime:");
      expect(result.response).toContain("• Node.js:");
      expect(result.response).toContain("• Plataforma:");
    });

    test("should include TypeScript migration status", async () => {
      const result: CommandResult = await statusCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🔧 **Sistema TypeScript:**");
      expect(result.response).toContain("• Estado: ✅ Migración en progreso");
      expect(result.response).toContain("• Comandos migrados:");
      expect(result.response).toContain("PingCommand");
      expect(result.response).toContain("HelpCommand");
      expect(result.response).toContain("InfoCommand");
      expect(result.response).toContain("StatusCommand");
      expect(result.response).toContain("• Tests: ✅ Todos pasando");
    });

    test("should include help information", async () => {
      const result: CommandResult = await statusCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain(
        "💡 **Uso:** Usa `!help` para ver comandos disponibles"
      );
    });
  });

  describe("Database Status", () => {
    test("should detect database connection status", async () => {
      const dbStatus = await statusCommand.getDatabaseStatus();

      expect(typeof dbStatus.isConnected).toBe("boolean");
      expect(typeof dbStatus.status).toBe("string");
      expect(["Conectada", "Desconectada", "Error de conexión"]).toContain(
        dbStatus.status
      );
    });

    test("should handle database connection errors", async () => {
      // Simulate an error in database connection check
      const originalMethod = statusCommand.getDatabaseStatus;
      statusCommand.getDatabaseStatus = jest
        .fn()
        .mockRejectedValue(new Error("DB Error"));

      const result: CommandResult = await statusCommand.execute(mockContext);

      // Command should still work even if DB status check fails
      expect(result.success).toBe(false);
      if (result.response) {
        expect(result.response).toContain(
          "Error obteniendo estado del sistema"
        );
      }

      // Restore original method
      statusCommand.getDatabaseStatus = originalMethod;
    });
  });

  describe("System Statistics", () => {
    test("should get system statistics", () => {
      const stats = statusCommand.getSystemStats();

      expect(typeof stats.processedMessages).toBe("number");
      expect(typeof stats.commandsExecuted).toBe("number");
      expect(typeof stats.totalUsers).toBe("number");
      expect(typeof stats.sessionUptime).toBe("string");
    });

    test("should get performance statistics", () => {
      const perfStats = statusCommand.getPerformanceStats();

      expect(typeof perfStats.memoryUsage).toBe("number");
      expect(typeof perfStats.cpuTime).toBe("number");
      expect(typeof perfStats.uptime).toBe("string");

      expect(perfStats.memoryUsage).toBeGreaterThan(0);
      expect(perfStats.cpuTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Uptime Formatting", () => {
    test("should format seconds correctly", () => {
      const result = statusCommand.formatUptime(5000); // 5 seconds
      expect(result).toBe("5s");
    });

    test("should format minutes correctly", () => {
      const result = statusCommand.formatUptime(90000); // 1 minute 30 seconds
      expect(result).toBe("1m 30s");
    });

    test("should format hours correctly", () => {
      const result = statusCommand.formatUptime(3900000); // 1 hour 5 minutes
      expect(result).toBe("1h 5m");
    });

    test("should format days correctly", () => {
      const result = statusCommand.formatUptime(90000000); // ~1 day 1 hour
      expect(result).toMatch(/1d \d+h \d+m/);
    });
  });

  describe("Global State Handling", () => {
    test("should handle missing global bot processor gracefully", () => {
      const originalBotProcessor = (global as any).botProcessor;
      delete (global as any).botProcessor;

      const count = statusCommand.getProcessedMessagesCount();
      expect(count).toBe(0);

      // Restore if it existed
      if (originalBotProcessor) {
        (global as any).botProcessor = originalBotProcessor;
      }
    });

    test("should handle missing global user service gracefully", () => {
      const originalUserService = (global as any).userService;
      delete (global as any).userService;

      const count = statusCommand.getTotalUsersCount();
      expect(count).toBe(0);

      // Restore if it existed
      if (originalUserService) {
        (global as any).userService = originalUserService;
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle errors gracefully", async () => {
      // Mock generateSystemStatus to throw an error
      const originalMethod = statusCommand.generateSystemStatus;
      statusCommand.generateSystemStatus = jest
        .fn()
        .mockRejectedValue(new Error("System error"));

      const result: CommandResult = await statusCommand.execute(mockContext);

      expect(result.success).toBe(false);
      if (result.response) {
        expect(result.response).toContain(
          "Error obteniendo estado del sistema"
        );
      }

      // Restore original method
      statusCommand.generateSystemStatus = originalMethod;
    });
  });
});
