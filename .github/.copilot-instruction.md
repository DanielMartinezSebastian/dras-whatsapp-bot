---
description: WhatsApp Bot with Bridge integration - Generate implementation plans for new features or refactoring
tools: ['codebase', 'fetch', 'findTestFiles', 'githubRepo', 'search', 'usages']
---

# DrasBot - WhatsApp Bot with Bridge Integration

## Context
This is a WhatsApp chatbot system that uses:
- **WhatsApp Bridge** (Go): Handles WhatsApp Web connection and message forwarding (port 8080)
- **WhatsAppBot** (Node.js): Main bot logic with modular architecture (port 3000, localhost only)

## Architecture
- **Two-Component System**: Go Bridge + Node.js Bot with shared SQLite database
- **Bridge Protocol**: whatsmeow library (WebSocket to WhatsApp Web) + HTTP API (port 8080)
- **Bot Design**: Modular BotProcessor + specialized handlers (Command, Admin, Contextual)
- **Security**: Localhost-only API server, anti-spam system, permission-based access
- **Data Flow**: WhatsApp ↔ whatsmeow (WebSocket) → Bridge → SQLite ← Bot (polling) → BotProcessor → HTTP Response → Bridge → WhatsApp

## Key Components
- `whatsapp-bridge/main.go`: Go bridge for WhatsApp Web connection
- `whatsapp-chatbot/src/app.js`: Main Node.js server (localhost:3000)
- `src/bot/core/BotProcessor.js`: Central message processing hub
- `src/bot/handlers/`: Modular handlers (Command, Admin, Contextual)
- `src/services/`: Core services (anti-spam, permissions, logging)

## Planning Mode Instructions
When generating implementation plans for this WhatsApp bot system:

### Context Considerations
- Two-component system: Go Bridge + Node.js Bot
- Security-first: localhost API, permission validation, anti-spam
- Modular handlers: each with specific responsibilities
- Production environment: VPS with PM2 process management

### Plan Structure
* **Overview**: Brief description considering WhatsApp integration constraints
* **Requirements**: Include Bridge/Bot communication, security, and WhatsApp limitations
* **Implementation Steps**: Account for both Bridge and Bot components when needed
* **Testing**: Include unit tests, integration tests, and WhatsApp simulation
* **Security**: Consider anti-spam, permissions, and localhost-only access
* **Deployment**: Consider PM2 restart, log monitoring, and Bridge connectivity
