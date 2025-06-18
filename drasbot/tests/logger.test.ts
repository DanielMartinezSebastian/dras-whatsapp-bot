/**
 * Basic Logger Tests
 */

import { Logger, LogLevel } from '../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      expect(logger1).toBe(logger2);
    });
  });

  describe('setLogLevel', () => {
    it('should set log level correctly', () => {
      logger.setLogLevel(LogLevel.ERROR);
      // This test just verifies the method doesn't throw
      expect(() => logger.setLogLevel(LogLevel.DEBUG)).not.toThrow();
    });
  });

  describe('logging methods', () => {
    it('should not throw when logging debug messages', () => {
      expect(() => logger.debug('test', 'Debug message')).not.toThrow();
    });

    it('should not throw when logging info messages', () => {
      expect(() => logger.info('test', 'Info message')).not.toThrow();
    });

    it('should not throw when logging warn messages', () => {
      expect(() => logger.warn('test', 'Warning message')).not.toThrow();
    });

    it('should not throw when logging error messages', () => {
      expect(() => logger.error('test', 'Error message')).not.toThrow();
    });

    it('should accept additional data parameter', () => {
      const testData = { key: 'value' };
      expect(() =>
        logger.info('test', 'Message with data', testData)
      ).not.toThrow();
    });
  });

  describe('clearLogs', () => {
    it('should clear logs without throwing', () => {
      expect(() => logger.clearLogs()).not.toThrow();
    });
  });
});
