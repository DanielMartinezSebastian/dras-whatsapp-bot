import { BaseMessageHandler } from "./core/BaseMessageHandler";
import {
  HandlerContext,
  HandlerResult,
} from "../../types/handlers/message-handler.types";
import { IBotProcessor } from "../../interfaces/core/IBotProcessor";
import { IRegistrationService } from "../../interfaces/services/IRegistrationService";
import { IWhatsAppClient } from "../../interfaces/core/IWhatsAppClient";
import { User } from "../../types/core/user.types";
import { ConfigurationService } from "../../services/ConfigurationService";

/**
 * Handler especializado para el proceso de registro de nuevos usuarios
 * Coordina el flujo de solicitud y validación de nombres
 */
export class RegistrationMessageHandler extends BaseMessageHandler {
  private botProcessor: IBotProcessor;
  private whatsappClient: IWhatsAppClient;
  private registrationService: IRegistrationService;
  private configService: ConfigurationService;

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
    registrationService: IRegistrationService,
    configService: ConfigurationService
  ) {
    super("registration", 5, true); // Alta prioridad para registro
    this.botProcessor = botProcessor;
    this.whatsappClient = whatsappClient;
    this.registrationService = registrationService;
    this.configService = configService;
  }

  /**
   * Obtiene un mensaje de configuración con variables reemplazadas
   */
  private getConfigMessage(
    path: string,
    variables?: Record<string, any>,
    fallback?: string
  ): string {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        return fallback || "Configuración no disponible";
      }

      // Obtener mensaje desde responses o messages
      let message =
        this.getValueByPath(config, `responses.${path}`) ||
        this.getValueByPath(config, `messages.${path}`);

      // Si aún no se encuentra, usar fallback
      if (!message) {
        return fallback || `Mensaje no configurado: ${path}`;
      }

      // Si es un array, tomar un elemento aleatorio
      if (Array.isArray(message)) {
        message = message[Math.floor(Math.random() * message.length)];
      }

      // Reemplazar variables si se proporcionan
      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables);
      }

      return message;
    } catch (error) {
      console.error(
        `Error obteniendo mensaje configurado para ${path}: ${
          error instanceof Error ? error.message : error
        }`
      );
      return fallback || "Error en configuración";
    }
  }

  /**
   * Reemplaza variables en un template de mensaje
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any> = {}
  ): string {
    if (typeof template !== "string") {
      return String(template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(value));
    }
    return result;
  }

  /**
   * Obtiene una ruta de configuración por path anidado
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
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

      // Usar mensaje de error general configurado
      const generalErrorMessage = this.getConfigMessage(
        "registration.errors.general",
        { errorMessage },
        `Error en el proceso de registro: ${errorMessage}`
      );

      return this.createErrorResult(generalErrorMessage, {
        chatJid: context.message.chatJid,
        error: errorMessage,
        requiresRegistration: true,
      });
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

      // Obtener mensaje de bienvenida configurado
      const welcomeMessage = this.getConfigMessage(
        "registration.welcome.new_user",
        { userName: user.display_name || "Usuario" },
        "¡Hola! Para poder ayudarte mejor, por favor compárteme tu nombre.\n\nSolo escribe tu nombre y presiona enviar. 😊"
      );

      return this.createSuccessResult(welcomeMessage, {
        requiresRegistration: true,
        status: this.getConfigMessage(
          "registration.status.started",
          {},
          "registration_started"
        ),
        chatJid: message.chatJid,
        registrationData: registrationData,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error(
        `Error iniciando registro para ${context.message.chatJid}:`,
        error
      );

      // Usar mensaje de error configurado
      const startErrorMessage = this.getConfigMessage(
        "registration.errors.start_error",
        { errorMessage },
        "Hubo un problema al iniciar el registro. Por favor intenta de nuevo."
      );

      return this.createErrorResult(startErrorMessage, {
        error: errorMessage,
        chatJid: context.message.chatJid,
        requiresRegistration: true,
      });
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

        // Usar mensaje de éxito configurado
        const successMessage = this.getConfigMessage(
          "registration.completion.success",
          { userName },
          `¡Perfecto, ${userName}! 🎉\n\nTu nombre ha sido registrado correctamente. Ahora puedes usar todos mis comandos.\n\nEscribe "ayuda" para ver qué puedo hacer por ti.`
        );

        return this.createSuccessResult(successMessage, {
          registrationData: registrationResult,
          chatJid: message.chatJid,
          completed: true,
          user: registrationResult.user,
        });
      } else {
        // El registro no se completó, usar mensaje de error configurado
        const errorMessage = this.getConfigMessage(
          "registration.errors.processing_error",
          { errorMessage: registrationResult.reason || "" },
          registrationResult.reason ||
            "Hubo un problema procesando tu respuesta. Por favor intenta de nuevo."
        );

        return this.createErrorResult(errorMessage, {
          registrationData: registrationResult,
          chatJid: message.chatJid,
          requiresRegistration: true,
          attempts: registrationResult.attempts,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      console.error(
        `Error continuando registro para ${context.message.chatJid}:`,
        error
      );

      // Usar mensaje de error general configurado
      const generalErrorMessage = this.getConfigMessage(
        "registration.errors.general",
        { errorMessage },
        "Hubo un problema procesando tu respuesta. Por favor intenta de nuevo."
      );

      return this.createErrorResult(generalErrorMessage, {
        error: errorMessage,
        chatJid: context.message.chatJid,
        requiresRegistration: true,
      });
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
