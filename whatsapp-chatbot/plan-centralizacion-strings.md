# 📋 Plan de Centralización de Strings y Configuración

## 🎯 Objetivo
Crear un sistema centralizado para manejar todos los strings de respuesta, configuración y mensajes del bot mediante un servicio configurable que permita al administrador modificar textos y configuración general desde archivos JSON o comandos del bot.

## 🔍 Análisis Actual

### Strings Detectados en el Codebase:
1. **Respuestas Contextuales** (`ContextualHandler.js/ts`)
   - Saludos (nuevos/recurrentes)
   - Despedidas (generales/frecuentes/noche)
   - Preguntas (what/how/when/where/why/who)
   - Ayuda y respuestas por defecto

2. **Comandos y Ayuda** (`HelpCommand.js/ts`, `InfoCommand.js/ts`)
   - Descripciones de comandos
   - Mensajes de sintaxis y ejemplos
   - Textos de información del sistema

3. **Errores y Estados** (Múltiples archivos)
   - Mensajes de error (❌)
   - Mensajes de éxito (✅)
   - Advertencias (⚠️)
   - Estados del sistema

4. **Configuración del Bot** (`config.ts`)
   - Nombres y prefijos
   - Límites y timeouts
   - Configuraciones operativas

## 🏗️ Arquitectura Propuesta

### 1. Servicio de Configuración (`ConfigurationService`)
```typescript
interface BotConfiguration {
  // Configuración general
  bot: {
    name: string;
    prefix: string;
    autoReply: boolean;
    commandPrefix: string;
    // ... más configuraciones
  };
  
  // Textos y respuestas
  messages: {
    responses: ResponseTemplates;
    commands: CommandTemplates;
    errors: ErrorTemplates;
    system: SystemTemplates;
  };
  
  // Configuración de comportamiento
  behavior: {
    maxDailyResponses: number;
    cooldowns: Record<string, number>;
    permissions: PermissionConfig;
  };
}
```

### 2. Proveedor de Mensajes (`MessageProvider`)
```typescript
interface MessageProvider {
  // Respuestas contextuales
  getGreeting(type: 'new' | 'returning', replacements?: Record<string, string>): string;
  getFarewell(type: 'general' | 'frequent' | 'night', replacements?: Record<string, string>): string;
  getQuestionResponse(questionType: string): string;
  getHelpResponse(context?: string): string;
  
  // Comandos
  getCommandHelp(commandName: string): CommandHelpData;
  getCommandDescription(commandName: string): string;
  
  // Errores y estados
  getErrorMessage(errorType: string, details?: any): string;
  getSuccessMessage(actionType: string, details?: any): string;
  
  // Sistema
  getSystemMessage(messageType: string): string;
}
```

### 3. Gestor de Configuración (`ConfigurationManager`)
```typescript
interface ConfigurationManager {
  // Cargar/guardar configuración
  loadConfiguration(): Promise<BotConfiguration>;
  saveConfiguration(config: BotConfiguration): Promise<void>;
  reloadConfiguration(): Promise<void>;
  
  // Validación
  validateConfiguration(config: BotConfiguration): ValidationResult;
  
  // Eventos de cambio
  onConfigurationChanged(callback: (config: BotConfiguration) => void): void;
}
```

## 📁 Estructura de Archivos Propuesta

```
src/
├── config/
│   ├── default/
│   │   ├── messages.json           # Mensajes por defecto (ES)
│   │   ├── commands.json           # Ayuda de comandos
│   │   ├── errors.json             # Mensajes de error
│   │   └── system.json             # Mensajes del sistema
│   ├── custom/                     # Configuraciones personalizadas
│   │   ├── bot-config.json         # Configuración general del bot
│   │   ├── messages-custom.json    # Mensajes personalizados
│   │   └── behavior.json           # Comportamiento personalizado
│   └── schemas/
│       ├── messages.schema.json    # Esquema de validación
│       └── config.schema.json      # Esquema de configuración
├── services/
│   ├── ConfigurationService.ts     # Servicio principal
│   ├── MessageProvider.ts          # Proveedor de mensajes
│   └── ValidationService.ts        # Validación de esquemas
├── commands/
│   └── admin/
│       ├── ConfigCommand.ts        # Comando para modificar config
│       └── ReloadCommand.ts        # Comando para recargar config
└── types/
    └── configuration.types.ts       # Tipos TypeScript
```

