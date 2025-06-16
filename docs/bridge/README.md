# WhatsApp Bridge Documentation

Documentación completa para el WhatsApp Bridge API.

## 📋 Contenido

- **[API Reference](./api-reference.md)** - Documentación completa de endpoints
- **[OpenAPI Spec](./openapi.json)** - Especificación OpenAPI/Swagger
- **[Flow Diagrams](./flow-diagrams.md)** - Diagramas de flujo y arquitectura
- **[Type Coverage](./type-coverage.md)** - Análisis de cobertura de tipos
- **[Postman Collection](./postman-collection.json)** - Colección para Postman

## 🚀 Inicio Rápido

### Verificar que el Bridge esté ejecutándose

```bash
curl http://127.0.0.1:8080/api/send \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
```

### Enviar mensaje básico

```bash
curl http://127.0.0.1:8080/api/send \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "1234567890",
    "message": "¡Hola desde el bridge!"
  }'
```

## 📊 Estadísticas

- **Endpoints documentados**: 2
- **Estructuras analizadas**: 7
- **Última actualización**: 16/6/2025

## 🛠️ Herramientas

### Swagger UI
Visualiza la API usando Swagger UI:
```bash
# Servir documentación con swagger-ui
npx swagger-ui-serve openapi.json
```

### Postman
Importa la colección `postman-collection.json` en Postman para probar los endpoints.

### Cliente TypeScript
Usa el cliente tipado generado automáticamente:
```typescript
import { WhatsAppBridgeClient } from '../src/bridge';

const client = new WhatsAppBridgeClient();
await client.sendMessage('1234567890', 'Hola!');
```

## 🔄 Regenerar Documentación

```bash
# Regenerar toda la documentación
node ../scripts/generate-bridge-docs.js

# Solo tipos
node ../scripts/analyze-bridge-types.js

# Solo cliente
node ../scripts/generate-bridge-client.js
```

## 📝 Contribuir

1. Actualiza los comentarios en el código Go
2. Regenera la documentación
3. Verifica que todos los tipos estén cubiertos
4. Actualiza ejemplos si es necesario

---

Generado automáticamente por `generate-bridge-docs.js`
