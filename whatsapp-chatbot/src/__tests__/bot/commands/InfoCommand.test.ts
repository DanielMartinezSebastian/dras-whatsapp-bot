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

const { InfoCommand } = require("../../../bot/commands/basic/InfoCommand");

describe("InfoCommand", () => {
  let infoCommand: any;
  let mockContext: CommandContext;

  beforeEach(() => {
    infoCommand = new InfoCommand();

    mockContext = {
      message: {
        id: "test-message-id",
        messageId: "test-msg-1",
        chatId: "test-chat",
        chatJid: "test@g.us",
        sender: "sender",
        senderPhone: "123456789",
        text: "!info",
        content: "!info",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      },
      args: [],
      fullText: "!info",
      commandName: "info",
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
      const metadata = infoCommand.metadata;

      expect(metadata.name).toBe("info");
      expect(metadata.aliases).toContain("information");
      expect(metadata.aliases).toContain("about");
      expect(metadata.description).toContain("información del bot");
      expect(metadata.category).toBe("basic");
      expect(metadata.permissions).toContain("user");
      expect(metadata.syntax).toBe("!info");
    });
  });

  describe("Execution", () => {
    test("should provide system information", async () => {
      const result: CommandResult = await infoCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain(
        "🤖 **drasBot - Información del Sistema**"
      );
      expect(result.response).toContain("📊 **Estadísticas Generales:**");
      expect(result.response).toContain("• Tiempo activo:");
      expect(result.response).toContain(
        "• Versión: 2.0.0 (Sistema TypeScript)"
      );
      expect(result.response).toContain("• Estado: 🟢 Operativo");
    });

    test("should include architecture information", async () => {
      const result: CommandResult = await infoCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🏗️ **Arquitectura:**");
      expect(result.response).toContain(
        "• Sistema de comandos: Modular TypeScript"
      );
      expect(result.response).toContain("• Base de datos: SQLite");
      expect(result.response).toContain(
        "• Procesamiento: Node.js + TypeScript"
      );
    });

    test("should include functionality list", async () => {
      const result: CommandResult = await infoCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🔧 **Funcionalidades:**");
      expect(result.response).toContain("✅ Gestión de usuarios y permisos");
      expect(result.response).toContain("✅ Sistema de comandos dinámico");
      expect(result.response).toContain("✅ Registro y autenticación");
      expect(result.response).toContain("✅ Logs y monitoreo");
      expect(result.response).toContain("✅ Panel administrativo");
      expect(result.response).toContain("✅ Migración a TypeScript");
    });

    test("should include help and support information", async () => {
      const result: CommandResult = await infoCommand.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toContain(
        "💡 **Comandos disponibles:** Usa `!help`"
      );
      expect(result.response).toContain(
        "📞 **Soporte:** Contacta al administrador"
      );
    });
  });

  describe("Uptime Formatting", () => {
    test("should format seconds correctly", () => {
      const result = infoCommand.formatUptime(5000); // 5 seconds
      expect(result).toBe("5s");
    });

    test("should format minutes correctly", () => {
      const result = infoCommand.formatUptime(90000); // 1 minute 30 seconds
      expect(result).toBe("1m 30s");
    });

    test("should format hours correctly", () => {
      const result = infoCommand.formatUptime(3900000); // 1 hour 5 minutes
      expect(result).toBe("1h 5m");
    });

    test("should format days correctly", () => {
      const result = infoCommand.formatUptime(90000000); // ~1 day 1 hour
      expect(result).toMatch(/1d \d+h \d+m/);
    });
  });

  describe("System Start Time", () => {
    test("should get a reasonable start time", () => {
      const startTime = infoCommand.getSystemStartTime();

      expect(startTime).toBeInstanceOf(Date);
      expect(startTime.getTime()).toBeLessThanOrEqual(Date.now());

      // Should be within the last hour (reasonable for process uptime)
      const hourAgo = Date.now() - 60 * 60 * 1000;
      expect(startTime.getTime()).toBeGreaterThan(hourAgo);
    });

    test("should handle global bot start time", () => {
      // Set a global start time
      const testStartTime = new Date(Date.now() - 10000);
      (global as any).botStartTime = testStartTime.getTime();

      const startTime = infoCommand.getSystemStartTime();

      expect(startTime.getTime()).toBe(testStartTime.getTime());

      // Clean up
      delete (global as any).botStartTime;
    });
  });

  describe("Error Handling", () => {
    test("should handle errors gracefully", async () => {
      // Test command execution robustness
      const result: CommandResult = await infoCommand.execute(mockContext);

      // InfoCommand is designed to be robust, so it should succeed
      expect(result.success).toBe(true);
      expect(typeof result.response).toBe("string");
      expect(result.response).toBeTruthy();
    });
  });
});
