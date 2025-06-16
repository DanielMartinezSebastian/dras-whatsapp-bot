#!/usr/bin/env node

/**
 * Script de validación para la migración de handlers
 * Verifica configuración JSON y estructura de handlers migrados
 */

const fs = require("fs");
const path = require("path");

// Colores para console
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateJsonFile(filePath, requiredSections = []) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`❌ Archivo no encontrado: ${filePath}`, "red");
      return false;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);

    log(`✅ JSON válido: ${path.basename(filePath)}`, "green");

    // Verificar secciones requeridas
    for (const section of requiredSections) {
      const keys = section.split(".");
      let current = data;
      let found = true;

      for (const key of keys) {
        if (!current || !current[key]) {
          found = false;
          break;
        }
        current = current[key];
      }

      if (found) {
        log(`  ✓ Sección encontrada: ${section}`, "blue");
      } else {
        log(`  ❌ Sección faltante: ${section}`, "red");
        return false;
      }
    }

    return true;
  } catch (error) {
    log(`❌ Error en JSON ${filePath}: ${error.message}`, "red");
    return false;
  }
}

function validateHandlerFile(filePath, requiredMethods = []) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`❌ Handler no encontrado: ${filePath}`, "red");
      return false;
    }

    const content = fs.readFileSync(filePath, "utf8");

    // Verificar que contiene ConfigurationService
    if (!content.includes("ConfigurationService")) {
      log(
        `❌ Handler no usa ConfigurationService: ${path.basename(filePath)}`,
        "red"
      );
      return false;
    }

    log(`✅ Handler migrado: ${path.basename(filePath)}`, "green");

    // Verificar métodos requeridos
    for (const method of requiredMethods) {
      if (content.includes(method)) {
        log(`  ✓ Método encontrado: ${method}`, "blue");
      } else {
        log(`  ❌ Método faltante: ${method}`, "red");
        return false;
      }
    }

    // Verificar que no hay loadResponses() hardcodeado
    if (content.includes("loadResponses()")) {
      log(
        `  ⚠️  Advertencia: Posible método loadResponses() hardcodeado`,
        "yellow"
      );
    }

    return true;
  } catch (error) {
    log(`❌ Error validando handler ${filePath}: ${error.message}`, "red");
    return false;
  }
}

