/**
 * Test setup file
 * Configures the testing environment for Jest
 */

import { mockWhatsAppBridge, resetWhatsAppBridgeMocks } from './mocks/whatsapp-bridge.mock';
import { setupTestPorts, cleanupTestPorts } from './utils/test-ports.util';

// Setup environment for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.LOG_LEVEL = 'error';

// Initialize test environment
beforeAll(async () => {
  // Setup dynamic ports to avoid conflicts
  await setupTestPorts();
  
  // Setup WhatsApp Bridge mocks
  mockWhatsAppBridge();
});

// Cleanup after each test
afterEach(() => {
  // Reset bridge mocks
  resetWhatsAppBridgeMocks();
});

// Final cleanup
afterAll(() => {
  // Cleanup test ports
  cleanupTestPorts();
});

// Mock external dependencies
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock Database Service globally
jest.mock('../src/services/database.service', () => {
  const { mockDatabaseService } = require('./mocks/database.mock');
  return {
    DatabaseService: {
      getInstance: jest.fn(() => mockDatabaseService),
    },
  };
});

// Extend global namespace for test utilities
declare global {
  var testUtils: {
    createMockUser: () => any;
    createMockMessage: () => any;
    createMockContext: () => any;
    cleanupTestData: () => Promise<void>;
  };
}

// Global test utilities
(global as any).testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    phone: '+1234567890',
    whatsapp_jid: '1234567890@s.whatsapp.net',
    display_name: 'Test User',
    user_level: 'user',
    user_type: 'normal',
    language: 'es',
    is_registered: true,
    last_activity: new Date().toISOString(),
    preferences: {
      notifications: true,
      auto_reply: true,
      language: 'es',
      timezone: 'UTC',
      privacy_level: 'normal',
    },
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),

  createMockMessage: () => ({
    id: 'test-message-id',
    user_id: 'test-user-id',
    whatsapp_message_id: 'whatsapp-msg-id',
    content: 'Test message',
    message_type: 'text',
    is_from_bot: false,
    processed: false,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
};

// Setup test database
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
