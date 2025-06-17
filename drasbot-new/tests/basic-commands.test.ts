/**
 * Tests for Basic Commands Integration
 */

import { UserLevel } from '../src/types';
import { registerBasicCommands, getCommandHandler, getCommandDefinition } from '../src/commands/registry';

describe('Basic Commands Integration', () => {
  beforeAll(() => {
    // Mock all services
    jest.doMock('../src/utils/logger', () => ({
      Logger: { 
        getInstance: () => ({
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        })
      },
    }));

    jest.doMock('../src/services/command-registry.service', () => ({
      CommandRegistryService: { 
        getInstance: () => ({
          registerCommand: jest.fn(),
          initialize: jest.fn(),
          shutdown: jest.fn(),
        })
      },
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register basic commands without errors', async () => {
      await expect(registerBasicCommands()).resolves.not.toThrow();
    });
  });

  describe('Command Discovery', () => {
    it('should find help command by name', () => {
      const command = getCommandDefinition('help');
      
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
      expect(command?.aliases).toContain('ayuda');
      expect(command?.userLevel).toBe(UserLevel.USER);
    });

    it('should find help command by alias', () => {
      const command = getCommandDefinition('ayuda');
      
      expect(command).toBeDefined();
      expect(command?.name).toBe('help');
    });

    it('should find status command', () => {
      const command = getCommandDefinition('status');
      
      expect(command).toBeDefined();
      expect(command?.name).toBe('status');
      expect(command?.category).toBe('general');
    });

    it('should find config command', () => {
      const command = getCommandDefinition('config');
      
      expect(command).toBeDefined();
      expect(command?.name).toBe('config');
      expect(command?.category).toBe('user');
    });

    it('should not find non-existent command', () => {
      const command = getCommandDefinition('nonexistent');
      
      expect(command).toBeNull();
    });
  });

  describe('Command Handlers', () => {
    it('should find handler for help command', () => {
      const handler = getCommandHandler('help');
      
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should find handler for status command', () => {
      const handler = getCommandHandler('status');
      
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should find handler for config command', () => {
      const handler = getCommandHandler('config');
      
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should find handler for registration command', () => {
      const handler = getCommandHandler('registro');
      
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should return null for non-existent command handler', () => {
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
        user_level: UserLevel.USER,
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

    it('should execute help command successfully', async () => {
      const handler = getCommandHandler('help');
      
      if (handler) {
        const result = await handler(mockMessage, mockContext);
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.message).toContain('DrasBot - Comandos Disponibles');
      }
    });

    it('should execute status command successfully', async () => {
      // Mock WhatsAppBridgeService and ContextManagerService
      jest.doMock('../src/services/whatsapp-bridge.service', () => ({
        WhatsAppBridgeService: {
          getInstance: () => ({
            getStatus: () => ({
              connected: true,
              lastHealthCheck: new Date().toISOString(),
            }),
          }),
        },
      }));

      jest.doMock('../src/services/context-manager.service', () => ({
        ContextManagerService: {
          getInstance: () => ({
            getStats: () => ({
              activeContexts: 0,
              totalHandlers: 3,
              totalDetections: 0,
              totalExecutions: 0,
            }),
          }),
        },
      }));

      const handler = getCommandHandler('status');
      
      if (handler) {
        const result = await handler(mockMessage, mockContext);
        
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.message).toContain('Estado del DrasBot');
      }
    });
  });
});
