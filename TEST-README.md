# 🧪 Scripts de Prueba DrasBot v2.0

Este directorio contiene scripts de prueba unificados para DrasBot v2.0 con configuración centralizada.

## 📋 Configuración

Todos los scripts ahora usan el número de teléfono **34633471003** de manera consistente.

### Archivos de Configuración

- **`test-config.js`** - Configuración para scripts de Node.js
- **`test-config.sh`** - Configuración para scripts de Bash  

### Variables Principales

```javascript
TEST_PHONE: "34633471003"              // Número de teléfono de prueba (España)
TEST_PHONE_JID: "34633471003@s.whatsapp.net"  // JID completo
BOT_URL: "http://localhost:3000"       // URL del bot TypeScript
BRIDGE_URL: "http://127.0.0.1:8080"   // URL del bridge Go
WEBHOOK_URL: "http://localhost:3000/webhook/whatsapp"  // Webhook del bot
```

## 🚀 Scripts Disponibles

### Scripts Principales

1. **`test-suite.js`** - 🎯 Script maestro que ejecuta todas las pruebas
   ```bash
   node test-suite.js
   node test-suite.js --help
   ```

2. **`test-commands.js`** - 🤖 Prueba comandos del bot
   ```bash
   node test-commands.js
   ```

3. **`test-bridge.js`** - 🌉 Prueba funcionalidad del bridge
   ```bash
   node test-bridge.js
   ```

### Scripts de Auto-respuestas

4. **`drasbot-new/test-auto-responses.sh`** - 💬 Prueba sistema de auto-respuestas
   ```bash
   cd drasbot-new
   ./test-auto-responses.sh
   ```

5. **`drasbot-new/debug-auto-responses.js`** - 🔧 Debug del handler de auto-respuestas
   ```bash
   cd drasbot-new
   node debug-auto-responses.js
   ```

## 📞 Número de Prueba

**Número configurado:** `34633471003` (España)

Este número se usa consistentemente en todos los scripts para:
- ✅ Envío de comandos de prueba
- ✅ Simulación de mensajes entrantes  
- ✅ Tests de auto-respuestas
- ✅ Pruebas de funcionalidad del bridge

## 🔧 Requisitos Previos

Antes de ejecutar las pruebas, asegúrate de que estén funcionando:

1. **Bridge de WhatsApp (Go)**
   ```bash
   cd whatsapp-bridge
   go run main.go
   ```

2. **Bot DrasBot v2.0 (TypeScript)**
   ```bash
   cd drasbot-new
   npm start
   ```

## 📊 Orden de Ejecución Recomendado

1. Iniciar bridge y bot
2. Ejecutar `node test-suite.js` para pruebas generales
3. Ejecutar `cd drasbot-new && ./test-auto-responses.sh` para auto-respuestas
4. Revisar logs y respuestas en WhatsApp

## ✅ Verificación

Después de ejecutar las pruebas:
- 📱 Revisa WhatsApp en el número 34633471003
- 📋 Verifica logs del bot y bridge
- 🎯 Confirma que lleguen respuestas automáticas y a comandos

## 🔄 Actualización del Número

Para cambiar el número de prueba:
1. Edita `TEST_PHONE` en `test-config.js` y `test-config.sh`
2. Todos los scripts usarán automáticamente el nuevo número
