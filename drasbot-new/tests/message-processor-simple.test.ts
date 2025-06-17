/**
 * Simplified Message Processor Tests
 */

import { MessageProcessorService } from '../src/services/message-processor.service';

describe('MessageProcessorService - Basic Tests', () => {
  let messageProcessor: MessageProcessorService;

  beforeEach(() => {
    // Reset singleton for testing
    (MessageProcessorService as any).instance = undefined;
    messageProcessor = MessageProcessorService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MessageProcessorService.getInstance();
      const instance2 = MessageProcessorService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Basic Functionality', () => {
    it('should have required methods', () => {
      expect(typeof messageProcessor.initialize).toBe('function');
      expect(typeof messageProcessor.processMessage).toBe('function');
      expect(typeof messageProcessor.getStatus).toBe('function');
      expect(typeof messageProcessor.shutdown).toBe('function');
    });

    it('should return status object', () => {
      const status = messageProcessor.getStatus();
      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
    });
  });
});
