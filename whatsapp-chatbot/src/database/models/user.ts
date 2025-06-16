import * as sqlite3 from "sqlite3";
import { User, UserType, UserMetadata } from "../../types/core/user.types";
import { QueryResult } from "../../types/core/database.types";
import logger from "../../utils/logger";

export interface CreateUserData {
  whatsapp_jid: string;
  phone_number?: string;
  display_name?: string;
  profile_name?: string;
  business_name?: string;
  user_type?: UserType;
  language?: string;
  timezone?: string;
  metadata?: UserMetadata;
}

export interface UpdateUserData {
  phone_number?: string;
  display_name?: string;
  profile_name?: string;
  business_name?: string;
  user_type?: UserType;
  language?: string;
  timezone?: string;
  metadata?: UserMetadata;
  is_active?: boolean;
}

export interface ConversationStateRow {
  id: number;
  user_id: number;
  chat_jid: string;
  current_state: string;
  context_data: string;
  last_command?: string;
  session_start: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInteractionRow {
  id: number;
  user_id: number;
  interaction_type: string;
  content_summary?: string;
  response_pattern?: string;
  processing_time?: number;
  success: boolean;
  error_message?: string;
  timestamp: string;
}

export class UserModel {
  private dbPath: string;
  private db: sqlite3.Database | null;

