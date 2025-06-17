/**
 * DrasBot - Main Entry Point
 * 
 * Modern TypeScript WhatsApp Chatbot with Plugin Architecture
 * @author Daniel Martinez Sebastian
 * @version 2.0.0
 */

import dotenv from 'dotenv';
import { DrasBot } from '@core/bot';
import { Logger } from '@utils/logger';
import { DatabaseService } from '@services/database.service';
import { ConfigService } from '@services/config.service';

// Load environment variables
dotenv.config();

/**
 * Application startup
 */
async function main(): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    logger.info('🚀 Starting DrasBot v2.0.0...');
    
    // Initialize services
    logger.info('📦 Initializing services...');
    const configService = ConfigService.getInstance();
    const databaseService = DatabaseService.getInstance();
    
    // Initialize database
    await databaseService.initialize();
    logger.info('✅ Database initialized');
    
    // Create bot instance
    const bot = new DrasBot();
    
    // Initialize bot
    await bot.initialize();
    logger.info('✅ Bot initialized');
    
    // Start bot
    await bot.start();
    logger.info('🎉 DrasBot is now running!');
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('📴 Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      await databaseService.close();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('📴 Received SIGINT, shutting down gracefully...');
      await bot.stop();
      await databaseService.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start DrasBot:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('💥 Unhandled error during startup:', error);
  process.exit(1);
});
