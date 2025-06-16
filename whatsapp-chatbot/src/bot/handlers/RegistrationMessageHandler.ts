import { BaseMessageHandler } from "./core/BaseMessageHandler";
import {
  HandlerContext,
  HandlerResult,
} from "../../types/handlers/message-handler.types";
import { IBotProcessor } from "../../interfaces/core/IBotProcessor";
import { IRegistrationService } from "../../interfaces/services/IRegistrationService";
import { IWhatsAppClient } from "../../interfaces/core/IWhatsAppClient";
import { User } from "../../types/core/user.types";

/**
 * Handler especializado para el proceso de registro de nuevos usuarios
 * Coordina el flujo de solicitud y validación de nombres
 */
export class RegistrationMessageHandler extends BaseMessageHandler {
  private botProcessor: IBotProcessor;
  private whatsappClient: IWhatsAppClient;
  private registrationService: IRegistrationService;

  // Estadísticas específicas del handler de registro
  private registrationStats = {
    registrationsStarted: 0,
    registrationsCompleted: 0,
    registrationsFailed: 0,
    tempNamesAssigned: 0,
  };

  constructor(
    botProcessor: IBotProcessor,
    whatsappClient: IWhatsAppClient,
    registrationService: IRegistrationService
  ) {
    super("registration", 5, true); // Alta prioridad para registro
    this.botProcessor = botProcessor;
    this.whatsappClient = whatsappClient;
    this.registrationService = registrationService;
  }

  /**
   * Verifica si el usuario necesita registrarse o está en proceso de registro
   */
  canHandle(context: HandlerContext): boolean {
    // Si no hay usuario en el contexto, podría necesitar registro
    if (!context.user) {
      return true;
    }

    // Verificar si el usuario necesita completar el registro
    if (this.registrationService.needsNameRegistration(context.user)) {
      return true;
    }

    // Verificar si hay datos de registro en progreso
    const phoneNumber = context.message.chatJid;
    if (this.registrationService.pendingRegistrations.has(phoneNumber)) {
      return true;
    }

    return false;
  }

  /**
   * Procesa el mensaje de registro
   */
  protected async processMessage(
    context: HandlerContext
  ): Promise<HandlerResult> {
    try {
      const message = context.message;
      const user = context.user;

      // Si no hay usuario, retornar que no se puede manejar
      if (!user) {
        return this.createNotHandledResult();
      }

      // Verificar si el usuario necesita registrar su nombre
      if (!this.registrationService.needsNameRegistration(user)) {
        // Usuario ya registrado
        return this.createNotHandledResult();
      }

      this.registrationStats.registrationsStarted++;

      // Verificar si ya hay datos de registro en progreso
      const phoneNumber = context.message.chatJid;
      const hasPendingRegistration =
        this.registrationService.pendingRegistrations.has(phoneNumber);

      if (hasPendingRegistration) {
        // Continuar registro existente
        return await this.continueUserRegistration(context, user);
      } else {
        // Iniciar nuevo proceso de registro
        return await this.startNewRegistration(context, user);
      }
    } catch (error) {
      this.registrationStats.registrationsFailed++;
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      console.error(
        `Error en RegistrationHandler para ${context.message.chatJid}:`,
        error
      );

      return this.createErrorResult(
        `Error en el proceso de registro: ${errorMessage}`,
        {
          chatJid: context.message.chatJid,
          error: errorMessage,
          requiresRegistration: true,
        }
      );
    }
  }

  /**
   * Verifica si un usuario necesita registrarse
   */
  private needsRegistration(user?: User): boolean {
    if (!user) {
      return true; // Usuario no existe, necesita registro
    }

    // Verificar si tiene un nombre válido
    if (!user.display_name || user.display_name.trim() === "") {
      return true;
    }

    // Verificar si tiene nombre temporal (empieza con "Usuario_")
    if (user.display_name.startsWith("Usuario_")) {
      return true;
    }

    return false;
  }

  /**
   * Inicia un nuevo proceso de registro
   */
  private async startNewRegistration(
    context: HandlerContext,
    user: User
  ): Promise<HandlerResult> {
    try {
      const message = context.message;

      const registrationData = await this.registrationService.startRegistration(
        message,
        user
      );

      console.log(`Nuevo registro iniciado para: ${message.chatJid}`);

      return this.createSuccessResult(
        "¡Hola! Para poder ayudarte mejor, por favor compárteme tu nombre.\n\n" +
          "Solo escribe tu nombre y presiona enviar. 😊",
        {
          requiresRegistration: true,
          status: "registration_started",
          chatJid: message.chatJid,
          registrationData: registrationData,
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error(
        `Error iniciando registro para ${context.message.chatJid}:`,
        error
      );

      return this.createErrorResult(
        "Hubo un problema al iniciar el registro. Por favor intenta de nuevo.",
        {
          error: errorMessage,
          chatJid: context.message.chatJid,
          requiresRegistration: true,
        }
      );
    }
  }

  /**
   * Continúa el proceso de registro con la respuesta del usuario
   */
  private async continueUserRegistration(
    context: HandlerContext,
    user: User
  ): Promise<HandlerResult> {
    try {
      const message = context.message;

      const registrationResult =
        await this.registrationService.processNameResponse(message, user);

      if (registrationResult.success) {
        this.registrationStats.registrationsCompleted++;

        const userName = registrationResult.user?.display_name || "Usuario";

        return this.createSuccessResult(
          `¡Perfecto, ${userName}! 🎉\n\n` +
            "Tu nombre ha sido registrado correctamente. Ahora puedes usar todos mis comandos.\n\n" +
            'Escribe "ayuda" para ver qué puedo hacer por ti.',
          {
            registrationData: registrationResult,
            chatJid: message.chatJid,
            completed: true,
            user: registrationResult.user,
          }
        );
      } else {
        // El registro no se completó, probablemente necesita más información
        return this.createErrorResult(
          registrationResult.reason ||
            "Hubo un problema procesando tu respuesta. Por favor intenta de nuevo.",
          {
            registrationData: registrationResult,
            chatJid: message.chatJid,
            requiresRegistration: true,
            attempts: registrationResult.attempts,
          }
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error(
        `Error continuando registro para ${context.message.chatJid}:`,
        error
      );

      return this.createErrorResult(
        "Hubo un problema procesando tu respuesta. Por favor intenta de nuevo.",
        {
          error: errorMessage,
          chatJid: context.message.chatJid,
          requiresRegistration: true,
        }
      );
    }
  }

  /**
   * Obtiene estadísticas específicas del handler de registro
   */
  getRegistrationStats() {
    return {
      ...this.getStats(),
      ...this.registrationStats,
    };
  }

  /**
   * Verifica si hay registros pendientes
   */
  hasPendingRegistrations(): boolean {
    // Como no tenemos acceso a registros pendientes en la interfaz,
    // retornamos false por defecto
    return false;
  }

  /**
   * Obtiene el número de registros pendientes
   */
  getPendingRegistrationsCount(): number {
    // Como no tenemos acceso a registros pendientes en la interfaz,
    // retornamos 0 por defecto
    return 0;
  }

  /**
   * Reinicia las estadísticas específicas del handler de registro
   */
  resetRegistrationStats(): void {
    this.registrationStats = {
      registrationsStarted: 0,
      registrationsCompleted: 0,
      registrationsFailed: 0,
      tempNamesAssigned: 0,
    };
    this.resetStats();
  }
}
