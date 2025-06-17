# 🚀 DrasBot 3.0 - Arquitectura Nueva y Limpia

## 📖 Resumen Ejecutivo

Este documento define la nueva arquitectura para **DrasBot 3.0**, un sistema de chatbot WhatsApp completamente rediseñado desde cero, manteniendo las mejores características del proyecto anterior pero con una arquitectura limpia, modular y extensible.

---

## 🎯 Objetivos Principales

### 1. **Simplicidad y Claridad**
- ✅ Arquitectura modular fácil de entender
- ✅ Código limpio sin legacy ni iteraciones previas
- ✅ Documentación clara para usuarios no programadores
- ✅ Instalación y configuración simplificada

### 2. **Extensibilidad**
- ✅ Sistema de plugins para nuevas funcionalidades
- ✅ Contextos dinámicos y extensibles
- ✅ Comandos modulares y reutilizables
- ✅ API interna para desarrolladores

### 3. **Configuración Centralizada**
- ✅ Todos los strings en archivos JSON editables
- ✅ Configuración visual sin tocar código
- ✅ Sistema de templates dinámicos
- ✅ Gestión de permisos simplificada

---

## 🏗️ Arquitectura del Sistema

### 📂 Estructura del Proyecto

```
drasbot-3.0/
├── 📁 src/                     # Código fuente TypeScript
│   ├── 📁 core/               # Núcleo del sistema
│   │   ├── bot.ts             # Bot principal
│   │   ├── context-manager.ts # Gestor de contextos
│   │   ├── message-processor.ts # Procesador de mensajes
│   │   └── plugin-loader.ts   # Cargador de plugins
│   ├── 📁 plugins/            # Sistema de plugins
│   │   ├── 📁 commands/       # Comandos básicos
│   │   │   ├── help.ts
│   │   │   ├── info.ts
│   │   │   └── status.ts
│   │   ├── 📁 admin/          # Comandos administrativos
│   │   │   ├── users.ts
│   │   │   ├── config.ts
│   │   │   └── system.ts
│   │   └── 📁 context/        # Manejadores de contexto
│   │       ├── registration.ts # Registro de usuarios
│   │       ├── conversation.ts # Conversación natural
│   │       └── support.ts     # Soporte técnico
│   ├── 📁 types/              # Definiciones de tipos
│   │   ├── bot.types.ts
│   │   ├── plugin.types.ts
│   │   ├── context.types.ts
│   │   └── user.types.ts
│   ├── 📁 interfaces/         # Interfaces del sistema
│   │   ├── IPlugin.ts
│   │   ├── IContext.ts
│   │   └── IMessageProcessor.ts
│   └── 📁 services/           # Servicios del sistema
│       ├── database.service.ts
│       ├── template.service.ts
│       └── config.service.ts
├── 📁 config/                  # Configuración centralizada
│   ├── 📁 messages/           # Mensajes del bot
│   │   ├── es.json           # Español (por defecto)
│   │   └── en.json           # Inglés (opcional)
│   ├── 📁 contexts/           # Configuración de contextos
│   │   ├── registration.json
│   │   ├── conversation.json
│   │   └── support.json
│   ├── bot-settings.json      # Configuración principal
│   ├── user-levels.json       # Niveles de usuario
│   └── plugins-config.json    # Configuración de plugins
├── 📁 data/                   # Datos del sistema
│   ├── users.db              # Base de datos de usuarios
│   ├── conversations.json    # Contextos de conversación
│   └── logs/                 # Logs del sistema
├── 📁 utils/                  # Utilidades
│   ├── logger.ts
│   ├── database.ts
│   └── templates.ts
├── 📁 web-panel/              # Panel web administrativo
│   ├── index.html
│   ├── js/app.js
│   └── css/style.css
├── 📁 dist/                   # Código compilado
├── install.ts                 # Instalador automático
├── package.json
├── tsconfig.json              # Configuración TypeScript
├── webpack.config.js          # Configuración de build
└── README.md
```

---

## 🔧 Componentes Principales

### 1. **Core System (Núcleo)**

#### **Definiciones de Tipos (`src/types/`)**
```typescript
// src/types/bot.types.ts
export interface BotConfig {
  name: string;
  prefix: string;
  autoReply: boolean;
  language: string;
  timezone: string;
  limits: {
    messagesPerDay: number;
    commandsPerHour: number;
  };
}

export interface MessageData {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'document';
  isForwarded: boolean;
}

export interface UserData {
  id: string;
  phone: string;
  name: string;
  level: UserLevel;
  registeredAt: Date;
  lastActive: Date;
  totalMessages: number;
  metadata: Record<string, any>;
}

export type UserLevel = 'guest' | 'user' | 'premium' | 'admin';
```

```typescript
// src/types/context.types.ts
export interface ContextData {
  userId: string;
  type: string;
  step: string;
  data: Record<string, any>;
  timestamp: number;
  messageCount: number;
  expiresAt?: number;
}

export interface ContextResponse {
  text: string;
  context?: ContextData | null;
  actions?: ContextAction[];
}

export interface ContextAction {
  type: 'save_user' | 'send_notification' | 'set_timer';
  data: Record<string, any>;
}
```

```typescript
// src/types/plugin.types.ts
export interface PluginConfig {
  name: string;
  version: string;
  type: PluginType;
  triggers: string[];
  permissions: UserLevel[];
  enabled: boolean;
  description: string;
  usage: string;
  examples: string[];
}

export type PluginType = 'command' | 'context' | 'middleware' | 'service';

export interface PluginResponse {
  text: string;
  context?: ContextData | null;
  shouldReply: boolean;
  actions?: ContextAction[];
}
```

#### **Interfaces Principales (`src/interfaces/`)**
```typescript
// src/interfaces/IPlugin.ts
export interface IPlugin {
  config: PluginConfig;
  execute(message: MessageData, context: ContextData | null, bot: DrasBot): Promise<PluginResponse>;
  validate?(message: MessageData, context: ContextData | null): boolean;
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
}
```

```typescript
// src/interfaces/IContext.ts
export interface IContextHandler {
  name: string;
  handle(message: MessageData, context: ContextData, bot: DrasBot): Promise<ContextResponse>;
  validateStep?(step: string, data: any): boolean;
  onTimeout?(context: ContextData): Promise<void>;
}
```

