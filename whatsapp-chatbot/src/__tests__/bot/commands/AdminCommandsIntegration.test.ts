import { DiagnosticCommand } from "../../../bot/commands/admin/DiagnosticCommand";
import { UsersCommand } from "../../../bot/commands/admin/UsersCommand";
import { CommandRegistry } from "../../../bot/commands/core/CommandRegistry";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock de UserService para UsersCommand
jest.mock("../../../services/userService", () => ({
  UserService: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    getAllUsers: jest.fn().mockResolvedValue([
      {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "Test User 1",
        user_type: "admin",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 10,
        is_active: true,
      },
      {
        id: 2,
        whatsapp_jid: "987654321@s.whatsapp.net",
        phone_number: "987654321",
        display_name: "Test User 2",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 5,
        is_active: true,
      },
    ]),
    searchUsers: jest.fn().mockResolvedValue([]),
    getUserByPhone: jest.fn().mockResolvedValue(null),
    updateUser: jest.fn().mockResolvedValue(true),
    deleteUser: jest.fn().mockResolvedValue(true),
    getUserStats: jest.fn().mockResolvedValue({
      totalUsers: 2,
      activeUsers: 2,
      inactiveUsers: 0,
      usersByType: {
        admin: 1,
        customer: 1,
        business: 0,
      },
      recentActivity: {
        last24h: 2,
        lastWeek: 2,
        lastMonth: 2,
      },
      totalMessages: 15,
      averageMessagesPerUser: 7.5,
      newUsersToday: 0,
      newUsersThisWeek: 1,
      newUsersThisMonth: 2,
    }),
    getRecentActivity: jest.fn().mockResolvedValue([]),
  })),
}));

