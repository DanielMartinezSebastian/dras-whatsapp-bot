#!/usr/bin/env node

/**
 * Script para generar documentación completa de la API del WhatsApp Bridge
 *
 * Genera:
 * 1. Documentación OpenAPI/Swagger
 * 2. Documentación de endpoints en Markdown
 * 3. Diagramas de flujo de datos
 * 4. Análisis de cobertura de tipos
 *
 * Uso: node scripts/generate-bridge-docs.js
 */

const fs = require("fs");
const path = require("path");

class BridgeDocumentationGenerator {
  constructor() {
    this.bridgePath = path.resolve(__dirname, "../whatsapp-bridge/main.go");
    this.outputDir = path.resolve(__dirname, "../docs/bridge");
    this.endpoints = new Map();
    this.structs = new Map();
  }

  /**
   * Generar toda la documentación
   */
  async generate() {
    console.log("📚 Generando documentación completa del WhatsApp Bridge...\n");

    this.ensureOutputDir();

    // Analizar código Go
    this.analyzeBridge();

    // Generar diferentes tipos de documentación
    this.generateOpenApiSpec();
    this.generateMarkdownDocs();
    this.generateFlowDiagrams();
    this.generateTypeCoverage();
    this.generatePostmanCollection();
    this.generateReadme();

    console.log("✅ Documentación generada exitosamente!");
    console.log(`📁 Archivos disponibles en: ${this.outputDir}`);
  }

  /**
   * Crear directorio de salida
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Analizar código Go del bridge
   */
  analyzeBridge() {
    if (!fs.existsSync(this.bridgePath)) {
      throw new Error(`Bridge no encontrado en: ${this.bridgePath}`);
    }

    const content = fs.readFileSync(this.bridgePath, "utf8");

    // Extraer endpoints
    this.extractEndpoints(content);

    // Extraer estructuras
    this.extractStructs(content);

    console.log(
      `📊 Análisis completado: ${this.endpoints.size} endpoints, ${this.structs.size} estructuras`
    );
  }

  /**
   * Extraer endpoints HTTP
   */
  extractEndpoints(content) {
    const handlerRegex =
      /http\.HandleFunc\("([^"]+)",\s*func\([^)]+\)\s*{([^}]+(?:{[^}]*}[^}]*)*)/g;
    let match;

