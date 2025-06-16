# WhatsApp Bridge Types

Definiciones de tipos TypeScript generadas automáticamente para el WhatsApp Bridge.

## Estructuras Disponibles

### Message

```typescript
interface Message {
  time: Date | string;
  sender: string;
  content: string;
  isfromme: boolean;
  mediatype: string;
  filename: string;
}
```

### MessageStore

```typescript
interface MessageStore {
  db: sql.DB | null;
}
```

### SendMessageResponse

```typescript
interface SendMessageResponse {
  success: boolean;
  message: string;
}
```

### SendMessageRequest

```typescript
interface SendMessageRequest {
  recipient: string;
  message: string;
  media_path,omitempty: string;
}
```

### DownloadMediaRequest

```typescript
interface DownloadMediaRequest {
  message_id: string;
  chat_jid: string;
}
```

### DownloadMediaResponse

```typescript
interface DownloadMediaResponse {
  success: boolean;
  message: string;
  filename,omitempty: string;
  path,omitempty: string;
}
```

### MediaDownloader

```typescript
interface MediaDownloader {
  url: string;
  directpath: string;
  mediakey: byte[];
  filelength: number;
  filesha256: byte[];
  fileencsha256: byte[];
  mediatype: whatsmeow.MediaType;
}
```

## Endpoints Disponibles

### POST /api/send

Only allow POST requests

**Request Type:** SendMessageRequest

**Response Type:** SendMessageResponse

### POST /api/download

Only allow POST requests

**Request Type:** DownloadMediaRequest

**Response Type:** DownloadMediaResponse

## Uso

```typescript
import { WhatsAppBridge } from './bridge-types';

// Usar las interfaces
const client: WhatsAppBridge.IBridgeClient = new BridgeClient();
```
