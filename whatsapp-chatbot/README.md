# 🤖 WhatsApp Chatbot - Sistema Modular Inteligente

![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express.js-4.17+-black)
![SQLite](https://img.shields.io/badge/SQLite-3+-blue)

**Desarrollado por**: Daniel Martinez Sebastian

## 📋 Descripción

Sistema inteligente de chatbot para WhatsApp con arquitectura modular moderna. Diseñado desde cero por Daniel Martinez Sebastian como solución completa de automatización conversacional.

## 🏗️ Arquitectura del Sistema

### 🎯 Diseño Modular

```
┌─────────────────────────────────────────────────────────────┐
│                   🤖 WhatsApp Chatbot                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   BotProcessor  │◄──►│  MessageHandler │                │
│  │   (TypeScript)  │    │   (Modular)     │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   UserService   │    │ CommandRegistry │                │
│  │   (Database)    │    │   (Extensible)  │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🧩 Componentes Principales

#### 1. **BotProcessor** (`src/bot/core/botProcessor.ts`)
- **Función**: Coordinador principal del sistema
- **Responsabilidades**:
  - Gestión de mensajes entrantes
  - Coordinación entre servicios
  - Manejo de estado del bot
  - Procesamiento de contexto

#### 2. **Sistema de Handlers** (`src/bot/handlers/`)
- **CommandMessageHandler**: Procesamiento de comandos
- **AdminMessageHandler**: Funciones administrativas
- **ContextualMessageHandler**: Conversaciones naturales
- **RegistrationMessageHandler**: Gestión de registros

#### 3. **Sistema de Comandos** (`src/bot/commands/`)
- **Command Pattern**: Implementación extensible
- **Categorización**: General, Usuario, Sistema, Admin
- **Permisos**: Sistema basado en roles
- **Cooldowns**: Control de spam

#### 4. **Servicios Especializados** (`src/services/`)
- **UserService**: Gestión de usuarios
- **PermissionService**: Control de acceso
- **ConversationService**: Contexto conversacional
- **RegistrationService**: Registro de usuarios

## 📁 Estructura del Proyecto

```
whatsapp-chatbot/
├── 📄 package.json              # Configuración del proyecto
├── 📄 tsconfig.json             # Configuración TypeScript
├── 📄 jest.config.js            # Configuración de testing
├── 📄 README.md                 # Este archivo
├── 📄 INSTALL.md                # Guía de instalación
├── 📄 IMPLEMENTACION_FINAL_COMPLETA.md # Documentación técnica
│
├── 📂 src/                      # Código fuente principal
│   ├── 📄 app.js               # Punto de entrada legacy
│   ├── 📂 bot/                 # Lógica del bot
│   │   ├── 📄 chatbot.js       # Bot principal legacy
│   │   ├── 📂 core/            # Núcleo del sistema
│   │   │   ├── 📄 botProcessor.ts     # Procesador principal
│   │   │   ├── 📄 BotProcessor.js     # Versión legacy
│   │   │   ├── 📄 MessageProcessor.js # Procesador de mensajes
│   │   │   └── 📄 messageClassifier.ts # Clasificador
│   │   ├── 📂 commands/        # Sistema de comandos
│   │   │   ├── 📂 core/        # Núcleo de comandos
│   │   │   ├── 📂 general/     # Comandos públicos
│   │   │   ├── 📂 user/        # Comandos de usuario
│   │   │   └── 📂 system/      # Comandos administrativos
│   │   └── 📂 handlers/        # Manejadores especializados
│   ├── 📂 database/            # Gestión de datos
│   ├── 📂 services/            # Servicios especializados
│   ├── 📂 interfaces/          # Definiciones TypeScript
│   ├── 📂 types/               # Tipos TypeScript
│   ├── 📂 utils/               # Utilidades
│   ├── 📂 whatsapp/            # Cliente WhatsApp
│   └── 📂 routes/              # Rutas API REST
│
├── 📂 dist/                    # Código compilado TypeScript
├── 📂 logs/                    # Archivos de log
├── 📂 config/                  # Configuraciones
├── 📂 scripts/                 # Scripts de gestión
├── 📂 data/                    # Datos de aplicación
├── 📂 exports/                 # Exportaciones
├── 📂 backup/                  # Respaldos automáticos
└── 📂 __tests__/              # Testing y validación
```

## 🚀 Características Principales

### ✨ Funcionalidades Implementadas

#### 🎯 Sistema de Comandos Avanzado
- **Comandos Dinámicos**: Registro automático de comandos
- **Permisos Granulares**: Control de acceso por usuario
- **Cooldowns Inteligentes**: Prevención de spam
- **Ayuda Contextual**: Ayuda personalizada por tipo de usuario

#### 👥 Gestión de Usuarios Completa
- **Registro Automático**: Usuarios se registran al primer contacto
- **Tipos de Usuario**: admin, customer, friend, familiar, employee, provider, block
- **Perfiles Detallados**: Información completa de cada usuario
- **Estadísticas**: Métricas de uso y actividad

#### 🔧 Sistema de Administración
- **Panel Admin**: Comandos administrativos completos
- **Gestión de Usuarios**: CRUD completo de usuarios
- **Búsqueda Avanzada**: Búsqueda por nombre, teléfono, tipo
- **Estadísticas del Sistema**: Métricas en tiempo real

#### 💬 Conversación Inteligente
- **Contexto Preservado**: Mantiene el hilo de conversación
- **Respuestas Naturales**: Procesamiento de lenguaje natural
- **Auto-Reply Configurable**: Respuestas automáticas opcionales
- **Clasificación de Mensajes**: Tipos: comando, admin, contextual

### 🛡️ Seguridad y Robustez

#### 🔐 Medidas de Seguridad
- **Acceso Local Únicamente**: Solo localhost (127.0.0.1:3000)
- **Control de Permisos**: Sistema de roles granular
- **Rate Limiting**: Protección contra spam
- **Validación de Entrada**: Sanitización de datos

#### 🔧 Robustez del Sistema
- **Manejo de Errores**: Recuperación automática
- **Logging Detallado**: Trazabilidad completa
- **Reinicio Automático**: PM2 con monitoreo
- **Limpieza de Recursos**: Gestión de memoria

## 🎮 Comandos Disponibles

### 📖 Comandos Básicos
```
/help                    # Ayuda personalizada
/info                    # Información del sistema
/ping                    # Verificar latencia
/estado                  # Estado del bot
```

### 👤 Comandos de Usuario
```
/profile                 # Ver perfil personal
/usertype [tipo]         # Ver/cambiar tipo de usuario
/permissions             # Ver permisos actuales
```

### 🔧 Comandos Administrativos
```
/admin                   # Panel de administración
/users list [límite] [página]    # Listar usuarios
/users search <término>          # Buscar usuarios
/users update <tel> type <tipo>  # Actualizar usuario
/users stats                     # Estadísticas de usuarios
/stats [tipo]                    # Estadísticas del sistema
```

## 🗄️ Base de Datos

### 📊 Esquema de Datos

#### Tabla `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    whatsapp_jid TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE,
    display_name TEXT,
    user_type TEXT DEFAULT 'customer',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla `user_interactions`
```sql
CREATE TABLE user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    interaction_type TEXT,
    content_summary TEXT,
    response_pattern TEXT,
    processing_time REAL,
    success BOOLEAN,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

#### Tabla `conversation_states`
```sql
CREATE TABLE conversation_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    chat_jid TEXT,
    current_state TEXT,
    context_data TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🚀 Instalación y Configuración

### 📋 Prerrequisitos

- **Node.js**: 18.0.0 o superior
- **npm**: 8.0.0 o superior
- **TypeScript**: 5.8.0 o superior
- **PM2**: Para gestión de procesos
- **SQLite**: Para base de datos

### ⚡ Instalación Rápida

```bash
# Navegar al directorio del chatbot
cd whatsapp-chatbot

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Iniciar el sistema
npm start
```

### 🔧 Instalación Completa

```bash
# 1. Instalar dependencias globales
npm install -g pm2 typescript

# 2. Instalar dependencias del proyecto
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# 4. Compilar TypeScript
npm run build

# 5. Iniciar con PM2
pm2 start config/ecosystem.config.js

# 6. Verificar estado
pm2 status
```

## 🛠️ Scripts Disponibles

### 📜 Scripts de Desarrollo

```bash
npm run dev              # Desarrollo con ts-node
npm run dev:watch        # Desarrollo con recarga automática
npm run build            # Compilar TypeScript
npm run build:watch      # Compilar con watch mode
npm run type-check       # Verificar tipos TypeScript
npm run lint             # Linter ESLint
npm run lint:fix         # Linter con corrección automática
```

### 🧪 Scripts de Testing

```bash
npm test                 # Ejecutar tests
npm run test:watch       # Tests con watch mode
npm run test:coverage    # Tests con cobertura
```


## 🚀 Despliegue con PM2

### 📋 Recomendado para Producción

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar con PM2
pm2 start config/ecosystem.config.js

# Asegurar auto-arranque
pm2 startup
pm2 save

# Verificar estado
pm2 status whatsapp-chatbot
```

### 🔄 Gestión del Servicio

```bash
# Reiniciar servicio
pm2 restart whatsapp-chatbot

# Detener servicio
pm2 stop whatsapp-chatbot

# Ver logs
pm2 logs whatsapp-chatbot
```

## 📊 Monitoreo y Logs

### 📈 Monitoreo en Tiempo Real

```bash
# Ver estado de PM2
pm2 status

# Monitor avanzado
pm2 monit

# Logs en tiempo real
pm2 logs whatsapp-chatbot

# Métricas del sistema
pm2 show whatsapp-chatbot
```

### 📋 Archivos de Log

```
logs/
├── combined.log         # Logs combinados
├── out.log             # Stdout de PM2
├── error.log           # Errores de PM2
├── chatbot.log         # Logs específicos del bot
└── debug.log           # Logs de debugging
```

## 🧪 Testing y Validación

### 🔬 Testing Automatizado

El proyecto incluye múltiples scripts de testing:

```bash
# Testing de comandos
node test-commands.js

# Testing de usuarios
node test-users.js

# Testing integral
node test-users-commands-integral.js

# Testing real con usuarios
node test-users-command-real.js
```

### 🔍 Validación del Sistema

```bash
# Validar migración
node scripts/validate-migration.js

# Verificar limpieza
node scripts/verify-cleanup.js

# Auditoría del sistema
node scripts/audit-legacy.js
```

## 🔄 Migración y Evolución

### 🎭 Sistema Dual Legacy/Moderno

El chatbot implementa un sistema de migración gradual:

#### ✅ Sistema Moderno (TypeScript)
- **BotProcessor**: Coordinador principal
- **Handlers Especializados**: Modular y extensible
- **Sistema de Comandos**: Command Pattern
- **Servicios**: Inyección de dependencias

#### 🔄 Sistema Legacy (JavaScript)
- **MessageProcessor**: Procesador compatible
- **BotProcessor.js**: Versión legacy
- **Comandos Legacy**: Sistema anterior
- **Migración Gradual**: Sin interrupciones

### 📋 Estado de Migración

#### ✅ Completado
- [x] Sistema de usuarios completo
- [x] Comandos administrativos
- [x] Gestión de permisos
- [x] Base de datos moderna
- [x] API REST básica

#### 🔄 En Proceso
- [ ] Migración completa a TypeScript
- [ ] Sistema de plugins
- [ ] API REST completa
- [ ] Interfaz web de administración

## 🔧 Configuración Avanzada

### ⚙️ Variables de Entorno

```bash
# .env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# Bot Configuration
BOT_NAME=DrasBot
AUTO_REPLY=true
COMMAND_PREFIX=/

# Database
DB_PATH=./src/database/users.db

# WhatsApp Bridge
BRIDGE_URL=http://127.0.0.1:8080

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/chatbot.log
```

### 🎛️ Configuración PM2

```javascript
// config/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'whatsapp-chatbot',
    script: 'dist/app.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist']
  }]
};
```

## 🤝 Contribución y Desarrollo

### 📝 Estructura para Nuevos Comandos

```typescript
// src/bot/commands/categoria/NuevoComando.ts
import { Command } from "../core/Command";
import { CommandContext, CommandResult } from "../../types";

