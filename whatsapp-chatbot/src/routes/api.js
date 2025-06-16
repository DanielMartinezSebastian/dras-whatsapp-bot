const express = require("express");
const router = express.Router();
const { logInfo, logError } = require("../utils/logger");

// Las rutas API ahora son principalmente de información ya que el bot procesa mensajes via bridge
let botProcessor;

// Función para establecer la referencia al BotProcessor desde app.js
function setBotProcessor(processor) {
  botProcessor = processor;
}

// Ruta para recibir mensajes de WhatsApp (legacy - ahora usa bridge)
router.post("/messages", async (req, res) => {
  try {
    logInfo("📨 Mensaje recibido via API (legacy)");
    res.status(200).json({
      status: "received",
      message: "Los mensajes ahora se procesan via bridge WhatsApp",
      architecture: "BotProcessor modular",
    });
  } catch (error) {
    logError("Error en API messages:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Ruta para obtener estadísticas del bot
router.get("/stats", (req, res) => {
  try {
    if (botProcessor) {
      const stats = botProcessor.getStats();
      res.json({
        success: true,
        data: stats,
        architecture: "BotProcessor modular",
      });
    } else {
      res.status(503).json({
        success: false,
        error: "BotProcessor no inicializado",
      });
    }
  } catch (error) {
    logError("Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// Ruta para verificar si el bot está listo
router.get("/ready", (req, res) => {
  try {
    const isReady = botProcessor ? botProcessor.isReady() : false;
    res.json({
      ready: isReady,
      architecture: "BotProcessor modular",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError("Error verificando estado:", error);
    res.status(500).json({
      ready: false,
      error: "Error interno del servidor",
    });
  }
});

module.exports = router;
module.exports.setBotProcessor = setBotProcessor;