## 📄 Estructura de JSON de Mensajes

### `messages.json`
```json
{
  "greetings": {
    "new": [
      "¡Hola {userName}! 👋 Es un placer conocerte. Soy tu asistente virtual.",
      "¡{timeOfDayGreeting} {userName}! 🌟 Bienvenido/a.",
      "¡Hola! 😊 Soy tu asistente y estoy aquí para ayudarte."
    ],
    "returning": [
      "¡Hola de nuevo {userName}! 👋 Me alegra verte por aquí.",
      "¡{timeOfDayGreeting} de nuevo {userName}! ¿En qué puedo ayudarte hoy?",
      "¡Es bueno verte otra vez {userName}! 😊 ¿Cómo va todo?"
    ]
  },
  "farewells": {
    "general": [
      "¡Hasta luego, {userName}! Que tengas un gran día.",
      "Adiós, {userName}. ¡Vuelve pronto!",
      "¡Hasta la próxima, {userName}! Cuídate."
    ],
    "frequent": [
      "¡Hasta luego, {userName}! Siempre es un placer ayudarte.",
      "Adiós, {userName}. ¡Gracias por ser un usuario frecuente!",
      "¡Hasta la próxima, {userName}! Espero verte pronto."
    ],
    "night": [
      "Buenas noches, {userName}. Que descanses bien.",
      "Hasta mañana, {userName}. ¡Dulces sueños!",
      "Adiós, {userName}. Que tengas una noche tranquila."
    ]
  },
  "questions": {
    "what": [
      "🤔 Para ayudarte mejor, ¿podrías ser más específico sobre qué quieres saber?",
      "🤔 Esa es una buena pregunta. ¿Podrías darme más contexto para ayudarte mejor?"
    ],
    "how": [
      "🛠 Para darte instrucciones específicas, necesito saber exactamente qué quieres hacer. ¿Puedes ser más específico?",
      "⚙️ Te puedo explicar cómo funcionan mis características. Usa /info para conocer más sobre mí."
    ],
    "default": [
      "Buena pregunta. Déjame buscar esa información para ti.",
      "Estoy procesando tu consulta. Dame un momento para encontrar la mejor respuesta."
    ]
  },
  "help": [
    "Estoy aquí para ayudarte. Puedes usar /help para ver todos los comandos disponibles.",
    "Claro, estos son los comandos que puedes usar: /help, /info, /status. ¿Necesitas más información?",
    "Puedo asistirte con varias tareas. Escribe /help para ver todas las opciones disponibles."
  ],
  "default": [
    "Estoy aquí para ayudarte. ¿Hay algo específico en lo que pueda asistirte?",
    "¿Necesitas ayuda con algo en particular?",
    "¿En qué más puedo ayudarte hoy?"
  ]
}
```

### `commands.json`
```json
{
  "help": {
    "general": {
      "title": "🤖 **drasBot - Sistema de Ayuda**",
      "subtitle": "Comandos disponibles según tu nivel de acceso:",
      "footer": "💡 **Uso:** Usa `!help <comando>` para información detallada\n📞 **Soporte:** Contacta al administrador si necesitas ayuda"
    },
    "basic": {
      "title": "📖 **Comandos Básicos**",
      "commands": {
        "help": "Mostrar esta ayuda",
        "info": "Información del bot y sistema",
        "ping": "Test de conexión y latencia",
        "status": "Estado actual del sistema"
      }
    },
    "user": {
      "title": "👤 **Comandos de Usuario**",
      "commands": {
        "profile": "Ver tu perfil personal",
        "usertype": "Ver tu tipo de usuario",
        "permissions": "Ver tus permisos actuales"
      }
    },
    "admin": {
      "title": "🔧 **Comandos Administrativos**",
      "commands": {
        "admin": "Panel administrativo",
        "users": "Gestionar usuarios",
        "config": "Configurar el bot",
        "reload": "Recargar configuración"
      }
    }
  },
  "descriptions": {
    "help": "Muestra información sobre los comandos disponibles",
    "info": "Información general del bot y estadísticas del sistema",
    "ping": "Test de conexión y latencia del bot",
    "status": "Estado actual del sistema y servicios",
    "profile": "Muestra tu perfil de usuario",
    "config": "Gestiona la configuración del bot"
  }
}
```

