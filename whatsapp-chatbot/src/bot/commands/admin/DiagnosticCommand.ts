import { Command } from "../core/Command";
import {
  CommandContext,
  CommandResult,
  CommandMetadata,
} from "../../../types/commands";
import { UserType } from "../../../types/core/user.types";
import { ConfigurationService } from "../../../services/ConfigurationService";
import { logError } from "../../../utils/logger";

/**
 * Comando de diagnóstico del sistema
 * Proporciona información detallada sobre el estado del sistema de comandos
 */
export class DiagnosticCommand extends Command {
  private configService: ConfigurationService;

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
  }

  get metadata(): CommandMetadata {
    return {
      name: "diagnostic",
      aliases: ["diagnostico", "diag", "status-system"],
      description: this.getConfigMessage(
        "diagnostic.description",
        {},
        "Diagnóstico del sistema de comandos y configuración"
      ),
      syntax: this.getConfigMessage(
        "diagnostic.syntax",
        {},
        "!diagnostic [contextual|stats|test|all]"
      ),
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
   * Obtiene un mensaje de configuración con variables reemplazadas
   */
  private getConfigMessage<T = any>(
    path: string,
    variables?: Record<string, any>,
    fallback?: T
  ): T {
    try {
      const config = this.configService.getConfiguration();
      if (!config) {
        return fallback || ("Configuración no disponible" as any);
      }

      let message = this.getValueByPath(config, `commands.${path}`);

      if (!message) {
        return fallback || (`Mensaje no configurado: ${path}` as any);
      }

      if (Array.isArray(message)) {
        if (typeof fallback === "object" && Array.isArray(fallback)) {
          return (message.length > 0 ? message : fallback) as T;
        }
        return message as T;
      }

      if (variables && typeof message === "string") {
        return this.replaceVariables(message, variables) as T;
      }

      return message as T;
    } catch (error) {
      console.error(
        `Error obteniendo mensaje configurado para ${path}: ${
          error instanceof Error ? error.message : error
        }`
      );
      return fallback || ("Error en configuración" as any);
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

    const variables = {
      useNewCommands: useNewSystem ? "SÍ" : "NO",
      enableNewCommands: enableNewSystem ? "SÍ" : "NO",
      nodeEnv: process.env.NODE_ENV || "no definido",
      nodeVersion: process.version,
    };

    response.push(
      this.getConfigMessage(
        "diagnostic.response.sections.system_stats.title",
        {},
        "📊 CONFIGURACIÓN:"
      )
    );

    const configItems = this.getConfigMessage(
      "diagnostic.response.sections.system_stats.items",
      {},
      {
        use_new_commands: "• USE_NEW_COMMANDS: {useNewCommands}",
        enable_new_commands: "• ENABLE_NEW_COMMANDS: {enableNewCommands}",
        node_env: "• NODE_ENV: {nodeEnv}",
        node_version: "• Version Node.js: {nodeVersion}",
      }
    ) as Record<string, string>;

    Object.entries(configItems).forEach(([key, template]) => {
      response.push(this.replaceVariables(template as string, variables));
    });

    // Información del proceso
    const processVariables = {
      pid: process.pid.toString(),
      uptime: this.formatUptime(process.uptime()),
      memory: this.formatBytes(process.memoryUsage().heapUsed),
      workingDir: process.cwd(),
    };

    response.push("");
    response.push(
      this.getConfigMessage(
        "diagnostic.response.sections.process_info.title",
        {},
        "⚙️ PROCESO:"
      )
    );

    const processItems = this.getConfigMessage<Record<string, string>>(
      "diagnostic.response.sections.process_info.items",
      {},
      {
        pid: "• PID: {pid}",
        uptime: "• Tiempo activo: {uptime}",
        memory: "• Memoria heap: {memory}",
        working_dir: "• Directorio de trabajo: {workingDir}",
      }
    );

    Object.entries(processItems).forEach(([key, template]) => {
      response.push(
        this.replaceVariables(template as string, processVariables)
      );
    });

    return response;
  }

  /**
   * Obtiene información sobre comandos contextuales
   */
  private getContextualInfo(): string[] {
    const response: string[] = [];

    response.push(
      this.getConfigMessage(
        "diagnostic.response.sections.contextual_info.title",
        {},
        "🎯 COMANDOS CONTEXTUALES:"
      )
    );

    try {
      const variables = {
        totalContextualCommands: this.getConfigMessage(
          "diagnostic.response.sections.contextual_info.unavailable",
          {},
          "No disponible en migración TS"
        ),
        registryStatus: this.getConfigMessage(
          "diagnostic.response.sections.contextual_info.migration_in_progress",
          {},
          "Migración en progreso"
        ),
        activeDetectors: this.getConfigMessage(
          "diagnostic.response.sections.contextual_info.verification_pending",
          {},
          "Verificación pendiente"
        ),
      };

      const contextualItems = this.getConfigMessage<Record<string, string>>(
        "diagnostic.response.sections.contextual_info.items",
        {},
        {
          total_commands:
            "• Total comandos contextuales: {totalContextualCommands}",
          registry_status: "• Estado del registro: {registryStatus}",
          active_detectors: "• Detectores activos: {activeDetectors}",
          migration_note: "📝 NOTA: Sistema en migración a TypeScript",
          migration_description:
            "   Los comandos contextuales serán migrados en fases posteriores",
        }
      );

      Object.entries(contextualItems).forEach(([key, template]) => {
        if (typeof template === "string") {
          if (key.includes("note") || key.includes("description")) {
            response.push(template);
          } else {
            response.push(this.replaceVariables(template, variables));
          }
        }
      });
    } catch (error) {
      response.push(
        this.getConfigMessage(
          "diagnostic.errors.contextual_error",
          {
            error: error instanceof Error ? error.message : "Error desconocido",
          },
          `❌ Error cargando información contextual: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`
        )
      );
    }

    return response;
  }

  /**
   * Ejecuta tests de detección de comandos
   */
  private runDetectionTests(): string[] {
    const response: string[] = [];

    response.push(
      this.getConfigMessage(
        "diagnostic.response.sections.detection_tests.title",
        {},
        "🧪 TESTS DE DETECCIÓN:"
      )
    );

    const testMessages = this.getConfigMessage<string[]>(
      "diagnostic.response.sections.detection_tests.test_messages",
      {},
      [
        "estoy aburrido",
        "estoy triste",
        "no sé qué hacer",
        "cuéntame un chiste",
        "qué hora es",
        "hola chatbot",
      ]
    );

    response.push("");
    response.push(
      this.getConfigMessage(
        "diagnostic.response.sections.detection_tests.subtitle",
        {},
        "Mensajes de prueba:"
      )
    );

    testMessages.forEach((testMsg: string) => {
      const detected = this.simulateDetection(testMsg);
      const template = detected.isDetected
        ? this.getConfigMessage(
            "diagnostic.response.sections.detection_tests.detected_template",
            {},
            '• "{message}": ✅ Detectado por: {detectedBy}'
          )
        : this.getConfigMessage(
            "diagnostic.response.sections.detection_tests.not_detected_template",
            {},
            '• "{message}": ❌ No detectado'
          );

      response.push(
        this.replaceVariables(template, {
          message: testMsg,
          detectedBy: detected.detectedBy,
        })
      );
    });

    response.push("");
    response.push(
      this.getConfigMessage(
        "diagnostic.response.sections.detection_tests.simulation_note",
        {},
        "📝 NOTA: Tests usando lógica simulada durante migración TS"
      )
    );

    return response;
  }

  /**
   * Simula detección de comandos (temporal durante migración)
   */
  private simulateDetection(message: string): {
    isDetected: boolean;
    detectedBy: string;
  } {
    const patterns = this.getConfigMessage<
      Array<{ pattern: string; command: string }>
    >("diagnostic.response.sections.detection_tests.patterns", {}, [
      { pattern: "aburrido|aburrida", command: "ActivitySuggestionCommand" },
      { pattern: "triste|sad", command: "MotivationCommand" },
      { pattern: "no sé|que hacer", command: "HelpCommand" },
      { pattern: "chiste|joke", command: "JokeCommand" },
      { pattern: "hora|time", command: "TimeCommand" },
      { pattern: "hola|hi|hello", command: "GreetingCommand" },
    ]);

    for (const { pattern, command } of patterns) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(message)) {
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
          response: this.getConfigMessage(
            "diagnostic.errors.permission_denied",
            {},
            "🚫 Acceso denegado. Solo administradores pueden ejecutar diagnósticos."
          ),
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
      response.push(
        this.getConfigMessage(
          "diagnostic.response.header",
          {},
          "🔍 DIAGNÓSTICO DEL SISTEMA"
        )
      );
      response.push(
        this.getConfigMessage(
          "diagnostic.response.separator",
          {},
          "═══════════════════════════"
        )
      );
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
      const queryVariables = {
        timestamp: new Date().toLocaleString(),
        userName: context.user?.display_name || "Desconocido",
        chatName: context.message.chatName || "Chat sin nombre",
      };

      response.push("");
      const queryInfo = this.getConfigMessage<Record<string, string>>(
        "diagnostic.response.sections.query_info",
        {},
        {
          timestamp: "🕒 Consultado: {timestamp}",
          user: "👤 Usuario: {userName}",
          chat: "📱 Desde: {chatName}",
        }
      );

      Object.entries(queryInfo).forEach(([key, template]) => {
        response.push(
          this.replaceVariables(template as string, queryVariables)
        );
      });

      // Si no se reconoce la opción, mostrar ayuda
      if (!["stats", "contextual", "test", "all"].includes(option)) {
        response.push("");
        response.push(
          this.getConfigMessage(
            "diagnostic.response.options.invalid_option",
            {},
            "❓ Opción no reconocida. Opciones disponibles:"
          )
        );

        const availableOptions = this.getConfigMessage<string[]>(
          "diagnostic.response.options.available_options",
          {},
          [
            "• stats - Estadísticas del sistema",
            "• contextual - Información de comandos contextuales",
            "• test - Tests de detección",
            "• all - Diagnóstico completo (por defecto)",
          ]
        );

        availableOptions.forEach((option: string) => {
          response.push(option);
        });
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
      logError(
        `Error ejecutando DiagnosticCommand: ${
          error instanceof Error ? error.message : error
        }`
      );

      const errorMessage = this.getConfigMessage(
        "diagnostic.errors.execution_error",
        {
          error:
            error instanceof Error
              ? error.message
              : this.getConfigMessage(
                  "diagnostic.errors.general_error",
                  {},
                  "Error desconocido"
                ),
        },
        `❌ Error ejecutando diagnóstico: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );

      return {
        success: false,
        response: errorMessage,
        shouldReply: true,
        error: error instanceof Error ? error.message : "Error desconocido",
        data: {
          commandName: this.metadata.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
          userId: context.user?.id?.toString(),
          error: error instanceof Error ? error.message : "Error desconocido",
        },
      };
    }
  }
}
