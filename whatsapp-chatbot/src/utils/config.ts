import { BotConfiguration } from "../types/core/bot.types";

export interface AppConfig {
  port: number;
  dbUri: string;
  whatsappApiKey: string;
  logFilePath: string;
  tmuxSessionName: string;
  pm2AppName: string;
  bot: BotConfiguration;
}

const defaultConfig: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  dbUri: process.env.DB_URI || "mongodb://localhost:27017/whatsapp-chatbot",
  whatsappApiKey: process.env.WHATSAPP_API_KEY || "your-whatsapp-api-key",
  logFilePath: process.env.LOG_FILE_PATH || "./logs/chat.log",
  tmuxSessionName: "whatsapp-chatbot-session",
  pm2AppName: "whatsapp-chatbot",
  bot: {
    botName: process.env.BOT_NAME || "WhatsApp ChatBot",
    botPrefix: process.env.BOT_PREFIX || "🤖",
    autoReply: process.env.AUTO_REPLY === "true",
    commandPrefix: process.env.COMMAND_PREFIX || "/",
    useNewCommandSystem: process.env.USE_NEW_COMMAND_SYSTEM === "true",
    maxDailyResponses: parseInt(process.env.MAX_DAILY_RESPONSES || "100", 10),
    minResponseInterval: parseInt(
      process.env.MIN_RESPONSE_INTERVAL || "1000",
      10
    ),
  },
};

export const config: AppConfig = defaultConfig;

// Exportar valores individuales para compatibilidad con el código legacy
export const PORT = config.port;
export const DB_URI = config.dbUri;
export const WHATSAPP_API_KEY = config.whatsappApiKey;
export const LOG_FILE_PATH = config.logFilePath;
export const TMUX_SESSION_NAME = config.tmuxSessionName;
export const PM2_APP_NAME = config.pm2AppName;

export default config;
