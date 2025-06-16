/**
 * Comando de ayuda que muestra información sobre comandos disponibles
 */
const Command = require("../core/Command");
const commandRegistry = require("../core/CommandRegistry");

class HelpCommand extends Command {
  get name() {
    return "help";
  }
  get description() {
    return "Muestra información sobre los comandos disponibles";
  }
  get syntax() {
    return "!help [comando]";
  }
  get aliases() {
    return ["ayuda", "?"];
  }
  get category() {
    return "general";
  }

  async execute(message, args, bot) {
    try {
      // Si no hay argumentos, mostrar lista de comandos
      if (!args.length) {
        return this.showCommandList(message);
      }

      // Mostrar ayuda para un comando específico
      const commandName = args[0].toLowerCase();
      const command = commandRegistry.get(commandName);

      if (!command) {
        return message.reply(
          this.formatResponse(`El comando "${commandName}" no existe.`, "error")
        );
      }

      const helpText = this.createCommandHelp(command);
      return message.reply(helpText);
    } catch (error) {
      console.error("Error en comando help:", error);
      return message.reply(
        this.formatResponse("Error al procesar el comando de ayuda.", "error")
      );
    }
  }

  async showCommandList(message) {
    const categories = commandRegistry.getCategories();

    let response = "*📋 Lista de Comandos Disponibles*\n\n";

    if (categories.length === 0) {
      response += "No hay comandos disponibles en este momento.";
      return message.reply(response);
    }

    for (const category of categories) {
      const commands = commandRegistry.getByCategory(category);

      // Por ahora, mostrar todos los comandos (sin verificación de permisos aquí)
      const allowedCommands = commands.filter((cmd) => {
        // Mostrar solo comandos que no requieren permisos especiales
        return !cmd.permissions || cmd.permissions.includes("user");
      });

      if (allowedCommands.length > 0) {
        response += `*${this.formatCategory(category)}*\n`;

        for (const cmd of allowedCommands) {
          response += `• *${cmd.name}* - ${cmd.description}\n`;
        }

        response += "\n";
      }
    }

    response += "Para ver detalles de un comando: !help [comando]";

    return message.reply(response);
  }

  createCommandHelp(command) {
    let help = `*📝 Ayuda: ${command.name}*\n\n`;
    help += `*Descripción:* ${command.description}\n`;
    help += `*Uso:* ${command.syntax}\n`;

    if (command.aliases && command.aliases.length) {
      help += `*Aliases:* ${command.aliases.join(", ")}\n`;
    }

    if (
      command.permissions &&
      command.permissions.length &&
      !command.permissions.includes("user")
    ) {
      help += `*Permisos requeridos:* ${command.permissions.join(", ")}\n`;
    }

    if (command.cooldown && command.cooldown > 0) {
      help += `*Tiempo de espera:* ${command.cooldown} segundos\n`;
    }

    help += `*Categoría:* ${this.formatCategory(command.category)}`;

    return help;
  }

  formatCategory(category) {
    // Convertir primera letra a mayúscula
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

module.exports = HelpCommand;
