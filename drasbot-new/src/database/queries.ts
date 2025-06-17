/**
 * Database Queries
 * SQLite query operations for DrasBot v2.0
 */

export interface UserQueryParams {
  id?: string;
  phone?: string;
  whatsapp_jid?: string;
  user_level?: string;
  is_registered?: boolean;
  limit?: number;
  offset?: number;
}

export interface ContextQueryParams {
  id?: string;
  user_id?: string;
  context_type?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}

export interface MessageQueryParams {
  id?: string;
  user_id?: string;
  whatsapp_message_id?: string;
  is_from_bot?: boolean;
  processed?: boolean;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

export class DatabaseQueries {
  
  // ========== USER QUERIES ==========
  
  static getUserById(_userId: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT 
        id, phone, whatsapp_jid, display_name, user_level, level, user_type,
        language, is_registered, last_activity, metadata, preferences,
        created_at, updated_at
      FROM users 
      WHERE id = ?
    `;
  }

  static getUserByPhone(_phone: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT 
        id, phone, whatsapp_jid, display_name, user_level, level, user_type,
        language, is_registered, last_activity, metadata, preferences,
        created_at, updated_at
      FROM users 
      WHERE phone = ?
    `;
  }

  static getUserByWhatsAppJid(_jid: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT 
        id, phone, whatsapp_jid, display_name, user_level, level, user_type,
        language, is_registered, last_activity, metadata, preferences,
        created_at, updated_at
      FROM users 
      WHERE whatsapp_jid = ?
    `;
  }

  static getUsers(params: UserQueryParams = {}): string {
    let query = `
      SELECT 
        id, phone, whatsapp_jid, display_name, user_level, level, user_type,
        language, is_registered, last_activity, metadata, preferences,
        created_at, updated_at
      FROM users
    `;
    
    const conditions: string[] = [];
    
    if (params.user_level) conditions.push(`user_level = '${params.user_level}'`);
    if (params.is_registered !== undefined) conditions.push(`is_registered = ${params.is_registered ? 1 : 0}`);
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY last_activity DESC`;
    
    if (params.limit) {
      query += ` LIMIT ${params.limit}`;
      if (params.offset) query += ` OFFSET ${params.offset}`;
    }
    
    return query;
  }

  static createUser(): string {
    return `
      INSERT INTO users (
        id, phone, whatsapp_jid, display_name, user_level, level, user_type,
        language, is_registered, last_activity, metadata, preferences,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
  }

  static updateUser(): string {
    return `
      UPDATE users SET
        display_name = ?,
        user_level = ?,
        level = ?,
        user_type = ?,
        language = ?,
        is_registered = ?,
        last_activity = ?,
        metadata = ?,
        preferences = ?,
        updated_at = ?
      WHERE id = ?
    `;
  }

  static deleteUser(): string {
    return `DELETE FROM users WHERE id = ?`;
  }

  static updateUserLastActivity(): string {
    return `
      UPDATE users SET 
        last_activity = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `;
  }

  // ========== CONTEXT QUERIES ==========

  static getContextById(_contextId: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT id, user_id, context_type, data, created_at, last_interaction, expires_at, active
      FROM contexts
      WHERE id = ?
    `;
  }

  static getActiveContextsByUser(_userId: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT id, user_id, context_type, data, created_at, last_interaction, expires_at, active
      FROM contexts
      WHERE user_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY last_interaction DESC
    `;
  }

  static getContexts(params: ContextQueryParams = {}): string {
    let query = `
      SELECT id, user_id, context_type, data, created_at, last_interaction, expires_at, active
      FROM contexts
    `;
    
    const conditions: string[] = [];
    
    if (params.user_id) conditions.push(`user_id = '${params.user_id}'`);
    if (params.context_type) conditions.push(`context_type = '${params.context_type}'`);
    if (params.active !== undefined) conditions.push(`active = ${params.active ? 1 : 0}`);
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY last_interaction DESC`;
    
    if (params.limit) {
      query += ` LIMIT ${params.limit}`;
      if (params.offset) query += ` OFFSET ${params.offset}`;
    }
    
    return query;
  }

  static createContext(): string {
    return `
      INSERT INTO contexts (id, user_id, context_type, data, created_at, last_interaction, expires_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  }

  static updateContext(): string {
    return `
      UPDATE contexts SET
        data = ?,
        last_interaction = datetime('now')
      WHERE id = ?
    `;
  }

  static expireContext(): string {
    return `
      UPDATE contexts SET
        active = 0,
        expires_at = datetime('now')
      WHERE id = ?
    `;
  }

  static clearUserContexts(): string {
    return `
      UPDATE contexts SET
        active = 0,
        expires_at = datetime('now')
      WHERE user_id = ? AND active = 1
    `;
  }

  static cleanupExpiredContexts(): string {
    return `
      UPDATE contexts SET active = 0
      WHERE active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')
    `;
  }

  // ========== MESSAGE QUERIES ==========

  static getMessageById(_messageId: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT id, user_id, whatsapp_message_id, content, message_type, metadata, 
             is_from_bot, processed, created_at, updated_at
      FROM messages
      WHERE id = ?
    `;
  }

