# 📋 Plan de Centralización de Strings y Configuración - drasBot

## 🎯 **Objetivo**
Centralizar todos los strings de respuestas por defecto en archivos JSON configurables, permitiendo al administrador modificar todos los textos dinámicamente a través de comandos del bot o una interfaz web.

## 📊 **Estado Actual del Sistema**

### ✅ **Infraestructura Existente**
- **ConfigurationService** - Servicio robusto con eventos, validación y backup
- **Archivos JSON estructurados** - `messages.json`, `commands.json`, `errors.json`, `system.json`, `responses.json`
- **Sistema de plantillas** - Soporte para `{userName}`, `{timeOfDay}`, `{timeOfDayGreeting}`
- **Comando ConfigCommand** - Base implementada para administración

### 🔍 **Strings Hardcodeados Identificados**
1. **Registro de Nombres** - `ContextualMessageHandler.ts` líneas 695-708
2. **Respuestas Administrativas** - `AdminHandler.js` y `AdminMessageHandler.ts`
3. **Comandos Básicos** - `CommandHandler.js` líneas 201-660
4. **Rate Limiting** - `WhatsAppClient.js` líneas 405-475
5. **Errores y Estados** - Varios archivos
6. **Mensajes Contextuales** - `ContextualHandler.js` líneas 840-915

## 🗺️ **Plan de Implementación por Fases**

### **🔧 Fase 1: Completar Estructura de Configuración**

#### 1.1. Expandir archivos JSON existentes
```json
// src/config/default/responses.json - EXPANDIR
{
  "registration": {
    "name_request": [
      "¡Hola! 👋 Me encantaría conocerte mejor. ¿Podrías decirme tu nombre para personalizar nuestras conversaciones?",
      "¡Saludos! 😊 Para brindarte una mejor experiencia, ¿me podrías decir cómo te llamas?",
      "¡Hola! 🌟 Sería genial poder llamarte por tu nombre. ¿Cómo te gusta que te llamen?"
    ],
    "name_confirmed": [
      "¡Perfecto, {userName}! 😊 Es un gusto conocerte. Desde ahora te llamaré por tu nombre.",
      "¡Excelente, {userName}! 👋 Ya tengo tu nombre guardado. ¿En qué puedo ayudarte?",
      "¡Hola {userName}! 🎉 Gracias por decirme tu nombre. Ahora nuestras conversaciones serán más personales."
    ],
    "name_changed": [
      "¡Perfecto! Ahora te llamaré {newName}. 😊",
      "¡Entendido! A partir de ahora eres {newName} para mí. 👍",
      "¡Listo! He actualizado tu nombre a {newName}. ✨",
      "¡Genial! Ahora te conozco como {newName}. 🎉",
      "¡Hecho! Cambié tu nombre de {oldName} a {newName}. 🔄"
    ],
    "name_same": [
      "Ya te llamo {userName}. 😊"
    ],
    "name_invalid": [
      "Por favor, proporciona un nombre válido (entre 1 y 50 caracteres)."
    ],
    "name_error": [
      "Hubo un problema guardando tu nombre. Por favor, inténtalo más tarde."
    ]
  },
  "commands": {
    "help_prompt": [
      "¿En qué puedo ayudarte hoy? Puedes usar /help para ver todos los comandos disponibles."
    ],
    "unknown_command": [
      "❌ Comando desconocido: {command}. Usa /help para ver comandos disponibles."
    ],
    "permission_denied": [
      "🚫 No tienes permisos para ejecutar este comando."
    ],
    "cooldown_active": [
      "🕒 Comando en cooldown. Espera {remainingTime} segundos."
    ]
  },
  "rate_limiting": {
    "limit_exceeded": "⏱️ Has excedido el límite de {limitType}. Espera {waitTime} segundos.",
    "admin_exempt": "👑 Usuario admin {jid} - Sin límites de respuesta",
    "command_limit": "⏰ Comando de {jid} debe esperar {time}s entre comandos",
    "question_limit": "❓ Pregunta de {jid} debe esperar {time}s más",
    "chat_limit": "🚫 Chat {jid} ha alcanzado límite de respuestas"
  }
}
```