#### **Bot Principal (`src/core/bot.ts`)**
```typescript
import { MessageData, BotConfig, UserData, ContextData } from '../types';
import { IPlugin, IContextHandler } from '../interfaces';
import { ContextManager } from './context-manager';
import { MessageProcessor } from './message-processor';
import { PluginLoader } from './plugin-loader';
import { ConfigService } from '../services/config.service';

export class DrasBot {
  private contextManager: ContextManager;
  private messageProcessor: MessageProcessor;
  private pluginLoader: PluginLoader;
  private configService: ConfigService;
  private config: BotConfig;

  constructor() {
    this.configService = new ConfigService();
    this.config = this.configService.getBotConfig();
    this.contextManager = new ContextManager();
    this.messageProcessor = new MessageProcessor(this);
    this.pluginLoader = new PluginLoader(this);
  }

  async start(): Promise<void> {
    console.log(`🚀 Iniciando ${this.config.name}...`);
    
    await this.initializeWhatsApp();
    await this.messageProcessor.initialize(); // Inicializar procesador y cargar plugins
    await this.startWebPanel();
    
    console.log('✅ DrasBot 3.0 iniciado correctamente');
  }

  async processMessage(message: MessageData): Promise<void> {
    try {
      const context = await this.contextManager.getContext(message.from);
      const response = await this.messageProcessor.process(message, context);
      
      if (response.shouldReply) {
        await this.sendResponse(message.from, response.text);
      }

      if (response.context) {
        await this.contextManager.setContext(message.from, response.context);
      } else if (response.context === null && context) {
        // Limpiar contexto si se especifica explícitamente
        await this.contextManager.clearContext(message.from);
      }

      // Ejecutar acciones adicionales si las hay
      if (response.actions) {
        await this.executeActions(response.actions, message);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      await this.handleError(message, error);
    }
  }

  // Métodos para gestión de comandos
  async getAvailableCommands(userLevel: string): Promise<any[]> {
    const allPlugins = this.pluginLoader.getCommandPlugins();
    return allPlugins.filter(plugin => 
      this.hasPermission(userLevel, plugin.config.permissions)
    ).map(plugin => ({
      name: plugin.config.name,
      triggers: plugin.config.triggers,
      description: plugin.config.description,
      usage: plugin.config.usage
    }));
  }

  async getCommand(commandName: string): Promise<any | null> {
    const plugin = this.pluginLoader.getPluginByName(commandName);
    return plugin ? plugin.config : null;
  }

  hasPermission(userLevel: string, requiredPermissions: string[]): boolean {
    // Jerarquía de permisos
    const hierarchy = {
      'guest': 0,
      'user': 1, 
      'premium': 2,
      'admin': 3
    };

    const userLevelValue = hierarchy[userLevel as keyof typeof hierarchy] || 0;
    
    // Admin tiene acceso a todo
    if (userLevel === 'admin') return true;
    
    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    return requiredPermissions.some(permission => {
      if (permission === '*') return userLevel === 'admin';
      const permissionValue = hierarchy[permission as keyof typeof hierarchy] || 0;
      return userLevelValue >= permissionValue;
    });
  }

  async registerUser(userData: any): Promise<void> {
    // Implementar registro de usuario en base de datos
    console.log('Registrando usuario:', userData);
  }

  async getUser(phone: string): Promise<any> {
    // Implementar obtención de usuario de base de datos
    return {
      phone,
      name: 'Usuario',
      level: 'user',
      registeredAt: new Date(),
      lastActive: new Date(),
      totalMessages: 0
    };
  }

  getTemplate(path: string, variables: Record<string, any> = {}): string {
    return this.configService.getTemplate(path, variables);
  }

  getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private async initializeWhatsApp(): Promise<void> {
    // Implementar inicialización de WhatsApp Web.js
  }

  private async startWebPanel(): Promise<void> {
    // Implementar servidor web para panel administrativo
  }

  private async sendResponse(to: string, message: string): Promise<void> {
    // Implementar envío de mensaje via WhatsApp
  }

  private async executeActions(actions: any[], message: MessageData): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'save_user':
          await this.registerUser(action.data);
          break;
        case 'send_notification':
          await this.sendNotification(action.data);
          break;
        case 'set_timer':
          await this.setTimer(action.data);
          break;
        default:
          console.warn(`Acción desconocida: ${action.type}`);
      }
    }
  }

  private async sendNotification(data: any): Promise<void> {
    // Implementar sistema de notificaciones
    console.log('Enviando notificación:', data);
  }

  private async setTimer(data: any): Promise<void> {
    // Implementar sistema de timers
    console.log('Configurando timer:', data);
  }

  private async handleError(message: MessageData, error: Error): Promise<void> {
    const errorMessage = this.getTemplate('errors.system_error', {
      userId: message.from
    });
    await this.sendResponse(message.from, errorMessage);
  }
}
}
```

#### **Context Manager (`src/core/context-manager.ts`)**
```typescript
import { ContextData, UserData } from '../types';
import { DatabaseService } from '../services/database.service';

export class ContextManager {
  private contexts: Map<string, ContextData> = new Map();
  private database: DatabaseService;
  private readonly CONTEXT_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.database = new DatabaseService();
    this.startCleanupTimer();
  }

  async getContext(userId: string): Promise<ContextData | null> {
    // Verificar en memoria primero
    if (this.contexts.has(userId)) {
      const context = this.contexts.get(userId)!;
      
      // Verificar si ha expirado
      if (context.expiresAt && Date.now() > context.expiresAt) {
        await this.clearContext(userId);
        return null;
      }
      
      return context;
    }

    // Si no está en memoria, verificar en base de datos
    return await this.database.getContext(userId);
  }

  async setContext(userId: string, contextData: Partial<ContextData>): Promise<ContextData> {
    const context: ContextData = {
      userId,
      type: contextData.type || 'default',
      step: contextData.step || 'start',
      data: contextData.data || {},
      timestamp: Date.now(),
      messageCount: (contextData.messageCount || 0) + 1,
      expiresAt: Date.now() + this.CONTEXT_TIMEOUT,
      ...contextData
    };

    // Guardar en memoria y base de datos
    this.contexts.set(userId, context);
    await this.database.saveContext(context);
    
    return context;
  }

  async clearContext(userId: string): Promise<void> {
    this.contexts.delete(userId);
    await this.database.deleteContext(userId);
  }

  async updateContextData(userId: string, data: Record<string, any>): Promise<void> {
    const context = await this.getContext(userId);
    if (context) {
      context.data = { ...context.data, ...data };
      await this.setContext(userId, context);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredContexts();
    }, 60000); // Limpiar cada minuto
  }

  private async cleanupExpiredContexts(): Promise<void> {
    const now = Date.now();
    const expiredContexts: string[] = [];

    for (const [userId, context] of this.contexts.entries()) {
      if (context.expiresAt && now > context.expiresAt) {
        expiredContexts.push(userId);
      }
    }

    for (const userId of expiredContexts) {
      await this.clearContext(userId);
    }
  }

  async handleGlobalCommand(
    message: MessageData, 
    command: string, 
    currentContext: ContextData | null
  ): Promise<ContextResponse> {
    
    switch (command) {
      case '/pause':
        return this.pauseContext(message, currentContext);
      case '/resume':
        return this.resumeContext(message);
      case '/status':
        return this.showContextStatus(message, currentContext);
      case '/back':
        return this.goBackStep(message, currentContext);
      case '/reset':
        return this.resetContext(message, currentContext);
      default:
        return null; // No es un comando global
    }
  }

  private async pauseContext(
    message: MessageData, 
    context: ContextData | null
  ): Promise<ContextResponse> {
    if (!context || context.type === 'default') {
      return {
        text: "❌ No hay ningún proceso activo para pausar.",
        context: null
      };
    }

    // Guardar estado de pausa
    const pausedContext = {
      ...context,
      status: 'paused',
      pausedAt: Date.now(),
      pausedStep: context.step
    };

    await this.setContext(message.from, pausedContext);

    return {
      text: `⏸️ **Proceso pausado**
             
             📋 Contexto: ${context.type}
             📍 Paso actual: ${context.step}
             💾 Estado guardado
             
             💡 Usa /resume para continuar
             📞 Puedes usar otros comandos normalmente`,
      context: {
        userId: message.from,
        type: 'default',
        step: 'idle',
        data: {},
        timestamp: Date.now()
      }
    };
  }

  private async resumeContext(message: MessageData): Promise<ContextResponse> {
    const pausedContext = await this.getPausedContext(message.from);
    
    if (!pausedContext) {
      return {
        text: "❌ No hay ningún proceso pausado para reanudar.",
        context: null
      };
    }

    // Restaurar contexto
    const resumedContext = {
      ...pausedContext,
      status: 'active',
      resumedAt: Date.now(),
      step: pausedContext.pausedStep
    };

    const pauseDuration = Math.round((Date.now() - pausedContext.pausedAt) / 1000 / 60);

    return {
      text: `▶️ **Proceso reanudado**
             
             📋 Contexto: ${pausedContext.type}
             📍 Continuando desde: ${pausedContext.pausedStep}
             ⏱️ Pausado por: ${pauseDuration} minutos
             
             🔄 Continuemos donde lo dejamos...`,
      context: resumedContext
    };
  }

  private async goBackStep(
    message: MessageData, 
    context: ContextData | null
  ): Promise<ContextResponse> {
    if (!context || !context.data.stepHistory) {
      return {
        text: "❌ No se puede retroceder desde este punto.",
        context: context
      };
    }

    const history = context.data.stepHistory;
    const previousStep = history[history.length - 2]; // Paso anterior

    if (!previousStep) {
      return {
        text: "❌ Ya estás en el primer paso del proceso.",
        context: context
      };
    }

    const revertedContext = {
      ...context,
      step: previousStep.step,
      data: {
        ...previousStep.data,
        stepHistory: history.slice(0, -1) // Remover último paso
      }
    };

    return {
      text: `⬅️ **Retrocediendo un paso**
             
             📍 Volviendo a: ${previousStep.step}
             🔄 Puedes continuar desde aquí`,
      context: revertedContext
    };
  }
}
```

### 2. **Sistema de Plugins**

