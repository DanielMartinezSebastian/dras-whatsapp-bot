/**
 * Tests for Basic Commands Integration (Fixed)
 */

import { UserLevel } from '../src/types';

// Mock all dependencies before importing
jest.mock('../src/services/command-registry.service');
jest.mock('../src/services/whatsapp-bridge.service');
jest.mock('../src/services/context-manager.service');
jest.mock('../src/utils/logger');

import {
  registerBasicCommands,
  getCommandHandler,
  getCommandDefinition,
} from '../src/commands/registry';
import { CommandRegistryService } from '../src/services/command-registry.service';
import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';
import { ContextManagerService } from '../src/services/context-manager.service';
import { Logger } from '../src/utils/logger';

describe('Basic Commands Integration (Fixed)', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset singletons for testing
    (CommandRegistryService as any).instance = undefined;
    (WhatsAppBridgeService as any).instance = undefined;
    (ContextManagerService as any).instance = undefined;
    (Logger as any).instance = undefined;

    // Mock Logger
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      setLogLevel: jest.fn(),
      logLevel: 'info',
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // Mock CommandRegistryService with getAvailableCommands
    const mockCommandRegistry = {
      registerCommand: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      getAvailableCommands: jest.fn().mockReturnValue([
        {
          name: 'help',
          aliases: ['ayuda', 'comandos'],
          category: 'general',
          userLevel: UserLevel.USER,
          description: 'Muestra ayuda y comandos disponibles',
        },
        {
          name: 'status',
          aliases: ['estado', 'info'],
          category: 'general',
          userLevel: UserLevel.USER,
          description: 'Muestra el estado del bot',
        },
      ]),
      getRegisteredCommands: jest.fn().mockReturnValue([]),
      getCommand: jest.fn().mockImplementation((name: string) => {
        const commands = [
          {
            name: 'help',
            aliases: ['ayuda'],
            category: 'general',
            userLevel: UserLevel.USER,
            description: 'Muestra la ayuda del bot',
            examples: ['!help', '!help status'],
            enabled: true,
          },
          {
            name: 'status',
            aliases: ['estado', 'info'],
            category: 'general',
            userLevel: UserLevel.USER,
            description: 'Muestra el estado del bot',
            examples: ['!status'],
            enabled: true,
          },
        ];
        return commands.find(cmd => cmd.name === name || cmd.aliases?.includes(name));
      }),
      canUserExecute: jest.fn().mockReturnValue(true),
    };
    (CommandRegistryService.getInstance as jest.Mock).mockReturnValue(mockCommandRegistry);

    // Mock WhatsAppBridgeService
    const mockWhatsAppBridge = {
      getStatus: jest.fn().mockReturnValue({
        connected: true,
        uptime: 12345,
        messagesProcessed: 100,
        lastActivity: new Date().toISOString(),
        lastHealthCheck: new Date().toISOString(),
      }),
      getHealth: jest.fn().mockResolvedValue({
        status: 'connected',
        bridge_available: true,
        last_check: new Date().toISOString(),
      }),
      isAvailable: jest.fn().mockReturnValue(true),
    };
    (WhatsAppBridgeService.getInstance as jest.Mock).mockReturnValue(mockWhatsAppBridge);

    // Mock ContextManagerService
    const mockContextManager = {
      getStats: jest.fn().mockReturnValue({
        activeContexts: 2,
        totalHandlers: 3,
        totalDetections: 15,
        totalExecutions: 8,
      }),
      getStatistics: jest.fn().mockReturnValue({
        totalContexts: 5,
        activeContexts: 2,
        registeredHandlers: 3,
      }),
    };
    (ContextManagerService.getInstance as jest.Mock).mockReturnValue(mockContextManager);
  });

  describe('Command Registration', () => {
    test('should register basic commands without errors', async () => {
      await expect(registerBasicCommands()).resolves.not.toThrow();
    });
  });

  describe('Command Discovery', () => {
    test('should find help command by name', () => {
      const command = getCommandDefinition('help');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    test('should find help command by alias', () => {
      const command = getCommandDefinition('ayuda');
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    test('should find status command', () => {
      const command = getCommandDefinition('status');
      expect(command).toBeDefined();
      expect(command?.name).toBe('status');
    });

    test('should not find non-existent command', () => {
      const command = getCommandDefinition('nonexistent');
      expect(command).toBeNull();
    });
  });

  describe('Command Handlers', () => {
    test('should find handler for help command', () => {
      const handler = getCommandHandler('help');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    test('should find handler for status command', () => {
      const handler = getCommandHandler('status');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    test('should return null for non-existent command handler', () => {
      const handler = getCommandHandler('nonexistent');
      expect(handler).toBeNull();
    });
  });

  describe('Command Execution', () => {
    const mockMessage = {
      id: 'msg_123',
      content: '!help',
      user_id: 'user_123',
      whatsapp_message_id: 'wa_msg_123',
      message_type: 'text',
      is_from_bot: false,
      processed: false,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockContext = {
      user: {
        id: 'user_123',
        phone: '+1234567890',
        whatsapp_jid: '1234567890@s.whatsapp.net',
        display_name: 'Test User',
        userLevel: UserLevel.USER,
        level: UserLevel.USER,
        user_type: 'normal',
        language: 'es',
        is_registered: true,
        last_activity: new Date().toISOString(),
        preferences: {
          notifications: true,
          auto_reply: true,
          language: 'es',
          timezone: 'UTC',
          privacy_level: 'normal' as const,
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      config: null,
      logger: null,
      database: null,
      whatsappBridge: null,
      metadata: {},
    };

    test('should execute help command successfully', async () => {
      const handler = getCommandHandler('help');

      if (handler) {
        const result = await handler(mockMessage, mockContext);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        // Should contain general help content since we mocked available commands
        expect(result.message).toContain('DrasBot');
        expect(result.message).toContain('General');
      }
    });

    test('should execute status command successfully', async () => {
      const handler = getCommandHandler('status');

      if (handler) {
        const result = await handler(mockMessage, mockContext);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.message).toContain('Estado del DrasBot');
      }
    });

    test('should handle help command with specific command request', async () => {
      const handler = getCommandHandler('help');
      const helpMessage = { ...mockMessage, content: '!help status' };

      if (handler) {
        const result = await handler(helpMessage, mockContext);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        // Should return specific help for status command
        expect(result.message).toContain('status');
      }
    });
  });
});
