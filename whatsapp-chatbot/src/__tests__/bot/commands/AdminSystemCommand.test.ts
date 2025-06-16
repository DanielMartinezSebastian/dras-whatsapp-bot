import { AdminSystemCommand } from "../../../bot/commands/admin/AdminSystemCommand";
import { CommandContext } from "../../../types/commands";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe("AdminSystemCommand", () => {
  let adminSystemCommand: AdminSystemCommand;
  let adminContext: CommandContext;
  let userContext: CommandContext;

  beforeEach(() => {
    adminSystemCommand = new AdminSystemCommand();

    const baseMessage = {
      id: "test-message-1",
      messageId: "test-message-1",
      chatId: "test-chat-1",
      chatJid: "test-chat-1@g.us",
      chatName: "Test Chat",
      sender: "1234567890@s.whatsapp.net",
      senderPhone: "1234567890",
      senderName: "Admin User",
      text: "!admin-system stats",
      content: "!admin-system stats",
      timestamp: new Date().toISOString(),
      isFromMe: false,
      fromMe: false,
    };

    adminContext = {
      message: baseMessage,
      args: ["stats"],
      fullText: "!admin-system stats",
      commandName: "admin-system",
      isFromAdmin: true,
      timestamp: new Date(),
      user: {
        id: 1,
        whatsapp_jid: "1234567890@s.whatsapp.net",
        phone_number: "1234567890",
        display_name: "Admin User",
        user_type: "admin",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 10,
        is_active: true,
      },
    };

    userContext = {
      ...adminContext,
      isFromAdmin: false,
      user: {
        ...adminContext.user!,
        user_type: "customer",
      },
    };
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = adminSystemCommand.metadata;

      expect(metadata.name).toBe("admin-system");
      expect(metadata.aliases).toContain("sys");
      expect(metadata.aliases).toContain("sistema");
      expect(metadata.category).toBe("admin");
      expect(metadata.description).toContain("sistema de comandos");
      expect(metadata.isAdmin).toBe(true);
      expect(metadata.isSensitive).toBe(true);
      expect(metadata.requiredRole).toBe("admin");
      expect(metadata.permissions).toContain("admin");
    });
  });

  describe("matches", () => {
    it("should match admin system commands", () => {
      const systemRequests = [
        "!admin-system stats",
        "!sys reload",
        "!sistema toggle",
        "admin-system",
        "sys",
        "sistema",
      ];

      systemRequests.forEach((request) => {
        expect(adminSystemCommand.matches(request)).toBe(true);
      });
    });

    it("should not match unrelated messages", () => {
      const unrelatedMessages = [
        "hello system",
        "admin help me",
        "system status",
        "administration",
        "systematic",
      ];

      unrelatedMessages.forEach((message) => {
        expect(adminSystemCommand.matches(message)).toBe(false);
      });
    });
  });

  describe("execute", () => {
    it("should show system stats by default", async () => {
      const context = { ...adminContext, args: [] };
      const result = await adminSystemCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.response!).toContain("Estadísticas del Sistema");
      expect(result.response!).toContain("Registry de Comandos");
      expect(result.response!).toContain("Manejador de Comandos");
      expect(result.response!).toContain("Sistema TypeScript");
      expect(result.data?.action).toBe("stats");
    });

    it("should show system stats when requested", async () => {
      const result = await adminSystemCommand.execute(adminContext);

      expect(result.success).toBe(true);
      expect(result.response!).toContain("Estadísticas del Sistema");
      expect(result.response!).toContain("Comandos cargados: 14");
      expect(result.response!).toContain("Categorías: 5");
      expect(result.response!).toContain("Sistema cargado: ✅");
      expect(result.response!).toContain("Estado: 🟢 Habilitado");
      expect(result.response!).toContain("basic: 4");
      expect(result.data?.responseType).toBe("system_stats");
    });

    it("should reload commands when requested", async () => {
      const reloadContext = { ...adminContext, args: ["reload"] };
      const result = await adminSystemCommand.execute(reloadContext);

      expect(result.success).toBe(true);
      expect(result.response!).toContain("Comandos recargados");
      expect(result.response!).toContain("Antes: 14, Ahora: 14");
      expect(result.data?.action).toBe("reload");
      expect(result.data?.responseType).toBe("reload_result");
    });

    it("should handle toggle system request", async () => {
      const toggleContext = { ...adminContext, args: ["toggle"] };
      const result = await adminSystemCommand.execute(toggleContext);

      expect(result.success).toBe(true);
      expect(result.response!).toContain(
        "sistema TypeScript está permanentemente habilitado"
      );
      expect(result.data?.action).toBe("toggle");
      expect(result.data?.responseType).toBe("toggle_result");
      expect(result.data?.systemEnabled).toBe(true);
    });

    it("should show help when requested", async () => {
      const helpContext = { ...adminContext, args: ["help"] };
      const result = await adminSystemCommand.execute(helpContext);

      expect(result.success).toBe(true);
      expect(result.response!).toContain("Ayuda: Admin System");
      expect(result.response!).toContain("Comandos disponibles:");
      expect(result.response!).toContain("stats");
      expect(result.response!).toContain("reload");
      expect(result.response!).toContain("toggle");
      expect(result.response!).toContain("help");
      expect(result.response!).toContain("Ejemplos:");
      expect(result.data?.action).toBe("help");
    });

    it("should handle unknown actions", async () => {
      const unknownContext = { ...adminContext, args: ["unknown"] };
      const result = await adminSystemCommand.execute(unknownContext);

      expect(result.success).toBe(false);
      expect(result.response!).toContain("Acción desconocida: unknown");
      expect(result.response!).toContain("admin-system help");
      expect(result.error).toBe("Unknown action: unknown");
    });

    it("should deny access to non-admin users", async () => {
      const result = await adminSystemCommand.execute(userContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain("requiere permisos de administrador");
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBe("Insufficient permissions");
    });

    it("should include execution time in data", async () => {
      const result = await adminSystemCommand.execute(adminContext);

      expect(result.data?.executionTime).toBeDefined();
      expect(typeof result.data?.executionTime).toBe("number");
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should include stats data for stats action", async () => {
      const result = await adminSystemCommand.execute(adminContext);

      if (result.success && result.data?.action === "stats") {
        expect(result.data?.stats).toBeDefined();
        expect(result.data?.stats.registry).toBeDefined();
        expect(result.data?.stats.handler).toBeDefined();
        expect(result.data?.stats.categories).toBeDefined();
        expect(result.data?.stats.registry.totalCommands).toBe(14);
        expect(result.data?.stats.categories.basic).toBe(4);
      }
    });

    it("should work without user context for admins", async () => {
      const contextWithoutUser = {
        ...adminContext,
        user: undefined,
      };

      const result = await adminSystemCommand.execute(contextWithoutUser);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.data?.userId).toBeUndefined();
    });

    it("should handle different action cases", async () => {
      const upperCaseContext = { ...adminContext, args: ["STATS"] };
      const result = await adminSystemCommand.execute(upperCaseContext);

      expect(result.success).toBe(true);
      expect(result.response!).toContain("Estadísticas del Sistema");
      expect(result.data?.action).toBe("stats");
    });

    it("should include comprehensive stats information", async () => {
      const result = await adminSystemCommand.execute(adminContext);

      expect(result.response!).toContain("Ejecuciones totales:");
      expect(result.response!).toContain("Comandos exitosos:");
      expect(result.response!).toContain("Tasa de éxito:");
      expect(result.response!).toContain("Tests: 286/287 pasando");
    });
  });
});