#### **Estructura de Plugin de Comando**
```typescript
// src/plugins/commands/help.ts
import { IPlugin } from '../../interfaces/IPlugin';
import { MessageData, ContextData, PluginConfig, PluginResponse } from '../../types';
import { DrasBot } from '../../core/bot';

export class HelpCommand implements IPlugin {
  readonly config: PluginConfig = {
    name: 'help',
    version: '1.0.0',
    type: 'command',
    triggers: ['/help', '!help', 'ayuda'],
    permissions: ['user', 'premium', 'admin'],
    enabled: true,
    description: 'Muestra la ayuda del sistema',
    usage: '/help [comando]',
    examples: ['/help', '/help config']
  };

  async execute(
    message: MessageData, 
    context: ContextData | null, 
    bot: DrasBot
  ): Promise<PluginResponse> {
    const args = message.body.split(' ').slice(1);
    const user = await bot.getUser(message.from);
    
    if (args.length === 0) {
      return this.showGeneralHelp(user, bot);
    }
    
    return this.showCommandHelp(args[0], user, bot);
  }

  private async showGeneralHelp(user: any, bot: DrasBot): Promise<PluginResponse> {
    const availableCommands = await bot.getAvailableCommands(user.level);
    const commandList = availableCommands.map(cmd => `• ${cmd.name} - ${cmd.description}`).join('\n');
    
    const helpText = bot.getTemplate('help.main', {
      botName: bot.config.name,
      userName: user.name,
      userLevel: user.level,
      commandList
    });

    return {
      text: helpText,
      context: null,
      shouldReply: true
    };
  }

  private async showCommandHelp(commandName: string, user: any, bot: DrasBot): Promise<PluginResponse> {
    const command = await bot.getCommand(commandName);
    
    if (!command) {
      const errorText = bot.getTemplate('help.command_not_found', { command: commandName });
      return {
        text: errorText,
        context: null,
        shouldReply: true
      };
    }

    if (!bot.hasPermission(user.level, command.permissions)) {
      const errorText = bot.getTemplate('help.no_permissions');
      return {
        text: errorText,
        context: null,
        shouldReply: true
      };
    }

    const helpText = bot.getTemplate('help.command_detail', {
      name: command.name,
      description: command.description,
      usage: command.usage,
      examples: command.examples.join('\n• ')
    });

    return {
      text: helpText,
      context: null,
      shouldReply: true
    };
  }

  async onLoad(): Promise<void> {
    console.log('✅ Plugin Help cargado');
  }

  async onUnload(): Promise<void> {
    console.log('❌ Plugin Help descargado');
  }
}
```

#### **Plugin de Contexto**
```typescript
// src/plugins/context/registration.ts
import { IContextHandler } from '../../interfaces/IContext';
import { MessageData, ContextData, ContextResponse } from '../../types';
import { DrasBot } from '../../core/bot';

export class RegistrationContext implements IContextHandler {
  readonly name = 'registration';

  async handle(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const step = context.step || 'start';
    
    switch (step) {
      case 'start':
        return this.requestName(message, context, bot);
      case 'waiting_name':
        return this.processName(message, context, bot);
      case 'complete':
        return this.completeRegistration(message, context, bot);
      default:
        throw new Error(`Paso desconocido en registro: ${step}`);
    }
  }

  private async requestName(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const timeGreeting = this.getTimeGreeting(bot.getTimeOfDay());
    const text = bot.getTemplate('registration.request_name', { timeGreeting });
    
    return {
      text,
      context: {
        ...context,
        step: 'waiting_name',
        data: { ...context.data, startTime: Date.now() }
      }
    };
  }

  private async processName(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const name = message.body.trim();
    const validation = this.validateName(name);
    
    if (!validation.isValid) {
      const errorText = bot.getTemplate(`registration.${validation.error}`, { name });
      return {
        text: errorText,
        context: context // Mantener el mismo contexto para reintentar
      };
    }

    // Nombre válido, proceder al registro
    await bot.registerUser({
      phone: message.from,
      name: name,
      level: 'user',
      registeredAt: new Date()
    });

    const successText = bot.getTemplate('registration.name_accepted', { userName: name });
    
    return {
      text: successText,
      context: {
        ...context,
        step: 'complete',
        data: { ...context.data, userName: name }
      },
      actions: [{
        type: 'save_user',
        data: { name, phone: message.from }
      }]
    };
  }

  private async completeRegistration(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    // Registro completado, limpiar contexto
    return {
      text: bot.getTemplate('registration.welcome_complete', {
        userName: context.data.userName
      }),
      context: null // Limpiar contexto
    };
  }

  validateStep(step: string, data: any): boolean {
    const validSteps = ['start', 'waiting_name', 'complete'];
    return validSteps.includes(step);
  }

  async onTimeout(context: ContextData): Promise<void> {
    console.log(`Timeout en registro para usuario ${context.userId}`);
    // Notificar timeout si es necesario
  }

  private validateName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.length < 2) {
      return { isValid: false, error: 'name_too_short' };
    }
    
    if (name.length > 50) {
      return { isValid: false, error: 'name_too_long' };
    }
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
      return { isValid: false, error: 'name_invalid' };
    }
    
    return { isValid: true };
  }

  private getTimeGreeting(timeOfDay: string): string {
    const greetings = {
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches'
    };
    return greetings[timeOfDay as keyof typeof greetings] || 'Hola';
  }
}
```

### 3. **Sistema de Configuración**

#### **Mensajes (`config/messages/es.json`)**
```json
{
  "greetings": {
    "new_user": [
      "¡Hola {userName}! 👋 Bienvenido/a a {botName}",
      "¡{timeGreeting} {userName}! Es un placer conocerte",
      "¡Hola! 😊 Soy {botName}, tu asistente virtual"
    ],
    "returning_user": [
      "¡Hola de nuevo {userName}! 👋",
      "¡{timeGreeting} {userName}! ¿En qué puedo ayudarte?",
      "¡Qué bueno verte otra vez {userName}! 😊"
    ]
  },
  "registration": {
    "request_name": "¡{timeGreeting}! Para comenzar, ¿cómo te gustaría que te llame?",
    "name_accepted": "¡Perfecto {userName}! Ya estás registrado/a en el sistema",
    "name_too_short": "El nombre es muy corto. ¿Podrías decirme un nombre de al menos 2 caracteres?",
    "name_invalid": "Por favor, usa solo letras para tu nombre. ¿Cómo te llamas?"
  },
  "help": {
    "main": "🤖 **{botName} - Ayuda**\n\n📋 Comandos disponibles para {userLevel}:\n{commandList}\n\n💡 Usa `/help [comando]` para más información",
    "command_not_found": "❌ No encontré información sobre el comando '{command}'",
    "no_permissions": "❌ No tienes permisos para ver la ayuda de este comando"
  },
  "errors": {
    "unknown_command": "❌ Comando no reconocido: {command}",
    "no_permissions": "❌ No tienes permisos para usar este comando",
    "system_error": "❌ Error del sistema. Por favor, inténtalo más tarde"
  },
  "farewells": {
    "new_user": [
      "¡Hasta pronto! Fue un placer conocerte 👋",
      "¡Que tengas un buen día! Aquí estaré cuando necesites ayuda 😊",
      "¡Adiós! No dudes en escribirme si necesitas algo 🤖"
    ],
    "regular_user": [
      "¡Hasta luego, {userName}! Que tengas un excelente día 😊",
      "¡Nos vemos pronto, {userName}! Cuídate mucho 👋",
      "¡Adiós, {userName}! Fue genial conversar contigo ✨"
    ]
  },
  "survey": {
    "welcome": "¡Hola {userName}! 📊 Nos ayudarías mucho con una encuesta rápida.\n\n❓ **¿Cómo calificarías tu experiencia con el bot?**\n📱 Escribe un número del 1 al 10:\n• 1 = Muy malo\n• 10 = Excelente",
    
    "invalid_rating": "🔢 Por favor, escribe solo un número del 1 al 10.\n\nEjemplo: 8",
    
    "feedback_request": "¡Gracias por calificar con {rating}! ⭐\n\n💬 **¿Tienes algún comentario o sugerencia?**\n\n✏️ Escribe tu feedback o 'omitir' para continuar:",
    
    "thank_you": "🙏 ¡Muchas gracias por tu calificación de {rating} y tus comentarios!\n\nTu feedback nos ayuda a mejorar constantemente. 🚀",
    
    "thank_you_no_feedback": "🙏 ¡Gracias por tu calificación!\n\nTu opinión es muy valiosa para nosotros. 😊"
  },
  "confirmation": {
    "delete_warning": "⚠️ **Advertencia de Eliminación**\n\nEstás a punto de realizar la siguiente operación: **{operation}**\n\nObjetivo: **{target}**\nDetalles: **{details}**\n\n⏱️ Esta acción expira en 30 segundos\n\n✅ Escribe 'confirmar' para proceder\n❌ Escribe 'cancelar' para abortar",
    "success": "✅ **Operación Completada**\n\nLa operación **{operation}** sobre **{target}** se ha completado exitosamente.\n\nDetalles: {details}\n\n🕐 Fecha y hora: {timestamp}",
    "error": "❌ Ocurrió un error al procesar la operación: {error}",
    "cancelled": "❌ La operación **{operation}** sobre **{target}** ha sido cancelada.",
    "invalid_response": "❌ Respuesta inválida. Por favor, responde con 'sí' o 'no'.\n\nOpciones válidas: {validOptions}"
  },
  "weather": {
    "request_location": "🌍 Para darte el clima actual, necesito saber tu ubicación.\n\n📍 **¿En qué ciudad te encuentras?**\n\n💡 Ejemplos: Madrid, Lima, Buenos Aires, Ciudad de México",
    "confirm_old_location": "📍 He encontrado una ubicación guardada:\n\n🏙️ Ciudad: {city}\n🌎 País: {country}\n📅 Última actualización: hace {daysAgo} días\n\n✅ ¿Deseas usar esta ubicación? (sí/no)",
    "location_not_found": "❌ No pude encontrar la ubicación '{input}'.\n\n{suggestions}",
    "invalid_confirmation": "❌ Respuesta inválida. Por favor, responde con 'sí' o 'no'.",
    "current_weather": "🌤️ **Clima Actual en {city}, {country}**\n\n🌡️ Temperatura: {temperature}°C (Se siente como {feelsLike}°C)\n☁️ Condición: {description}\n💧 Humedad: {humidity}%\n💨 Viento: {windSpeed} km/h",
    "forecast": "📅 **Pronóstico para los próximos días:**\n{forecast}",
    "geocoding_error": "❌ Ocurrió un error al obtener la ubicación. Por favor, intenta nuevamente.",
    "api_error": "❌ No pude obtener los datos del clima para {city}. Error: {error}"
  }
}
```

