import { logInfo, logError } from "../utils/logger";
import { User } from "../types/core/user.types";
import { WhatsAppMessage } from "../types/core/message.types";
import { IRegistrationService } from "../interfaces/services/IRegistrationService";
import {
  RegistrationConfig,
  PendingRegistration,
  NameValidationResult,
  RegistrationResult,
  RegistrationStats,
  UpdateUserNameCallback,
  SendMessageCallback,
  NotifyUserRegisteredCallback,
} from "../types/services/registration-service.types";

/**
 * Servicio especializado para gestionar el registro de nuevos usuarios
 * Maneja el flujo completo de solicitud y validación de nombres
 */
export class RegistrationService implements IRegistrationService {
  public readonly config: RegistrationConfig;
  public readonly pendingRegistrations: Map<string, PendingRegistration>;

  private _initialized: boolean = false;
  private cleanupInterval?: NodeJS.Timeout;
  private updateUserNameCallback?: UpdateUserNameCallback;
  private sendMessageCallback?: SendMessageCallback;
  private notifyUserRegisteredCallback?: NotifyUserRegisteredCallback;

  constructor() {
    this.pendingRegistrations = new Map<string, PendingRegistration>();

    // Configuración del servicio
    this.config = {
      maxAttempts: parseInt(process.env.MAX_NAME_ATTEMPTS || "3"),
      registrationTimeout: parseInt(
        process.env.REGISTRATION_TIMEOUT || "1800000"
      ), // 30 min
      minNameLength: parseInt(process.env.MIN_NAME_LENGTH || "2"),
      maxNameLength: parseInt(process.env.MAX_NAME_LENGTH || "50"),
      cleanupInterval: 15 * 60 * 1000, // 15 minutos
    };
  }

  get initialized(): boolean {
    return this._initialized;
  }

  async init(): Promise<IRegistrationService> {
    if (!this._initialized) {
      await this.initializeService();
      this._initialized = true;
    }
    return this;
  }

  private async initializeService(): Promise<void> {
    try {
      // Configurar limpieza periódica de registros expirados
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredRegistrations();
      }, this.config.cleanupInterval);

