import { IUserService } from "../interfaces/core/IUserService";
import { User, UserType, UserMetadata } from "../types/core/user.types";
import {
  UserQuery,
  UserUpdateData,
  UserServiceConfig,
} from "../types/services/user-service.types";
import { WhatsAppMessage } from "../types/core/message.types";
import UserModel, { CreateUserData } from "../database/models/user";
import logger from "../utils/logger";

export class UserService implements IUserService {
  private userModel: UserModel;
  private initialized: boolean;
  private config: UserServiceConfig;

  constructor(config?: Partial<UserServiceConfig>) {
    this.userModel = new UserModel();
    this.initialized = false;
    this.config = {
      autoRegister: true,
      defaultUserType: "customer",
      registrationFlow: true,
      maxDailyMessages: 100,
      ...config,
    };
  }

  async init(): Promise<UserService> {
    if (!this.initialized) {
      await this.initializeService();
      this.initialized = true;
    }
    return this;
  }

  private async initializeService(): Promise<void> {
    try {
      // El UserModel ya se inicializa en su constructor
      // Configurar limpieza periódica de estados expirados
      setInterval(() => {
        this.cleanupExpiredStates();
      }, 5 * 60 * 1000); // Cada 5 minutos

      logger.info("👥 Servicio de usuarios inicializado");
    } catch (error) {
      logger.error(
        `❌ Error inicializando servicio de usuarios: ${
          (error as Error).message
        }`
      );
    }
  }

  private async cleanupExpiredStates(): Promise<void> {
    try {
      // Implementar limpieza de estados expirados
      logger.debug("🧹 Limpiando estados de conversación expirados");
    } catch (error) {
      logger.error(`Error en limpieza de estados: ${(error as Error).message}`);
    }
  }

  // ==================== GESTIÓN DE USUARIOS ====================

  async processUserFromMessage(message: WhatsAppMessage): Promise<User> {
    const startTime = Date.now();

    try {
      // Extraer información del mensaje
      const userData = await this.extractUserDataFromMessage(message);

      // Registrar o actualizar usuario
      const user = await this.userModel.registerUser(userData);

      // Actualizar última interacción
      await this.updateLastInteraction(message.chatJid);

      // Registrar la interacción
      await this.logInteraction(user.id!, {
        interaction_type: "message",
        content_summary: this.summarizeContent(message.content),
        processing_time: Date.now() - startTime,
        success: true,
      });

      return user;
    } catch (error) {
      logger.error(
        `❌ Error procesando usuario desde mensaje: ${(error as Error).message}`
      );

      // Intentar registrar el error si tenemos suficiente información
      if (message.chatJid) {
        const user = await this.userModel.getUserByJid(message.chatJid);
        if (user) {
          await this.logInteraction(user.id!, {
            interaction_type: "message",
            content_summary: "Error processing message",
            processing_time: Date.now() - startTime,
            success: false,
            error_message: (error as Error).message,
          });
        }
      }

      throw error;
    }
  }

  private async extractUserDataFromMessage(
    message: WhatsAppMessage
  ): Promise<CreateUserData> {
    // Detectar si es un número de teléfono
    const phoneMatch = message.chatJid.match(/(\d+)@s\.whatsapp\.net/);
    const phone_number = phoneMatch ? phoneMatch[1] : undefined;

    // Determinar tipo de usuario basado en análisis de contenido y contexto
    const user_type = this.classifyUserType(message);

    // Verificar si el usuario ya existe y tiene un display_name válido
    const existingUser = await this.userModel.getUserByJid(message.chatJid);
    let display_name: string;

    if (
      existingUser &&
      existingUser.display_name &&
      existingUser.display_name.trim() !== "" &&
      existingUser.display_name !== phone_number &&
      !/^\d+$/.test(existingUser.display_name.trim())
    ) {
      // Si el usuario ya tiene un display_name válido, preservarlo
      display_name = existingUser.display_name;
    } else {
      // Solo asignar automáticamente si no existe o es inválido
      display_name =
        message.chatName || message.sender || phone_number || "Usuario";
    }
    const profile_name = message.senderName || undefined;

    // Detectar idioma por contenido (básico)
    const language = this.detectLanguage(message.content);

    // Metadata adicional
    const metadata: UserMetadata = {
      preferences: {
        first_message_content: message.content?.substring(0, 100),
        first_message_timestamp: new Date().toISOString(),
        chat_type: message.chatJid.includes("@g.us") ? "group" : "individual",
        message_type: message.type || "text",
        auto_classified_type: user_type,
        classification_confidence: this.getClassificationConfidence(
          message,
          user_type
        ),
      },
    };

    return {
      whatsapp_jid: message.chatJid,
      phone_number,
      display_name,
      profile_name,
      user_type,
      language,
      metadata,
    };
  }