#### **Configuración de Contextos (`config/contexts/registration.json`)**
```json
{
  "name": "registration",
  "description": "Proceso de registro de nuevos usuarios",
  "triggers": ["new_user", "registro", "/register"],
  "steps": [
    {
      "name": "start",
      "message_template": "registration.request_name",
      "next_step": "waiting_name"
    },
    {
      "name": "waiting_name",
      "validation": {
        "min_length": 2,
        "max_length": 50,
        "pattern": "^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"
      },
      "success_template": "registration.name_accepted",
      "error_template": "registration.name_invalid",
      "next_step": "complete"
    },
    {
      "name": "complete",
      "action": "save_user",
      "context_clear": true
    }
  ],
  "timeout": 300000,
  "cleanup_on_timeout": true
}
```

#### **Configuración de Contextos (`config/contexts/survey.json`)**
```json
{
  "name": "survey",
  "description": "Contexto para encuestas de satisfacción",
  "timeout": 300000,
  "steps": {
    "start": {
      "description": "Inicio de la encuesta",
      "next_steps": ["rating"]
    },
    "rating": {
      "description": "Calificación del 1 al 10",
      "validation": "number_1_to_10",
      "next_steps": ["feedback"]
    },
    "feedback": {
      "description": "Comentarios opcionales",
      "validation": "optional_text",
      "next_steps": ["complete"]
    },
    "complete": {
      "description": "Encuesta completada",
      "final_step": true
    }
  },
  "triggers": {
    "auto": {
      "after_commands": ["help", "info"],
      "probability": 0.1,
      "cooldown": 86400000
    },
    "manual": {
      "command": "/feedback",
      "admin_trigger": "/survey [user]"
    }
  }
}
```

#### **Niveles de Usuario (`config/user-levels.json`)**
```json
{
  "guest": {
    "name": "Invitado",
    "permissions": ["help", "info"],
    "auto_register": true
  },
  "user": {
    "name": "Usuario",
    "permissions": ["help", "info", "status", "profile"],
    "daily_limits": {
      "messages": 100,
      "commands": 50
    }
  },
  "premium": {
    "name": "Usuario Premium",
    "permissions": ["help", "info", "status", "profile", "advanced"],
    "daily_limits": {
      "messages": 500,
      "commands": 200
    }
  },
  "admin": {
    "name": "Administrador",
    "permissions": ["*"],
    "daily_limits": null
  }
}
```

---

## 🎮 Gestión de Comandos Existentes

### 📋 Comandos Administrativos del Bot

DrasBot 3.0 incluye comandos integrados para gestionar el sistema sin necesidad de tocar código:

#### **1. Comandos de Información**
```
/commands                    # Lista todos los comandos disponibles
/commands detail             # Lista comandos con descripción completa
/commands <nombre>           # Información detallada de un comando específico
/plugins                     # Lista todos los plugins cargados
/plugins status              # Estado de cada plugin (habilitado/deshabilitado)
```

#### **2. Comandos de Gestión de Plugins**
```
/plugin enable <nombre>      # Habilitar un plugin específico
/plugin disable <nombre>     # Deshabilitar un plugin específico
/plugin reload <nombre>      # Recargar un plugin específico
/plugin reload all           # Recargar todos los plugins
/plugin info <nombre>        # Información detallada del plugin
```

#### **3. Comandos de Configuración**
```
/config show                 # Mostrar configuración actual
/config set <clave> <valor>  # Cambiar configuración
/config reload               # Recargar configuración desde archivos
/config backup               # Crear respaldo de configuración
```

#### **4. Comandos de Usuarios**
```
/users list                  # Lista de usuarios registrados
/users info <número>         # Información de usuario específico
/users promote <número>      # Promover nivel de usuario
/users demote <número>       # Degradar nivel de usuario
/users ban <número>          # Banear usuario
/users unban <número>        # Desbanear usuario
```

#### **5. Comandos de Sistema**
```
/system status               # Estado del sistema
/system restart              # Reiniciar bot (solo super admin)
/system logs                 # Ver logs recientes
/system backup               # Crear respaldo completo
/system update               # Actualizar sistema
```

---

## 📖 Casos de Uso Comunes

#### **Caso 1: Usuario Nuevo Pregunta por Comandos**
```
Usuario: "Hola, ¿qué puedo hacer aquí?"
Bot: "¡Hola! 👋 Soy DrasBot. Usa /help para ver todos los comandos disponibles."

Usuario: "/help"
Bot: "🤖 Comandos Disponibles:
      • /info - Información del bot
      • /register - Registrarte en el sistema  
      • /help <comando> - Ayuda específica
      
      ¿Necesitas ayuda con algo específico?"
```

#### **Caso 2: Administrador Gestiona Usuario Problemático**
```
Admin: "/users info 51912345678"
Bot: "👤 Usuario: Juan Pérez
      📱 Número: +51912345678
      🎭 Nivel: user
      📊 Comandos usados hoy: 45
      ⚠️ Reportes: 2"

Admin: "/users demote 51912345678" 
Bot: "✅ Usuario degradado a nivel 'guest'"

Admin: "/plugin disable help" # Temporalmente
Bot: "⏸️ Comando 'help' deshabilitado"
```

#### **Caso 3: Modificar Respuestas del Bot**
```
# El administrador quiere cambiar el saludo
1. Edita config/messages/es.json
2. Cambia: "greetings.new_user": "¡Bienvenido a DrasBot! 🚀"
3. Ejecuta: /config reload
4. Bot aplica cambios inmediatamente
```

#### **Caso 4: Agregar Nuevo Comando Personalizado**
```
# Para usuarios técnicos
1. Crear archivo: src/plugins/commands/clima.ts
2. Implementar IPlugin interface
3. Configurar en: config/plugins-config.json  
4. Ejecutar: /plugin reload clima
5. Comando disponible inmediatamente
```

#### **Caso 5: Mantenimiento Programado**
```
Admin: "/system backup"
Bot: "💾 Respaldo creado exitosamente"

Admin: "/config set maintenance_mode true"
Bot: "🔧 Modo mantenimiento activado"

# Realizar actualizaciones...

Admin: "/config set maintenance_mode false"
Bot: "✅ Sistema listo para uso normal"
```

