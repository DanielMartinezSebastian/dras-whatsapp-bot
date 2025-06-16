/**
 * WhatsApp Chatbot - Configuración PM2
 *
 * Configuración de producción para PM2 Process Manager
 *
 * @author Daniel Martinez Sebastian
 * @version 1.0.0
 * @description Configuración optimizada para producción del chatbot WhatsApp
 */

module.exports = {
  apps: [
    {
      name: "whatsapp-chatbot",
      script: "./src/app.js",
      instances: 1, // Solo una instancia para desarrollo local
      exec_mode: "fork", // Fork mode para aplicaciones locales
      watch: false, // Deshabilitado para evitar reinicios innecesarios
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1", // Solo localhost
        // Variables del nuevo sistema de comandos
        USE_NEW_COMMANDS: "true",
        ENABLE_NEW_COMMANDS: "true",
        COMMAND_PREFIX: "!",
        // Variables del WhatsApp Bridge
        WHATSAPP_BRIDGE_URL: "http://localhost:8080",
        // BRIDGE_API_KEY: "your-api-key-here",
        // Variables del bot
        BOT_NAME: "DrasBot",
        BOT_PREFIX: "Bot ",
        AUTO_REPLY: "true",
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
        HOST: "127.0.0.1",
      },
      env_test: {
        NODE_ENV: "test",
        PORT: 3001,
        HOST: "127.0.0.1",
      },
      // Configuración de logs
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Configuración de monitoreo
      max_memory_restart: "300M",
      min_uptime: "30s", // Tiempo mínimo antes de considerar restart
      max_restarts: 5, // Máximo 5 reinicios por hora
      autorestart: true,
      restart_delay: 5000, // 5 segundos entre reinicios
    },
  ],
};
