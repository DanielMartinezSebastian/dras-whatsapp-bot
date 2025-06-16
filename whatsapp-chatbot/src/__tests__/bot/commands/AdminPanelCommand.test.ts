import { AdminPanelCommand } from "../../../bot/commands/admin/AdminPanelCommand";
import { CommandContext } from "../../../types/commands";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe("AdminPanelCommand", () => {
  let adminPanelCommand: AdminPanelCommand;
  let adminContext: CommandContext;
  let userContext: CommandContext;

  beforeEach(() => {
    adminPanelCommand = new AdminPanelCommand();

    const baseMessage = {
      id: "test-message-1",
      messageId: "test-message-1",
      chatId: "test-chat-1",
      chatJid: "test-chat-1@g.us",
      chatName: "Test Chat",
      sender: "1234567890@s.whatsapp.net",
      senderPhone: "1234567890",
      senderName: "Admin User",
      text: "!admin",
      content: "!admin",
      timestamp: new Date().toISOString(),
      isFromMe: false,
      fromMe: false,
    };

    adminContext = {
      message: baseMessage,
      args: [],
      fullText: "!admin",
      commandName: "admin",
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
      const metadata = adminPanelCommand.metadata;

      expect(metadata.name).toBe("admin");
      expect(metadata.aliases).toContain("panel");
      expect(metadata.aliases).toContain("admin-panel");
      expect(metadata.category).toBe("admin");
      expect(metadata.description).toContain("panel de administración");
      expect(metadata.isAdmin).toBe(true);
      expect(metadata.isSensitive).toBe(true);
      expect(metadata.requiredRole).toBe("admin");
      expect(metadata.permissions).toContain("admin");
    });
  });

  describe("matches", () => {
    it("should match admin panel commands", () => {
      const adminRequests = [
        "!admin",
        "!panel",
        "!admin-panel",
        "admin",
        "panel",
      ];

      adminRequests.forEach((request) => {
        expect(adminPanelCommand.matches(request)).toBe(true);
      });
    });

    it("should not match unrelated messages", () => {
      const unrelatedMessages = [
        "hello admin",
        "admin help me",
        "panel de control",
        "administration",
        "admin system",
      ];

      unrelatedMessages.forEach((message) => {
        expect(adminPanelCommand.matches(message)).toBe(false);
      });
    });
  });

  describe("execute", () => {
    it("should return admin panel for authorized users", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.response!).toContain("Panel de Administración");
      expect(result.response!).toContain("Estadísticas del Bot");
      expect(result.response!).toContain("Sistema de Comandos TypeScript");
      expect(result.response!).toContain("Estadísticas del Sistema");
      expect(result.response!).toContain(
        "Comandos Administrativos Disponibles"
      );
      expect(result.data).toBeDefined();
      expect(result.data?.commandName).toBe("admin");
      expect(result.data?.responseType).toBe("admin_panel");
      expect(result.data?.userId).toBe("1");
    });

    it("should include bot statistics", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      expect(result.response!).toContain("Tiempo activo:");
      expect(result.response!).toContain("Mensajes procesados:");
      expect(result.response!).toContain("Estado servicios:");
    });

    it("should include TypeScript migration progress", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      expect(result.response!).toContain("Sistema de Comandos TypeScript");
      expect(result.response!).toContain("Comandos básicos: 4/4 migrados");
      expect(result.response!).toContain("Estado de Migración");
      expect(result.response!).toContain("TypeScript: ✅ Completado");
    });

    it("should include system statistics", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      expect(result.response!).toContain("CPU:");
      expect(result.response!).toContain("Memoria:");
      expect(result.response!).toContain("Uptime del sistema:");
    });

    it("should include available admin commands", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      expect(result.response!).toContain("!admin - Panel de administración");
      expect(result.response!).toContain(
        "!diagnostic - Diagnóstico del sistema"
      );
      expect(result.response!).toContain("!users - Gestión de usuarios");
      expect(result.response!).toContain("!logs - Ver logs del sistema");
    });

    it("should deny access to non-admin users", async () => {
      const result = await adminPanelCommand.execute(userContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain("requiere permisos de administrador");
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBe("Insufficient permissions");
    });

    it("should handle errors gracefully", async () => {
      // Force an error by mocking process to throw
      const originalProcess = global.process;
      (global as any).process = {
        ...originalProcess,
        memoryUsage: () => {
          throw new Error("Memory error");
        },
      };

      const result = await adminPanelCommand.execute(adminContext);

      expect(result.success).toBe(false);
      expect(result.response).toContain(
        "Error al cargar el panel de administración"
      );
      expect(result.shouldReply).toBe(true);
      expect(result.error).toBeDefined();

      // Restore original process
      (global as any).process = originalProcess;
    });

    it("should include execution time in data", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      expect(result.data?.executionTime).toBeDefined();
      expect(typeof result.data?.executionTime).toBe("number");
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should include stats data for successful execution", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      if (result.success) {
        expect(result.data?.stats).toBeDefined();
        expect(result.data?.stats.bot).toBeDefined();
        expect(result.data?.stats.system).toBeDefined();
        expect(typeof result.data?.stats.bot.uptime).toBe("number");
        expect(typeof result.data?.stats.system.memoryUsage).toBe("number");
      }
    });

    it("should work without user context for admins", async () => {
      const contextWithoutUser = {
        ...adminContext,
        user: undefined,
      };

      const result = await adminPanelCommand.execute(contextWithoutUser);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeTruthy();
      expect(result.data?.userId).toBeUndefined();
    });

    it("should format uptime correctly", async () => {
      const result = await adminPanelCommand.execute(adminContext);

      // The uptime should be formatted as a string with time units
      expect(result.response!).toMatch(/Tiempo activo: \d+[smhd]/);
    });
  });
});
