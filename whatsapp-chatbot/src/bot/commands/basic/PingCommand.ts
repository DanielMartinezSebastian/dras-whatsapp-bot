import { Command } from "../core/Command";
import {
  CommandMetadata,
  CommandContext,
  CommandResult,
} from "../../../types/commands";

/**
 * Comando ping - Test de conexión y latencia
 * Migrado a TypeScript desde sistema legacy
 */
export class PingCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "ping",
      aliases: ["test", "connection"],
      description: "Test de conexión y medición de latencia del bot",
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

      let response = "🏓 **Pong!**\n\n";
      response += "📊 **Medición de Latencia:**\n";
      response += `• Tiempo de respuesta: ${responseTime}ms\n`;

      if (processingDelay > 0) {
        response += `• Delay de procesamiento: ${processingDelay}ms\n`;
      }

      response += `• Estado del bot: ${this.getConnectionStatus(
        responseTime
      )}\n`;
      response += `• Timestamp: ${new Date().toLocaleTimeString()}\n\n`;
      response += this.getPerformanceMessage(responseTime);

      return this.createSuccessResult(response);
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
        "❌ **Error en el test de conexión**\n\nEl bot está experimentando problemas. Contacta al administrador."
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
    if (responseTime < 100) {
      return "🟢 Excelente";
    } else if (responseTime < 300) {
      return "🟡 Bueno";
    } else if (responseTime < 1000) {
      return "🟠 Regular";
    } else {
      return "🔴 Lento";
    }
  }

  private getPerformanceMessage(responseTime: number): string {
    if (responseTime < 100) {
      return "⚡ **Rendimiento óptimo** - El bot responde muy rápidamente";
    } else if (responseTime < 300) {
      return "✅ **Buen rendimiento** - Tiempo de respuesta normal";
    } else if (responseTime < 1000) {
      return "⚠️ **Rendimiento regular** - Puede haber algo de congestión";
    } else {
      return "🚨 **Rendimiento bajo** - Se recomienda verificar la conexión";
    }
  }
}
