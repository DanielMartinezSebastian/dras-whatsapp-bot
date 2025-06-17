/**
 * Database Service
 * SQLite-based database service with migration support
 */

import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { User } from '../types';

export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  busyTimeout?: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database | null = null;
  private logger: Logger;
  private config: DatabaseConfig;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = {
      path: path.join(process.cwd(), 'data', 'drasbot.db'),
      enableWAL: true,
      busyTimeout: 30000,
    };
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(config?: Partial<DatabaseConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      await this.connect();
      await this.runMigrations();
      this.logger.info(
        'DatabaseService',
        'Database service initialized successfully'
      );
    } catch (error) {
      this.logger.error(
        'DatabaseService',
        'Failed to initialize database service',
        error
      );
      throw error;
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.config.path);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.config.path, err => {
        if (err) {
          this.logger.error(
            'DatabaseService',
            'Failed to connect to database',
            err
          );
          reject(err);
        } else {
          this.logger.info(
            'DatabaseService',
            `Connected to database: ${this.config.path}`
          );

          // Configure database
          if (this.db) {
            if (this.config.enableWAL) {
              this.db.run('PRAGMA journal_mode = WAL');
            }
            this.db.run(`PRAGMA busy_timeout = ${this.config.busyTimeout}`);
            this.db.run('PRAGMA foreign_keys = ON');
          }

          resolve();
        }
      });
    });
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const migrations = [
      this.createUsersTable(),
      this.createMessagesTable(),
      this.createContextsTable(),
      this.createSessionsTable(),
      this.createPluginDataTable(),
    ];

    for (const migration of migrations) {
      await migration;
    }

    this.logger.info('DatabaseService', 'Database migrations completed');
  }

  private async createUsersTable(): Promise<void> {
    return this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        whatsapp_jid TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        user_level TEXT DEFAULT 'user',
        user_type TEXT DEFAULT 'normal',
        language TEXT DEFAULT 'es',
        is_registered BOOLEAN DEFAULT 0,
        last_activity TEXT NOT NULL,
        preferences TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )
    `);
  }

  private async createMessagesTable(): Promise<void> {
    return this.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        whatsapp_message_id TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        message_type TEXT NOT NULL,
        is_from_bot BOOLEAN DEFAULT 0,
        processed BOOLEAN DEFAULT 0,
        response_to TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  private async createContextsTable(): Promise<void> {
    return this.run(`
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        context_type TEXT NOT NULL,
        context_data TEXT DEFAULT '{}',
        is_active BOOLEAN DEFAULT 1,
        expires_at TEXT,
        step_index INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  private async createSessionsTable(): Promise<void> {
    return this.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_data TEXT DEFAULT '{}',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  private async createPluginDataTable(): Promise<void> {
    return this.run(`
      CREATE TABLE IF NOT EXISTS plugin_data (
        id TEXT PRIMARY KEY,
        plugin_name TEXT NOT NULL,
        user_id TEXT,
        data_key TEXT NOT NULL,
        data_value TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(plugin_name, user_id, data_key)
      )
    `);
  }

  public async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async get<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  public async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  // User operations
  public async createUser(
    user: Omit<User, 'created_at' | 'updated_at'>
  ): Promise<User> {
    const now = new Date().toISOString();
    const userData = {
      ...user,
      created_at: now,
      updated_at: now,
      preferences: JSON.stringify(user.preferences || {}),
      metadata: JSON.stringify(user.metadata || {}),
    };

    await this.run(
      `
      INSERT INTO users (
        id, phone, whatsapp_jid, display_name, user_level, user_type,
        language, is_registered, last_activity, preferences, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userData.id,
        userData.phone,
        userData.whatsapp_jid,
        userData.display_name,
        userData.user_level,
        userData.user_type,
        userData.language,
        userData.is_registered,
        userData.last_activity,
        userData.preferences,
        userData.metadata,
        userData.created_at,
        userData.updated_at,
      ]
    );

    return this.getUserById(user.id) as Promise<User>;
  }

  public async getUserById(id: string): Promise<User | undefined> {
    const row = await this.get<any>(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return row ? this.parseUser(row) : undefined;
  }

  public async getUserByPhone(phone: string): Promise<User | undefined> {
    const row = await this.get<any>(
      'SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL',
      [phone]
    );
    return row ? this.parseUser(row) : undefined;
  }

  private parseUser(row: any): User {
    return {
      ...row,
      is_registered: Boolean(row.is_registered),
      preferences: JSON.parse(row.preferences || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  public async close(): Promise<void> {
    return new Promise(resolve => {
      if (this.db) {
        this.db.close(err => {
          if (err) {
            this.logger.error('DatabaseService', 'Error closing database', err);
          } else {
            this.logger.info('DatabaseService', 'Database connection closed');
          }
          resolve();
        });
        this.db = null;
      } else {
        resolve();
      }
    });
  }

  public async backup(backupPath: string): Promise<void> {
    if (!this.db || !this.config.path) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      const fs = require('fs');
      try {
        // Simple file copy for SQLite backup
        fs.copyFileSync(this.config.path, backupPath);
        this.logger.info(
          'DatabaseService',
          `Database backup created: ${backupPath}`
        );
        resolve();
      } catch (err: any) {
        this.logger.error('DatabaseService', 'Database backup failed', err);
        reject(err);
      }
    });
  }
}

export default DatabaseService;