---

## 🔧 Ejemplo Práctico: Agregar Nuevo Contexto "Encuesta de Satisfacción"

Esta es otra demostración de la **extensibilidad sin impacto** del sistema diseñado. Para agregar un contexto completamente nuevo, solo necesitarías crear **archivos nuevos** sin tocar código existente:

#### **📋 Archivos Nuevos a Crear (Zero Modificaciones a Existentes):**

**1. `src/plugins/context/survey.ts` (Nuevo archivo)**
```typescript
import { IContextHandler } from '../../interfaces/IContext';
import { MessageData, ContextData, ContextResponse } from '../../types';
import { DrasBot } from '../../core/bot';

export class SurveyContext implements IContextHandler {
  readonly name = 'survey';

  async handle(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const step = context.step || 'start';
    
    switch (step) {
      case 'start':
        return this.startSurvey(message, context, bot);
      case 'rating':
        return this.processRating(message, context, bot);
      case 'feedback':
        return this.processFeedback(message, context, bot);
      case 'complete':
        return this.completeSurvey(message, context, bot);
      default:
        throw new Error(`Paso desconocido en encuesta: ${step}`);
    }
  }

  private async startSurvey(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const user = await bot.getUser(message.from);
    const text = bot.getTemplate('survey.welcome', { 
      userName: user?.name || 'amigo' 
    });
    
    return {
      text,
      context: {
        ...context,
        step: 'rating',
        data: { 
          startTime: Date.now(),
          userId: message.from
        }
      }
    };
  }

  private async processRating(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const rating = this.parseRating(message.body);
    
    if (!rating) {
      return {
        text: bot.getTemplate('survey.invalid_rating'),
        context: context // Mantener paso actual para reintentar
      };
    }

    const text = bot.getTemplate('survey.feedback_request', { rating });
    
    return {
      text,
      context: {
        ...context,
        step: 'feedback',
        data: {
          ...context.data,
          rating,
          ratingTime: Date.now()
        }
      }
    };
  }

  private async processFeedback(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    const feedback = message.body.trim();
    
    if (feedback.toLowerCase() === 'omitir') {
      return this.completeSurvey(message, context, bot);
    }

    // Guardar encuesta completa
    await this.saveSurveyResult({
      userId: message.from,
      rating: context.data.rating,
      feedback: feedback,
      startTime: context.data.startTime,
      completedAt: new Date()
    });

    const successText = bot.getTemplate('survey.thank_you', {
      rating: context.data.rating
    });

    return {
      text: successText,
      context: null // Finalizar contexto
    };
  }

  private async completeSurvey(
    message: MessageData, 
    context: ContextData, 
    bot: DrasBot
  ): Promise<ContextResponse> {
    // Guardar solo rating sin feedback
    await this.saveSurveyResult({
      userId: message.from,
      rating: context.data.rating,
      feedback: null,
      startTime: context.data.startTime,
      completedAt: new Date()
    });

    return {
      text: bot.getTemplate('survey.thank_you_no_feedback'),
      context: null // Finalizar contexto
    };
  }

  private parseRating(text: string): number | null {
    const num = parseInt(text.trim());
    return (num >= 1 && num <= 10) ? num : null;
  }

  private async saveSurveyResult(data: any): Promise<void> {
    // Implementar guardado en base de datos
    console.log('Guardando resultado de encuesta:', data);
  }

  validateStep(step: string, data: any): boolean {
    const validSteps = ['start', 'rating', 'feedback', 'complete'];
    return validSteps.includes(step);
  }

  async onTimeout(context: ContextData): Promise<void> {
    console.log(`Timeout en encuesta para usuario ${context.userId}`);
    // Guardar encuesta parcial si es necesario
  }
}
```

**2. `config/contexts/survey.json` (Nuevo archivo)**
```json
{
  "name": "survey",
  "description": "Contexto para encuestas de satisfacción",
  "timeout": 300000,
  "steps": {
    "start": {
      "description": "Inicio de la encuesta",
      "next_steps": ["rating"]
    },
    "rating": {
      "description": "Calificación del 1 al 10",
      "validation": "number_1_to_10",
      "next_steps": ["feedback"]
    },
    "feedback": {
      "description": "Comentarios opcionales",
      "validation": "optional_text",
      "next_steps": ["complete"]
    },
    "complete": {
      "description": "Encuesta completada",
      "final_step": true
    }
  },
  "triggers": {
    "auto": {
      "after_commands": ["help", "info"],
      "probability": 0.1,
      "cooldown": 86400000
    },
    "manual": {
      "command": "/feedback",
      "admin_trigger": "/survey [user]"
    }
  }
}
```

**3. Agregar templates en `config/messages/es.json`**
```json
{
  // ...existing messages...
  "survey": {
    "welcome": "¡Hola {userName}! 📊 Nos ayudarías mucho con una encuesta rápida.\n\n❓ **¿Cómo calificarías tu experiencia con el bot?**\n📱 Escribe un número del 1 al 10:\n• 1 = Muy malo\n• 10 = Excelente",
    
    "invalid_rating": "🔢 Por favor, escribe solo un número del 1 al 10.\n\nEjemplo: 8",
    
    "feedback_request": "¡Gracias por calificar con {rating}! ⭐\n\n💬 **¿Tienes algún comentario o sugerencia?**\n\n✏️ Escribe tu feedback o 'omitir' para continuar:",
    
    "thank_you": "🙏 ¡Muchas gracias por tu calificación de {rating} y tus comentarios!\n\nTu feedback nos ayuda a mejorar constantemente. 🚀",
    
    "thank_you_no_feedback": "🙏 ¡Gracias por tu calificación!\n\nTu opinión es muy valiosa para nosotros. 😊"
  }
}
```

---

## 🎯 Nuevas Funcionalidades y Ejemplos Prácticos

### 1. **Sistema de Puntos/Gamificación**

#### **Descripción:**
Un sistema que otorga puntos a los usuarios por interacciones, que pueden ser canjeados por recompensas.

#### **Implementación:**

**1.1. Servicio de Puntos (`src/plugins/gamification/points.service.ts`)**
```typescript
interface UserPoints {
  totalPoints: number;
  level: number;
  badges: string[];
  streakDays: number;
  lastActivity: Date;
  pointsHistory: PointsTransaction[];
}

interface PointsTransaction {
  action: string;
  points: number;
  reason: string;
  timestamp: Date;
}

export class PointsService {
  constructor(private db: DatabaseService) {}

  async addPoints(userId: string, points: number, reason: string): Promise<UserPoints> {
    // Obtener puntos actuales
    const currentData = await this.db.getPluginData<UserPoints>(
      'gamification', userId, 'points'
    );
    
    const current = currentData[0] || {
      totalPoints: 0,
      level: 1,
      badges: [],
      streakDays: 0,
      lastActivity: new Date(),
      pointsHistory: []
    };

    // Calcular nuevos puntos
    const newTotal = current.totalPoints + points;
    const newLevel = Math.floor(newTotal / 100) + 1;
    
    // Determinar nuevos badges
    const badges = this.calculateBadges(newTotal, current.pointsHistory);
    
    const updatedData: UserPoints = {
      ...current,
      totalPoints: newTotal,
      level: newLevel,
      badges,
      pointsHistory: [
        ...current.pointsHistory,
        {
          action: 'add',
          points,
          reason,
          timestamp: new Date()
        }
      ].slice(-50) // Mantener solo últimas 50 transacciones
    };

    // Guardar en plugin_data
    await this.db.savePluginData('gamification', userId, 'points', updatedData);
    
    return updatedData;
  }

  async getUserPoints(userId: string): Promise<UserPoints | null> {
    const data = await this.db.getPluginData<UserPoints>(
      'gamification', userId, 'points'
    );
    return data[0] || null;
  }
}

// Uso en comandos:
Usuario: "/help"
Bot: "Aquí tienes la ayuda... [+5 puntos por usar ayuda]"
// addPoints(userId, 5, 'used_help_command')

Usuario: "/points"
Bot: "🏆 **Tu Progreso**
     ⭐ Puntos: 285
     🎖️ Nivel: 3
     🏅 Badges: Principiante, Explorador, Preguntón
     🔥 Racha: 7 días consecutivos"
```

### 2. **Sistema de Recordatorios/Tareas**

