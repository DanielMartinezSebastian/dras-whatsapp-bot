/**
 * Configuración global para scripts de test de DrasBot v2.0
 * Define constantes y configuraciones comunes para todos los tests
 */

module.exports = {
  // Número de teléfono de prueba (España)
  TEST_PHONE: "34633471003",
  TEST_PHONE_JID: "34633471003@s.whatsapp.net",

  // URLs de servicios
  BOT_URL: "http://localhost:3000",
  BRIDGE_URL: "http://127.0.0.1:8080",
  WEBHOOK_URL: "http://localhost:3000/webhook/whatsapp",

  // Configuración de pruebas
  TEST_DELAY: 3000, // 3 segundos entre tests
  TEST_TIMEOUT: 10000, // timeout en ms

  // Colores para output en consola
  colors: {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
  },

  // Funciones utilitarias
  log: function (message, color = "reset") {
    const colors = module.exports.colors;
    console.log(`${colors[color]}${message}${colors.reset}`);
  },

  header: function (message) {
    console.log("\n" + "=".repeat(70));
    module.exports.log(message, "bold");
    console.log("=".repeat(70));
  },

  sleep: function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

// Mostrar configuración al cargar
const config = module.exports;
console.log("🔧 Configuración de test cargada:");
console.log(`  📞 Teléfono de prueba: ${config.TEST_PHONE}`);
console.log(`  🌐 Bot URL: ${config.BOT_URL}`);
console.log(`  🌉 Bridge URL: ${config.BRIDGE_URL}`);
console.log(`  📡 Webhook URL: ${config.WEBHOOK_URL}`);
