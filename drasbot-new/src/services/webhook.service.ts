/**
 * Webhook Server for receiving messages from WhatsApp Bridge
 */

import express from 'express';
import { Logger } from '../utils/logger';
import { MessageProcessorService } from '../services/message-processor.service';
import type { IncomingMessage as ProcessorIncomingMessage } from './message-processor.service';
import type { MessageType } from '../types';

export interface IncomingMessage {
  chat_jid: string;
  sender: string;
  content: string;
  timestamp: string;
}

export class WebhookServer {
  private static instance: WebhookServer;
  private app: express.Application;
  private server: any;
  private logger: Logger;
  private messageProcessor: MessageProcessorService;
  private isRunning: boolean = false;

  private constructor() {
    this.logger = Logger.getInstance();
    this.messageProcessor = MessageProcessorService.getInstance();
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  public static getInstance(): WebhookServer {
    if (!WebhookServer.instance) {
      WebhookServer.instance = new WebhookServer();
    }
    return WebhookServer.instance;
  }

  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Add CORS if needed
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      next();
    });

    // Request logging
    this.app.use((req, _res, next) => {
      this.logger.info('WebhookServer', `${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'DrasBot Webhook Server',
        timestamp: new Date().toISOString()
      });
    });

    // WhatsApp webhook for incoming messages
    this.app.post('/webhook/whatsapp', async (req, res) => {
      try {
        const message: IncomingMessage = req.body;
        
        this.logger.info('WebhookServer', 
          `Received message from ${message.sender} in ${message.chat_jid}: ${message.content}`
        );

        // Validate message
        if (!message.chat_jid || !message.sender || !message.content) {
          res.status(400).json({ 
            success: false, 
            error: 'Missing required fields' 
          });
          return;
        }

        // Process the message
        await this.processIncomingMessage(message);

        res.json({ 
          success: true, 
          message: 'Message processed successfully' 
        });

      } catch (error) {
        this.logger.error('WebhookServer', 'Error processing webhook message', error);
        res.status(500).json({ 
          success: false, 
          error: 'Internal server error' 
        });
      }
    });

    // Fallback route
    this.app.use('*', (_req, res) => {
      res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
      });
    });
  }

  private async processIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      // Convert bridge message format to internal format
      const messageData: ProcessorIncomingMessage = {
        id: `msg_${Date.now()}`,
        from: message.chat_jid,
        content: message.content,
        messageType: 'text' as MessageType,
        timestamp: message.timestamp,
        metadata: {
          sender: message.sender,
          chatJid: message.chat_jid
        }
      };

      // Use message processor to handle the message
      await this.messageProcessor.processMessage(messageData);

    } catch (error) {
      this.logger.error('WebhookServer', 'Error processing incoming message', error);
      throw error;
    }
  }

  public async start(port: number = 3000): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('WebhookServer', 'Webhook server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          this.isRunning = true;
          this.logger.info('WebhookServer', `🌐 Webhook server started on port ${port}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          this.logger.error('WebhookServer', 'Server error', error);
          reject(error);
        });

      } catch (error) {
        this.logger.error('WebhookServer', 'Failed to start webhook server', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      this.logger.warn('WebhookServer', 'Webhook server not running');
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.logger.info('WebhookServer', '🔴 Webhook server stopped');
        resolve();
      });
    });
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }
}

export default WebhookServer;