#### **Descripción:**
Permite a los usuarios crear recordatorios que el bot enviará en el momento programado.

#### **Implementación:**

**2.1. Tipos y Servicio de Recordatorios (`src/plugins/reminders/reminder.types.ts`, `src/plugins/reminders/reminder.service.ts`)**
```typescript
interface Reminder {
  id: string;
  title: string;
  description: string;
  scheduledFor: Date;
  recurring: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  category: string;
  priority: 'low' | 'medium' | 'high';
  metadata: Record<string, any>;
}

interface ReminderLog {
  id: string;
  reminderId: string;
  sentAt: Date;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  userResponse?: string;
}

export class ReminderService {
  constructor(private db: DatabaseService) {}

  async createReminder(data: {
    userId: string;
    title: string;
    description?: string;
    scheduledAt: Date;
    recurrence?: {
      enabled: boolean;
      pattern: 'daily' | 'weekly' | 'monthly';
      interval: number;
    };
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    metadata?: Record<string, any>;
  }): Promise<Reminder> {
    
    const reminder: Reminder = {
      id: this.generateId(),
      title: data.title,
      description: data.description || '',
      scheduledFor: data.scheduledAt,
      recurring: data.recurrence || { enabled: false, pattern: 'daily', interval: 1 },
      status: 'pending',
      category: data.category || 'general',
      priority: data.priority || 'medium',
      metadata: data.metadata || {}
    };

    await this.db.savePluginData('reminders', data.userId, 'reminder', reminder);
    
    // Programar el recordatorio en el sistema (ej. cron)
    await this.scheduleReminder(reminder);

    return reminder;
  }

  async getUserReminders(userId: string): Promise<Reminder[]> {
    return await this.db.getPluginData<Reminder>('reminders', userId, 'reminder');
  }

  async logReminderSent(reminderId: string, status: 'success' | 'failed', errorMessage?: string): Promise<void> {
    const log: ReminderLog = {
      id: this.generateId(),
      reminderId,
      sentAt: new Date(),
      status,
      errorMessage
    };

    await this.db.savePluginData('reminders', reminderId, 'log', log);
  }

  private async scheduleReminder(reminder: Reminder): Promise<void> {
    // Integrar con sistema de mensajería o notificaciones
    const messageService = DrasBot.getInstance().getMessageService();
    
    const message = `🔔 Recordatorio: ${reminder.title}\nDescripción: ${reminder.description || 'Sin descripción'}`;
    
    // Programar envío según la fecha y hora
    await messageService.scheduleMessage(reminder.userId, message, reminder.scheduledFor);
  }
}
```

### 3. **Analytics y Métricas Personalizadas**

#### **Descripción:**
Permite a los usuarios y administradores ver métricas personalizadas sobre el uso del bot y otros datos relevantes.

#### **Implementación:**

**3.1. Servicio de Métricas Personalizadas (`src/plugins/analytics/custom-metrics.ts`)**
```typescript
interface CustomMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  context?: string;
}

interface UserMetrics {
  dailyMetrics: CustomMetric[];
  weeklyAggregates: Record<string, number>;
  personalBests: Record<string, { value: number; date: Date }>;
  goals: UserGoal[];
}

interface UserGoal {
  metric: string;
  target: number;
  deadline: Date;
  current: number;
  status: 'active' | 'completed' | 'paused';
}

export class CustomMetricsService {
  async trackMetric(
    userId: string, 
    name: string, 
    value: number, 
    unit: string = '',
    tags: Record<string, string> = {}
  ): Promise<void> {
    const metric: CustomMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      context: tags.context || 'manual'
    };

    // Obtener métricas actuales
    const currentMetrics = await this.db.getPluginData<UserMetrics>(
      'analytics', userId, 'metrics'
    );
    const current = currentMetrics[0] || {
      dailyMetrics: [],
      weeklyAggregates: {},
      personalBests: {},
      goals: []
    };

    // Agregar nueva métrica
    current.dailyMetrics.push(metric);
    
    // Limpiar métricas antiguas (mantener solo últimos 30 días)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    current.dailyMetrics = current.dailyMetrics.filter(
      m => new Date(m.timestamp) > thirtyDaysAgo
    );

    // Actualizar récord personal si es necesario
    if (!current.personalBests[name] || value > current.personalBests[name].value) {
      current.personalBests[name] = { value, date: new Date() };
    }

    // Verificar progreso de metas
    this.updateGoalProgress(current.goals, name, value);

    await this.db.savePluginData('analytics', userId, 'metrics', current);
  }

  async generateReport(userId: string, period: 'week' | 'month'): Promise<string> {
    const metrics = await this.db.getPluginData<UserMetrics>('analytics', userId, 'metrics');
    if (!metrics[0]) return 'No hay datos disponibles.';

    const data = metrics[0];
    const report = this.formatMetricsReport(data, period);
    
    return report;
  }
}

// Uso:
Usuario: "/peso 75.2"
// trackMetric(userId, 'peso', 75.2, 'kg', { category: 'salud' })

Usuario: "/caminar 8500"
// trackMetric(userId, 'pasos', 8500, 'pasos', { activity: 'walking' })

Usuario: "/reporte semanal"
Bot: "📊 **Reporte Semanal**
     
     🏃‍♂️ **Actividad Física:**
     • Pasos promedio: 7,840 pasos/día
     • Meta semanal: 49,000 pasos ✅ (Completada)
     • Récord personal: 12,300 pasos (Lunes)
     
     ⚖️ **Peso:**
     • Promedio: 75.1 kg
     • Tendencia: -0.3 kg ⬇️
     • Meta mensual: 74.5 kg (progreso: 60%)
     
     🏆 **Logros:**
     • 🥇 Nuevo récord de pasos
     • 🎯 Meta de pasos completada 5/7 días
     • 📈 Tendencia positiva en peso"
```

### 4. **Sistema de Encuestas Dinámicas**

#### **Descripción:**
Permite crear encuestas personalizadas que los usuarios pueden completar, con análisis automático de resultados.

#### **Implementación:**

**4.1. Tipos y Servicio de Encuestas (`src/plugins/surveys/survey.types.ts`, `src/plugins/surveys/survey.service.ts`)**
```typescript
interface Survey {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  settings: SurveySettings;
  status: 'draft' | 'active' | 'closed';
  responses: SurveyResponse[];
  analytics: SurveyAnalytics;
}

interface SurveyQuestion {
  id: string;
  type: 'text' | 'number' | 'choice' | 'rating' | 'boolean';
  question: string;
  options?: string[];
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface SurveyResponse {
  userId: string;
  answers: Record<string, any>;
  startedAt: Date;
  completedAt: Date;
  timeSpent: number;
  metadata: Record<string, any>;
}

export class SurveyService {
  async createSurvey(adminUserId: string, surveyData: Partial<Survey>): Promise<string> {
    const survey: Survey = {
      id: this.generateId(),
      title: surveyData.title!,
      description: surveyData.description || '',
      questions: surveyData.questions || [],
      settings: surveyData.settings || {
        allowAnonymous: false,
        maxResponses: null,
        expiresAt: null
      },
      status: 'draft',
      responses: [],
      analytics: {
        totalViews: 0,
        totalStarted: 0,
        totalCompleted: 0,
        averageTime: 0,
        completionRate: 0
      }
    };

    await this.db.savePluginData('surveys', adminUserId, 'survey', survey);
    return survey.id;
  }

  async startSurveyForUser(surveyId: string, userId: string): Promise<SurveySession> {
    // Crear sesión de encuesta en contexto
    const session: SurveySession = {
      surveyId,
      userId,
      currentQuestion: 0,
      answers: {},
      startedAt: new Date(),
      status: 'in_progress'
    };

    await this.db.savePluginData('surveys', userId, 'session', session);
    
    return session;
  }
}

// Uso:
Admin: "/encuesta crear"
Bot: "📝 **Crear Nueva Encuesta**
     
     📋 Título: "

Admin: "Satisfacción del servicio"
Bot: "✅ Título: 'Satisfacción del servicio'
     
     📝 Descripción (opcional):"

Admin: "Queremos conocer tu opinión"
Bot: "✅ Descripción guardada.
     
     ❓ **Agregar Pregunta 1:**
     Tipos: texto/número/opción/rating/sí-no"

Admin: "rating ¿Qué tan satisfecho estás? 1-10"
Bot: "✅ Pregunta 1 agregada.
     
     ➕ ¿Agregar otra pregunta? (sí/no/publicar)"

Admin: "publicar"
Bot: "🚀 **Encuesta Publicada**
     
     📊 ID: SUR-2025-001
     👥 Link para usuarios: /encuesta SUR-2025-001
     📈 Panel admin: /encuesta admin SUR-2025-001"

Usuario: "/encuesta SUR-2025-001"
Bot: "📝 **Encuesta: Satisfacción del servicio**
     
     Queremos conocer tu opinión
     
     ❓ **Pregunta 1 de 3:**
     ⭐ ¿Qué tan satisfecho estás?
     
     📊 Escribe un número del 1 al 10:"
```

