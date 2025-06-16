import { AdminMessageHandler } from "../../../bot/handlers/AdminMessageHandler";
import { HandlerContext } from "../../../types/handlers/message-handler.types";
import { WhatsAppMessage } from "../../../types/core/message.types";
import { User } from "../../../types/core/user.types";
import { MessageClassification } from "../../../types/core/message.types";
import { IBotProcessor } from "../../../interfaces/core/IBotProcessor";
import { IPermissionService } from "../../../interfaces/services/IPermissionService";
import { IWhatsAppClient } from "../../../interfaces/core/IWhatsAppClient";
import { PermissionResult } from "../../../types/services/permission.types";

// Mocks
const mockBotProcessor: jest.Mocked<IBotProcessor> = {
  processMessage: jest.fn(),
  initializeServices: jest.fn(),
  routeMessage: jest.fn(),
  isReady: jest.fn(),
  waitForInitialization: jest.fn(),
  getStats: jest.fn(),
  handleError: jest.fn(),
  shutdown: jest.fn(),
  updateConfig: jest.fn(),
  getConfig: jest.fn(),
};

const mockWhatsAppClient: jest.Mocked<IWhatsAppClient> = {
  initialize: jest.fn(),
  isReady: jest.fn(),
  sendMessage: jest.fn(),
  sendImage: jest.fn(),
  sendDocument: jest.fn(),
  getContacts: jest.fn(),
  getChatById: jest.fn(),
  onMessage: jest.fn(),
  onReady: jest.fn(),
  onError: jest.fn(),
};

const mockPermissionService: jest.Mocked<IPermissionService> = {
  checkPermission: jest.fn(),
  hasPermission: jest.fn(),
  grantPermission: jest.fn(),
  revokePermission: jest.fn(),
  getUserPermissions: jest.fn(),
};

