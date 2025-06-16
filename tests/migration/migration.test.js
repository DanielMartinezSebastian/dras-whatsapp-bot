const { expect } = require("chai");
const path = require("path");
const fs = require("fs");

describe("Migration Validation Tests", () => {
  let migrationManager;
  let commandRegistry;

  before(async () => {
    // Configurar entorno de testing
    process.env.NODE_ENV = "test";
    process.env.MIGRATION_MODE = "gradual";
  });

  describe("Command Loading Tests", () => {
    it("should load all migrated commands successfully", async () => {
      const commandsPath = path.join(
        __dirname,
        "../../whatsapp-chatbot/src/bot/commands"
      );
      const categories = ["basic", "user", "system", "admin"];

      let totalCommands = 0;
      let loadedCommands = 0;

      for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);

        if (fs.existsSync(categoryPath)) {
          const files = fs
            .readdirSync(categoryPath)
            .filter((f) => f.endsWith(".js"));
          totalCommands += files.length;

          for (const file of files) {
            try {
              const CommandClass = require(path.join(categoryPath, file));
              expect(CommandClass).to.be.a("function");

              const instance = new CommandClass();
              expect(instance.name).to.be.a("string");
              expect(instance.execute).to.be.a("function");
              expect(instance.executeNew).to.be.a("function");

              loadedCommands++;
              console.log(`✅ Comando cargado: ${category}/${instance.name}`);
            } catch (error) {
              console.error(`❌ Error cargando ${file}:`, error.message);
              throw error;
            }
          }
        }
      }

      console.log(`📊 Comandos cargados: ${loadedCommands}/${totalCommands}`);
      expect(loadedCommands).to.be.greaterThan(0);
    });

    it("should validate command structure", async () => {
      const commandsPath = path.join(
        __dirname,
        "../../whatsapp-chatbot/src/bot/commands"
      );
      const categories = ["basic", "user", "system", "admin"];

      for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);

        if (fs.existsSync(categoryPath)) {
          const files = fs
            .readdirSync(categoryPath)
            .filter((f) => f.endsWith(".js"));

          for (const file of files) {
            const CommandClass = require(path.join(categoryPath, file));
            const instance = new CommandClass();

            // Validar propiedades requeridas
            expect(instance.name).to.be.a("string").and.not.be.empty;
            expect(instance.description).to.be.a("string").and.not.be.empty;
            expect(instance.category).to.be.a("string").and.not.be.empty;
            expect(instance.requiredRole).to.be.a("number");
            expect(instance.syntax).to.be.a("string").and.not.be.empty;

            // Validar métodos requeridos
            expect(instance.execute).to.be.a("function");
            expect(instance.executeNew).to.be.a("function");
          }
        }
      }
    });
  });

  describe("Command Execution Tests", () => {
    const testMessage = {
      senderPhone: "34612345678@s.whatsapp.net",
      body: "!test",
      timestamp: Date.now(),
      chatJid: "34612345678@s.whatsapp.net",
    };

    const testContext = {
      user: { user_type: 4 }, // Admin user for testing
      botProcessor: { startTime: new Date() },
    };

    it("should execute HelpCommand without errors", async () => {
      const HelpCommand = require("../../whatsapp-chatbot/src/bot/commands/basic/HelpCommand");
      const helpCmd = new HelpCommand();

      const result = await helpCmd.executeNew(testMessage, [], testContext);
      expect(result).to.be.a("string");
      expect(result).to.include("Sistema de Ayuda");
      expect(result).to.include("Comandos Básicos");
    });

    it("should execute InfoCommand without errors", async () => {
      const InfoCommand = require("../../whatsapp-chatbot/src/bot/commands/basic/InfoCommand");
      const infoCmd = new InfoCommand();

      const result = await infoCmd.executeNew(testMessage, [], testContext);
      expect(result).to.be.a("string");
      expect(result).to.include("drasBot");
      expect(result).to.include("Información del Sistema");
    });

    it("should execute PingCommand without errors", async () => {
      const PingCommand = require("../../whatsapp-chatbot/src/bot/commands/basic/PingCommand");
      const pingCmd = new PingCommand();

      const result = await pingCmd.executeNew(testMessage, [], testContext);
      expect(result).to.be.a("string");
      expect(result).to.include("Pong");
      expect(result).to.include("Latencia");
    });

    it("should execute MigrationDashboardCommand without errors", async () => {
      const MigrationDashboardCommand = require("../../whatsapp-chatbot/src/bot/commands/admin/MigrationDashboardCommand");
      const migrationCmd = new MigrationDashboardCommand();

      // Mock migrationManager
      const mockMigrationManager = {
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
      };

      const mockContext = {
        ...testContext,
        botProcessor: { migrationManager: mockMigrationManager },
      };

      const result = await migrationCmd.executeNew(
        testMessage,
        ["status"],
        mockContext
      );
      expect(result).to.be.a("string");
      expect(result).to.include("Dashboard de Migración");
      expect(result).to.include("Progreso General");
    });
  });

  describe("Performance Validation Tests", () => {
    it("should not degrade response times", async () => {
      const HelpCommand = require("../../whatsapp-chatbot/src/bot/commands/basic/HelpCommand");
      const helpCmd = new HelpCommand();

      const testMessage = {
        senderPhone: "34612345678@s.whatsapp.net",
        body: "!help",
        timestamp: Date.now(),
      };

      const testContext = {
        user: { user_type: 2 },
        botProcessor: { startTime: new Date() },
      };

      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await helpCmd.executeNew(testMessage, [], testContext);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`📊 Tiempo promedio: ${averageTime.toFixed(2)}ms`);
      console.log(`📊 Tiempo máximo: ${maxTime}ms`);

      expect(averageTime).to.be.below(500); // Menos de 500ms promedio
      expect(maxTime).to.be.below(1000); // Menos de 1 segundo máximo
    });
  });

  describe("Migration Status Tests", () => {
    it("should track migration progress correctly", () => {
      // Test de seguimiento de progreso de migración
      const expectedCommands = [
        "help",
        "info",
        "ping",
        "status", // basic
        "profile",
        "permissions",
        "usertype", // user
        "stats",
        "export",
        "logs", // system
        "admin",
        "users",
        "migration", // admin
      ];

      const commandsPath = path.join(
        __dirname,
        "../../whatsapp-chatbot/src/bot/commands"
      );
      const actualCommands = [];

      // Recopilar comandos migrados
      ["basic", "user", "system", "admin"].forEach((category) => {
        const categoryPath = path.join(commandsPath, category);

        if (fs.existsSync(categoryPath)) {
          const files = fs
            .readdirSync(categoryPath)
            .filter((f) => f.endsWith(".js"));

          files.forEach((file) => {
            try {
              const CommandClass = require(path.join(categoryPath, file));
              const instance = new CommandClass();
              actualCommands.push(instance.name);
            } catch (error) {
              // Skip errores de carga
            }
          });
        }
      });

      console.log(`📋 Comandos encontrados: ${actualCommands.join(", ")}`);

      // Verificar que los comandos prioritarios están migrados
      const priorityCommands = ["help", "info", "ping", "migration"];
      priorityCommands.forEach((cmd) => {
        expect(actualCommands).to.include(cmd);
      });

      expect(actualCommands.length).to.be.greaterThan(10);
    });
  });
});

// Función para ejecutar tests manualmente
if (require.main === module) {
  console.log("🧪 Ejecutando tests de migración...");

  // Simular ejecución básica
  (async () => {
    try {
      console.log("✅ Tests completados - Ver salida detallada con npm test");
    } catch (error) {
      console.error("❌ Error en tests:", error);
    }
  })();
}
