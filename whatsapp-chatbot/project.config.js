/**
 * WhatsApp Chatbot - Configuración del Proyecto
 *
 * Desarrollado completamente por Daniel Martinez Sebastian
 * Sistema modular de chatbot WhatsApp con arquitectura moderna
 *
 * @author Daniel Martinez Sebastian
 * @version 1.0.0
 * @license MIT
 */

module.exports = {
  // Información del proyecto
  project: {
    name: "WhatsApp Chatbot Sistema Modular",
    version: "1.0.0",
    author: "Daniel Martinez Sebastian",
    description:
      "Sistema inteligente de chatbot WhatsApp con arquitectura modular moderna",
    license: "MIT",
    created: "2025",
    technologies: [
      "Node.js 18+",
      "TypeScript 5.8+",
      "Express.js 4.17+",
      "SQLite 3+",
      "PM2",
      "Jest",
    ],
  },

  // Arquitectura del sistema
  architecture: {
    pattern: "Modular Architecture",
    core: {
      botProcessor: "Coordinador principal del sistema",
      messageProcessor: "Procesador de mensajes especializado",
      messageClassifier: "Clasificador inteligente de mensajes",
    },
    handlers: {
      commandHandler: "Procesamiento de comandos",
      adminHandler: "Funciones administrativas",
      contextualHandler: "Conversaciones naturales",
      registrationHandler: "Gestión de registros",
    },
    services: {
      userService: "Gestión de usuarios",
      permissionService: "Control de acceso",
      conversationService: "Contexto conversacional",
      registrationService: "Registro de usuarios",
    },
    commands: {
      pattern: "Command Pattern",
      categories: ["general", "user", "system", "admin"],
      features: ["permisos", "cooldowns", "ayuda_contextual"],
    },
  },

  // Configuración del sistema
  system: {
    server: {
      port: 3000,
      host: "127.0.0.1", // Solo localhost por seguridad
      protocol: "http",
    },
    database: {
      type: "SQLite",
      path: "./src/database/users.db",
      tables: [
        "users",
        "user_interactions",
        "conversation_states",
        "registration_logs",
      ],
    },
    bridge: {
      url: "http://127.0.0.1:8080",
      protocol: "REST API",
    },
    security: {
      access: "localhost_only",
      permissions: "role_based",
      rate_limiting: true,
      input_validation: true,
    },
  },

  // Funcionalidades implementadas
  features: {
    user_management: {
      registration: "Automático al primer contacto",
      types: [
        "admin",
        "customer",
        "friend",
        "familiar",
        "employee",
        "provider",
        "block",
      ],
      profiles: "Información completa",
      statistics: "Métricas de uso",
    },
    command_system: {
      dynamic_registration: true,
      permission_control: "Granular por usuario",
      cooldown_protection: "Prevención de spam",
      contextual_help: "Ayuda personalizada",
    },
    conversation: {
      context_preservation: "Hilo de conversación",
      natural_responses: "Procesamiento NLP básico",
      auto_reply: "Configurable",
      message_classification: "Automática",
    },
    administration: {
      admin_panel: "Comandos completos",
      user_crud: "Gestión completa",
      advanced_search: "Por nombre, teléfono, tipo",
      real_time_stats: "Métricas del sistema",
    },
  },

  // Estado de desarrollo
  development: {
    migration_status: {
      completed: [
        "Sistema de usuarios completo",
        "Comandos administrativos",
        "Gestión de permisos",
        "Base de datos moderna",
        "API REST básica",
      ],
      in_progress: [
        "Migración completa a TypeScript",
        "Sistema de plugins",
        "API REST completa",
        "Interfaz web de administración",
      ],
    },
    testing: {
      unit_tests: "Jest configurado",
      integration_tests: "Scripts especializados",
      real_user_tests: "Validación en producción",
      command_validation: "Testing automático",
    },
  },

  // Información de contacto y soporte
  contact: {
    developer: "Daniel Martinez Sebastian",
    project_type: "Proyecto personal completo",
    development_approach: "Arquitectura modular desde cero",
    maintenance: "Activo",
  },
};
