/**
 * WhatsApp Bridge Service Enhanced Tests
 * Tests for new advanced bridge functionality
 */

import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';

describe('WhatsAppBridgeService - Enhanced Features', () => {
  let bridgeService: WhatsAppBridgeService;

  beforeEach(() => {
    bridgeService = WhatsAppBridgeService.getInstance();

    // Reset service state
    bridgeService.updateConfig({
      baseURL: 'http://127.0.0.1',
      port: 8080,
      timeout: 15000,
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
      },
      enableLogging: false,
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    bridgeService.disconnect();
  });

  describe('QR Code Management', () => {
    it('should request QR code successfully', async () => {
      // Mock the makeRequest method for this test
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: true,
        data: {
          qr_code: 'mock-qr-code-data',
        },
        message: 'QR code generated',
      });

      const result = await bridgeService.getQRCode();

      expect(result.success).toBe(true);
      expect(result.qr_code).toBe('mock-qr-code-data');
      expect(mockMakeRequest).toHaveBeenCalledWith('GET', '/api/qr');

      mockMakeRequest.mockRestore();
    });

    it('should handle QR code request failure', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: false,
        message: 'Already connected',
      });

      const result = await bridgeService.getQRCode();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Already connected');
      expect(result.qr_code).toBeUndefined();

      mockMakeRequest.mockRestore();
    });
  });

  describe('Connection Status', () => {
    it('should get connection status when connected', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: true,
        data: {
          connected: true,
          user_info: {
            phone: '1234567890',
            name: 'Test User',
            jid: '1234567890@s.whatsapp.net',
          },
          last_seen: '2025-06-18T10:00:00Z',
        },
      });

      const result = await bridgeService.getConnectionStatus();

      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
      expect(result.user_info).toBeDefined();
      expect(result.user_info?.phone).toBe('1234567890');
      expect(result.last_seen).toBe('2025-06-18T10:00:00Z');

      mockMakeRequest.mockRestore();
    });

    it('should get connection status when disconnected', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: true,
        data: {
          connected: false,
        },
      });

      const result = await bridgeService.getConnectionStatus();

      expect(result.success).toBe(true);
      expect(result.connected).toBe(false);
      expect(result.user_info).toBeUndefined();

      mockMakeRequest.mockRestore();
    });
  });

  describe('Chat Management', () => {
    it('should get chat list successfully', async () => {
      // Mock that we're connected - need to set the private property
      (bridgeService as any).connected = true;

      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: true,
        data: {
          chats: [
            {
              jid: '1234567890@s.whatsapp.net',
              name: 'Test Contact',
              last_message: 'Hello world',
              last_message_time: '2025-06-18T10:00:00Z',
              unread_count: 2,
            },
            {
              jid: '1234567890-group@g.us',
              name: 'Test Group',
              last_message: 'Group message',
              last_message_time: '2025-06-18T09:30:00Z',
              unread_count: 0,
            },
          ],
        },
      });

      const result = await bridgeService.getChatList();

      expect(result.success).toBe(true);
      expect(result.chats).toHaveLength(2);
      expect(result.chats[0].name).toBe('Test Contact');
      expect(result.chats[1].name).toBe('Test Group');

      mockMakeRequest.mockRestore();
    });

    it('should throw error when not connected', async () => {
      (bridgeService as any).connected = false;

      await expect(bridgeService.getChatList()).rejects.toThrow(
        'WhatsApp Bridge is not connected'
      );
    });
  });

  describe('Message History', () => {
    it('should get message history successfully', async () => {
      (bridgeService as any).connected = true;

      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: true,
        data: {
          messages: [
            {
              id: 'msg-1',
              content: 'Hello',
              timestamp: '2025-06-18T10:00:00Z',
              sender: '1234567890@s.whatsapp.net',
              is_from_me: false,
            },
            {
              id: 'msg-2',
              content: 'Hi there!',
              timestamp: '2025-06-18T10:01:00Z',
              sender: 'me',
              is_from_me: true,
            },
          ],
          total_count: 2,
        },
      });

      const result = await bridgeService.getMessageHistory({
        chat_jid: '1234567890@s.whatsapp.net',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.total_count).toBe(2);
      expect(result.messages[0].content).toBe('Hello');
      expect(result.messages[1].is_from_me).toBe(true);

      mockMakeRequest.mockRestore();
    });

    it('should validate required parameters', async () => {
      (bridgeService as any).connected = true;

      await expect(
        bridgeService.getMessageHistory({ chat_jid: '' })
      ).rejects.toThrow('Chat JID is required');
    });
  });

  describe('Advanced Actions', () => {
    beforeEach(() => {
      (bridgeService as any).connected = true;
    });

    it('should send typing indicator', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({ success: true });

      const result = await bridgeService.sendTyping(
        '1234567890@s.whatsapp.net',
        true
      );

      expect(result).toBe(true);
      expect(mockMakeRequest).toHaveBeenCalledWith('POST', '/api/typing', {
        jid: '1234567890@s.whatsapp.net',
        isTyping: true,
      });

      mockMakeRequest.mockRestore();
    });

    it('should mark message as read', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({ success: true });

      const result = await bridgeService.markAsRead(
        '1234567890@s.whatsapp.net',
        'msg-id-123'
      );

      expect(result).toBe(true);
      expect(mockMakeRequest).toHaveBeenCalledWith('POST', '/api/read', {
        jid: '1234567890@s.whatsapp.net',
        messageId: 'msg-id-123',
      });

      mockMakeRequest.mockRestore();
    });

    it('should disconnect from bridge', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({ success: true });

      const result = await bridgeService.disconnectFromBridge();

      expect(result).toBe(true);
      expect(mockMakeRequest).toHaveBeenCalledWith('POST', '/api/disconnect');

      mockMakeRequest.mockRestore();
    });
  });

  describe('Bridge Information', () => {
    it('should get bridge info', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockResolvedValue({
        success: true,
        data: {
          version: '1.0.0',
          name: 'WhatsApp Bridge',
          uptime: '1h 30m',
          connected: true,
        },
      });

      const result = await bridgeService.getBridgeInfo();

      expect(result.version).toBe('1.0.0');
      expect(result.name).toBe('WhatsApp Bridge');

      mockMakeRequest.mockRestore();
    });

    it('should perform comprehensive health check', async () => {
      const mockCheckBridgeHealth = jest.spyOn(
        bridgeService as any,
        'checkBridgeHealth'
      );
      mockCheckBridgeHealth.mockResolvedValue({
        status: 'connected',
        bridge_available: true,
        last_check: '2025-06-18T10:00:00Z',
      });

      const result = await bridgeService.performHealthCheck();

      expect(result.status).toBe('connected');
      expect(result.bridge_available).toBe(true);
      expect(result.last_check).toBeDefined();

      mockCheckBridgeHealth.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle QR code errors gracefully', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockRejectedValue(new Error('Network error'));

      await expect(bridgeService.getQRCode()).rejects.toThrow('Network error');

      mockMakeRequest.mockRestore();
    });

    it('should handle connection status errors', async () => {
      const mockMakeRequest = jest.spyOn(bridgeService as any, 'makeRequest');
      mockMakeRequest.mockRejectedValue(new Error('Connection failed'));

      await expect(bridgeService.getConnectionStatus()).rejects.toThrow();

      mockMakeRequest.mockRestore();
    });

    it('should handle health check failures', async () => {
      const mockCheckBridgeHealth = jest.spyOn(
        bridgeService as any,
        'checkBridgeHealth'
      );
      mockCheckBridgeHealth.mockRejectedValue(new Error('Health check failed'));

      const result = await bridgeService.performHealthCheck();

      expect(result.status).toBe('error');
      expect(result.bridge_available).toBe(false);
      expect(result.error).toBe('Health check failed');

      mockCheckBridgeHealth.mockRestore();
    });
  });
});