---

## 🔄 Gestión de Procesos y Deployment

### 🎯 Estrategia Híbrida de Gestión

DrasBot utiliza una **estrategia híbrida inteligente** para la gestión de procesos, combinando lo mejor de **PM2** y **tmux** según el contexto de uso:

```bash
# Arquitectura de dos servicios independientes
WhatsApp Bridge (Go) ←→ WhatsApp Chatbot (Node.js)
      Puerto 8080              Puerto 3000
```

### 📊 Comparación de Gestores de Procesos

| Característica | PM2 | tmux | Recomendación |
|---|---|---|---|
| **Auto-restart** | ✅ Automático | ❌ Manual | PM2 para producción |
| **QR Code visible** | ❌ Logs only | ✅ Terminal directo | tmux para setup |
| **Persistencia** | ✅ Sobrevive reinicio | ❌ Se pierde | PM2 para producción |
| **Debugging** | ⚠️ Menos directo | ✅ Tiempo real | tmux para desarrollo |
| **Monitoreo** | ✅ CPU/RAM/logs | ❌ Básico | PM2 para producción |
| **Gestión unificada** | ✅ Un comando | ❌ Comandos separados | PM2 para producción |

### 🛠️ Configuración PM2 Unificada

```javascript
// ecosystem.config.js - Configuración para ambos servicios
module.exports = {
  apps: [
    {
      name: "drasbot-bridge",
      script: "go",
      args: ["run", "main.go"],
      cwd: "./whatsapp-bridge",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        BRIDGE_PORT: "8080",
        BRIDGE_HOST: "127.0.0.1",
        LOG_LEVEL: "INFO"
      },
      env_development: {
        NODE_ENV: "development",
        LOG_LEVEL: "DEBUG"
      },
      // Configuración de logs
      log_file: "./logs/bridge-combined.log",
      out_file: "./logs/bridge-out.log",
      error_file: "./logs/bridge-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Configuración de reinicio inteligente
      min_uptime: "30s",
      max_restarts: 5,
      restart_delay: 10000, // 10 segundos entre reinicios
      // Configuración específica para Go
      interpreter: "none", // No usar Node.js para interpretar
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: "drasbot-chatbot",
      script: "./src/app.js",
      cwd: "./whatsapp-chatbot",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOST: "127.0.0.1",
        BRIDGE_URL: "http://127.0.0.1:8080",
        USE_NEW_COMMANDS: "true",
        COMMAND_PREFIX: "!",
        BOT_NAME: "DrasBot",
        POLLING_INTERVAL: "5000"
      },
      env_development: {
        NODE_ENV: "development",
        POLLING_INTERVAL: "3000",
        LOG_LEVEL: "DEBUG"
      },
      // Configuración de logs
      log_file: "./logs/chatbot-combined.log",
      out_file: "./logs/chatbot-out.log",
      error_file: "./logs/chatbot-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Configuración de reinicio
      min_uptime: "30s",
      max_restarts: 10,
      restart_delay: 5000,
    }
  ]
};
```

### 🚀 Script de Gestión Mejorado

```bash
#!/bin/bash
# manage.sh - Gestión híbrida inteligente

# Detectar modo de operación
detect_mode() {
    local bridge_session_exists=false
    local bridge_authenticated=false
    
    # Verificar si existe sesión de autenticación
    if [ -f "./whatsapp-bridge/store/device.db" ]; then
        bridge_authenticated=true
    fi
    
    # Verificar sesión tmux activa
    if command -v tmux &> /dev/null && tmux has-session -t drasbot-bridge 2>/dev/null; then
        bridge_session_exists=true
    fi
    
    # Lógica de detección
    if $bridge_authenticated && [ "$1" != "setup" ]; then
        echo "production"
    else
        echo "development"
    fi
}

# Modo Desarrollo/Setup (TMUX + PM2)
start_development() {
    echo -e "${BLUE}🔧 Iniciando en modo DESARROLLO${NC}"
    echo "=================================="
    
    # Detener PM2 del bridge si está corriendo
    pm2 delete drasbot-bridge 2>/dev/null || true
    
    # Iniciar bridge con tmux (para QR code)
    if ! tmux has-session -t drasbot-bridge 2>/dev/null; then
        echo -e "${BLUE}🌉 Iniciando bridge con tmux (QR visible)...${NC}"
        cd "$BRIDGE_DIR"
        tmux new-session -d -s drasbot-bridge "go run main.go"
        echo -e "${GREEN}✅ Bridge iniciado en tmux session 'drasbot-bridge'${NC}"
        echo -e "${CYAN}💡 Para ver/conectar: tmux attach -t drasbot-bridge${NC}"
    fi
    
    # Esperar que bridge esté listo
    wait_for_bridge_ready
    
    # Iniciar chatbot con PM2
    echo -e "${BLUE}🤖 Iniciando chatbot con PM2...${NC}"
    cd "$CHATBOT_DIR"
    pm2 start ecosystem.config.js --only drasbot-chatbot --env development
    
    echo ""
    echo -e "${GREEN}🎉 Sistema iniciado en modo DESARROLLO${NC}"
    echo -e "${YELLOW}📋 Configuración:${NC}"
    echo "   • Bridge: tmux (QR code visible)"
    echo "   • Chatbot: PM2 (auto-restart)"
    echo "   • Para ver bridge: tmux attach -t drasbot-bridge"
    echo "   • Para logs chatbot: pm2 logs drasbot-chatbot"
}

# Modo Producción (PM2 completo)
start_production() {
    echo -e "${BLUE}🚀 Iniciando en modo PRODUCCIÓN${NC}"
    echo "================================="
    
    # Detener tmux del bridge si está corriendo
    tmux kill-session -t drasbot-bridge 2>/dev/null || true
    
    # Verificar autenticación
    if [ ! -f "$BRIDGE_DIR/store/device.db" ]; then
        echo -e "${RED}❌ Bridge no autenticado${NC}"
        echo -e "${YELLOW}💡 Ejecuta './manage.sh setup' primero${NC}"
        return 1
    fi
    
    # Iniciar ambos servicios con PM2
    echo -e "${BLUE}🔄 Iniciando ecosistema completo con PM2...${NC}"
    cd "$SCRIPT_DIR"
    pm2 start ecosystem.config.js --env production
    
    # Verificar que ambos estén corriendo
    sleep 5
    local bridge_status=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-bridge") | .pm2_env.status' 2>/dev/null || echo "stopped")
    local chatbot_status=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-chatbot") | .pm2_env.status' 2>/dev/null || echo "stopped")
    
    echo ""
    echo -e "${GREEN}🎉 Sistema iniciado en modo PRODUCCIÓN${NC}"
    echo -e "${YELLOW}📋 Estado de servicios:${NC}"
    echo "   • Bridge: $bridge_status (PM2 auto-restart)"
    echo "   • Chatbot: $chatbot_status (PM2 auto-restart)"
    echo "   • Logs: pm2 logs"
    echo "   • Monitor: pm2 monit"
}

# Auto-start inteligente
smart_start() {
    local mode=$(detect_mode)
    echo -e "${PURPLE}🤖 Detección automática: modo ${mode}${NC}"
    
    case $mode in
        "development")
            start_development
            ;;
        "production")
            start_production
            ;;
    esac
}

# Comandos nuevos para manage.sh
case "${1:-help}" in
    "setup"|"dev-setup")
        echo -e "${BLUE}🔧 Setup inicial (modo desarrollo)${NC}"
        clean_hanging_processes
        start_development
        ;;
    
    "start"|"smart-start")
        smart_start
        ;;
        
    "dev-start"|"development")
        start_development
        ;;
        
    "prod-start"|"production")
        start_production
        ;;
        
    "pm2-full")
        echo -e "${BLUE}🚀 Iniciando ambos servicios con PM2${NC}"
        pm2 start ecosystem.config.js --env production
        ;;
        
    "tmux-bridge")
        echo -e "${BLUE}🌉 Iniciando solo bridge con tmux${NC}"
        start_bridge_tmux
        ;;
        
    "switch-to-production")
        echo -e "${BLUE}🔄 Cambiando a modo producción${NC}"
        # Detener tmux
        tmux kill-session -t drasbot-bridge 2>/dev/null || true
        # Iniciar con PM2
        start_production
        ;;
        
    "switch-to-development")
        echo -e "${BLUE}🔄 Cambiando a modo desarrollo${NC}"
        # Detener PM2 del bridge
        pm2 delete drasbot-bridge 2>/dev/null || true
        # Iniciar con tmux
        start_development
        ;;
esac
```

