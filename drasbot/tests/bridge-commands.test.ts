/**
 * Bridge Commands Test Suite
 *
 * Tests for WhatsApp Bridge command handlers and functionality.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  handleBridgeCommand,
  handleChatsCommand,
  handleHistoryCommand,
  handleQrCommand,
  handleBridgeHealthCommand,
} from '../src/commands/bridge.handlers';
import { WhatsAppBridgeService } from '../src/services/whatsapp-bridge.service';
import { Message, PluginContext, UserLevel } from '../src/types';

// Mock the bridge service
jest.mock('../src/services/whatsapp-bridge.service');

describe('Bridge Commands', () => {
  let mockBridgeService: jest.Mocked<WhatsAppBridgeService>;
  let mockMessage: Message;
  let mockUserContext: PluginContext;
  let mockAdminContext: PluginContext;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock bridge service instance
    mockBridgeService = {
      getStatus: jest.fn(),
      isAvailable: jest.fn(),
      getBridgeInfo: jest.fn(),
      getConnectionStatus: jest.fn(),
      getConfig: jest.fn(),
      getChatList: jest.fn(),
      getMessageHistory: jest.fn(),
      getQRCode: jest.fn(),
      performHealthCheck: jest.fn(),
    } as any;

    // Mock the singleton getInstance
    (WhatsAppBridgeService.getInstance as jest.Mock).mockReturnValue(
      mockBridgeService
    );

    // Create mock message
    mockMessage = {
      id: 'test-message-id',
      user_id: 'test-user-id',
      whatsapp_message_id: 'test-whatsapp-id',
      content: '!bridge',
      message_type: 'text',
      is_from_bot: false,
      processed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {},
    };

    // Create mock user context
    mockUserContext = {
      user: {
        id: 1,
        jid: '5521234567890@s.whatsapp.net',
        phoneNumber: '5521234567890',
        name: 'Test User',
        userLevel: UserLevel.USER,
        isRegistered: true,
        registrationDate: new Date(),
        lastActivity: new Date(),
        messageCount: 10,
        banned: false,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      config: {},
      database: {},
      logger: {},
      whatsappBridge: {},
    };

    // Create mock admin context
    mockAdminContext = {
      ...mockUserContext,
      user: {
        ...mockUserContext.user,
        userLevel: UserLevel.ADMIN,
      },
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Bridge Status Command', () => {
    it('should return bridge status successfully', async () => {
      // Setup mocks
      mockBridgeService.getStatus.mockReturnValue({
        connected: true,
        config: {
          baseURL: 'http://localhost',
          port: 8080,
          timeout: 15000,
        },
        lastHealthCheck: '2025-06-18T00:00:00.000Z',
      });
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getBridgeInfo.mockResolvedValue({
        version: '1.0.0',
        uptime: '2 hours',
        config: true,
      });
      mockBridgeService.getConnectionStatus.mockResolvedValue({
        success: true,
        connected: true,
        user_info: {
          phone: '5521234567890',
          name: 'Test User',
          jid: 'test@s.whatsapp.net',
        },
      });

      const result = await handleBridgeCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Estado del Bridge WhatsApp');
      expect(result.message).toContain('✅ Conectado');
      expect(result.data?.type).toBe('bridge_status');
    });

    it('should handle bridge unavailable', async () => {
      // Setup mocks
      mockBridgeService.getStatus.mockReturnValue({
        connected: false,
        config: {
          baseURL: 'http://localhost',
          port: 8080,
          timeout: 15000,
        },
        lastHealthCheck: '2025-06-18T00:00:00.000Z',
      });
      mockBridgeService.isAvailable.mockResolvedValue(false);
      mockBridgeService.getBridgeInfo.mockRejectedValue(
        new Error('Bridge not available')
      );

      const result = await handleBridgeCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('❌ Desconectado');
    });

    it('should show admin configuration for admins', async () => {
      // Setup mocks
      mockBridgeService.getStatus.mockReturnValue({
        connected: true,
        config: {
          baseURL: 'http://localhost',
          port: 8080,
          timeout: 15000,
        },
        lastHealthCheck: '2025-06-18T00:00:00.000Z',
      });
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getConfig.mockReturnValue({
        baseURL: 'http://localhost',
        port: 8080,
        timeout: 15000,
        retry: {
          maxRetries: 3,
          retryDelay: 1000,
        },
      });

      const result = await handleBridgeCommand(mockMessage, mockAdminContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Configuración del Bridge');
      expect(result.message).toContain('http://localhost:8080');
    });
  });

  describe('Chat List Command', () => {
    it('should return chat list successfully', async () => {
      // Setup mocks
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getChatList.mockResolvedValue({
        success: true,
        chats: [
          {
            jid: 'test1@s.whatsapp.net',
            name: 'Test Chat 1',
            last_message: 'Hello',
            last_message_time: '2025-06-18T00:00:00.000Z',
            unread_count: 2,
          },
          {
            jid: 'test2@s.whatsapp.net',
            name: 'Test Chat 2',
            last_message: 'Hi there',
            last_message_time: '2025-06-17T23:00:00.000Z',
            unread_count: 0,
          },
        ],
      });

      const result = await handleChatsCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Lista de Chats');
      expect(result.message).toContain('Test Chat 1');
      expect(result.message).toContain('Test Chat 2');
      expect(result.data?.type).toBe('chat_list');
    });

    it('should handle bridge unavailable', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(false);

      const result = await handleChatsCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('bridge de WhatsApp no está disponible');
    });

    it('should handle empty chat list', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getChatList.mockResolvedValue({
        success: true,
        chats: [],
      });

      const result = await handleChatsCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No se encontraron chats disponibles');
    });

    it('should parse limit parameter correctly', async () => {
      const messageWithLimit = {
        ...mockMessage,
        content: '!chats 5',
      };

      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getChatList.mockResolvedValue({
        success: true,
        chats: [],
      });

      const result = await handleChatsCommand(
        messageWithLimit,
        mockUserContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(5);
    });
  });

  describe('Message History Command', () => {
    it('should return message history successfully', async () => {
      const messageWithChatId = {
        ...mockMessage,
        content: '!history test@s.whatsapp.net',
      };

      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getMessageHistory.mockResolvedValue({
        success: true,
        messages: [
          {
            id: 'msg1',
            content: 'Hello world',
            timestamp: '2025-06-18T00:00:00.000Z',
            sender: 'Test User',
            is_from_me: false,
          },
          {
            id: 'msg2',
            content: 'Hi there!',
            timestamp: '2025-06-18T00:01:00.000Z',
            sender: 'Bot',
            is_from_me: true,
          },
        ],
        total_count: 2,
      });

      const result = await handleHistoryCommand(
        messageWithChatId,
        mockUserContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Historial de Mensajes');
      expect(result.message).toContain('Hello world');
      expect(result.message).toContain('Hi there!');
      expect(result.data?.type).toBe('message_history');
    });

    it('should handle bridge unavailable', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(false);

      const result = await handleHistoryCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('bridge de WhatsApp no está disponible');
    });

    it('should handle empty message history', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getMessageHistory.mockResolvedValue({
        success: true,
        messages: [],
        total_count: 0,
      });

      const result = await handleHistoryCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain(
        'No se encontraron mensajes en el historial'
      );
    });
  });

  describe('QR Code Command', () => {
    it('should return QR code for admin users', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getQRCode.mockResolvedValue({
        success: true,
        qr_code: 'test-qr-code-data',
        message: 'QR code generated',
      });

      const result = await handleQrCommand(mockMessage, mockAdminContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Código QR para WhatsApp');
      expect(result.message).toContain('test-qr-code-data');
    });

    it('should deny access to non-admin users', async () => {
      const result = await handleQrCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No tienes permisos');
    });

    it('should handle bridge unavailable', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(false);

      const result = await handleQrCommand(mockMessage, mockAdminContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('bridge de WhatsApp no está disponible');
    });

    it('should handle QR code not available', async () => {
      mockBridgeService.isAvailable.mockResolvedValue(true);
      mockBridgeService.getQRCode.mockResolvedValue({
        success: false,
        message: 'Device already connected',
      });

      const result = await handleQrCommand(mockMessage, mockAdminContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No se pudo obtener el código QR');
    });
  });

  describe('Bridge Health Command', () => {
    it('should perform health check for admin users', async () => {
      mockBridgeService.performHealthCheck.mockResolvedValue({
        status: 'connected',
        bridge_available: true,
        last_check: '2025-06-18T00:00:00.000Z',
      });

      const result = await handleBridgeHealthCommand(
        mockMessage,
        mockAdminContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Verificación de Salud del Bridge');
      expect(result.message).toContain('✅ Saludable');
    });

    it('should deny access to non-admin users', async () => {
      const result = await handleBridgeHealthCommand(
        mockMessage,
        mockUserContext
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No tienes permisos');
    });

    it('should handle health check with errors', async () => {
      mockBridgeService.performHealthCheck.mockResolvedValue({
        status: 'error',
        bridge_available: false,
        last_check: '2025-06-18T00:00:00.000Z',
        error: 'Connection timeout',
      });

      const result = await handleBridgeHealthCommand(
        mockMessage,
        mockAdminContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('❌ Problema detectado');
      expect(result.message).toContain('Connection timeout');
    });
  });

  describe('Error Handling', () => {
    it('should handle bridge service errors gracefully in bridge command', async () => {
      mockBridgeService.getStatus.mockImplementation(() => {
        throw new Error('Service error');
      });

      const result = await handleBridgeCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error al obtener el estado del bridge');
    });

    it('should handle bridge service errors gracefully in chats command', async () => {
      mockBridgeService.isAvailable.mockRejectedValue(
        new Error('Service error')
      );

      const result = await handleChatsCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error al obtener la lista de chats');
    });

    it('should handle bridge service errors gracefully in history command', async () => {
      mockBridgeService.isAvailable.mockRejectedValue(
        new Error('Service error')
      );

      const result = await handleHistoryCommand(mockMessage, mockUserContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        'Error al obtener el historial de mensajes'
      );
    });
  });
});
