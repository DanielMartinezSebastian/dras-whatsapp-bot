/**
 * WhatsApp Bridge Mock for Testing
 * 
 * Mock implementation of the WhatsApp Bridge API to avoid external dependencies during testing
 */

import { jest } from '@jest/globals';

// Mock bridge responses
const mockBridgeResponses = {
  health: {
    success: true,
    data: {
      status: 'healthy',
      qr: null,
      connected: true,
      info: {
        version: '1.0.0',
        session: 'test-session'
      }
    },
    timestamp: new Date().toISOString()
  },
  sendMessage: {
    success: true,
    data: {
      messageId: 'msg_123456789'
    },
    message: 'Message sent successfully',
    timestamp: new Date().toISOString()
  },
  sendMedia: {
    success: true,
    data: {
      messageId: 'msg_123456789'
    },
    message: 'Media sent successfully',
    timestamp: new Date().toISOString()
  }
};

// Mock axios to intercept HTTP calls to the bridge
export const mockWhatsAppBridge = () => {
  const axios = require('axios');
  
  // Mock axios.create to return a mock instance
  const mockAxiosInstance = {
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    defaults: {
      baseURL: 'http://127.0.0.1:8080',
      timeout: 15000,
      headers: {}
    },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  // Mock specific bridge endpoints
  const mockImplementation = (config: any) => {
    const { method, url } = config;
    
    // Health check endpoint
    if (method?.toLowerCase() === 'get' && url?.includes('/health')) {
      return Promise.resolve({
        status: 200,
        data: mockBridgeResponses.health,
        headers: {},
        config
      });
    }

    // Send message endpoint
    if (method?.toLowerCase() === 'post' && url?.includes('/api/send')) {
      const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      
      if (data?.media_path) {
        return Promise.resolve({
          status: 200,
          data: mockBridgeResponses.sendMedia,
          headers: {},
          config
        });
      } else {
        return Promise.resolve({
          status: 200,
          data: mockBridgeResponses.sendMessage,
          headers: {},
          config
        });
      }
    }

    // Default response for unknown endpoints
    return Promise.resolve({
      status: 200,
      data: { success: true },
      headers: {},
      config
    });
  };

  mockAxiosInstance.request.mockImplementation(mockImplementation);
  
  // Also mock post and get methods directly
  (mockAxiosInstance.post as any).mockImplementation((endpoint: string, data: any) => 
    mockImplementation({ method: 'POST', url: endpoint, data })
  );
  
  (mockAxiosInstance.get as any).mockImplementation((endpoint: string) => 
    mockImplementation({ method: 'GET', url: endpoint })
  );

  // Mock axios.create to return our mock instance
  jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance);
  
  return mockAxiosInstance;
};

// Mock bridge error scenarios
export const mockWhatsAppBridgeError = (errorType: 'timeout' | 'network' | 'server' = 'server') => {
  const axios = require('axios');
  
  const mockAxiosInstance = {
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    defaults: {
      baseURL: 'http://127.0.0.1:8080',
      timeout: 15000,
      headers: {}
    },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  // Mock different error types
  switch (errorType) {
    case 'server':
      // For server errors, we want to return HTTP 500 responses (bridge available but server error)
      const serverErrorMock = () => Promise.reject({
        response: {
          status: 500,
          data: 'Internal Server Error'
        },
        message: 'Request failed with status code 500'
      });
      (mockAxiosInstance.request as any).mockImplementation(serverErrorMock);
      (mockAxiosInstance.post as any).mockImplementation(serverErrorMock);
      (mockAxiosInstance.get as any).mockImplementation(serverErrorMock);
      break;
    case 'network':
      // For network errors, we want to return connection refused (bridge not available)
      const networkErrorMock = () => Promise.reject({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8080'
      });
      (mockAxiosInstance.request as any).mockImplementation(networkErrorMock);
      (mockAxiosInstance.post as any).mockImplementation(networkErrorMock);
      (mockAxiosInstance.get as any).mockImplementation(networkErrorMock);
      break;
    case 'timeout':
      // For timeout errors, bridge not available
      const timeoutErrorMock = () => Promise.reject({
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded'
      });
      (mockAxiosInstance.request as any).mockImplementation(timeoutErrorMock);
      (mockAxiosInstance.post as any).mockImplementation(timeoutErrorMock);
      (mockAxiosInstance.get as any).mockImplementation(timeoutErrorMock);
      break;
  }

  jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance);
  
  return mockAxiosInstance;
};

// Reset all mocks
export const resetWhatsAppBridgeMocks = () => {
  jest.clearAllMocks();
};
