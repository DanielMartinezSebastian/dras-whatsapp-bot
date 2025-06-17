"use strict";
/**
 * Test setup file
 * Configures the testing environment for Jest
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Setup environment for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.LOG_LEVEL = 'error';
// Mock external dependencies
jest.mock('dotenv', () => ({
    config: jest.fn()
}));
// Global test utilities
global.testUtils = {
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
            privacy_level: 'normal'
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
        updated_at: new Date().toISOString()
    })
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
//# sourceMappingURL=setup.js.map