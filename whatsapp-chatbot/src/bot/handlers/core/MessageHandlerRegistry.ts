import {
  IMessageHandler,
  IMessageHandlerRegistry,
} from "../../../interfaces/handlers/IMessageHandler";
import { HandlerContext } from "../../../types/handlers/message-handler.types";

/**
 * Registry para gestionar message handlers
 */
export class MessageHandlerRegistry implements IMessageHandlerRegistry {
  private handlers: Map<string, IMessageHandler> = new Map();

  /**
   * Registra un nuevo handler
   */
  register(handler: IMessageHandler): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(
        `Handler with name '${handler.name}' is already registered`
      );
    }

    this.handlers.set(handler.name, handler);
  }

  /**
   * Desregistra un handler
   */
  unregister(handlerName: string): boolean {
    return this.handlers.delete(handlerName);
  }

  /**
   * Obtiene un handler por nombre
   */
  get(handlerName: string): IMessageHandler | undefined {
    return this.handlers.get(handlerName);
  }

  /**
   * Obtiene todos los handlers ordenados por prioridad
   */
  getAll(): IMessageHandler[] {
    return Array.from(this.handlers.values()).sort(
      (a, b) => a.priority - b.priority
    );
  }

  /**
   * Obtiene handlers que pueden manejar el contexto
   */
  getHandlersForContext(context: HandlerContext): IMessageHandler[] {
    return this.getAll().filter(
      (handler) => handler.enabled && handler.canHandle(context)
    );
  }

  /**
   * Obtiene estadísticas del registry
   */
  getStats(): {
    totalHandlers: number;
    enabledHandlers: number;
    disabledHandlers: number;
  } {
    const allHandlers = Array.from(this.handlers.values());
    const enabledHandlers = allHandlers.filter((h) => h.enabled);
    const disabledHandlers = allHandlers.filter((h) => !h.enabled);

    return {
      totalHandlers: allHandlers.length,
      enabledHandlers: enabledHandlers.length,
      disabledHandlers: disabledHandlers.length,
    };
  }

  /**
   * Limpia todos los handlers registrados
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Verifica si existe un handler con el nombre dado
   */
  has(handlerName: string): boolean {
    return this.handlers.has(handlerName);
  }

  /**
   * Obtiene los nombres de todos los handlers registrados
   */
  getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}
