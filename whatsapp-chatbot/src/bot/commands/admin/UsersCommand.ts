import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType, User } from "../../../types/core/user.types";
import { logError } from "../../../utils/logger";
import { UserService } from "../../../services/userService";
import { ConfigurationService } from "../../../services/ConfigurationService";

/**
 * Comando administrativo para gestionar usuarios del sistema
 * Permite listar, buscar, actualizar y administrar usuarios
 */
export class UsersCommand extends Command {
  private userService?: UserService;
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  private async getUserService(): Promise<UserService> {
    if (!this.userService) {
      this.userService = new UserService();
      await this.userService.init();
    }
    return this.userService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "users",
      aliases: ["usuarios", "user-admin", "gestionar-usuarios"],
      description: this.getConfigMessage(
        "users.description",
        {},
        "Administración completa de usuarios del sistema"
      ),
      syntax: "!users [list|search|info|update|delete] [parámetros]",
      category: "admin",
      permissions: ["admin"],
      cooldown: 2,
      examples: [
        "!users list - Lista todos los usuarios",
        "!users search Juan - Busca usuarios por nombre",
        "!users info 123456789 - Información de usuario por teléfono",
        "!users update 123456789 type admin - Actualiza tipo de usuario",
        "!users stats - Estadísticas de usuarios del sistema",
      ],
      isAdmin: true,
      isSensitive: true,
    };
  }

  /**
   * Valida si el usuario tiene permisos de administrador
   */
  private validateAdminAccess(context: CommandContext): boolean {
    return context.user?.user_type === "admin" && context.isFromAdmin;
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

      // Obtener mensaje desde commands
      let message = this.getValueByPath(config, `commands.${path}`);

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
  private getValueByPath(obj: any, path?: string): any {
    if (!path) {
      const config = this.configService.getConfiguration();
      return config;
    }
    const config = this.configService.getConfiguration();
    return path
      .split(".")
      .reduce((current, key) => current?.[key], config as any);
  }

  /**
   * Ejecuta el comando de administración de usuarios
   */
  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Validación de acceso administrativo
      if (!this.validateAdminAccess(context)) {
        const errorMessage = this.getConfigMessage(
          "users.error_messages.permission_denied",
          {},
          "❌ Acceso denegado. Solo administradores pueden gestionar usuarios."
        );
        return {
          success: false,
          response: errorMessage,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
          },
        };
      }

      const action = context.args[0]?.toLowerCase();

      // Debug logs temporales
      console.log("🔍 DEBUG UsersCommand: Procesando acción:", action);
      console.log("🔍 DEBUG UsersCommand: Args completos:", context.args);
      console.log(
        "🔍 DEBUG UsersCommand: Comando full text:",
        context.fullText
      );

      switch (action) {
        case "list":
        case "lista":
          return await this.listUsers(context);

        case "search":
        case "buscar":
          return await this.searchUsers(context);

        case "info":
        case "información":
          return await this.getUserInfo(context);

        case "update":
        case "actualizar":
          return await this.updateUser(context);

        case "stats":
        case "estadísticas":
          return await this.getUserStats(context);

        case "delete":
        case "eliminar":
          return await this.deleteUser(context);

        default:
          const invalidActionMessage = this.getConfigMessage(
            "users.error_messages.invalid_action",
            { action: action || "no especificada" },
            `❌ Acción no válida: '${
              action || "no especificada"
            }'\n\nAcciones disponibles: list, search, info, update, stats`
          );
          return {
            success: false,
            response: invalidActionMessage,
            shouldReply: true,
            data: {
              commandName: this.metadata.name,
              executionTime: Date.now() - startTime,
              timestamp: new Date(),
              action: action,
              userId: context.user?.id?.toString(),
            },
          };
      }
    } catch (error) {
      logError(
        "Error en UsersCommand: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.general_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error ejecutando comando users: Error interno del sistema"
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Lista todos los usuarios del sistema
   */
  private async listUsers(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    console.log(
      "🔍 DEBUG UsersCommand listUsers: Iniciando listado de usuarios"
    );

    try {
      const userService = await this.getUserService();

      // Obtener todos los usuarios reales de la base de datos
      const allUsers = await userService.getAllUsers();

      const limit =
        parseInt(context.args[1]) ||
        parseInt(
          this.getConfigMessage("users.default_values.page_size", {}, "10")
        ) ||
        10;
      const page = parseInt(context.args[2]) || 1;
      const start = (page - 1) * limit;
      const end = start + limit;

      const paginatedUsers = allUsers.slice(start, end);
      const totalUsers = allUsers.length;
      const totalPages = Math.ceil(totalUsers / limit);

      let response =
        this.getConfigMessage(
          "users.response.sections.list.title",
          { page, totalPages },
          `� **Lista de Usuarios del Sistema** (Página ${page}/${totalPages})`
        ) + "\n\n";

      if (paginatedUsers.length === 0) {
        response +=
          this.getConfigMessage(
            "users.response.sections.list.no_users",
            {},
            "📭 No se encontraron usuarios en esta página."
          ) + "\n\n";
      } else {
        paginatedUsers.forEach((user: User, index: number) => {
          const statusIcon = user.is_active ? "🟢" : "🔴";
          const typeEmoji = this.getUserTypeEmoji(user.user_type);
          const phone =
            user.phone_number ||
            this.getConfigMessage(
              "users.default_values.not_available",
              {},
              "N/A"
            );
          const name =
            user.display_name ||
            this.getConfigMessage(
              "users.default_values.unknown",
              {},
              "Sin nombre"
            );
          const lastSeen = user.updated_at
            ? this.getRelativeTime(new Date(user.updated_at))
            : this.getConfigMessage("users.default_values.never", {}, "Nunca");

          response += `${statusIcon} **${
            start + index + 1
          }.** ${typeEmoji} ${name}\n`;
          response += `   📱 ${phone} | 🆔 ${user.id} | 🕒 ${lastSeen}\n\n`;
        });
      }

      if (totalPages > 1) {
        response += `📄 **Navegación:**\n`;
        if (page > 1) {
          response += `• \`!users list ${limit} ${
            page - 1
          }\` - Página anterior\n`;
        }
        if (page < totalPages) {
          response += `• \`!users list ${limit} ${
            page + 1
          }\` - Página siguiente\n`;
        }
        response += "\n";
      }

      response += `💡 **Comandos útiles:**\n`;
      response += `• \`!users info <teléfono>\` - Detalles de usuario\n`;
      response += `• \`!users search <nombre>\` - Buscar usuario\n`;
      response += `• \`!users stats\` - Estadísticas generales`;

      const footerMessage = this.getConfigMessage(
        "users.response.sections.list.footer",
        { totalUsers, page, totalPages },
        `📊 Total: ${totalUsers} usuarios • Página ${page}/${totalPages}`
      );

      if (footerMessage && totalUsers > 0) {
        response += `\n\n${footerMessage}`;
      }

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          totalUsers,
          page,
          limit,
          action: "list",
        },
      };
    } catch (error) {
      logError(
        `Error en listUsers: ${error instanceof Error ? error.message : error}`
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.database_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al obtener la lista de usuarios de la base de datos."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: error instanceof Error ? error.message : "Unknown error",
          action: "list",
        },
      };
    }
  }

  /**
   * Busca usuarios por nombre o teléfono
   */
  private async searchUsers(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();
    const searchTerm = context.args.slice(1).join(" ");

    if (!searchTerm) {
      const errorMessage = this.getConfigMessage(
        "users.error_messages.missing_parameter",
        { action: "search", parameter: "término de búsqueda" },
        "❌ **Parámetro requerido**\n\nEspecifica un término de búsqueda.\n\n📖 **Uso:** `!users search <nombre|teléfono>`"
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          action: "search",
        },
      };
    }

    try {
      const userService = await this.getUserService();

      // Buscar usuarios por nombre o teléfono
      const results = await userService.searchUsers(searchTerm);

      let response =
        this.getConfigMessage(
          "users.response.sections.search.title",
          { searchTerm },
          `🔍 **Resultados de búsqueda para:** "${searchTerm}"`
        ) + "\n\n";

      if (results.length === 0) {
        response +=
          this.getConfigMessage(
            "users.response.sections.search.no_results",
            { searchTerm },
            `❌ **No se encontraron usuarios**\n\nVerifica que el nombre o teléfono sea correcto para: "${searchTerm}"`
          ) + "\n\n";

        response += "💡 **Sugerencias:**\n";
        response += "• Usa solo parte del nombre\n";
        response += "• Verifica que el teléfono esté registrado\n";
        response += "• Usa `!users list` para ver todos los usuarios";
      } else {
        const footerMessage = this.getConfigMessage(
          "users.response.sections.search.footer",
          { resultsCount: results.length },
          `📊 **${results.length} usuario(s) encontrado(s):**`
        );
        response += footerMessage + "\n\n";

        results.forEach((user: User, index: number) => {
          const statusIcon = user.is_active ? "🟢" : "🔴";
          const typeEmoji = this.getUserTypeEmoji(user.user_type);
          const name =
            user.display_name ||
            this.getConfigMessage(
              "users.default_values.unknown",
              {},
              "Sin nombre"
            );
          const phone =
            user.phone_number ||
            this.getConfigMessage(
              "users.default_values.not_available",
              {},
              "N/A"
            );

          response += `${statusIcon} **${index + 1}.** ${typeEmoji} ${name}\n`;
          response += `   📱 ${phone} | 🆔 ${user.id}\n`;
          response += `   📋 Tipo: ${this.getUserTypeName(user.user_type)}\n\n`;
        });

        response += "💡 **Comandos útiles:**\n";
        response += "• `!users info <teléfono>` - Ver detalles completos\n";
        response +=
          "• `!users update <teléfono> type <nuevo_tipo>` - Cambiar tipo";
      }

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          searchTerm,
          resultsCount: results.length,
          action: "search",
        },
      };
    } catch (error) {
      logError(
        `Error en searchUsers: ${
          error instanceof Error ? error.message : error
        }`
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.database_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al buscar usuarios en la base de datos."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: error instanceof Error ? error.message : "Unknown error",
          action: "search",
        },
      };
    }
  }

  /**
   * Obtiene información detallada de un usuario
   */
  private async getUserInfo(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();
    const phone = context.args[1];

    if (!phone) {
      const errorMessage = this.getConfigMessage(
        "users.error_messages.missing_parameter",
        { action: "info", parameter: "teléfono del usuario" },
        "❌ **Parámetro requerido**\n\nEspecifica el teléfono del usuario.\n\n📖 **Uso:** `!users info <teléfono>`"
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          action: "info",
        },
      };
    }

    try {
      const userService = await this.getUserService();

      // Buscar usuario por teléfono
      const user = await userService.getUserByPhone(phone);

      if (!user) {
        const errorMessage = this.getConfigMessage(
          "users.error_messages.user_not_found",
          { identifier: phone },
          `❌ **Usuario no encontrado**\n\nNo existe un usuario registrado con el teléfono: ${phone}\n\n💡 Usa \`!users search <nombre>\` para buscar usuarios.`
        );
        return {
          success: false,
          response: errorMessage,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            targetPhone: phone,
            action: "info",
          },
        };
      }

      const typeEmoji = this.getUserTypeEmoji(user.user_type);
      const statusIcon = user.is_active ? "🟢" : "🔴";
      const name =
        user.display_name ||
        this.getConfigMessage("users.default_values.unknown", {}, "Sin nombre");

      let response =
        this.getConfigMessage(
          "users.response.sections.info.title",
          {},
          "👤 **Información de Usuario**"
        ) + "\n\n";

      response += `${statusIcon} **${name}** ${typeEmoji}\n\n`;

      // Sección de datos básicos
      const basicData = this.getConfigMessage(
        "users.response.sections.info.sections.basic.title",
        {},
        "📋 **Datos básicos:**"
      );
      response += `${basicData}\n`;
      response += `• 📱 Teléfono: ${
        user.phone_number ||
        this.getConfigMessage("users.default_values.not_available", {}, "N/A")
      }\n`;
      response += `• 🆔 ID: ${user.id}\n`;
      response += `• 📧 JID: ${user.whatsapp_jid}\n`;
      response += `• 📅 Registro: ${
        user.created_at
          ? new Date(user.created_at).toLocaleDateString("es-ES")
          : this.getConfigMessage(
              "users.default_values.date_unavailable",
              {},
              "N/A"
            )
      }\n`;
      response += `• 🔄 Actualizado: ${
        user.updated_at
          ? new Date(user.updated_at).toLocaleDateString("es-ES")
          : this.getConfigMessage(
              "users.default_values.not_available",
              {},
              "N/A"
            )
      }\n`;
      response += `• 👥 Tipo: ${this.getUserTypeName(user.user_type)}\n\n`;

      // Sección de estado
      response += `📊 **Estado:**\n`;
      response += `• ⚡ Estado: ${user.is_active ? "Activo" : "Inactivo"}\n`;
      if (user.metadata?.language) {
        response += `• 🌐 Idioma: ${user.metadata.language}\n`;
      }
      if (user.metadata?.timezone) {
        response += `• 🕒 Zona horaria: ${user.metadata.timezone}\n`;
      }
      response += "\n";

      if (user.metadata) {
        response += `⚙️ **Metadata:**\n`;
        response += `• 📄 Datos: ${JSON.stringify(user.metadata).substring(
          0,
          100
        )}...\n\n`;
      }

      response += `🛠️ **Acciones disponibles:**\n`;
      response += `• \`!users update ${phone} type <nuevo_tipo>\` - Cambiar tipo\n`;
      response += `• \`!users update ${phone} name <nuevo_nombre>\` - Cambiar nombre\n`;
      response += `• \`!users update ${phone} status <active|inactive>\` - Cambiar estado`;

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          targetPhone: phone,
          targetUserId: user.id?.toString(),
          action: "info",
        },
      };
    } catch (error) {
      logError(
        `Error en getUserInfo: ${
          error instanceof Error ? error.message : error
        }`
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.database_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al obtener información del usuario de la base de datos."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          targetPhone: phone,
          error: error instanceof Error ? error.message : "Unknown error",
          action: "info",
        },
      };
    }
  }

  /**
   * Actualiza datos de un usuario
   */
  private async updateUser(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();
    const [, phone, field, ...values] = context.args;
    const newValue = values.join(" ");

    if (!phone || !field || !newValue) {
      const errorMessage = this.getConfigMessage(
        "users.error_messages.missing_parameter",
        { action: "update", parameter: "teléfono, campo y nuevo valor" },
        "❌ **Parámetros requeridos**\n\n📖 **Uso:** `!users update <teléfono> <campo> <nuevo_valor>`\n\n🔧 **Campos disponibles:**\n• `type` - Tipo de usuario\n• `name` - Nombre del usuario\n• `status` - Estado (active/inactive)"
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          action: "update",
        },
      };
    }

    try {
      const userService = await this.getUserService();

      // Buscar usuario por teléfono
      const user = await userService.getUserByPhone(phone);
      if (!user) {
        const errorMessage = this.getConfigMessage(
          "users.error_messages.user_not_found",
          { identifier: phone },
          `❌ **Usuario no encontrado**\n\nNo existe un usuario registrado con el teléfono: ${phone}`
        );
        return {
          success: false,
          response: errorMessage,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            targetPhone: phone,
            action: "update",
          },
        };
      }

      let response = "";
      let success = false;
      let updateData: any = {};

      switch (field.toLowerCase()) {
        case "type":
        case "tipo":
          const validTypes = [
            "admin",
            "customer",
            "friend",
            "familiar",
            "employee",
            "provider",
            "block",
          ];
          if (validTypes.includes(newValue.toLowerCase())) {
            updateData.user_type = newValue.toLowerCase() as UserType;
            await userService.updateUserByPhone(phone, updateData);

            response = this.getConfigMessage(
              "users.response.sections.update.success",
              {
                field: this.getConfigMessage(`users.fields.type`, {}, "tipo"),
                oldValue: this.getUserTypeName(user.user_type),
                newValue: this.getUserTypeName(
                  newValue.toLowerCase() as UserType
                ),
              },
              `✅ **Usuario actualizado**\n\n👤 Teléfono: ${phone}\n🔄 Tipo cambiado a: **${this.getUserTypeName(
                newValue.toLowerCase() as UserType
              )}**`
            );
            response +=
              "\n\n⚠️ Los cambios se aplicarán en el próximo mensaje del usuario.";
            success = true;
          } else {
            response = this.getConfigMessage(
              "users.error_messages.invalid_user_type",
              { userType: newValue },
              `❌ **Tipo de usuario inválido**\n\n✅ **Tipos válidos:** ${validTypes.join(
                ", "
              )}`
            );
          }
          break;

        case "name":
        case "nombre":
          updateData.display_name = newValue;
          await userService.updateUserByPhone(phone, updateData);

          response = this.getConfigMessage(
            "users.response.sections.update.success",
            {
              field: this.getConfigMessage(`users.fields.name`, {}, "nombre"),
              oldValue: user.display_name || "Sin nombre",
              newValue: newValue,
            },
            `✅ **Usuario actualizado**\n\n👤 Teléfono: ${phone}\n📝 Nombre cambiado a: **${newValue}**`
          );
          success = true;
          break;

        case "status":
        case "estado":
          if (
            ["active", "inactive", "activo", "inactivo"].includes(
              newValue.toLowerCase()
            )
          ) {
            const isActive = ["active", "activo"].includes(
              newValue.toLowerCase()
            );
            updateData.is_active = isActive;
            await userService.updateUserByPhone(phone, updateData);

            response = this.getConfigMessage(
              "users.response.sections.update.success",
              {
                field: this.getConfigMessage(
                  `users.fields.status`,
                  {},
                  "estado"
                ),
                oldValue: user.is_active ? "Activo" : "Inactivo",
                newValue: isActive ? "Activo" : "Inactivo",
              },
              `✅ **Usuario actualizado**\n\n👤 Teléfono: ${phone}\n🔄 Estado cambiado a: **${
                isActive ? "Activo" : "Inactivo"
              }**`
            );
            success = true;
          } else {
            response = `❌ **Estado inválido**\n\n✅ **Estados válidos:** active, inactive`;
          }
          break;

        default:
          response = this.getConfigMessage(
            "users.error_messages.invalid_field",
            { field },
            `❌ **Campo desconocido:** ${field}\n\n🔧 **Campos disponibles:**\n• \`type\` - Tipo de usuario\n• \`name\` - Nombre del usuario\n• \`status\` - Estado (active/inactive)`
          );
      }

      return {
        success,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          targetPhone: phone,
          field,
          newValue,
          action: "update",
        },
      };
    } catch (error) {
      logError(
        `Error en updateUser: ${error instanceof Error ? error.message : error}`
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.update_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al actualizar el usuario en la base de datos."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          targetPhone: phone,
          error: error instanceof Error ? error.message : "Unknown error",
          action: "update",
        },
      };
    }
  }

  /**
   * Obtiene estadísticas generales de usuarios
   */
  private async getUserStats(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const userService = await this.getUserService();

      // Obtener estadísticas reales de la base de datos
      const stats = await userService.getUserStats();

      let response =
        this.getConfigMessage(
          "users.response.sections.stats.title",
          {},
          "📊 **Estadísticas de Usuarios del Sistema**"
        ) + "\n\n";

      // Sección de resumen general
      const summaryTitle = this.getConfigMessage(
        "users.response.sections.stats.sections.summary.title",
        {},
        "👥 **Resumen general:**"
      );
      response += `${summaryTitle}\n`;
      response += `• Total usuarios: **${stats.totalUsers}**\n`;
      response += `• Usuarios activos: **${stats.activeUsers}** (${
        stats.totalUsers > 0
          ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
          : 0
      }%)\n`;
      response += `• Usuarios inactivos: **${stats.inactiveUsers}** (${
        stats.totalUsers > 0
          ? ((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(1)
          : 0
      }%)\n\n`;

      // Sección por tipo de usuario
      const byTypeTitle = this.getConfigMessage(
        "users.response.sections.stats.sections.by_type.title",
        {},
        "📋 **Distribución por tipo:**"
      );
      response += `${byTypeTitle}\n`;
      Object.entries(stats.usersByType).forEach(([type, count]) => {
        if (count > 0) {
          const emoji = this.getUserTypeEmoji(type as UserType);
          const typeName = this.getConfigMessage(
            `users.user_types.${type}.name`,
            {},
            this.getUserTypeName(type as UserType)
          );
          const percentage =
            stats.totalUsers > 0
              ? ((count / stats.totalUsers) * 100).toFixed(1)
              : 0;
          response += `• ${emoji} ${typeName}: **${count}** (${percentage}%)\n`;
        }
      });

      response += `\n🔥 **Actividad reciente:**\n`;
      response += `• Últimas 24h: **${stats.recentActivity.last24h}** usuarios activos\n`;
      response += `• Última semana: **${stats.recentActivity.lastWeek}** usuarios activos\n`;
      response += `• Último mes: **${stats.recentActivity.lastMonth}** usuarios activos\n\n`;

      response += `💬 **Mensajería:**\n`;
      response += `• Total mensajes: **${stats.totalMessages.toLocaleString()}**\n`;
      response += `• Promedio por usuario: **${stats.averageMessagesPerUser}** mensajes\n\n`;

      response += `📈 **Comandos útiles:**\n`;
      response += `• \`!users list\` - Ver lista de usuarios\n`;
      response += `• \`!users search <término>\` - Buscar usuarios\n`;
      response += `• \`!stats\` - Estadísticas del sistema completo`;

      return {
        success: true,
        response,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          stats,
          action: "stats",
        },
      };
    } catch (error) {
      logError(
        `Error en getUserStats: ${
          error instanceof Error ? error.message : error
        }`
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.database_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al obtener estadísticas de la base de datos."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: error instanceof Error ? error.message : "Unknown error",
          action: "stats",
        },
      };
    }
  }

  /**
   * Elimina un usuario del sistema (con confirmación)
   */
  private async deleteUser(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();
    const phone = context.args[1];
    const confirmFlag = context.args[2];

    if (!phone) {
      const errorMessage = this.getConfigMessage(
        "users.error_messages.missing_parameter",
        { action: "delete", parameter: "teléfono del usuario" },
        "❌ **Parámetro requerido**\n\nEspecifica el teléfono del usuario a eliminar.\n\n📖 **Uso:** `!users delete <teléfono> confirm`\n\n⚠️ **Advertencia:** Esta acción es irreversible."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          action: "delete",
        },
      };
    }

    if (confirmFlag !== "confirm") {
      return {
        success: false,
        response: `⚠️ **Confirmación requerida**\n\nPara eliminar el usuario ${phone}, ejecuta:\n\n\`!users delete ${phone} confirm\`\n\n❗ **ADVERTENCIA:** Esta acción es irreversible y eliminará:\n• Todos los datos del usuario\n• Historial de mensajes\n• Configuraciones personalizadas`,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          targetPhone: phone,
          action: "delete",
        },
      };
    }

    try {
      const userService = await this.getUserService();

      // Buscar usuario por teléfono
      const user = await userService.getUserByPhone(phone);
      if (!user) {
        const errorMessage = this.getConfigMessage(
          "users.error_messages.user_not_found",
          { identifier: phone },
          `❌ **Usuario no encontrado**\n\nNo existe un usuario registrado con el teléfono: ${phone}`
        );
        return {
          success: false,
          response: errorMessage,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            targetPhone: phone,
            action: "delete",
          },
        };
      }

      // Realizar eliminación
      const deleted = await userService.deleteUser(user.whatsapp_jid);

      if (deleted) {
        const response = `✅ **Usuario eliminado**\n\n🗑️ El usuario **${
          user.display_name || phone
        }** con teléfono **${phone}** ha sido eliminado del sistema.\n\n📋 **Datos eliminados:**\n• Información personal\n• Historial de mensajes\n• Configuraciones\n• Metadatos\n\n💡 Si el usuario vuelve a escribir, será registrado como nuevo usuario.`;

        return {
          success: true,
          response,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            deletedPhone: phone,
            deletedUserId: user.id?.toString(),
            action: "delete",
          },
        };
      } else {
        return {
          success: false,
          response: `❌ **Error eliminando usuario**\n\nNo se pudo eliminar el usuario con teléfono: ${phone}`,
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            targetPhone: phone,
            action: "delete",
          },
        };
      }
    } catch (error) {
      logError(
        `Error en deleteUser: ${error instanceof Error ? error.message : error}`
      );
      const errorMessage = this.getConfigMessage(
        "users.error_messages.database_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        "❌ Error al eliminar el usuario de la base de datos."
      );
      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          targetPhone: phone,
          error: error instanceof Error ? error.message : "Unknown error",
          action: "delete",
        },
      };
    }
  }

  /**
   * Muestra ayuda del comando de usuarios
   */
  private async showUsersHelp(
    context: CommandContext,
    startTime: number
  ): Promise<CommandResult> {
    let response = "👥 **Comando de Administración de Usuarios**\n\n";

    response += "📖 **Comandos disponibles:**\n\n";

    response += "**📋 Consultas:**\n";
    response += "• `!users list [límite] [página]` - Lista usuarios paginada\n";
    response +=
      "• `!users search <término>` - Busca usuarios por nombre/teléfono\n";
    response +=
      "• `!users info <teléfono>` - Información detallada de usuario\n";
    response += "• `!users stats` - Estadísticas generales del sistema\n\n";

    response += "**🔧 Administración:**\n";
    response +=
      "• `!users update <tel> type <tipo>` - Cambiar tipo de usuario\n";
    response += "• `!users update <tel> name <nombre>` - Cambiar nombre\n";
    response +=
      "• `!users update <tel> status <active|inactive>` - Cambiar estado\n";
    response += "• `!users delete <tel> confirm` - Eliminar usuario ⚠️\n\n";

    response += "**👥 Tipos de usuario:**\n";
    response += "• `admin` - Administrador del sistema\n";
    response += "• `customer` - Cliente/usuario premium\n";
    response += "• `friend` - Amigo/contacto personal\n";
    response += "• `familiar` - Familiar\n";
    response += "• `employee` - Empleado\n";
    response += "• `provider` - Proveedor\n";
    response += "• `block` - Usuario bloqueado\n\n";

    response += "💡 **Ejemplos de uso:**\n";
    response += "• `!users list 5 2` - 5 usuarios por página, página 2\n";
    response += "• `!users search Juan` - Buscar usuarios llamados Juan\n";
    response += "• `!users info 123456789` - Info del usuario 123456789\n";
    response += "• `!users update 123456789 type admin` - Hacer admin";

    return {
      success: true,
      response,
      shouldReply: true,
      data: {
        commandName: this.metadata.name,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        userId: context.user?.id?.toString(),
        action: "help",
      },
    };
  }

  /**
   * Obtiene el emoji correspondiente al tipo de usuario
   */
  private getUserTypeEmoji(type: UserType): string {
    const configEmoji = this.getConfigMessage(
      `users.user_types.${type}.emoji`,
      {},
      undefined
    );

    if (configEmoji) {
      return configEmoji;
    }

    // Fallback map si no se encuentra en la configuración
    const emojiMap: Record<UserType, string> = {
      admin: "👑",
      customer: "👤",
      friend: "🤝",
      familiar: "👨‍👩‍👧‍👦",
      employee: "💼",
      provider: "🏢",
      block: "🚫",
    };
    return emojiMap[type] || "❓";
  }

  /**
   * Obtiene el nombre legible del tipo de usuario
   */
  private getUserTypeName(type: UserType): string {
    const configName = this.getConfigMessage(
      `users.user_types.${type}.name`,
      {},
      undefined
    );

    if (configName) {
      return configName;
    }

    // Fallback map si no se encuentra en la configuración
    const nameMap: Record<UserType, string> = {
      admin: "Administrador",
      customer: "Cliente",
      friend: "Amigo",
      familiar: "Familiar",
      employee: "Empleado",
      provider: "Proveedor",
      block: "Bloqueado",
    };
    return (
      nameMap[type] ||
      this.getConfigMessage("users.default_values.unknown", {}, "Desconocido")
    );
  }

  /**
   * Obtiene tiempo relativo desde una fecha
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return "Hace menos de 1 hora";
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    } else {
      return date.toLocaleDateString("es-ES");
    }
  }
}
