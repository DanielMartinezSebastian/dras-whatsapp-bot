import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { logInfo, logError } from "../../../utils/logger";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando administrativo para gestionar la configuración del bot
 * Permite modificar textos, respuestas y configuración general en tiempo real
 */
export class ConfigCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "config",
      aliases: ["configuracion", "configurar", "settings"],
      description: this.getConfigMessage(
        "config.description",
        {},
        "Gestiona la configuración del bot y strings de respuesta"
      ),
      syntax: this.getConfigMessage("config.syntax", {}, "!config [accion] [parametros]"),
      category: "admin",
      permissions: ["admin"],
      cooldown: 5,
      examples: [
        this.getConfigMessage("config.examples.show", {}, "!config show messages - Mostrar configuración de mensajes"),
        this.getConfigMessage("config.examples.set", {}, "!config set bot.name 'Mi Bot' - Cambiar nombre del bot"),
        this.getConfigMessage("config.examples.get", {}, "!config get messages.greetings.new - Obtener valor específico"),
        this.getConfigMessage("config.examples.backup", {}, "!config backup - Crear respaldo de configuración"),
        this.getConfigMessage("config.examples.reload", {}, "!config reload - Recargar configuración desde archivos"),
      ],
      isAdmin: true,
      isSensitive: true,
    };
  }

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

      let message = this.getValueByPath(config, `commands.${path}`);

      if (!message) {
        return fallback || `Mensaje no configurado: ${path}`;
      }

      if (Array.isArray(message)) {
        message = message[Math.floor(Math.random() * message.length)];
      }

      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables);
      }

      return message;
    } catch (error) {
      console.error(`Error obteniendo mensaje: ${error}`);
      return fallback || "Error en configuración";
    }
  }

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

  async execute(context: CommandContext): Promise<CommandResult> {
    const args = context.args;

    if (args.length === 0) {
      return this.showHelp();
    }

    const action = args[0].toLowerCase();

    try {
      switch (action) {
        case "show":
        case "mostrar":
          return this.showConfiguration(args.slice(1));
        case "get":
        case "obtener":
          return this.getValue(args.slice(1));
        case "set":
        case "establecer":
          return this.setValue(args.slice(1));
        case "backup":
        case "respaldo":
          return this.createBackup();
        case "reload":
        case "recargar":
          return this.reloadConfiguration();
        case "export":
        case "exportar":
          return this.exportConfiguration(args.slice(1));
        case "strings":
          return this.manageStrings(args.slice(1));
        case "messages":
        case "mensajes":
          return this.showMessageCategories();
        case "help":
        case "ayuda":
        default:
          return this.showHelp();
      }
    } catch (error) {
      logError(`Error ejecutando ConfigCommand: ${error instanceof Error ? error.message : error}`);
      return this.createErrorResult(
        this.getConfigMessage(
          "config.errors.execution",
          { error: error instanceof Error ? error.message : "Error desconocido" },
          `❌ Error ejecutando comando: ${error instanceof Error ? error.message : "Error desconocido"}`
        )
      );
    }
  }

  private showConfiguration(args: string[]): CommandResult {
    const section = args[0];
    
    if (!section) {
      return this.createSuccessResult(
        this.getConfigMessage(
          "config.show.general",
          {},
          `⚙️ **Configuración del Bot**

**📂 Secciones disponibles:**
• \`bot\` - Configuración general del bot
• \`messages\` - Mensajes y respuestas
• \`commands\` - Textos de comandos
• \`errors\` - Mensajes de error
• \`system\` - Mensajes del sistema
• \`responses\` - Respuestas contextuales

**💡 Uso:**
\`!config show [seccion]\` para ver detalles específicos`
        )
      );
    }

    const sectionData = this.getValueByPath(null, section);
    
    if (!sectionData) {
      return this.createErrorResult(
        this.getConfigMessage(
          "config.errors.section_not_found",
          { section },
          `❌ Sección no encontrada: ${section}`
        )
      );
    }

    const formattedSection = this.formatSectionData(section, sectionData);
    
    return this.createSuccessResult(
      this.getConfigMessage(
        "config.show.section",
        { section, data: formattedSection },
        `⚙️ **Configuración: ${section}**

${formattedSection}`
      )
    );
  }

  private getValue(args: string[]): CommandResult {
    if (args.length === 0) {
      return this.createErrorResult(
        this.getConfigMessage(
          "config.errors.missing_path",
          {},
          "❌ Especifica la ruta del valor a obtener"
        )
      );
    }

    const path = args[0];
    const value = this.getValueByPath(null, path);

    if (value === undefined) {
      return this.createErrorResult(
        this.getConfigMessage(
          "config.errors.path_not_found",
          { path },
          `❌ Ruta no encontrada: ${path}`
        )
      );
    }

    const formattedValue = typeof value === "object" 
      ? JSON.stringify(value, null, 2) 
      : String(value);

    return this.createSuccessResult(
      this.getConfigMessage(
        "config.get.success",
        { path, value: formattedValue },
        `📋 **${path}:**
\`\`\`
${formattedValue}
\`\`\``
      )
    );
  }

  private setValue(args: string[]): CommandResult {
    if (args.length < 2) {
      return this.createErrorResult(
        this.getConfigMessage(
          "config.errors.missing_set_params",
          {},
          "❌ Especifica la ruta y el valor: !config set <ruta> <valor>"
        )
      );
    }

    const path = args[0];
    const value = args.slice(1).join(" ");

    return this.createSuccessResult(
      this.getConfigMessage(
        "config.set.simulated",
        { path, value },
        `�� **Modificación simulada**

**Ruta:** ${path}
**Valor:** ${value}

⚠️ La funcionalidad de escritura está en desarrollo`
      )
    );
  }

  private createBackup(): CommandResult {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    return this.createSuccessResult(
      this.getConfigMessage(
        "config.backup.simulated",
        { timestamp },
        `💾 **Respaldo simulado**

**Timestamp:** ${timestamp}

🚧 La funcionalidad de respaldo está en desarrollo`
      )
    );
  }

  private reloadConfiguration(): CommandResult {
    try {
      if (this.configService && typeof this.configService.reloadConfiguration === 'function') {
        this.configService.reloadConfiguration();
        return this.createSuccessResult(
          this.getConfigMessage(
            "config.reload.success",
            {},
            "✅ Configuración recargada exitosamente"
          )
        );
      } else {
        return this.createSuccessResult(
          this.getConfigMessage(
            "config.reload.simulated",
            {},
            "🚧 **Recarga simulada**

⚠️ La funcionalidad de recarga está en desarrollo"
          )
        );
      }
    } catch (error) {
      return this.createErrorResult(
        this.getConfigMessage(
          "config.errors.reload_failed",
          { error: error instanceof Error ? error.message : "Error desconocido" },
          `❌ Error recargando configuración: ${error instanceof Error ? error.message : "Error desconocido"}`
        )
      );
    }
  }

  private exportConfiguration(args: string[]): CommandResult {
    const format = args[0] || "json";
    
    return this.createSuccessResult(
      this.getConfigMessage(
        "config.export.simulated",
        { format },
        `📤 **Exportación simulada**

**Formato:** ${format}

🚧 La funcionalidad de exportación está en desarrollo`
      )
    );
  }

  private manageStrings(args: string[]): CommandResult {
    const action = args[0] || "list";
    
    return this.createSuccessResult(
      this.getConfigMessage(
        "config.strings.simulated",
        { action },
        `🔤 **Gestión de Strings: ${action}**

🚧 La gestión de strings está en desarrollo`
      )
    );
  }

  private showMessageCategories(): CommandResult {
    const config = this.configService.getConfiguration();
    const categories = Object.keys(config?.messages || {});
    
    const categoriesList = categories.length > 0 
      ? categories.map(cat => `• \`${cat}\``).join("\n")
      : "No hay categorías disponibles";

    return this.createSuccessResult(
      this.getConfigMessage(
        "config.messages.categories",
        { categories: categoriesList },
        `📝 **Categorías de Mensajes**

${categoriesList}`
      )
    );
  }

  private formatSectionData(section: string, data: any, maxDepth = 2, currentDepth = 0): string {
    if (currentDepth >= maxDepth) {
      return typeof data === "object" ? "[Objeto anidado...]" : String(data);
    }

    if (Array.isArray(data)) {
      if (data.length <= 5) {
        return data.map(item => `• ${this.formatSectionData(section, item, maxDepth, currentDepth + 1)}`).join("\n");
      } else {
        return `Array con ${data.length} elementos (use 'get' para ver específicos)`;
      }
    }

    if (typeof data === "object" && data !== null) {
      const keys = Object.keys(data);
      if (keys.length <= 10) {
        return keys.map(key => {
          const value = this.formatSectionData(section, data[key], maxDepth, currentDepth + 1);
          return `**${key}:** ${value}`;
        }).join("\n");
      } else {
        return `Objeto con ${keys.length} propiedades: ${keys.slice(0, 5).join(", ")}...`;
      }
    }

    return String(data);
  }

  private showHelp(): CommandResult {
    return this.createSuccessResult(
      this.getConfigMessage(
        "config.help",
        {},
        `⚙️ **Comando de Configuración**

**📋 Acciones disponibles:**
• \`show [seccion]\` - Mostrar configuración
• \`set <ruta> <valor>\` - Cambiar valor
• \`get <ruta>\` - Obtener valor específico
• \`backup\` - Crear respaldo
• \`reload\` - Recargar desde archivos
• \`export [formato]\` - Exportar configuración
• \`strings <accion>\` - Gestionar strings
• \`messages\` - Ver categorías de mensajes

**🎯 Ejemplos:**
• \`!config show messages\`
• \`!config get bot.name\`
• \`!config set bot.name "Mi Bot"\`
• \`!config backup\`
• \`!config reload\`

**📂 Secciones disponibles:**
• \`bot\` - Configuración del bot
• \`messages\` - Mensajes y respuestas
• \`commands\` - Textos de comandos
• \`errors\` - Mensajes de error
• \`system\` - Mensajes del sistema
• \`responses\` - Respuestas contextuales

🔧 **Gestión avanzada de configuración**`
      )
    );
  }
}
