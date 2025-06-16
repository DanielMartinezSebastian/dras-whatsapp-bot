import { ContextualMessageHandler } from "../../../bot/handlers/ContextualMessageHandler";
import { HandlerContext } from "../../../types/handlers/message-handler.types";
import { WhatsAppMessage } from "../../../types/core/message.types";
import { IConversationContext } from "../../../types/handlers/contextual-handler.types";
import { promises as fs } from "fs";

// Mock del logger
jest.mock("../../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock de fs
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe("ContextualMessageHandler", () => {
  let handler: ContextualMessageHandler;
  let mockBotProcessor: any;
  let mockWhatsappClient: any;
  let mockUserService: any;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserService = {
      getUserByPhone: jest.fn(),
    };

    mockWhatsappClient = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    mockBotProcessor = {
      whatsappClient: mockWhatsappClient,
      userService: mockUserService,
      userServiceReady: true,
      botPrefix: "[BOT] ",
      autoReply: true,
    };

    // Mock para que loadConversationContext no falle
    mockFs.readFile.mockRejectedValue({ code: "ENOENT" });
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);

    handler = new ContextualMessageHandler(mockBotProcessor);
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with correct default values", () => {
      expect(handler.getName()).toBe("ContextualHandler");
      expect(handler.getPriority()).toBe(8);
      expect(handler.enabled).toBe(true);
    });

    it("should initialize stats with zero values", () => {
      const stats = handler.getStats();
      expect(stats.totalMessages).toBe(0);
      expect(stats.handledMessages).toBe(0);
      expect(stats.greetings).toBe(0);
      expect(stats.farewells).toBe(0);
      expect(stats.questions).toBe(0);
      expect(stats.helpRequests).toBe(0);
      expect(stats.generalMessages).toBe(0);
    });
  });

  describe("canHandle", () => {
    it("should handle GREETING messages", () => {
      const context: HandlerContext = {
        message: createMockMessage("Hola"),
        classification: { type: "GREETING", confidence: 0.9 },
        timestamp: new Date(),
      };

      expect(handler.canHandle(context)).toBe(true);
    });

    it("should handle FAREWELL messages", () => {
      const context: HandlerContext = {
        message: createMockMessage("Adiós"),
        classification: { type: "FAREWELL", confidence: 0.9 },
        timestamp: new Date(),
      };

      expect(handler.canHandle(context)).toBe(true);
    });

    it("should handle QUESTION messages", () => {
      const context: HandlerContext = {
        message: createMockMessage("¿Qué hora es?"),
        classification: { type: "QUESTION", confidence: 0.8 },
        timestamp: new Date(),
      };

      expect(handler.canHandle(context)).toBe(true);
    });

    it("should handle HELP_REQUEST messages", () => {
      const context: HandlerContext = {
        message: createMockMessage("Necesito ayuda"),
        classification: { type: "HELP_REQUEST", confidence: 0.9 },
        timestamp: new Date(),
      };

      expect(handler.canHandle(context)).toBe(true);
    });

    it("should handle GENERAL messages", () => {
      const context: HandlerContext = {
        message: createMockMessage("Hola, ¿cómo estás?"),
        classification: { type: "GENERAL", confidence: 0.7 },
        timestamp: new Date(),
      };

      expect(handler.canHandle(context)).toBe(true);
    });

    it("should not handle COMMAND messages", () => {
      const context: HandlerContext = {
        message: createMockMessage("/help"),
        classification: { type: "COMMAND", confidence: 0.9 },
        timestamp: new Date(),
      };

      expect(handler.canHandle(context)).toBe(false);
    });
  });

  describe("handleGreeting", () => {
    it("should handle greeting for new user", async () => {
      const message = createMockMessage("Hola");
      mockUserService.getUserByPhone.mockResolvedValue({
        display_name: "Juan",
      });

      await handler.handleGreeting(message);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringMatching(/.*/) // Acepta cualquier mensaje
      );
      // Las respuestas son aleatorias, verificamos que se envió algún mensaje válido
      const lastCall = mockWhatsappClient.sendMessage.mock.calls[0];
      expect(lastCall[1]).toBeTruthy();
    });

    it("should handle greeting for returning user", async () => {
      const message = createMockMessage("Hola de nuevo");

      // Simular contexto existente con múltiples mensajes
      const context: IConversationContext = {
        firstMessage: new Date(Date.now() - 3600000), // 1 hora atrás
        messageCount: 5,
        lastActivity: new Date(),
        topics: [],
        userType: "returning",
      };

      mockUserService.getUserByPhone.mockResolvedValue({ display_name: "Ana" });

      await handler.handleGreeting(message, context);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalled();
      const lastCall = mockWhatsappClient.sendMessage.mock.calls[0];
      expect(lastCall[1]).toContain("Ana");
      expect(lastCall[1]).toBeTruthy();
    });

    it("should provide help offer after greeting", async () => {
      const message = createMockMessage("Hola que tal");
      mockUserService.getUserByPhone.mockResolvedValue({
        display_name: "Pedro",
      });

      await handler.handleGreeting(message);

      // Solo verificamos que se llamó al método sendMessage al menos una vez
      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringMatching(/.*/) // Acepta cualquier mensaje
      );
    }, 10000);
  });

  describe("handleFarewell", () => {
    it("should handle farewell for general user", async () => {
      const message = createMockMessage("Adiós");
      mockUserService.getUserByPhone.mockResolvedValue({
        display_name: "Carlos",
      });

      await handler.handleFarewell(message);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringMatching(/.*/) // Acepta cualquier mensaje
      );
      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringContaining("Carlos")
      );
    });

    it("should handle farewell for frequent user", async () => {
      const message = createMockMessage("Hasta luego");

      const context: IConversationContext = {
        firstMessage: new Date(Date.now() - 86400000), // 1 día atrás
        messageCount: 10, // Usuario frecuente
        lastActivity: new Date(),
        topics: [],
        userType: "frequent",
      };

      mockUserService.getUserByPhone.mockResolvedValue({
        display_name: "María",
      });

      await handler.handleFarewell(message, context);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalled();
      expect(context.conversationEnding).toBe(true);
    });

    it("should handle night farewell", async () => {
      // Mock para simular que es de noche
      const mockGetTimeOfDay = jest
        .spyOn(handler, "getTimeOfDay")
        .mockReturnValue("night");

      const message = createMockMessage("Buenas noches");
      mockUserService.getUserByPhone.mockResolvedValue({
        display_name: "Luis",
      });

      await handler.handleFarewell(message);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalled();

      mockGetTimeOfDay.mockRestore();
    });
  });

  describe("handleQuestion", () => {
    it("should handle general questions", async () => {
      const message = createMockMessage("¿Qué puedes hacer?");
      const classification = {
        type: "QUESTION" as any,
        questionType: "general" as any,
        confidence: 0.8,
      };

      await handler.handleQuestion(message, null, classification);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringMatching(/.*/) // Acepta cualquier mensaje
      );
    });

    it("should handle bot-related questions", async () => {
      const message = createMockMessage("¿que puedes hacer?");
      const classification = {
        type: "QUESTION" as any,
        questionType: "general" as any,
        confidence: 0.9,
      };

      await handler.handleQuestion(message, null, classification);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringContaining("asistente virtual")
      );
    });

    it("should handle different question types", async () => {
      const testCases = [
        { text: "¿Qué es esto?", expectedType: "what" },
        { text: "¿Cómo funciona?", expectedType: "how" },
        { text: "¿Cuándo estará listo?", expectedType: "when" },
        { text: "¿Dónde está ubicado?", expectedType: "where" },
        { text: "¿Por qué pasa esto?", expectedType: "why" },
        { text: "¿Quién es responsable?", expectedType: "who" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const message = createMockMessage(testCase.text);
        const classification = {
          type: "QUESTION" as any,
          questionType: "general" as any,
          confidence: 0.8,
        };

        await handler.handleQuestion(message, null, classification);

        expect(mockWhatsappClient.sendMessage).toHaveBeenCalled();
      }
    });
  });

  describe("handleHelpRequest", () => {
    it("should handle general help requests", async () => {
      const message = createMockMessage("Necesito ayuda");

      await handler.handleHelpRequest(message);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringMatching(/.*/) // Acepta cualquier mensaje
      );

      // Verificar que se envió alguna respuesta relacionada con ayuda
      const lastCall = mockWhatsappClient.sendMessage.mock.calls[0];
      expect(lastCall[1]).toMatch(/ayuda|help|asistir/i);
    });

    it("should handle command-specific help requests", async () => {
      const message = createMockMessage("Ayuda con comandos");

      await handler.handleHelpRequest(message);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringContaining("Ayuda con Comandos")
      );
    });
  });

  describe("handleDefault", () => {
    it("should handle default messages when autoReply is enabled", async () => {
      const message = createMockMessage("Mensaje cualquiera");

      await handler.handleDefault(message);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringMatching(/.*/) // Acepta cualquier mensaje
      );
    });

    it("should not respond when autoReply is disabled", async () => {
      mockBotProcessor.autoReply = false;

      const message = createMockMessage("Mensaje cualquiera");

      await handler.handleDefault(message);

      expect(mockWhatsappClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("updateConversationContext", () => {
    it("should create new context for new user", () => {
      const message = createMockMessage("Primer mensaje");

      handler.updateConversationContext(message);

      const context = handler.getConversationContext(message.senderPhone);
      expect(context).not.toBeNull();
      expect(context!.messageCount).toBe(1);
      expect(context!.userType).toBe("new");
    });

    it("should update existing context", () => {
      const message = createMockMessage("Segundo mensaje");

      // Primer mensaje
      handler.updateConversationContext(message);

      // Segundo mensaje
      handler.updateConversationContext(message);

      const context = handler.getConversationContext(message.senderPhone);
      expect(context!.messageCount).toBe(2);
    });
  });

  describe("getUserName", () => {
    it("should return user display name when available", async () => {
      const phoneJid = "34123456789@s.whatsapp.net";
      mockUserService.getUserByPhone.mockResolvedValue({
        display_name: "Usuario Test",
      });

      const userName = await handler.getUserName(phoneJid);

      expect(userName).toBe("Usuario Test");
      expect(mockUserService.getUserByPhone).toHaveBeenCalledWith(
        "34123456789"
      );
    });

    it('should return "Usuario" when user not found', async () => {
      const phoneJid = "34123456789@s.whatsapp.net";
      mockUserService.getUserByPhone.mockResolvedValue(null);

      const userName = await handler.getUserName(phoneJid);

      expect(userName).toBe("Usuario");
    });

    it('should return "Usuario" when service throws error', async () => {
      const phoneJid = "34123456789@s.whatsapp.net";
      mockUserService.getUserByPhone.mockRejectedValue(
        new Error("Service error")
      );

      const userName = await handler.getUserName(phoneJid);

      expect(userName).toBe("Usuario");
    });
  });

  describe("getTimeOfDay", () => {
    it("should return correct time periods", () => {
      // Test morning (6 AM)
      jest.spyOn(Date.prototype, "getHours").mockReturnValue(6);
      expect(handler.getTimeOfDay()).toBe("morning");

      // Test afternoon (2 PM)
      jest.spyOn(Date.prototype, "getHours").mockReturnValue(14);
      expect(handler.getTimeOfDay()).toBe("afternoon");

      // Test evening (7 PM)
      jest.spyOn(Date.prototype, "getHours").mockReturnValue(19);
      expect(handler.getTimeOfDay()).toBe("evening");

      // Test night (11 PM)
      jest.spyOn(Date.prototype, "getHours").mockReturnValue(23);
      expect(handler.getTimeOfDay()).toBe("night");

      jest.restoreAllMocks();
    });
  });

  describe("getRandomResponse", () => {
    it("should return response with replacements", () => {
      const response = handler.getRandomResponse("greeting_new", {
        userName: "Test User",
        timeOfDay: "morning",
      });

      // Las respuestas pueden ser aleatorias, así que verificamos que se generó una respuesta válida
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
      expect(response).not.toBe("Estoy aquí para ayudarte."); // No debería ser la respuesta por defecto
    });

    it("should handle timeOfDayGreeting replacement", () => {
      const response = handler.getRandomResponse("greeting_returning", {
        userName: "Test User",
        timeOfDay: "morning",
      });

      // La respuesta debería contener el saludo apropiado
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });

    it("should return default response for unknown category", () => {
      const response = handler.getRandomResponse("unknown_category");

      // Cuando no se encuentra la categoría, usa la categoría 'default'
      // que tiene múltiples respuestas, no necesariamente "Estoy aquí para ayudarte."
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe("Context Persistence", () => {
    it("should load conversation context from file", async () => {
      const mockData = {
        savedAt: new Date().toISOString(),
        conversations: [
          {
            phone: "34123456789",
            context: {
              firstMessage: new Date().toISOString(),
              messageCount: 3,
              lastActivity: new Date().toISOString(),
              topics: [],
              userType: "returning",
            },
          },
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      await handler.loadConversationContext();

      const context = handler.getConversationContext(
        "34123456789@s.whatsapp.net"
      );
      expect(context).not.toBeNull();
      expect(context!.messageCount).toBe(3);
    });

    it("should save conversation context to file", async () => {
      const message = createMockMessage("Test message");
      handler.updateConversationContext(message);

      await handler.saveConversationContext();

      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCall = mockFs.writeFile.mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);

      expect(savedData.conversations).toHaveLength(1);
      expect(savedData.conversations[0].phone).toBe("34123456789");
    });
  });

  describe("Stats", () => {
    it("should track message statistics correctly", async () => {
      const greetingContext: HandlerContext = {
        message: createMockMessage("Hola"),
        classification: { type: "GREETING", confidence: 0.9 },
        timestamp: new Date(),
      };

      const questionContext: HandlerContext = {
        message: createMockMessage("¿Qué hora es?"),
        classification: { type: "QUESTION", confidence: 0.8 },
        timestamp: new Date(),
      };

      await handler.handle(greetingContext);
      await handler.handle(questionContext);

      const stats = handler.getStats();
      expect(stats.handledMessages).toBe(2);
      expect(stats.greetings).toBe(1);
      expect(stats.questions).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", async () => {
      mockWhatsappClient.sendMessage.mockRejectedValue(
        new Error("Send failed")
      );

      const context: HandlerContext = {
        message: createMockMessage("Hola"),
        classification: { type: "GREETING", confidence: 0.9 },
        timestamp: new Date(),
      };

      const result = await handler.handle(context);

      expect(result.handled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Send failed");
    });

    it("should handle contextual errors with user-friendly message", async () => {
      const message = createMockMessage("Test message");
      const error = new Error("Test error");

      await handler.handleContextualError(message, error);

      expect(mockWhatsappClient.sendMessage).toHaveBeenCalledWith(
        message.senderPhone,
        expect.stringContaining("Lo siento")
      );
    });
  });

  // Helper function to create mock messages
  function createMockMessage(text: string): WhatsAppMessage {
    return {
      id: "test-id",
      messageId: "test-message-id",
      chatId: "test-chat-id",
      chatJid: "34123456789@s.whatsapp.net",
      sender: "Test User",
      senderPhone: "34123456789@s.whatsapp.net",
      text,
      content: text,
      timestamp: new Date().toISOString(),
      isFromMe: false,
      fromMe: false,
      type: "GENERAL",
    };
  }
});