function main() {
  log("🔍 Iniciando validación de migración...", "bright");
  log("=".repeat(50), "blue");

  const configDir = "./src/config/default";
  const handlersDir = "./src/bot/handlers";

  let totalTests = 0;
  let passedTests = 0;

  // Validar archivos de configuración JSON
  log("\n📁 Validando archivos de configuración:", "bright");

  const configValidations = [
    {
      file: path.join(configDir, "responses.json"),
      sections: [
        "contextual.greeting_new",
        "contextual.help_request",
        "contextual.help_prompt",
        "registration.name_request",
      ],
    },
    {
      file: path.join(configDir, "admin-responses.json"),
      sections: ["panel.header", "sudo.usage", "permissions.denied"],
    },
    {
      file: path.join(configDir, "errors.json"),
      sections: ["general.general_processing", "validation.required_field"],
    },
    {
      file: path.join(configDir, "messages.json"),
      sections: [
        "greetings.new",
        "farewells.general",
        "registration.welcome.new_user",
        "registration.completion.success",
        "registration.errors.start_error",
        "registration.errors.processing_error",
        "registration.errors.general",
        "registration.status.started",
      ],
    },
    {
      file: path.join(configDir, "commands.json"),
      sections: [
        "errors.command_extraction_error",
        "ping.description",
        "ping.response_template",
        "info.description",
        "info.response.title",
        "info.system_info.version",
        "info.error_message",
        "status.description",
        "status.response.title",
        "status.status_indicators.active",
        "status.error_message",
        "help.description",
        "help.general.title",
        "help.categories.basic.title",
        "help.error_messages.command_not_found",
      ],
    },
  ];

  for (const validation of configValidations) {
    totalTests++;
    if (validateJsonFile(validation.file, validation.sections)) {
      passedTests++;
    }
  }

  // Validar handlers migrados
  log("\n🔧 Validando handlers migrados:", "bright");

  const handlerValidations = [
    {
      file: path.join(handlersDir, "AdminMessageHandler.migrated.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join(handlersDir, "ContextualMessageHandler.ts"),
      methods: [
        "getConfigMessage",
        "replaceVariables",
        "getValueByPath",
        "getRandomResponse",
      ],
    },
    {
      file: path.join(handlersDir, "CommandMessageHandler.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join(handlersDir, "RegistrationMessageHandler.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
  ];

  for (const validation of handlerValidations) {
    totalTests++;
    if (validateHandlerFile(validation.file, validation.methods)) {
      passedTests++;
    }
  }

  // Validar comandos migrados
  log("\n🎯 Validando comandos migrados:", "bright");

  const commandValidations = [
    {
      file: path.join("./src/bot/commands/basic", "PingCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/basic", "InfoCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/basic", "StatusCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/basic", "HelpCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/user", "ProfileCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/user", "PermissionsCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/system", "StatsCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/system", "LogsCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/admin", "UsersCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/admin", "AdminPanelCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/admin", "ConfigCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/admin", "DiagnosticCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
    {
      file: path.join("./src/bot/commands/admin", "AdminSystemCommand.ts"),
      methods: ["getConfigMessage", "replaceVariables", "getValueByPath"],
    },
  ];

  for (const validation of commandValidations) {
    totalTests++;
    if (validateHandlerFile(validation.file, validation.methods)) {
      passedTests++;
    }
  }

  // Verificar constructor signatures (análisis básico)
  log("\n🔨 Validando signatures de constructores:", "bright");

  const handlersToCheck = [
    {
      file: path.join(handlersDir, "ContextualMessageHandler.ts"),
      expectedParams: ["botProcessor", "configService"],
    },
  ];

  for (const handler of handlersToCheck) {
    totalTests++;
    try {
      const content = fs.readFileSync(handler.file, "utf8");
      const constructorMatch = content.match(/constructor\s*\([^)]+\)/);

      if (constructorMatch) {
        const constructorSignature = constructorMatch[0];
        let allParamsFound = true;

        for (const param of handler.expectedParams) {
          if (!constructorSignature.includes(param)) {
            log(`  ❌ Parámetro faltante en constructor: ${param}`, "red");
            allParamsFound = false;
          }
        }

        if (allParamsFound) {
          log(
            `  ✅ Constructor de ${path.basename(handler.file)} actualizado`,
            "green"
          );
          passedTests++;
        }
      } else {
        log(
          `  ❌ No se pudo analizar constructor de ${path.basename(
            handler.file
          )}`,
          "red"
        );
      }
    } catch (error) {
      log(`  ❌ Error analizando ${handler.file}: ${error.message}`, "red");
    }
  }

  // Resultado final
  log("\n" + "=".repeat(50), "blue");
  log(`\n📊 Resultados de validación:`, "bright");
  log(`Tests ejecutados: ${totalTests}`);
  log(
    `Tests pasados: ${passedTests}`,
    passedTests === totalTests ? "green" : "yellow"
  );
  log(
    `Tests fallidos: ${totalTests - passedTests}`,
    totalTests - passedTests === 0 ? "green" : "red"
  );

  const percentage = Math.round((passedTests / totalTests) * 100);
  log(
    `\nPorcentaje de éxito: ${percentage}%`,
    percentage === 100 ? "green" : percentage >= 80 ? "yellow" : "red"
  );

  if (percentage === 100) {
    log("\n🎉 ¡Migración validada exitosamente!", "green");
    log("Los handlers están listos para integración.", "green");
  } else if (percentage >= 80) {
    log("\n⚠️  Migración mayormente completa con advertencias", "yellow");
    log("Revisa los elementos marcados arriba.", "yellow");
  } else {
    log("\n❌ La migración necesita correcciones", "red");
    log("Revisa y corrige los errores antes de continuar.", "red");
  }

  process.exit(percentage === 100 ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateJsonFile, validateHandlerFile };
