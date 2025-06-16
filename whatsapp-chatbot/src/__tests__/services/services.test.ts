import { UserService } from "../../services/userService";
import { PermissionService } from "../../services/permissionService";
import { User, UserType } from "../../types/core/user.types";
import { WhatsAppMessage } from "../../types/core/message.types";

describe("Services Migration", () => {
  describe("UserService", () => {
    let userService: UserService;

    beforeAll(async () => {
      userService = new UserService();
      await userService.init();
    });

    afterAll(async () => {
      await userService.close();
    });

    it("should create UserService instance", () => {
      expect(userService).toBeDefined();
      expect(userService).toBeInstanceOf(UserService);
    });

    it("should classify user type correctly", () => {
      const mockMessage: WhatsAppMessage = {
        id: "test_msg_1",
        messageId: "test_msg_1",
        chatId: "test@s.whatsapp.net",
        chatJid: "test@s.whatsapp.net",
        sender: "Test User",
        senderPhone: "test",
        text: "Hola, soy un cliente",
        content: "Hola, soy un cliente",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      };

      // Este test verifica que el método existe y puede ser llamado
      expect(() => {
        // @ts-ignore - accessing private method for testing
        userService.classifyUserType(mockMessage);
      }).not.toThrow();
    });

    it("should provide basic user stats", async () => {
      const stats = await userService.getUserStats(
        "nonexistent@s.whatsapp.net"
      );
      expect(stats).toBeNull(); // Usuario no existe
    });
  });

  describe("PermissionService", () => {
    let permissionService: PermissionService;

    beforeAll(() => {
      permissionService = new PermissionService();
    });

    afterAll(() => {
      permissionService.close();
    });

    it("should create PermissionService instance", () => {
      expect(permissionService).toBeDefined();
      expect(permissionService).toBeInstanceOf(PermissionService);
    });

    it("should check permissions for different user types", () => {
      const adminUser: User = {
        whatsapp_jid: "admin@s.whatsapp.net",
        phone_number: "admin",
        display_name: "Admin User",
        user_type: "admin",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      const customerUser: User = {
        whatsapp_jid: "customer@s.whatsapp.net",
        phone_number: "customer",
        display_name: "Customer User",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      expect(permissionService.hasPermission(adminUser, "admin")).toBe(true);
      expect(permissionService.hasPermission(customerUser, "admin")).toBe(
        false
      );
      expect(permissionService.hasPermission(customerUser, "user")).toBe(true);
    });

    it("should provide usage stats", () => {
      const stats = permissionService.getUserUsageStats("test@s.whatsapp.net");
      expect(stats).toHaveProperty("commandsLastHour", 0);
      expect(stats).toHaveProperty("totalCommands", 0);
      expect(stats).toHaveProperty("deniedAttempts", 0);
    });

    it("should provide user commands based on user type", () => {
      const adminCommands = permissionService.getUserCommands("admin");
      const customerCommands = permissionService.getUserCommands("customer");

      expect(adminCommands.length).toBeGreaterThan(customerCommands.length);
      expect(customerCommands).toContain("help");
      expect(adminCommands).toContain("users");
    });
  });
});
