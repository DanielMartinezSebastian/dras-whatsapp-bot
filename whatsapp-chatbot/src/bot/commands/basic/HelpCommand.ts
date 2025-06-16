import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandCategory,
} from "../../../types/commands";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando help - Sistema de ayuda del bot
 * Muestra comandos disponibles según el nivel de permisos del usuario
 */
export class HelpCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "help",
      aliases: ["ayuda", "h"],
      description: this.getConfigMessage(
        "help.description",
        {},
        "Muestra ayuda del sistema y comandos disponibles"
      ),
      syntax: "!help [comando]",
      category: "basic" as CommandCategory,
      permissions: ["user"],
      cooldown: 2,
      examples: ["!help", "!help info", "!help admin"],
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const args = context.args || [];
      const specificCommand = args[0];

      if (specificCommand) {
        const response = await this.showCommandHelp(specificCommand, context);
        return this.createSuccessResult(response);
      }

      const response = await this.showGeneralHelp(context);
      return this.createSuccessResult(response);
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "help.error_messages.general_error",
        { error: error instanceof Error ? error.message : String(error) },
        `Error mostrando ayuda: ${error}`
      );
      return this.createErrorResult(errorMessage);
    }
  }

  private async showGeneralHelp(context: CommandContext): Promise<string> {
    const user = context.user;
    const userRole = this.getUserRoleLevel(user?.user_type);

    // Obtener configuración de ayuda desde commands
    const config = this.configService.getConfiguration();
    const generalConfig = this.getValueByPath(config, "commands.help.general");
    const categories = this.getValueByPath(config, "commands.help.categories");

    let response =
      this.getConfigMessage(
        "help.general.title",
        {},
        "🤖 **Sistema de Ayuda - drasBot**"
      ) + "\n\n";

    // Procesar categorías según el nivel de usuario
    if (categories) {
      for (const [categoryKey, categoryData] of Object.entries(
        categories as any
      )) {
        const category = categoryData as any;

        if (category.role_required && userRole >= category.role_required) {
          response += category.title + "\n";

          if (category.commands) {
            for (const [cmdName, cmdDesc] of Object.entries(
              category.commands as any
            )) {
              response += `• \`!${cmdName}\` - ${cmdDesc}\n`;
            }
          }
          response += "\n";
        }
      }
    }

    // Footer
    const footerConfig = this.getValueByPath(
      config,
      "commands.help.general.footer"
    );
    if (footerConfig) {
      response += footerConfig.usage + "\n";
      response += footerConfig.support;
    }

    return response;
  }

  private getUserRoleLevel(userType?: string): number {
    const config = this.configService.getConfiguration();
    const roleLevels = this.getValueByPath(config, "commands.help.role_levels");

    if (roleLevels && userType) {
      return roleLevels[userType] || 1;
    }

    // Fallback hardcodeado
    const defaultRoles: Record<string, number> = {
      block: 0,
      customer: 1,
      friend: 2,
      familiar: 2,
      employee: 3,
      provider: 3,
      admin: 4,
    };

    return defaultRoles[userType || "customer"] || 1;
  }

  private async showCommandHelp(
    commandName: string,
    context: CommandContext
  ): Promise<string> {
    // Normalizar nombre del comando
    const normalizedName = commandName.replace(/^[!\/]/, "").toLowerCase();

    // Obtener información del comando desde configuración
    const config = this.configService.getConfiguration();
    const commandDetails = this.getValueByPath(
      config,
      "commands.help.command_details"
    );
    const cmdInfo = commandDetails?.[normalizedName];

    if (!cmdInfo) {
      return this.getConfigMessage(
        "help.error_messages.command_not_found",
        { commandName },
        `❌ **Comando no encontrado:** \`${commandName}\`\n\n💡 Usa \`!help\` para ver todos los comandos disponibles.`
      );
    }

    const template = this.getValueByPath(
      config,
      "commands.help.command_help_template"
    );

    let response =
      this.replaceVariables(template?.title || "🔧 **Ayuda: !{commandName}**", {
        commandName: cmdInfo.name,
      }) + "\n\n";
    response +=
      this.replaceVariables(
        template?.description || "📝 **Descripción:** {description}",
        { description: cmdInfo.description }
      ) + "\n";
    response +=
      this.replaceVariables(template?.syntax || "⌨️ **Sintaxis:** `{syntax}`", {
        syntax: cmdInfo.syntax,
      }) + "\n\n";

    if (cmdInfo.examples && cmdInfo.examples.length > 0) {
      response += (template?.examples_title || "💡 **Ejemplos:**") + "\n";
      cmdInfo.examples.forEach((example: string) => {
        response += `• \`${example}\`\n`;
      });
      response += "\n";
    }

    if (cmdInfo.notes) {
      response += this.replaceVariables(
        template?.notes || "📋 **Notas:** {notes}",
        { notes: cmdInfo.notes }
      );
    }

    return response;
  }

  /**
   * Obtiene un mensaje de configuración con variables reemplazadas
   */
  private getConfigMessage(
    path: string,
    variables?: Record<string, any>,
    fallback?: string
  ): string {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        return fallback || "Configuración no disponible";
      }

      // Obtener mensaje desde commands
      let message = this.getValueByPath(config, `commands.${path}`);

      // Si aún no se encuentra, usar fallback
      if (!message) {
        return fallback || `Mensaje no configurado: ${path}`;
      }

      // Si es un array, tomar un elemento aleatorio
      if (Array.isArray(message)) {
        message = message[Math.floor(Math.random() * message.length)];
      }

      // Reemplazar variables si se proporcionan
      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables);
      }

      return message;
    } catch (error) {
      console.error(
        `Error obteniendo mensaje configurado para ${path}: ${
          error instanceof Error ? error.message : error
        }`
      );
      return fallback || "Error en configuración";
    }
  }

  /**
   * Reemplaza variables en un template de mensaje
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any> = {}
  ): string {
    if (typeof template !== "string") {
      return String(template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(value));
    }
    return result;
  }

  /**
   * Obtiene una ruta de configuración por path anidado
   */
  private getValueByPath(obj: any, path?: string): any {
    if (!path) {
      const config = this.configService.getConfiguration();
      return config;
    }
    const config = this.configService.getConfiguration();
    return path
      .split(".")
      .reduce((current, key) => current?.[key], config as any);
  }
}
