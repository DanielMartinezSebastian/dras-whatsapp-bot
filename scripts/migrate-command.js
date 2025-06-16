const fs = require("fs");
const path = require("path");

class CommandMigrator {
  constructor() {
    this.legacyPath = path.join(
      __dirname,
      "../whatsapp-chatbot/backup/old-handlers-20250613-210515"
    );
    this.newPath = path.join(__dirname, "../whatsapp-chatbot/src/bot/commands");
  }

  async migrateCommand(commandName, category = "general") {
    console.log(`🚀 Migrando comando: ${commandName}`);

    // 1. Extraer lógica legacy
    const legacyLogic = await this.extractLegacyLogic(commandName);

    // 2. Generar nuevo comando
    const newCommandCode = this.generateNewCommand(
      commandName,
      category,
      legacyLogic
    );

    // 3. Escribir archivo
    const outputPath = path.join(
      this.newPath,
      category,
      `${this.capitalizeFirst(commandName)}Command.js`
    );

    // Crear directorio si no existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, newCommandCode);

    console.log(`✅ Comando migrado: ${outputPath}`);

    return {
      success: true,
      outputPath,
      commandName,
      category,
    };
  }

  async extractLegacyLogic(commandName) {
    // Buscar en archivos legacy
    if (!fs.existsSync(this.legacyPath)) {
      console.log("⚠️  Directorio legacy no encontrado");
      return null;
    }

    const files = fs
      .readdirSync(this.legacyPath)
      .filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const content = fs.readFileSync(path.join(this.legacyPath, file), "utf8");

      // Buscar métodos relacionados con el comando (varios patrones)
      const patterns = [
        new RegExp(
          `handle${this.capitalizeFirst(
            commandName
          )}[^{]*{([^}]+(?:{[^}]*}[^}]*)*)}`,
          "gi"
        ),
        new RegExp(`async\\s+handle${this.capitalizeFirst(commandName)}`, "gi"),
        new RegExp(`"/${commandName}"[^}]+`, "gi"),
        new RegExp(`'/${commandName}'[^}]+`, "gi"),
      ];

      let matches = [];
      patterns.forEach((pattern) => {
        const found = content.match(pattern);
        if (found) matches = matches.concat(found);
      });

      if (matches && matches.length > 0) {
        // Extraer también información de permisos y descripción
        const permissionMatch = content.match(
          new RegExp(`"/${commandName}"[^}]*requiredRole[^,]*([0-9]+)`, "i")
        );
        const descriptionMatch = content.match(
          new RegExp(`"/${commandName}"[^}]*description[^,]*"([^"]*)"`, "i")
        );

        return {
          file,
          methods: matches,
          rawContent: content,
          permissions: permissionMatch ? permissionMatch[1] : "2",
          description: descriptionMatch
            ? descriptionMatch[1]
            : `Comando ${commandName} migrado`,
        };
      }
    }

    return null;
  }

  generateNewCommand(commandName, category, legacyLogic) {
    const className = this.capitalizeFirst(commandName) + "Command";
    const description =
      legacyLogic?.description || `Comando ${commandName} migrado`;
    const requiredRole = legacyLogic?.permissions || "2";

    return `const EnhancedCommand = require("../core/EnhancedCommand");
const { logInfo, logError } = require("../../../utils/logger");

/**
 * Comando ${commandName} migrado desde sistema legacy
 * Fecha de migración: ${new Date().toISOString()}
 * ${legacyLogic ? `Origen: ${legacyLogic.file}` : "Comando nuevo"}
 */
class ${className} extends EnhancedCommand {
  constructor() {
    super();
    this.name = "${commandName}";
    this.aliases = []; // TODO: Definir aliases desde legacy
    this.description = "${description}";
    this.syntax = "!${commandName} [args]"; // TODO: Definir sintaxis correcta
    this.category = "${category}";
    this.requiredRole = ${requiredRole};
  }

  async executeNew(message, args, context) {
    try {
      logInfo(\`Ejecutando comando migrado: \${this.name}\`, {
        sender: message.senderPhone,
        args: args
      });

      // TODO: Implementar lógica de negocio migrada
      ${
        legacyLogic
          ? this.extractBusinessLogic(legacyLogic)
          : "// Implementar funcionalidad"
      }
      
      return "⚠️ Comando migrado - Requiere implementación completa de la lógica de negocio";
      
    } catch (error) {
      logError(\`Error en comando \${this.name}:\`, error);
      throw error;
    }
  }

  // TODO: Métodos auxiliares específicos del comando
  ${legacyLogic ? this.generateHelperMethods(legacyLogic) : ""}
}

module.exports = ${className};
`;
  }

  extractBusinessLogic(legacyLogic) {
    if (!legacyLogic || !legacyLogic.methods) {
      return "// No se encontró lógica legacy específica";
    }

    let logic = "// LÓGICA LEGACY EXTRAÍDA (requiere adaptación):\n";

    legacyLogic.methods.forEach((method, index) => {
      // Limpiar y comentar el código legacy
      const cleaned = method
        .replace(/async\s+/, "")
        .replace(/handle\w+/g, "")
        .replace(/\{|\}/g, "")
        .slice(0, 200);
      logic += `      // Método ${index + 1}: ${cleaned.trim()}...\n`;
    });

    return logic;
  }

  generateHelperMethods(legacyLogic) {
    return `
  /**
   * Método auxiliar extraído del sistema legacy
   * TODO: Adaptar según la nueva arquitectura
   */
  async processLegacyLogic(message, args, context) {
    // Implementar lógica específica basada en:
    // ${legacyLogic.file}
    return null;
  }`;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Migrar múltiples comandos por lotes
   */
  async migrateBatch(commands) {
    const results = [];

    for (const { name, category } of commands) {
      try {
        const result = await this.migrateCommand(name, category);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error migrando ${name}:`, error);
        results.push({
          success: false,
          commandName: name,
          error: error.message,
        });
      }
    }

    return results;
  }
}

// Script de ejecución
async function main() {
  const migrator = new CommandMigrator();

  const commands = process.argv.slice(2);

  if (commands.length === 0) {
    console.log("Uso: node migrate-command.js <comando> [categoria]");
    console.log("Ejemplo: node migrate-command.js help basic");
    console.log("\nComandos disponibles según auditoría legacy:");
    console.log("- help, info, ping, status (basic)");
    console.log("- profile, usertype, permissions (user)");
    console.log("- stats, export, logs (system)");
    console.log("- admin, users, block, unblock (admin)");
    return;
  }

  const [commandName, category = "general"] = commands;

  try {
    await migrator.migrateCommand(commandName, category);
  } catch (error) {
    console.error("❌ Error en migración:", error);
  }
}

if (require.main === module) {
  main();
}

module.exports = CommandMigrator;
