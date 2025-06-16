# WhatsApp Bridge API Documentation

Esta documentación describe todos los endpoints disponibles en el WhatsApp Bridge.

## Información General

- **Base URL**: `http://127.0.0.1:8080`
- **Content-Type**: `application/json`
- **Autenticación**: No requerida (solo local)

## Endpoints

### POST /api/send

Only allow POST requests

**Request:**
Sin tipo específico


```json
{
  "recipient": "1234567890",
  "message": "Hola mundo!"
}
```


**Response:**
Tipo genérico


```json
{
  "success": true,
  "message": "Message sent to 1234567890"
}
```


---

### POST /api/download

Only allow POST requests

**Request:**
Sin tipo específico


```json
{
  "message_id": "3EB0C767D82C1D4F0A84",
  "chat_jid": "1234567890@s.whatsapp.net"
}
```


**Response:**
Tipo genérico


```json
{
  "success": true,
  "filename": "image_20240101_120000.jpg",
  "path": "/absolute/path/to/file.jpg"
}
```


---

## Estructuras de Datos

### Message

Message represents a chat message for our client
type Message struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `Time` | `time.Time` | `time` | Sin descripción |
| `Sender` | `string` | `sender` | Sin descripción |
| `Content` | `string` | `content` | Sin descripción |
| `IsFromMe` | `bool` | `isfromme` | Sin descripción |
| `MediaType` | `string` | `mediatype` | Sin descripción |
| `Filename` | `string` | `filename` | Sin descripción |

---

### MessageStore

Database handler for storing message history
type MessageStore struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `db` | `*sql.DB` | `db` | Sin descripción |

---

### SendMessageResponse

SendMessageResponse represents the response for the send message API
type SendMessageResponse struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `Success` | `bool` | `success` | Sin descripción |
| `Message` | `string` | `message` | Sin descripción |

---

### SendMessageRequest

SendMessageRequest represents the request body for the send message API
type SendMessageRequest struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `Recipient` | `string` | `recipient` | Sin descripción |
| `Message` | `string` | `message` | Sin descripción |
| `MediaPath` | `string` | `media_path,omitempty` | Sin descripción |

---

### DownloadMediaRequest

DownloadMediaRequest represents the request body for the download media API
type DownloadMediaRequest struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `MessageID` | `string` | `message_id` | Sin descripción |
| `ChatJID` | `string` | `chat_jid` | Sin descripción |

---

### DownloadMediaResponse

DownloadMediaResponse represents the response for the download media API
type DownloadMediaResponse struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `Success` | `bool` | `success` | Sin descripción |
| `Message` | `string` | `message` | Sin descripción |
| `Filename` | `string` | `filename,omitempty` | Sin descripción |
| `Path` | `string` | `path,omitempty` | Sin descripción |

---

### MediaDownloader

MediaDownloader implements the whatsmeow.DownloadableMessage interface
type MediaDownloader struct

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
| `URL` | `string` | `url` | Sin descripción |
| `DirectPath` | `string` | `directpath` | Sin descripción |
| `MediaKey` | `[]byte` | `mediakey` | Sin descripción |
| `FileLength` | `uint64` | `filelength` | Sin descripción |
| `FileSHA256` | `[]byte` | `filesha256` | Sin descripción |
| `FileEncSHA256` | `[]byte` | `fileencsha256` | Sin descripción |
| `MediaType` | `whatsmeow.MediaType` | `mediatype` | Sin descripción |

---

## Ejemplos de Uso

### cURL

```bash
# Enviar mensaje de texto
curl -X POST http://127.0.0.1:8080/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "1234567890",
    "message": "Hola mundo!"
  }'

# Enviar multimedia
curl -X POST http://127.0.0.1:8080/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "1234567890",
    "message": "Mira esta imagen",
    "media_path": "/path/to/image.jpg"
  }'

# Descargar multimedia
curl -X POST http://127.0.0.1:8080/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "3EB0C767D82C1D4F0A84",
    "chat_jid": "1234567890@s.whatsapp.net"
  }'
```

### JavaScript/TypeScript

```typescript
import { WhatsAppBridgeClient } from './bridge';

const client = new WhatsAppBridgeClient();

// Enviar mensaje
const result = await client.sendMessage('1234567890', 'Hola!');

// Enviar multimedia
const mediaResult = await client.sendMedia(
  '1234567890', 
  '/path/to/file.jpg', 
  'Descripción'
);

// Descargar multimedia
const download = await client.downloadMedia('messageId', 'chatJid');
```

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400    | Bad Request - Parámetros inválidos |
| 404    | Not Found - Endpoint no encontrado |
| 405    | Method Not Allowed - Método HTTP no permitido |
| 500    | Internal Server Error - Error interno del bridge |

## Notas Importantes

1. **Formato de números**: Los números de teléfono deben incluir código de país sin el símbolo +
2. **JIDs de grupo**: Los grupos usan el formato `123456@g.us`
3. **JIDs individuales**: Los contactos usan `123456@s.whatsapp.net`
4. **Archivos multimedia**: Deben existir en el sistema de archivos del servidor
5. **Descarga de multimedia**: Solo funciona para mensajes que el bridge ha procesado

