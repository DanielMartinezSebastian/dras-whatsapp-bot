// Mock del logger
jest.mock("../../../utils/logger", () => ({
  default: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logWarning: jest.fn(),
  },
}));

import { CommandRegistry } from "../../../bot/commands/core/CommandRegistry";
import {
  PingCommand,
  HelpCommand,
  InfoCommand,
  StatusCommand,
} from "../../../bot/commands/basic";

describe("Command Integration", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe("Basic Commands Registration", () => {
    test("should register all basic commands successfully", () => {
      const pingCommand = new PingCommand();
      const helpCommand = new HelpCommand();
      const infoCommand = new InfoCommand();
      const statusCommand = new StatusCommand();

      expect(registry.register(pingCommand)).toBe(true);
      expect(registry.register(helpCommand)).toBe(true);
      expect(registry.register(infoCommand)).toBe(true);
      expect(registry.register(statusCommand)).toBe(true);

      const stats = registry.getStats();
      expect(stats.totalCommands).toBe(4);
      expect(stats.categoryCounts.basic).toBe(4);
    });

    test("should retrieve commands by name and alias", () => {
      const pingCommand = new PingCommand();
      const helpCommand = new HelpCommand();
      const infoCommand = new InfoCommand();
      const statusCommand = new StatusCommand();

      registry.register(pingCommand);
      registry.register(helpCommand);
      registry.register(infoCommand);
      registry.register(statusCommand);

      // Test by name
      expect(registry.get("ping")).toBeTruthy();
      expect(registry.get("help")).toBeTruthy();
      expect(registry.get("info")).toBeTruthy();
      expect(registry.get("status")).toBeTruthy();

      // Test by aliases
      expect(registry.get("ayuda")).toBeTruthy(); // HelpCommand alias
      expect(registry.get("h")).toBeTruthy(); // HelpCommand alias
      expect(registry.get("information")).toBeTruthy(); // InfoCommand alias
      expect(registry.get("estado")).toBeTruthy(); // StatusCommand alias
    });

    test("should categorize commands correctly", () => {
      const pingCommand = new PingCommand();
      const helpCommand = new HelpCommand();
      const infoCommand = new InfoCommand();

      registry.register(pingCommand);
      registry.register(helpCommand);
      registry.register(infoCommand);

      const basicCommands = registry.getByCategory("basic");
      expect(basicCommands).toHaveLength(3);

      const commandNames = basicCommands.map((cmd) => cmd.metadata.name);
      expect(commandNames).toContain("ping");
      expect(commandNames).toContain("help");
      expect(commandNames).toContain("info");
    });
  });

  describe("Command System Integration", () => {
    test("should execute commands through registry", async () => {
      const helpCommand = new HelpCommand();
      registry.register(helpCommand);

      const retrievedCommand = registry.get("help");
      expect(retrievedCommand).toBeTruthy();

      if (retrievedCommand) {
        const mockContext = {
          message: {
            id: "test-message-id",
            messageId: "test-msg-1",
            chatId: "test-chat",
            chatJid: "test@g.us",
            sender: "sender",
            senderPhone: "123456789",
            text: "!help",
            content: "!help",
            timestamp: new Date().toISOString(),
            isFromMe: false,
            fromMe: false,
          },
          args: [],
          fullText: "!help",
          commandName: "help",
          isFromAdmin: false,
          timestamp: new Date(),
          user: {
            id: 1,
            whatsapp_jid: "123456789@s.whatsapp.net",
            phone_number: "123456789",
            display_name: "Test User",
            user_type: "customer" as const,
            created_at: new Date(),
            updated_at: new Date(),
            total_messages: 5,
            is_active: true,
          },
        };

        const result = await retrievedCommand.execute(mockContext);
        expect(result.success).toBe(true);
        expect(result.response).toContain("Sistema de Ayuda");
      }
    });

    test("should handle command statistics", () => {
      const pingCommand = new PingCommand();
      registry.register(pingCommand);

      const retrievedCommand = registry.get("ping");
      expect(retrievedCommand).toBeTruthy();

      const stats = registry.getStats();
      expect(stats.totalCommands).toBe(1);
      expect(typeof stats.totalExecutions).toBe("number");
    });
  });
});
