export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  affectedRows?: number;
}

export interface DatabaseConnection {
  isConnected: boolean;
  lastActivity: Date;
  connectionId: string;
}
