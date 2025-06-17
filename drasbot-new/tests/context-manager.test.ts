/**
 * Tests for ContextManagerService
 */

import { ContextManagerService } from '../src/services/context-manager.service';
import { ConfigService } from '../src/services/config.service';
import {
  ContextType,
  UserLevel,
  User,
  Message,
  ContextHandler,
} from '../src/types';

// Mock all dependencies
jest.mock('../src/services/config.service', () => ({
  ConfigService: {
    getInstance: jest.fn(() => ({
      getValue: jest.fn((key: string, defaultValue: any) => {
        if (key === 'context') {
          return {
            timeout: 300000,
            maxActiveContexts: 100,
            cleanupInterval: 60000,
          };
        }
        return defaultValue;
      }),
      setValue: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
    })),
  },
}));
jest.mock('../src/services/database.service', () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      shutdown: jest.fn(),
    })),
  },
}));
jest.mock('../src/services/plugin-manager.service', () => ({
  PluginManagerService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      shutdown: jest.fn(),
    })),
  },
}));
jest.mock('../src/utils/logger', () => ({
  Logger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));

describe('ContextManagerService', () => {
  let contextManager: ContextManagerService;
  let mockConfigService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get service instances and setup mocks
    mockConfigService = {
      getValue: jest.fn(),
      setValue: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };

    // Mock the ConfigService.getInstance to return our mock
    (ConfigService.getInstance as jest.Mock).mockReturnValue(mockConfigService);

    contextManager = ContextManagerService.getInstance();

    // Setup default mocks
    mockConfigService.getValue.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          context: {
            timeout: 300000, // 5 minutes
            maxActiveContexts: 100,
          },
        };
        return config[key as keyof typeof config] || defaultValue;
      }
    );
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ContextManagerService.getInstance();
      const instance2 = ContextManagerService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(contextManager.initialize()).resolves.not.toThrow();
    });

    it('should load configuration during initialization', async () => {
      // Reset the mock to track calls
      mockConfigService.getValue.mockClear();
      
      await contextManager.initialize();

      expect(mockConfigService.getValue).toHaveBeenCalledWith('context', {});
    });
  });

  describe('Handler Registration', () => {
    const mockHandler: ContextHandler = {
      name: 'test_handler',
      description: 'Test handler',
      handler: jest.fn(),
      metadata: {
        keywords: ['test'],
        userLevel: UserLevel.USER,
      },
    };

    it('should register a new handler successfully', () => {
      const result = contextManager.registerHandler(mockHandler);

      expect(result).toBe(true);
    });

    it('should not register a handler with the same name twice', () => {
      contextManager.registerHandler(mockHandler);
      const result = contextManager.registerHandler(mockHandler);

      expect(result).toBe(false);
    });

    it('should get a registered handler by context type', () => {
      contextManager.registerHandler(mockHandler);
      const handler = contextManager.getHandler(ContextType.CONVERSATION);

      expect(handler).toBeDefined();
    });

    it('should return null for non-existent handler', () => {
      const handler = contextManager.getHandler(ContextType.SUPPORT);

      expect(handler).toBeNull();
    });

    it('should get all registered handlers', () => {
      contextManager.registerHandler(mockHandler);
      const handlers = contextManager.getRegisteredHandlers();

      expect(handlers).toContain(mockHandler);
    });

    it('should unregister a handler successfully', () => {
      contextManager.registerHandler(mockHandler);
      
      // The test_handler will be assigned to CONVERSATION type by default
      const assignedHandler = contextManager.getHandler(ContextType.CONVERSATION);
      expect(assignedHandler).toBeDefined();
      
      const result = contextManager.unregisterHandler(ContextType.CONVERSATION);

      expect(result).toBe(true);
      expect(contextManager.getHandler(ContextType.CONVERSATION)).toBeNull();
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = contextManager.unregisterHandler(ContextType.SUPPORT);

      expect(result).toBe(false);
    });
  });

  describe('Context Detection', () => {
    const mockUser: User = {
      id: 123,
      jid: 'user@s.whatsapp.net',
      phoneNumber: '+1234567890',
      name: 'Test User',
      userLevel: UserLevel.USER,
      isRegistered: true,
      registrationDate: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      banned: false,
      preferences: {
        notifications: true,
        auto_reply: false,
        language: 'es',
        timezone: 'UTC',
        privacy_level: 'normal',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockHandler: ContextHandler = {
      name: 'test_context_handler',
      description: 'Test context handler',
      handler: jest.fn(),
      metadata: {
        keywords: ['help', 'ayuda'],
        userLevel: UserLevel.USER,
      },
    };

    it('should detect context when keywords match', async () => {
      contextManager.registerHandler(mockHandler);

      const result = await contextManager.detectContext(
        'necesito ayuda',
        mockUser
      );

      expect(result.detected).toBe(true);
      expect(result.handler).toBe(mockHandler);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should not detect context when no keywords match', async () => {
      contextManager.registerHandler(mockHandler);

      const result = await contextManager.detectContext(
        'random message',
        mockUser
      );

      expect(result.detected).toBe(false);
      expect(result.handler).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should respect user level requirements', async () => {
      const adminHandler: ContextHandler = {
        name: 'admin_handler',
        description: 'Admin only handler',
        handler: jest.fn(),
        metadata: {
          keywords: ['admin'],
          userLevel: UserLevel.ADMIN,
        },
      };

      contextManager.registerHandler(adminHandler);

      const result = await contextManager.detectContext(
        'admin command',
        mockUser
      );

      expect(result.detected).toBe(false);
    });
  });

  describe('Context Management', () => {
    const userId = 'user_123';

    it('should create a new context', async () => {
      const result = await contextManager.createContext(
        userId,
        ContextType.REGISTRATION,
        {
          step: 'start',
        }
      );

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.contextType).toBe(ContextType.REGISTRATION);
      expect(result.active).toBe(true);
    });

    it('should get active context for user', async () => {
      await contextManager.createContext(userId, ContextType.REGISTRATION);
      const result = await contextManager.getActiveContext(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
    });

    it('should update context data', async () => {
      const context = await contextManager.createContext(
        userId,
        ContextType.REGISTRATION
      );
      const result = await contextManager.updateContext(context.id, {
        step: 'name',
      });

      expect(result).toBe(true);
    });

    it('should expire a context', async () => {
      const context = await contextManager.createContext(
        userId,
        ContextType.REGISTRATION
      );
      const result = await contextManager.expireContext(context.id);

      expect(result).toBe(true);
    });

    it('should clear all user contexts', async () => {
      await contextManager.createContext(userId, ContextType.REGISTRATION);
      const result = await contextManager.clearUserContexts(userId);

      expect(result).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should get current configuration', () => {
      const config = contextManager.getConfig();

      expect(config).toBeDefined();
      expect(config.timeout).toBeDefined();
      expect(config.maxActiveContexts).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        timeout: 600000, // 10 minutes
        maxActiveContexts: 200,
      };

      contextManager.updateConfig(newConfig);
      const config = contextManager.getConfig();

      expect(config.timeout).toBe(600000);
      expect(config.maxActiveContexts).toBe(200);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      const stats = contextManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.activeContexts).toBeDefined();
      expect(stats.totalHandlers).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(contextManager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Context Execution', () => {
    const mockUser: User = {
      id: 456,
      jid: 'user@s.whatsapp.net',
      phoneNumber: '+1234567890',
      name: 'Test User',
      userLevel: UserLevel.USER,
      isRegistered: true,
      registrationDate: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      banned: false,
      preferences: {
        notifications: true,
        auto_reply: false,
        language: 'es',
        timezone: 'UTC',
        privacy_level: 'normal',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMessage: Message = {
      id: 'msg_123',
      user_id: '456',
      whatsapp_message_id: 'wa_msg_123',
      content: 'test message',
      message_type: 'text',
      is_from_bot: false,
      processed: false,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should execute context when context exists', async () => {
      const mockHandler: ContextHandler = {
        name: 'test_execution_handler',
        description: 'Test execution handler',
        handler: jest.fn().mockResolvedValue({
          success: true,
          message: 'Handler executed successfully',
        }),
        metadata: {
          keywords: ['test'],
          userLevel: UserLevel.USER,
        },
      };

      contextManager.registerHandler(mockHandler);
      const context = await contextManager.createContext(
        mockUser.id.toString(),
        ContextType.CONVERSATION
      );

      const result = await contextManager.executeContext(
        mockUser,
        mockMessage,
        context
      );

      expect(result.success).toBe(true);
      expect(mockHandler.handler).toHaveBeenCalled();
    });

    it('should get user context info', async () => {
      // Clear any existing contexts first
      await contextManager.clearUserContexts(mockUser.id.toString());
      
      await contextManager.createContext(
        mockUser.id.toString(),
        ContextType.REGISTRATION,
        { step: 'start' }
      );

      const info = await contextManager.getUserContextInfo(mockUser.id.toString());

      expect(info.hasContext).toBe(true);
      expect(info.contextType).toBe(ContextType.REGISTRATION);
      expect(info.data?.step).toBe('start');
    });

    it('should create specific context type', async () => {
      const context = await contextManager.createSpecificContext(
        mockUser.id.toString(),
        ContextType.CONFIGURATION,
        { setting: 'language' }
      );

      expect(context.contextType).toBe(ContextType.CONFIGURATION);
      expect(context.data.setting).toBe('language');
    });
  });
});
