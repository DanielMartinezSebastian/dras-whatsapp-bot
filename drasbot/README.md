# DrasBot v3.0 - Modern TypeScript WhatsApp Chatbot

![DrasBot Logo](https://img.shields.io/badge/DrasBot-v3.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![Tests](https://img.shields.io/badge/Tests-37%20passing-green.svg)

A modern, extensible WhatsApp chatbot built with TypeScript, featuring a plugin-based architecture, robust configuration management, and comprehensive testing.

## 🚀 Features

### ✅ Implemented Features
- **Modern TypeScript Architecture** - Type-safe, modular design
- **Plugin-Based System** - Extensible command and context management
- **Centralized Configuration** - Hot-reload configuration with file watching
- **Robust Database Layer** - SQLite with automatic migrations
- **Advanced Logging** - Multi-level logging with file and console output
- **Comprehensive Testing** - TDD approach with Jest testing framework
- **Singleton Pattern Services** - Efficient resource management
- **Graceful Shutdown** - Proper cleanup and signal handling

### 🔄 In Development
- WhatsApp Web Integration
- Message Processing Pipeline
- Command System
- Context Management
- User Authentication & Levels

### 📋 Planned Features
- Web Administration Panel
- REST API
- Real-time Dashboard
- Advanced Analytics
- Multi-language Support
- Plugin Marketplace

## 🔗 WhatsApp Bridge Integration

The bot connects to WhatsApp through a separate **whatsapp-bridge** service (written in Go). This architecture provides:

### Enhanced Bridge Service Features

- **Robust Error Handling**: Custom error classes with detailed error analysis
- **Smart Health Checking**: Intelligent ping system that differentiates between bridge unavailable vs WhatsApp disconnected  
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Type Safety**: Full TypeScript typing for all bridge operations
- **Graceful Degradation**: Bot continues to work even if bridge is temporarily unavailable

### Bridge API Integration

```typescript
// The bridge service provides a complete API
const bridge = WhatsAppBridgeService.getInstance();

// Connection management
await bridge.initialize();
const isConnected = bridge.isConnected();
const health = await bridge.getHealth();

// Message operations
await bridge.sendTextMessage('1234567890', 'Hello!');
await bridge.sendMediaMessage('1234567890', '/path/to/image.jpg', 'Caption');
const media = await bridge.downloadMedia('messageId', 'chatJid');

// Utility functions
const jid = bridge.createJID('1234567890'); // => 1234567890@s.whatsapp.net
const isGroup = bridge.isGroupJID('group@g.us'); // => true
```

### Bridge Error Handling

The service intelligently handles different error scenarios:

- **Network Errors**: Automatic retries with exponential backoff
- **Bridge Validation Errors**: Proper parameter validation
- **WhatsApp Disconnection**: Distinguishes bridge availability from WhatsApp status
- **Timeout Handling**: Configurable timeouts with retry logic

For detailed information, see [WHATSAPP_BRIDGE_ENHANCED.md](./WHATSAPP_BRIDGE_ENHANCED.md).

## 🏗️ Architecture

```
src/
├── core/           # Core bot orchestration
├── services/       # Business logic services
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── interfaces/     # Service interfaces
├── plugins/        # Extensible plugins (planned)
├── commands/       # Command implementations (planned)
└── contexts/       # Context handlers (planned)
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SQLite3

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd drasbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

## 🧪 Testing

DrasBot follows Test-Driven Development (TDD) practices:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- logger.test.ts
```

### Test Coverage
- **Logger Service**: ✅ 100% (8 tests passing)
- **Bot Core**: ✅ 100% (7 tests passing)
- **WhatsApp Bridge**: ✅ 100% (22 tests passing) **NEW**
- **Configuration Service**: ✅ Integrated
- **Database Service**: ✅ Integrated

**Total: 37 tests passing** ✅

## 📁 Project Structure

```
drasbot/
├── src/                 # Source code
│   ├── core/           # Core bot logic
│   ├── services/       # Service layer
│   ├── utils/          # Utilities
│   ├── types/          # Type definitions
│   └── interfaces/     # Interfaces
├── tests/              # Test files
├── config/             # Configuration files
├── data/               # Database and data files
├── logs/               # Log files
├── dist/               # Compiled JavaScript
├── docs/               # Documentation
└── scripts/            # Utility scripts
```

## ⚙️ Configuration

Configuration is managed through JSON files in the `config/` directory:

- `main.json` - Main bot configuration
- `user-levels.json` - User permission levels
- `messages/es.json` - Localized messages

### Example Configuration

```json
{
  "name": "DrasBot",
  "prefix": "!",
  "language": "es",
  "timezone": "America/Santiago",
  "features": {
    "plugins": true,
    "contexts": true,
    "web_panel": false,
    "api": true
  }
}
```

## 🔧 Development

### Available Scripts

```bash
npm run build         # Compile TypeScript
npm run dev           # Development mode (planned)
npm run test          # Run tests
npm run test:watch    # Tests in watch mode
npm run lint          # ESLint checking
npm run format        # Prettier formatting
npm start             # Start production build
```

### Adding New Features

1. Write tests first (TDD approach)
2. Implement the feature
3. Ensure all tests pass
4. Update documentation

## 🚀 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs drasbot
```

### Using tmux

```bash
# Create new session
tmux new-session -d -s drasbot

# Run the bot
tmux send-keys -t drasbot "npm start" Enter

# Attach to session
tmux attach -t drasbot
```

## 📊 Monitoring

### Built-in Logging
- All activities are logged to `logs/drasbot.log`
- Console output with color coding
- Log levels: DEBUG, INFO, WARN, ERROR

### Status Monitoring
```javascript
const bot = DrasBot.getInstance();
const status = bot.getStatus();
console.log(status);
```

## 🛠️ Migration from Legacy System

A migration script is provided to transfer data from the old system:

```bash
# Run migration script
./scripts/migrate.sh
```

This will:
- Backup existing data
- Convert database schema
- Transfer user data
- Update configuration files

## 🔒 Security

### Features
- Input validation and sanitization
- Rate limiting
- User permission levels
- Secure configuration management
- SQL injection prevention

### Best Practices
- Regular dependency updates
- Environment variable protection
- Secure communication protocols
- Access control and authentication

## 📚 Documentation

- [Architecture Overview](ARQUITECTURA_NUEVA_DRASBOT.md)
- [TDD Progress](TDD.md)
- [API Documentation](docs/api/) (planned)
- [Plugin Development](docs/plugins/) (planned)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Implement the feature
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Daniel Martinez Sebastian**
- GitHub: [@drasBot](https://github.com/drasBot)

## 🙏 Acknowledgments

- WhatsApp Web API community
- TypeScript community
- Jest testing framework
- SQLite database engine

---

## 📈 Current Status

**Phase 1: Core Infrastructure** ✅ **COMPLETED**
- ✅ TypeScript project setup
- ✅ Core services implementation
- ✅ Testing framework
- ✅ Configuration management
- ✅ Database layer
- ✅ Logging system

**Phase 2: WhatsApp Integration** ✅ **COMPLETED**
- ✅ WhatsApp Bridge Service (Enhanced)
- ✅ Robust error handling and retries
- ✅ Smart health checking
- ✅ Message sending and media download
- 🔄 Message processing pipeline
- 📋 Command system
- 📋 Context management

**Total Progress: 60% Complete**

---

*Last updated: June 17, 2025*
