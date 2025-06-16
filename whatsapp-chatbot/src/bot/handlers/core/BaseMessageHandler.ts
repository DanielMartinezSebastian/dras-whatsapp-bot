import { IMessageHandler } from "../../../interfaces/handlers/IMessageHandler";
import {
  HandlerContext,
  HandlerResult,
  MessageHandlerStats,
} from "../../../types/handlers/message-handler.types";

/**
 * Clase base abstracta para todos los message handlers
 */
export abstract class BaseMessageHandler implements IMessageHandler {
  protected stats: MessageHandlerStats;

  constructor(
    public readonly name: string,
    public readonly priority: number,
    public readonly enabled: boolean = true
  ) {
    this.stats = {
      totalMessages: 0,
      handledMessages: 0,
      failedMessages: 0,
      successRate: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Verifica si el handler puede manejar el mensaje
   */
  abstract canHandle(context: HandlerContext): boolean;

  /**
   * Procesa un mensaje y retorna el resultado
   */
  async handle(context: HandlerContext): Promise<HandlerResult> {
    const startTime = Date.now();
    this.stats.totalMessages++;

    try {
      if (!this.enabled) {
        return {
          handled: false,
          success: false,
          error: "Handler is disabled",
        };
      }

      if (!this.canHandle(context)) {
        return {
          handled: false,
          success: false,
          error: "Handler cannot process this message",
        };
      }

      const result = await this.processMessage(context);

      if (result.handled && result.success) {
        this.stats.handledMessages++;
      } else if (result.handled) {
        this.stats.failedMessages++;
      }

      this.updateStats(Date.now() - startTime);
      return result;
    } catch (error) {
      this.stats.failedMessages++;
      this.updateStats(Date.now() - startTime);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        handled: true,
        success: false,
        error: errorMessage,
        data: {
          handlerName: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Método abstracto que deben implementar las clases derivadas
   */
  protected abstract processMessage(
    context: HandlerContext
  ): Promise<HandlerResult>;

  /**
   * Obtiene la prioridad del handler
   */
  getPriority(): number {
    return this.priority;
  }

  /**
   * Obtiene el nombre del handler
   */
  getName(): string {
    return this.name;
  }

  /**
   * Obtiene estadísticas del handler
   */
  getStats(): MessageHandlerStats {
    return { ...this.stats };
  }

  /**
   * Reinicia las estadísticas del handler
   */
  resetStats(): void {
    this.stats = {
      totalMessages: 0,
      handledMessages: 0,
      failedMessages: 0,
      successRate: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Actualiza las estadísticas con el tiempo de respuesta
   */
  private updateStats(responseTime: number): void {
    const totalProcessed =
      this.stats.handledMessages + this.stats.failedMessages;

    if (totalProcessed > 0) {
      this.stats.successRate = Math.round(
        (this.stats.handledMessages / totalProcessed) * 100
      );
    }

    // Actualizar tiempo promedio de respuesta
    if (this.stats.totalMessages > 0) {
      this.stats.averageResponseTime = Math.round(
        (this.stats.averageResponseTime * (this.stats.totalMessages - 1) +
          responseTime) /
          this.stats.totalMessages
      );
    }
  }

  /**
   * Método utilitario para crear respuestas estandarizadas
   */
  protected createSuccessResult(response: string, data?: any): HandlerResult {
    return {
      handled: true,
      success: true,
      response,
      action: "reply",
      data: {
        handlerName: this.name,
        timestamp: new Date(),
        ...data,
      },
    };
  }

  /**
   * Método utilitario para crear respuestas silenciosas (sin enviar al usuario)
   */
  protected createSilentResult(data?: any): HandlerResult {
    return {
      handled: true,
      success: true,
      response: "", // Sin respuesta
      action: "ignore", // Sin acción hacia el usuario
      data: {
        handlerName: this.name,
        timestamp: new Date(),
        ...data,
      },
    };
  }

  /**
   * Método utilitario para crear respuestas de error
   */
  protected createErrorResult(error: string, data?: any): HandlerResult {
    return {
      handled: true,
      success: false,
      error,
      data: {
        handlerName: this.name,
        timestamp: new Date(),
        error,
        ...data,
      },
    };
  }

  /**
   * Método utilitario para indicar que el handler no procesó el mensaje
   */
  protected createNotHandledResult(): HandlerResult {
    return {
      handled: false,
      success: false,
    };
  }
}
