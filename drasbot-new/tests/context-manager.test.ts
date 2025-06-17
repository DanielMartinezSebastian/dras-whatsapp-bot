/**
 * Tests for ContextManagerService
 */

import { ContextManagerService } from '../src/services/context-manager.service';
import { ConfigService } from '../src/services/config.service';
import { DatabaseService } from '../src/services/database.service';
import { PluginManagerService } from '../src/services/plugin-manager.service';
import { ContextType, UserLevel } from '../src/types';

// Mock all dependencies
jest.mock('../src/services/config.service');
jest.mock('../src/services/database.service');
jest.mock('../src/services/plugin-manager.service');
jest.mock('../src/utils/logger');

describe('ContextManagerService', () => {
  let contextManager: ContextManagerService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get service instances
    contextManager = ContextManagerService.getInstance();
    mockConfigService = ConfigService.getInstance() as jest.Mocked<ConfigService>;

    // Setup default mocks
    mockConfigService.getValue.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        'context': {
          timeout: 300000, // 5 minutes
          maxActiveContexts: 100
        }
      };
      return config[key as keyof typeof config] || defaultValue;
    });
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
      await contextManager.initialize();
      
      expect(mockConfigService.getValue).toHaveBeenCalledWith('context', {});
    });
  });

  describe('Context Handler Registration', () => {
    const mockHandler = {
      name: 'registration',
      description: 'Registration flow handler',
      execute: jest.fn().mockResolvedValue({
        success: true,
        message: 'Registration step completed',
        nextStep: 'collect_name'
      }),
      metadata: {
        keywords: ['register', 'registration', 'sign up']
      }
    };

    it('should register context handler successfully', () => {
      const result = contextManager.registerHandler(mockHandler);
      
      expect(result).toBe(true);
    });

    it('should not register duplicate handlers', () => {
      contextManager.registerHandler(mockHandler);
      const result = contextManager.registerHandler(mockHandler);
      
      expect(result).toBe(false);
    });

    it('should get registered handler', () => {
      contextManager.registerHandler(mockHandler);
      const handler = contextManager.getHandler(ContextType.REGISTRATION);
      
      expect(handler).toBe(mockHandler);
    });

    it('should return null for non-existent handler', () => {
      const handler = contextManager.getHandler(ContextType.CONVERSATION);
      
      expect(handler).toBeNull();
    });

    it('should list all registered handlers', () => {
      contextManager.registerHandler(mockHandler);
      const handlers = contextManager.getRegisteredHandlers();
      
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toBe(mockHandler);
    });

    it('should unregister handler', () => {
      contextManager.registerHandler(mockHandler);
      const result = contextManager.unregisterHandler(ContextType.REGISTRATION);
      
      expect(result).toBe(true);
      expect(contextManager.getHandler(ContextType.REGISTRATION)).toBeNull();
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = contextManager.unregisterHandler(ContextType.CONVERSATION);
      
      expect(result).toBe(false);
    });
  });

  describe('Context Detection', () => {
    const mockMessage = {
      id: 'msg_123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user_123',
      whatsapp_message_id: 'wa_msg_123',
      content: 'I want to register',
      message_type: 'text',
      is_from_bot: false,
      processed: false,
      metadata: {}
    };

    const mockUser = {
      id: 'user_123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      phone: '1234567890',
      whatsapp_jid: '1234567890@s.whatsapp.net',
      display_name: 'Test User',
      user_level: UserLevel.USER,
      level: UserLevel.USER,
      user_type: 'normal',
      language: 'es',
      is_registered: false,
      last_activity: new Date().toISOString(),
      preferences: {},
      metadata: {}
    };

    it('should detect context from keywords', async () => {
      const mockHandler = {
        type: ContextType.REGISTRATION,
        name: 'registration',
        description: 'Registration flow',
        requiredLevel: UserLevel.USER,
        handle: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        metadata: {
          keywords: ['register', 'registration', 'sign up']
        }
      };

      contextManager.registerHandler(mockHandler);
      
      const result = await contextManager.detectContext(mockMessage, mockUser);
      
      expect(result.detected).toBe(true);
      expect(result.handler).toBe(mockHandler);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should not detect context without matching keywords', async () => {
      const mockHandler = {
        type: ContextType.REGISTRATION,
        name: 'registration',
        description: 'Registration flow',
        requiredLevel: UserLevel.USER,
        handle: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        metadata: {
          keywords: ['help', 'support']
        }
      };

      contextManager.registerHandler(mockHandler);
      
      const result = await contextManager.detectContext(mockMessage, mockUser);
      
      expect(result.detected).toBe(false);
      expect(result.handler).toBeNull();
    });

    it('should respect user level requirements', async () => {
      const mockHandler = {
        type: ContextType.ADMIN,
        name: 'admin',
        description: 'Admin operations',
        requiredLevel: UserLevel.ADMIN,
        handle: jest.fn(),
        validate: jest.fn().mockReturnValue(true),
        metadata: {
          keywords: ['admin']
        }
      };

      const adminMessage = { ...mockMessage, content: 'admin panel' };
      
      contextManager.registerHandler(mockHandler);
      
      const result = await contextManager.detectContext(adminMessage, mockUser);
      
      expect(result.detected).toBe(false);
      expect(result.handler).toBeNull();
    });
  });

  describe('Active Context Management', () => {
    const mockContext = {
      id: 'ctx_123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user_123',
      context_type: ContextType.REGISTRATION,
      context_data: {
        step: 'collect_name',
        progress: 0.5
      },
      is_active: true,
      expires_at: new Date(Date.now() + 300000).toISOString()
    };

    it('should create new context', async () => {
      const result = await contextManager.createContext('user_123', ContextType.REGISTRATION, {
        step: 'collect_name'
      });
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe('user_123');
      expect(result.context_type).toBe(ContextType.REGISTRATION);
      expect(result.is_active).toBe(true);
    });

    it('should get active context for user', async () => {
      const result = await contextManager.getActiveContext('user_123');
      
      // Since we're using mock implementation, this will return null
      // In real implementation, this would query the database
      expect(result).toBeNull();
    });

    it('should update context data', async () => {
      const result = await contextManager.updateContext('ctx_123', {
        step: 'collect_phone',
        progress: 0.7
      });
      
      expect(result).toBe(true);
    });

    it('should expire context', async () => {
      const result = await contextManager.expireContext('ctx_123');
      
      expect(result).toBe(true);
    });

    it('should clear all contexts for user', async () => {
      const result = await contextManager.clearUserContexts('user_123');
      
      expect(result).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = contextManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.timeout).toBeDefined();
      expect(config.maxActiveContexts).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        timeout: 600000,
        maxActiveContexts: 200
      };
      
      contextManager.updateConfig(newConfig);
      const config = contextManager.getConfig();
      
      expect(config.timeout).toBe(600000);
      expect(config.maxActiveContexts).toBe(200);
    });
  });

  describe('Metrics and Statistics', () => {
    it('should return context statistics', () => {
      const stats = contextManager.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.activeContexts).toBeDefined();
      expect(stats.totalHandlers).toBeDefined();
      expect(stats.totalDetections).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(contextManager.shutdown()).resolves.not.toThrow();
    });
  });
});
