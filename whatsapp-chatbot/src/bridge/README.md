# WhatsApp Bridge Client

Cliente TypeScript completamente tipado para comunicarse con el WhatsApp Bridge escrito en Go.

## Instalación

```bash
# El cliente está incluido en el proyecto
# No requiere instalación adicional
```

## Uso Básico

```typescript
import { WhatsAppBridgeClient } from '../bridge';

// Crear cliente con configuración por defecto
const client = new WhatsAppBridgeClient();

// O con configuración personalizada
const client = new WhatsAppBridgeClient({
  baseUrl: 'http://localhost:8080',
  timeout: 10000,
  retries: 2
});

// Verificar disponibilidad
const isAvailable = await client.isAvailable();
console.log('Bridge disponible:', isAvailable);

// Enviar mensaje de texto
const result = await client.sendMessage('1234567890', 'Hola mundo!');
console.log('Mensaje enviado:', result.success);

// Enviar imagen
const mediaResult = await client.sendMedia(
  '1234567890', 
  '/path/to/image.jpg', 
  'Mira esta imagen'
);

// Descargar multimedia
const download = await client.downloadMedia('messageId', 'chatJid');
console.log('Archivo descargado en:', download.data?.path);
```

## API Reference

### WhatsAppBridgeClient

#### Constructor

```typescript
new WhatsAppBridgeClient(config?: Partial<BridgeClientConfig>)
```

#### Métodos

##### sendMessage(recipient, message)
Envía un mensaje de texto.

```typescript
await client.sendMessage('1234567890', 'Hola mundo!');
```

##### sendMedia(recipient, mediaPath, message?)
Envía un archivo multimedia con mensaje opcional.

```typescript
await client.sendMedia('1234567890', '/path/to/file.jpg', 'Descripción');
```

##### downloadMedia(messageId, chatJid)
Descarga multimedia de un mensaje específico.

```typescript
const result = await client.downloadMedia('msgId', 'chatJid');
console.log('Archivo:', result.data?.path);
```

##### ping()
Verifica si el bridge está disponible.

```typescript
const available = await client.ping();
```

##### getStatus()
Obtiene el estado actual del bridge.

```typescript
const status = await client.getStatus();
console.log('Conectado:', status.connected);
```

## Configuración

### Configuraciones Predefinidas

```typescript
import { 
  DEFAULT_CONFIG, 
  DEVELOPMENT_CONFIG, 
  PRODUCTION_CONFIG,
  getConfigForEnvironment 
} from '../bridge';

// Usar configuración por entorno
const config = getConfigForEnvironment(process.env.NODE_ENV);
const client = new WhatsAppBridgeClient(config);
```

### Opciones de Configuración

```typescript
interface BridgeClientConfig {
  baseUrl: string;        // URL del bridge (default: http://127.0.0.1:8080)
  timeout: number;        // Timeout en ms (default: 15000)
  retries: number;        // Número de reintentos (default: 3)
  retryDelay: number;     // Delay entre reintentos (default: 1000)
  apiKey?: string;        // API key para autenticación
  enableLogging: boolean; // Habilitar logs (default: true)
}
```

## Manejo de Errores

```typescript
import { BridgeClientError } from '../bridge';

try {
  await client.sendMessage('invalid', 'test');
} catch (error) {
  if (error instanceof BridgeClientError) {
    console.log('Código de error:', error.code);
    console.log('Es recuperable:', error.isRetryable());
    console.log('Es error de conexión:', error.isConnectionError());
  }
}
```

## Utilidades

El cliente incluye utilidades para trabajar con números de teléfono, JIDs y mensajes:

```typescript
import { BridgeUtils } from '../bridge';

// Validar número de teléfono
const isValid = BridgeUtils.isValidPhoneNumber('1234567890');

// Formatear número
const formatted = BridgeUtils.formatPhoneNumber('+52 123 456 7890');

// Crear JID
const jid = BridgeUtils.createJidFromPhone('1234567890');

// Verificar tipo de archivo
const isImage = BridgeUtils.isImageFile('photo.jpg');

// Parsear comandos
const { command, args } = BridgeUtils.parseCommand('/help comando');
```

## Testing

```bash
# Ejecutar tests del bridge client
npm test -- bridge-client.test.ts
```

## Logging

El cliente incluye logging automático de requests y responses. Para deshabilitarlo:

```typescript
const client = new WhatsAppBridgeClient({
  enableLogging: false
});
```

## Cleanup

Siempre limpia los recursos al finalizar:

```typescript
// Al finalizar la aplicación
await client.destroy();
```