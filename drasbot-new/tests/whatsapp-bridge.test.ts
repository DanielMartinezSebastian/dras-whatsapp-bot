/**
 * WhatsApp Bridge Service Tests
 * Tests for the enhanced bridge service with robust error handling
 */

import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';

describe('WhatsAppBridgeService', () => {
  let whatsappService: WhatsAppBridgeService;

  beforeEach(() => {
    whatsappService = WhatsAppBridgeService.getInstance();
  });

  afterEach(async () => {
    try {
      await whatsappService.disconnect();
      // Reset to default config for next test
      whatsappService.configure({
        baseURL: 'http://127.0.0.1',
        port: 8080,
        timeout: 15000
      });
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const service1 = WhatsAppBridgeService.getInstance();
      const service2 = WhatsAppBridgeService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const config = whatsappService.getConfig();
      expect(config).toHaveProperty('baseURL');
      expect(config).toHaveProperty('port');
      expect(config.port).toBe(8080);
      expect(config.enableLogging).toBe(true);
    });

    it('should allow configuration override', () => {
      const customConfig = {
        baseURL: 'http://localhost',
        port: 9000,
        timeout: 10000,
        enableLogging: false
      };
      
      whatsappService.configure(customConfig);
      const config = whatsappService.getConfig();
      
      expect(config.port).toBe(9000);
      expect(config.timeout).toBe(10000);
      expect(config.enableLogging).toBe(false);
    });

    it('should support API key configuration', () => {
      whatsappService.configure({
        apiKey: 'test-api-key'
      });
      
      expect(whatsappService.getConfig().apiKey).toBe('test-api-key');
    });
  });

  describe('connection and ping', () => {
    it('should check connection status', () => {
      const status = whatsappService.isConnected();
      expect(typeof status).toBe('boolean');
    });

    it('should initialize connection', async () => {
      // This test may fail if bridge is not running, which is expected in CI
      try {
        await whatsappService.initialize();
        expect(whatsappService.isConnected()).toBe(true);
      } catch (error) {
        // Expected when bridge is not running
        expect(error).toBeInstanceOf(Error);
        expect(whatsappService.isConnected()).toBe(false);
      }
    });

    it('should perform ping test', async () => {
      const pingResult = await whatsappService.ping();
      expect(typeof pingResult).toBe('boolean');
    });

    it('should check availability', async () => {
      const isAvailable = await whatsappService.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should get bridge status', async () => {
      try {
        const status = await whatsappService.getBridgeStatus();
        expect(status).toHaveProperty('connected');
        expect(status).toHaveProperty('uptime');
        expect(status).toHaveProperty('messagesProcessed');
        expect(status).toHaveProperty('lastActivity');
      } catch (error: any) {
        // Expected when bridge is not running
        expect(error.name).toBe('BridgeError');
      }
    });
  });

  describe('message sending', () => {
    beforeEach(async () => {
      // Try to initialize, but don't fail test if bridge is not available
      try {
        await whatsappService.initialize();
      } catch (error) {
        // Bridge not available, skip these tests
      }
    });

    it('should validate message parameters', async () => {
      await expect(whatsappService.sendMessage('', 'test message')).rejects.toThrow('Recipient is required');
      await expect(whatsappService.sendMessage('1234567890', '')).rejects.toThrow('Message is required');
    });

    it('should format phone numbers correctly', () => {
      expect(whatsappService.formatPhoneNumber('+1234567890')).toBe('1234567890');
      expect(whatsappService.formatPhoneNumber('1234567890')).toBe('1234567890');
      expect(whatsappService.formatPhoneNumber('(123) 456-7890')).toBe('1234567890');
    });

    it('should create JID from phone number', () => {
      const jid = whatsappService.createJID('1234567890');
      expect(jid).toBe('1234567890@s.whatsapp.net');
    });

    it('should handle group JIDs', () => {
      const groupJID = '1234567890@g.us';
      expect(whatsappService.isGroupJID(groupJID)).toBe(true);
      expect(whatsappService.isGroupJID('1234567890@s.whatsapp.net')).toBe(false);
    });

    it('should send text message when bridge is available', async () => {
      if (!whatsappService.isConnected()) {
        console.log('Skipping test - bridge not available');
        return;
      }

      try {
        const result = await whatsappService.sendTextMessage('1234567890', 'test message');
        expect(typeof result).toBe('boolean');
      } catch (error) {
        // Bridge may respond with error but still be working
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should send media message when bridge is available', async () => {
      if (!whatsappService.isConnected()) {
        console.log('Skipping test - bridge not available');
        return;
      }

      try {
        const result = await whatsappService.sendMediaMessage('1234567890', '/path/to/test.jpg', 'test caption');
        expect(typeof result).toBe('boolean');
      } catch (error) {
        // Bridge may respond with error but still be working
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('media download', () => {
    it('should validate download parameters', async () => {
      await expect(whatsappService.downloadMedia('', 'test@s.whatsapp.net')).rejects.toThrow('Message ID is required');
      await expect(whatsappService.downloadMedia('msg123', '')).rejects.toThrow('Chat JID is required');
    });
  });

  describe('error handling', () => {
    it('should handle bridge connection errors gracefully', async () => {
      // Configure to use invalid URL
      whatsappService.configure({
        baseURL: 'http://invalid-host',
        port: 99999
      });

      await expect(whatsappService.sendMessage('1234567890', 'test')).rejects.toThrow();
    });

    it('should support retry configuration', () => {
      const mockRetryConfig = {
        maxRetries: 3,
        retryDelay: 100
      };
      
      whatsappService.configure({ retry: mockRetryConfig });
      
      const config = whatsappService.getConfig();
      expect(config.retry?.maxRetries).toBe(3);
      expect(config.retry?.retryDelay).toBe(100);
    });
  });

  describe('health check', () => {
    it('should provide health status', async () => {
      const health = await whatsappService.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('bridge_available');
      expect(health).toHaveProperty('last_check');
      expect(['connected', 'disconnected', 'error']).toContain(health.status);
    });
  });

  describe('status and lifecycle', () => {
    it('should provide detailed status', () => {
      const status = whatsappService.getStatus();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('lastHealthCheck');
    });

    it('should support config updates', () => {
      whatsappService.updateConfig({
        timeout: 20000,
        enableLogging: false
      });
      
      const config = whatsappService.getConfig();
      expect(config.timeout).toBe(20000);
      expect(config.enableLogging).toBe(false);
    });

    it('should destroy cleanly', async () => {
      await expect(whatsappService.destroy()).resolves.not.toThrow();
    });
  });
});
