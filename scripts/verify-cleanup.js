const fs = require("fs");
const path = require("path");

class CleanupVerifier {
  constructor() {
    this.projectRoot = "/home/dras/Documentos/PROGRAMACION/drasBot";
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  async verify() {
    console.log("🔍 Verificando limpieza del sistema legacy...\n");

    await this.checkLegacyFiles();
    await this.checkLegacyReferences();
    await this.checkConfiguration();
    await this.checkCommandsLoading();
    await this.checkMigrationProgress();

    this.generateReport();
  }

  async checkLegacyFiles() {
    console.log("📁 Verificando eliminación de archivos legacy...");

    const legacyPaths = [
      "whatsapp-chatbot/backup/old-handlers-20250613-210515",
      "whatsapp-chatbot/src/legacy",
      "whatsapp-chatbot/src/old-handlers",
      "whatsapp-chatbot/src/bot/commands/general", // Comandos duplicados
    ];

    legacyPaths.forEach((legacyPath) => {
      const fullPath = path.join(this.projectRoot, legacyPath);
      if (fs.existsSync(fullPath)) {
        this.warnings.push(
          `Archivo/directorio legacy aún existe: ${legacyPath}`
        );
        console.log(`  ⚠️  ${legacyPath} - Aún existe`);
      } else {
        this.successes.push(`Archivo legacy eliminado: ${legacyPath}`);
        console.log(`  ✅ ${legacyPath} - Eliminado correctamente`);
      }
    });

    console.log("");
  }

  async checkLegacyReferences() {
    console.log("🔍 Verificando referencias legacy en código...");

    const srcPath = path.join(this.projectRoot, "whatsapp-chatbot/src");

    if (fs.existsSync(srcPath)) {
      const files = this.getAllJSFiles(srcPath);
      let referencesFound = 0;

      files.forEach((file) => {
        const content = fs.readFileSync(file, "utf8");

        // Buscar referencias legacy específicas
        const legacyPatterns = [
          /TODO.*implementar.*lógica/gi,
          /TODO.*migrar/gi,
          /⚠️.*migrado.*requiere.*implementación/gi,
          /legacy.*handler/gi,
          /old.handlers/gi,
        ];

        legacyPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            referencesFound += matches.length;
            const relativePath = path.relative(this.projectRoot, file);
            this.warnings.push(
              `Referencias legacy en ${relativePath}: ${matches.length} encontradas`
            );
          }
        });
      });

