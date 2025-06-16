import { RegistrationService } from "../../services/RegistrationService";
import { User } from "../../types/core/user.types";
import { WhatsAppMessage } from "../../types/core/message.types";
import { RegistrationResult } from "../../types/services/registration-service.types";

// Mock del logger
jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe("RegistrationService", () => {
  let registrationService: RegistrationService;
  let mockUpdateUserNameCallback: jest.Mock;
  let mockSendMessageCallback: jest.Mock;
  let mockNotifyUserRegisteredCallback: jest.Mock;

  beforeEach(() => {
    registrationService = new RegistrationService();

    // Configurar mocks de callbacks
    mockUpdateUserNameCallback = jest.fn();
    mockSendMessageCallback = jest.fn();
    mockNotifyUserRegisteredCallback = jest.fn();

    registrationService.setUpdateUserNameCallback(mockUpdateUserNameCallback);
    registrationService.setSendMessageCallback(mockSendMessageCallback);
    registrationService.setNotifyUserRegisteredCallback(
      mockNotifyUserRegisteredCallback
    );
  });

  // Limpiar intervalos después de cada test
  afterEach(() => {
    jest.clearAllTimers();
    registrationService.close();
  });

  describe("needsNameRegistration", () => {
    it("debe retornar true si no hay usuario", () => {
      expect(registrationService.needsNameRegistration(null)).toBe(true);
    });

    it("debe retornar true si el usuario está en proceso de registro", () => {
      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "Test User",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
        metadata: {
          registrationData: {
            needsNameRegistration: true,
            registrationStep: "awaiting_name",
          },
        },
      };

      expect(registrationService.needsNameRegistration(user)).toBe(true);
    });

    it("debe retornar true si no hay display_name", () => {
      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      expect(registrationService.needsNameRegistration(user)).toBe(true);
    });

    it("debe retornar true si el display_name es igual al número de teléfono", () => {
      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "123456789",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      expect(registrationService.needsNameRegistration(user)).toBe(true);
    });

    it("debe retornar false si el usuario tiene un nombre válido", () => {
      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "Juan Perez",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      expect(registrationService.needsNameRegistration(user)).toBe(false);
    });
  });

  describe("isPhoneNumberAsName", () => {
    it("debe retornar true si el nombre contiene el número de teléfono", () => {
      expect(
        registrationService.isPhoneNumberAsName("123456789", "123456789")
      ).toBe(true);
      expect(
        registrationService.isPhoneNumberAsName(
          "+34 123 456 789",
          "34123456789"
        )
      ).toBe(true);
    });

    it("debe retornar false para nombres válidos", () => {
      expect(
        registrationService.isPhoneNumberAsName("Juan Perez", "123456789")
      ).toBe(false);
      expect(
        registrationService.isPhoneNumberAsName("Maria", "987654321")
      ).toBe(false);
    });

    it("debe retornar false para nombres cortos sin números", () => {
      expect(registrationService.isPhoneNumberAsName("Ana", "123456789")).toBe(
        false
      );
      expect(registrationService.isPhoneNumberAsName("", "123456789")).toBe(
        false
      );
    });
  });

  describe("validateName", () => {
    it("debe rechazar nombres vacíos", () => {
      const result = registrationService.validateName("");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("escribe tu nombre");
    });

    it("debe rechazar nombres que son solo números", () => {
      const result = registrationService.validateName("123456789");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("solo números");
    });

    it("debe rechazar nombres muy cortos", () => {
      const result = registrationService.validateName("A");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("muy corto");
    });

    it("debe rechazar nombres muy largos", () => {
      const longName = "A".repeat(60);
      const result = registrationService.validateName(longName);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("muy largo");
    });

    it("debe rechazar nombres con caracteres especiales inválidos", () => {
      const result = registrationService.validateName("Juan@#$%");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("caracteres no válidos");
    });

    it("debe rechazar palabras prohibidas", () => {
      const result = registrationService.validateName("botadmin");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("palabras no permitidas");
    });

    it("debe aceptar nombres válidos", () => {
      const validNames = ["Juan", "María José", "Ana-Lucía", "José María"];

      validNames.forEach((name) => {
        const result = registrationService.validateName(name);
        expect(result.isValid).toBe(true);
        expect(result.cleanName).toBe(name);
      });
    });

    it("debe rechazar nombres que coinciden con número de teléfono", () => {
      const result = registrationService.validateName("123456789", "123456789");
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("número de teléfono");
    });
  });

  describe("startRegistration", () => {
    it("debe iniciar un nuevo registro correctamente", async () => {
      const message: WhatsAppMessage = {
        id: "1",
        messageId: "1",
        chatId: "123456789@s.whatsapp.net",
        chatJid: "123456789@s.whatsapp.net",
        sender: "123456789@s.whatsapp.net",
        senderPhone: "123456789",
        text: "Hola",
        content: "Hola",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      };

      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      const result = await registrationService.startRegistration(message, user);

      expect(result.success).toBe(true);
      expect(result.message).toBe("registration_started");
      expect(mockSendMessageCallback).toHaveBeenCalledWith(
        message.chatJid,
        expect.stringContaining("¿Cuál es tu nombre?")
      );
      expect(
        registrationService.pendingRegistrations.has(message.chatJid)
      ).toBe(true);
    });
  });

  describe("processNameResponse", () => {
    it("debe procesar una respuesta de nombre válida", async () => {
      const message: WhatsAppMessage = {
        id: "1",
        messageId: "1",
        chatId: "123456789@s.whatsapp.net",
        chatJid: "123456789@s.whatsapp.net",
        sender: "123456789@s.whatsapp.net",
        senderPhone: "123456789",
        text: "Juan Perez",
        content: "Juan Perez",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      };

      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      // Configurar el mock para retornar un usuario actualizado
      const updatedUser: User = { ...user, display_name: "Juan Perez" };
      mockUpdateUserNameCallback.mockResolvedValue(updatedUser);

      // Primero iniciar el registro
      await registrationService.startRegistration(message, user);

      // Luego procesar la respuesta
      const result = await registrationService.processNameResponse(
        message,
        user
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("registration_completed");
      expect(result.user?.display_name).toBe("Juan Perez");
      expect(mockUpdateUserNameCallback).toHaveBeenCalledWith(
        user,
        "Juan Perez",
        false
      );
      expect(mockSendMessageCallback).toHaveBeenCalledWith(
        message.chatJid,
        expect.stringContaining("¡Perfecto, Juan Perez!")
      );
    });

    it("debe rechazar un nombre inválido y permitir reintentos", async () => {
      const message: WhatsAppMessage = {
        id: "1",
        messageId: "1",
        chatId: "123456789@s.whatsapp.net",
        chatJid: "123456789@s.whatsapp.net",
        sender: "123456789@s.whatsapp.net",
        senderPhone: "123456789",
        text: "123456789",
        content: "123456789", // Nombre inválido (solo números)
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      };

      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      // Primero iniciar el registro
      await registrationService.startRegistration(message, user);

      // Procesar respuesta inválida
      const result = await registrationService.processNameResponse(
        message,
        user
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe("invalid_name");
      expect(result.attempts).toBe(1);
      expect(mockSendMessageCallback).toHaveBeenCalledWith(
        message.chatJid,
        expect.stringContaining("número de teléfono")
      );
    });
  });

  describe("handleMaxAttempts", () => {
    it("debe asignar un nombre temporal cuando se exceden los intentos", async () => {
      const message: WhatsAppMessage = {
        id: "1",
        messageId: "1",
        chatId: "123456789@s.whatsapp.net",
        chatJid: "123456789@s.whatsapp.net",
        sender: "123456789@s.whatsapp.net",
        senderPhone: "123456789",
        text: "invalid name",
        content: "invalid name",
        timestamp: new Date().toISOString(),
        isFromMe: false,
        fromMe: false,
      };

      const user: User = {
        id: 1,
        whatsapp_jid: "123456789@s.whatsapp.net",
        phone_number: "123456789",
        display_name: "",
        user_type: "customer",
        created_at: new Date(),
        updated_at: new Date(),
        total_messages: 0,
        is_active: true,
      };

      const tempUser: User = { ...user, display_name: "Usuario_6789" };
      mockUpdateUserNameCallback.mockResolvedValue(tempUser);

      const result = await registrationService.handleMaxAttempts(message, user);

      expect(result.success).toBe(true);
      expect(result.message).toBe("temp_name_assigned");
      expect(mockUpdateUserNameCallback).toHaveBeenCalledWith(
        user,
        "Usuario_6789",
        true
      );
      expect(mockSendMessageCallback).toHaveBeenCalledWith(
        message.chatJid,
        expect.stringContaining("Usuario_6789")
      );
    });
  });

  describe("getTimeBasedGreeting", () => {
    it("debe retornar saludo apropiado según la hora", () => {
      // Mock de Date para controlar la hora
      const originalDate = Date;

      // Mañana (10 AM)
      global.Date = class extends originalDate {
        getHours() {
          return 10;
        }
      } as any;
      expect(registrationService.getTimeBasedGreeting()).toBe("¡Buenos días!");

      // Tarde (15 PM)
      global.Date = class extends originalDate {
        getHours() {
          return 15;
        }
      } as any;
      expect(registrationService.getTimeBasedGreeting()).toBe(
        "¡Buenas tardes!"
      );

      // Noche (20 PM)
      global.Date = class extends originalDate {
        getHours() {
          return 20;
        }
      } as any;
      expect(registrationService.getTimeBasedGreeting()).toBe(
        "¡Buenas noches!"
      );

      // Restaurar Date original
      global.Date = originalDate;
    });
  });

  describe("cleanupExpiredRegistrations", () => {
    it("debe limpiar registros expirados", () => {
      const oldRegistration = {
        startTime: new Date(Date.now() - 2000000), // 2 millones de ms atrás (más de 30 min)
        attempts: 1,
        originalMessage: {} as WhatsAppMessage,
      };

      const recentRegistration = {
        startTime: new Date(),
        attempts: 1,
        originalMessage: {} as WhatsAppMessage,
      };

      registrationService.pendingRegistrations.set("old_user", oldRegistration);
      registrationService.pendingRegistrations.set(
        "recent_user",
        recentRegistration
      );

      registrationService.cleanupExpiredRegistrations();

      expect(registrationService.pendingRegistrations.has("old_user")).toBe(
        false
      );
      expect(registrationService.pendingRegistrations.has("recent_user")).toBe(
        true
      );
    });
  });

  describe("getStats", () => {
    it("debe retornar estadísticas correctas", () => {
      const stats = registrationService.getStats();

      expect(stats).toHaveProperty("pendingRegistrations");
      expect(stats).toHaveProperty("initialized");
      expect(stats).toHaveProperty("config");
      expect(typeof stats.pendingRegistrations).toBe("number");
      expect(typeof stats.initialized).toBe("boolean");
    });
  });
});
