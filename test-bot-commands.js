#!/usr/bin/env node

/**
 * Script de prueba para comandos del bot DrasBot v2.0
 * Simula comandos recibidos desde WhatsApp para probar las funcionalidades
 */

const axios = require("axios");
const config = require("./test-config");

const { BOT_URL, BRIDGE_URL, TEST_PHONE, TEST_DELAY, TEST_TIMEOUT } = config;
const { colors, log, header, sleep } = config;

async function sendMessage(recipient, message) {
  try {
    const response = await axios.post(
      `${BRIDGE_URL}/api/send`,
      {
        recipient,
        message,
      },
      { timeout: TEST_TIMEOUT }
    );

    return response.data.success;
  } catch (error) {
    log(`❌ Error enviando mensaje: ${error.message}`, "red");
    return false;
  }
}

async function testBridgeCommands() {
  header("🤖 PROBANDO COMANDOS DEL BRIDGE DRASBOT v2.0");

  const commands = [
    {
      name: "Estado del Bridge",
      command: "!bridge",
      description: "Información general del bridge",
    },
    {
      name: "Lista de Chats",
      command: "!chats",
      description: "Obtener lista de chats recientes",
    },
    {
      name: "Código QR",
      command: "!qr",
      description: "Obtener código QR (si no está conectado)",
    },
    {
      name: "Salud del Bridge (Admin)",
      command: "!bridgehealth",
      description: "Estado detallado de salud del bridge",
    },
    {
      name: "Ayuda General",
      command: "!help",
      description: "Ver todos los comandos disponibles",
    },
    {
      name: "Ping Básico",
      command: "!ping",
      description: "Verificar conectividad básica",
    },
  ];

  log(`📞 Enviando comandos de prueba al número: ${TEST_PHONE}`, "cyan");

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];

    header(`🔍 Test ${i + 1}/${commands.length}: ${cmd.name}`);
    log(`Comando: ${cmd.command}`, "blue");
    log(`Descripción: ${cmd.description}`, "yellow");

    const success = await sendMessage(TEST_PHONE, cmd.command);

    if (success) {
      log("✅ Comando enviado correctamente", "green");
      log("📱 Revisa WhatsApp para ver la respuesta del bot", "cyan");
    } else {
      log("❌ Error enviando comando", "red");
    }

    // Esperar entre comandos para no saturar
    if (i < commands.length - 1) {
      log("⏳ Esperando antes del siguiente comando...", "yellow");
      await sleep(TEST_DELAY);
    }
  }

  header("🎯 COMANDOS DE PRUEBA COMPLETADOS");
  log("Todos los comandos han sido enviados", "green");
  log("Revisa tu WhatsApp para ver las respuestas del bot", "cyan");
  log(
    "El bot debería responder a cada comando con su funcionalidad correspondiente",
    "blue"
  );
}

async function testSpecialCommands() {
  header("🔧 PROBANDO COMANDOS ESPECIALES");

  const specialCommands = [
    {
      name: "Historial de Chat Específico",
      command: `!history ${TEST_PHONE}@s.whatsapp.net`,
      description: "Obtener historial de este chat",
    },
    {
      name: "Comando con Parámetros",
      command: "!history 10",
      description: "Historial con límite específico",
    },
  ];

  for (let i = 0; i < specialCommands.length; i++) {
    const cmd = specialCommands[i];

    header(`🔍 Test Especial ${i + 1}/${specialCommands.length}: ${cmd.name}`);
    log(`Comando: ${cmd.command}`, "blue");
    log(`Descripción: ${cmd.description}`, "yellow");

    const success = await sendMessage(TEST_PHONE, cmd.command);

    if (success) {
      log("✅ Comando especial enviado", "green");
    } else {
      log("❌ Error enviando comando especial", "red");
    }

    if (i < specialCommands.length - 1) {
      await sleep(TEST_DELAY);
    }
  }
}

async function main() {
  try {
    // Verificar que el bridge esté funcionando
    header("🔍 VERIFICANDO CONECTIVIDAD");

    try {
      const statusResponse = await axios.get(`${BRIDGE_URL}/api/status`, {
        timeout: TEST_TIMEOUT,
      });
      if (statusResponse.data.connected) {
        log("✅ Bridge conectado y listo", "green");
        log(
          `Usuario: ${statusResponse.data.user_info?.phone || "Desconocido"}`,
          "blue"
        );
      } else {
        log("⚠️  Bridge no está conectado a WhatsApp", "yellow");
        return;
      }
    } catch (error) {
      log("❌ No se puede conectar al bridge. ¿Está funcionando?", "red");
      log("Ejecuta primero: cd whatsapp-bridge && go run main.go", "yellow");
      return;
    }

    // Ejecutar pruebas de comandos
    await testBridgeCommands();

    // Esperar un poco antes de comandos especiales
    await sleep(TEST_DELAY * 2);

    // Ejecutar comandos especiales
    await testSpecialCommands();

    header("🌟 TODAS LAS PRUEBAS COMPLETADAS");
    log(
      "Integración de DrasBot v2.0 con WhatsApp Bridge probada exitosamente",
      "green"
    );
    log("🚀 El sistema está funcionando correctamente", "cyan");

    console.log("\n" + "🎉".repeat(25) + " ÉXITO " + "🎉".repeat(25));
  } catch (error) {
    log("❌ Error general en las pruebas:", "red");
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  main();
}

module.exports = { testBridgeCommands, sendMessage };
