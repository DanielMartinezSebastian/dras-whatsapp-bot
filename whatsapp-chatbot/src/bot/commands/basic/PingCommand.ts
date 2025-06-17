import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
} from "../../../types/commands";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando ping - Test de conexión y latencia
 * Migrado a TypeScript desde sistema legacy
 */
export class PingCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "ping",
      aliases: ["test", "connection"],
      description: this.getConfigMessage(
        "ping.description",
        {},
        "Test de conexión y medición de latencia del bot"
      ),
      syntax: "/ping",
      category: "basic",
      permissions: ["user"],
      cooldown: 3, // 3 segundos de cooldown
      examples: ["/ping", "/test"],
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const startTime = Date.now();

      try {
        this.logger.logInfo(
          `Ejecutando comando ping desde ${
            context.user?.phone_number || "usuario desconocido"
          } a las ${startTime}`
        );
      } catch (logError) {
        // Silencioso en caso de problemas con logger en tests
      }

      // Simular procesamiento y medir latencia
      await this.performConnectionTest();

      const responseTime = Date.now() - startTime;
      const messageTime =
        new Date(context.message.timestamp).getTime() || Date.now();
      const processingDelay = startTime - messageTime;

      const variables = {
        responseTime,
        processingDelayText:
          processingDelay > 0
            ? `• Delay de procesamiento: ${processingDelay}ms\n`
            : "",
        connectionStatus: this.getConnectionStatus(responseTime),
        timestamp: new Date().toLocaleTimeString(),
        performanceMessage: this.getPerformanceMessage(responseTime),
      };

      const template = this.getConfigMessage(
        "ping.response_template",
        variables,
        "🏓 **Pong!**\n\n📊 **Medición de Latencia:**\n• Tiempo de respuesta: {responseTime}ms\n{processingDelayText}• Estado del bot: {connectionStatus}\n• Timestamp: {timestamp}\n\n{performanceMessage}"
      );

      return this.createSuccessResult(template);
    } catch (error) {
      // Usar try-catch para el logger por compatibilidad con tests
      try {
        this.logger.logError(
          `Error en comando ${this.metadata.name}: ${error}`
        );
      } catch (logError) {
        console.error(`Error en comando ${this.metadata.name}: ${error}`);
      }
      return this.createErrorResult(
        this.getConfigMessage(
          "ping.error_message",
          {},
          "❌ **Error en el test de conexión**\n\nEl bot está experimentando problemas. Contacta al administrador."
        )
      );
    }
  }

  private async performConnectionTest(): Promise<void> {
    // Simular test de conectividad (puedes expandir esto para tests reales)
    return new Promise((resolve) => {
      setTimeout(resolve, Math.random() * 50); // Simular variación de red
    });
  }

  private getConnectionStatus(responseTime: number): string {
    const statusMessages = this.getConfigMessage(
      "ping.status_messages",
      {},
      {
        excellent: "🟢 Excelente",
        good: "🟡 Bueno",
        regular: "🟠 Regular",
        slow: "🔴 Lento",
      }
    );

    if (responseTime < 100) {
      return statusMessages.excellent || "🟢 Excelente";
    } else if (responseTime < 300) {
      return statusMessages.good || "🟡 Bueno";
    } else if (responseTime < 1000) {
      return statusMessages.regular || "🟠 Regular";
    } else {
      return statusMessages.slow || "🔴 Lento";
    }
  }

  private getPerformanceMessage(responseTime: number): string {
    const performanceMessages = this.getConfigMessage(
      "ping.performance_messages",
      {},
      {
        excellent:
          "⚡ **Rendimiento óptimo** - El bot responde muy rápidamente",
        good: "✅ **Buen rendimiento** - Tiempo de respuesta normal",
        regular: "⚠️ **Rendimiento regular** - Puede haber algo de congestión",
        slow: "🚨 **Rendimiento bajo** - Se recomienda verificar la conexión",
      }
    );

    if (responseTime < 100) {
      return (
        performanceMessages.excellent ||
        "⚡ **Rendimiento óptimo** - El bot responde muy rápidamente"
      );
    } else if (responseTime < 300) {
      return (
        performanceMessages.good ||
        "✅ **Buen rendimiento** - Tiempo de respuesta normal"
      );
    } else if (responseTime < 1000) {
      return (
        performanceMessages.regular ||
        "⚠️ **Rendimiento regular** - Puede haber algo de congestión"
      );
    } else {
      return (
        performanceMessages.slow ||
        "🚨 **Rendimiento bajo** - Se recomienda verificar la conexión"
      );
    }
  }

  /**
   * Obtiene un mensaje de la configuración con soporte para plantillas y variables
   */
  private getConfigMessage(
    path: string,
    variables?: Record<string, any>,
    fallback?: string | any
  ): any {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        return fallback || "Configuración no disponible";
      }

      // Obtener mensaje desde commands o responses
      let message =
        this.getValueByPath(config, `messages.commands.${path}`) ||
        this.getValueByPath(config, `responses.${path}`);

      // Si aún no se encuentra, usar fallback
      if (!message) {
        return fallback || `Mensaje no configurado: ${path}`;
      }

      // Si es un array, tomar un elemento aleatorio
      if (Array.isArray(message)) {
        message = message[Math.floor(Math.random() * message.length)];
      }

      // Reemplazar variables si se proporcionan y es string
      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables);
      }

      return message;
    } catch (error) {
      console.error(
        `Error obteniendo mensaje configurado para ${path}:`,
        error
      );
      return fallback || "Error en configuración";
    }
  }

  /**
   * Reemplaza variables en una plantilla
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    let result = template;

    // Reemplazar variables básicas
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        String(value || "")
      );
    }

    return result;
  }

  /**
   * Obtiene un valor de un objeto usando una ruta de punto
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}