  private classifyUserType(message: WhatsAppMessage): UserType {
    // Si es un grupo, clasificar como customer por defecto
    if (message.chatJid.includes("@g.us")) {
      return "customer";
    }

    // Análisis de contenido para clasificación automática
    const content = message.content?.toLowerCase() || "";

    // Detectar usuarios bloqueados por patrones de comportamiento
    if (this.detectBlockedPatterns(content)) {
      return "block";
    }

    // Detectar amigos por patrones familiares
    if (this.detectFriendPatterns(content)) {
      return "friend";
    }

    // Detectar familia por patrones específicos
    if (this.detectFamiliarPatterns(content)) {
      return "familiar";
    }

    // Detectar proveedores por contenido comercial
    if (this.detectProviderPatterns(content)) {
      return "provider";
    }

    // Por defecto, nuevos usuarios son clientes
    return "customer";
  }

  private detectBlockedPatterns(content: string): boolean {
    const blockPatterns = [
      "spam",
      "publicidad",
      "promocion",
      "oferta especial",
      "descuento",
      "ganador",
      "premio",
      "sorteo",
      "clickea aqui",
      "haz click",
      "visita nuestro",
    ];

    return blockPatterns.some((pattern) => content.includes(pattern));
  }

  private detectFriendPatterns(content: string): boolean {
    const friendPatterns = [
      "amigo",
      "colega",
      "compadre",
      "hermano",
      "bro",
      "que tal",
      "como andas",
      "como estas",
      "que cuentas",
      "nos vemos",
      "quedamos",
      "tomamos algo",
    ];

    return friendPatterns.some((pattern) => content.includes(pattern));
  }

  private detectFamiliarPatterns(content: string): boolean {
    const familiarPatterns = [
      "mama",
      "papa",
      "hermana",
      "hermano",
      "hijo",
      "hija",
      "tio",
      "tia",
      "primo",
      "prima",
      "abuelo",
      "abuela",
      "papá",
      "mamá",
      "family",
      "familia",
    ];

    return familiarPatterns.some((pattern) => content.includes(pattern));
  }

  private detectProviderPatterns(content: string): boolean {
    const providerPatterns = [
      "servicio",
      "empresa",
      "negocio",
      "presupuesto",
      "cotizacion",
      "factura",
      "pedido",
      "orden",
      "proveedor",
      "suministro",
      "distribuidor",
    ];

    return providerPatterns.some((pattern) => content.includes(pattern));
  }

  private getClassificationConfidence(
    message: WhatsAppMessage,
    classifiedType: UserType
  ): number {
    const content = message.content?.toLowerCase() || "";

    if (classifiedType === "customer" && content.length < 10) {
      return 30; // Baja confianza para mensajes cortos
    }

    if (classifiedType === "block" && this.detectBlockedPatterns(content)) {
      return 85; // Alta confianza para patrones de spam
    }

    if (classifiedType === "friend" && this.detectFriendPatterns(content)) {
      return 75; // Buena confianza para patrones de amistad
    }

    if (classifiedType === "familiar" && this.detectFamiliarPatterns(content)) {
      return 80; // Alta confianza para patrones familiares
    }

    return 50; // Confianza media por defecto
  }

  private detectLanguage(content: string): string {
    if (!content) return "es";

    const spanishKeywords = [
      "hola",
      "gracias",
      "por favor",
      "adiós",
      "sí",
      "no",
    ];
    const englishKeywords = [
      "hello",
      "thanks",
      "please",
      "goodbye",
      "yes",
      "no",
    ];

    const lowerContent = content.toLowerCase();

    const spanishCount = spanishKeywords.filter((word) =>
      lowerContent.includes(word)
    ).length;
    const englishCount = englishKeywords.filter((word) =>
      lowerContent.includes(word)
    ).length;

    return englishCount > spanishCount ? "en" : "es";
  }

  private summarizeContent(content: string): string {
    if (!content) return "No content";

    const summary = content.substring(0, 50);
    return summary + (content.length > 50 ? "..." : "");
  }

  // ==================== INTERFACE IMPLEMENTATION ====================

  async getUserByJid(jid: string): Promise<User | null> {
    try {
      return await this.userModel.getUserByJid(jid);
    } catch (error) {
      logger.error(
        `Error obteniendo usuario por JID: ${(error as Error).message}`
      );
      return null;
    }
  }