  static getMessageByWhatsAppId(_whatsappMessageId: string): string {
    // Parameter will be bound to ? placeholder
    return `
      SELECT id, user_id, whatsapp_message_id, content, message_type, metadata, 
             is_from_bot, processed, created_at, updated_at
      FROM messages
      WHERE whatsapp_message_id = ?
    `;
  }

  static getMessages(params: MessageQueryParams = {}): string {
    let query = `
      SELECT id, user_id, whatsapp_message_id, content, message_type, metadata, 
             is_from_bot, processed, created_at, updated_at
      FROM messages
    `;
    
    const conditions: string[] = [];
    
    if (params.user_id) conditions.push(`user_id = '${params.user_id}'`);
    if (params.is_from_bot !== undefined) conditions.push(`is_from_bot = ${params.is_from_bot ? 1 : 0}`);
    if (params.processed !== undefined) conditions.push(`processed = ${params.processed ? 1 : 0}`);
    if (params.start_date) conditions.push(`created_at >= '${params.start_date}'`);
    if (params.end_date) conditions.push(`created_at <= '${params.end_date}'`);
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    if (params.limit) {
      query += ` LIMIT ${params.limit}`;
      if (params.offset) query += ` OFFSET ${params.offset}`;
    }
    
    return query;
  }

  static createMessage(): string {
    return `
      INSERT INTO messages (
        id, user_id, whatsapp_message_id, content, message_type, metadata,
        is_from_bot, processed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
  }

  static updateMessage(): string {
    return `
      UPDATE messages SET
        processed = ?,
        metadata = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `;
  }

  static markMessageAsProcessed(): string {
    return `
      UPDATE messages SET
        processed = 1,
        updated_at = datetime('now')
      WHERE id = ?
    `;
  }

  // ========== COMMAND LOG QUERIES ==========

  static createCommandLog(): string {
    return `
      INSERT INTO command_logs (
        id, user_id, command_name, arguments, execution_result, success, execution_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
  }

  static getCommandLogs(userId?: string, commandName?: string, limit = 100): string {
    let query = `
      SELECT id, user_id, command_name, arguments, execution_result, success, execution_time_ms, created_at
      FROM command_logs
    `;
    
    const conditions: string[] = [];
    if (userId) conditions.push(`user_id = '${userId}'`);
    if (commandName) conditions.push(`command_name = '${commandName}'`);
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limit}`;
    
    return query;
  }

  // ========== CONFIGURATION QUERIES ==========

  static getConfiguration(_key: string): string {
    // Parameter will be bound to ? placeholder
    return `SELECT key, value, description, category FROM configurations WHERE key = ?`;
  }

  static getAllConfigurations(category?: string): string {
    let query = `SELECT key, value, description, category, created_at, updated_at FROM configurations`;
    
    if (category) {
      query += ` WHERE category = '${category}'`;
    }
    
    query += ` ORDER BY category, key`;
    
    return query;
  }

  static setConfiguration(): string {
    return `
      INSERT OR REPLACE INTO configurations (key, value, description, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
  }

  static deleteConfiguration(): string {
    return `DELETE FROM configurations WHERE key = ?`;
  }

  // ========== ANALYTICS QUERIES ==========

  static getUserStats(): string {
    return `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_registered = 1 THEN 1 END) as registered_users,
        COUNT(CASE WHEN user_level = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN user_level = 'moderator' THEN 1 END) as moderator_users,
        COUNT(CASE WHEN last_activity >= datetime('now', '-7 days') THEN 1 END) as active_last_week
      FROM users
    `;
  }

  static getMessageStats(): string {
    return `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN is_from_bot = 0 THEN 1 END) as user_messages,
        COUNT(CASE WHEN is_from_bot = 1 THEN 1 END) as bot_messages,
        COUNT(CASE WHEN processed = 1 THEN 1 END) as processed_messages,
        COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as messages_last_24h
      FROM messages
    `;
  }

  static getContextStats(): string {
    return `
      SELECT 
        COUNT(*) as total_contexts,
        COUNT(CASE WHEN active = 1 THEN 1 END) as active_contexts,
        context_type,
        COUNT(*) as count_by_type
      FROM contexts
      GROUP BY context_type
      ORDER BY count_by_type DESC
    `;
  }
}