### `errors.json`
```json
{
  "general": {
    "unknown": "❌ Ha ocurrido un error desconocido",
    "invalid_command": "❌ Comando no reconocido: {command}",
    "permission_denied": "❌ No tienes permisos para ejecutar este comando",
    "user_not_found": "❌ Usuario no encontrado",
    "invalid_syntax": "❌ Sintaxis incorrecta. Usa: {syntax}"
  },
  "system": {
    "service_unavailable": "❌ Servicio temporalmente no disponible",
    "database_error": "❌ Error de base de datos",
    "network_error": "❌ Error de conexión",
    "timeout": "⏱️ Tiempo de espera agotado"
  },
  "validation": {
    "required_field": "❌ Campo requerido: {field}",
    "invalid_format": "❌ Formato inválido para: {field}",
    "value_too_long": "❌ Valor demasiado largo para: {field}",
    "value_too_short": "❌ Valor demasiado corto para: {field}"
  }
}
```

### `system.json`
```json
{
  "status": {
    "online": "🟢 En línea",
    "offline": "🔴 Fuera de línea",
    "maintenance": "🟡 En mantenimiento",
    "loading": "⏳ Cargando..."
  },
  "actions": {
    "success": "✅ {action} completado exitosamente",
    "failed": "❌ {action} falló",
    "in_progress": "⏳ {action} en progreso...",
    "cancelled": "🚫 {action} cancelado"
  },
  "info": {
    "bot_version": "2.0.0 (Sistema TypeScript)",
    "system_architecture": "Sistema de comandos: Modular TypeScript\nBase de datos: SQLite\nProcesamiento: Node.js + TypeScript",
    "features": [
      "✅ Gestión de usuarios y permisos",
      "✅ Sistema de comandos dinámico", 
      "✅ Registro y autenticación",
      "✅ Logs y monitoreo",
      "✅ Panel administrativo",
      "✅ Migración a TypeScript"
    ]
  }
}
```

## 🛠️ Implementación por Fases

### Fase 1: Estructura Base
1. Crear el `ConfigurationService`
2. Definir interfaces y tipos TypeScript
3. Crear esquemas de validación JSON
4. Migrar configuración básica del bot

### Fase 2: Migración de Mensajes
1. Extraer strings de `ContextualHandler`
2. Crear `MessageProvider`
3. Actualizar handlers para usar el provider
4. Crear archivos JSON por defecto

### Fase 3: Comandos de Administración
1. Comando `!config show` - Ver configuración actual
2. Comando `!config set <key> <value>` - Modificar valores
3. Comando `!messages reload` - Recargar mensajes
4. Comando `!messages edit <category> <index>` - Editar mensaje específico

### Fase 4: Frontend de Administración (Futuro)
1. Panel web para editar configuración
2. Editor visual de mensajes
3. Previsualización de cambios
4. Historial de cambios

## 🔧 Comandos de Administración Propuestos

```bash
# Ver configuración actual
!config show

# Modificar configuración
!config set bot.name "Mi Bot Personalizado"
!config set bot.autoReply true
!config set behavior.maxDailyResponses 200

# Gestionar mensajes
!messages show greetings.new
!messages edit greetings.new 0 "¡Hola {userName}! Bienvenido a mi sistema personalizado"
!messages add greetings.new "Nueva variante de saludo"
!messages remove greetings.new 2

# Recargar configuración
!reload config
!reload messages

# Exportar/Importar configuración
!config export
!config import <archivo>
```

## 📊 Beneficios

1. **Centralización**: Todos los strings en un lugar
2. **Flexibilidad**: Fácil personalización sin tocar código
3. **Multiidioma**: Base para futuro soporte multiidioma
4. **Consistencia**: Mensajes uniformes en todo el sistema
5. **Administración**: Control total desde comandos del bot
6. **Versionado**: Historial de cambios en configuración
7. **Validación**: Esquemas JSON para prevenir errores
8. **Hot-reload**: Cambios sin reiniciar el bot

## 🚀 Próximos Pasos

1. ¿Apruebas este diseño?
2. ¿Quieres que empecemos con alguna fase específica?
3. ¿Hay algún string o configuración particular que quieras priorizar?
4. ¿Te interesa más el enfoque de comandos o prefieres un frontend web?