    while ((match = handlerRegex.exec(content)) !== null) {
      const [, path, handlerBody] = match;

      const endpoint = {
        path,
        method: this.extractMethod(handlerBody),
        description: this.extractDescription(handlerBody),
        requestType: this.extractRequestType(handlerBody),
        responseType: this.extractResponseType(handlerBody),
        parameters: this.extractParameters(handlerBody),
        examples: this.generateExamples(path, handlerBody),
      };

      this.endpoints.set(path, endpoint);
    }
  }

  /**
   * Extraer estructuras Go
   */
  extractStructs(content) {
    const structRegex = /type\s+(\w+)\s+struct\s*{([^}]+)}/g;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
      const [, name, body] = match;

      const struct = {
        name,
        fields: this.parseStructFields(body),
        description: this.extractStructDescription(content, name),
      };

      this.structs.set(name, struct);
    }
  }

  /**
   * Generar especificación OpenAPI
   */
  generateOpenApiSpec() {
    const spec = {
      openapi: "3.0.0",
      info: {
        title: "WhatsApp Bridge API",
        version: "1.0.0",
        description: "API para comunicarse con WhatsApp a través del bridge Go",
        contact: {
          name: "WhatsApp Bridge",
          url: "https://github.com/your-repo/whatsapp-bridge",
        },
      },
      servers: [
        {
          url: "http://127.0.0.1:8080",
          description: "Servidor local del bridge",
        },
      ],
      paths: {},
      components: {
        schemas: this.generateSchemas(),
        responses: this.generateCommonResponses(),
      },
    };

    // Generar paths para cada endpoint
    for (const [path, endpoint] of this.endpoints) {
      spec.paths[path] = {
        [endpoint.method.toLowerCase()]: {
          summary: endpoint.description || `${endpoint.method} ${path}`,
          description: this.generateEndpointDescription(endpoint),
          requestBody: endpoint.requestType
            ? {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: `#/components/schemas/${endpoint.requestType}`,
                    },
                  },
                },
              }
            : undefined,
          responses: {
            200: {
              description: "Respuesta exitosa",
              content: {
                "application/json": {
                  schema: endpoint.responseType
                    ? { $ref: `#/components/schemas/${endpoint.responseType}` }
                    : { $ref: "#/components/schemas/BaseResponse" },
                },
              },
            },
            400: { $ref: "#/components/responses/BadRequest" },
            500: { $ref: "#/components/responses/InternalError" },
          },
          examples: endpoint.examples,
        },
      };
    }

    fs.writeFileSync(
      path.join(this.outputDir, "openapi.json"),
      JSON.stringify(spec, null, 2)
    );

    // También generar en YAML
    const yaml = this.jsonToYaml(spec);
    fs.writeFileSync(path.join(this.outputDir, "openapi.yaml"), yaml);

    console.log("✅ Especificación OpenAPI generada");
  }

  /**
   * Generar documentación Markdown
   */
  generateMarkdownDocs() {
    let content = `# WhatsApp Bridge API Documentation

Esta documentación describe todos los endpoints disponibles en el WhatsApp Bridge.

## Información General

- **Base URL**: \`http://127.0.0.1:8080\`
- **Content-Type**: \`application/json\`
- **Autenticación**: No requerida (solo local)

## Endpoints

`;

    for (const [path, endpoint] of this.endpoints) {
      content += this.generateEndpointMarkdown(path, endpoint);
    }

    content += `## Estructuras de Datos

`;

    for (const [name, struct] of this.structs) {
      content += this.generateStructMarkdown(name, struct);
    }

    content += `## Ejemplos de Uso

### cURL

\`\`\`bash
# Enviar mensaje de texto
curl -X POST http://127.0.0.1:8080/api/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": "1234567890",
    "message": "Hola mundo!"
  }'

# Enviar multimedia
curl -X POST http://127.0.0.1:8080/api/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": "1234567890",
    "message": "Mira esta imagen",
    "media_path": "/path/to/image.jpg"
  }'

# Descargar multimedia
curl -X POST http://127.0.0.1:8080/api/download \\
  -H "Content-Type: application/json" \\
  -d '{
    "message_id": "3EB0C767D82C1D4F0A84",
    "chat_jid": "1234567890@s.whatsapp.net"
  }'
\`\`\`

### JavaScript/TypeScript

\`\`\`typescript
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
\`\`\`

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400    | Bad Request - Parámetros inválidos |
| 404    | Not Found - Endpoint no encontrado |
| 405    | Method Not Allowed - Método HTTP no permitido |
| 500    | Internal Server Error - Error interno del bridge |

## Notas Importantes

1. **Formato de números**: Los números de teléfono deben incluir código de país sin el símbolo +
2. **JIDs de grupo**: Los grupos usan el formato \`123456@g.us\`
3. **JIDs individuales**: Los contactos usan \`123456@s.whatsapp.net\`
4. **Archivos multimedia**: Deben existir en el sistema de archivos del servidor
5. **Descarga de multimedia**: Solo funciona para mensajes que el bridge ha procesado

`;

    fs.writeFileSync(path.join(this.outputDir, "api-reference.md"), content);
    console.log("✅ Documentación Markdown generada");
  }

  /**
   * Generar diagramas de flujo
   */
  generateFlowDiagrams() {
    const mermaidDiagram = `# Diagramas de Flujo del WhatsApp Bridge

## Flujo de Envío de Mensajes

\`\`\`mermaid
sequenceDiagram
    participant C as Cliente
    participant B as Bridge
    participant W as WhatsApp

    C->>B: POST /api/send
    Note over C,B: { recipient, message, media_path? }
    
    B->>B: Validar parámetros
    alt Parámetros inválidos
        B->>C: 400 Bad Request
    else Parámetros válidos
        B->>W: Enviar mensaje
        alt Envío exitoso
            W->>B: Confirmación
            B->>C: 200 OK { success: true }
        else Error de envío
            W->>B: Error
            B->>C: 500 Error { success: false }
        end
    end
\`\`\`

## Flujo de Descarga de Multimedia

\`\`\`mermaid
sequenceDiagram
    participant C as Cliente
    participant B as Bridge
    participant DB as SQLite
    participant W as WhatsApp

    C->>B: POST /api/download
    Note over C,B: { message_id, chat_jid }
    
    B->>DB: Buscar metadata del mensaje
    alt Mensaje no encontrado
        DB->>B: No rows
        B->>C: 404 Not Found
    else Mensaje encontrado
        DB->>B: Media metadata
        B->>W: Descargar archivo
        alt Descarga exitosa
            W->>B: Archivo binario
            B->>B: Guardar en disco
            B->>C: 200 OK { path, filename }
        else Error de descarga
            W->>B: Error
            B->>C: 500 Error
        end
    end
\`\`\`

## Arquitectura del Sistema

\`\`\`mermaid
graph TB
    subgraph "Cliente TypeScript"
        CTS[WhatsAppBridgeClient]
        CJS[Cliente Legacy JS]
    end
    
    subgraph "WhatsApp Bridge (Go)"
        API[REST API Server]
        WC[WhatsApp Client]
        MS[Message Store]
    end
    
    subgraph "Almacenamiento"
        DB[(SQLite DB)]
        FILES[Archivos Multimedia]
    end
    
    subgraph "WhatsApp"
        WA[WhatsApp Web API]
    end
    
    CTS -->|HTTP Requests| API
    CJS -->|HTTP Requests| API
    API --> WC
    WC --> WA
    WC --> MS
    MS --> DB
    MS --> FILES
    WA --> WC
\`\`\`

## Estados de Conexión

\`\`\`mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting: client.Connect()
    Connecting --> QRCode: Nueva sesión
    Connecting --> Connected: Sesión existente
    QRCode --> Connected: QR escaneado
    QRCode --> Disconnected: Timeout
    Connected --> Disconnected: Error/Logout
    Connected --> Connected: Mensajes activos
\`\`\`
`;

    fs.writeFileSync(
      path.join(this.outputDir, "flow-diagrams.md"),
      mermaidDiagram
    );
    console.log("✅ Diagramas de flujo generados");
  }

  /**
   * Generar análisis de cobertura de tipos
   */
  generateTypeCoverage() {
    const coverage = {
      endpoints: {
        total: this.endpoints.size,
        withRequestTypes: 0,
        withResponseTypes: 0,
        fullyTyped: 0,
      },
      structs: {
        total: this.structs.size,
        withDocumentation: 0,
        fieldsCovered: 0,
        totalFields: 0,
      },
    };

    // Analizar cobertura de endpoints
    for (const [path, endpoint] of this.endpoints) {
      if (endpoint.requestType) coverage.endpoints.withRequestTypes++;
      if (endpoint.responseType) coverage.endpoints.withResponseTypes++;
      if (endpoint.requestType && endpoint.responseType)
        coverage.endpoints.fullyTyped++;
    }

    // Analizar cobertura de structs
    for (const [name, struct] of this.structs) {
      if (struct.description) coverage.structs.withDocumentation++;
      coverage.structs.totalFields += struct.fields.length;
      coverage.structs.fieldsCovered += struct.fields.filter(
        (f) => f.description
      ).length;
    }

    const report = `# Análisis de Cobertura de Tipos

## Resumen Ejecutivo

| Métrica | Valor | Porcentaje |
|---------|-------|------------|
| **Endpoints totales** | ${coverage.endpoints.total} | 100% |
| Endpoints con request types | ${
      coverage.endpoints.withRequestTypes
    } | ${Math.round(
      (coverage.endpoints.withRequestTypes / coverage.endpoints.total) * 100
    )}% |
| Endpoints con response types | ${
      coverage.endpoints.withResponseTypes
    } | ${Math.round(
      (coverage.endpoints.withResponseTypes / coverage.endpoints.total) * 100
    )}% |
| Endpoints completamente tipados | ${
      coverage.endpoints.fullyTyped
    } | ${Math.round(
      (coverage.endpoints.fullyTyped / coverage.endpoints.total) * 100
    )}% |
| **Estructuras totales** | ${coverage.structs.total} | 100% |
| Estructuras documentadas | ${
      coverage.structs.withDocumentation
    } | ${Math.round(
      (coverage.structs.withDocumentation / coverage.structs.total) * 100
    )}% |
| Campos documentados | ${coverage.structs.fieldsCovered} / ${
      coverage.structs.totalFields
    } | ${Math.round(
      (coverage.structs.fieldsCovered / coverage.structs.totalFields) * 100
    )}% |

## Detalle por Endpoint

| Endpoint | Método | Request Type | Response Type | Estado |
|----------|--------|--------------|---------------|--------|
${Array.from(this.endpoints.entries())
  .map(([path, endpoint]) => {
    const hasRequest = endpoint.requestType ? "✅" : "❌";
    const hasResponse = endpoint.responseType ? "✅" : "❌";
    const status =
      endpoint.requestType && endpoint.responseType
        ? "✅ Completo"
        : "⚠️ Parcial";
    return `| \`${path}\` | ${endpoint.method} | ${hasRequest} | ${hasResponse} | ${status} |`;
  })
  .join("\n")}

