/**
 * Context Manager Service Test - Clean Version
 */

import { ContextManagerService } from '../src/services/context-manager.service';
import { ConfigService } from '../src/services/config.service';
import { DatabaseService } from '../src/services/database.service';
import { PluginManagerService } from '../src/services/plugin-manager.service';
import { Logger } from '../src/utils/logger';
import {
  ContextType,
  UserLevel,
  User,
  ContextHandler,
} from '../src/types';

// Mock all dependencies
jest.mock('../src/services/config.service');
jest.mock('../src/services/database.service');
jest.mock('../src/services/plugin-manager.service');
jest.mock('../src/utils/logger');

describe('ContextManagerService - Clean Tests', () => {
  let contextManager: ContextManagerService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset singletons for testing
    (ContextManagerService as any).instance = undefined;
    (ConfigService as any).instance = undefined;
    (DatabaseService as any).instance = undefined;
    (PluginManagerService as any).instance = undefined;
    (Logger as any).instance = undefined;

    // Mock Logger
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    jest.spyOn(Logger, 'getInstance').mockReturnValue(mockLogger as any);

    // Mock ConfigService
    const mockConfigService = {
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
      updateValue: jest.fn(),
      getConfig: jest.fn().mockReturnValue({}),
      setValue: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };
    jest.spyOn(ConfigService, 'getInstance').mockReturnValue(mockConfigService as any);

    // Mock DatabaseService
    const mockDatabaseService = {
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };
    jest.spyOn(DatabaseService, 'getInstance').mockReturnValue(mockDatabaseService as any);

    // Mock PluginManagerService
    const mockPluginManagerService = {
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };
    jest.spyOn(PluginManagerService, 'getInstance').mockReturnValue(mockPluginManagerService as any);

    // Get service instance
    contextManager = ContextManagerService.getInstance();
  });

  describe('Basic Functionality', () => {
    it('should create singleton instance', () => {
      const instance1 = ContextManagerService.getInstance();
      const instance2 = ContextManagerService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize without throwing', async () => {
      await expect(contextManager.initialize()).resolves.not.toThrow();
    });

    it('should get configuration', () => {
      const config = contextManager.getConfig();
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('maxActiveContexts');
      expect(config).toHaveProperty('cleanupInterval');
    });

    it('should update configuration', () => {
      const newConfig = { timeout: 600000 };
      contextManager.updateConfig(newConfig);
      
      const config = contextManager.getConfig();
      expect(config.timeout).toBe(600000);
    });
  });

  describe('Handler Management', () => {
    const testHandler: ContextHandler = {
      name: 'conversation_handler',
      description: 'Test conversation handler',
      handler: jest.fn(),
      metadata: {
        keywords: ['chat', 'talk'],
        userLevel: UserLevel.USER,
      },
    };

    it('should register a context handler', () => {
      const result = contextManager.registerHandler(testHandler);
      expect(result).toBe(true);
    });

    it('should get registered handler by type', () => {
      contextManager.registerHandler(testHandler);
      const handler = contextManager.getHandler(ContextType.CONVERSATION);
      expect(handler).toBe(testHandler);
    });

    it('should get all registered handlers', () => {
      contextManager.registerHandler(testHandler);
      const handlers = contextManager.getRegisteredHandlers();
      expect(handlers).toContain(testHandler);
    });

    it('should unregister a handler', () => {
      contextManager.registerHandler(testHandler);
      const result = contextManager.unregisterHandler(ContextType.CONVERSATION);
      expect(result).toBe(true);
      
      const handler = contextManager.getHandler(ContextType.CONVERSATION);
      expect(handler).toBeNull();
    });
  });

  describe('Context Detection', () => {
    const testUser: User = {
      id: 'user_123',
      phone: '+1234567890',
      whatsapp_jid: 'user@s.whatsapp.net',
      display_name: 'Test User',
      user_level: UserLevel.USER,
      level: UserLevel.USER,
      user_type: 'normal',
      language: 'es',
      is_registered: true,
      last_activity: new Date().toISOString(),
      preferences: {
        notifications: true,
        auto_reply: false,
        language: 'es',
        timezone: 'UTC',
        privacy_level: 'normal',
      },
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const testHandler: ContextHandler = {
      name: 'test_detector',
      description: 'Test detector handler',
      handler: jest.fn(),
      metadata: {
        keywords: ['help', 'support'],
        userLevel: UserLevel.USER,
      },
    };

    it('should detect context when keywords match', async () => {
      contextManager.registerHandler(testHandler);
      
      const result = await contextManager.detectContext('I need help', testUser);
      
      expect(result.detected).toBe(true);
      expect(result.handler).toBe(testHandler);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should not detect context when no keywords match', async () => {
      contextManager.registerHandler(testHandler);
      
      const result = await contextManager.detectContext('random message', testUser);
      
      expect(result.detected).toBe(false);
      expect(result.handler).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should respect user level requirements', async () => {
      const adminHandler: ContextHandler = {
        name: 'admin_detector',
        description: 'Admin only handler',
        handler: jest.fn(),
        metadata: {
          keywords: ['admin', 'system'],
          userLevel: UserLevel.ADMIN,
        },
      };

      contextManager.registerHandler(adminHandler);
      
      const result = await contextManager.detectContext('admin command', testUser);
      
      expect(result.detected).toBe(false);
    });
  });

  describe('Context Management', () => {
    const userId = 'user_123';

    it('should create a new context', async () => {
      const context = await contextManager.createContext(
        userId,
        ContextType.REGISTRATION,
        { step: 'start' }
      );

      expect(context).toHaveProperty('id');
      expect(context.userId).toBe(userId);
      expect(context.contextType).toBe(ContextType.REGISTRATION);
      expect(context.data.step).toBe('start');
    });

    it('should get active context for user', async () => {
      const createdContext = await contextManager.createContext(
        userId,
        ContextType.CONVERSATION
      );

      const activeContext = await contextManager.getActiveContext(userId);

      expect(activeContext).toBe(createdContext);
    });

    it('should update context data', async () => {
      const context = await contextManager.createContext(
        userId,
        ContextType.REGISTRATION,
        { step: 'start' }
      );

      const result = await contextManager.updateContext(context.id, { step: 'email' });

      expect(result).toBe(true);
      expect(context.data.step).toBe('email');
    });

    it('should expire a context', async () => {
      const context = await contextManager.createContext(
        userId,
        ContextType.CONVERSATION
      );

      const result = await contextManager.expireContext(context.id);

      expect(result).toBe(true);
      
      const activeContext = await contextManager.getActiveContext(userId);
      expect(activeContext).toBeNull();
    });

    it('should clear all user contexts', async () => {
      await contextManager.createContext(userId, ContextType.CONVERSATION);
      await contextManager.createContext(userId, ContextType.REGISTRATION);

      const result = await contextManager.clearUserContexts(userId);

      expect(result).toBe(true);
      
      const activeContext = await contextManager.getActiveContext(userId);
      expect(activeContext).toBeNull();
    });
  });

  describe('Statistics and Status', () => {
    it('should return statistics', () => {
      const stats = contextManager.getStats();
      
      expect(stats).toHaveProperty('activeContexts');
      expect(stats).toHaveProperty('totalHandlers');
      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('totalExecutions');
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(contextManager.shutdown()).resolves.not.toThrow();
    });
  });
});