      if (referencesFound === 0) {
        console.log("  ✅ No se encontraron referencias legacy");
        this.successes.push("Código limpio de referencias legacy");
      } else {
        console.log(`  ⚠️  ${referencesFound} referencias legacy encontradas`);
      }
    }

    console.log("");
  }

  async checkConfiguration() {
    console.log("⚙️ Verificando configuración...");

    const envPath = path.join(this.projectRoot, "whatsapp-chatbot/.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");

      // Verificar configuraciones específicas
      const checks = [
        {
          pattern: /USE_LEGACY_SYSTEM=true/g,
          shouldExist: false,
          message: "USE_LEGACY_SYSTEM aún habilitado",
        },
        {
          pattern: /MIGRATION_MODE=gradual/g,
          shouldExist: false,
          message: "MIGRATION_MODE aún en modo gradual",
        },
        {
          pattern: /USE_NEW_COMMANDS=false/g,
          shouldExist: false,
          message: "USE_NEW_COMMANDS deshabilitado",
        },
        {
          pattern: /USE_NEW_COMMANDS=true/g,
          shouldExist: true,
          message: "Nuevo sistema de comandos habilitado",
        },
        {
          pattern: /MIGRATION_MODE=complete/g,
          shouldExist: true,
          message: "Modo de migración completado",
        },
      ];

      checks.forEach((check) => {
        const found = content.match(check.pattern);
        if (check.shouldExist && found) {
          console.log(`  ✅ ${check.message}`);
          this.successes.push(check.message);
        } else if (!check.shouldExist && found) {
          console.log(`  ❌ ${check.message}`);
          this.errors.push(check.message);
        } else if (check.shouldExist && !found) {
          console.log(`  ⚠️  ${check.message} - No encontrado`);
          this.warnings.push(check.message + " - No configurado");
        } else {
          console.log(`  ✅ ${check.message} - Corregido`);
          this.successes.push(check.message + " - Corregido");
        }
      });
    } else {
      this.warnings.push("Archivo .env no encontrado");
      console.log("  ⚠️  Archivo .env no encontrado");
    }

    console.log("");
  }

  async checkCommandsLoading() {
    console.log("🔧 Verificando carga de comandos migrados...");

    try {
      const commandsPath = path.join(
        this.projectRoot,
        "whatsapp-chatbot/src/bot/commands"
      );
      const categories = ["basic", "user", "system", "admin"];

      let totalCommands = 0;
      let workingCommands = 0;

      categories.forEach((category) => {
        const categoryPath = path.join(commandsPath, category);
        if (fs.existsSync(categoryPath)) {
          const files = fs
            .readdirSync(categoryPath)
            .filter((f) => f.endsWith(".js"));
          totalCommands += files.length;

          files.forEach((file) => {
            try {
              const CommandClass = require(path.join(categoryPath, file));
              const instance = new CommandClass();

              // Verificar propiedades básicas
              if (instance.name && instance.execute && instance.executeNew) {
                workingCommands++;
                console.log(`  ✅ ${category}/${instance.name} - Funcional`);
              } else {
                console.log(
                  `  ⚠️  ${category}/${file} - Propiedades incompletas`
                );
              }
            } catch (error) {
              console.log(
                `  ❌ ${category}/${file} - Error: ${error.message.slice(
                  0,
                  50
                )}...`
              );
            }
          });
        }
      });

      console.log(
        `  📊 Comandos funcionales: ${workingCommands}/${totalCommands}`
      );

      if (workingCommands >= 5) {
        this.successes.push(
          `${workingCommands} comandos migrados funcionando correctamente`
        );
      } else {
        this.errors.push(
          `Solo ${workingCommands} comandos funcionando, se requieren al menos 5`
        );
      }
    } catch (error) {
      this.errors.push(`Error verificando comandos: ${error.message}`);
      console.log(`  ❌ Error verificando comandos: ${error.message}`);
    }

    console.log("");
  }

  async checkMigrationProgress() {
    console.log("📊 Verificando progreso final de migración...");

    try {
      // Simular verificación de progreso
      const expectedCommands = ["help", "info", "ping", "migration", "status"];
      let foundCommands = 0;

      expectedCommands.forEach((cmdName) => {
        // Buscar en todas las categorías
        const categories = ["basic", "user", "system", "admin"];
        let found = false;

        categories.forEach((category) => {
          const categoryPath = path.join(
            this.projectRoot,
            "whatsapp-chatbot/src/bot/commands",
            category
          );
          if (fs.existsSync(categoryPath)) {
            const files = fs
              .readdirSync(categoryPath)
              .filter((f) => f.endsWith(".js"));

            files.forEach((file) => {
              try {
                const CommandClass = require(path.join(categoryPath, file));
                const instance = new CommandClass();

                if (instance.name === cmdName) {
                  found = true;
                  foundCommands++;
                }
              } catch (error) {
                // Ignorar errores de carga para este check
              }
            });
          }
        });

        if (found) {
          console.log(`  ✅ Comando ${cmdName} - Migrado`);
        } else {
          console.log(`  ❌ Comando ${cmdName} - No encontrado`);
        }
      });

      const progress = (foundCommands / expectedCommands.length) * 100;
      console.log(`  📈 Progreso: ${progress.toFixed(1)}%`);

      if (progress >= 80) {
        this.successes.push(
          `Migración completada exitosamente (${progress.toFixed(1)}%)`
        );
      } else {
        this.warnings.push(`Migración parcial (${progress.toFixed(1)}%)`);
      }
    } catch (error) {
      this.errors.push(`Error verificando progreso: ${error.message}`);
    }

    console.log("");
  }

  getAllJSFiles(dir) {
    let files = [];

    try {
      const items = fs.readdirSync(dir);

      items.forEach((item) => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          files = files.concat(this.getAllJSFiles(fullPath));
        } else if (item.endsWith(".js")) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      // Ignorar errores de acceso a directorios
    }

    return files;
  }

  generateReport() {
    console.log("📋 REPORTE DE VERIFICACIÓN POST-LIMPIEZA");
    console.log("==========================================\n");

    console.log("📊 RESUMEN:");
    console.log(`• Elementos exitosos: ${this.successes.length}`);
    console.log(`• Advertencias: ${this.warnings.length}`);
    console.log(`• Errores críticos: ${this.errors.length}\n`);

    if (this.successes.length > 0) {
      console.log("✅ ELEMENTOS EXITOSOS:");
      this.successes.forEach((success) => {
        console.log(`  • ${success}`);
      });
      console.log("");
    }

    if (this.warnings.length > 0) {
      console.log("⚠️  ADVERTENCIAS:");
      this.warnings.forEach((warning) => {
        console.log(`  • ${warning}`);
      });
      console.log("");
    }

    if (this.errors.length > 0) {
      console.log("❌ ERRORES CRÍTICOS:");
      this.errors.forEach((error) => {
        console.log(`  • ${error}`);
      });
      console.log("");
    }

    // Evaluación final
    if (this.errors.length === 0) {
      if (this.warnings.length <= 2) {
        console.log("🎉 VERIFICACIÓN EXITOSA");
        console.log("✅ La limpieza se completó correctamente");
        console.log("🚀 El sistema está listo para operar en modo modular");
      } else {
        console.log("⚠️  VERIFICACIÓN PARCIAL");
        console.log("🟡 La limpieza se completó con algunas advertencias");
        console.log("📋 Revisar las advertencias antes de continuar");
      }
    } else {
      console.log("❌ VERIFICACIÓN FALLIDA");
      console.log("🔴 Se encontraron errores críticos");
      console.log("🛠️  Revisar y corregir los errores antes de continuar");
    }

    console.log("\n✨ Verificación de limpieza completada");
  }
}

// Ejecutar verificación
if (require.main === module) {
  const verifier = new CleanupVerifier();
  verifier.verify().catch(console.error);
}

module.exports = CleanupVerifier;