## Detalle por Estructura

| Estructura | Campos | Documentada | Uso |
|------------|--------|-------------|-----|
${Array.from(this.structs.entries())
  .map(([name, struct]) => {
    const documented = struct.description ? "✅" : "❌";
    const usage = this.findStructUsage(name);
    return `| \`${name}\` | ${struct.fields.length} | ${documented} | ${usage} |`;
  })
  .join("\n")}

## Recomendaciones

### Alta Prioridad
- Completar tipos para endpoints sin response types
- Documentar estructuras principales

### Media Prioridad  
- Agregar ejemplos para todos los endpoints
- Documentar campos de estructuras complejas

### Baja Prioridad
- Optimizar nombres de tipos
- Agregar validaciones adicionales

## Última Actualización

${new Date().toISOString()}
`;

    fs.writeFileSync(path.join(this.outputDir, "type-coverage.md"), report);
    console.log("✅ Análisis de cobertura generado");
  }

  /**
   * Generar colección de Postman
   */
  generatePostmanCollection() {
    const collection = {
      info: {
        name: "WhatsApp Bridge API",
        description: "Colección de endpoints para el WhatsApp Bridge",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: [],
      variable: [
        {
          key: "bridge_url",
          value: "http://127.0.0.1:8080",
          type: "string",
        },
      ],
    };

    for (const [path, endpoint] of this.endpoints) {
      const item = {
        name: `${endpoint.method} ${path}`,
        request: {
          method: endpoint.method,
          header: [
            {
              key: "Content-Type",
              value: "application/json",
            },
          ],
          url: {
            raw: `{{bridge_url}}${path}`,
            host: ["{{bridge_url}}"],
            path: path.split("/").filter((p) => p),
          },
          description: endpoint.description,
        },
        response: [],
      };

      // Agregar body si es POST
      if (endpoint.method === "POST" && endpoint.examples) {
        item.request.body = {
          mode: "raw",
          raw: JSON.stringify(endpoint.examples.request || {}, null, 2),
        };
      }

      collection.item.push(item);
    }

    fs.writeFileSync(
      path.join(this.outputDir, "postman-collection.json"),
      JSON.stringify(collection, null, 2)
    );
    console.log("✅ Colección de Postman generada");
  }

  /**
   * Generar README principal
   */
  generateReadme() {
    const readme = `# WhatsApp Bridge Documentation

