import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
  CommandCategory,
} from "../../../types/commands";

/**
 * Comando help - Sistema de ayuda del bot
 * Muestra comandos disponibles según el nivel de permisos del usuario
 */
export class HelpCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "help",
      aliases: ["ayuda", "h"],
      description: "Muestra ayuda del sistema y comandos disponibles",
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
      return this.createErrorResult(`Error mostrando ayuda: ${error}`);
    }
  }

  private async showGeneralHelp(context: CommandContext): Promise<string> {
    const user = context.user;
    const userRole = this.getUserRoleLevel(user?.user_type);

    let response = "🤖 **Sistema de Ayuda - drasBot**\n\n";

    // Comandos básicos (disponibles para todos)
    response += "📋 **Comandos Básicos:**\n";
    response += "• `!help` - Muestra esta ayuda\n";
    response += "• `!info` - Información del bot\n";
    response += "• `!ping` - Test de conexión\n";
    response += "• `!status` - Estado del sistema\n\n";

    // Comandos de usuario (role >= 2)
    if (userRole >= 2) {
      response += "👤 **Comandos de Usuario:**\n";
      response += "• `!profile` - Ver tu perfil\n";
      response += "• `!usertype` - Ver tu tipo de usuario\n";
      response += "• `!permissions` - Ver tus permisos\n\n";
    }

    // Comandos de sistema (role >= 3)
    if (userRole >= 3) {
      response += "⚙️ **Comandos de Sistema:**\n";
      response += "• `!stats` - Estadísticas del bot\n";
      response += "• `!export` - Exportar datos\n";
      response += "• `!logs` - Ver logs del sistema\n\n";
    }

    // Comandos administrativos (role >= 4)
    if (userRole >= 4) {
      response += "🔧 **Comandos Administrativos:**\n";
      response += "• `!admin` - Panel administrativo\n";
      response += "• `!users` - Gestionar usuarios\n";
      response += "• `!block` / `!unblock` - Bloquear usuarios\n";
      response += "• `!migration` - Dashboard de migración\n\n";
    }

    response +=
      "💡 **Uso:** Usa `!help <comando>` para información detallada\n";
    response += "📞 **Soporte:** Contacta al administrador si necesitas ayuda";

    return response;
  }

  private getUserRoleLevel(userType?: string): number {
    const roleLevels: Record<string, number> = {
      block: 0,
      customer: 1,
      friend: 2,
      familiar: 2,
      employee: 3,
      provider: 3,
      admin: 4,
    };

    return roleLevels[userType || "customer"] || 1;
  }

  private async showCommandHelp(
    commandName: string,
    context: CommandContext
  ): Promise<string> {
    // Normalizar nombre del comando
    const normalizedName = commandName.replace(/^[!\/]/, "").toLowerCase();

    // Mapeo de comandos conocidos con información detallada
    const commandsInfo: Record<
      string,
      {
        name: string;
        description: string;
        syntax: string;
        examples: string[];
        notes: string;
      }
    > = {
      help: {
        name: "help",
        description: "Sistema de ayuda del bot",
        syntax: "!help [comando]",
        examples: ["!help", "!help info", "!help admin"],
        notes: "Muestra comandos disponibles según tu nivel de permisos",
      },
      info: {
        name: "info",
        description: "Información general del bot",
        syntax: "!info",
        examples: ["!info"],
        notes: "Muestra versión, estado y estadísticas básicas",
      },
      ping: {
        name: "ping",
        description: "Test de conexión y latencia",
        syntax: "!ping",
        examples: ["!ping"],
        notes: "Útil para verificar si el bot responde correctamente",
      },
      status: {
        name: "status",
        description: "Estado actual del sistema",
        syntax: "!status",
        examples: ["!status"],
        notes: "Muestra estado de servicios y tiempo de actividad",
      },
      profile: {
        name: "profile",
        description: "Ver información de tu perfil",
        syntax: "!profile",
        examples: ["!profile"],
        notes: "Requiere estar registrado en el sistema",
      },
      admin: {
        name: "admin",
        description: "Panel de administración",
        syntax: "!admin [acción]",
        examples: ["!admin", "!admin users", "!admin stats"],
        notes: "Solo disponible para administradores",
      },
    };

    const cmdInfo = commandsInfo[normalizedName];

    if (!cmdInfo) {
      return (
        `❌ **Comando no encontrado:** \`${commandName}\`\n\n` +
        `💡 Usa \`!help\` para ver todos los comandos disponibles.`
      );
    }

    let response = `🔧 **Ayuda: !${cmdInfo.name}**\n\n`;
    response += `📝 **Descripción:** ${cmdInfo.description}\n`;
    response += `⌨️ **Sintaxis:** \`${cmdInfo.syntax}\`\n\n`;

    if (cmdInfo.examples && cmdInfo.examples.length > 0) {
      response += `💡 **Ejemplos:**\n`;
      cmdInfo.examples.forEach((example) => {
        response += `• \`${example}\`\n`;
      });
      response += "\n";
    }

    if (cmdInfo.notes) {
      response += `📋 **Notas:** ${cmdInfo.notes}`;
    }

    return response;
  }
}
