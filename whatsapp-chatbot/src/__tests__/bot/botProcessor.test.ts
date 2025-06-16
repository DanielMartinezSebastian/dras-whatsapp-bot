// Mock logger antes de cualquier import
jest.doMock("../../utils/logger", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logWarning: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockLogger,
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logWarning: jest.fn(),
  };
});

// Mock fs for ContextualMessageHandler
jest.doMock("fs", () => ({
  promises: {
    readFile: jest
      .fn()
      .mockRejectedValue(new Error("ENOENT: no such file or directory")),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

import { BotProcessor } from "../../bot/core/botProcessor";
import { WhatsAppMessage } from "../../types/core/message.types";
import { User } from "../../types/core/user.types";

// Mock data
const mockMessage: WhatsAppMessage = {
  id: "test-message-1",
  messageId: "test-message-1",
  chatId: "test-chat",
  chatJid: "1234567890@s.whatsapp.net",
  sender: "1234567890@s.whatsapp.net",
  senderPhone: "1234567890",
  text: "hola",
  content: "hola",
  timestamp: new Date().toISOString(),
  isFromMe: false,
  fromMe: false,
  type: "GENERAL" as const,
};

const mockUser: User = {
  id: 1,
  whatsapp_jid: "1234567890@s.whatsapp.net",
  phone_number: "1234567890",
  display_name: "Test User",
  user_type: "customer",
  created_at: new Date(),
  updated_at: new Date(),
  last_message_at: new Date(),
  total_messages: 1,
  is_active: true,
  metadata: {},
};

describe("BotProcessor Migration", () => {
  let processor: BotProcessor;

  beforeEach(async () => {
    // Configurar variables de entorno para el test
    process.env.AUTO_REPLY = "true";
    process.env.USE_NEW_COMMANDS = "true";
    process.env.BOT_NAME = "TestBot";
    process.env.COMMAND_PREFIX = "/";

    // Mock de WhatsApp client para tests
    const mockWhatsAppClient = {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
      isConnected: jest.fn().mockReturnValue(true),
      getConnectionState: jest.fn().mockReturnValue("open"),
      close: jest.fn().mockResolvedValue(undefined),
    };

    processor = new BotProcessor(mockWhatsAppClient);
    // Dar tiempo para la inicialización
    await processor.waitForInitialization();
  });

  afterEach(async () => {
    await processor.shutdown();
    // Limpiar variables de entorno
    delete process.env.AUTO_REPLY;
    delete process.env.USE_NEW_COMMANDS;
    delete process.env.BOT_NAME;
    delete process.env.COMMAND_PREFIX;
  });

  describe("Initialization", () => {
    it("should create processor instance", () => {
      expect(processor).toBeDefined();
      expect(processor).toBeInstanceOf(BotProcessor);
    });

    it("should initialize services successfully", async () => {
      await processor.waitForInitialization();
      const isReady = processor.isReady();
      expect(isReady).toBe(true);
    });

    it("should provide configuration", () => {
      const config = processor.getConfig();
      expect(config).toBeDefined();
      expect(config.botName).toBeDefined();
      expect(config.commandPrefix).toBeDefined();
    });
  });

  describe("Message Processing", () => {
    beforeEach(async () => {
      await processor.waitForInitialization();
    });

    it("should process greeting messages", async () => {
      const result = await processor.processMessage(mockMessage, mockUser);

      expect(result.success).toBe(true);
      expect(result.classification.type).toBe("greeting");
      // El ContextualMessageHandler maneja mensajes contextuales silenciosamente
      // Las respuestas se envían directamente, no a través del BotProcessor
      expect(result.shouldReply).toBe(false);
      expect(result.response).toBe("");
    });

    it("should process commands", async () => {
      const commandMessage = {
        ...mockMessage,
        text: "/help",
        id: "test-command-1",
      };
      const result = await processor.processMessage(commandMessage, mockUser);

      expect(result.success).toBe(true);
      expect(result.classification.type).toBe("command");
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeDefined();
    });

    it("should process ping command", async () => {
      const pingMessage = { ...mockMessage, text: "/ping", id: "test-ping-1" };
      const result = await processor.processMessage(pingMessage, mockUser);

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });

    it("should process status command", async () => {
      const statusMessage = {
        ...mockMessage,
        text: "/status",
        id: "test-status-1",
      };
      const result = await processor.processMessage(statusMessage, mockUser);

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });

    it("should handle duplicate messages", async () => {
      // Procesar el mismo mensaje dos veces
      await processor.processMessage(mockMessage, mockUser);
      const result = await processor.processMessage(mockMessage, mockUser);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(false);
      expect(result.response).toContain("ya procesado");
    });
  });

  describe("Message Classification", () => {
    beforeEach(async () => {
      await processor.waitForInitialization();
    });

    it("should classify farewell messages", async () => {
      const farewellMessage = {
        ...mockMessage,
        text: "adiós",
        id: "test-farewell-1",
      };
      const result = await processor.processMessage(farewellMessage, mockUser);

      expect(result.classification.type).toBe("farewell");
      // Los mensajes contextuales se manejan silenciosamente
      expect(result.response).toBe("");
    });

    it("should classify help requests", async () => {
      const helpMessage = {
        ...mockMessage,
        text: "necesito ayuda",
        id: "test-help-1",
      };
      const result = await processor.processMessage(helpMessage, mockUser);

      expect(result.classification.type).toBe("help");
      // Los mensajes contextuales se manejan silenciosamente
      expect(result.response).toBe("");
    });

    it("should classify questions", async () => {
      const questionMessage = {
        ...mockMessage,
        text: "¿cómo estás?",
        id: "test-question-1",
      };
      const result = await processor.processMessage(questionMessage, mockUser);

      expect(result.classification.type).toBe("question");
      // Los mensajes contextuales se manejan silenciosamente
      expect(result.response).toBe("");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await processor.waitForInitialization();
    });

    it("should track processing statistics", async () => {
      const stats1 = processor.getStats();
      expect(stats1.processedMessages).toBe(0);

      await processor.processMessage(mockMessage, mockUser);

      const stats2 = processor.getStats();
      expect(stats2.processedMessages).toBe(1);
      expect(stats2.startTime).toBeDefined();
      expect(stats2.uptime).toBeGreaterThan(0);
    });

    it("should track command statistics", async () => {
      const commandMessage = {
        ...mockMessage,
        text: "/ping",
        id: "test-stat-cmd-1",
      };

      const stats1 = processor.getStats();
      await processor.processMessage(commandMessage, mockUser);
      const stats2 = processor.getStats();

      expect(stats2.totalCommands).toBe(stats1.totalCommands + 1);
    });
  });

  describe("Configuration", () => {
    it("should update configuration", () => {
      const newConfig = { botName: "Test Bot Updated" };
      processor.updateConfig(newConfig);

      const config = processor.getConfig();
      expect(config.botName).toBe("Test Bot Updated");
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await processor.waitForInitialization();
    });

    it("should handle errors gracefully", async () => {
      // Crear un mensaje con datos inválidos que podría causar error
      const invalidMessage = {
        ...mockMessage,
        text: null as any,
        id: "test-error-1",
      };

      const result = await processor.processMessage(invalidMessage, mockUser);
      expect(result).toBeDefined();
      expect(result.classification).toBeDefined();
    });
  });

  describe("Handler System Integration", () => {
    it("should initialize handler registry", async () => {
      const handlerStats = processor.getHandlerStats();
      expect(handlerStats.totalHandlers).toBeGreaterThan(0);
      expect(handlerStats.enabledHandlers).toBeGreaterThan(0);
    });

    it("should register multiple handlers", async () => {
      const registeredHandlers = processor.getRegisteredHandlers();
      expect(registeredHandlers).toContain("command");
      expect(registeredHandlers).toContain("admin");
      expect(registeredHandlers).toContain("ContextualHandler");
      expect(registeredHandlers.length).toBeGreaterThanOrEqual(3);
    });

    it("should process messages using handler system", async () => {
      await processor.initializeServices();

      const commandMessage: WhatsAppMessage = {
        ...mockMessage,
        text: "/ping",
        content: "/ping",
        type: "COMMAND",
      };

      const result = await processor.processMessage(commandMessage, mockUser);

      expect(result.success).toBe(true);
      expect(result.shouldReply).toBe(true);
      expect(result.response).toBeDefined();
    });

    it("should handle contextual messages through handler system", async () => {
      await processor.initializeServices();

      const contextualMessage: WhatsAppMessage = {
        ...mockMessage,
        text: "¿Cómo estás?",
        content: "¿Cómo estás?",
        type: "GENERAL",
      };

      const result = await processor.processMessage(
        contextualMessage,
        mockUser
      );
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });

    it("should handle greeting messages", async () => {
      await processor.initializeServices();

      const greetingMessage: WhatsAppMessage = {
        ...mockMessage,
        text: "Hola",
        content: "Hola",
        type: "GREETING",
      };

      const result = await processor.processMessage(greetingMessage, mockUser);
      expect(result.success).toBe(true);
      // Los mensajes contextuales se manejan silenciosamente
      expect(result.shouldReply).toBe(false);
      expect(result.response).toBe("");
    });

    it("should provide fallback responses when no handlers match", async () => {
      await processor.initializeServices();

      const unknownMessage: WhatsAppMessage = {
        ...mockMessage,
        text: "mensaje muy específico que ningún handler debería manejar xyx123",
        content:
          "mensaje muy específico que ningún handler debería manejar xyx123",
        type: "GENERAL",
      };

      const result = await processor.processMessage(unknownMessage, mockUser);
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });
  });
});
