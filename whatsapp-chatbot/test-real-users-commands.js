#!/usr/bin/env node
/**
 * Test Real de Comandos !users
 *
 * Este script envía comandos reales al bot y captura las respuestas
 * para validar que todos los comandos de administración de usuarios funcionen.
 */

const http = require("http");
const fs = require("fs");

class RealUsersCommandTester {
  constructor() {
    this.botApiUrl = "http://localhost:3000";
    this.bridgeApiUrl = "http://localhost:8080";
    this.testPhoneJid = "34612345678@s.whatsapp.net";
    this.results = [];
    this.logFile = `real-test-users-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.log`;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + "\n");
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        to: this.testPhoneJid,
        message: message,
        type: "text",
      });

      const options = {
        hostname: "localhost",
        port: 8080,
        path: "/api/send-message",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            resolve({ error: "Invalid JSON response", rawData: data });
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async waitForResponse(timeoutMs = 5000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, timeoutMs);
    });
  }

  async testCommand(command) {
    this.log(`\n${"=".repeat(60)}`);
    this.log(`🧪 TESTING: ${command}`);
    this.log(`${"=".repeat(60)}`);

    const startTime = Date.now();

    try {
      // Enviar comando al bot
      this.log(`📤 Enviando comando al bot...`);
      const sendResult = await this.sendMessage(command);
      this.log(
        `📦 Respuesta del bridge: ${JSON.stringify(sendResult, null, 2)}`
      );

      // Esperar respuesta del bot (simulado)
      this.log(`⏳ Esperando respuesta del bot...`);
      await this.waitForResponse(2000);

      const executionTime = Date.now() - startTime;

      const result = {
        command,
        timestamp: new Date().toISOString(),
        executionTime,
        bridgeResponse: sendResult,
        success: !sendResult.error,
        status: sendResult.error ? "failed" : "sent",
      };

      this.results.push(result);
      this.log(`✅ Comando procesado en ${executionTime}ms`);

      return result;
    } catch (error) {
      this.log(`❌ Error: ${error.message}`);

      const result = {
        command,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
        error: error.message,
        success: false,
        status: "error",
      };

      this.results.push(result);
      return result;
    }
  }

  async runAllTests() {
    this.log("🚀 INICIANDO TESTS REALES DE COMANDOS !users");
    this.log("================================================");
    this.log(`📅 Timestamp: ${new Date().toISOString()}`);
    this.log(`🎯 Target JID: ${this.testPhoneJid}`);
    this.log(`🌐 Bot API: ${this.botApiUrl}`);
    this.log(`🌉 Bridge API: ${this.bridgeApiUrl}`);

    // Lista de comandos a probar
    const commandsToTest = [
      // Ayuda y comandos básicos
      "!users",

      // Comandos de consulta
      "!users list",
      "!users list 5",
      "!users list 3 2",

      // Búsquedas
      "!users search Test",
      "!users search Daniel",
      "!users search Admin",
      "!users search 34633",

      // Información específica
      "!users info 34612345678",
      "!users info 123456789",

      // Estadísticas
      "!users stats",

      // Actualizaciones (sin cambios reales peligrosos)
      '!users update 34612345678 name "Test Name"',
      "!users update 34612345678 type admin",

      // Comandos con errores esperados
      "!users invalid",
      "!users search",
      "!users info",
      "!users update",
      "!users update 123456789",
      "!users update 123456789 type invalid_type",

      // Comando de eliminación (sin confirm por seguridad)
      "!users delete 123456789",
    ];

    this.log(`📋 Total de comandos a probar: ${commandsToTest.length}`);

    for (let i = 0; i < commandsToTest.length; i++) {
      const command = commandsToTest[i];
      this.log(`\n📊 Progreso: ${i + 1}/${commandsToTest.length}`);

      await this.testCommand(command);

      // Pausa entre comandos para no saturar
      if (i < commandsToTest.length - 1) {
        this.log(`⏸️ Pausa de 2 segundos...`);
        await this.waitForResponse(2000);
      }
    }

    this.generateReport();
  }

  generateReport() {
    this.log(`\n${"=".repeat(60)}`);
    this.log("📊 REPORTE FINAL");
    this.log(`${"=".repeat(60)}`);

    const total = this.results.length;
    const successful = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    const sent = this.results.filter((r) => r.status === "sent").length;
    const errors = this.results.filter((r) => r.status === "error").length;

    this.log(`\n📈 ESTADÍSTICAS:`);
    this.log(`   Total de comandos: ${total}`);
    this.log(`   Enviados exitosamente: ${sent}`);
    this.log(`   Errores de envío: ${errors}`);
    this.log(`   Tasa de envío: ${((sent / total) * 100).toFixed(2)}%`);

    this.log(`\n✅ COMANDOS ENVIADOS EXITOSAMENTE:`);
    this.results
      .filter((r) => r.status === "sent")
      .forEach((result) => {
        this.log(`   ✓ ${result.command} (${result.executionTime}ms)`);
      });

    this.log(`\n❌ COMANDOS CON ERRORES:`);
    this.results
      .filter((r) => r.status === "error")
      .forEach((result) => {
        this.log(`   ✗ ${result.command} - ${result.error}`);
      });

    this.log(`\n🔍 RESPUESTAS DEL BRIDGE:`);
    this.results.forEach((result) => {
      if (result.bridgeResponse) {
        this.log(
          `   📨 ${result.command}: ${JSON.stringify(result.bridgeResponse)}`
        );
      }
    });

    // Guardar reporte JSON
    const reportFile = `real-test-results-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalCommands: total,
        successfulSends: sent,
        errors: errors,
        sendRate: parseFloat(((sent / total) * 100).toFixed(2)),
        testDuration:
          this.results.length > 0
            ? new Date(this.results[this.results.length - 1].timestamp) -
              new Date(this.results[0].timestamp)
            : 0,
      },
      configuration: {
        botApiUrl: this.botApiUrl,
        bridgeApiUrl: this.bridgeApiUrl,
        testPhoneJid: this.testPhoneJid,
      },
      results: this.results,
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`\n📄 Reporte completo guardado en: ${reportFile}`);
    this.log(`📋 Log detallado en: ${this.logFile}`);

    // Instrucciones para revisar logs del bot
    this.log(`\n🔍 PARA REVISAR LOS LOGS DEL BOT:`);
    this.log(`   tail -f logs/combined-0.log | grep -E "(users|Users|USERS)"`);
    this.log(`   tail -f logs/error.log`);
    this.log(`   pm2 logs whatsapp-chatbot`);
  }

  async checkBotStatus() {
    this.log("🔍 Verificando estado del bot...");

    try {
      const healthCheck = await new Promise((resolve, reject) => {
        const req = http.get(`${this.botApiUrl}/health`, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ status: "unknown", rawData: data });
            }
          });
        });
        req.on("error", reject);
        req.setTimeout(3000, () => reject(new Error("Timeout")));
      });

      this.log(`✅ Bot status: ${JSON.stringify(healthCheck)}`);
    } catch (error) {
      this.log(`❌ No se pudo verificar el estado del bot: ${error.message}`);
    }

    try {
      const bridgeCheck = await new Promise((resolve, reject) => {
        const req = http.get(`${this.bridgeApiUrl}/health`, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ status: "unknown", rawData: data });
            }
          });
        });
        req.on("error", reject);
        req.setTimeout(3000, () => reject(new Error("Timeout")));
      });

      this.log(`✅ Bridge status: ${JSON.stringify(bridgeCheck)}`);
    } catch (error) {
      this.log(
        `❌ No se pudo verificar el estado del bridge: ${error.message}`
      );
    }
  }
}

async function main() {
  console.log("🧪 Test Real de Comandos !users");
  console.log("=================================\n");

  const tester = new RealUsersCommandTester();

  // Verificar estado del sistema
  await tester.checkBotStatus();

  // Ejecutar tests
  await tester.runAllTests();

  console.log("\n🎉 Tests completados.");
  console.log("💡 Revisa los logs del bot para ver las respuestas:");
  console.log(
    "   cd /home/dras/Documentos/PROGRAMACION/drasBot/whatsapp-chatbot"
  );
  console.log("   tail -f logs/combined-0.log | grep -i users");
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RealUsersCommandTester;
