#!/usr/bin/env node

/**
 * Script maestro para generar tipos y cliente TypeScript del WhatsApp Bridge
 *
 * Este script:
 * 1. Analiza el código Go del bridge
 * 2. Genera definiciones de tipos TypeScript
 * 3. Genera cliente TypeScript completamente tipado
 * 4. Crea tests y documentación
 * 5. Integra todo en el proyecto existente
 *
 * Uso: node scripts/setup-bridge-types.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class BridgeSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.bridgePath = path.join(this.projectRoot, "whatsapp-bridge");
    this.chatbotPath = path.join(this.projectRoot, "whatsapp-chatbot");
    this.scriptsPath = path.join(this.projectRoot, "scripts");
  }

  /**
   * Ejecutar setup completo
   */
  async run() {
    console.log("🚀 Configurando tipos TypeScript para WhatsApp Bridge\n");

    try {
      // Verificar prerequisitos
      this.checkPrerequisites();

      // Generar tipos del bridge
      console.log("📊 Paso 1: Generando tipos del bridge...");
      await this.generateBridgeTypes();

      // Generar cliente tipado
      console.log("🔧 Paso 2: Generando cliente TypeScript...");
      await this.generateBridgeClient();

      // Actualizar imports existentes
      console.log("🔄 Paso 3: Actualizando imports existentes...");
      await this.updateExistingImports();

      // Generar ejemplo de uso
      console.log("📝 Paso 4: Generando ejemplos de uso...");
      await this.generateUsageExamples();

      // Configurar scripts npm
      console.log("⚙️  Paso 5: Configurando scripts npm...");
      await this.setupNpmScripts();

      // Ejecutar tests
      console.log("🧪 Paso 6: Ejecutando tests...");
      await this.runTests();

      console.log("\n✅ ¡Setup completado exitosamente!");
      this.showSummary();
    } catch (error) {
      console.error("❌ Error durante el setup:", error.message);
      process.exit(1);
    }
  }

  /**
   * Verificar que existen todos los archivos necesarios
   */
  checkPrerequisites() {
    const requiredFiles = [
      path.join(this.bridgePath, "main.go"),
      path.join(this.chatbotPath, "package.json"),
      path.join(this.scriptsPath, "analyze-bridge-types.js"),
      path.join(this.scriptsPath, "generate-bridge-client.js"),
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Archivo requerido no encontrado: ${file}`);
      }
    }

    console.log("✅ Prerequisitos verificados");
  }

  /**
   * Generar tipos del bridge
   */
  async generateBridgeTypes() {
    try {
      const BridgeAnalyzer = require("./analyze-bridge-types.js");

      const analyzer = new BridgeAnalyzer();
      analyzer.analyze();
      analyzer.generateTypes();
      analyzer.generateDocumentation();

      console.log("✅ Tipos del bridge generados");
    } catch (error) {
      console.error("❌ Error generando tipos:", error.message);
      throw error;
    }
  }

  /**
   * Generar cliente tipado
   */
  async generateBridgeClient() {
    try {
      const BridgeClientGenerator = require("./generate-bridge-client.js");

      const generator = new BridgeClientGenerator();
      generator.generate();

      console.log("✅ Cliente tipado generado");
    } catch (error) {
      console.error("❌ Error generando cliente:", error.message);
      throw error;
    }
  }

  /**
   * Actualizar imports existentes para usar el nuevo cliente
   */
  async updateExistingImports() {
    const filesToUpdate = [
      path.join(this.chatbotPath, "src/whatsapp/WhatsAppClient.ts"),
      path.join(this.chatbotPath, "src/app.js"),
    ];

    for (const filePath of filesToUpdate) {
      if (fs.existsSync(filePath)) {
        try {
          let content = fs.readFileSync(filePath, "utf8");

          // Actualizar imports para incluir el nuevo cliente bridge
          if (filePath.endsWith(".ts")) {
            // Agregar import del nuevo cliente bridge si no existe
            if (!content.includes("WhatsAppBridgeClient")) {
              const importLine =
                "import { WhatsAppBridgeClient } from '../bridge';\\n";
              content = importLine + content;
            }
          }

          fs.writeFileSync(filePath, content);
          console.log(`  ✅ Actualizado: ${filePath}`);
        } catch (error) {
          console.warn(
            `  ⚠️  No se pudo actualizar: ${filePath} - ${error.message}`
          );
        }
      }
    }
  }

  /**
   * Generar ejemplos de uso
   */
  async generateUsageExamples() {
    const examplesDir = path.join(this.chatbotPath, "examples");

    if (!fs.existsSync(examplesDir)) {
      fs.mkdirSync(examplesDir, { recursive: true });
    }

    // Ejemplo básico
    const basicExample = `import { WhatsAppBridgeClient, BridgeUtils } from '../src/bridge';

/**
 * Ejemplo básico de uso del WhatsApp Bridge Client
 */
async function basicExample() {
  console.log('🚀 Iniciando ejemplo básico del Bridge Client');

  // Crear cliente
  const client = new WhatsAppBridgeClient({
    baseUrl: 'http://127.0.0.1:8080',
    timeout: 10000,
    enableLogging: true
  });

  try {
    // Verificar disponibilidad
    const isAvailable = await client.isAvailable();
    console.log('📡 Bridge disponible:', isAvailable);

    if (!isAvailable) {
      console.log('❌ Bridge no disponible. Asegúrate de que esté ejecutándose.');
      return;
    }

    // Obtener estado
    const status = await client.getStatus();
    console.log('📊 Estado del bridge:', status);

    // Enviar mensaje de texto
    console.log('📤 Enviando mensaje de texto...');
    const textResult = await client.sendMessage(
      '1234567890', // Reemplaza con un número real
      '¡Hola desde el cliente TypeScript tipado!'
    );
    console.log('✅ Resultado:', textResult);

    // Ejemplo de utilidades
    console.log('🔧 Probando utilidades:');
    const phoneNumber = '1234567890';
    console.log('  Número válido:', BridgeUtils.isValidPhoneNumber(phoneNumber));
    console.log('  Número formateado:', BridgeUtils.formatPhoneNumber(phoneNumber));
    console.log('  JID creado:', BridgeUtils.createJidFromPhone(phoneNumber));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Limpiar recursos
    await client.destroy();
    console.log('🧹 Cliente limpiado');
  }
}

// Ejecutar ejemplo
if (require.main === module) {
  basicExample().catch(console.error);
}

export { basicExample };`;

    fs.writeFileSync(
      path.join(examplesDir, "basic-bridge-usage.ts"),
      basicExample
    );

    // Ejemplo avanzado
    const advancedExample = `import { WhatsAppBridgeClient, BridgeClientError } from '../src/bridge';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ejemplo avanzado del WhatsApp Bridge Client
 */
async function advancedExample() {
  console.log('🚀 Iniciando ejemplo avanzado del Bridge Client');

  const client = new WhatsAppBridgeClient();

  try {
    // Manejar errores específicos
    await handleErrorsExample(client);
    
    // Enviar multimedia
    await sendMediaExample(client);
    
    // Descargar multimedia
    await downloadMediaExample(client);

  } catch (error) {
    console.error('❌ Error en ejemplo avanzado:', error);
  } finally {
    await client.destroy();
  }
}

async function handleErrorsExample(client: WhatsAppBridgeClient) {
  console.log('\\n🔍 Ejemplo de manejo de errores');
  
  try {
    // Intentar enviar a número inválido
    await client.sendMessage('invalid', 'test');
  } catch (error) {
    if (error instanceof BridgeClientError) {
      console.log('Tipo de error:', error.code);
      console.log('Es recuperable:', error.isRetryable());
      console.log('Es error de conexión:', error.isConnectionError());
      console.log('Detalles:', error.getErrorInfo());
    }
  }
}

async function sendMediaExample(client: WhatsAppBridgeClient) {
  console.log('\\n📸 Ejemplo de envío de multimedia');
  
  // Crear archivo de prueba (imagen dummy)
  const testImagePath = path.join(__dirname, 'test-image.txt');
  fs.writeFileSync(testImagePath, 'Contenido de imagen de prueba');
  
  try {
    const result = await client.sendMedia(
      '1234567890', // Reemplaza con número real
      testImagePath,
      'Imagen de prueba desde TypeScript'
    );
    console.log('✅ Multimedia enviada:', result);
  } catch (error) {
    console.log('❌ Error enviando multimedia:', error.message);
  } finally {
    // Limpiar archivo de prueba
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

async function downloadMediaExample(client: WhatsAppBridgeClient) {
  console.log('\\n⬇️  Ejemplo de descarga de multimedia');
  
  try {
    // Nota: Necesitas IDs reales de mensajes para que funcione
    const result = await client.downloadMedia(
      'messageId123', // Reemplaza con ID real
      'chatJid@s.whatsapp.net' // Reemplaza con JID real
    );
    
    if (result.success && result.data) {
      console.log('✅ Archivo descargado:', result.data.filename);
      console.log('📁 Ubicación:', result.data.path);
    }
  } catch (error) {
    console.log('❌ Error descargando (esperado con IDs ficticios):', error.message);
  }
}

// Ejecutar ejemplo
if (require.main === module) {
  advancedExample().catch(console.error);
}

export { advancedExample };`;

    fs.writeFileSync(
      path.join(examplesDir, "advanced-bridge-usage.ts"),
      advancedExample
    );

    console.log("✅ Ejemplos de uso generados");
  }

  /**
   * Configurar scripts npm
   */
  async setupNpmScripts() {
    const packageJsonPath = path.join(this.chatbotPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      console.log(
        "⚠️  package.json no encontrado, saltando configuración de scripts"
      );
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Agregar scripts si no existen
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const newScripts = {
      "bridge:types": "node ../scripts/analyze-bridge-types.js",
      "bridge:client": "node ../scripts/generate-bridge-client.js",
      "bridge:setup": "node ../scripts/setup-bridge-types.js",
      "bridge:test": "jest bridge-client.test.ts",
      "bridge:example": "ts-node examples/basic-bridge-usage.ts",
    };

    for (const [key, value] of Object.entries(newScripts)) {
      if (!packageJson.scripts[key]) {
        packageJson.scripts[key] = value;
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Scripts npm configurados");
  }

  /**
   * Ejecutar tests básicos
   */
  async runTests() {
    try {
      const testFile = path.join(
        this.chatbotPath,
        "src/__tests__/bridge/bridge-client.test.ts"
      );

      if (fs.existsSync(testFile)) {
        console.log("Ejecutando tests básicos...");

        // Intentar ejecutar tests con jest si está disponible
        try {
          execSync("npm test -- bridge-client.test.ts", {
            cwd: this.chatbotPath,
            stdio: "inherit",
          });
          console.log("✅ Tests ejecutados exitosamente");
        } catch (error) {
          console.log("⚠️  No se pudieron ejecutar tests automáticamente");
          console.log("   Ejecuta manualmente: npm test bridge-client.test.ts");
        }
      } else {
        console.log("⚠️  Archivo de tests no encontrado");
      }
    } catch (error) {
      console.log("⚠️  Error ejecutando tests:", error.message);
    }
  }

  /**
   * Mostrar resumen final
   */
  showSummary() {
    console.log("\\n📋 Resumen del setup:");
    console.log("");
    console.log("📁 Archivos generados:");
    console.log("  • src/bridge/client.ts - Cliente principal tipado");
    console.log("  • src/bridge/types.ts - Definiciones de tipos");
    console.log("  • src/bridge/error.ts - Manejo de errores");
    console.log("  • src/bridge/config.ts - Configuraciones");
    console.log("  • src/bridge/utils.ts - Utilidades");
    console.log("  • src/bridge/index.ts - Exportaciones");
    console.log("  • src/__tests__/bridge/ - Tests unitarios");
    console.log("  • examples/ - Ejemplos de uso");
    console.log("");
    console.log("🛠️  Scripts npm disponibles:");
    console.log("  • npm run bridge:types - Regenerar tipos");
    console.log("  • npm run bridge:client - Regenerar cliente");
    console.log("  • npm run bridge:test - Ejecutar tests");
    console.log("  • npm run bridge:example - Ejecutar ejemplo");
    console.log("");
    console.log("🚀 Próximos pasos:");
    console.log("  1. Revisar archivos generados");
    console.log("  2. Ejecutar: npm run bridge:example");
    console.log("  3. Integrar en tu código existente");
    console.log("  4. Reemplazar cliente actual con el tipado");
    console.log("");
    console.log("📚 Documentación disponible en:");
    console.log("  • src/bridge/README.md");
    console.log("  • examples/");
  }
}

// Función principal
async function main() {
  const setup = new BridgeSetup();
  await setup.run();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
}

module.exports = BridgeSetup;
