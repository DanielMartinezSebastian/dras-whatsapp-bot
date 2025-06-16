const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

class DatabaseConnection {
  constructor() {
    this.db = null;
    this.bridgeDbPath = path.resolve(
      __dirname,
      "../../../whatsapp-bridge/store/messages.db"
    );
    this.isConnected = false;
  }

  async connect() {
    try {
      // Verificar que la base de datos del bridge existe
      if (!fs.existsSync(this.bridgeDbPath)) {
        console.warn(
          `⚠️  Base de datos del bridge no encontrada en: ${this.bridgeDbPath}`
        );
        console.log(
          "💡 Asegúrate de que el bridge esté ejecutándose y haya creado la base de datos"
        );
        return false;
      }

      // Conectar a la base de datos del bridge de forma síncrona para evitar conflictos
      return new Promise((resolve) => {
        this.db = new sqlite3.Database(
          this.bridgeDbPath,
          sqlite3.OPEN_READONLY,
          (err) => {
            if (err) {
              console.error(
                "❌ Error conectando a la base de datos:",
                err.message
              );
              this.isConnected = false;
              resolve(false);
            } else {
              console.log("✅ Conectado a la base de datos del bridge");
              this.isConnected = true;
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error en conexión de base de datos:", error);
      return false;
    }
  }

  async getLatestMessages(limit = 10) {
    return new Promise((resolve) => {
      if (!this.isConnected || !this.db) {
        resolve([]);
        return;
      }

      const query = `
                SELECT m.*, c.name as chat_name
                FROM messages m
                LEFT JOIN chats c ON m.chat_jid = c.jid
                WHERE m.is_from_me = 0
                AND (m.content != '' OR m.media_type != '')
                ORDER BY m.timestamp DESC
                LIMIT ?
            `;

      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error("❌ Error consultando mensajes:", err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getMessagesSince(timestamp) {
    return new Promise((resolve) => {
      if (!this.isConnected || !this.db) {
        resolve([]);
        return;
      }

      const query = `
                SELECT m.*, c.name as chat_name
                FROM messages m
                LEFT JOIN chats c ON m.chat_jid = c.jid
                WHERE m.timestamp > ?
                AND m.is_from_me = 0
                AND (m.content != '' OR m.media_type != '')
                ORDER BY m.timestamp ASC
                LIMIT 100
            `;

      this.db.all(query, [timestamp], (err, rows) => {
        if (err) {
          console.error("❌ Error consultando mensajes nuevos:", err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error("❌ Error cerrando base de datos:", err);
          } else {
            console.log("🔌 Base de datos desconectada");
          }
          this.isConnected = false;
          resolve();
        });
      } else {
        this.isConnected = false;
        resolve();
      }
    });
  }

  isReady() {
    return this.isConnected && this.db !== null;
  }
}

// Crear instancia singleton
const dbConnection = new DatabaseConnection();

// Función de inicialización
const connectToDatabase = async () => {
  try {
    const connected = await dbConnection.connect();
    if (connected) {
      console.log("🗄️  Conexión a la base de datos establecida con éxito");
    } else {
      console.log("⚠️  No se pudo conectar a la base de datos del bridge");
      console.log("💡 El chatbot funcionará sin acceso a mensajes históricos");
    }
    return connected;
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error.message);
    return false;
  }
};

module.exports = {
  connectToDatabase,
  dbConnection,
};