describe("AdminMessageHandler", () => {
  let handler: AdminMessageHandler;
  let mockMessage: WhatsAppMessage;
  let mockUser: User;
  let mockClassification: MessageClassification;
  let mockContext: HandlerContext;

  beforeEach(() => {
    handler = new AdminMessageHandler(
      mockBotProcessor,
      mockWhatsAppClient,
      mockPermissionService
    );

    mockMessage = {
      id: "test-message-id",
      messageId: "msg_123",
      chatId: "chat_123",
      chatJid: "123456789@s.whatsapp.net",
      chatName: "Test Chat",
      sender: "sender_123",
      senderPhone: "1234567890",
      senderName: "Test User",
      text: "/admin",
      content: "/admin",
      timestamp: new Date().toISOString(),
      isFromMe: false,
      fromMe: false,
      type: "COMMAND",
    };

    mockUser = {
      id: 1,
      phone_number: "1234567890",
      whatsapp_jid: "123456789@s.whatsapp.net",
      display_name: "Test User",
      user_type: "admin",
      created_at: new Date(),
      updated_at: new Date(),
      last_message_at: new Date(),
      total_messages: 5,
      is_active: true,
    };

    mockClassification = {
      type: "COMMAND",
      command: "/admin",
      confidence: 0.95,
    };

    mockContext = {
      message: mockMessage,
      user: mockUser,
      classification: mockClassification,
      timestamp: new Date(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("canHandle", () => {
    it("should handle admin commands starting with /", () => {
      mockContext.message.text = "/admin";
      expect(handler.canHandle(mockContext)).toBe(true);
    });

    it("should handle admin commands starting with !", () => {
      mockContext.message.text = "!admin";
      expect(handler.canHandle(mockContext)).toBe(true);
    });

    it("should handle messages classified as COMMAND", () => {
      mockContext.message.text = "some text";
      mockContext.classification.type = "COMMAND";
      expect(handler.canHandle(mockContext)).toBe(true);
    });

    it("should not handle non-admin commands", () => {
      mockContext.message.text = "/unknown";
      mockContext.classification.type = "COMMAND";
      mockContext.classification.command = "/unknown";
      expect(handler.canHandle(mockContext)).toBe(false);
    });

    it("should not handle non-command messages", () => {
      mockContext.message.text = "hello";
      mockContext.classification.type = "GREETING";
      expect(handler.canHandle(mockContext)).toBe(false);
    });

    it("should not handle messages without text", () => {
      mockContext.message.text = "";
      expect(handler.canHandle(mockContext)).toBe(false);
    });
  });

  describe("processMessage", () => {
    beforeEach(() => {
      // Mock permission service to grant permissions by default
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: true,
        reason: "User has admin permissions",
      } as PermissionResult);
    });

    it("should process /admin command successfully", async () => {
      mockContext.message.text = "/admin";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.response).toContain("Panel de Administración");
      expect(mockPermissionService.checkPermission).toHaveBeenCalled();
    });

    it("should deny access when user lacks permissions", async () => {
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: false,
        reason: "Insufficient permissions",
      } as PermissionResult);

      mockContext.message.text = "/admin";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.response || result.error).toContain("Acceso Denegado");
    });

    it("should handle /log command", async () => {
      mockContext.message.text = "/log";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.response).toContain("Logs del sistema");
    });

    it("should handle /config command", async () => {
      mockContext.message.text = "/config";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.response).toContain("Configuración del Sistema");
    });

    it("should handle /restart command", async () => {
      mockContext.message.text = "/restart";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.response).toContain("Solicitud de reinicio");
    });

    it("should handle unknown admin command", async () => {
      mockContext.message.text = "/unknown";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.response || result.error).toContain(
        "Comando administrativo no reconocido"
      );
    });

    it("should handle errors gracefully", async () => {
      mockPermissionService.checkPermission.mockRejectedValue(
        new Error("Permission service error")
      );
      mockContext.message.text = "/admin";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.response || result.error).toContain("Acceso Denegado");
    });

    it("should handle context without user", async () => {
      mockContext.user = undefined;
      mockContext.message.text = "/admin";

      const result = await handler.handle(mockContext);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.response || result.error).toContain("Acceso Denegado");
    });
  });

  describe("getStats", () => {
    it("should return admin statistics", () => {
      const stats = handler.getAdminStats();

      expect(stats).toHaveProperty("totalAdminCommands");
      expect(stats).toHaveProperty("deniedCommands");
      expect(stats).toHaveProperty("successfulCommands");
      expect(stats).toHaveProperty("failedCommands");
      expect(stats).toHaveProperty("adminUsers");
      expect(stats).toHaveProperty("totalMessages");
      expect(stats).toHaveProperty("handledMessages");
    });

    it("should update statistics after processing commands", async () => {
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: true,
        reason: "User has admin permissions",
      } as PermissionResult);

      mockContext.message.text = "/admin";

      await handler.handle(mockContext);

      const stats = handler.getAdminStats();
      expect(stats.totalAdminCommands).toBeGreaterThan(0);
      expect(stats.successfulCommands).toBeGreaterThan(0);
    });
  });

  describe("getAvailableCommands", () => {
    it("should return list of available admin commands", () => {
      const commands = handler.getAvailableCommands();

      expect(commands).toHaveProperty("/admin");
      expect(commands).toHaveProperty("/log");
      expect(commands).toHaveProperty("/config");
      expect(commands).toHaveProperty("/restart");
      expect(commands["/admin"]).toBe("Panel de administración");
    });
  });

  describe("resetAdminStats", () => {
    it("should reset admin statistics", async () => {
      // Process a command to generate stats
      mockPermissionService.checkPermission.mockResolvedValue({
        granted: true,
        reason: "User has admin permissions",
      } as PermissionResult);

      await handler.handle(mockContext);

      let stats = handler.getAdminStats();
      expect(stats.totalAdminCommands).toBeGreaterThan(0);

      // Reset stats
      handler.resetAdminStats();

      stats = handler.getAdminStats();
      expect(stats.totalAdminCommands).toBe(0);
      expect(stats.successfulCommands).toBe(0);
      expect(stats.failedCommands).toBe(0);
      expect(stats.deniedCommands).toBe(0);
    });
  });
});
