# Comandos del Bridge de WhatsApp - Documentación

## Resumen

Se han implementado comandos específicos para interactuar con el bridge de WhatsApp, permitiendo a los usuarios obtener información del estado del bridge, gestionar chats y acceder al historial de mensajes.

## Comandos Implementados

### 📋 Comandos para Usuarios

#### `!bridge` / `!conexion` / `!puente`
**Descripción**: Muestra el estado detallado del bridge de WhatsApp.

**Uso**:
```
!bridge
!conexion
!puente
```

**Información mostrada**:
- Estado de conexión del bridge
- Estado de WhatsApp (conectado/desconectado)
- Número conectado
- Última verificación de salud
- Información del bridge (versión, uptime)
- Configuración (solo para administradores)

#### `!chats` / `!conversaciones` / `!lista`
**Descripción**: Muestra la lista de chats recientes disponibles.

**Uso**:
```
!chats                    # Muestra los últimos 10 chats
!chats 20                 # Muestra los últimos 20 chats (máximo 50)
!conversaciones
!lista 5
```

**Información mostrada**:
- Nombre del chat
- ID/JID del chat
- Número de mensajes sin leer
- Hora del último mensaje

#### `!history` / `!historial` / `!mensajes`
**Descripción**: Muestra el historial de mensajes de un chat específico.

**Uso**:
```
!history                                    # Historial del chat actual (10 mensajes)
!history 20                                 # Últimos 20 mensajes del chat actual
!history 5521234567890@s.whatsapp.net      # Historial de un chat específico
!history 5521234567890@s.whatsapp.net 15   # Últimos 15 mensajes de un chat específico
!historial
!mensajes
```

**Información mostrada**:
- Remitente del mensaje
- Contenido del mensaje (limitado a 100 caracteres)
- Hora del mensaje
- Tipo de media (si no es texto)

### ⚙️ Comandos para Administradores

#### `!qr` / `!codigo` / `!conectar`
**Descripción**: Obtiene el código QR para conectar WhatsApp (solo administradores).

**Uso**:
```
!qr
!codigo
!conectar
```

**Información mostrada**:
- Estado de generación del QR
- Código QR en formato texto
- Instrucciones para escanear

#### `!bridgehealth` / `!salud-bridge` / `!health`
**Descripción**: Verifica la salud y conectividad del bridge (solo administradores).

**Uso**:
```
!bridgehealth
!salud-bridge
!health
```

**Información mostrada**:
- Disponibilidad del bridge
- Estado del servicio
- Tiempo de la última verificación
- Errores encontrados (si los hay)

## Manejo de Errores

Todos los comandos incluyen manejo robusto de errores:

- **Bridge no disponible**: Se muestra un mensaje amigable indicando que el bridge no está disponible
- **Permisos insuficientes**: Los comandos de administrador verifican el nivel de usuario
- **Parámetros inválidos**: Se validan los parámetros y se proporcionan valores por defecto
- **Errores del servicio**: Se capturan y reportan errores de manera elegante

## Niveles de Usuario

- **USER**: Puede usar comandos `!bridge`, `!chats`, `!history`
- **MODERATOR**: Mismos permisos que USER
- **ADMIN**: Todos los comandos, incluyendo `!qr` y `!bridgehealth`
- **OWNER**: Todos los comandos

## Integración con el Sistema

### Registro de Comandos

Los comandos se registran automáticamente mediante:

```typescript
import { registerBridgeCommands, registerAllCommands } from './commands/registry';

// Registrar todos los comandos
await registerAllCommands();
```

### Handlers de Comandos

Los handlers están disponibles en:

```typescript
import { bridgeCommandHandlers } from './commands/bridge.handlers';

// Acceso a handlers específicos
const bridgeHandler = bridgeCommandHandlers.bridge;
const chatsHandler = bridgeCommandHandlers.chats;
// etc.
```

### Ayuda Actualizada

El comando `!help` se ha actualizado para incluir los nuevos comandos del bridge en las secciones correspondientes.

## Tests

Se ha implementado una suite completa de tests en `tests/bridge-commands.test.ts` que cubre:

- ✅ Funcionalidad básica de todos los comandos
- ✅ Manejo de errores
- ✅ Permisos de usuario
- ✅ Validación de parámetros
- ✅ Estados del bridge (disponible/no disponible)
- ✅ Casos edge y datos vacíos

**Ejecutar tests**:
```bash
npm run test:bridge-commands
```

## Configuración

Los comandos utilizan la configuración existente del `WhatsAppBridgeService` y no requieren configuración adicional.

## Ejemplos de Uso

### Usuario normal consultando estado:
```
Usuario: !bridge
Bot: 🌉 Estado del Bridge WhatsApp

🔗 Estado de Conexión:
• Bridge disponible: ✅ Sí
• Estado interno: ✅ Conectado
• Estado WhatsApp: ✅ Conectado
• Número conectado: 5521234567890

⏰ Consultado: 18/6/2025 0:15:30
```

### Usuario consultando chats:
```
Usuario: !chats 5
Bot: 💬 Lista de Chats (3/5)

**1.** Familia Martínez
   📞 120363043968848390@g.us
   📬 2 sin leer
   ⏰ jun 17, 23:45

**2.** Juan Pérez
   📞 5521234567890@s.whatsapp.net
   📬 0 sin leer
   ⏰ jun 17, 20:30

**3.** Trabajo
   📞 120363025555555555@g.us
   📬 5 sin leer
   ⏰ jun 17, 18:00

💡 Tip: Usa `!history [id_chat]` para ver el historial de mensajes.
```

### Administrador obteniendo QR:
```
Admin: !qr
Bot: 📱 Código QR para WhatsApp

**Estado:** Generado
**Mensaje:** QR code generated

**Código QR:**
```
[CÓDIGO QR AQUÍ]
```

💡 Instrucciones:
1. Abre WhatsApp en tu teléfono
2. Ve a Menú > Dispositivos vinculados
3. Toca "Vincular un dispositivo"
4. Escanea este código QR

⚠️ Nota: Este código es sensible, no lo compartas.
```

## Próximos Pasos

1. **Integración con contextos**: Los comandos podrían integrarse con el sistema de contextos para proporcionar experiencias más ricas
2. **Comandos de gestión**: Implementar comandos para enviar mensajes, crear grupos, etc.
3. **Webhooks**: Integrar con webhooks del bridge para notificaciones en tiempo real
4. **Persistencia**: Guardar configuraciones de usuarios para personalizar la experiencia

## Archivos Relacionados

- `src/commands/bridge.commands.ts` - Definiciones de comandos
- `src/commands/bridge.handlers.ts` - Implementación de handlers
- `src/commands/registry.ts` - Registro de comandos (actualizado)
- `src/commands/basic.handlers.ts` - Ayuda actualizada
- `tests/bridge-commands.test.ts` - Suite de tests
- `package.json` - Scripts de test actualizados