describe("Admin Commands Integration", () => {
  let registry: CommandRegistry;
  let mockAdminUser: User;
  let mockRegularUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    registry = new CommandRegistry();

    mockAdminUser = {
      id: 1,
      whatsapp_jid: "123456789@s.whatsapp.net",
      phone_number: "123456789",
      display_name: "Admin User",
      user_type: "admin",
      created_at: new Date(),
      updated_at: new Date(),
      total_messages: 0,
      is_active: true,
    };

    mockRegularUser = {
      id: 2,
      whatsapp_jid: "987654321@s.whatsapp.net",
      phone_number: "987654321",
      display_name: "Regular User",
      user_type: "customer",
      created_at: new Date(),
      updated_at: new Date(),
      total_messages: 0,
      is_active: true,
    };

    baseContext = {
      message: {
        id: "test-msg-1",
        messageId: "test-msg-1",
        chatId: "test-chat",
        chatJid: "test-chat@g.us",
        chatName: "Test Chat",
        sender: mockAdminUser.whatsapp_jid,
        senderPhone: mockAdminUser.phone_number,
        senderName: mockAdminUser.display_name,
        text: "!test",
        content: "!test",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        user: mockAdminUser,
      },
      user: mockAdminUser,
      args: [],
      commandName: "test",
      fullText: "!test",
      isFromAdmin: true,
      timestamp: new Date(),
    };
  });

  describe("Command Registration", () => {
    it("should register admin commands successfully", () => {
      const diagnosticCommand = new DiagnosticCommand();
      const usersCommand = new UsersCommand();

      registry.register(diagnosticCommand);
      registry.register(usersCommand);

      expect(registry.get("diagnostic")).toBeDefined();
      expect(registry.get("users")).toBeDefined();
    });

    it("should find admin commands by aliases", () => {
      const diagnosticCommand = new DiagnosticCommand();
      registry.register(diagnosticCommand);

      expect(registry.get("diagnostico")).toBeDefined();
      expect(registry.get("diag")).toBeDefined();
      expect(registry.get("status-system")).toBeDefined();
    });

    it("should categorize admin commands correctly", () => {
      const diagnosticCommand = new DiagnosticCommand();
      const usersCommand = new UsersCommand();

      expect(diagnosticCommand.metadata.category).toBe("admin");
      expect(usersCommand.metadata.category).toBe("admin");
      expect(diagnosticCommand.metadata.isAdmin).toBe(true);
      expect(usersCommand.metadata.isAdmin).toBe(true);
    });
  });

  describe("Admin Access Control Integration", () => {
    let diagnosticCommand: DiagnosticCommand;
    let usersCommand: UsersCommand;

    beforeEach(() => {
      diagnosticCommand = new DiagnosticCommand();
      usersCommand = new UsersCommand();
    });

    it("should deny access to non-admin users for all admin commands", async () => {
      const nonAdminContext = {
        ...baseContext,
        user: mockRegularUser,
        isFromAdmin: false,
      };

      const diagnosticResult = await diagnosticCommand.execute({
        ...nonAdminContext,
        commandName: "diagnostic",
      });
      const usersResult = await usersCommand.execute({
        ...nonAdminContext,
        commandName: "users",
      });

      expect(diagnosticResult.success).toBe(false);
      expect(diagnosticResult.response).toContain("🚫 Acceso denegado");

      expect(usersResult.success).toBe(false);
      expect(usersResult.response).toContain("❌ **Acceso Denegado**");
    });

    it("should allow access to admin users for all admin commands", async () => {
      const adminContext = {
        ...baseContext,
        user: mockAdminUser,
        isFromAdmin: true,
      };

      const diagnosticResult = await diagnosticCommand.execute({
        ...adminContext,
        commandName: "diagnostic",
      });
      const usersResult = await usersCommand.execute({
        ...adminContext,
        args: ["list"],
        commandName: "users",
      });

      expect(diagnosticResult.success).toBe(true);
      expect(usersResult.success).toBe(true);
      expect(diagnosticResult.response).not.toContain("Acceso denegado");
      expect(usersResult.response).not.toContain("Acceso denegado");
    });
  });

  describe("Command Execution Flow", () => {
    let diagnosticCommand: DiagnosticCommand;
    let usersCommand: UsersCommand;

    beforeEach(() => {
      diagnosticCommand = new DiagnosticCommand();
      usersCommand = new UsersCommand();
      registry.register(diagnosticCommand);
      registry.register(usersCommand);
    });

    it("should execute diagnostic command through registry", async () => {
      const context = {
        ...baseContext,
        commandName: "diagnostic",
        fullText: "!diagnostic",
      };

      const command = registry.get("diagnostic");
      expect(command).toBeDefined();

      if (command) {
        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.response).toContain("DIAGNÓSTICO DEL SISTEMA");
      }
    });

    it("should execute users command through registry", async () => {
      const context = {
        ...baseContext,
        args: ["list"],
        commandName: "users",
        fullText: "!users list",
      };

      const command = registry.get("users");
      expect(command).toBeDefined();

      if (command) {
        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.response).toContain("Lista de Usuarios del Sistema");
      }
    });

    it("should handle command aliases correctly", async () => {
      const diagnosticResult = await registry.get("diagnostico")?.execute({
        ...baseContext,
        commandName: "diagnostico",
      });

      expect(diagnosticResult?.success).toBe(true);
      expect(diagnosticResult?.response).toContain("DIAGNÓSTICO DEL SISTEMA");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle various error scenarios consistently", async () => {
      const diagnosticCommand = new DiagnosticCommand();
      const usersCommand = new UsersCommand();

      // Test error handling for invalid contexts
      const invalidContext = {
        ...baseContext,
        user: undefined,
      };

      const diagnosticResult = await diagnosticCommand.execute(invalidContext);
      const usersResult = await usersCommand.execute(invalidContext);

      expect(diagnosticResult.success).toBe(false);
      expect(usersResult.success).toBe(false);
      expect(diagnosticResult.response).toContain("Acceso denegado");
      expect(usersResult.response).toContain("Acceso Denegado");
    });
  });

  describe("Data Consistency", () => {
    it("should return consistent metadata structure", async () => {
      const diagnosticCommand = new DiagnosticCommand();
      const usersCommand = new UsersCommand();

      const diagnosticResult = await diagnosticCommand.execute(baseContext);
      const usersResult = await usersCommand.execute({
        ...baseContext,
        args: ["list"],
        commandName: "users",
      });

      expect(diagnosticResult.data).toBeDefined();
      expect(usersResult.data).toBeDefined();

      expect(diagnosticResult.data?.commandName).toBe("diagnostic");
      expect(usersResult.data?.commandName).toBe("users");

      expect(diagnosticResult.data?.executionTime).toBeGreaterThanOrEqual(0);
      expect(usersResult.data?.executionTime).toBeGreaterThanOrEqual(0);

      expect(diagnosticResult.data?.timestamp).toBeInstanceOf(Date);
      expect(usersResult.data?.timestamp).toBeInstanceOf(Date);
    });

    it("should include user information in results", async () => {
      const diagnosticCommand = new DiagnosticCommand();
      const usersCommand = new UsersCommand();

      const diagnosticResult = await diagnosticCommand.execute(baseContext);
      const usersResult = await usersCommand.execute({
        ...baseContext,
        args: ["list"],
        commandName: "users",
      });

      expect(diagnosticResult.data?.userId).toBe("1");
      expect(usersResult.data?.userId).toBe("1");
    });
  });

  describe("Performance and Responsiveness", () => {
    it("should execute admin commands within reasonable time", async () => {
      const usersCommand = new UsersCommand();
      const start = Date.now();

      const result = await usersCommand.execute({
        ...baseContext,
        args: ["list"],
        commandName: "users",
      });

      const executionTime = Date.now() - start;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.data?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple concurrent admin command executions", async () => {
      const usersCommand = new UsersCommand();
      const diagnosticCommand = new DiagnosticCommand();

      const promises = [
        usersCommand.execute({
          ...baseContext,
          args: ["list"],
          commandName: "users",
        }),
        diagnosticCommand.execute({
          ...baseContext,
          commandName: "diagnostic",
        }),
        usersCommand.execute({
          ...baseContext,
          args: ["stats"],
          commandName: "users",
        }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });
});
