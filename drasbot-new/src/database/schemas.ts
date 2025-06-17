/**
 * Database Schemas
 * SQLite schema definitions for DrasBot v2.0
 */

export const DB_SCHEMAS = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      whatsapp_jid TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      user_level TEXT NOT NULL DEFAULT 'user',
      level TEXT NOT NULL DEFAULT 'user',
      user_type TEXT NOT NULL DEFAULT 'normal',
      language TEXT NOT NULL DEFAULT 'es',
      is_registered BOOLEAN NOT NULL DEFAULT false,
      last_activity TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      preferences TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,

  contexts: `
    CREATE TABLE IF NOT EXISTS contexts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      context_type TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      last_interaction TEXT NOT NULL,
      expires_at TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,

  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      whatsapp_message_id TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      metadata TEXT DEFAULT '{}',
      is_from_bot BOOLEAN NOT NULL DEFAULT false,
      processed BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,

  command_logs: `
    CREATE TABLE IF NOT EXISTS command_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      arguments TEXT DEFAULT '{}',
      execution_result TEXT DEFAULT '{}',
      success BOOLEAN NOT NULL DEFAULT false,
      execution_time_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,

  configurations: `
    CREATE TABLE IF NOT EXISTS configurations (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,

  plugins: `
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      configuration TEXT DEFAULT '{}',
      installed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `
};

export const DB_INDEXES = {
  users: [
    'CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone)',
    'CREATE INDEX IF NOT EXISTS idx_users_whatsapp_jid ON users (whatsapp_jid)',
    'CREATE INDEX IF NOT EXISTS idx_users_user_level ON users (user_level)',
    'CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users (last_activity)',
  ],
  
  contexts: [
    'CREATE INDEX IF NOT EXISTS idx_contexts_user_id ON contexts (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_contexts_type ON contexts (context_type)',
    'CREATE INDEX IF NOT EXISTS idx_contexts_active ON contexts (active)',
    'CREATE INDEX IF NOT EXISTS idx_contexts_expires_at ON contexts (expires_at)',
  ],
  
  messages: [
    'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages (whatsapp_message_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)',
    'CREATE INDEX IF NOT EXISTS idx_messages_processed ON messages (processed)',
  ],
  
  command_logs: [
    'CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs (user_id)',
    'CREATE INDEX IF NOT EXISTS idx_command_logs_command ON command_logs (command_name)',
    'CREATE INDEX IF NOT EXISTS idx_command_logs_created_at ON command_logs (created_at)',
  ],
  
  configurations: [
    'CREATE INDEX IF NOT EXISTS idx_configurations_category ON configurations (category)',
  ]
};

export const DB_TRIGGERS = {
  users_updated_at: `
    CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `,
  
  configurations_updated_at: `
    CREATE TRIGGER IF NOT EXISTS trigger_configurations_updated_at
    AFTER UPDATE ON configurations
    FOR EACH ROW
    BEGIN
      UPDATE configurations SET updated_at = datetime('now') WHERE key = NEW.key;
    END
  `,
  
  plugins_updated_at: `
    CREATE TRIGGER IF NOT EXISTS trigger_plugins_updated_at
    AFTER UPDATE ON plugins
    FOR EACH ROW
    BEGIN
      UPDATE plugins SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `,
  
  messages_updated_at: `
    CREATE TRIGGER IF NOT EXISTS trigger_messages_updated_at
    AFTER UPDATE ON messages
    FOR EACH ROW
    BEGIN
      UPDATE messages SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `
};