### 🔍 Funciones Auxiliares

```bash
# Esperar que el bridge esté listo
wait_for_bridge_ready() {
    echo -e "${YELLOW}⏳ Esperando que bridge esté listo...${NC}"
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s --connect-timeout 2 http://127.0.0.1:8080/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Bridge listo y respondiendo${NC}"
            return 0
        fi
        
        # Mostrar progreso cada 5 intentos
        if [ $((attempts % 5)) -eq 0 ]; then
            echo -e "${CYAN}   Intento $attempts/$max_attempts...${NC}"
        fi
        
        sleep 2
        attempts=$((attempts + 1))
    done
    
    echo -e "${YELLOW}⚠️  Bridge tardó más de lo esperado${NC}"
    return 1
}

# Verificar estado de autenticación
check_authentication_status() {
    local auth_file="$BRIDGE_DIR/store/device.db"
    
    if [ -f "$auth_file" ]; then
        local file_age=$(stat -c %Y "$auth_file" 2>/dev/null || echo 0)
        local current_time=$(date +%s)
        local age_hours=$(( (current_time - file_age) / 3600 ))
        
        if [ $age_hours -lt 168 ]; then # 7 días
            echo "authenticated"
        else
            echo "expired"
        fi
    else
        echo "not_authenticated"
    fi
}

# Estado avanzado del sistema
show_advanced_status() {
    show_banner
    echo -e "${BLUE}📊 Estado Avanzado del Sistema${NC}"
    echo "======================================"
    
    local mode=$(detect_mode)
    local auth_status=$(check_authentication_status)
    
    echo -e "${PURPLE}🔧 Configuración Actual:${NC}"
    echo "   Modo detectado: $mode"
    echo "   Autenticación: $auth_status"
    echo ""
    
    # Estado del bridge
    echo -e "${PURPLE}🌉 WhatsApp Bridge:${NC}"
    local bridge_pm2_status="stopped"
    local bridge_tmux_status="stopped"
    
    if command -v pm2 &> /dev/null; then
        bridge_pm2_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="drasbot-bridge") | .pm2_env.status' 2>/dev/null || echo "stopped")
    fi
    
    if command -v tmux &> /dev/null; then
        if tmux has-session -t drasbot-bridge 2>/dev/null; then
            bridge_tmux_status="running"
        fi
    fi
    
    echo "   PM2 Status: $bridge_pm2_status"
    echo "   tmux Status: $bridge_tmux_status"
    
    if [ "$bridge_pm2_status" = "online" ] || [ "$bridge_tmux_status" = "running" ]; then
        if is_port_8080_open; then
            echo -e "   ${GREEN}✅ API REST disponible (puerto 8080)${NC}"
        else
            echo -e "   ${YELLOW}⚠️  API REST no responde${NC}"
        fi
    else
        echo -e "   ${RED}❌ Bridge no está ejecutándose${NC}"
    fi
    
    # Estado del chatbot
    echo ""
    echo -e "${PURPLE}🤖 WhatsApp Chatbot:${NC}"
    if command -v pm2 &> /dev/null; then
        local chatbot_status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="drasbot-chatbot") | .pm2_env.status' 2>/dev/null || echo "stopped")
        echo "   PM2 Status: $chatbot_status"
        
        if [ "$chatbot_status" = "online" ]; then
            # Métricas de rendimiento
            local memory=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-chatbot") | .monit.memory' 2>/dev/null || echo "0")
            local cpu=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-chatbot") | .monit.cpu' 2>/dev/null || echo "0")
            local uptime=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-chatbot") | .pm2_env.pm_uptime' 2>/dev/null || echo "0")
            
            if [ "$memory" != "0" ] && [ "$memory" != "null" ]; then
                local memory_mb=$((memory / 1024 / 1024))
                echo "   Memoria: ${memory_mb}MB"
            fi
            
            if [ "$cpu" != "0" ] && [ "$cpu" != "null" ]; then
                echo "   CPU: ${cpu}%"
            fi
            
            if [ "$uptime" != "0" ] && [ "$uptime" != "null" ]; then
                local uptime_hours=$(( ($(date +%s) * 1000 - uptime) / 3600000 ))
                echo "   Uptime: ${uptime_hours}h"
            fi
        fi
    else
        echo -e "   ${RED}❌ PM2 no disponible${NC}"
    fi
    
    # Recomendaciones
    echo ""
    echo -e "${PURPLE}💡 Recomendaciones:${NC}"
    
    case "$auth_status" in
        "not_authenticated")
            echo "   ⚠️  Ejecuta './manage.sh setup' para autenticar"
            ;;
        "expired")
            echo "   ⚠️  Autenticación expirada, ejecuta './manage.sh setup'"
            ;;
        "authenticated")
            if [ "$mode" = "development" ]; then
                echo "   ✅ Usa './manage.sh switch-to-production' para máxima estabilidad"
            else
                echo "   ✅ Sistema configurado correctamente para producción"
            fi
            ;;
    esac
}
```

### 📋 Comandos Disponibles

```bash
# Setup y configuración inicial
./manage.sh setup              # Setup inicial con tmux (QR visible)
./manage.sh dev-setup          # Alias para setup

# Inicio inteligente
./manage.sh start              # Auto-detecta mejor modo
./manage.sh smart-start        # Alias para start

# Modos específicos
./manage.sh dev-start          # Forzar modo desarrollo (tmux + PM2)
./manage.sh prod-start         # Forzar modo producción (PM2 completo)

# Control de servicios específicos
./manage.sh pm2-full          # Ambos servicios en PM2
./manage.sh tmux-bridge       # Solo bridge en tmux

# Cambio de modos
./manage.sh switch-to-production    # Cambiar a producción
./manage.sh switch-to-development   # Cambiar a desarrollo

# Estado y monitoreo
./manage.sh status            # Estado básico
./manage.sh advanced-status   # Estado completo con métricas
./manage.sh health           # Chequeo de salud
./manage.sh logs             # Logs combinados
```

### 🎯 Flujo de Trabajo Recomendado

#### **1. Primera Instalación**
```bash
# Setup inicial - mostrará QR code
./manage.sh setup

# Una vez autenticado, cambiar a producción
./manage.sh switch-to-production
```

#### **2. Desarrollo**
```bash
# Para desarrollo activo
./manage.sh dev-start

# Ver logs del bridge en tiempo real
tmux attach -t drasbot-bridge

# Ver logs del chatbot
pm2 logs drasbot-chatbot
```

#### **3. Producción**
```bash
# Inicio completo en producción
./manage.sh prod-start

# Monitoreo
pm2 monit
pm2 logs
./manage.sh health
```

#### **4. Re-autenticación**
```bash
# Si la sesión expira
./manage.sh setup

# Volver a producción
./manage.sh switch-to-production
```

### 🔒 Ventajas de la Estrategia Híbrida

1. **🎯 Flexibilidad Total**
   - Mejor herramienta para cada situación
   - Transición suave entre modos

2. **🔍 QR Code Visible**
   - Setup inicial sin complicaciones
   - Re-autenticación fácil

3. **🚀 Máxima Estabilidad**
   - Auto-restart en producción
   - Logs centralizados

4. **🛠️ Debugging Eficiente**
   - tmux para desarrollo
   - PM2 para métricas

5. **📊 Monitoreo Avanzado**
   - Métricas en tiempo real
   - Alertas automáticas

Esta implementación garantiza **máxima flexibilidad** y **estabilidad** adaptándose automáticamente a las necesidades del entorno.

---