#### 1.2. Crear nuevos archivos JSON especializados
```json
// src/config/default/admin-responses.json - NUEVO
{
  "panel": {
    "header": "🛡️ *Panel de Administración*",
    "stats_title": "📊 *Estadísticas del Sistema:*",
    "commands_title": "🔧 *Comandos Disponibles:*",
    "footer": "⚡ *Estado del Bot:* Activo\n🕒 *Última actualización:* {timestamp}"
  },
  "config": {
    "help": "⚙️ *Configuración del Sistema*\n\n📋 Para ver configuración: /config show\n✏️ Para editar: /config set <clave> <valor>\n\n💡 Funcionalidad completa en desarrollo",
    "updated": "✅ Configuración actualizada: {section}.{key} = {value}",
    "error": "❌ Error actualizando configuración: {error}",
    "show_current": "⚙️ *Configuración Actual*\n• Debug: {debug}\n• Auto-reply: {autoReply}\n• Max responses: {maxResponses}/día"
  },
  "permissions": {
    "access_granted": "🔑 Acceso administrativo concedido",
    "access_denied": "🚫 Acceso denegado. Solo administradores pueden usar este comando.",
    "insufficient_permissions": "🚫 *Acceso Denegado*\n\nNo tienes permisos para ejecutar el comando: {command}\n\n📞 Contacta con un administrador si necesitas acceso."
  }
}
```

### **⚙️ Fase 2: Integrar ConfigurationService**

#### 2.1. Completar integración en ConfigCommand
```typescript
// Conectar ConfigCommand con ConfigurationService real
export class ConfigCommand extends Command {
  private configService: ConfigurationService;
  
  async execute(context: CommandContext): Promise<CommandResult> {
    const action = args[0]?.toLowerCase();
    
    switch (action) {
      case 'show':
        return await this.showConfiguration();
      case 'set':
        return await this.setConfiguration(args[1], args[2]);
      case 'reload':
        return await this.reloadConfiguration();
      case 'backup':
        return await this.createBackup();
      default:
        return await this.showHelp();
    }
  }
}
```

#### 2.2. Crear servicio de plantillas
```typescript
// src/services/TemplateService.ts - NUEVO
export class TemplateService {
  static replaceTemplates(text: string, variables: Record<string, any>): string {
    let result = text;
    
    // Reemplazos básicos
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    
    // Reemplazos especiales
    if (variables.timeOfDay && result.includes('{timeOfDayGreeting}')) {
      const greetings = {
        morning: 'Buenos días',
        afternoon: 'Buenas tardes', 
        evening: 'Buenas tardes',
        night: 'Buenas noches'
      };
      result = result.replace(/{timeOfDayGreeting}/g, greetings[variables.timeOfDay] || 'Hola');
    }
    
    return result;
  }
}
```

### **🔄 Fase 3: Migrar Handlers a Configuración**

#### 3.1. Actualizar ContextualMessageHandler
```typescript
// Reemplazar strings hardcodeados
private async requestUserName(phoneJid: string): Promise<void> {
  const requests = this.configService.getConfigurationSection('responses')?.registration?.name_request || [
    "¡Hola! ¿Podrías decirme tu nombre?"
  ];
  
  const randomRequest = requests[Math.floor(Math.random() * requests.length)];
  await this.whatsappClient.sendMessage(phoneJid, randomRequest);
}

private async handleNameResponse(message: WhatsAppMessage): Promise<HandlerResult> {
  // Usar configuración en lugar de strings hardcodeados
  const responses = this.configService.getConfigurationSection('responses')?.registration?.name_confirmed || [
    "¡Perfecto, {userName}! 😊"
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  const personalizedResponse = TemplateService.replaceTemplates(randomResponse, { userName: name });
  
  await this.whatsappClient.sendMessage(phoneJid, personalizedResponse);
}
```

