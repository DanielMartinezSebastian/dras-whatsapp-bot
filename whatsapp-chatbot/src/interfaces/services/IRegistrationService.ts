import { User } from "../../types/core/user.types";
import { WhatsAppMessage } from "../../types/core";
import {
  RegistrationConfig,
  PendingRegistration,
  NameValidationResult,
  RegistrationResult,
  RegistrationStats,
  UpdateUserNameCallback,
  SendMessageCallback,
  NotifyUserRegisteredCallback,
} from "../../types/services/registration-service.types";

/**
 * Interfaz para el servicio de registro de usuarios
 */
export interface IRegistrationService {
  /**
   * Configuración del servicio
   */
  readonly config: RegistrationConfig;

  /**
   * Registros pendientes actuales
   */
  readonly pendingRegistrations: Map<string, PendingRegistration>;

  /**
   * Si el servicio está inicializado
   */
  readonly initialized: boolean;

  /**
   * Inicializa el servicio
   */
  init(): Promise<IRegistrationService>;

  /**
   * Verifica si un usuario necesita registrar su nombre
   * @param user Usuario a verificar
   * @returns True si necesita registrar nombre
   */
  needsNameRegistration(user: User | null): boolean;

  /**
   * Verifica si el nombre es realmente un número de teléfono
   * @param name Nombre a verificar
   * @param phoneNumber Número de teléfono del usuario
   * @returns True si el nombre es un teléfono
   */
  isPhoneNumberAsName(name: string, phoneNumber: string): boolean;

  /**
   * Inicia el proceso de registro para un nuevo usuario
   * @param message Mensaje del usuario
   * @param user Datos del usuario
   */
  startRegistration(
    message: WhatsAppMessage,
    user: User | null
  ): Promise<RegistrationResult>;

  /**
   * Procesa la respuesta del usuario con su nombre
   * @param message Mensaje con el nombre
   * @param user Usuario actual
   */
  processNameResponse(
    message: WhatsAppMessage,
    user: User | null
  ): Promise<RegistrationResult>;

  /**
   * Valida un nombre proporcionado por el usuario
   * @param nameInput Nombre a validar
   * @param phoneNumber Número de teléfono del usuario
   * @returns Resultado de la validación
   */
  validateName(nameInput: string, phoneNumber?: string): NameValidationResult;

  /**
   * Completa el registro del usuario con nombre válido
   * @param message Mensaje original
   * @param validName Nombre validado
   * @param user Usuario actual
   */
  completeRegistration(
    message: WhatsAppMessage,
    validName: string,
    user: User | null
  ): Promise<RegistrationResult>;

  /**
   * Maneja el caso cuando se exceden los intentos máximos
   * @param message Mensaje del usuario
   * @param user Usuario actual
   */
  handleMaxAttempts(
    message: WhatsAppMessage,
    user: User | null
  ): Promise<RegistrationResult>;

  /**
   * Genera mensaje de bienvenida para iniciar registro
   * @param user Usuario actual
   * @returns Mensaje de bienvenida
   */
  generateWelcomeMessage(user: User | null): string;

  /**
   * Genera mensaje de completación de registro
   * @param name Nombre del usuario
   * @returns Mensaje de completación
   */
  generateCompletionMessage(name: string): string;

  /**
   * Obtiene saludo basado en la hora
   * @returns Saludo apropiado
   */
  getTimeBasedGreeting(): string;

  /**
   * Configura la función de callback para actualizar nombre de usuario
   * @param callback Función de callback
   */
  setUpdateUserNameCallback(callback: UpdateUserNameCallback): void;

  /**
   * Configura la función de callback para enviar mensajes
   * @param callback Función de callback
   */
  setSendMessageCallback(callback: SendMessageCallback): void;

  /**
   * Configura la función de callback para notificar usuarios registrados
   * @param callback Función de callback
   */
  setNotifyUserRegisteredCallback(callback: NotifyUserRegisteredCallback): void;

  /**
   * Limpia registros pendientes expirados
   */
  cleanupExpiredRegistrations(): void;

  /**
   * Obtiene estadísticas del servicio
   * @returns Estadísticas
   */
  getStats(): RegistrationStats;

  /**
   * Cierra el servicio y limpia recursos
   */
  close(): Promise<void>;
}
