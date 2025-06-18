/**
 * Migration Manager
 * Manages database schema versions and migrations
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Logger } from '../utils/logger';

export interface Migration {
  id: string;
  name: string;
  version: number;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
  timestamp: Date;
}

export class MigrationManager {
  private static instance: MigrationManager;
  private logger: Logger;
  private db: Database.Database | null = null;
  private migrationsPath: string;

  private constructor() {
    this.logger = Logger.getInstance();
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  public async initialize(dbPath: string): Promise<void> {
    try {
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Create migrations table
      this.createMigrationsTable();

      this.logger.info('MigrationManager', 'Migration manager initialized', {
        dbPath,
      });
    } catch (error) {
      this.logger.error(
        'MigrationManager',
        'Failed to initialize migration manager',
        { error: error instanceof Error ? error.message : error }
      );
      throw error;
    }
  }

  private createMigrationsTable(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        version INTEGER NOT NULL,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NOT NULL
      )
    `);
  }

  public async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.logger.info('MigrationManager', 'Starting migration process...');

      const pendingMigrations = this.getPendingMigrations();

      if (pendingMigrations.length === 0) {
        this.logger.info('MigrationManager', 'No pending migrations');
        return;
      }

      this.logger.info(
        'MigrationManager',
        `Found ${pendingMigrations.length} pending migrations`
      );

      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }

      this.logger.info(
        'MigrationManager',
        'All migrations completed successfully'
      );
    } catch (error) {
      this.logger.error('MigrationManager', 'Migration failed', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private getPendingMigrations(): Migration[] {
    const executedMigrations = this.getExecutedMigrations();
    const allMigrations = this.loadAllMigrations();

    return allMigrations
      .filter(migration => !executedMigrations.includes(migration.id))
      .sort((a, b) => a.version - b.version);
  }

  private getExecutedMigrations(): string[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(
      'SELECT migration_id FROM _migrations ORDER BY version ASC'
    );
    const results = stmt.all() as { migration_id: string }[];

    return results.map(row => row.migration_id);
  }

  private loadAllMigrations(): Migration[] {
    const migrations: Migration[] = [];

    // Load built-in migrations
    migrations.push(...this.getBuiltInMigrations());

    // Load file-based migrations (if any)
    if (fs.existsSync(this.migrationsPath)) {
      const migrationFiles = fs
        .readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort();

      for (const file of migrationFiles) {
        try {
          const migrationModule = require(path.join(this.migrationsPath, file));
          if (
            migrationModule.default &&
            typeof migrationModule.default === 'object'
          ) {
            migrations.push(migrationModule.default);
          }
        } catch (error) {
          this.logger.warn(
            'MigrationManager',
            `Failed to load migration file ${file}`,
            { error }
          );
        }
      }
    }

    return migrations;
  }

  private getBuiltInMigrations(): Migration[] {
    return [
      {
        id: '001_initial_schema',
        name: 'Initial Schema',
        version: 1,
        timestamp: new Date('2025-06-18T00:00:00Z'),
        up: (db: Database.Database) => {
          // Users table
          db.exec(`
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

          // Messages table
          db.exec(`
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

          // Contexts table
          db.exec(`
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

          // Create indexes
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_jid ON users(jid);
            CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
            CREATE INDEX IF NOT EXISTS idx_users_level ON users(user_level);
            CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
            CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);
            CREATE INDEX IF NOT EXISTS idx_contexts_user_id ON contexts(user_id);
            CREATE INDEX IF NOT EXISTS idx_contexts_active ON contexts(is_active);
          `);
        },
        down: (db: Database.Database) => {
          db.exec('DROP TABLE IF EXISTS contexts');
          db.exec('DROP TABLE IF EXISTS messages');
          db.exec('DROP TABLE IF EXISTS users');
        },
      },
    ];
  }

  private async runMigration(migration: Migration): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.logger.info(
        'MigrationManager',
        `Running migration: ${migration.name} (${migration.id})`
      );

      // Start transaction
      const transaction = this.db.transaction(() => {
        // Run the migration
        migration.up(this.db!);

        // Record the migration
        const stmt = this.db!.prepare(`
          INSERT INTO _migrations (migration_id, name, version, checksum)
          VALUES (?, ?, ?, ?)
        `);

        const checksum = this.calculateChecksum(migration);
        stmt.run(migration.id, migration.name, migration.version, checksum);
      });

      transaction();

      this.logger.info(
        'MigrationManager',
        `Migration completed: ${migration.name}`
      );
    } catch (error) {
      this.logger.error(
        'MigrationManager',
        `Migration failed: ${migration.name}`,
        { error: error instanceof Error ? error.message : error }
      );
      throw error;
    }
  }

  private calculateChecksum(migration: Migration): string {
    // Simple checksum based on migration content
    const content = `${migration.id}${migration.name}${migration.version}`;
    return Buffer.from(content).toString('base64');
  }

  public async rollback(steps: number = 1): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.logger.info(
        'MigrationManager',
        `Rolling back ${steps} migration(s)...`
      );

      const executedMigrations = this.getExecutedMigrationsWithDetails();
      const migrationsToRollback = executedMigrations
        .sort((a, b) => b.version - a.version)
        .slice(0, steps);

      for (const migrationRecord of migrationsToRollback) {
        const migration = this.findMigrationById(migrationRecord.migration_id);
        if (migration) {
          await this.rollbackMigration(migration);
        } else {
          this.logger.warn(
            'MigrationManager',
            `Migration not found for rollback: ${migrationRecord.migration_id}`
          );
        }
      }

      this.logger.info('MigrationManager', 'Rollback completed successfully');
    } catch (error) {
      this.logger.error('MigrationManager', 'Rollback failed', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private getExecutedMigrationsWithDetails(): Array<{
    migration_id: string;
    version: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(
      'SELECT migration_id, version FROM _migrations ORDER BY version DESC'
    );
    return stmt.all() as Array<{ migration_id: string; version: number }>;
  }

  private findMigrationById(id: string): Migration | null {
    const allMigrations = this.loadAllMigrations();
    return allMigrations.find(m => m.id === id) || null;
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.logger.info(
        'MigrationManager',
        `Rolling back migration: ${migration.name} (${migration.id})`
      );

      // Start transaction
      const transaction = this.db.transaction(() => {
        // Run the rollback
        migration.down(this.db!);

        // Remove the migration record
        const stmt = this.db!.prepare(
          'DELETE FROM _migrations WHERE migration_id = ?'
        );
        stmt.run(migration.id);
      });

      transaction();

      this.logger.info(
        'MigrationManager',
        `Migration rolled back: ${migration.name}`
      );
    } catch (error) {
      this.logger.error(
        'MigrationManager',
        `Rollback failed: ${migration.name}`,
        { error: error instanceof Error ? error.message : error }
      );
      throw error;
    }
  }

  public getStatus(): {
    executed: number;
    pending: number;
    migrations: Array<{
      id: string;
      name: string;
      status: 'executed' | 'pending';
    }>;
  } {
    const executedMigrations = this.getExecutedMigrations();
    const allMigrations = this.loadAllMigrations();

    const migrations = allMigrations.map(migration => ({
      id: migration.id,
      name: migration.name,
      status: executedMigrations.includes(migration.id)
        ? ('executed' as const)
        : ('pending' as const),
    }));

    return {
      executed: executedMigrations.length,
      pending: allMigrations.length - executedMigrations.length,
      migrations,
    };
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.logger.info('MigrationManager', 'Migration manager closed');
    }
  }
}
