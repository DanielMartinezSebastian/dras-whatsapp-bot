import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { logInfo, logError } from "../../../utils/logger";

/**
 * Comando administrativo para gestionar la configuración del bot
 * Permite modificar textos, respuestas y configuración general en tiempo real
 */
export class ConfigCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "config",
      aliases: ["configuracion", "configurar", "settings"],
      description: "Gestiona la configuración del bot y strings de respuesta",
      syntax: "!config [accion] [parametros]",
      category: "admin",
      permissions: ["admin"],
      cooldown: 5,
      examples: [
        "!config show messages - Mostrar configuración de mensajes",
        "!config set bot.name 'Mi Bot' - Cambiar nombre del bot",
        "!config get messages.greetings.new - Obtener valor específico",
        "!config backup - Crear respaldo de configuración",
        "!config reload - Recargar configuración desde archivos",
      ],
      isAdmin: true,
      isSensitive: true,
    };
  }

  /**
   * Ejecuta el comando de configuración
   */
  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.args;

    if (args.length === 0) {
      return this.showHelp();
    }

    const action = args[0].toLowerCase();

    // Por ahora solo mostrar ayuda hasta que se integre el ConfigurationService
    return this.createSuccessResult(`🚧 **Comando Config en Desarrollo**

**Acción solicitada:** ${action}

**💡 Funcionalidades planificadas:**
• Gestión de strings de respuesta en tiempo real
• Modificación de configuración del bot
• Respaldos automáticos de configuración
• Recarga de configuración sin reinicio
• Interfaz para editar mensajes contextuales

**🔧 Estado actual:**
Este comando requiere integración con el ConfigurationService que se está desarrollando.

**📋 Para modificar configuración actualmente:**
1. Edita archivos en \`src/config/default/\`
2. Usa \`!reload\` para recargar (cuando esté disponible)
3. O reinicia el bot

**📂 Archivos de configuración:**
• \`bot-config.json\` - Configuración del bot
• \`messages.json\` - Mensajes generales
• \`responses.json\` - Respuestas contextuales
• \`commands.json\` - Textos de comandos
• \`errors.json\` - Mensajes de error
• \`system.json\` - Mensajes del sistema`);
  }

  /**
   * Muestra ayuda del comando
   */
  private showHelp(): CommandResult {
    return this.createSuccessResult(`⚙️ **Comando de Configuración**

**📋 Acciones disponibles:**
• \`show [seccion]\` - Mostrar configuración
• \`set <ruta> <valor>\` - Cambiar valor
• \`get <ruta>\` - Obtener valor
• \`backup\` - Crear respaldo
• \`reload\` - Recargar desde archivos
• \`export [formato]\` - Exportar configuración
• \`strings <accion>\` - Gestionar strings
• \`messages\` - Ver categorías de mensajes

**🎯 Ejemplos:**
• \`!config show messages\`
• \`!config set bot.name "Mi Bot"\`
• \`!config strings list\`
• \`!config backup\`

**📂 Secciones disponibles:**
• \`bot\` - Configuración del bot
• \`messages\` - Mensajes y respuestas
• \`commands\` - Textos de comandos
• \`errors\` - Mensajes de error
• \`system\` - Mensajes del sistema

� **Nota:** Funcionalidad completa en desarrollo`);
  }
}
