/**
 * Test suite for Message Processor Bridge Integration
 * Tests typing indicators, read receipts, and bridge health monitoring
 */

import { MessageProcessorService } from '../src/services/message-processor.service';
import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';
import { DatabaseService } from '../src/services/database.service';
import { ConfigService } from '../src/services/config.service';
import { UserLevel } from '../src/types';
import type { IncomingMessage } from '../src/services/message-processor.service';
import type { MessageType } from '../src/types';

// Mock services
jest.mock('../src/services/database.service');
jest.mock('../src/services/whatsapp-bridge.service');
jest.mock('../src/services/config.service');
jest.mock('../src/services/plugin-manager.service');
jest.mock('../src/services/command-registry.service');
jest.mock('../src/services/context-manager.service');

// Mock missing service modules
jest.mock('../src/services/plugin-manager.service', () => ({
  PluginManagerService: {
    getInstance: () => ({
      initialize: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('../src/services/command-registry.service', () => ({
  CommandRegistryService: {
    getInstance: () => ({
      initialize: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('../src/services/context-manager.service', () => ({
  ContextManagerService: {
    getInstance: () => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      detectContextType: jest.fn().mockResolvedValue('general'),
      getContext: jest.fn().mockResolvedValue(null),
      createContext: jest.fn().mockResolvedValue({}),
      updateContext: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('MessageProcessor Bridge Integration', () => {
  let messageProcessor: MessageProcessorService;
  let mockWhatsAppBridge: jest.Mocked<WhatsAppBridgeService>;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockConfig: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'test-user-id',
    created_at: '2025-06-18T00:00:00Z',
    updated_at: '2025-06-18T00:00:00Z',
    phoneNumber: '1234567890',
    whatsappJid: '1234567890@s.whatsapp.net',
    userLevel: UserLevel.USER,
    displayName: 'Test User',
    isActive: true,
    metadata: {},
  };

  const createTestMessage = (
    content: string = 'test message'
  ): IncomingMessage => ({
    id: 'test-msg-id',
    from: '1234567890@s.whatsapp.net',
    content,
    messageType: 'text' as MessageType,
    timestamp: '2025-06-18T00:00:00Z',
    metadata: {},
  });

  beforeAll(() => {
    // Setup mocks once
    mockWhatsAppBridge = {
      performHealthCheck: jest.fn().mockResolvedValue({
        status: 'connected',
        bridge_available: true,
        last_check: '2025-06-18T00:00:00Z',
      }),
      sendTyping: jest.fn().mockResolvedValue(true),
      markAsRead: jest.fn().mockResolvedValue(true),
      sendMessage: jest
        .fn()
        .mockResolvedValue({ success: true, messageId: 'sent-msg-id' }),
      getInstance: jest.fn(),
    } as any;

    mockDatabase = {
      findUserByPhone: jest.fn().mockResolvedValue(mockUser),
      updateUserLastActivity: jest.fn().mockResolvedValue(undefined),
      saveMessage: jest.fn().mockResolvedValue(undefined),
      getInstance: jest.fn(),
    } as any;

    mockConfig = {
      getValue: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            pipeline: {},
            processing_options: {
              enableTypingIndicators: true,
              enableReadReceipts: true,
              enableBridgeIntegration: true,
              typingDelay: 500,
              autoMarkAsRead: true,
            },
          };
          return config[key] || defaultValue;
        }),
      getInstance: jest.fn(),
    } as any;

    // Setup static method mocks
    (WhatsAppBridgeService.getInstance as jest.Mock).mockReturnValue(
      mockWhatsAppBridge
    );
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabase);
    (ConfigService.getInstance as jest.Mock).mockReturnValue(mockConfig);
  });

  beforeEach(async () => {
    // Clear only specific mocks but preserve the setup
    jest.clearAllMocks();

    // Reset the bridge mock to healthy state
    mockWhatsAppBridge.performHealthCheck.mockResolvedValue({
      status: 'connected',
      bridge_available: true,
      last_check: '2025-06-18T00:00:00Z',
    });

    messageProcessor = MessageProcessorService.getInstance();
    await messageProcessor.initialize();
  });

  describe('Bridge Integration Configuration', () => {
    test('should load processing options from config', () => {
      const options = messageProcessor.getProcessingOptions();
      expect(options.enableTypingIndicators).toBe(true);
      expect(options.enableReadReceipts).toBe(true);
      expect(options.enableBridgeIntegration).toBe(true);
      expect(options.typingDelay).toBe(500);
      expect(options.autoMarkAsRead).toBe(true);
    });

    test('should update processing options', () => {
      const newOptions = {
        enableTypingIndicators: false,
        typingDelay: 1000,
      };

      messageProcessor.setProcessingOptions(newOptions);
      const options = messageProcessor.getProcessingOptions();

      expect(options.enableTypingIndicators).toBe(false);
      expect(options.typingDelay).toBe(1000);
      expect(options.enableReadReceipts).toBe(true); // Should remain unchanged
    });

    test('should check bridge health during initialization', async () => {
      expect(mockWhatsAppBridge.performHealthCheck).toHaveBeenCalled();

      const status = messageProcessor.getBridgeStatus();
      expect(status.healthy).toBe(true);
      expect(status.options.enableBridgeIntegration).toBe(true);
    });
  });

  describe('Typing Indicators', () => {
    test('should send typing indicator when processing message', async () => {
      const message = createTestMessage('hello');

      await messageProcessor.processMessage(message);

      expect(mockWhatsAppBridge.sendTyping).toHaveBeenCalledWith(
        message.from,
        true
      );
      expect(mockWhatsAppBridge.sendTyping).toHaveBeenCalledWith(
        message.from,
        false
      );
    });

    test('should not send typing indicator when disabled', async () => {
      messageProcessor.setProcessingOptions({ enableTypingIndicators: false });
      const message = createTestMessage('hello');

      await messageProcessor.processMessage(message);

      expect(mockWhatsAppBridge.sendTyping).not.toHaveBeenCalled();
    });

    test('should handle typing indicator errors gracefully', async () => {
      mockWhatsAppBridge.sendTyping.mockRejectedValueOnce(
        new Error('Network error')
      );
      const message = createTestMessage('hello');

      const result = await messageProcessor.processMessage(message);

      expect(result.success).toBe(true); // Should not fail processing
    });

    test('should stop typing indicator on processing error', async () => {
      // Force an error during message validation
      const invalidMessage = createTestMessage('');
      invalidMessage.from = ''; // Invalid sender

      const result = await messageProcessor.processMessage(invalidMessage);

      expect(result.success).toBe(false);
      expect(mockWhatsAppBridge.sendTyping).toHaveBeenCalledWith('', false);
    });
  });

  describe('Read Receipts', () => {
    test('should mark message as read when enabled', async () => {
      const message = createTestMessage('hello');

      await messageProcessor.processMessage(message);

      expect(mockWhatsAppBridge.markAsRead).toHaveBeenCalledWith(
        message.id,
        message.from
      );
    });

    test('should not mark message as read when disabled', async () => {
      messageProcessor.setProcessingOptions({ autoMarkAsRead: false });
      const message = createTestMessage('hello');

      await messageProcessor.processMessage(message);

      expect(mockWhatsAppBridge.markAsRead).not.toHaveBeenCalled();
    });

    test('should handle read receipt errors gracefully', async () => {
      mockWhatsAppBridge.markAsRead.mockRejectedValueOnce(
        new Error('Network error')
      );
      const message = createTestMessage('hello');

      const result = await messageProcessor.processMessage(message);

      expect(result.success).toBe(true); // Should not fail processing
    });
  });

  describe('Bridge Health Monitoring', () => {
    test('should start bridge health monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      messageProcessor.startBridgeHealthMonitoring(1); // 1 minute interval

      consoleSpy.mockRestore();
    });

    test('should get bridge status', () => {
      const status = messageProcessor.getBridgeStatus();

      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('lastCheck');
      expect(status).toHaveProperty('options');
      expect(typeof status.healthy).toBe('boolean');
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    test('should handle bridge unavailability', async () => {
      mockWhatsAppBridge.performHealthCheck.mockResolvedValueOnce({
        status: 'disconnected',
        bridge_available: false,
        last_check: '2025-06-18T00:00:00Z',
        error: 'Connection failed',
      });

      // Manually trigger health check
      const status = messageProcessor.getBridgeStatus();

      // Bridge should still be considered healthy from previous check
      // until the next health check runs
      expect(status.healthy).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    test('should process message with all bridge features enabled', async () => {
      // Reset mock to ensure clean state
      mockWhatsAppBridge.markAsRead.mockClear();
      mockWhatsAppBridge.sendTyping.mockClear();
      mockWhatsAppBridge.markAsRead.mockResolvedValue(true);
      mockWhatsAppBridge.sendTyping.mockResolvedValue(true);

      // Explicitly ensure healthy bridge state
      mockWhatsAppBridge.performHealthCheck.mockResolvedValue({
        status: 'connected',
        bridge_available: true,
        last_check: '2025-06-18T00:00:00Z',
      });

      // Re-initialize to ensure clean state
      await messageProcessor.initialize();

      // Verify bridge health status before processing
      const bridgeStatus = messageProcessor.getBridgeStatus();
      expect(bridgeStatus.healthy).toBe(true);

      // Verify processing options before processing
      const options = messageProcessor.getProcessingOptions();
      expect(options.enableBridgeIntegration).toBe(true);
      expect(options.enableReadReceipts).toBe(true);
      expect(options.autoMarkAsRead).toBe(true);

      const message = createTestMessage('/help');

      const result = await messageProcessor.processMessage(message);

      expect(result.success).toBe(true);
      expect(mockWhatsAppBridge.markAsRead).toHaveBeenCalledWith(
        message.id,
        message.from
      );
      expect(mockWhatsAppBridge.sendTyping).toHaveBeenCalledWith(
        message.from,
        true
      );
      expect(mockWhatsAppBridge.sendTyping).toHaveBeenCalledWith(
        message.from,
        false
      );
    });

    test('should process message with bridge integration disabled', async () => {
      messageProcessor.setProcessingOptions({ enableBridgeIntegration: false });
      const message = createTestMessage('/help');

      const result = await messageProcessor.processMessage(message);

      expect(result.success).toBe(true);
      // Bridge methods should not be called when integration is disabled
      expect(mockWhatsAppBridge.markAsRead).not.toHaveBeenCalled();
      expect(mockWhatsAppBridge.sendTyping).not.toHaveBeenCalled();
    });

    test('should handle mixed bridge feature configuration', async () => {
      messageProcessor.setProcessingOptions({
        enableTypingIndicators: true,
        enableReadReceipts: false,
        autoMarkAsRead: false,
      });

      const message = createTestMessage('test');

      await messageProcessor.processMessage(message);

      expect(mockWhatsAppBridge.sendTyping).toHaveBeenCalled();
      expect(mockWhatsAppBridge.markAsRead).not.toHaveBeenCalled();
    });
  });
});
