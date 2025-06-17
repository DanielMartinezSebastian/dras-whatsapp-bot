# DrasBot v2.0 - Nueva Arquitectura TypeScript

![DrasBot](https://img.shields.io/badge/DrasBot-v2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Descripción

DrasBot v2.0 es una reimplementación completa del chatbot de WhatsApp utilizando **TypeScript puro** con una **arquitectura modular basada en plugins**. Esta versión está diseñada para ser altamente escalable, mantenible y fácil de extender.

## 🎯 Características Principales

- ✅ **TypeScript First** - Tipado estricto en toda la aplicación
- ✅ **Arquitectura Plugin** - Sistema extensible de comandos y contextos
- ✅ **Configuración JSON** - Gestión centralizada sin código
- ✅ **Base de Datos Escalable** - SQLite con migraciones automáticas
- ✅ **Gestión Híbrida** - PM2 + tmux para máxima flexibilidad
- ✅ **Hot Reload** - Desarrollo ágil con recarga automática
- ✅ **Logging Avanzado** - Winston con múltiples niveles
- ✅ **Testing** - Jest con cobertura completa
- ✅ **API REST** - Endpoints para gestión externa

## 📁 Estructura del Proyecto

```
drasbot-new/
├── src/
│   ├── types/           # Definiciones de tipos TypeScript
│   ├── interfaces/      # Interfaces y contratos
│   ├── core/           # Núcleo del bot (Bot, MessageProcessor, etc.)
│   ├── plugins/        # Sistema de plugins
│   │   ├── commands/   # Comandos (admin, general, user)
│   │   └── contexts/   # Manejadores de contexto
│   ├── services/       # Servicios (Database, Config, etc.)
│   ├── utils/          # Utilidades (Logger, helpers)
│   └── database/       # Modelos, migraciones, seeds
├── config/
│   ├── messages/       # Mensajes internacionalizados
│   ├── contexts/       # Configuración de contextos
│   └── commands/       # Configuración de comandos
├── data/               # Base de datos SQLite
├── logs/               # Archivos de log
├── tests/              # Tests unitarios e integración
└── scripts/            # Scripts de utilidades
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Go 1.19+ (para el bridge)
- tmux (opcional, para desarrollo)
- PM2 (opcional, para producción)

### Setup Inicial

```bash
# Clonar e instalar dependencias
cd drasbot-new
npm install

# Copiar configuración de ejemplo
cp .env.example .env

# Editar variables de entorno
nano .env

# Compilar TypeScript
npm run build

# Ejecutar migraciones
npm run migrate

# Sembrar datos iniciales
npm run seed
```

## 🚀 Uso

### Desarrollo

```bash
# Modo desarrollo con hot reload
npm run dev

# Ejecutar tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Linting y formateo
npm run lint
npm run format
```

### Producción

```bash
# Compilar para producción
npm run build

# Iniciar con PM2 (recomendado)
pm2 start ecosystem.config.js --env production

# O iniciar directamente
npm start
```

### Gestión con manage.sh

```bash
# Setup inicial (muestra QR code)
../manage.sh setup

# Inicio inteligente (auto-detecta modo)
../manage.sh start

# Modo desarrollo
../manage.sh dev-start

# Modo producción
../manage.sh prod-start

# Estado del sistema
../manage.sh status

# Logs en tiempo real
../manage.sh logs
```

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Bot Configuration
BOT_NAME=DrasBot
BOT_PREFIX=!
BOT_LANGUAGE=es

# Database
DATABASE_PATH=./data/drasbot.db

# WhatsApp Bridge
BRIDGE_URL=http://127.0.0.1:8080

# Server
PORT=3000
HOST=127.0.0.1
```

### Mensajes (config/messages/es.json)

```json
{
  "welcome": "¡Hola! Soy {bot_name} 🤖",
  "help": "Comandos disponibles:\n{commands}",
  "error": "Ocurrió un error: {error}"
}
```

## 🔌 Sistema de Plugins

### Crear un Comando

```typescript
// src/plugins/commands/general/hello.ts
import { ICommand } from '@interfaces/index';

export class HelloCommand implements ICommand {
  readonly metadata = {
    name: 'hello',
    version: '1.0.0',
    description: 'Comando de saludo',
    author: 'DrasBot',
    category: 'command' as const
  };

  readonly config = {
    name: 'hello',
    description: 'Saluda al usuario',
    usage: '!hello',
    category: 'general' as const,
    min_user_level: 'guest' as const,
    enabled: true
  };

  async execute(message: Message, user: User): Promise<CommandResult> {
    return {
      success: true,
      response: `¡Hola ${user.display_name}! 👋`
    };
  }

  validatePermissions(user: User): boolean {
    return true; // Todos pueden usar este comando
  }

  getUsage(): string {
    return this.config.usage;
  }
}
```

### Crear un Contexto

```typescript
// src/plugins/contexts/survey.ts
import { IContextHandler } from '@interfaces/index';

export class SurveyContext implements IContextHandler {
  readonly metadata = {
    name: 'survey',
    version: '1.0.0',
    description: 'Contexto de encuesta',
    author: 'DrasBot',
    category: 'context' as const
  };

  readonly config = {
    name: 'survey',
    description: 'Encuesta de satisfacción',
    max_duration: 300000, // 5 minutos
    auto_exit_on_timeout: true,
    steps: [
      {
        id: 'rating',
        name: 'Calificación',
        message_key: 'survey_rating',
        validation: {
          type: 'choice',
          choices: ['1', '2', '3', '4', '5'],
          required: true
        },
        next_step: 'feedback'
      },
      {
        id: 'feedback',
        name: 'Comentarios',
        message_key: 'survey_feedback',
        validation: {
          type: 'text',
          max_length: 500,
          required: false
        }
      }
    ]
  };

  async enter(user: User): Promise<ConversationContext> {
    // Lógica de entrada al contexto
  }

  async process(context: ConversationContext, message: Message): Promise<CommandResult> {
    // Procesar mensaje en el contexto
  }

  // ... más métodos
}
```

## 📊 Base de Datos

### Tipos Escalables

```typescript
// src/types/database.ts
export interface User extends BaseEntity {
  phone: string;
  whatsapp_jid: string;
  display_name: string;
  user_level: UserLevel;
  preferences: UserPreferences;
  metadata: Record<string, any>; // Extensible
}

// Plugin data (auto-extensible)
export interface PluginData extends BaseEntity {
  plugin_name: string;
  user_id: string;
  data: Record<string, any>;
}
```

### Migraciones

```typescript
// src/database/migrations/001_initial.ts
export class InitialMigration implements IMigration {
  version = '001';
  description = 'Create initial tables';

  async up(db: Database): Promise<void> {
    await db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        whatsapp_jid TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        user_level TEXT DEFAULT 'guest',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  async down(db: Database): Promise<void> {
    await db.exec('DROP TABLE users');
  }
}
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests específicos
npm test -- --grep "UserService"

# Tests en modo watch
npm run test:watch
```

### Ejemplo de Test

```typescript
// tests/services/user.service.test.ts
describe('UserService', () => {
  it('should create a new user', async () => {
    const userData = {
      phone: '+1234567890',
      whatsapp_jid: '1234567890@s.whatsapp.net',
      display_name: 'Test User'
    };

    const user = await userService.createUser(userData);
    
    expect(user).toBeDefined();
    expect(user.phone).toBe(userData.phone);
    expect(user.user_level).toBe('guest');
  });
});
```

## 📈 Monitoreo

### PM2 Monitoring

```bash
# Ver estado de procesos
pm2 status

# Logs en tiempo real
pm2 logs drasbot-new

# Monitor de recursos
pm2 monit

# Reiniciar si es necesario
pm2 restart drasbot-new
```

### Health Check

```bash
# API de salud
curl http://localhost:3000/health

# Respuesta
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "whatsapp": "connected",
    "plugins": "loaded"
  }
}
```

## 🔒 Seguridad

- ✅ **Rate Limiting** - Protección contra spam
- ✅ **Input Validation** - Joi schemas para validación
- ✅ **SQL Injection Protection** - Prepared statements
- ✅ **User Level Authorization** - Sistema de permisos
- ✅ **Environment Variables** - Configuración segura

## 📖 Documentación

- [Arquitectura Completa](../ARQUITECTURA_NUEVA_DRASBOT.md) - Documentación técnica detallada
- [API Reference](./docs/api.md) - Documentación de endpoints
- [Plugin Development](./docs/plugins.md) - Guía de desarrollo de plugins
- [Database Schema](./docs/database.md) - Esquema de base de datos

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📝 Changelog

### v2.0.0 (2025-06-17)
- ✨ Reescritura completa en TypeScript
- ✨ Sistema de plugins modular
- ✨ Configuración JSON centralizada
- ✨ Base de datos escalable con migraciones
- ✨ Gestión híbrida PM2/tmux
- ✨ API REST integrada
- ✨ Sistema de tests completo

## 📄 Licencia

MIT License - ver [LICENSE](../LICENSE) para más detalles.

## 👨‍💻 Autor

**Daniel Martinez Sebastian**
- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Email: tu-email@ejemplo.com

---

**DrasBot v2.0** - Chatbot WhatsApp moderno y escalable 🚀
