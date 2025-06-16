const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../../logs/chatbot.log");

// Crear directorio de logs si no existe
const logsDir = path.dirname(logFilePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function logInfo(message) {
  const logMessage = `[INFO] ${new Date().toISOString()}: ${message}`;
  console.log(`ℹ️  ${message}`);
  try {
    fs.appendFileSync(logFilePath, logMessage + "\n");
  } catch (error) {
    console.error("Error escribiendo al log:", error.message);
  }
}

function logError(message) {
  const logMessage = `[ERROR] ${new Date().toISOString()}: ${message}`;
  console.error(`❌ ${message}`);
  try {
    fs.appendFileSync(logFilePath, logMessage + "\n");
  } catch (error) {
    console.error("Error escribiendo al log:", error.message);
  }
}

function logWarning(message) {
  const logMessage = `[WARNING] ${new Date().toISOString()}: ${message}`;
  console.warn(`⚠️  ${message}`);
  try {
    fs.appendFileSync(logFilePath, logMessage + "\n");
  } catch (error) {
    console.error("Error escribiendo al log:", error.message);
  }
}

// Alias para logWarning
const logWarn = logWarning;

module.exports = {
  logInfo,
  logError,
  logWarning,
  logWarn,
};