Documentación completa para el WhatsApp Bridge API.

## 📋 Contenido

- **[API Reference](./api-reference.md)** - Documentación completa de endpoints
- **[OpenAPI Spec](./openapi.json)** - Especificación OpenAPI/Swagger
- **[Flow Diagrams](./flow-diagrams.md)** - Diagramas de flujo y arquitectura
- **[Type Coverage](./type-coverage.md)** - Análisis de cobertura de tipos
- **[Postman Collection](./postman-collection.json)** - Colección para Postman

## 🚀 Inicio Rápido

### Verificar que el Bridge esté ejecutándose

\`\`\`bash
curl http://127.0.0.1:8080/api/send \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"test":"ping"}'
\`\`\`

### Enviar mensaje básico

\`\`\`bash
curl http://127.0.0.1:8080/api/send \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": "1234567890",
    "message": "¡Hola desde el bridge!"
  }'
\`\`\`

## 📊 Estadísticas

- **Endpoints documentados**: ${this.endpoints.size}
- **Estructuras analizadas**: ${this.structs.size}
- **Última actualización**: ${new Date().toLocaleDateString()}

## 🛠️ Herramientas

### Swagger UI
Visualiza la API usando Swagger UI:
\`\`\`bash
# Servir documentación con swagger-ui
npx swagger-ui-serve openapi.json
\`\`\`

### Postman
Importa la colección \`postman-collection.json\` en Postman para probar los endpoints.

### Cliente TypeScript
Usa el cliente tipado generado automáticamente:
\`\`\`typescript
import { WhatsAppBridgeClient } from '../src/bridge';

const client = new WhatsAppBridgeClient();
await client.sendMessage('1234567890', 'Hola!');
\`\`\`

## 🔄 Regenerar Documentación

\`\`\`bash
# Regenerar toda la documentación
node ../scripts/generate-bridge-docs.js

# Solo tipos
node ../scripts/analyze-bridge-types.js

# Solo cliente
node ../scripts/generate-bridge-client.js
\`\`\`

## 📝 Contribuir

1. Actualiza los comentarios en el código Go
2. Regenera la documentación
3. Verifica que todos los tipos estén cubiertos
4. Actualiza ejemplos si es necesario

---

Generado automáticamente por \`generate-bridge-docs.js\`
`;

    fs.writeFileSync(path.join(this.outputDir, "README.md"), readme);
    console.log("✅ README generado");
  }

  // Métodos auxiliares
  extractMethod(handlerBody) {
    if (handlerBody.includes("http.MethodPost")) return "POST";
    if (handlerBody.includes("http.MethodGet")) return "GET";
    if (handlerBody.includes("http.MethodPut")) return "PUT";
    if (handlerBody.includes("http.MethodDelete")) return "DELETE";
    return "POST";
  }

  extractDescription(handlerBody) {
    const commentMatch = handlerBody.match(/\/\/\s*(.+)/);
    return commentMatch ? commentMatch[1] : "";
  }

  extractRequestType(handlerBody) {
    const match = handlerBody.match(/var\s+req\s+(\w+)/);
    return match ? match[1] : null;
  }

  extractResponseType(handlerBody) {
    const match = handlerBody.match(/json\.NewEncoder.*\.Encode\((\w+){/);
    return match ? match[1] : null;
  }

  extractParameters(handlerBody) {
    // Extraer parámetros de query string o body
    return [];
  }

  generateExamples(path, handlerBody) {
    const examples = {};

    if (path === "/api/send") {
      examples.request = {
        recipient: "1234567890",
        message: "Hola mundo!",
      };
      examples.response = {
        success: true,
        message: "Message sent to 1234567890",
      };
    } else if (path === "/api/download") {
      examples.request = {
        message_id: "3EB0C767D82C1D4F0A84",
        chat_jid: "1234567890@s.whatsapp.net",
      };
      examples.response = {
        success: true,
        filename: "image_20240101_120000.jpg",
        path: "/absolute/path/to/file.jpg",
      };
    }

    return examples;
  }

  parseStructFields(body) {
    const fields = [];
    const lines = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    for (const line of lines) {
      const fieldRegex = /^(\w+)\s+([^\s`]+)(?:\s+`([^`]+)`)?/;
      const match = fieldRegex.exec(line);

      if (match) {
        const [, fieldName, fieldType, tags] = match;

        let jsonTag = fieldName.toLowerCase();
        if (tags) {
          const jsonMatch = tags.match(/json:"([^"]+)"/);
          if (jsonMatch) {
            jsonTag = jsonMatch[1];
          }
        }

        fields.push({
          name: fieldName,
          type: fieldType,
          jsonTag: jsonTag,
          tags: tags,
        });
      }
    }

    return fields;
  }

  extractStructDescription(content, structName) {
    // Buscar comentarios antes de la definición del struct
    const structRegex = new RegExp(
      `//.*\\n(?://.*\\n)*\\s*type\\s+${structName}\\s+struct`,
      "g"
    );
    const match = structRegex.exec(content);

    if (match) {
      const comments = match[0]
        .split("\\n")
        .filter((line) => line.includes("//"))
        .map((line) => line.replace(/^\/\/\s*/, ""))
        .join(" ");
      return comments;
    }

    return "";
  }

  generateSchemas() {
    const schemas = {};

    for (const [name, struct] of this.structs) {
      schemas[name] = {
        type: "object",
        properties: {},
        required: [],
      };

      for (const field of struct.fields) {
        schemas[name].properties[field.jsonTag] = {
          type: this.goTypeToOpenApiType(field.type),
          description: field.description || `Campo ${field.name}`,
        };

        if (!field.tags || !field.tags.includes("omitempty")) {
          schemas[name].required.push(field.jsonTag);
        }
      }
    }

    // Agregar schemas base
    schemas.BaseResponse = {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          description: "Indica si la operación fue exitosa",
        },
        message: { type: "string", description: "Mensaje descriptivo" },
        data: { description: "Datos de respuesta (opcional)" },
      },
      required: ["success"],
    };

    return schemas;
  }

  generateCommonResponses() {
    return {
      BadRequest: {
        description: "Parámetros inválidos",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
            example: {
              error: "Recipient is required",
            },
          },
        },
      },
      InternalError: {
        description: "Error interno del servidor",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
              },
            },
            example: {
              success: false,
              message: "Error interno del bridge",
            },
          },
        },
      },
    };
  }

  goTypeToOpenApiType(goType) {
    const typeMap = {
      string: "string",
      int: "integer",
      int32: "integer",
      int64: "integer",
      uint32: "integer",
      uint64: "integer",
      float32: "number",
      float64: "number",
      bool: "boolean",
      "time.Time": "string",
      "[]byte": "string",
    };

    if (goType.startsWith("[]")) {
      return "array";
    }

    if (goType.startsWith("*")) {
      return this.goTypeToOpenApiType(goType.substring(1));
    }

    return typeMap[goType] || "object";
  }

  generateEndpointDescription(endpoint) {
    let desc =
      endpoint.description || `Endpoint ${endpoint.method} ${endpoint.path}`;

    if (endpoint.requestType) {
      desc += `\n\nTipo de request: ${endpoint.requestType}`;
    }

    if (endpoint.responseType) {
      desc += `\n\nTipo de response: ${endpoint.responseType}`;
    }

    return desc;
  }

  generateEndpointMarkdown(path, endpoint) {
    return `### ${endpoint.method} ${path}

${endpoint.description || "Sin descripción"}

**Request:**
${
  endpoint.requestType
    ? `Tipo: \`${endpoint.requestType}\``
    : "Sin tipo específico"
}

