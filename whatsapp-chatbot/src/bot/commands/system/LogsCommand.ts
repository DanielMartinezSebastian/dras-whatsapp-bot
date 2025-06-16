import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";
import { ConfigurationService } from "../../../services/ConfigurationService";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Comando para visualizar logs del sistema
 * Solo accesible para administradores
 */
export class LogsCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "logs",
      aliases: ["log", "archivo-log"],
      description: this.getConfigMessage(
        "logs.description",
        {},
        "Muestra los logs del sistema"
      ),
      syntax: "!logs [tipo] [líneas]",
      category: "system",
      permissions: ["admin"],
      cooldown: 5,
      requiredRole: "admin" as UserType,
      examples: [
        "!logs - Muestra las últimas 50 líneas de logs de error",
        "!logs error 100 - Muestra las últimas 100 líneas de logs de error",
        "!logs info 25 - Muestra las últimas 25 líneas de logs de información",
        "!logs combined 75 - Muestra las últimas 75 líneas de todos los logs",
        "!logs security - Muestra los logs de seguridad",
      ],
      isAdmin: true,
      isSensitive: true,
    };
  }

  /**
   * Valida si el usuario tiene permisos para ejecutar este comando
   */
  private validatePermissions(context: CommandContext): boolean {
    return context.user?.user_type === "admin";
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
  private replaceVariables(template: string, variables: Record<string, any> = {}): string {
    if (typeof template !== 'string') {
      return String(template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
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
    return path.split(".").reduce((current, key) => current?.[key], config as any);
  }

  /**
   * Valida los argumentos del comando
   */
  private validateArguments(args: string[]): {
    logType: string;
    lines: number;
    error?: string;
  } {
    const logType = args[0] || "error";
    const lines = parseInt(args[1]) || 50;

    if (lines > 200) {
      return {
        logType,
        lines,
        error: "❌ Máximo 200 líneas permitidas para evitar spam.",
      };
    }

    const validTypes = ["error", "info", "combined", "all", "security"];
    if (!validTypes.includes(logType.toLowerCase())) {
      return {
        logType,
        lines,
        error: `❌ Tipo de log no válido: ${logType}\n\nTipos disponibles: ${validTypes.join(
          ", "
        )}`,
      };
    }

    return { logType, lines };
  }

  /**
   * Obtiene la ruta del archivo de log según el tipo
   */
  private getLogFilePath(logType: string): string {
    const logDir = path.join(__dirname, "../../../../logs");

    switch (logType.toLowerCase()) {
      case "error":
        return path.join(logDir, "error-0.log");
      case "info":
        return path.join(logDir, "out-0.log");
      case "combined":
      case "all":
        return path.join(logDir, "combined-0.log");
      case "security":
        return path.join(logDir, "security.log");
      default:
        throw new Error(`Tipo de log no soportado: ${logType}`);
    }
  }

  /**
   * Lee y procesa el archivo de log
   */
  private async readLogFile(
    logFilePath: string,
    lines: number
  ): Promise<{
    recentLines: string[];
    totalLines: number;
    fileName: string;
  }> {
    try {
      const logContent = await fs.readFile(logFilePath, "utf8");
      const logLines = logContent.split("\n").filter((line) => line.trim());
      const recentLines = logLines.slice(-lines);

      return {
        recentLines,
        totalLines: logLines.length,
        fileName: path.basename(logFilePath),
      };
    } catch (error) {
      throw new Error(
        `Error leyendo archivo de logs: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  }

  /**
   * Formatea la respuesta con los logs
   */
  private formatLogResponse(
    logType: string,
    logData: { recentLines: string[]; totalLines: number; fileName: string }
  ): string {
    const { recentLines, totalLines, fileName } = logData;

    let response = `📋 LOGS DEL SISTEMA (${logType.toUpperCase()})\n`;
    response += `📄 Archivo: ${fileName}\n`;
    response += `📊 Líneas mostradas: ${recentLines.length}/${totalLines}\n`;
    response += `🕒 Consultado: ${new Date().toLocaleString()}\n\n`;

    if (recentLines.length === 0) {
      response += "📝 No hay entradas de log recientes.";
    } else {
      response += "```\n";
      response += recentLines.join("\n");
      response += "\n```";
    }

    // Truncar si es muy largo
    if (response.length > 4000) {
      response = response.substring(0, 3950) + "\n...\n[TRUNCADO]";
    }

    return response;
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      // Extraer args del contexto
      const args = context.args;

      // Verificar permisos
      if (!this.validatePermissions(context)) {
        const errorMessage = this.getConfigMessage(
          "logs.error_messages.permission_denied",
          {},
          "❌ Acceso denegado. Solo administradores pueden ver logs del sistema."
        );
        return {
          success: true,
          response: errorMessage,
          shouldReply: true,
        };
      }

      // Validar argumentos
      const validation = this.validateArguments(args);
      if (validation.error) {
        return {
          success: true,
          response: validation.error,
          shouldReply: true,
        };
      }

      // Obtener archivo de log y leer contenido
      const logFilePath = this.getLogFilePath(validation.logType);
      const logData = await this.readLogFile(logFilePath, validation.lines);

      // Formatear y retornar respuesta
      const response = this.formatLogResponse(validation.logType, logData);

      return {
        success: true,
        response,
        shouldReply: true,
      };
    } catch (error) {
      const errorMessage = this.getConfigMessage(
        "logs.error_messages.general_error",
        { error: error instanceof Error ? error.message : "Error desconocido" },
        `❌ Error ejecutando comando logs: ${error instanceof Error ? error.message : "Error desconocido"}`
      );

      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        error: errorMessage,
      };
    }
  }
}
