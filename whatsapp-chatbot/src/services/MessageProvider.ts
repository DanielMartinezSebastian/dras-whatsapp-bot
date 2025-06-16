import { configurationService } from "./ConfigurationService";
import { logInfo, logError, logWarning } from "../utils/logger";
import {
  MessageTemplates,
  TemplateReplacements,
  TimeOfDay,
  MessageProviderConfig,
} from "../types/configuration";

/**
 * Proveedor centralizado de mensajes del bot
 * Utiliza plantillas configurables con reemplazo de variables
 */
export class MessageProvider {
  private config: MessageProviderConfig;
  private messageCache: Map<string, string[]> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<MessageProviderConfig>) {
    this.config = {
      defaultLanguage: "es",
      fallbackToDefault: true,
      cacheMessages: true,
      reloadOnChange: true,
      validationEnabled: true,
      ...config,
    };
  }

  /**
   * Inicializa el proveedor de mensajes
   */
  public async initialize(): Promise<void> {
    try {
      logInfo("💬 Inicializando MessageProvider...");

      // Esperar a que el ConfigurationService esté listo
      if (!configurationService.getConfiguration()) {
        await configurationService.initialize();
      }

      // Configurar listeners para cambios de configuración
      if (this.config.reloadOnChange) {
        configurationService.on("configurationChanged", (event) => {
          if (event.section === "messages") {
            this.clearCache();
            logInfo(
              "🔄 Cache de mensajes limpiado por cambio de configuración"
            );
          }
        });
      }

      this.isInitialized = true;
      logInfo("✅ MessageProvider inicializado correctamente");
    } catch (error) {
      logError(`❌ Error inicializando MessageProvider: ${error}`);
      throw error;
    }
  }

  // Métodos para obtener respuestas contextuales

  /**
   * Obtiene un saludo aleatorio
   */
  public getGreeting(
    type: "new" | "returning" = "new",
    replacements?: TemplateReplacements
  ): string {
    const cacheKey = `greeting_${type}`;
    const templates = this.getMessageTemplates(`greetings.${type}`, cacheKey);
    return this.getRandomMessage(templates, replacements);
  }

  /**
   * Obtiene una despedida aleatoria
   */
  public getFarewell(
    type: "general" | "frequent" | "night" = "general",
    replacements?: TemplateReplacements
  ): string {
    const cacheKey = `farewell_${type}`;
    const templates = this.getMessageTemplates(`farewells.${type}`, cacheKey);
    return this.getRandomMessage(templates, replacements);
  }

  /**
   * Obtiene una respuesta para preguntas
   */
  public getQuestionResponse(
    questionType:
      | "what"
      | "how"
      | "when"
      | "where"
      | "why"
      | "who"
      | "default" = "default",
    replacements?: TemplateReplacements
  ): string {
    const cacheKey = `question_${questionType}`;
    const templates = this.getMessageTemplates(
      `questions.${questionType}`,
      cacheKey
    );
    return this.getRandomMessage(templates, replacements);
  }

  /**
   * Obtiene una respuesta de ayuda
   */
  public getHelpResponse(
    context:
      | "general"
      | "commandSpecific"
      | "noPermission"
      | "commandNotFound" = "general",
    replacements?: TemplateReplacements
  ): string {
    const cacheKey = `help_${context}`;
    const templates = this.getMessageTemplates(`help.${context}`, cacheKey);
    return this.getRandomMessage(templates, replacements);
  }

  /**
   * Obtiene una respuesta por defecto
   */
  public getDefaultResponse(
    type:
      | "default"
      | "thinking"
      | "acknowledgment"
      | "clarification" = "default",
    replacements?: TemplateReplacements
  ): string {
    const cacheKey = `response_${type}`;
    const templates = this.getMessageTemplates(`responses.${type}`, cacheKey);
    return this.getRandomMessage(templates, replacements);
  }

  // Métodos para comandos

  /**
   * Obtiene la descripción de un comando
   */
  public getCommandDescription(commandName: string): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.commands?.descriptions) {
      return `Comando: ${commandName}`;
    }

    return (
      config.messages.commands.descriptions[commandName] ||
      `Comando: ${commandName}`
    );
  }

  /**
   * Obtiene la ayuda de un comando específico
   */
  public getCommandHelp(commandName: string): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.commands?.help) {
      return `Ayuda no disponible para: ${commandName}`;
    }

    const section = this.getCommandHelpSection(commandName);
    if (!section) {
      return `Ayuda no disponible para: ${commandName}`;
    }

    let helpText = `${section.title}\n\n`;

    if (section.subtitle) {
      helpText += `${section.subtitle}\n\n`;
    }

    if (section.commands[commandName]) {
      helpText += `**${commandName}**: ${section.commands[commandName]}\n\n`;
    }

    if (section.footer) {
      helpText += section.footer;
    }

    return helpText.trim();
  }

  /**
   * Obtiene ejemplos de sintaxis para un comando
   */
  public getCommandSyntax(commandName: string): string[] {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.commands?.syntaxExamples) {
      return [`!${commandName}`];
    }

    return (
      config.messages.commands.syntaxExamples[commandName] || [
        `!${commandName}`,
      ]
    );
  }

  /**
   * Obtiene mensaje de permisos para un rol
   */
  public getPermissionMessage(requiredRole: string): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.commands?.permissionMessages) {
      return `❌ No tienes permisos suficientes. Se requiere: ${requiredRole}`;
    }

    return (
      config.messages.commands.permissionMessages[requiredRole] ||
      `❌ No tienes permisos suficientes. Se requiere: ${requiredRole}`
    );
  }

  // Métodos para errores y sistema

  /**
   * Obtiene un mensaje de error
   */
  public getErrorMessage(
    category: "general" | "validation" | "system" | "commands" | "permissions",
    errorType: string,
    replacements?: TemplateReplacements
  ): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.errors?.[category]?.[errorType]) {
      return this.replaceVariables(`❌ Error: ${errorType}`, replacements);
    }

    const template = config.messages.errors[category][errorType];
    return this.replaceVariables(template, replacements);
  }

  /**
   * Obtiene un mensaje del sistema
   */
  public getSystemMessage(
    category: "status" | "actions" | "notifications",
    messageType: string,
    replacements?: TemplateReplacements
  ): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.system?.[category]?.[messageType]) {
      return this.replaceVariables(`Sistema: ${messageType}`, replacements);
    }

    const template = config.messages.system[category][messageType];
    return this.replaceVariables(template, replacements);
  }

  /**
   * Obtiene información del sistema
   */
  public getSystemInfo(
    infoType: "botVersion" | "systemArchitecture" | "features" | "supportInfo"
  ): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.system?.info?.[infoType]) {
      return `Información no disponible: ${infoType}`;
    }

    const info = config.messages.system.info[infoType];
    if (Array.isArray(info)) {
      return info.join("\n");
    }

    return info;
  }

  // Métodos para saludo basado en hora del día

  /**
   * Obtiene saludo basado en la hora del día
   */
  public getTimeBasedGreeting(timeOfDay: TimeOfDay): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.greetings?.timeBasedGreetings) {
      return this.getDefaultTimeGreeting(timeOfDay);
    }

    return (
      config.messages.greetings.timeBasedGreetings[timeOfDay] ||
      this.getDefaultTimeGreeting(timeOfDay)
    );
  }

  /**
   * Obtiene despedida basada en la hora del día
   */
  public getTimeBasedFarewell(timeOfDay: TimeOfDay): string {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.farewells?.timeBasedFarewells) {
      return this.getDefaultTimeFarewell(timeOfDay);
    }

    return (
      config.messages.farewells.timeBasedFarewells[timeOfDay] ||
      this.getDefaultTimeFarewell(timeOfDay)
    );
  }

  // Métodos utilitarios

  /**
   * Determina la hora del día actual
   */
  public getCurrentTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 22) return "evening";
    return "night";
  }

  /**
   * Reemplaza variables en una plantilla
   */
  public replaceVariables(
    template: string,
    replacements?: TemplateReplacements
  ): string {
    if (!replacements) return template;

    let result = template;

    // Reemplazos estándar
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(value || ""));
    });

    // Reemplazo especial para timeOfDayGreeting
    if (replacements.timeOfDay && result.includes("{timeOfDayGreeting}")) {
      const greeting = this.getTimeBasedGreeting(replacements.timeOfDay);
      result = result.replace(/{timeOfDayGreeting}/g, greeting);
    }

    return result;
  }

  /**
   * Limpia el cache de mensajes
   */
  public clearCache(): void {
    this.messageCache.clear();
    logInfo("🧹 Cache de mensajes limpiado");
  }

  /**
   * Obtiene estadísticas del proveedor
   */
  public getStats(): any {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.messageCache.size,
      config: this.config,
    };
  }

  // Métodos privados

  private getMessageTemplates(path: string, cacheKey?: string): string[] {
    // Verificar cache
    if (
      this.config.cacheMessages &&
      cacheKey &&
      this.messageCache.has(cacheKey)
    ) {
      return this.messageCache.get(cacheKey)!;
    }

    const config = configurationService.getConfiguration();
    if (!config?.messages) {
      logWarning(`⚠️ No hay configuración de mensajes disponible`);
      return ["Mensaje no disponible"];
    }

    const templates = this.getValueByPath(config.messages, path);

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      logWarning(`⚠️ No hay mensajes configurados para: ${path}`);
      return [`Mensaje no configurado: ${path}`];
    }

    // Guardar en cache
    if (this.config.cacheMessages && cacheKey) {
      this.messageCache.set(cacheKey, templates);
    }

    return templates;
  }

  private getRandomMessage(
    templates: string[],
    replacements?: TemplateReplacements
  ): string {
    if (templates.length === 0) {
      return "Mensaje no disponible";
    }

    const randomIndex = Math.floor(Math.random() * templates.length);
    const template = templates[randomIndex];

    return this.replaceVariables(template, replacements);
  }

  private getCommandHelpSection(commandName: string): any {
    const config = configurationService.getConfiguration();
    if (!config?.messages?.commands?.help) return null;

    const sections = ["basic", "user", "admin", "system"];

    for (const sectionName of sections) {
      const section =
        config.messages.commands.help[
          sectionName as keyof typeof config.messages.commands.help
        ];
      if (section?.commands?.[commandName]) {
        return section;
      }
    }

    return config.messages.commands.help.general;
  }

  private getDefaultTimeGreeting(timeOfDay: TimeOfDay): string {
    const defaults = {
      morning: "Buenos días",
      afternoon: "Buenas tardes",
      evening: "Buenas tardes",
      night: "Buenas noches",
    };
    return defaults[timeOfDay];
  }

  private getDefaultTimeFarewell(timeOfDay: TimeOfDay): string {
    const defaults = {
      morning: "Que tengas un buen día",
      afternoon: "Que tengas una buena tarde",
      evening: "Que tengas una buena tarde",
      night: "Que tengas buenas noches",
    };
    return defaults[timeOfDay];
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}

// Exportar instancia singleton
export const messageProvider = new MessageProvider();
