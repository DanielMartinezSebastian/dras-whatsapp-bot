/**
 * Punto de entrada principal para el sistema de comandos
 * Exporta todas las clases y instancias necesarias
 */
const Command = require("./core/Command");
const commandRegistry = require("./core/CommandRegistry");
const unifiedCommandHandler = require("./core/UnifiedCommandHandler");

module.exports = {
  Command,
  commandRegistry,
  unifiedCommandHandler,
};
