import { UsersCommand } from "../../../bot/commands/admin/UsersCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logError: jest.fn(),
}));

// Mock del UserService
const mockUserService = {
  init: jest.fn().mockResolvedValue(undefined),
  getAllUsers: jest.fn().mockResolvedValue([]),
  getUsersByPage: jest.fn().mockResolvedValue({
    users: [],
    totalUsers: 0,
    totalPages: 0,
    currentPage: 1,
  }),
  searchUsers: jest.fn().mockResolvedValue([]),
  getUserByPhone: jest.fn().mockResolvedValue(null),
  updateUser: jest.fn().mockResolvedValue(true),
  updateUserByPhone: jest.fn().mockResolvedValue(true),
  deleteUser: jest.fn().mockResolvedValue(true),
  getUserStats: jest.fn().mockResolvedValue({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    usersByType: { admin: 0, customer: 0 },
    recentActivity: { last24h: 0, lastWeek: 0, lastMonth: 0 },
    totalMessages: 0,
    averageMessagesPerUser: 0,
  }),
};

jest.mock("../../../services/userService", () => ({
  UserService: jest.fn().mockImplementation(() => mockUserService),
}));

describe("UsersCommand", () => {
  let command: UsersCommand;
  let mockAdminUser: User;
  let mockRegularUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    // Resetear mocks
    jest.clearAllMocks();

    // Configurar comportamiento de mocks para que los tests pasen
    mockUserService.searchUsers.mockImplementation((term: string) => {
      if (term.toLowerCase().includes("juan")) {
        return Promise.resolve([mockRegularUser]); // Devolver un usuario para que el test pase
      }
      return Promise.resolve([]);
    });

    mockUserService.getUserByPhone.mockImplementation((phone: string) => {
      if (phone === "123456789") {
        return Promise.resolve(mockAdminUser); // Devolver usuario encontrado
      }
      return Promise.resolve(null);
    });

    mockUserService.updateUserByPhone.mockImplementation(
      (phone: string, updates: any) => {
        if (phone === "123456789") {
          return Promise.resolve({
            ...mockAdminUser,
            ...updates,
            display_name: updates.display_name || mockAdminUser.display_name,
            user_type: updates.user_type || mockAdminUser.user_type,
          });
        }
        return Promise.resolve(false);
      }
    );
    mockUserService.deleteUser.mockResolvedValue(true);

    mockUserService.getUserStats.mockResolvedValue({
      totalUsers: 5,
      activeUsers: 3,
      inactiveUsers: 2,
      usersByType: { admin: 1, customer: 4 },
      recentActivity: { last24h: 2, lastWeek: 5, lastMonth: 8 },
      totalMessages: 1250,
      averageMessagesPerUser: 250,
    });

    command = new UsersCommand();

    mockAdminUser = {
      id: 1,
      whatsapp_jid: "1234567890@s.whatsapp.net",
      phone_number: "1234567890",
      display_name: "Admin User",
      user_type: "admin",
      created_at: new Date("2024-01-15T10:00:00Z"),
      updated_at: new Date("2024-01-20T15:30:00Z"),
      last_message_at: new Date("2024-01-20T15:30:00Z"),
      total_messages: 150,
      is_active: true,
    };

    mockRegularUser = {
      id: 2,
      whatsapp_jid: "0987654321@s.whatsapp.net",
      phone_number: "0987654321",
      display_name: "Regular User",
      user_type: "customer",
      created_at: new Date("2024-01-10T10:00:00Z"),
      updated_at: new Date("2024-01-18T15:30:00Z"),
      last_message_at: new Date("2024-01-18T15:30:00Z"),
      total_messages: 25,
      is_active: true,
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
        senderName: "Admin User",
        text: "!users",
        content: "!users",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        type: "COMMAND",
        user: mockAdminUser,
      },
      user: mockAdminUser,
      args: [],
      fullText: "!users",
      commandName: "users",
      isFromAdmin: true,
      timestamp: new Date(),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = command.metadata;

      expect(metadata.name).toBe("users");
      expect(metadata.aliases).toEqual([
        "usuarios",
        "user-admin",
        "gestionar-usuarios",
      ]);
      expect(metadata.description).toBe(
        "Administración completa de usuarios del sistema"
      );
      expect(metadata.syntax).toBe(
        "!users [list|search|info|update|delete] [parámetros]"
      );
      expect(metadata.category).toBe("admin");
      expect(metadata.permissions).toEqual(["admin"]);
      expect(metadata.cooldown).toBe(2);
      expect(metadata.isAdmin).toBe(true);
      expect(metadata.isSensitive).toBe(true);
      expect(metadata.examples).toHaveLength(5);
    });
  });

  describe("execute", () => {
    describe("access control", () => {
      it("should deny access to non-admin users", async () => {
        const nonAdminContext = {
          ...baseContext,
          user: mockRegularUser,
          isFromAdmin: false,
        };

        const result = await command.execute(nonAdminContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Acceso Denegado**");
        expect(result.response).toContain(
          "Este comando requiere permisos de administrador"
        );
        expect(result.shouldReply).toBe(true);
      });

      it("should allow access to admin users", async () => {
        const adminContext = {
          ...baseContext,
          args: ["list"],
          fullText: "!users list",
        };

        const result = await command.execute(adminContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          "👥 **Lista de Usuarios del Sistema**"
        );
        expect(result.shouldReply).toBe(true);
      });
    });

    describe("list action", () => {
      it("should list users with pagination", async () => {
        const listContext = {
          ...baseContext,
          args: ["list"],
          fullText: "!users list",
        };

        const result = await command.execute(listContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          "👥 **Lista de Usuarios del Sistema**"
        );
        expect(result.response).toContain("📊 **Resumen:**");
        expect(result.response).toContain("usuarios total");
        expect(result.response).toContain("💡 **Comandos útiles:**");
        expect(result.shouldReply).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.action).toBe("list");
      });

      it("should handle pagination parameters", async () => {
        const listContext = {
          ...baseContext,
          args: ["list", "5", "2"],
          fullText: "!users list 5 2",
        };

        const result = await command.execute(listContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          "👥 **Lista de Usuarios del Sistema**"
        );
        expect(result.data?.limit).toBe(5);
        expect(result.data?.page).toBe(2);
      });
    });

    describe("search action", () => {
      it("should search users by term", async () => {
        const searchContext = {
          ...baseContext,
          args: ["search", "Juan"],
          fullText: "!users search Juan",
        };

        const result = await command.execute(searchContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          '🔍 **Resultados de búsqueda para:** "Juan"'
        );
        expect(result.data?.action).toBe("search");
        expect(result.data?.searchTerm).toBe("Juan");
      });

      it("should require search term", async () => {
        const searchContext = {
          ...baseContext,
          args: ["search"],
          fullText: "!users search",
        };

        const result = await command.execute(searchContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Parámetro requerido**");
        expect(result.response).toContain("Especifica un término de búsqueda");
      });
    });

    describe("info action", () => {
      it("should show user information", async () => {
        const infoContext = {
          ...baseContext,
          args: ["info", "123456789"],
          fullText: "!users info 123456789",
        };

        const result = await command.execute(infoContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain("👤 **Información de Usuario**");
        expect(result.response).toContain("📋 **Datos básicos:**");
        expect(result.response).toContain("📊 **Estado:**");
        expect(result.response).toContain("🛠️ **Acciones disponibles:**");
        expect(result.data?.action).toBe("info");
        expect(result.data?.targetPhone).toBe("123456789");
      });

      it("should require phone parameter", async () => {
        const infoContext = {
          ...baseContext,
          args: ["info"],
          fullText: "!users info",
        };

        const result = await command.execute(infoContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Parámetro requerido**");
        expect(result.response).toContain("Especifica el teléfono del usuario");
      });
    });

    describe("update action", () => {
      it("should update user type", async () => {
        const updateContext = {
          ...baseContext,
          args: ["update", "123456789", "type", "admin"],
          fullText: "!users update 123456789 type admin",
        };

        const result = await command.execute(updateContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain("✅ **Usuario actualizado**");
        expect(result.response).toContain("Tipo cambiado a: **Administrador**");
        expect(result.data?.action).toBe("update");
        expect(result.data?.field).toBe("type");
        expect(result.data?.newValue).toBe("admin");
      });

      it("should update user name", async () => {
        const updateContext = {
          ...baseContext,
          args: ["update", "123456789", "name", "Nuevo", "Nombre"],
          fullText: "!users update 123456789 name Nuevo Nombre",
        };

        const result = await command.execute(updateContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain("✅ **Usuario actualizado**");
        expect(result.response).toContain(
          "Nombre cambiado a: **Nuevo Nombre**"
        );
      });

      it("should reject invalid user type", async () => {
        const updateContext = {
          ...baseContext,
          args: ["update", "123456789", "type", "invalid"],
          fullText: "!users update 123456789 type invalid",
        };

        const result = await command.execute(updateContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Tipo de usuario inválido**");
        expect(result.response).toContain("✅ **Tipos válidos:**");
      });

      it("should require all parameters for update", async () => {
        const updateContext = {
          ...baseContext,
          args: ["update", "123456789"],
          fullText: "!users update 123456789",
        };

        const result = await command.execute(updateContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Parámetros requeridos**");
        expect(result.response).toContain("🔧 **Campos disponibles:**");
      });
    });

    describe("stats action", () => {
      it("should show user statistics", async () => {
        const statsContext = {
          ...baseContext,
          args: ["stats"],
          fullText: "!users stats",
        };

        const result = await command.execute(statsContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          "📊 **Estadísticas de Usuarios del Sistema**"
        );
        expect(result.response).toContain("👥 **Resumen general:**");
        expect(result.response).toContain("📋 **Distribución por tipo:**");
        expect(result.response).toContain("🔥 **Actividad reciente:**");
        expect(result.response).toContain("💬 **Mensajería:**");
        expect(result.data?.action).toBe("stats");
      });
    });

    describe("delete action", () => {
      it("should require confirmation for deletion", async () => {
        const deleteContext = {
          ...baseContext,
          args: ["delete", "123456789"],
          fullText: "!users delete 123456789",
        };

        const result = await command.execute(deleteContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("⚠️ **Confirmación requerida**");
        expect(result.response).toContain("!users delete 123456789 confirm");
        expect(result.response).toContain(
          "❗ **ADVERTENCIA:** Esta acción es irreversible"
        );
      });

      it("should delete user with confirmation", async () => {
        const deleteContext = {
          ...baseContext,
          args: ["delete", "123456789", "confirm"],
          fullText: "!users delete 123456789 confirm",
        };

        const result = await command.execute(deleteContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain("✅ **Usuario eliminado**");
        expect(result.response).toContain(
          "🗑️ El usuario **Admin User** con teléfono **123456789** ha sido eliminado"
        );
        expect(result.data?.action).toBe("delete");
        expect(result.data?.deletedPhone).toBe("123456789");
      });

      it("should require phone parameter for deletion", async () => {
        const deleteContext = {
          ...baseContext,
          args: ["delete"],
          fullText: "!users delete",
        };

        const result = await command.execute(deleteContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Parámetro requerido**");
        expect(result.response).toContain(
          "Especifica el teléfono del usuario a eliminar"
        );
      });
    });

    describe("help action", () => {
      it("should show help when no action provided", async () => {
        const helpContext = {
          ...baseContext,
          args: [],
          fullText: "!users",
        };

        const result = await command.execute(helpContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          "👥 **Comando de Administración de Usuarios**"
        );
        expect(result.response).toContain("📖 **Comandos disponibles:**");
        expect(result.response).toContain("**📋 Consultas:**");
        expect(result.response).toContain("**🔧 Administración:**");
        expect(result.response).toContain("**👥 Tipos de usuario:**");
        expect(result.response).toContain("💡 **Ejemplos de uso:**");
        expect(result.data?.action).toBe("help");
      });

      it("should show help for unknown action", async () => {
        const helpContext = {
          ...baseContext,
          args: ["unknown"],
          fullText: "!users unknown",
        };

        const result = await command.execute(helpContext);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          "👥 **Comando de Administración de Usuarios**"
        );
        expect(result.data?.action).toBe("help");
      });
    });

    describe("error handling", () => {
      it("should handle execution errors gracefully", async () => {
        // Simulate an error by passing invalid context
        const invalidContext = {
          ...baseContext,
          user: null as any,
        };

        const result = await command.execute(invalidContext);

        expect(result.success).toBe(false);
        expect(result.response).toContain("❌ **Acceso Denegado**");
      });
    });
  });
});
