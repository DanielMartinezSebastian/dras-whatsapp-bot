#!/usr/bin/env node

/**
 * Script maestro de pruebas para DrasBot v2.0
 * Ejecuta todas las pruebas con configuración centralizada
 */

const config = require("./test-config");
const { header, log, sleep } = config;

async function runAllTests() {
  header("🚀 INICIANDO SUITE COMPLETA DE PRUEBAS DRASBOT v2.0");

  log(`📞 Número de prueba configurado: ${config.TEST_PHONE}`, "cyan");
  log(`🌉 Bridge URL: ${config.BRIDGE_URL}`, "blue");
  log(`🤖 Bot URL: ${config.BOT_URL}`, "blue");

  const tests = [
    {
      name: "Funcionalidad del Bridge",
      file: "./test-bridge-functionality.js",
      description: "Prueba endpoints básicos del bridge",
    },
    {
      name: "Comandos del Bot",
      file: "./test-bot-commands.js",
      description: "Prueba comandos a través del bridge",
    },
  ];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];

    header(`🧪 EJECUTANDO PRUEBA ${i + 1}/${tests.length}: ${test.name}`);
    log(test.description, "yellow");

    try {
      // Importar y ejecutar el test
      require(test.file);

      log(`✅ Prueba ${test.name} iniciada correctamente`, "green");

      // Esperar antes del siguiente test
      if (i < tests.length - 1) {
        log("⏳ Esperando antes del siguiente test...", "yellow");
        await sleep(config.TEST_DELAY * 2);
      }
    } catch (error) {
      log(`❌ Error ejecutando ${test.name}: ${error.message}`, "red");
    }
  }

  header("🎯 SUITE DE PRUEBAS COMPLETADA");
  log("Revisa los resultados individuales arriba", "cyan");
  log("Para el bot: revisa WhatsApp y los logs del bot", "blue");
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
🔧 Script maestro de pruebas DrasBot v2.0

Uso:
  node run-all-tests.js              # Ejecutar todas las pruebas
  node run-all-tests.js --help       # Mostrar esta ayuda

Configuración actual:
  📞 Teléfono: ${config.TEST_PHONE}
  🌉 Bridge: ${config.BRIDGE_URL}
  🤖 Bot: ${config.BOT_URL}

Tests incluidos:
  - Funcionalidad del Bridge
  - Comandos del Bot
  - Auto-respuestas (usar script separado)
  `);
  process.exit(0);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runAllTests().catch((error) => {
    log(`❌ Error en suite de pruebas: ${error.message}`, "red");
    process.exit(1);
  });
}

module.exports = { runAllTests };