#### 3.2. Actualizar AdminHandler y CommandHandler
```javascript
// Migrar todas las respuestas hardcodeadas a configuración
async handleAdminPanel(message) {
  const config = this.configService.getConfigurationSection('admin-responses');
  const stats = this.getAdminStats();
  
  const response = TemplateService.replaceTemplates(config.panel.header, {}) + '\n\n' +
                  config.panel.stats_title + '\n' +
                  `• Comandos admin ejecutados: ${stats.totalAdminCommands}\n` +
                  // ... más estadísticas
                  TemplateService.replaceTemplates(config.panel.footer, {
                    timestamp: new Date().toLocaleString('es-ES')
                  });
  
  await this.whatsappClient.sendMessage(message.senderPhone, response);
}
```

### **🎮 Fase 4: Comando ConfigCommand Completo**

#### 4.1. Implementar todas las funcionalidades
```typescript
export class ConfigCommand extends Command {
  async execute(context: CommandContext): Promise<CommandResult> {
    const [action, section, key, ...valueParts] = context.args;
    const value = valueParts.join(' ');
    
    switch (action?.toLowerCase()) {
      case 'show':
        return await this.showConfiguration(section);
        
      case 'set':
        return await this.setConfigValue(section, key, value);
        
      case 'add':
        return await this.addToArray(section, key, value);
        
      case 'remove':
        return await this.removeFromArray(section, key, value);
        
      case 'reload':
        return await this.reloadConfiguration();
        
      case 'backup':
        return await this.createConfigBackup();
        
      case 'restore':
        return await this.restoreFromBackup(section);
        
      case 'validate':
        return await this.validateConfiguration();
        
      default:
        return await this.showConfigHelp();
    }
  }
  
  private async showConfiguration(section?: string): Promise<CommandResult> {
    if (section) {
      const config = this.configService.getConfigurationSection(section);
      return {
        success: true,
        response: `⚙️ *Configuración de ${section}:*\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
        shouldReply: true
      };
    } else {
      // Mostrar resumen de todas las secciones
      const allConfig = this.configService.getConfiguration();
      const sections = Object.keys(allConfig || {});
      
      return {
        success: true,
        response: `⚙️ *Secciones de Configuración Disponibles:*\n\n${sections.map(s => `• ${s}`).join('\n')}\n\n💡 Usa \`!config show <sección>\` para ver detalles`,
        shouldReply: true
      };
    }
  }
  
  private async setConfigValue(section: string, key: string, value: string): Promise<CommandResult> {
    try {
      // Parsear valor (string, number, boolean, JSON)
      let parsedValue: any = value;
      
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      else if (value.startsWith('{') || value.startsWith('[')) {
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          // Mantener como string si no es JSON válido
        }
      }
      
      await this.configService.updateConfigurationSection(
        section as any,
        { [key]: parsedValue },
        'admin_command',
        context.user?.phone_number
      );
      
      return {
        success: true,
        response: `✅ Configuración actualizada:\n\`${section}.${key} = ${JSON.stringify(parsedValue)}\`\n\n🔄 Los cambios se aplicarán inmediatamente.`,
        shouldReply: true
      };
      
    } catch (error) {
      return {
        success: false,
        response: `❌ Error actualizando configuración: ${error.message}`,
        shouldReply: true,
        error: error.message
      };
    }
  }
}
```

### **🌐 Fase 5: Interfaz Web (Opcional)**

#### 5.1. API REST para configuración
```typescript
// src/routes/config.ts - NUEVO
app.get('/api/config', authenticateAdmin, (req, res) => {
  const config = configService.getConfiguration();
  res.json(config);
});