  async getUserByPhone(phoneNumber: string): Promise<User | null> {
    try {
      // Primero intentar buscar directamente por número de teléfono
      const userByPhone = await this.userModel.getUserByPhone(phoneNumber);
      if (userByPhone) {
        return userByPhone;
      }

      // Si no se encuentra, intentar convertir número de teléfono a JID format
      const jid = `${phoneNumber}@s.whatsapp.net`;
      return await this.getUserByJid(jid);
    } catch (error) {
      logger.error(
        `Error obteniendo usuario por teléfono: ${(error as Error).message}`
      );
      return null;
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const createData: CreateUserData = {
        whatsapp_jid: userData.whatsapp_jid!,
        phone_number: userData.phone_number,
        display_name: userData.display_name,
        user_type: userData.user_type,
        metadata: userData.metadata,
      };

      return await this.userModel.registerUser(createData);
    } catch (error) {
      logger.error(`Error creando usuario: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateUser(jid: string, updateData: UserUpdateData): Promise<User> {
    try {
      const user = await this.getUserByJid(jid);
      if (!user) {
        throw new Error(`Usuario no encontrado: ${jid}`);
      }

      return await this.userModel.updateUser(user.id!, updateData);
    } catch (error) {
      logger.error(`Error actualizando usuario: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateUserByPhone(
    phone: string,
    updateData: UserUpdateData
  ): Promise<User> {
    try {
      const user = await this.getUserByPhone(phone);
      if (!user) {
        throw new Error(`Usuario no encontrado con teléfono: ${phone}`);
      }

      return await this.userModel.updateUser(user.id!, updateData);
    } catch (error) {
      logger.error(
        `Error actualizando usuario por teléfono: ${(error as Error).message}`
      );
      throw error;
    }
  }

  async deleteUser(jid: string): Promise<boolean> {
    try {
      const user = await this.getUserByJid(jid);
      if (!user) {
        return false;
      }

      // Realizar eliminación completa usando el nuevo método del UserModel
      return await this.userModel.deleteUser(user.id!);
    } catch (error) {
      logger.error(`Error eliminando usuario: ${(error as Error).message}`);
      return false;
    }
  }

  async updateUserType(jid: string, newType: UserType): Promise<User> {
    return await this.updateUser(jid, { user_type: newType });
  }

  async searchUsers(query: UserQuery | string): Promise<User[]> {
    try {
      if (typeof query === "string") {
        // Búsqueda simple por término
        return await this.userModel.searchUsers(query);
      } else {
        // Búsqueda compleja (no implementada aún)
        logger.warn("searchUsers con UserQuery no implementado completamente");
        return [];
      }
    } catch (error) {
      logger.error(`Error buscando usuarios: ${(error as Error).message}`);
      return [];
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByType: Record<UserType, number>;
    recentActivity: {
      last24h: number;
      lastWeek: number;
      lastMonth: number;
    };
    totalMessages: number;
    averageMessagesPerUser: number;
  }> {
    try {
      return await this.userModel.getUserStats();
    } catch (error) {
      logger.error(
        `Error obteniendo estadísticas generales: ${(error as Error).message}`
      );
      throw error;
    }
  }

  async getUserStatsById(jid: string): Promise<any> {
    try {
      const user = await this.getUserByJid(jid);
      if (!user) {
        return null;
      }

      return {
        user,
        totalMessages: user.total_messages,
        lastInteraction: user.last_message_at,
        userType: user.user_type,
        isActive: user.is_active,
      };
    } catch (error) {
      logger.error(
        `Error obteniendo estadísticas de usuario: ${(error as Error).message}`
      );
      return null;
    }
  }

  async isUserActive(jid: string): Promise<boolean> {
    try {
      const user = await this.getUserByJid(jid);
      return user ? user.is_active : false;
    } catch (error) {
      logger.error(
        `Error verificando si usuario está activo: ${(error as Error).message}`
      );
      return false;
    }
  }

  async getAllUsers(limit?: number, offset?: number): Promise<User[]> {
    try {
      return await this.userModel.getAllUsers(limit, offset);
    } catch (error) {
      logger.error(
        `Error obteniendo todos los usuarios: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async updateLastInteraction(chatJid: string): Promise<void> {
    try {
      const user = await this.getUserByJid(chatJid);
      if (user) {
        await this.userModel.updateUser(user.id!, {
          metadata: {
            ...user.metadata,
            preferences: {
              ...user.metadata?.preferences,
              last_interaction_at: new Date().toISOString(),
            },
          },
        });
      }
    } catch (error) {
      logger.error(
        `Error actualizando última interacción: ${(error as Error).message}`
      );
    }
  }

  private async logInteraction(
    userId: number,
    interactionData: {
      interaction_type: string;
      content_summary: string;
      processing_time: number;
      success: boolean;
      error_message?: string;
    }
  ): Promise<void> {
    try {
      // Esta funcionalidad requerirá implementación en UserModel
      logger.debug(
        `Registrando interacción para usuario ${userId}:`,
        interactionData
      );
    } catch (error) {
      logger.error(
        `Error registrando interacción: ${(error as Error).message}`
      );
    }
  }

  async close(): Promise<void> {
    try {
      await this.userModel.close();
      logger.info("UserService cerrado correctamente");
    } catch (error) {
      logger.error(`Error cerrando UserService: ${(error as Error).message}`);
    }
  }
}
