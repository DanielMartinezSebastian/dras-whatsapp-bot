import { ProfileCommand } from "../../../bot/commands/user/ProfileCommand";
import { CommandContext } from "../../../types/commands";
import { User } from "../../../types/core";

// Mock logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

describe("ProfileCommand", () => {
  let profileCommand: ProfileCommand;
  let mockUser: User;
  let mockAdminUser: User;
  let baseContext: CommandContext;

  beforeEach(() => {
    profileCommand = new ProfileCommand();

    mockUser = {
      id: 1,
      whatsapp_jid: "1234567890@s.whatsapp.net",
      phone_number: "1234567890",
      display_name: "Test User",
      user_type: "customer",
      created_at: new Date("2024-01-15T10:00:00Z"),
      updated_at: new Date("2024-01-20T15:30:00Z"),
      last_message_at: new Date("2024-01-20T15:30:00Z"),
      total_messages: 25,
      is_active: true,
      metadata: {
        language: "es",
        timezone: "Europe/Madrid",
        preferences: {
          notifications: true,
          theme: "light",
        },
      },
    };

    mockAdminUser = {
      ...mockUser,
      user_type: "admin",
      display_name: "Admin User",
      total_messages: 100,
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
        text: "!profile",
        content: "!profile",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
        type: "COMMAND",
        user: mockUser,
      },
      user: mockUser,
      args: [],
      fullText: "!profile",
      commandName: "profile",
      isFromAdmin: false,
      timestamp: new Date(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      const metadata = profileCommand.metadata;

      expect(metadata.name).toBe("profile");
      expect(metadata.aliases).toContain("perfil");
      expect(metadata.aliases).toContain("mi-perfil");
      expect(metadata.aliases).toContain("info-personal");
      expect(metadata.description).toContain("perfil de usuario");
      expect(metadata.category).toBe("user");
      expect(metadata.permissions).toContain("user");
      expect(metadata.isAdmin).toBe(false);
      expect(metadata.isSensitive).toBe(false);
      expect(metadata.examples).toBeDefined();
      expect(metadata.examples!.length).toBeGreaterThan(0);
    });
  });

  describe("execute", () => {
    it("should show user profile for registered users", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("**TU PERFIL DE USUARIO**");
      expect(result.response).toContain("Test User");
      expect(result.response).toContain("customer");
      expect(result.response).toContain("1234567890");
      expect(result.response).toContain("**INFORMACIÓN PERSONAL:**");
      expect(result.response).toContain("**FECHAS:**");
      expect(result.response).toContain("**ESTADÍSTICAS:**");
      expect(result.response).toContain("**CONFIGURACIÓN:**");
      expect(result.response).toContain("**ACCIONES DISPONIBLES:**");
      expect(result.shouldReply).toBe(true);
    });

    it("should show admin profile with admin emoji", async () => {
      const context = { ...baseContext, user: mockAdminUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("👑 **TU PERFIL DE USUARIO**");
      expect(result.response).toContain("admin");
      expect(result.response).toContain("Administrador del sistema");
      expect(result.response).toContain("Admin User");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle different user types with appropriate emojis", async () => {
      const userTypes = [
        { type: "customer", emoji: "👤", description: "Cliente registrado" },
        {
          type: "employee",
          emoji: "💼",
          description: "Empleado de la empresa",
        },
        {
          type: "provider",
          emoji: "🏢",
          description: "Proveedor de servicios",
        },
        { type: "friend", emoji: "👫", description: "Amigo personal" },
        { type: "familiar", emoji: "👨‍👩‍👧‍👦", description: "Miembro de la familia" },
        { type: "block", emoji: "🚫", description: "Usuario bloqueado" },
      ];

      for (const userType of userTypes) {
        const testUser = { ...mockUser, user_type: userType.type as any };
        const context = { ...baseContext, user: testUser };

        const result = await profileCommand.execute(context);

        expect(result.success).toBe(true);
        expect(result.response).toContain(
          `${userType.emoji} **TU PERFIL DE USUARIO**`
        );
        expect(result.response).toContain(userType.description);
      }
    });

    it("should deny access to unregistered users", async () => {
      const context = { ...baseContext, user: undefined };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain(
        "❌ Perfil no disponible - usuario no registrado"
      );
      expect(result.response).toContain(
        "Debes estar registrado para ver tu perfil"
      );
      expect(result.shouldReply).toBe(true);
    });

    it("should show user statistics", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Interacciones totales: 25");
      expect(result.response).toContain("Comandos ejecutados:");
      expect(result.response).toContain("Tiempo promedio:");
      expect(result.response).toContain("Confianza clasificación:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show configuration and metadata when available", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("**CONFIGURACIÓN:**");
      expect(result.response).toContain("Idioma: es");
      expect(result.response).toContain("Zona horaria: Europe/Madrid");
      expect(result.response).toContain("Preferencias: 2 configuradas");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle user without metadata gracefully", async () => {
      const userWithoutMetadata = { ...mockUser, metadata: undefined };
      const context = { ...baseContext, user: userWithoutMetadata };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("**TU PERFIL DE USUARIO**");
      expect(result.response).not.toContain("**CONFIGURACIÓN:**");
      expect(result.shouldReply).toBe(true);
    });

    it("should format dates correctly", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Registrado:");
      expect(result.response).toContain("Última actividad:");
      expect(result.response).toContain("Tiempo activo:");
      expect(result.shouldReply).toBe(true);
    });

    it("should show activity time calculation", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Tiempo activo:");
      // Should contain either "días", "mes", "meses", "año", or "años"
      expect(result.response).toMatch(
        /Tiempo activo: \d+\s+(día|días|mes|meses|año|años)/
      );
      expect(result.shouldReply).toBe(true);
    });

    it("should show active status", async () => {
      const activeUser = { ...mockUser, is_active: true };
      const inactiveUser = { ...mockUser, is_active: false };

      let context = { ...baseContext, user: activeUser };
      let result = await profileCommand.execute(context);
      expect(result.response).toContain("🟢 Activo");

      context = { ...baseContext, user: inactiveUser };
      result = await profileCommand.execute(context);
      expect(result.response).toContain("🔴 Inactivo");
    });

    it("should include helpful action suggestions", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("**ACCIONES DISPONIBLES:**");
      expect(result.response).toContain("!usertype para cambiar tu tipo");
      expect(result.response).toContain("!permissions para ver tus permisos");
      expect(result.response).toContain("!help para ver comandos");
      expect(result.shouldReply).toBe(true);
    });

    it("should include consultation timestamp", async () => {
      const context = { ...baseContext, user: mockUser };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("🕒 Consultado:");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle missing last_message_at gracefully", async () => {
      const userWithoutLastMessage = {
        ...mockUser,
        last_message_at: undefined,
      };
      const context = { ...baseContext, user: userWithoutLastMessage };

      const result = await profileCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.response).toContain("Última actividad: No disponible");
      expect(result.shouldReply).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      // Create a context that might cause an error
      const invalidUser = { ...mockUser, created_at: "invalid-date" as any };
      const context = { ...baseContext, user: invalidUser };

      const result = await profileCommand.execute(context);

      // Should either succeed with fallback values or fail gracefully
      expect(result.shouldReply).toBe(true);
      if (!result.success) {
        expect(result.response).toContain("❌ Error obteniendo perfil");
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("canExecute", () => {
    it("should return true for any user (profile is accessible to all registered users)", () => {
      expect(profileCommand.canExecute(mockUser)).toBe(true);
      expect(profileCommand.canExecute(mockAdminUser)).toBe(true);
    });
  });

  describe("validate", () => {
    it("should validate command context", () => {
      const validation = profileCommand.validate(baseContext);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation with invalid context", () => {
      const invalidContext = { ...baseContext, message: undefined } as any;
      const validation = profileCommand.validate(invalidContext);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
