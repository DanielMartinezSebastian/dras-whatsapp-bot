/**
 * Simple Integration Test for MessageProcessor
 */

import { MessageProcessorService } from '../src/services/message-processor.service';
import { UserLevel } from '../src/types';

// Mock all external dependencies first (before any imports that use them)
const mockConfigService = {
  getValue: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      bot: { prefix: '!' },
      pipeline: { maxConcurrentProcessing: 5 },
      processing_options: {
        enableTypingIndicators: false,
        enableReadReceipts: false,
        enableBridgeIntegration: false,
        typingDelay: 0,
        autoMarkAsRead: false,
      },
      plugins: { 
        directory: './plugins',
        autoLoad: false,
      },
      commands: { directory: './commands' },
    };
    return config[key] || defaultValue;
  }),
  getConfig: jest.fn(() => ({})),
  initialize: jest.fn(() => Promise.resolve()),
  updateValue: jest.fn(),
  saveConfig: jest.fn(),
  cleanup: jest.fn(),
};

const mockPluginManager = {
  executePlugin: jest.fn(),
  initialize: jest.fn(() => Promise.resolve()),
  shutdown: jest.fn(),
};

const mockCommandRegistry = {
  findCommand: jest.fn(),
  executeCommand: jest.fn(),
  initialize: jest.fn(() => Promise.resolve()),
  shutdown: jest.fn(),
};

const mockContextManager = {
  detectContext: jest.fn(),
  executeContext: jest.fn(),
  getUserContextInfo: jest.fn(() => Promise.resolve({ hasContext: false })),
  initialize: jest.fn(() => Promise.resolve()),
  shutdown: jest.fn(),
};

// Mock the modules
jest.mock('../src/services/config.service', () => ({
  ConfigService: {
    getInstance: () => mockConfigService,
  },
}));

jest.mock('../src/services/plugin-manager.service', () => ({
  PluginManagerService: {
    getInstance: () => mockPluginManager,
  },
}));

jest.mock('../src/services/command-registry.service', () => ({
  CommandRegistryService: {
    getInstance: () => mockCommandRegistry,
  },
}));

jest.mock('../src/services/context-manager.service', () => ({
  ContextManagerService: {
    getInstance: () => mockContextManager,
  },
}));

describe('MessageProcessor Integration', () => {
  beforeEach(() => {
    // Reset singleton for clean tests
    (MessageProcessorService as any).instance = undefined;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should create and process a basic message flow without errors', async () => {
    const processor = MessageProcessorService.getInstance();

    // Initialize the processor
    await processor.initialize();

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
  });

  it('should handle invalid message gracefully', async () => {
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
    expect(result.user?.jid).toBe('9876543210@s.whatsapp.net');
    expect(result.user?.userLevel).toBe(UserLevel.USER);
    expect(result.user?.phoneNumber).toContain('9876543210');
    // ID is dynamically generated, so we just check it exists
    expect(result.user?.id).toBeDefined();
    expect(typeof result.user?.id).toBe('number');
  });

  it('should provide configuration and status', async () => {
    const processor = MessageProcessorService.getInstance();

    const config = processor.getConfig();
    const status = processor.getStatus();

    expect(config).toBeDefined();
    expect(status).toBeDefined();
    expect(status.isProcessing).toBeDefined();
    expect(status.queueSize).toBeDefined();
  });
});