      logInfo("🔐 Servicio de registro inicializado");
    } catch (error) {
      logError(
        `❌ Error inicializando servicio de registro: ${
          (error as Error).message
        }`
      );
    }
  }

  // ==================== GESTIÓN DE REGISTRO ====================

  /**
   * Verifica si un usuario necesita registrar su nombre
   * @param user Usuario a verificar
   * @returns True si necesita registrar nombre
   */
  needsNameRegistration(user: User | null): boolean {
    if (!user) return true;

    // Verificar estados que requieren registro
    const requiresRegistration = [
      user.metadata?.registrationData?.registrationStep === "awaiting_name",
      !user.display_name,
      user.display_name === "null", // Manejar string "null"
      user.display_name === user.phone_number,
      this.isPhoneNumberAsName(user.display_name || "", user.phone_number),
    ];

    return requiresRegistration.some((condition) => condition);
  }

  /**
   * Verifica si el nombre es realmente un número de teléfono
   * @param name Nombre a verificar
   * @param phoneNumber Número de teléfono del usuario
   * @returns True si el nombre es un teléfono
   */
  isPhoneNumberAsName(name: string, phoneNumber: string): boolean {
    if (!name || !phoneNumber) return false;

    // Remover caracteres no numéricos para comparación
    const cleanName = name.replace(/\D/g, "");
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    // Si el nombre no tiene números, no puede ser un teléfono
    if (cleanName.length === 0) return false;

    // Solo considerar como teléfono si tiene al menos 6 dígitos consecutivos
    if (cleanName.length < 6) return false;

    // Verificar si el nombre contiene el número de teléfono o viceversa
    // Solo si ambos tienen contenido numérico significativo
    return (
      cleanName.length >= 6 &&
      cleanPhone.length >= 6 &&
      (cleanName.includes(cleanPhone) || cleanPhone.includes(cleanName))
    );
  }

  /**
   * Inicia el proceso de registro para un nuevo usuario
   * @param message Mensaje del usuario
   * @param user Datos del usuario
   */
  async startRegistration(
    message: WhatsAppMessage,
    user: User | null
  ): Promise<RegistrationResult> {
    const phoneNumber = message.chatJid;

    try {
      // Verificar si ya está en proceso de registro
      if (this.pendingRegistrations.has(phoneNumber)) {
        return await this.processNameResponse(message, user);
      }

      // Marcar como pendiente de registro
      this.pendingRegistrations.set(phoneNumber, {
        startTime: new Date(),
        attempts: 0,
        userId: user?.id,
        originalMessage: message,
      });

      const welcomeMessage = this.generateWelcomeMessage(user);
      await this.sendMessage(message.chatJid, welcomeMessage);

      logInfo(`Registro iniciado para usuario: ${phoneNumber}`);

      return {
        success: true,
        message: "registration_started",
      };
    } catch (error) {
      logError(
        `Error iniciando registro para ${phoneNumber}: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }

  /**
   * Procesa la respuesta del usuario con su nombre
   * @param message Mensaje con el nombre
   * @param user Usuario actual
   */
  async processNameResponse(
    message: WhatsAppMessage,
    user: User | null
  ): Promise<RegistrationResult> {
    const phoneNumber = message.chatJid;
    const nameInput = (message.content || message.text || "").trim();
    const registration = this.pendingRegistrations.get(phoneNumber);

    if (!registration) {
      // Si no hay registro pendiente, iniciar uno nuevo
      return await this.startRegistration(message, user);
    }

    try {
      // Validar el nombre proporcionado
      const validation = this.validateName(nameInput, user?.phone_number);

      if (!validation.isValid) {
        registration.attempts++;

        if (registration.attempts >= this.config.maxAttempts) {
          return await this.handleMaxAttempts(message, user);
        }

        await this.sendMessage(
          phoneNumber,
          validation.message || "Nombre inválido"
        );
        return {
          success: false,
          reason: "invalid_name",
          attempts: registration.attempts,
        };
      }

      // Completar registro con nombre válido
      return await this.completeRegistration(
        message,
        validation.cleanName!,
        user
      );
    } catch (error) {
      logError(
        `Error procesando respuesta de nombre para ${phoneNumber}: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }

  /**
   * Valida un nombre proporcionado por el usuario
   * @param nameInput Nombre a validar
   * @param phoneNumber Número de teléfono del usuario
   * @returns Resultado de la validación
   */
  validateName(nameInput: string, phoneNumber?: string): NameValidationResult {
    // Verificar que no esté vacío
    if (!nameInput || nameInput.trim().length === 0) {
      return {
        isValid: false,
        message:
          "❌ Por favor, escribe tu nombre.\n\n*Ejemplo:* María o Carlos",
      };
    }

    const cleanName = nameInput.trim();

    // Verificar que no sea el número de teléfono
    if (phoneNumber && this.isPhoneNumberAsName(cleanName, phoneNumber)) {
      return {
        isValid: false,
        message:
          "❌ Por favor, no uses tu número de teléfono como nombre.\n\n*Escribe tu nombre real*, por ejemplo: 'Ana' o 'Carlos'",
      };
    }

    // Verificar que no sea solo números
    if (/^\d+$/.test(cleanName)) {
      return {
        isValid: false,
        message:
          "❌ Tu nombre no puede ser solo números.\n\n*Escribe tu nombre*, por ejemplo: 'Laura' o 'Miguel'",
      };
    }

    // Verificar longitud mínima
    if (cleanName.length < this.config.minNameLength) {
      return {
        isValid: false,
        message: `❌ El nombre es muy corto (mínimo ${this.config.minNameLength} caracteres).\n\n*Escribe tu nombre completo*, por ejemplo: 'Sofia' o 'Alejandro'`,
      };
    }

    // Verificar longitud máxima
    if (cleanName.length > this.config.maxNameLength) {
      return {
        isValid: false,
        message: `❌ El nombre es muy largo (máximo ${this.config.maxNameLength} caracteres).\n\n*Escribe un nombre más corto*`,
      };
    }

    // Verificar caracteres válidos (letras, espacios, algunos caracteres especiales)
    if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/.test(cleanName)) {
      return {
        isValid: false,
        message:
          "❌ El nombre contiene caracteres no válidos.\n\n*Usa solo letras*, por ejemplo: 'José María' o 'Ana-Lucía'",
      };
    }

    // Verificar que no contenga palabras prohibidas
    const forbiddenWords = [
      "bot",
      "admin",
      "sistema",
      "test",
      "usuario",
      "client",
      "customer",
    ];
    const lowerName = cleanName.toLowerCase();

    if (forbiddenWords.some((word) => lowerName.includes(word))) {
      return {
        isValid: false,
        message:
          "❌ El nombre contiene palabras no permitidas.\n\n*Escribe tu nombre real*, por ejemplo: 'Patricia' o 'Roberto'",
      };
    }

    return { isValid: true, cleanName };
  }

  /**
   * Completa el registro del usuario con nombre válido
   * @param message Mensaje original
   * @param validName Nombre validado
   * @param user Usuario actual
   */
  async completeRegistration(
    message: WhatsAppMessage,
    validName: string,
    user: User | null
  ): Promise<RegistrationResult> {
    const phoneNumber = message.chatJid;

    try {
      // Actualizar usuario en la base de datos
      const updatedUser = await this.updateUserName(user, validName);

      // Limpiar registro temporal
      this.pendingRegistrations.delete(phoneNumber);

      // Enviar mensaje de bienvenida personalizado
      const welcomeMessage = this.generateCompletionMessage(validName);
      await this.sendMessage(phoneNumber, welcomeMessage);

      // Notificar a administradores
      await this.notifyNewUserRegistered(phoneNumber, validName);

      logInfo(`Registro completado para ${validName} (${phoneNumber})`);

      return {
        success: true,
        user: updatedUser,
        message: "registration_completed",
      };
    } catch (error) {
      logError(
        `Error completando registro para ${phoneNumber}: ${
          (error as Error).message
        }`
      );
      await this.sendMessage(
        phoneNumber,
        "❌ Hubo un error al completar tu registro. Por favor, intenta nuevamente."
      );
      throw error;
    }
  }

  /**
   * Maneja el caso cuando se exceden los intentos máximos
   * @param message Mensaje del usuario
   * @param user Usuario actual
   */
  async handleMaxAttempts(
    message: WhatsAppMessage,
    user: User | null
  ): Promise<RegistrationResult> {
    const phoneNumber = message.chatJid;

    try {
      // Crear nombre temporal usando solo el número de teléfono
      const phoneOnly = message.senderPhone || phoneNumber.split("@")[0];
      const tempName = `Usuario_${phoneOnly.slice(-4)}`;

      // Actualizar usuario con nombre temporal
      const updatedUser = await this.updateUserName(user, tempName, true);

      // Limpiar registro temporal
      this.pendingRegistrations.delete(phoneNumber);

      const messageText = `⚠️ Te hemos asignado un nombre temporal: *${tempName}*

Puedes cambiarlo más tarde escribiendo:
*/cambiar nombre [tu nombre real]*

*¿En qué puedo ayudarte hoy?*`;

      await this.sendMessage(phoneNumber, messageText);

      logInfo(`Nombre temporal asignado: ${tempName} (${phoneNumber})`);

      return {
        success: true,
        user: updatedUser,
        message: "temp_name_assigned",
      };
    } catch (error) {
      logError(
        `Error asignando nombre temporal para ${phoneNumber}: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Genera mensaje de bienvenida para iniciar registro
   * @param user Usuario actual
   * @returns Mensaje de bienvenida
   */
  generateWelcomeMessage(user: User | null): string {
    const timeGreeting = this.getTimeBasedGreeting();

    return `${timeGreeting} 👋 ¡Bienvenido/a a nuestro servicio!

Para brindarte una mejor experiencia personalizada, me gustaría conocerte mejor.

*¿Cuál es tu nombre?* 
(Solo escribe tu nombre, por ejemplo: "Juan" o "María")`;
  }

  /**
   * Genera mensaje de completación de registro
   * @param name Nombre del usuario
   * @returns Mensaje de completación
   */
  generateCompletionMessage(name: string): string {
    return `¡Perfecto, ${name}! ✅

Tu registro ha sido completado exitosamente.

*¿En qué puedo ayudarte hoy?*

Puedes escribir:
• */help* - Para ver las opciones disponibles
• */info* - Para conocer más sobre nuestros servicios
• O simplemente pregúntame algo 💬`;
  }

  /**
   * Obtiene saludo basado en la hora
   * @returns Saludo apropiado
   */
  getTimeBasedGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return "¡Buenos días!";
    if (hour < 18) return "¡Buenas tardes!";
    return "¡Buenas noches!";
  }

  // ==================== CALLBACKS ====================

  /**
   * Configura la función de callback para actualizar nombre de usuario
   * @param callback Función de callback
   */
  setUpdateUserNameCallback(callback: UpdateUserNameCallback): void {
    this.updateUserNameCallback = callback;
  }

  /**
   * Configura la función de callback para enviar mensajes
   * @param callback Función de callback
   */
  setSendMessageCallback(callback: SendMessageCallback): void {
    this.sendMessageCallback = callback;
  }

  /**
   * Configura la función de callback para notificar usuarios registrados
   * @param callback Función de callback
   */
  setNotifyUserRegisteredCallback(
    callback: NotifyUserRegisteredCallback
  ): void {
    this.notifyUserRegisteredCallback = callback;
  }

  // ==================== MÉTODOS INTERNOS ====================

  /**
   * Actualiza el nombre del usuario en la base de datos
   * @param user Usuario a actualizar
   * @param name Nuevo nombre
   * @param isTemporary Si es nombre temporal
   * @returns Usuario actualizado
   */
  private async updateUserName(
    user: User | null,
    name: string,
    isTemporary: boolean = false
  ): Promise<User> {
    if (!this.updateUserNameCallback) {
      throw new Error(
        "updateUserName debe ser configurado durante la inicialización"
      );
    }

    return await this.updateUserNameCallback(user!, name, isTemporary);
  }

  /**
   * Envía mensaje al usuario
   * @param chatJid JID del chat
   * @param message Mensaje a enviar
   */
  private async sendMessage(chatJid: string, message: string): Promise<void> {
    if (!this.sendMessageCallback) {
      throw new Error(
        "sendMessage debe implementarse en coordinación con BotProcessor"
      );
    }

    await this.sendMessageCallback(chatJid, message);
  }

  /**
   * Notifica a administradores sobre nuevo usuario registrado
   * @param phoneNumber Número de teléfono
   * @param name Nombre del usuario
   */
  private async notifyNewUserRegistered(
    phoneNumber: string,
    name: string
  ): Promise<void> {
    try {
      if (this.notifyUserRegisteredCallback) {
        await this.notifyUserRegisteredCallback(phoneNumber, name);
      } else {
        logInfo(`Nuevo usuario registrado: ${name} (${phoneNumber})`);
      }
    } catch (error) {
      logError(`Error notificando nuevo usuario: ${(error as Error).message}`);
    }
  }

  /**
   * Limpia registros pendientes expirados
   */
  cleanupExpiredRegistrations(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [phoneNumber, registration] of this.pendingRegistrations) {
      // Limpiar registros de más de 30 minutos
      if (
        now.getTime() - registration.startTime.getTime() >
        this.config.registrationTimeout
      ) {
        this.pendingRegistrations.delete(phoneNumber);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logInfo(`Limpiados ${cleaned} registros expirados`);
    }
  }

  /**
   * Obtiene estadísticas del servicio
   * @returns Estadísticas
   */
  getStats(): RegistrationStats {
    return {
      pendingRegistrations: this.pendingRegistrations.size,
      initialized: this.initialized,
      config: this.config,
    };
  }

  /**
   * Cierra el servicio y limpia recursos
   */
  async close(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      this.pendingRegistrations.clear();
      logInfo("RegistrationService: Recursos limpiados");
    } catch (error) {
      logError(
        `Error cerrando RegistrationService: ${(error as Error).message}`
      );
    }
  }
}
