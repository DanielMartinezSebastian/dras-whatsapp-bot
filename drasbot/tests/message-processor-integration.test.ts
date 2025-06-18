/**
 * Simple Integration Test for MessageProcessor
 */

import { UserLevel } from '../src/types';

describe('MessageProcessor Integration', () => {
  // Mock all the external dependencies at the module level
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    getValue: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        bot: { prefix: '!' },
        pipeline: { maxConcurrentProcessing: 5 },
      };
      return config[key] || defaultValue;
    }),
    getConfig: jest.fn(() => ({})),
    initialize: jest.fn(),
    updateValue: jest.fn(),
    saveConfig: jest.fn(),
    cleanup: jest.fn(),
  };

  const mockDatabaseService = {
    initialize: jest.fn(),
    query: jest.fn(),
    shutdown: jest.fn(),
  };

  const mockWhatsAppBridge = {
    sendMessage: jest.fn(() => Promise.resolve(true)),
    isAvailable: jest.fn(() => Promise.resolve(true)),
    initialize: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockPluginManager = {
    executePlugin: jest.fn(),
    initialize: jest.fn(),
    shutdown: jest.fn(),
  };

  const mockCommandRegistry = {
    findCommand: jest.fn(),
    executeCommand: jest.fn(),
    initialize: jest.fn(),
    shutdown: jest.fn(),
  };

  const mockContextManager = {
    detectContext: jest.fn(),
    executeContext: jest.fn(),
    getUserContextInfo: jest.fn(() => Promise.resolve({ hasContext: false })),
    initialize: jest.fn(),
    shutdown: jest.fn(),
  };

  // Set up the mocks before importing the service
  beforeAll(() => {
    jest.doMock('../src/utils/logger', () => ({
      Logger: { getInstance: () => mockLogger },
    }));

    jest.doMock('../src/services/config.service', () => ({
      ConfigService: { getInstance: () => mockConfigService },
    }));

    jest.doMock('../src/services/database.service', () => ({
      DatabaseService: { getInstance: () => mockDatabaseService },
    }));

    jest.doMock('../src/services/whatsapp-bridge.service', () => ({
      WhatsAppBridgeService: { getInstance: () => mockWhatsAppBridge },
    }));

    jest.doMock('../src/services/plugin-manager.service', () => ({
      PluginManagerService: { getInstance: () => mockPluginManager },
    }));

    jest.doMock('../src/services/command-registry.service', () => ({
      CommandRegistryService: { getInstance: () => mockCommandRegistry },
    }));

    jest.doMock('../src/services/context-manager.service', () => ({
      ContextManagerService: { getInstance: () => mockContextManager },
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and process a basic message flow without errors', async () => {
    // Import after mocks are set up
    const { MessageProcessorService } = await import(
      '../src/services/message-processor.service'
    );

    // Reset singleton
    (MessageProcessorService as any).instance = undefined;
    const processor = MessageProcessorService.getInstance();

    const testMessage = {
      id: 'msg_123',
      from: '1234567890@s.whatsapp.net',
      content: 'Hello Bot',
      messageType: 'text' as const,
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    // This should complete without throwing errors
    const result = await processor.processMessage(testMessage);

    expect(result).toBeDefined();
    expect(result.processingId).toBeDefined();
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should handle invalid message gracefully', async () => {
    const { MessageProcessorService } = await import(
      '../src/services/message-processor.service'
    );

    (MessageProcessorService as any).instance = undefined;
    const processor = MessageProcessorService.getInstance();

    const invalidMessage = {
      id: 'msg_456',
      from: '', // Invalid - empty sender
      content: 'Test message',
      messageType: 'text' as const,
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    const result = await processor.processMessage(invalidMessage);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should create proper user objects from JID', async () => {
    const { MessageProcessorService } = await import(
      '../src/services/message-processor.service'
    );

    (MessageProcessorService as any).instance = undefined;
    const processor = MessageProcessorService.getInstance();

    const message = {
      id: 'msg_789',
      from: '9876543210@s.whatsapp.net',
      content: 'Test user creation',
      messageType: 'text' as const,
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    const result = await processor.processMessage(message);

    expect(result.user).toBeDefined();
    expect(result.user?.whatsapp_jid).toBe('9876543210@s.whatsapp.net');
    expect(result.user?.user_level).toBe(UserLevel.USER);
    expect(result.user?.phone).toBe('9876543210');
    // ID is dynamically generated, so we just check it exists
    expect(result.user?.id).toBeDefined();
    expect(result.user?.id.length).toBeGreaterThan(0);
  });

  it('should provide configuration and status', async () => {
    const { MessageProcessorService } = await import(
      '../src/services/message-processor.service'
    );

    (MessageProcessorService as any).instance = undefined;
    const processor = MessageProcessorService.getInstance();

    const config = processor.getConfig();
    const status = processor.getStatus();

    expect(config).toBeDefined();
    expect(status).toBeDefined();
    expect(status.isProcessing).toBeDefined();
    expect(status.queueSize).toBeDefined();
  });
});