export class NuevoComando extends Command {
  get metadata() {
    return {
      name: "nuevo",
      description: "Descripción del comando",
      category: "general",
      permissions: ["user"],
      cooldown: 5000,
      syntax: "/nuevo [parámetros]",
      examples: ["/nuevo ejemplo"]
    };
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const { message, user, args } = context;
    
    // Lógica del comando
    
    return {
      success: true,
      response: "Respuesta del comando",
      shouldReply: true
    };
  }
}
```

### 🔧 Añadir Nuevos Servicios

```typescript
// src/services/NuevoService.ts
export class NuevoService {
  private initialized = false;
  
  constructor(private config: ServiceConfig) {}
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Lógica de inicialización
    
    this.initialized = true;
  }
  
  async metodoPublico(): Promise<any> {
    if (!this.initialized) {
      throw new Error('Servicio no inicializado');
    }
    
    // Funcionalidad del servicio
  }
}
```

## 📚 Documentación Adicional

### 📖 Documentos de Referencia

- [**INSTALL.md**](./INSTALL.md) - Guía completa de instalación
- [**IMPLEMENTACION_FINAL_COMPLETA.md**](./IMPLEMENTACION_FINAL_COMPLETA.md) - Documentación técnica detallada
- [**FUNCIONALIDADES_NOMBRES.md**](./FUNCIONALIDADES_NOMBRES.md) - Sistema de nombres y funcionalidades

### 🔗 Enlaces Útiles

- **TypeScript**: https://www.typescriptlang.org/
- **Node.js**: https://nodejs.org/
- **Express.js**: https://expressjs.com/
- **PM2**: https://pm2.keymetrics.io/
- **Jest**: https://jestjs.io/

## 🐛 Solución de Problemas

### ❗ Problemas Comunes

#### El bot no responde:
```bash
# Verificar estado
pm2 status

# Verificar logs
pm2 logs whatsapp-chatbot

# Reiniciar
pm2 restart whatsapp-chatbot
```

#### Errores de TypeScript:
```bash
# Verificar tipos
npm run type-check

# Recompilar
npm run build

# Limpiar y recompilar
npm run clean && npm run build
```

#### Problemas de base de datos:
```bash
# Verificar permisos
ls -la src/database/

# Verificar integridad
sqlite3 src/database/users.db ".integrity_check"
```

### 🔧 Comandos de Diagnóstico

```bash
# Estado completo del sistema
curl http://127.0.0.1:3000/status

# Estadísticas del bot
curl http://127.0.0.1:3000/api/stats

# Salud del sistema
curl http://127.0.0.1:3000/health
```

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**.

## 👨‍💻 Autor

**Daniel Martinez Sebastian**
- **GitHub**: [DanielMartinezSebastian](
