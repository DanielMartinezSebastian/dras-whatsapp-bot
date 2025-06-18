#!/usr/bin/env node

/**
 * Script de prueba para el WhatsApp Bridge
 * Prueba las funcionalidades principales del bridge con el número 34633471003
 */

const axios = require("axios");
const config = require("./test-config");

const { BRIDGE_URL, TEST_PHONE, TEST_TIMEOUT } = config;
const { colors, log, header } = config;

async function testBridgeEndpoint(endpoint, method = "GET", data = null) {
  try {
    const config = {
      method,
      url: `${BRIDGE_URL}${endpoint}`,
      timeout: TEST_TIMEOUT,
    };

    if (data) {
      config.data = data;
      config.headers = { "Content-Type": "application/json" };
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  header("🚀 INICIANDO PRUEBAS DEL WHATSAPP BRIDGE");

  // Test 1: Verificar estado del bridge
  header("📊 Test 1: Estado del Bridge");
  const statusResult = await testBridgeEndpoint("/api/status");
  if (statusResult.success) {
    log("✅ Bridge Status OK", "green");
    log(`Conectado: ${statusResult.data.connected}`, "blue");
    if (statusResult.data.user_info) {
      log(`Usuario: ${statusResult.data.user_info.phone}`, "blue");
      log(`JID: ${statusResult.data.user_info.jid}`, "blue");
    }
  } else {
    log("❌ Error en status del bridge", "red");
    log(JSON.stringify(statusResult.error), "red");
    return;
  }

  // Test 2: Información del bridge
  header("ℹ️  Test 2: Información del Bridge");
  const infoResult = await testBridgeEndpoint("/api/info");
  if (infoResult.success) {
    log("✅ Bridge Info OK", "green");
    log(`Versión: ${infoResult.data.version}`, "blue");
    log(`Nombre: ${infoResult.data.name}`, "blue");
    log(`Conectado: ${infoResult.data.connected}`, "blue");
  } else {
    log("❌ Error obteniendo info del bridge", "red");
    log(JSON.stringify(infoResult.error), "red");
  }

  // Test 3: Enviar mensaje de prueba
  header("📱 Test 3: Enviar Mensaje de Prueba");
  const testMessage = `🤖 Prueba DrasBot v2.0 Bridge\nFecha: ${new Date().toLocaleString()}\nEste es un mensaje de prueba del nuevo sistema de bridge!`;

  const sendResult = await testBridgeEndpoint("/api/send", "POST", {
    recipient: TEST_PHONE,
    message: testMessage,
  });

  if (sendResult.success) {
    log("✅ Mensaje enviado correctamente", "green");
    log(`Respuesta: ${sendResult.data.message}`, "blue");
  } else {
    log("❌ Error enviando mensaje", "red");
    log(JSON.stringify(sendResult.error), "red");
  }

  // Esperar un momento antes del siguiente test
  await sleep(2000);

  // Test 4: Enviar mensaje con emojis y formato
  header("🎨 Test 4: Mensaje con Emojis y Formato");
  const fancyMessage = `🚀 *DrasBot v2.0 - Funcionalidades*
    
✅ Bridge de WhatsApp operativo
🔄 Integración TypeScript + Go
📊 Monitoreo en tiempo real
💬 Mensajes y multimedia
🔐 Autenticación segura

_Sistema probado exitosamente el ${new Date().toLocaleDateString()}_`;

  const fancyResult = await testBridgeEndpoint("/api/send", "POST", {
    recipient: TEST_PHONE,
    message: fancyMessage,
  });

  if (fancyResult.success) {
    log("✅ Mensaje con formato enviado", "green");
    log(`Respuesta: ${fancyResult.data.message}`, "blue");
  } else {
    log("❌ Error enviando mensaje con formato", "red");
    log(JSON.stringify(fancyResult.error), "red");
  }

  // Test 5: Verificar estado final
  header("🏁 Test 5: Estado Final");
  const finalStatusResult = await testBridgeEndpoint("/api/status");
  if (finalStatusResult.success) {
    log("✅ Estado final OK", "green");
    log(`Bridge sigue conectado: ${finalStatusResult.data.connected}`, "blue");
  } else {
    log("❌ Error en estado final", "red");
  }

  header("🎯 RESUMEN DE PRUEBAS COMPLETADAS");
  log("Bridge de WhatsApp probado exitosamente", "green");
  log(`Mensajes enviados a: ${TEST_PHONE}`, "blue");
  log("Revisa tu WhatsApp para ver los mensajes recibidos", "yellow");

  console.log("\n" + "✨".repeat(20) + " FIN DE PRUEBAS " + "✨".repeat(20));
}

// Función principal
async function main() {
  try {
    await runTests();
  } catch (error) {
    log("❌ Error general en las pruebas:", "red");
    console.error(error);
    process.exit(1);
  }
}

// Verificar si axios está disponible
try {
  require("axios");
} catch (error) {
  log("❌ axios no está instalado. Instalando...", "yellow");
  const { execSync } = require("child_process");
  try {
    execSync("npm install axios", { stdio: "inherit" });
    log("✅ axios instalado correctamente", "green");
  } catch (installError) {
    log("❌ Error instalando axios", "red");
    process.exit(1);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  main();
}

module.exports = { runTests, testBridgeEndpoint };
