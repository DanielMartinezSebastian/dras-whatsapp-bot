/**
 * Database Seeder
 * Manages database seeding with test and development data
 */

import { DatabaseService } from '../services/database.service';
import { UserLevel } from '../types';
import { Logger } from '../utils/logger';

export interface SeedData {
  users?: Array<{
    jid: string;
    phoneNumber: string;
    name: string;
    userLevel: UserLevel;
    isRegistered: boolean;
    preferences?: Record<string, any>;
  }>;
  messages?: Array<{
    user_id: number;
    whatsapp_message_id: string;
    content: string;
    message_type: string;
    is_from_bot: boolean;
    metadata?: Record<string, any>;
  }>;
}

export class DatabaseSeeder {
  private static instance: DatabaseSeeder;
  private logger: Logger;
  private db: DatabaseService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder();
    }
    return DatabaseSeeder.instance;
  }

  public async seed(
    environment: 'development' | 'test' | 'production' = 'development'
  ): Promise<void> {
    try {
      this.logger.info(
        'DatabaseSeeder',
        `Starting database seeding for ${environment} environment`
      );

      // Ensure database is initialized
      await this.db.initialize();

      const seedData = this.getSeedData(environment);

      if (seedData.users) {
        await this.seedUsers(seedData.users);
      }

      if (seedData.messages) {
        await this.seedMessages(seedData.messages);
      }

      this.logger.info(
        'DatabaseSeeder',
        'Database seeding completed successfully'
      );
    } catch (error) {
      this.logger.error('DatabaseSeeder', 'Database seeding failed', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private getSeedData(environment: string): SeedData {
    switch (environment) {
      case 'development':
        return this.getDevelopmentSeedData();
      case 'test':
        return this.getTestSeedData();
      case 'production':
        return this.getProductionSeedData();
      default:
        return {};
    }
  }

  private getDevelopmentSeedData(): SeedData {
    return {
      users: [
        {
          jid: 'admin@s.whatsapp.net',
          phoneNumber: '1234567890',
          name: 'Administrator',
          userLevel: UserLevel.ADMIN,
          isRegistered: true,
          preferences: {
            language: 'es',
            notifications: true,
            timezone: 'UTC',
          },
        },
        {
          jid: 'mod@s.whatsapp.net',
          phoneNumber: '1234567891',
          name: 'Moderator',
          userLevel: UserLevel.MODERATOR,
          isRegistered: true,
          preferences: {
            language: 'es',
            notifications: true,
          },
        },
        {
          jid: 'user1@s.whatsapp.net',
          phoneNumber: '1234567892',
          name: 'Test User 1',
          userLevel: UserLevel.USER,
          isRegistered: true,
          preferences: {
            language: 'es',
          },
        },
        {
          jid: 'user2@s.whatsapp.net',
          phoneNumber: '1234567893',
          name: 'Test User 2',
          userLevel: UserLevel.USER,
          isRegistered: false,
          preferences: {},
        },
        {
          jid: 'guest@s.whatsapp.net',
          phoneNumber: '1234567894',
          name: 'Guest User',
          userLevel: UserLevel.USER,
          isRegistered: false,
          preferences: {},
        },
      ],
    };
  }

  private getTestSeedData(): SeedData {
    return {
      users: [
        {
          jid: 'testadmin@s.whatsapp.net',
          phoneNumber: '9876543210',
          name: 'Test Admin',
          userLevel: UserLevel.ADMIN,
          isRegistered: true,
          preferences: { language: 'es' },
        },
        {
          jid: 'testuser@s.whatsapp.net',
          phoneNumber: '9876543211',
          name: 'Test User',
          userLevel: UserLevel.USER,
          isRegistered: true,
          preferences: { language: 'es' },
        },
      ],
    };
  }

  private getProductionSeedData(): SeedData {
    // In production, we typically don't seed test data
    // Only essential system data if needed
    return {
      users: [
        // Only create owner if specified via environment variables
        ...(process.env.OWNER_PHONE
          ? [
              {
                jid: `${process.env.OWNER_PHONE}@s.whatsapp.net`,
                phoneNumber: process.env.OWNER_PHONE,
                name: process.env.OWNER_NAME || 'System Owner',
                userLevel: UserLevel.OWNER,
                isRegistered: true,
                preferences: {
                  language: process.env.DEFAULT_LANGUAGE || 'es',
                  notifications: true,
                },
              },
            ]
          : []),
      ],
    };
  }

  private async seedUsers(users: SeedData['users']): Promise<void> {
    if (!users) return;

    this.logger.info('DatabaseSeeder', `Seeding ${users.length} users...`);

    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await this.db.getUserByJid(userData.jid);

        if (existingUser) {
          this.logger.info(
            'DatabaseSeeder',
            `User already exists, skipping: ${userData.name} (${userData.jid})`
          );
          continue;
        }

        // Create the user
        const userToCreate = {
          jid: userData.jid,
          phoneNumber: userData.phoneNumber,
          name: userData.name,
          userLevel: userData.userLevel,
          isRegistered: userData.isRegistered,
          registrationDate: userData.isRegistered ? new Date() : null,
          lastActivity: new Date(),
          messageCount: 0,
          banned: false,
          preferences: userData.preferences || {},
        };

        await this.db.createUser(userToCreate);
        this.logger.info(
          'DatabaseSeeder',
          `Created user: ${userData.name} (${userData.userLevel})`
        );
      } catch (error) {
        this.logger.error(
          'DatabaseSeeder',
          `Failed to seed user: ${userData.name}`,
          {
            error: error instanceof Error ? error.message : error,
          }
        );
        // Continue with other users even if one fails
      }
    }

    this.logger.info('DatabaseSeeder', 'User seeding completed');
  }

  private async seedMessages(messages: SeedData['messages']): Promise<void> {
    if (!messages) return;

    this.logger.info(
      'DatabaseSeeder',
      `Seeding ${messages.length} messages...`
    );

    for (const messageData of messages) {
      try {
        const messageToCreate = {
          user_id: messageData.user_id.toString(),
          whatsapp_message_id: messageData.whatsapp_message_id,
          content: messageData.content,
          message_type: messageData.message_type as any,
          is_from_bot: messageData.is_from_bot,
          processed: true,
          metadata: messageData.metadata || {},
        };

        await this.db.saveMessage(messageToCreate);
        this.logger.info(
          'DatabaseSeeder',
          `Created message: ${messageData.content.substring(0, 50)}...`
        );
      } catch (error) {
        this.logger.error('DatabaseSeeder', `Failed to seed message`, {
          error: error instanceof Error ? error.message : error,
        });
        // Continue with other messages even if one fails
      }
    }

    this.logger.info('DatabaseSeeder', 'Message seeding completed');
  }

  public async clearAllData(): Promise<void> {
    try {
      this.logger.info('DatabaseSeeder', 'Clearing all database data...');

      // Note: In a real implementation, you'd want to disable foreign key checks
      // temporarily or clear in the correct order

      // This is a simplified version - in production you'd want more sophisticated clearing
      this.logger.warn(
        'DatabaseSeeder',
        'clearAllData not implemented - use migration reset instead'
      );
    } catch (error) {
      this.logger.error('DatabaseSeeder', 'Failed to clear database data', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getStats(): Promise<{
    users: number;
    messages: number;
    contexts: number;
  }> {
    try {
      const userStats = await this.db.getUserStats();

      return {
        users: userStats.totalUsers,
        messages: 0, // Would need to implement message count in DatabaseService
        contexts: 0, // Would need to implement context count in DatabaseService
      };
    } catch (error) {
      this.logger.error('DatabaseSeeder', 'Failed to get database stats', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}