  constructor(dbPath: string = "./src/database/users.db") {
    this.dbPath = dbPath;
    this.db = null;
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error(
            `❌ Error conectando a la base de datos de usuarios: ${err.message}`
          );
          reject(err);
        } else {
          logger.info("📊 Base de datos de usuarios conectada");
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Tabla principal de usuarios/contactos
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_jid TEXT UNIQUE NOT NULL,
        phone_number TEXT,
        display_name TEXT,
        profile_name TEXT,
        business_name TEXT,
        first_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_messages INTEGER DEFAULT 0,
        user_type TEXT DEFAULT 'customer',
        status TEXT DEFAULT 'pending_name',
        language TEXT DEFAULT 'es',
        timezone TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        last_message_at DATETIME
      )`,

      // Tabla de estados de conversación
      `CREATE TABLE IF NOT EXISTS conversation_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        chat_jid TEXT NOT NULL,
        current_state TEXT DEFAULT 'idle',
        context_data TEXT,
        last_command TEXT,
        session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Tabla de interacciones para analytics
      `CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        interaction_type TEXT NOT NULL,
        content_summary TEXT,
        response_pattern TEXT,
        processing_time INTEGER,
        success BOOLEAN DEFAULT 1,
        error_message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,

      // Tabla de integración externa
      `CREATE TABLE IF NOT EXISTS external_integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        external_system TEXT NOT NULL,
        external_id TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        last_sync DATETIME,
        integration_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, external_system)
      )`,
    ];

    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_jid ON users(whatsapp_jid)",
      "CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)",
      "CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type)",
      "CREATE INDEX IF NOT EXISTS idx_conversation_states_user ON conversation_states(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_conversation_states_chat ON conversation_states(chat_jid)",
      "CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON user_interactions(timestamp)",
      "CREATE INDEX IF NOT EXISTS idx_external_integrations_user ON external_integrations(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_external_integrations_system ON external_integrations(external_system)",
    ];

    try {
      // Crear tablas
      for (const tableSQL of tables) {
        await this.runQuery(tableSQL);
      }

      // Crear índices
      for (const indexSQL of indexes) {
        await this.runQuery(indexSQL);
      }

      logger.info("✅ Tablas de usuarios creadas exitosamente");
    } catch (error) {
      logger.error(`❌ Error creando tablas: ${(error as Error).message}`);
      throw error;
    }
  }

  private runQuery(
    sql: string,
    params: any[] = []
  ): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  private allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // ==================== TIPOS DE USUARIO ====================

  static getUserTypes(): Record<string, UserType> {
    return {
      CUSTOMER: "customer",
      PROVIDER: "provider",
      EMPLOYEE: "employee",
      ADMIN: "admin",
      FRIEND: "friend",
      FAMILIAR: "familiar",
      BLOCK: "block",
    };
  }

  static getValidUserTypes(): UserType[] {
    return Object.values(this.getUserTypes());
  }

  static isValidUserType(type: string): type is UserType {
    return this.getValidUserTypes().includes(type as UserType);
  }

  static getUserTypeDescription(type: UserType): string {
    const descriptions: Record<UserType, string> = {
      customer: "Cliente",
      provider: "Proveedor",
      employee: "Empleado",
      admin: "Administrador",
      friend: "Amigo",
      familiar: "Familiar",
      block: "Bloqueado",
    };
    return descriptions[type] || type;
  }

  // ==================== MÉTODOS DE USUARIO ====================

  async registerUser(userData: CreateUserData): Promise<User> {
    const {
      whatsapp_jid,
      phone_number,
      display_name,
      profile_name,
      business_name,
      user_type = "customer",
      language = "es",
      timezone,
      metadata = {},
    } = userData;

    // Validar tipo de usuario
    if (!UserModel.isValidUserType(user_type)) {
      throw new Error(
        `Tipo de usuario inválido: ${user_type}. Tipos válidos: ${UserModel.getValidUserTypes().join(
          ", "
        )}`
      );
    }

    try {
      const existingUser = await this.getUserByJid(whatsapp_jid);
      if (existingUser) {
        // Si el usuario ya existe, no sobrescribir tipos importantes
        const updateData: UpdateUserData = { ...userData };

        // Preservar tipos importantes (admin, employee)
        if (
          existingUser.user_type === "admin" ||
          existingUser.user_type === "employee"
        ) {
          delete updateData.user_type;
        } else if (existingUser.user_type !== "customer") {
          delete updateData.user_type;
        }

        return await this.updateUser(existingUser.id!, updateData);
      }

      const result = await this.runQuery(
        `INSERT INTO users (
          whatsapp_jid, phone_number, display_name, profile_name,
          business_name, user_type, language, timezone, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          whatsapp_jid,
          phone_number,
          display_name,
          profile_name,
          business_name,
          user_type,
          language,
          timezone,
          JSON.stringify(metadata),
        ]
      );

      const user = await this.getUserById(result.lastID);
      logger.info(
        `👤 Usuario registrado: ${whatsapp_jid} (ID: ${result.lastID})`
      );
      return user!;
    } catch (error) {
      // Si es un error de constraint único, devolver el usuario existente
      if ((error as Error).message.includes("UNIQUE constraint failed")) {
        logger.info(
          `👤 Usuario ya existe: ${whatsapp_jid}, recuperando datos existentes`
        );
        return (await this.getUserByJid(whatsapp_jid))!;
      }
      logger.error(`❌ Error registrando usuario: ${(error as Error).message}`);
      throw error;
    }
  }

  async getUserByJid(whatsapp_jid: string): Promise<User | null> {
    try {
      const user = await this.getQuery(
        "SELECT * FROM users WHERE whatsapp_jid = ?",
        [whatsapp_jid]
      );

      if (!user) return null;

      return this.parseUser(user);
    } catch (error) {
      logger.error(
        `❌ Error obteniendo usuario por JID: ${(error as Error).message}`
      );
      return null;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const user = await this.getQuery("SELECT * FROM users WHERE id = ?", [
        id,
      ]);

      if (!user) return null;

      return this.parseUser(user);
    } catch (error) {
      logger.error(
        `❌ Error obteniendo usuario por ID: ${(error as Error).message}`
      );
      return null;
    }
  }

  async updateUser(id: number, updateData: UpdateUserData): Promise<User> {
    const {
      phone_number,
      display_name,
      profile_name,
      business_name,
      user_type,
      language,
      timezone,
      metadata,
      is_active,
    } = updateData;

    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (phone_number !== undefined) {
        setParts.push("phone_number = ?");
        values.push(phone_number);
      }
      if (display_name !== undefined) {
        setParts.push("display_name = ?");
        values.push(display_name);
      }
      if (profile_name !== undefined) {
        setParts.push("profile_name = ?");
        values.push(profile_name);
      }
      if (business_name !== undefined) {
        setParts.push("business_name = ?");
        values.push(business_name);
      }
      if (user_type !== undefined) {
        if (!UserModel.isValidUserType(user_type)) {
          throw new Error(`Tipo de usuario inválido: ${user_type}`);
        }
        setParts.push("user_type = ?");
        values.push(user_type);
      }
      if (language !== undefined) {
        setParts.push("language = ?");
        values.push(language);
      }
      if (timezone !== undefined) {
        setParts.push("timezone = ?");
        values.push(timezone);
      }
      if (metadata !== undefined) {
        setParts.push("metadata = ?");
        values.push(JSON.stringify(metadata));
      }
      if (is_active !== undefined) {
        setParts.push("status = ?");
        values.push(is_active ? "active" : "inactive");
      }

      setParts.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const sql = `UPDATE users SET ${setParts.join(", ")} WHERE id = ?`;
      await this.runQuery(sql, values);

      const updatedUser = await this.getUserById(id);
      logger.info(`👤 Usuario actualizado: ID ${id}`);
      return updatedUser!;
    } catch (error) {
      logger.error(
        `❌ Error actualizando usuario: ${(error as Error).message}`
      );
      throw error;
    }
  }

  async getAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
    try {
      const query = `
        SELECT 
          id, whatsapp_jid, phone_number, display_name, profile_name, 
          business_name, user_type, language, timezone, metadata,
          status, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await this.allQuery(query, [limit, offset]);

      return rows.map((row) => this.parseUser(row));
    } catch (error) {
      logger.error(`Error obteniendo usuarios: ${(error as Error).message}`);
      throw error;
    }
  }

  async searchUsers(searchTerm: string, limit: number = 50): Promise<User[]> {
    try {
      const query = `
        SELECT 
          id, whatsapp_jid, phone_number, display_name, profile_name, 
          business_name, user_type, language, timezone, metadata,
          status, created_at, updated_at
        FROM users 
        WHERE 
          display_name LIKE ? OR 
          phone_number LIKE ? OR 
          profile_name LIKE ? OR 
          business_name LIKE ?
        ORDER BY 
          CASE 
            WHEN display_name LIKE ? THEN 1
            WHEN phone_number LIKE ? THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT ?
      `;

      const searchPattern = `%${searchTerm}%`;
      const exactPattern = `${searchTerm}%`;

      const rows = await this.allQuery(query, [
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        exactPattern,
        exactPattern,
        limit,
      ]);

      return rows.map((row) => this.parseUser(row));
    } catch (error) {
      logger.error(`Error buscando usuarios: ${(error as Error).message}`);
      throw error;
    }
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const user = await this.getQuery(
        "SELECT * FROM users WHERE phone_number = ?",
        [phone]
      );

      if (!user) return null;

      return this.parseUser(user);
    } catch (error) {
      logger.error(
        `❌ Error obteniendo usuario por teléfono: ${(error as Error).message}`
      );
      return null;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error(`Usuario con ID ${id} no encontrado`);
      }

      // Eliminar registros relacionados primero
      await this.runQuery("DELETE FROM user_interactions WHERE user_id = ?", [
        id,
      ]);
      await this.runQuery("DELETE FROM conversation_states WHERE user_id = ?", [
        id,
      ]);
      await this.runQuery(
        "DELETE FROM external_integrations WHERE user_id = ?",
        [id]
      );

      // Eliminar el usuario
      const result = await this.runQuery("DELETE FROM users WHERE id = ?", [
        id,
      ]);

      if (result.changes > 0) {
        logger.info(`👤 Usuario eliminado: ID ${id} (${user.display_name})`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`❌ Error eliminando usuario: ${(error as Error).message}`);
      throw error;
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByType: Record<UserType, number>;
    recentActivity: {
      last24h: number;
      lastWeek: number;
      lastMonth: number;
    };
    totalMessages: number;
    averageMessagesPerUser: number;
  }> {
    try {
      // Total de usuarios
      const totalUsersResult = await this.getQuery(
        "SELECT COUNT(*) as total FROM users"
      );
      const totalUsers = totalUsersResult?.total || 0;

      // Usuarios activos e inactivos
      const activeUsersResult = await this.getQuery(
        "SELECT COUNT(*) as active FROM users WHERE status = 'active'"
      );
      const activeUsers = activeUsersResult?.active || 0;
      const inactiveUsers = totalUsers - activeUsers;

      // Distribución por tipo de usuario
      const userTypeDistribution = await this.allQuery(`
        SELECT user_type, COUNT(*) as count 
        FROM users 
        GROUP BY user_type
      `);

      const usersByType: Record<UserType, number> = {
        admin: 0,
        customer: 0,
        friend: 0,
        familiar: 0,
        employee: 0,
        provider: 0,
        block: 0,
      };

      userTypeDistribution.forEach((row: any) => {
        if (row.user_type in usersByType) {
          usersByType[row.user_type as UserType] = row.count;
        }
      });

      // Actividad reciente (usuarios que han enviado mensajes)
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activity24h = await this.getQuery(
        `
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_interactions 
        WHERE timestamp >= ?
      `,
        [last24h.toISOString()]
      );

      const activityWeek = await this.getQuery(
        `
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_interactions 
        WHERE timestamp >= ?
      `,
        [lastWeek.toISOString()]
      );

      const activityMonth = await this.getQuery(
        `
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_interactions 
        WHERE timestamp >= ?
      `,
        [lastMonth.toISOString()]
      );

      // Total de mensajes y promedio
      const totalMessagesResult = await this.getQuery(
        "SELECT SUM(total_messages) as total FROM users"
      );
      const totalMessages = totalMessagesResult?.total || 0;
      const averageMessagesPerUser =
        totalUsers > 0 ? Math.round((totalMessages / totalUsers) * 10) / 10 : 0;

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByType,
        recentActivity: {
          last24h: activity24h?.count || 0,
          lastWeek: activityWeek?.count || 0,
          lastMonth: activityMonth?.count || 0,
        },
        totalMessages,
        averageMessagesPerUser,
      };
    } catch (error) {
      logger.error(
        `❌ Error obteniendo estadísticas: ${(error as Error).message}`
      );
      throw error;
    }
  }

  private parseUser(row: any): User {
    return {
      id: row.id,
      whatsapp_jid: row.whatsapp_jid,
      phone_number: row.phone_number || "",
      display_name: row.display_name || "",
      user_type: row.user_type as UserType,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_message_at: row.last_message_at
        ? new Date(row.last_message_at)
        : undefined,
      total_messages: row.total_messages || 0,
      is_active: row.status === "active", // Mapear status a is_active
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  // Método para cerrar la conexión
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error(`Error cerrando la base de datos: ${err.message}`);
          } else {
            logger.info("Base de datos cerrada correctamente");
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default UserModel;
