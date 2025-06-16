#!/usr/bin/env node

/**
 * Script simple para probar comandos sin enviar mensajes reales
 */

const path = require("path");

// Configurar paths
process.env.NODE_PATH = path.join(__dirname, "dist");
require("module")._initPaths();

async function testCommands() {
  try {
    console.log("🧪 Iniciando prueba de comandos...");

    // Importar el sistema de comandos compilado
    const {
      commandRegistry,
    } = require("./dist/bot/commands/core/CommandRegistry");
    const {
      UnifiedCommandHandler,
    } = require("./dist/bot/commands/core/UnifiedCommandHandler");

    console.log("📦 Módulos importados correctamente");

    // Crear instancia del handler
    const commandHandler = new UnifiedCommandHandler();

    // Cargar comandos básicos manualmente
    try {
      const { HelpCommand } = require("./dist/bot/commands/basic/HelpCommand");
      const { PingCommand } = require("./dist/bot/commands/basic/PingCommand");
      const {
        ProfileCommand,
      } = require("./dist/bot/commands/user/ProfileCommand");

      commandRegistry.register(new HelpCommand());
      commandRegistry.register(new PingCommand());
      commandRegistry.register(new ProfileCommand());

      console.log(
        "✅ Comandos cargados:",
        commandRegistry.getAll().map((cmd) => cmd.metadata.name)
      );
    } catch (error) {
      console.error("❌ Error cargando comandos:", error.message);
      return;
    }

    // Usuario de prueba
    const testUser = {
      whatsapp_jid: "34612345678@s.whatsapp.net",
      name: "Daniel",
      user_type: "admin",
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mensaje de prueba para /help
    const helpMessage = {
      id: "test-help-1",
      text: "/help",
      content: "/help",
      sender: testUser.whatsapp_jid,
      chat: testUser.whatsapp_jid,
      timestamp: new Date(),
      from_me: false,
    };

    console.log("🧪 Probando comando /help...");
    const helpResult = await commandHandler.handleCommand(
      helpMessage,
      testUser
    );
    console.log("📝 Resultado /help:", {
      success: helpResult.success,
      shouldReply: helpResult.shouldReply,
      response: helpResult.response
        ? helpResult.response.substring(0, 100) + "..."
        : "No response",
      error: helpResult.error,
    });

    // Mensaje de prueba para /profile
    const profileMessage = {
      id: "test-profile-1",
      text: "/profile",
      content: "/profile",
      sender: testUser.whatsapp_jid,
      chat: testUser.whatsapp_jid,
      timestamp: new Date(),
      from_me: false,
    };

    console.log("🧪 Probando comando /profile...");
    const profileResult = await commandHandler.handleCommand(
      profileMessage,
      testUser
    );
    console.log("📝 Resultado /profile:", {
      success: profileResult.success,
      shouldReply: profileResult.shouldReply,
      response: profileResult.response
        ? profileResult.response.substring(0, 100) + "..."
        : "No response",
      error: profileResult.error,
    });
  } catch (error) {
    console.error("❌ Error en la prueba:", error);
  }
}

// Ejecutar prueba
testCommands()
  .then(() => {
    console.log("🏁 Prueba completada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Error fatal:", error);
    process.exit(1);
  });
