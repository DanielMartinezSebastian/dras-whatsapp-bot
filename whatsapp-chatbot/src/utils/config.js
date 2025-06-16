module.exports = {
    PORT: process.env.PORT || 3000,
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/whatsapp-chatbot',
    WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || 'your-whatsapp-api-key',
    LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs/chat.log',
    TMUX_SESSION_NAME: 'whatsapp-chatbot-session',
    PM2_APP_NAME: 'whatsapp-chatbot'
};