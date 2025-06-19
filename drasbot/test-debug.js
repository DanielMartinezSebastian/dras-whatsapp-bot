// Debug test with TypeScript compilation
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run with ts-node
const tsNode = spawn(
  'npx',
  [
    'ts-node',
    '-e',
    `
// Debug test
console.log('Starting debug test...');

// Mock axios first
const axios = require('axios');
const mockAxiosInstance = {
  request: jest.fn().mockResolvedValue({
    status: 200,
    data: {
      success: true,
      data: { messageId: 'msg_123456789' },
      message: 'Message sent successfully',
      timestamp: new Date().toISOString()
    },
    headers: {},
    config: {}
  }),
  defaults: { baseURL: 'http://127.0.0.1:8080', timeout: 15000, headers: {} },
  interceptors: { request: { use: jest.fn(), eject: jest.fn() }, response: { use: jest.fn(), eject: jest.fn() } }
};

jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance);

async function debugTest() {
  const { WhatsAppBridgeService } = await import('./src/services/whatsapp-bridge.service');
  
  const bridge = WhatsAppBridgeService.getInstance();
  
  try {
    console.log('Initializing bridge...');
    await bridge.initialize();
    console.log('Bridge connected:', bridge.connected);
    
    console.log('Sending message...');
    const result = await bridge.sendTextMessage('1234567890@s.whatsapp.net', 'Test message');
    console.log('Send result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTest();
`,
  ],
  { stdio: 'inherit' }
);

tsNode.on('close', code => {
  process.exit(code);
});
