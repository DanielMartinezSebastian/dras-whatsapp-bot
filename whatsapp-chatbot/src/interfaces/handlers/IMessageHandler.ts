import {
  HandlerContext,
  HandlerResult,
  MessageHandlerStats,
} from "../../types/handlers/message-handler.types";

/**
 * Interfaz base para todos los message handlers
 */
export interface IMessageHandler {
  /**
   * Nombre único del handler
   */
  readonly name: string;

  /**
   * Prioridad del handler (menor número = mayor prioridad)
   */
  readonly priority: number;

  /**
   * Indica si el handler está habilitado
   */
  readonly enabled: boolean;

  /**
   * Verifica si el handler puede manejar el mensaje
   */
  canHandle(context: HandlerContext): boolean;

  /**
   * Procesa un mensaje y retorna el resultado
   */
  handle(context: HandlerContext): Promise<HandlerResult>;

  /**
   * Obtiene la prioridad del handler
   */
  getPriority(): number;

  /**
   * Obtiene el nombre del handler
   */
  getName(): string;

  /**
   * Obtiene estadísticas del handler
   */
  getStats(): MessageHandlerStats;

  /**
   * Reinicia las estadísticas del handler
   */
  resetStats(): void;
}

/**
 * Interfaz para el registry de message handlers
 */
export interface IMessageHandlerRegistry {
  /**
   * Registra un nuevo handler
   */
  register(handler: IMessageHandler): void;

  /**
   * Desregistra un handler
   */
  unregister(handlerName: string): boolean;

  /**
   * Obtiene un handler por nombre
   */
  get(handlerName: string): IMessageHandler | undefined;

  /**
   * Obtiene todos los handlers ordenados por prioridad
   */
  getAll(): IMessageHandler[];

  /**
   * Obtiene handlers que pueden manejar el contexto
   */
  getHandlersForContext(context: HandlerContext): IMessageHandler[];

  /**
   * Obtiene estadísticas del registry
   */
  getStats(): {
    totalHandlers: number;
    enabledHandlers: number;
    disabledHandlers: number;
  };
}