app.put('/api/config/:section', authenticateAdmin, async (req, res) => {
  try {
    await configService.updateConfigurationSection(
      req.params.section,
      req.body,
      'web_interface',
      req.user.phone
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

#### 5.2. Frontend simple para edición
```html
<!-- public/config-editor.html - NUEVO -->
<div id="config-editor">
  <h2>🤖 drasBot - Editor de Configuración</h2>
  
  <div class="section-tabs">
    <button onclick="loadSection('messages')">Mensajes</button>
    <button onclick="loadSection('commands')">Comandos</button>
    <button onclick="loadSection('responses')">Respuestas</button>
    <button onclick="loadSection('admin-responses')">Admin</button>
  </div>
  
  <div id="editor-area">
    <textarea id="config-json" rows="20" cols="80"></textarea>
    <button onclick="saveConfig()">💾 Guardar</button>
    <button onclick="validateConfig()">✅ Validar</button>
  </div>
</div>
```

## 🧪 **Testing y Validación**

### Testing de Comandos
```bash
# Probar configuración
!config show messages
!config set messages.greetings.new.0 "¡Hola {userName}! Versión personalizada"
!config add responses.registration.name_request "¿Cómo prefieres que te llame?"
!config reload
!config backup
```

### Validación de Plantillas
```typescript
// Test unitario para plantillas
describe('TemplateService', () => {
  it('should replace basic templates', () => {
    const result = TemplateService.replaceTemplates(
      "¡Hola {userName}! Son las {time}",
      { userName: "Juan", time: "15:30" }
    );
    expect(result).toBe("¡Hola Juan! Son las 15:30");
  });
  
  it('should handle timeOfDayGreeting', () => {
    const result = TemplateService.replaceTemplates(
      "{timeOfDayGreeting} {userName}",
      { userName: "Ana", timeOfDay: "morning" }
    );
    expect(result).toBe("Buenos días Ana");
  });
});
```

## 🎯 **Beneficios del Sistema**

### Para Administradores
- ✅ **Edición en tiempo real** - Cambios sin reiniciar
- ✅ **Interfaz amigable** - Comandos del bot o web
- ✅ **Backup automático** - Historial de cambios
- ✅ **Validación automática** - Previene errores

### Para Usuarios
- ✅ **Experiencia personalizada** - Respuestas más naturales
- ✅ **Consistencia** - Mensajes uniformes
- ✅ **Multiidioma** - Fácil traducción
- ✅ **Contextualización** - Respuestas según hora/usuario

### Para Desarrolladores
- ✅ **Mantenimiento fácil** - Sin tocar código
- ✅ **Escalabilidad** - Nuevos strings sin deployment
- ✅ **Testing mejorado** - Configuraciones de test
- ✅ **Documentación automática** - JSON autoexplicativo

## 📈 **Roadmap de Implementación**

### Semana 1 - Fase 1 y 2
- [x] Expandir archivos JSON
- [x] Crear TemplateService
- [x] Integrar ConfigurationService en ConfigCommand

### Semana 2 - Fase 3
- [ ] Migrar ContextualMessageHandler
- [ ] Migrar AdminHandler
- [ ] Migrar CommandHandler
- [ ] Testing de migración

### Semana 3 - Fase 4
- [ ] Completar ConfigCommand
- [ ] Implementar recarga dinámica
- [ ] Testing completo del sistema

### Semana 4 - Fase 5 (Opcional)
- [ ] API REST
- [ ] Interfaz web básica
- [ ] Documentación para usuarios

## 🔒 **Seguridad y Validación**

### Controles de Acceso
```typescript
// Solo admins pueden modificar configuración
if (!await this.permissionService.checkPermission({ 
  user: context.user, 
  requiredPermission: 'admin' 
})) {
  return this.createErrorResult("🚫 Solo administradores pueden modificar la configuración");
}
```

### Validación de Datos
```typescript
// Validar que los strings no estén vacíos
// Validar estructura JSON
// Validar que las plantillas tengan variables válidas
// Backup antes de cada cambio
```

Este plan te permitirá tener un sistema completamente centralizado donde todo texto del bot sea configurable dinámicamente. ¿Te gustaría que implemente alguna fase específica primero?
