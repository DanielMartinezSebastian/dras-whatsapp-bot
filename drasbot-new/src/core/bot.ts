/**
 * DrasBot Core
 * Main bot class that orchestrates all services
 */

import { Logger } from '../utils/logger';
import { ConfigService } from '../services/config.service';
import { DatabaseService } from '../services/database.service';
import { WhatsAppBridgeService } from '../services/whatsapp-bridge.service';
import { WebhookServer } from '../services/webhook.service';
import { MessageProcessorService } from '../services/message-processor.service';
import { BotConfig } from '../types';

export interface BotStatus {
  running: boolean;
  startTime?: Date | undefined;
  uptime?: number;
  servicesStatus: Record<string, boolean>;
}

export class DrasBot {
  private static instance: DrasBot;
  private logger: Logger;
  private configService: ConfigService;
  private databaseService: DatabaseService;
  private whatsappService: WhatsAppBridgeService;
  private webhookServer: WebhookServer;
  private messageProcessor: MessageProcessorService;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private startTime: Date | undefined;

  private constructor() {
    this.logger = Logger.getInstance();
    this.configService = ConfigService.getInstance();
    this.databaseService = DatabaseService.getInstance();
    this.whatsappService = WhatsAppBridgeService.getInstance();
    this.webhookServer = WebhookServer.getInstance();
    this.messageProcessor = MessageProcessorService.getInstance();
  }

  public static getInstance(): DrasBot {
    if (!DrasBot.instance) {
      DrasBot.instance = new DrasBot();
    }
    return DrasBot.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('DrasBot', 'Bot already initialized');
      return;
    }

    try {
      this.logger.info('DrasBot', 'Initializing DrasBot...');

      // Initialize configuration service
      await this.configService.initialize();

      // Initialize database service
      await this.databaseService.initialize();

      // Try to initialize WhatsApp bridge service (optional)
      try {
        await this.whatsappService.initialize();
        this.logger.info('DrasBot', 'WhatsApp Bridge service connected');
      } catch (error) {
        this.logger.warn(
          'DrasBot',
          'WhatsApp Bridge service not available, continuing without it',
          error
        );
      }

      // Initialize message processor with plugins
      await this.messageProcessor.initialize();
      this.logger.info('DrasBot', 'Message processor initialized with plugins');

      this.isInitialized = true;
      this.logger.info('DrasBot', 'DrasBot initialized successfully');
    } catch (error) {
      this.logger.error('DrasBot', 'Failed to initialize DrasBot', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    if (this.isRunning) {
      this.logger.warn('DrasBot', 'Bot already running');
      return;
    }

    try {
      this.logger.info('DrasBot', 'Starting DrasBot...');

      this.startTime = new Date();
      this.isRunning = true;

      // Start webhook server for receiving messages from bridge
      await this.webhookServer.start(3000);
      this.logger.info(
        'DrasBot',
        'Webhook server started for bridge integration'
      );

      // TODO: Initialize WhatsApp client
      // TODO: Initialize message processor
      // TODO: Initialize plugin loader
      // TODO: Initialize context manager

      this.logger.info('DrasBot', 'DrasBot started successfully');
    } catch (error) {
      this.logger.error('DrasBot', 'Failed to start DrasBot', error);
      this.isRunning = false;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('DrasBot', 'Bot not running');
      return;
    }

    try {
      this.logger.info('DrasBot', 'Stopping DrasBot...');

      // Stop webhook server
      await this.webhookServer.stop();

      // TODO: Stop WhatsApp client
      // TODO: Stop message processor
      // TODO: Cleanup contexts
      // TODO: Unload plugins

      this.isRunning = false;
      this.startTime = undefined;

      this.logger.info('DrasBot', 'DrasBot stopped successfully');
    } catch (error) {
      this.logger.error('DrasBot', 'Error stopping DrasBot', error);
      throw error;
    }
  }

  public async restart(): Promise<void> {
    this.logger.info('DrasBot', 'Restarting DrasBot...');
    await this.stop();
    await this.start();
  }

  public getStatus(): BotStatus {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      running: this.isRunning,
      startTime: this.startTime,
      uptime,
      servicesStatus: {
        config: this.isInitialized,
        database: this.isInitialized,
        whatsapp: this.whatsappService.isConnected(),
        plugins: false, // TODO: Implement plugin loader status
        contexts: false, // TODO: Implement context manager status
      },
    };
  }

  public getConfig(): BotConfig {
    if (!this.isInitialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    return this.configService.getConfig();
  }

  public async sendMessage(
    recipient: string,
    message: string
  ): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    if (!this.whatsappService.isConnected()) {
      throw new Error('WhatsApp service not connected.');
    }

    try {
      return await this.whatsappService.sendTextMessage(recipient, message);
    } catch (error) {
      this.logger.error('DrasBot', 'Failed to send message', error);
      return false;
    }
  }

  public async sendMediaMessage(
    recipient: string,
    mediaPath: string,
    caption?: string
  ): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    if (!this.whatsappService.isConnected()) {
      throw new Error('WhatsApp service not connected.');
    }

    try {
      return await this.whatsappService.sendMediaMessage(
        recipient,
        mediaPath,
        caption
      );
    } catch (error) {
      this.logger.error('DrasBot', 'Failed to send media message', error);
      return false;
    }
  }

  public async cleanup(): Promise<void> {
    this.logger.info('DrasBot', 'Cleaning up DrasBot...');

    try {
      if (this.isRunning) {
        await this.stop();
      }

      // Cleanup services
      this.configService.cleanup();
      await this.databaseService.close();
      await this.whatsappService.disconnect();

      this.isInitialized = false;
      this.logger.info('DrasBot', 'DrasBot cleanup completed');
    } catch (error) {
      this.logger.error('DrasBot', 'Error during cleanup', error);
      throw error;
    }
  }
}

export default DrasBot;
