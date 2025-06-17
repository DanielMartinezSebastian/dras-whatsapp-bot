/**
 * Tests for MessageProcessorService
 */

import {
  MessageProcessorService,
  IncomingMessage,
} from '../src/services/message-processor.service';
import { ConfigService } from '../src/services/config.service';
import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';
import { UserLevel } from '../src/types';

// Mock all dependencies
jest.mock('../src/services/config.service');
jest.mock('../src/services/database.service');
jest.mock('../src/services/whatsapp-bridge.service');
jest.mock('../src/services/plugin-manager.service');
jest.mock('../src/services/command-registry.service');
jest.mock('../src/services/context-manager.service');
jest.mock('../src/utils/logger');

describe('MessageProcessorService', () => {
  let messageProcessor: MessageProcessorService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockWhatsAppBridge: jest.Mocked<WhatsAppBridgeService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset singletons for testing
    (MessageProcessorService as any).instance = undefined;
    (ConfigService as any).instance = undefined;
    (WhatsAppBridgeService as any).instance = undefined;

    // Get service instances after resetting
    messageProcessor = MessageProcessorService.getInstance();
    mockConfigService =
      ConfigService.getInstance() as jest.Mocked<ConfigService>;
    mockWhatsAppBridge =
      WhatsAppBridgeService.getInstance() as jest.Mocked<WhatsAppBridgeService>;

    // Setup ConfigService mocks
    (mockConfigService as any).getValue = jest
      .fn()
      .mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          bot: {
            prefix: '!',
            features: {
              auto_reply: true,
            },
          },
          pipeline: {
            maxConcurrentProcessing: 5,
            processingTimeout: 30000,
          },
        };
        return config[key as keyof typeof config] || defaultValue;
      });

    // Setup WhatsApp Bridge mocks
    (mockWhatsAppBridge as any).sendTextMessage = jest
      .fn()
      .mockResolvedValue(true);
    (mockWhatsAppBridge as any).sendMediaMessage = jest
      .fn()
      .mockResolvedValue(true);
    (mockWhatsAppBridge as any).isAvailable = jest.fn().mockResolvedValue(true);

    // Setup other ConfigService methods
    (mockConfigService as any).initialize = jest
      .fn()
      .mockResolvedValue(undefined);
    (mockConfigService as any).getConfig = jest.fn().mockReturnValue({});
    (mockConfigService as any).updateValue = jest.fn();
    (mockConfigService as any).saveConfig = jest
      .fn()
      .mockResolvedValue(undefined);
    (mockConfigService as any).cleanup = jest.fn();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MessageProcessorService.getInstance();
      const instance2 = MessageProcessorService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(messageProcessor.initialize()).resolves.not.toThrow();
    });

    it('should load configuration during initialization', async () => {
      await messageProcessor.initialize();

      expect(mockConfigService.getValue).toHaveBeenCalledWith('pipeline', {});
    });
  });

  describe('Message Processing Pipeline', () => {
    const createTestMessage = (
      overrides: Partial<IncomingMessage> = {}
    ): IncomingMessage => ({
      id: 'msg_123',
      from: '1234567890@s.whatsapp.net',
      content: 'Hello World',
      messageType: 'text',
      timestamp: new Date().toISOString(),
      metadata: {},
      ...overrides,
    });

    describe('Message Validation', () => {
      it('should process valid message successfully', async () => {
        const message = createTestMessage();

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.processingId).toBeDefined();
        expect(result.message).toBeDefined();
        expect(result.message?.content).toBe('Hello World');
      });

      it('should reject message without sender', async () => {
        const message = createTestMessage({ from: '' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!).toHaveLength(1);
        expect(result.errors![0].message).toContain('missing sender');
      });

      it('should reject message without content', async () => {
        const message = createTestMessage({ content: '' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!).toHaveLength(1);
        expect(result.errors![0].message).toContain(
          'missing sender or content'
        );
      });

      it('should trim message content', async () => {
        const message = createTestMessage({ content: '  Hello World  ' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.message?.content).toBe('Hello World');
      });
    });

    describe('User Management', () => {
      it('should create user from WhatsApp JID', async () => {
        const message = createTestMessage();

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.phone).toBe('1234567890');
        expect(result.user?.whatsapp_jid).toBe('1234567890@s.whatsapp.net');
        expect(result.user?.user_level).toBe(UserLevel.USER);
      });

      it('should set user ID in parsed message', async () => {
        const message = createTestMessage();

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.message?.user_id).toBe(result.user?.id);
      });
    });

    describe('Command Processing', () => {
      it('should detect and process commands', async () => {
        const message = createTestMessage({ content: '!help' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].command).toBe('help');
        expect(result.results[0].success).toBe(true);
      });

      it('should handle commands with arguments', async () => {
        const message = createTestMessage({
          content: '!config set language es',
        });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].command).toBe('config');
        expect(result.results[0].data?.args).toEqual(['set', 'language', 'es']);
      });

      it('should use custom prefix from config', async () => {
        mockConfigService.getValue.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'bot') {
              return { prefix: '/' };
            }
            return defaultValue;
          }
        );

        const message = createTestMessage({ content: '/status' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].command).toBe('status');
      });
    });

    describe('Auto-reply Processing', () => {
      it('should send auto-reply for non-command messages when enabled', async () => {
        const message = createTestMessage({ content: 'Hello, how are you?' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].command).toBe('auto_reply');
        const response = result.results[0].response;
        if (typeof response === 'object' && response && 'content' in response) {
          expect(response.content).toContain('DrasBot v2.0');
        } else if (typeof response === 'string') {
          expect(response).toContain('DrasBot v2.0');
        }
      });

      it('should not send auto-reply when disabled', async () => {
        mockConfigService.getValue.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'bot') {
              return {
                prefix: '!',
                features: { auto_reply: false },
              };
            }
            return defaultValue;
          }
        );

        const message = createTestMessage({ content: 'Hello, how are you?' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(0);
      });
    });

    describe('Response Generation', () => {
      it('should send text responses via WhatsApp bridge', async () => {
        const message = createTestMessage({ content: '!help' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(true);
        expect(mockWhatsAppBridge.sendTextMessage).toHaveBeenCalledWith(
          '1234567890@s.whatsapp.net',
          expect.any(String)
        );
      });

      it('should handle response sending errors gracefully', async () => {
        mockWhatsAppBridge.sendTextMessage.mockRejectedValue(
          new Error('Network error')
        );

        const message = createTestMessage({ content: '!help' });

        const result = await messageProcessor.processMessage(message);

        // Processing should still succeed even if response sending fails
        expect(result.success).toBe(true);
        expect(result.results).toHaveLength(1);
      });
    });

    describe('Error Handling', () => {
      it('should handle processing errors gracefully', async () => {
        // Force an error by passing invalid data to private method
        const message = createTestMessage({ from: '' });

        const result = await messageProcessor.processMessage(message);

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.processingId).toBeDefined();
        expect(result.processingTime).toBeGreaterThan(0);
      });

      it('should include processing time in results', async () => {
        const message = createTestMessage();

        const result = await messageProcessor.processMessage(message);

        expect(result.processingTime).toBeGreaterThan(0);
        expect(typeof result.processingTime).toBe('number');
      });
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = messageProcessor.getConfig();

      expect(config).toBeDefined();
      expect(config.maxConcurrentProcessing).toBeDefined();
      expect(config.processingTimeout).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        maxConcurrentProcessing: 10,
        processingTimeout: 60000,
      };

      messageProcessor.updateConfig(newConfig);
      const config = messageProcessor.getConfig();

      expect(config.maxConcurrentProcessing).toBe(10);
      expect(config.processingTimeout).toBe(60000);
    });
  });

  describe('Status Monitoring', () => {
    it('should return processor status', () => {
      const status = messageProcessor.getStatus();

      expect(status).toBeDefined();
      expect(status.isProcessing).toBe(false);
      expect(status.queueSize).toBe(0);
      expect(status.config).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await expect(messageProcessor.shutdown()).resolves.not.toThrow();
    });
  });
});
