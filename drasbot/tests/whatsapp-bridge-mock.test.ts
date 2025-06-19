/**
 * WhatsApp Bridge Service Mock Tests
 * 
 * Tests to verify that the WhatsApp Bridge mocking works correctly
 */

import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';
import { mockWhatsAppBridge, mockWhatsAppBridgeError } from './mocks/whatsapp-bridge.mock';

describe('WhatsApp Bridge Mocking', () => {
  let bridgeService: WhatsAppBridgeService;

  beforeEach(() => {
    // Reset singletons first
    (WhatsAppBridgeService as any).instance = undefined;
  });

  afterEach(() => {
    // Clean up
    (WhatsAppBridgeService as any).instance = undefined;
  });

  describe('successful bridge operations', () => {
    beforeEach(() => {
      // Apply mock before creating instance
      mockWhatsAppBridge();
      // Create instance after mocking
      bridgeService = WhatsAppBridgeService.getInstance();
    });

    it('should initialize bridge successfully with mocked responses', async () => {
      await expect(bridgeService.initialize()).resolves.not.toThrow();
    });

    it('should send message successfully with mocked responses', async () => {
      await bridgeService.initialize();
      
      const result = await bridgeService.sendTextMessage(
        '1234567890@s.whatsapp.net',
        'Test message'
      );

      expect(result).toBe(true);
    });

    it('should check bridge health successfully', async () => {
      await bridgeService.initialize();
      
      const isAvailable = await bridgeService.isAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('bridge error scenarios', () => {
    it('should handle server errors gracefully', async () => {
      mockWhatsAppBridgeError('server');
      bridgeService = WhatsAppBridgeService.getInstance();
      
      await expect(bridgeService.initialize()).resolves.not.toThrow();
      
      // Server errors (HTTP 500) still mean the bridge is available/responding
      const isAvailable = await bridgeService.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      mockWhatsAppBridgeError('network');
      bridgeService = WhatsAppBridgeService.getInstance();
      
      await expect(bridgeService.initialize()).resolves.not.toThrow();
    });

    it('should handle timeout errors gracefully', async () => {
      mockWhatsAppBridgeError('timeout');
      bridgeService = WhatsAppBridgeService.getInstance();
      
      await expect(bridgeService.initialize()).resolves.not.toThrow();
    });
  });
});
