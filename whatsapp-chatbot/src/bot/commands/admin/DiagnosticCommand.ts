import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";

/**
 * Comando de diagnóstico del sistema
 * Proporciona información detallada sobre el estado del sistema de comandos
 */
export class DiagnosticCommand extends Command {
  get metadata(): CommandMetadata {
    return {
      name: "diagnostic",
      aliases: ["diagnostico", "diag", "status-system"],
      description: "Diagnóstico del sistema de comandos y configuración",
      syntax: "!diagnostic [contextual|stats|test|all]",
      category: "admin",
      permissions: ["admin"],
      cooldown: 5,
      requiredRole: "admin" as UserType,
      examples: [
        "!diagnostic - Diagnóstico completo del sistema",
        "!diagnostic stats - Solo estadísticas del registro de comandos",
        "!diagnostic contextual - Solo comandos contextuales",
        "!diagnostic test - Solo pruebas de detección",
        "!diagnostic all - Diagnóstico completo (igual que sin argumentos)",
      ],
      isAdmin: true,
      isSensitive: false,
    };
  }

  /**
   * Valida si el usuario tiene permisos para ejecutar este comando
   */
  private validatePermissions(context: CommandContext): boolean {
    return context.user?.user_type === "admin";
  }

  /**
   * Obtiene estadísticas del sistema y configuración
   */
  private getSystemStats(): string[] {
    const response: string[] = [];

    // Configuración del sistema
    const useNewSystem = process.env.USE_NEW_COMMANDS === "true";
    const enableNewSystem = process.env.ENABLE_NEW_COMMANDS === "true";

    response.push("📊 CONFIGURACIÓN:");
    response.push(`• USE_NEW_COMMANDS: ${useNewSystem ? "SÍ" : "NO"}`);
    response.push(`• ENABLE_NEW_COMMANDS: ${enableNewSystem ? "SÍ" : "NO"}`);
    response.push(`• NODE_ENV: ${process.env.NODE_ENV || "no definido"}`);
    response.push(`• Version Node.js: ${process.version}`);

    // Información del proceso
    response.push("");
    response.push("⚙️ PROCESO:");
    response.push(`• PID: ${process.pid}`);
    response.push(`• Tiempo activo: ${this.formatUptime(process.uptime())}`);
    response.push(
      `• Memoria heap: ${this.formatBytes(process.memoryUsage().heapUsed)}`
    );
    response.push(`• Directorio de trabajo: ${process.cwd()}`);

    return response;
  }

  /**
   * Obtiene información sobre comandos contextuales
   */
  private getContextualInfo(): string[] {
    const response: string[] = [];

    response.push("🎯 COMANDOS CONTEXTUALES:");

    try {
      // En un sistema real, aquí se consultaría el CommandRegistry
      // Por ahora, proporcionamos información simulada
      response.push(
        "• Total comandos contextuales: No disponible en migración TS"
      );
      response.push("• Estado del registro: Migración en progreso");
      response.push("• Detectores activos: Verificación pendiente");
      response.push("");
      response.push("📝 NOTA: Sistema en migración a TypeScript");
      response.push(
        "   Los comandos contextuales serán migrados en fases posteriores"
      );
    } catch (error) {
      response.push(
        `❌ Error cargando información contextual: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }

    return response;
  }

  /**
   * Ejecuta tests de detección de comandos
   */
  private runDetectionTests(): string[] {
    const response: string[] = [];

    response.push("🧪 TESTS DE DETECCIÓN:");

    const testMessages = [
      "estoy aburrido",
      "estoy triste",
      "no sé qué hacer",
      "cuéntame un chiste",
      "qué hora es",
      "hola chatbot",
    ];

    response.push("");
    response.push("Mensajes de prueba:");

    testMessages.forEach((testMsg) => {
      // Simulación de detección - en producción usaría el sistema real
      const detected = this.simulateDetection(testMsg);
      const status = detected.isDetected
        ? `✅ Detectado por: ${detected.detectedBy}`
        : "❌ No detectado";
      response.push(`• "${testMsg}": ${status}`);
    });

    response.push("");
    response.push("📝 NOTA: Tests usando lógica simulada durante migración TS");

    return response;
  }

  /**
   * Simula detección de comandos (temporal durante migración)
   */
  private simulateDetection(message: string): {
    isDetected: boolean;
    detectedBy: string;
  } {
    const patterns = [
      { pattern: /aburrido|aburrida/i, command: "ActivitySuggestionCommand" },
      { pattern: /triste|sad/i, command: "MotivationCommand" },
      { pattern: /no sé|que hacer/i, command: "HelpCommand" },
      { pattern: /chiste|joke/i, command: "JokeCommand" },
      { pattern: /hora|time/i, command: "TimeCommand" },
      { pattern: /hola|hi|hello/i, command: "GreetingCommand" },
    ];

    for (const { pattern, command } of patterns) {
      if (pattern.test(message)) {
        return { isDetected: true, detectedBy: command };
      }
    }

    return { isDetected: false, detectedBy: "" };
  }

  /**
   * Formatea bytes a formato legible
   */
  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Formatea tiempo de actividad
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(" ") || "0s";
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Verificar permisos
      if (!this.validatePermissions(context)) {
        return {
          success: false,
          response:
            "🚫 Acceso denegado. Solo administradores pueden ejecutar diagnósticos.",
          shouldReply: true,
          data: {
            commandName: this.metadata.name,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            userId: context.user?.id?.toString(),
            error: "Permission denied",
          },
        };
      }

      const option = context.args[0] || "all";
      const response: string[] = [];

      // Encabezado
      response.push("🔍 DIAGNÓSTICO DEL SISTEMA");
      response.push("═══════════════════════════");
      response.push("");

      // Seleccionar secciones según la opción
      if (option === "stats" || option === "all") {
        response.push(...this.getSystemStats());
        response.push("");
      }

      if (option === "contextual" || option === "all") {
        response.push(...this.getContextualInfo());
        response.push("");
      }

      if (option === "test" || option === "all") {
        response.push(...this.runDetectionTests());
        response.push("");
      }

      // Información de la consulta
      response.push("");
      response.push(`🕒 Consultado: ${new Date().toLocaleString()}`);
      response.push(
        `👤 Usuario: ${context.user?.display_name || "Desconocido"}`
      );
      response.push(
        `📱 Desde: ${context.message.chatName || "Chat sin nombre"}`
      );

      // Si no se reconoce la opción, mostrar ayuda
      if (!["stats", "contextual", "test", "all"].includes(option)) {
        response.push("");
        response.push("❓ Opción no reconocida. Opciones disponibles:");
        response.push("• stats - Estadísticas del sistema");
        response.push("• contextual - Información de comandos contextuales");
        response.push("• test - Tests de detección");
        response.push("• all - Diagnóstico completo (por defecto)");
      }

      return {
        success: true,
        response: response.join("\n"),
        shouldReply: true,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          diagnosticType: option,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";

      return {
        success: false,
        response: `❌ Error ejecutando diagnóstico: ${errorMessage}`,
        shouldReply: true,
        error: errorMessage,
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: errorMessage,
        },
      };
    }
  }
}
