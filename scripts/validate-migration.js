const fs = require("fs");
const path = require("path");

/**
 * Script de validación de migración simplificado
 * No requiere dependencias externas
 */
class MigrationValidator {
  constructor() {
    this.results = {
      success: 0,
      failed: 0,
      errors: [],
      warnings: [],
      commands: [],
    };
  }

  async validateMigration() {
    console.log("🔍 Iniciando validación de migración...\n");

    // Validar estructura de comandos
    await this.validateCommandStructure();

    // Validar carga de comandos
    await this.validateCommandLoading();

    // Validar ejecución básica
    await this.validateCommandExecution();

    // Generar reporte
    this.generateReport();
  }

  async validateCommandStructure() {
    console.log("📁 Validando estructura de comandos...");

    const commandsPath = path.join(
      __dirname,
      "../whatsapp-chatbot/src/bot/commands"
    );
    const categories = ["basic", "user", "system", "admin"];

    let totalFiles = 0;
    let validFiles = 0;

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);

      if (fs.existsSync(categoryPath)) {
        const files = fs
          .readdirSync(categoryPath)
          .filter((f) => f.endsWith(".js"));
        totalFiles += files.length;

        console.log(`  📂 ${category}/: ${files.length} archivos`);

        files.forEach((file) => {
          if (file.endsWith("Command.js")) {
            validFiles++;
            console.log(`    ✅ ${file}`);
          } else {
            this.results.warnings.push(
              `Archivo con naming no estándar: ${category}/${file}`
            );
          }
        });
      } else {
        this.results.warnings.push(`Directorio no encontrado: ${category}`);
      }
    }

    console.log(`  📊 Total: ${validFiles}/${totalFiles} archivos válidos\n`);
  }

  async validateCommandLoading() {
    console.log("🔧 Validando carga de comandos...");

    const commandsPath = path.join(
      __dirname,
      "../whatsapp-chatbot/src/bot/commands"
    );
    const categories = ["basic", "user", "system", "admin"];

    for (const category of categories) {
      const categoryPath = path.join(commandsPath, category);

      if (fs.existsSync(categoryPath)) {
        const files = fs
          .readdirSync(categoryPath)
          .filter((f) => f.endsWith(".js"));

        for (const file of files) {
          try {
            const fullPath = path.join(categoryPath, file);
            const CommandClass = require(fullPath);

            // Verificar que es una clase
            if (typeof CommandClass !== "function") {
              throw new Error("No es una clase válida");
            }

            // Intentar instanciar
            const instance = new CommandClass();

            // Verificar propiedades básicas
            if (!instance.name || typeof instance.name !== "string") {
              throw new Error("Propiedad name inválida");
            }

            if (!instance.execute || typeof instance.execute !== "function") {
              throw new Error("Método execute no encontrado");
            }

            if (
              !instance.executeNew ||
              typeof instance.executeNew !== "function"
            ) {
              throw new Error("Método executeNew no encontrado");
            }

            this.results.commands.push({
              category,
              file,
              name: instance.name,
              description: instance.description,
              requiredRole: instance.requiredRole,
              status: "loaded",
            });

            console.log(
              `    ✅ ${category}/${instance.name} - Cargado correctamente`
            );
            this.results.success++;
          } catch (error) {
            console.log(`    ❌ ${category}/${file} - Error: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`${category}/${file}: ${error.message}`);
          }
        }
      }
    }

    console.log("");
  }

  async validateCommandExecution() {
    console.log("⚡ Validando ejecución de comandos básicos...");

    const testMessage = {
      senderPhone: "34612345678@s.whatsapp.net",
      body: "!test",
      timestamp: Date.now(),
      chatJid: "34612345678@s.whatsapp.net",
    };

    const testContext = {
      user: { user_type: 4 },
      botProcessor: {
        startTime: new Date(),
        migrationManager: {
          getMigrationStats: () => ({
            totalCommands: 10,
            migratedCommands: 8,
            migrationProgress: 80,
            newSystemSuccess: 50,
            legacyFallbacks: 5,
          }),
          config: {
            migrationMode: "gradual",
            enableLegacyFallback: true,
          },
        },
      },
    };

    // Comandos críticos para validar
    const criticalCommands = [
      { category: "basic", file: "HelpCommand.js", name: "help" },
      { category: "basic", file: "InfoCommand.js", name: "info" },
      { category: "basic", file: "PingCommand.js", name: "ping" },
      {
        category: "admin",
        file: "MigrationDashboardCommand.js",
        name: "migration",
      },
    ];

    for (const cmd of criticalCommands) {
      try {
        const commandPath = path.join(
          __dirname,
          "../whatsapp-chatbot/src/bot/commands",
          cmd.category,
          cmd.file
        );

        if (!fs.existsSync(commandPath)) {
          console.log(`    ⚠️  ${cmd.name} - Archivo no encontrado`);
          continue;
        }

        const CommandClass = require(commandPath);
        const instance = new CommandClass();

        const startTime = Date.now();
        const result = await instance.executeNew(testMessage, [], testContext);
        const executionTime = Date.now() - startTime;

        if (typeof result === "string" && result.length > 0) {
          console.log(`    ✅ ${cmd.name} - Ejecutado en ${executionTime}ms`);
        } else {
          console.log(`    ⚠️  ${cmd.name} - Resultado inválido`);
          this.results.warnings.push(
            `${cmd.name}: resultado de ejecución inválido`
          );
        }
      } catch (error) {
        console.log(
          `    ❌ ${cmd.name} - Error de ejecución: ${error.message}`
        );
        this.results.errors.push(`${cmd.name}: ${error.message}`);
      }
    }

    console.log("");
  }

  generateReport() {
    console.log("📋 REPORTE DE VALIDACIÓN DE MIGRACIÓN");
    console.log("=====================================\n");

    console.log("📊 RESUMEN:");
    console.log(`• Comandos cargados exitosamente: ${this.results.success}`);
    console.log(`• Comandos con errores: ${this.results.failed}`);
    console.log(`• Advertencias: ${this.results.warnings.length}`);
    console.log(`• Errores críticos: ${this.results.errors.length}\n`);

    if (this.results.commands.length > 0) {
      console.log("✅ COMANDOS MIGRADOS:");
      this.results.commands.forEach((cmd) => {
        console.log(
          `• ${cmd.category}/${cmd.name} - Role: ${cmd.requiredRole}`
        );
      });
      console.log("");
    }

    if (this.results.warnings.length > 0) {
      console.log("⚠️  ADVERTENCIAS:");
      this.results.warnings.forEach((warning) => {
        console.log(`• ${warning}`);
      });
      console.log("");
    }

    if (this.results.errors.length > 0) {
      console.log("❌ ERRORES:");
      this.results.errors.forEach((error) => {
        console.log(`• ${error}`);
      });
      console.log("");
    }

    // Calcular progreso
    const totalExpected = 13; // Comandos esperados según plan
    const migrationProgress = (this.results.success / totalExpected) * 100;

    console.log("🎯 PROGRESO DE MIGRACIÓN:");
    console.log(
      `• Comandos migrados: ${this.results.success}/${totalExpected}`
    );
    console.log(`• Progreso: ${migrationProgress.toFixed(1)}%`);

    if (migrationProgress >= 80) {
      console.log("• Estado: 🟢 Migración en buen estado");
    } else if (migrationProgress >= 50) {
      console.log("• Estado: 🟡 Migración parcial");
    } else {
      console.log("• Estado: 🔴 Migración incompleta");
    }

    console.log("\n✨ Validación completada");
  }
}

// Ejecutar validación
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.validateMigration().catch(console.error);
}

module.exports = MigrationValidator;