${
  endpoint.examples?.request
    ? `
\`\`\`json
${JSON.stringify(endpoint.examples.request, null, 2)}
\`\`\`
`
    : ""
}

**Response:**
${
  endpoint.responseType ? `Tipo: \`${endpoint.responseType}\`` : "Tipo genérico"
}

${
  endpoint.examples?.response
    ? `
\`\`\`json
${JSON.stringify(endpoint.examples.response, null, 2)}
\`\`\`
`
    : ""
}

---

`;
  }

  generateStructMarkdown(name, struct) {
    return `### ${name}

${struct.description || "Sin descripción"}

| Campo | Tipo | JSON | Descripción |
|-------|------|------|-------------|
${struct.fields
  .map(
    (field) =>
      `| \`${field.name}\` | \`${field.type}\` | \`${field.jsonTag}\` | ${
        field.description || "Sin descripción"
      } |`
  )
  .join("\n")}

---

`;
  }

  findStructUsage(structName) {
    let usage = [];

    for (const [path, endpoint] of this.endpoints) {
      if (endpoint.requestType === structName) {
        usage.push(`Request en ${path}`);
      }
      if (endpoint.responseType === structName) {
        usage.push(`Response en ${path}`);
      }
    }

    return usage.length > 0 ? usage.join(", ") : "No usado";
  }

  jsonToYaml(obj, indent = 0) {
    let yaml = "";
    const spaces = "  ".repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === "object" && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.jsonToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === "object") {
            yaml += `${spaces}  -\n`;
            yaml += this.jsonToYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === "string") {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
}

// Función principal
async function main() {
  try {
    const generator = new BridgeDocumentationGenerator();
    await generator.generate();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = BridgeDocumentationGenerator;
