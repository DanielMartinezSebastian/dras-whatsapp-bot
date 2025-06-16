/**
 * WhatsApp Chatbot - Sistema Modular Inteligente
 *
 * Punto de entrada principal del sistema de chatbot WhatsApp
 * Arquitectura modular con TypeScript y Node.js
 *
 * @author Daniel Martinez Sebastian
 * @version 1.0.0
 * @description Sistema completo de automatización WhatsApp con procesamiento inteligente
 */

const express = require("express");
const bodyParser = require("body-parser");
const apiRoutes = require("./routes/api");
const { connectToDatabase } = require("./database/connection");
const WhatsAppClient = require("./whatsapp/client");
const { BotProcessor } = require("../dist/bot/core/botProcessor");
const { logInfo, logError, logWarn } = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1"; // Solo localhost por seguridad en VPS

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Variables globales para los servicios
let whatsappClient;
let botProcessor;

// Inicializar servicios
async function initializeServices() {
  try {
    // Conectar a la base de datos
    logInfo("🗄️  Inicializando base de datos...");
    await connectToDatabase();

    // Crear cliente de WhatsApp
    logInfo("📱 Inicializando cliente WhatsApp...");
    whatsappClient = new WhatsAppClient();

    // Crear procesador de bot modular
    logInfo("🤖 Inicializando BotProcessor modular...");
    botProcessor = new BotProcessor(whatsappClient);

    // Esperar a que la inicialización esté completa
    logInfo("⏳ Esperando inicialización completa del BotProcessor...");
    await botProcessor.waitForInitialization();
    logInfo("✅ BotProcessor completamente inicializado");

    // ✅ Configurar UserService en WhatsAppClient para privilegios admin
    logInfo("🔑 Configurando privilegios admin en WhatsAppClient...");
    whatsappClient.setUserService(botProcessor.userService);
    logInfo("✅ Privilegios admin configurados");

    // Configurar referencia del BotProcessor en las rutas API
    const apiRoutes = require("./routes/api");
    if (apiRoutes.setBotProcessor) {
      apiRoutes.setBotProcessor(botProcessor);
      logInfo("🔗 BotProcessor configurado en rutas API");
    }

    // Configurar listener de mensajes
    whatsappClient.on("message", async (message) => {
      try {
        // Obtener o procesar usuario del mensaje antes de procesarlo
        const user = await botProcessor.userService?.processUserFromMessage(
          message
        );
        if (user) {
          const result = await botProcessor.processMessage(message, user);

          // Si el resultado indica que se debe responder, enviar la respuesta
          if (result.shouldReply && result.response) {
            logInfo(
              `📤 Enviando respuesta a ${
                user.phone_number
              }: ${result.response.substring(0, 50)}...`
            );
            await whatsappClient.sendMessage(message.sender, result.response);
            logInfo(`✅ Respuesta enviada exitosamente`);
          }
        } else {
          logWarn(
            `⚠️ No se pudo obtener usuario para mensaje de ${message.senderPhone}`
          );
        }
      } catch (error) {
        logError(`❌ Error procesando mensaje: ${error.message}`);
      }
    });

    // Conectar al bridge
    const connected = await whatsappClient.connect();
    if (connected) {
      logInfo("✅ Cliente WhatsApp conectado exitosamente");
    } else {
      logError("❌ No se pudo conectar al cliente WhatsApp");
      logError(
        "💡 Verifica que el bridge esté ejecutándose en http://127.0.0.1:8080"
      );
    }
  } catch (error) {
    logError(`❌ Error inicializando servicios: ${error.message}`);
  }
}

// Rutas de API
app.use("/api", apiRoutes);

// Ruta de estado
app.get("/status", (req, res) => {
  const status = {
    status: "running",
    timestamp: new Date().toISOString(),
    bridge: whatsappClient ? whatsappClient.getStatus() : { connected: false },
    database: require("./database/connection").dbConnection.isReady(),
    botProcessor: botProcessor ? botProcessor.getStats() : { ready: false },
  };
  res.json(status);
});

// Ruta de salud
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    whatsapp_connected: whatsappClient
      ? whatsappClient.getStatus().connected
      : false,
    bot_ready: botProcessor ? botProcessor.isReady() : false,
    database_connected: require("./database/connection").dbConnection.isReady(),
    timestamp: new Date().toISOString(),
  });
});

// Manejo de cierre graceful
process.on("SIGINT", () => {
  logInfo("🛑 Recibida señal SIGINT, cerrando aplicación...");
  cleanup();
});

process.on("SIGTERM", () => {
  logInfo("🛑 Recibida señal SIGTERM, cerrando aplicación...");
  cleanup();
});

function cleanup() {
  logInfo("🧹 Iniciando limpieza de recursos...");

  if (botProcessor && typeof botProcessor.cleanup === "function") {
    logInfo("🤖 Limpiando BotProcessor...");
    botProcessor.cleanup();
  } else if (botProcessor) {
    logInfo("🤖 BotProcessor detectado (sin método cleanup)");
  }

  if (whatsappClient) {
    logInfo("📱 Desconectando WhatsAppClient...");
    whatsappClient.disconnect();
  }

  const { dbConnection } = require("./database/connection");
  if (dbConnection) {
    logInfo("🗄️  Cerrando conexión a base de datos...");
    dbConnection.disconnect();
  }

  logInfo("✅ Limpieza completada");
  process.exit(0);
}

// Start the server - Solo escuchar en localhost por seguridad
app.listen(PORT, HOST, async () => {
  console.log(`🤖 WhatsApp Chatbot Server iniciado`);
  console.log(`📍 URL: http://${HOST}:${PORT}`);
  console.log(
    `🔒 Accesible SOLO desde: ${HOST === "127.0.0.1" ? "localhost" : HOST}`
  );
  console.log(`⏰ Hora: ${new Date().toLocaleString()}`);

  // Inicializar servicios después de que el servidor esté listo
  await initializeServices();
});
