/**
 * DrasBot Core Tests
 */

import { DrasBot } from '../src/core/bot';

describe('DrasBot', () => {
  let bot: DrasBot;

  beforeEach(() => {
    bot = DrasBot.getInstance();
  });

  afterEach(async () => {
    try {
      await bot.cleanup();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const bot1 = DrasBot.getInstance();
      const bot2 = DrasBot.getInstance();
      expect(bot1).toBe(bot2);
    });
  });

  describe('getStatus', () => {
    it('should return a valid status object', () => {
      const status = bot.getStatus();
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('servicesStatus');
      expect(typeof status.running).toBe('boolean');
      expect(typeof status.servicesStatus).toBe('object');
    });

    it('should show not running initially', () => {
      const status = bot.getStatus();
      expect(status.running).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(bot.initialize()).resolves.not.toThrow();
    });

    it('should not throw when initializing twice', async () => {
      await bot.initialize();
      await expect(bot.initialize()).resolves.not.toThrow();
    });
  });

  describe('start and stop', () => {
    it('should throw error when starting without initialization', async () => {
      const freshBot = DrasBot.getInstance();
      await expect(freshBot.start()).rejects.toThrow('Bot not initialized');
    });

    it('should start after initialization', async () => {
      await bot.initialize();
      await expect(bot.start()).resolves.not.toThrow();
    });
  });
});
