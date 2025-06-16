import { User } from "../core/user.types";
import { WhatsAppMessage } from "../core/message.types";

/**
 * Configuración del servicio de registro
 */
export interface RegistrationConfig {
  /** Máximo número de intentos para validar el nombre */
  maxAttempts: number;
  /** Tiempo límite para completar el registro (ms) */
  registrationTimeout: number;
  /** Longitud mínima del nombre */
  minNameLength: number;
  /** Longitud máxima del nombre */
  maxNameLength: number;
  /** Intervalo de limpieza de registros expirados (ms) */
  cleanupInterval: number;
}

/**
 * Registro pendiente temporal
 */
export interface PendingRegistration {
  /** Hora de inicio del registro */
  startTime: Date;
  /** Número de intentos realizados */
  attempts: number;
  /** ID del usuario (si existe) */
  userId?: string | number;
  /** Mensaje original que inició el registro */
  originalMessage: WhatsAppMessage;
}

/**
 * Resultado de validación de nombre
 */
export interface NameValidationResult {
  /** Si el nombre es válido */
  isValid: boolean;
  /** Mensaje de error o éxito */
  message?: string;
  /** Nombre limpio (si es válido) */
  cleanName?: string;
}

/**
 * Resultado del proceso de registro
 */
export interface RegistrationResult {
  /** Si el registro fue exitoso */
  success: boolean;
  /** Usuario actualizado (si es exitoso) */
  user?: User;
  /** Tipo de mensaje resultado */
  message?: string;
  /** Razón del fallo (si no es exitoso) */
  reason?: string;
  /** Número de intentos actuales */
  attempts?: number;
}

/**
 * Estadísticas del servicio de registro
 */
export interface RegistrationStats {
  /** Número de registros pendientes */
  pendingRegistrations: number;
  /** Si el servicio está inicializado */
  initialized: boolean;
  /** Configuración actual */
  config: RegistrationConfig;
}

/**
 * Función de callback para actualizar nombre de usuario
 */
export type UpdateUserNameCallback = (
  user: User,
  name: string,
  isTemporary?: boolean
) => Promise<User>;

/**
 * Función de callback para enviar mensajes
 */
export type SendMessageCallback = (
  chatJid: string,
  message: string
) => Promise<void>;

/**
 * Función de callback para notificar usuarios registrados
 */
export type NotifyUserRegisteredCallback = (
  phoneNumber: string,
  name: string
) => Promise<void>;
