/**
 * Database Service
 * SQLite database implementation for DrasBot
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { Logger } from '../utils/logger';
import { IDatabaseService } from '../interfaces';
import {
  User,
  Message,
  ConversationContext,
  UserLevel,
  SQLiteUser,
  SQLiteUserInsert,
  SQLiteContext,
} from '../types';

export class DatabaseService implements IDatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database | null = null;
  private logger: Logger;
  private dbPath: string;

  private constructor() {
    this.logger = Logger.getInstance();
    this.dbPath = path.join(process.cwd(), 'data', 'drasbot.db');
    this.ensureDataDirectory();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Database', 'Initializing database connection...', {
        dbPath: this.dbPath,
      });

      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      await this.migrate();

      this.logger.info('Database', 'Database initialized successfully');
    } catch (error) {
      this.logger.error('Database', 'Failed to initialize database', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.logger.info('Database', 'Database connection closed');
      }
    } catch (error) {
      this.logger.error('Database', 'Error closing database', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async migrate(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.logger.info('Database', 'Running database migrations...');

      // Create users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          jid TEXT UNIQUE NOT NULL,
          phone_number TEXT NOT NULL,
          name TEXT NOT NULL,
          user_level TEXT NOT NULL DEFAULT 'user',
          is_registered BOOLEAN NOT NULL DEFAULT 0,
          registration_date DATETIME,
          last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          message_count INTEGER NOT NULL DEFAULT 0,
          banned BOOLEAN NOT NULL DEFAULT 0,
          preferences TEXT NOT NULL DEFAULT '{}',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create messages table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          whatsapp_message_id TEXT NOT NULL,
          content TEXT NOT NULL,
          message_type TEXT NOT NULL DEFAULT 'text',
          is_from_bot BOOLEAN NOT NULL DEFAULT 0,
          processed BOOLEAN NOT NULL DEFAULT 0,
          metadata TEXT NOT NULL DEFAULT '{}',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Create contexts table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS contexts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          context_type TEXT NOT NULL,
          context_data TEXT NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      this.logger.info(
        'Database',
        'Database migrations completed successfully'
      );
    } catch (error) {
      this.logger.error('Database', 'Migration failed', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // Helper method to map SQLiteUser to User
  private mapDatabaseUserToUser(dbUser: SQLiteUser): User {
    let preferences: Record<string, any> = {};
    try {
      preferences = JSON.parse(dbUser.preferences);
    } catch (error) {
      this.logger.warn('Database', 'Failed to parse user preferences', {
        userId: dbUser.id,
        error,
      });
      preferences = {};
    }

    return {
      id: dbUser.id,
      jid: dbUser.jid,
      phoneNumber: dbUser.phone_number,
      name: dbUser.name,
      userLevel: dbUser.user_level as UserLevel,
      isRegistered: Boolean(dbUser.is_registered),
      registrationDate: dbUser.registration_date
        ? new Date(dbUser.registration_date)
        : null,
      lastActivity: new Date(dbUser.last_activity),
      messageCount: dbUser.message_count,
      banned: Boolean(dbUser.banned),
      preferences,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
    };
  }

  // Helper method to map User to SQLiteUserInsert
  private mapUserToDatabaseInsert(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): SQLiteUserInsert {
    return {
      jid: user.jid,
      phone_number: user.phoneNumber,
      name: user.name,
      user_level: user.userLevel,
      is_registered: user.isRegistered ? 1 : 0,
      registration_date: user.registrationDate?.toISOString() || null,
      last_activity: user.lastActivity.toISOString(),
      message_count: user.messageCount,
      banned: user.banned ? 1 : 0,
      preferences: JSON.stringify(user.preferences),
    };
  }

  public async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const insertData = this.mapUserToDatabaseInsert(userData);

      const stmt = this.db.prepare(`
        INSERT INTO users (jid, phone_number, name, user_level, is_registered, registration_date, 
                         last_activity, message_count, banned, preferences)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        insertData.jid,
        insertData.phone_number,
        insertData.name,
        insertData.user_level,
        insertData.is_registered,
        insertData.registration_date,
        insertData.last_activity,
        insertData.message_count,
        insertData.banned,
        insertData.preferences
      );

      const createdUser = await this.getUserById(
        result.lastInsertRowid as number
      );
      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }

      return createdUser;
    } catch (error) {
      this.logger.error('Database', 'Failed to create user', {
        userData,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getUserByPhone(phone: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(
        'SELECT * FROM users WHERE phone_number = ?'
      );
      const dbUser = stmt.get(phone) as SQLiteUser | undefined;

      return dbUser ? this.mapDatabaseUserToUser(dbUser) : null;
    } catch (error) {
      this.logger.error('Database', 'Failed to get user by phone', {
        phone,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getUserByJid(jid: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE jid = ?');
      const dbUser = stmt.get(jid) as SQLiteUser | undefined;

      return dbUser ? this.mapDatabaseUserToUser(dbUser) : null;
    } catch (error) {
      this.logger.error('Database', 'Failed to get user by JID', {
        jid,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getUserById(id: number): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const dbUser = stmt.get(id) as SQLiteUser | undefined;

      return dbUser ? this.mapDatabaseUserToUser(dbUser) : null;
    } catch (error) {
      this.logger.error('Database', 'Failed to get user by ID', {
        id,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async updateUser(id: string, data: Partial<User>): Promise<User> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const userId = parseInt(id, 10);
      const updates: string[] = [];
      const values: any[] = [];

      if (data.jid !== undefined) {
        updates.push('jid = ?');
        values.push(data.jid);
      }
      if (data.phoneNumber !== undefined) {
        updates.push('phone_number = ?');
        values.push(data.phoneNumber);
      }
      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.userLevel !== undefined) {
        updates.push('user_level = ?');
        values.push(data.userLevel);
      }
      if (data.isRegistered !== undefined) {
        updates.push('is_registered = ?');
        values.push(data.isRegistered ? 1 : 0);
      }
      if (data.registrationDate !== undefined) {
        updates.push('registration_date = ?');
        values.push(data.registrationDate?.toISOString() || null);
      }
      if (data.lastActivity !== undefined) {
        updates.push('last_activity = ?');
        values.push(data.lastActivity.toISOString());
      }
      if (data.messageCount !== undefined) {
        updates.push('message_count = ?');
        values.push(data.messageCount);
      }
      if (data.banned !== undefined) {
        updates.push('banned = ?');
        values.push(data.banned ? 1 : 0);
      }
      if (data.preferences !== undefined) {
        updates.push('preferences = ?');
        values.push(JSON.stringify(data.preferences));
      }

      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(userId);

      const stmt = this.db.prepare(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);

      const updatedUser = await this.getUserById(userId);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      return updatedUser;
    } catch (error) {
      this.logger.error('Database', 'Failed to update user', {
        id,
        data,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async saveMessage(
    messageData: Omit<Message, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Message> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stmt = this.db.prepare(`
        INSERT INTO messages (id, user_id, whatsapp_message_id, content, message_type, 
                            is_from_bot, processed, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        messageId,
        messageData.user_id,
        messageData.whatsapp_message_id,
        messageData.content,
        messageData.message_type,
        messageData.is_from_bot ? 1 : 0,
        messageData.processed ? 1 : 0,
        JSON.stringify(messageData.metadata)
      );

      const now = new Date().toISOString();
      return {
        id: messageId,
        user_id: messageData.user_id,
        whatsapp_message_id: messageData.whatsapp_message_id,
        content: messageData.content,
        message_type: messageData.message_type,
        is_from_bot: messageData.is_from_bot,
        processed: messageData.processed,
        metadata: messageData.metadata,
        created_at: now,
        updated_at: now,
      };
    } catch (error) {
      this.logger.error('Database', 'Failed to save message', {
        messageData,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getContext(userId: string): Promise<ConversationContext | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM contexts 
        WHERE user_id = ? AND is_active = 1 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      const result = stmt.get(parseInt(userId, 10)) as
        | SQLiteContext
        | undefined;

      if (!result) {
        return null;
      }

      return {
        id: result.id.toString(),
        user_id: result.user_id.toString(),
        context_type: result.context_type as any,
        context_data: JSON.parse(result.context_data),
        is_active: Boolean(result.is_active),
        expires_at: '',
        step_index: 0,
        metadata: {},
        created_at: result.created_at,
        updated_at: result.updated_at,
      };
    } catch (error) {
      this.logger.error('Database', 'Failed to get context', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async saveContext(context: ConversationContext): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Deactivate existing contexts for this user
      const deactivateStmt = this.db.prepare(
        'UPDATE contexts SET is_active = 0 WHERE user_id = ?'
      );
      deactivateStmt.run(parseInt(context.user_id, 10));

      // Insert new context
      const insertStmt = this.db.prepare(`
        INSERT INTO contexts (user_id, context_type, context_data, is_active)
        VALUES (?, ?, ?, 1)
      `);

      insertStmt.run(
        parseInt(context.user_id, 10),
        context.context_type,
        JSON.stringify(context.context_data)
      );

      this.logger.info('Database', 'Context saved', { contextId: context.id });
    } catch (error) {
      this.logger.error('Database', 'Failed to save context', {
        context,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async deleteContext(userId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(
        'UPDATE contexts SET is_active = 0 WHERE user_id = ?'
      );
      stmt.run(parseInt(userId, 10));

      this.logger.info('Database', 'Context deleted', { userId });
    } catch (error) {
      this.logger.error('Database', 'Failed to delete context', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getUsersByLevel(userLevel: UserLevel): Promise<User[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE user_level = ?');
      const dbUsers = stmt.all(userLevel) as SQLiteUser[];

      return dbUsers.map(dbUser => this.mapDatabaseUserToUser(dbUser));
    } catch (error) {
      this.logger.error('Database', 'Failed to get users by level', {
        userLevel,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  public async getUserStats(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const totalUsersStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM users'
      );
      const registeredUsersStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE is_registered = 1'
      );
      const activeUsersStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM users WHERE last_activity > datetime('now', '-7 days')"
      );
      const bannedUsersStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE banned = 1'
      );

      const totalUsers = (totalUsersStmt.get() as any).count;
      const registeredUsers = (registeredUsersStmt.get() as any).count;
      const activeUsers = (activeUsersStmt.get() as any).count;
      const bannedUsers = (bannedUsersStmt.get() as any).count;

      return {
        totalUsers,
        registeredUsers,
        activeUsers,
        bannedUsers,
      };
    } catch (error) {
      this.logger.error('Database', 'Failed to get user stats', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
}
