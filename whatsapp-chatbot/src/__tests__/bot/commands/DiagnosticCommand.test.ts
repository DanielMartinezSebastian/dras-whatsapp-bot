import { DiagnosticCommand } from "../../../bot/commands/admin/DiagnosticCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

describe("DiagnosticCommand", () => {
  let diagnosticCommand: DiagnosticCommand;
  let mockUser: User;
  let mockAdminUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    diagnosticCommand = new DiagnosticCommand();

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
        text: "!diagnostic",
        content: "!diagnostic",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        type: "COMMAND",
        user: mockUser,
      },
      user: mockUser,
      args: [],
      fullText: "!diagnostic",
      commandName: "diagnostic",
      isFromAdmin: false,
      timestamp: new Date(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = diagnosticCommand.metadata;

      expect(metadata.name).toBe("diagnostic");
      expect(metadata.aliases).toContain("diagnostico");
      expect(metadata.aliases).toContain("diag");
      expect(metadata.aliases).toContain("status-system");
      expect(metadata.description).toContain("Diagnóstico del sistema");
      expect(metadata.category).toBe("admin");
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

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(false);
      expect(result.response).toContain("🚫 Acceso denegado");
      expect(result.shouldReply).toBe(true);
    });

    it("should show complete diagnostic by default for admin users", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: [],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🔍 DIAGNÓSTICO DEL SISTEMA");
      expect(result.response).toContain("📊 CONFIGURACIÓN:");
      expect(result.response).toContain("🎯 COMANDOS CONTEXTUALES:");
      expect(result.response).toContain("🧪 TESTS DE DETECCIÓN:");
      expect(result.response).toContain("USE_NEW_COMMANDS:");
      expect(result.response).toContain("Version Node.js:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show only stats when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["stats"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("📊 CONFIGURACIÓN:");
      expect(result.response).toContain("⚙️ PROCESO:");
      expect(result.response).toContain("USE_NEW_COMMANDS:");
      expect(result.response).toContain("PID:");
      expect(result.response).toContain("Tiempo activo:");
      expect(result.response).not.toContain("🎯 COMANDOS CONTEXTUALES:");
      expect(result.response).not.toContain("🧪 TESTS DE DETECCIÓN:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show only contextual info when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["contextual"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🎯 COMANDOS CONTEXTUALES:");
      expect(result.response).toContain("Sistema en migración a TypeScript");
      expect(result.response).not.toContain("📊 CONFIGURACIÓN:");
      expect(result.response).not.toContain("🧪 TESTS DE DETECCIÓN:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show only detection tests when requested", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["test"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🧪 TESTS DE DETECCIÓN:");
      expect(result.response).toContain("estoy aburrido");
      expect(result.response).toContain("estoy triste");
      expect(result.response).toContain("no sé qué hacer");
      expect(result.response).toMatch(/(✅ Detectado por:|❌ No detectado)/);
      expect(result.response).not.toContain("📊 CONFIGURACIÓN:");
      expect(result.response).not.toContain("🎯 COMANDOS CONTEXTUALES:");
      expect(result.shouldReply).toBe(true);
    });

    it('should handle "all" option same as default', async () => {
      const defaultContext = {
        ...baseContext,
        user: mockAdminUser,
        args: [],
      };

      const allContext = {
        ...baseContext,
        user: mockAdminUser,
        args: ["all"],
      };

      const defaultResult = await diagnosticCommand.execute(defaultContext);
      const allResult = await diagnosticCommand.execute(allContext);

      expect(defaultResult.success).toBe(true);
      expect(allResult.success).toBe(true);

      // Both should contain all sections
      const sections = [
        "📊 CONFIGURACIÓN:",
        "🎯 COMANDOS CONTEXTUALES:",
        "🧪 TESTS DE DETECCIÓN:",
      ];
      sections.forEach((section) => {
        expect(defaultResult.response).toContain(section);
        expect(allResult.response).toContain(section);
      });
    });

    it("should show help for unknown options", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["unknown-option"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("❓ Opción no reconocida");
      expect(result.response).toContain("Opciones disponibles:");
      expect(result.response).toContain("• stats");
      expect(result.response).toContain("• contextual");
      expect(result.response).toContain("• test");
      expect(result.response).toContain("• all");
      expect(result.shouldReply).toBe(true);
    });

    it("should include consultation metadata", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["stats"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🕒 Consultado:");
      expect(result.response).toContain("👤 Usuario:");
      expect(result.response).toContain("📱 Desde:");
      expect(result.response).toContain(mockAdminUser.display_name);
      expect(result.shouldReply).toBe(true);
    });

    it("should format memory and uptime correctly", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["stats"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      // Should contain formatted memory
      expect(result.response).toMatch(
        /Memoria heap: \d+(\.\d+)?\s+(Bytes|KB|MB|GB)/
      );
      // Should contain formatted uptime
      expect(result.response).toMatch(/Tiempo activo: \d+/);
      expect(result.shouldReply).toBe(true);
    });

    it("should simulate detection correctly", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["test"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);

      // Check that specific patterns are detected
      expect(result.response).toContain("estoy aburrido");
      expect(result.response).toContain("estoy triste");

      // Should have some detection results (either detected or not detected)
      expect(result.response).toMatch(/(✅ Detectado|❌ No detectado)/);
      expect(result.shouldReply).toBe(true);
    });

    it("should include environment variables information", async () => {
      const context = {
        ...baseContext,
        user: mockAdminUser,
        args: ["stats"],
      };

      const result = await diagnosticCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("USE_NEW_COMMANDS:");
      expect(result.response).toContain("ENABLE_NEW_COMMANDS:");
      expect(result.response).toContain("NODE_ENV:");
      expect(result.shouldReply).toBe(true);
    });
  });

  describe("canExecute", () => {
    it("should return false for non-admin users", () => {
      expect(diagnosticCommand.canExecute(mockUser)).toBe(false);
    });

    it("should return true for admin users", () => {
      expect(diagnosticCommand.canExecute(mockAdminUser)).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate command context", () => {
      const validation = diagnosticCommand.validate(baseContext);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation with invalid context", () => {
      const invalidContext = { ...baseContext, message: undefined } as any;
      const validation = diagnosticCommand.validate(invalidContext);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
