#!/usr/bin/env node

/**
 * Script para analizar el WhatsApp Bridge y generar definiciones de tipos TypeScript
 *
 * Este script:
 * 1. Analiza el código Go del bridge
 * 2. Extrae todas las estructuras, funciones y endpoints
 * 3. Genera definiciones de tipos TypeScript correspondientes
 * 4. Crea interfaces para todos los métodos del bridge
 *
 * Uso: node scripts/analyze-bridge-types.js
 */

const fs = require("fs");
const path = require("path");

// Configuración
const BRIDGE_PATH = "../whatsapp-bridge/main.go";
const OUTPUT_DIR = "../whatsapp-chatbot/src/types/bridge";
const OUTPUT_FILE = "bridge-types.d.ts";

class BridgeAnalyzer {
  constructor() {
    this.structs = new Map();
    this.functions = new Map();
    this.endpoints = new Map();
    this.constants = new Map();
    this.imports = new Set();
  }

  /**
   * Analizar el archivo main.go del bridge
   */
  analyze() {
    const bridgePath = path.resolve(__dirname, BRIDGE_PATH);

    if (!fs.existsSync(bridgePath)) {
      console.error(
        `❌ No se encontró el archivo del bridge en: ${bridgePath}`
      );
      process.exit(1);
    }

    console.log(`🔍 Analizando bridge en: ${bridgePath}`);

    const content = fs.readFileSync(bridgePath, "utf8");

    // Analizar diferentes elementos del código Go
    this.extractStructs(content);
    this.extractFunctions(content);
    this.extractEndpoints(content);
    this.extractConstants(content);

    console.log(`✅ Análisis completado:`);
    console.log(`   - ${this.structs.size} estructuras encontradas`);
    console.log(`   - ${this.functions.size} funciones encontradas`);
    console.log(`   - ${this.endpoints.size} endpoints encontrados`);
    console.log(`   - ${this.constants.size} constantes encontradas`);

    return this;
  }

  /**
   * Extraer estructuras Go (structs)
   */
  extractStructs(content) {
    // Regex para capturar structs Go
    const structRegex = /type\s+(\w+)\s+struct\s*{([^}]+)}/g;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
      const [fullMatch, structName, structBody] = match;

      // Extraer campos del struct
      const fields = this.parseStructFields(structBody);

      this.structs.set(structName, {
        name: structName,
        fields: fields,
        rawBody: structBody.trim(),
      });
    }
  }

  /**
   * Parsear campos de un struct Go
   */
  parseStructFields(structBody) {
    const fields = [];
    const lines = structBody
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    for (const line of lines) {
      // Regex para capturar: FieldName Type `json:"tag"`
      const fieldRegex = /^(\w+)\s+([^\s`]+)(?:\s+`([^`]+)`)?/;
      const match = fieldRegex.exec(line);

      if (match) {
        const [, fieldName, fieldType, tags] = match;

        // Extraer tag JSON si existe
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
          tsType: this.goTypeToTsType(fieldType),
        });
      }
    }

    return fields;
  }

  /**
   * Extraer funciones Go
   */
  extractFunctions(content) {
    // Regex para funciones Go
    const funcRegex =
      /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\(([^)]*)\))?\s*{/g;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const [fullMatch, funcName, params, returns] = match;

      // Parsear parámetros
      const parameters = this.parseParameters(params || "");
      const returnTypes = this.parseParameters(returns || "");

      this.functions.set(funcName, {
        name: funcName,
        parameters: parameters,
        returns: returnTypes,
        rawSignature: fullMatch,
      });
    }
  }

  /**
   * Extraer endpoints HTTP
   */
  extractEndpoints(content) {
    // Regex para endpoints HTTP
    const endpointRegex = /http\.HandleFunc\("([^"]+)",\s*func\([^)]+\)\s*{/g;
    let match;

    while ((match = endpointRegex.exec(content)) !== null) {
      const [fullMatch, endpoint] = match;

      // Encontrar el cuerpo del handler
      const handlerStart = match.index + fullMatch.length;
      const handlerBody = this.extractHandlerBody(content, handlerStart);

      // Analizar el handler para extraer request/response types
      const analysis = this.analyzeHandlerBody(handlerBody);

      this.endpoints.set(endpoint, {
        path: endpoint,
        method: this.extractHttpMethod(handlerBody),
        requestType: analysis.requestType,
        responseType: analysis.responseType,
        description: analysis.description,
      });
    }
  }

  /**
   * Extraer constantes
   */
  extractConstants(content) {
    // Regex para constantes Go
    const constRegex = /(?:const|var)\s+(\w+)\s*=\s*([^;\n]+)/g;
    let match;

    while ((match = constRegex.exec(content)) !== null) {
      const [fullMatch, constName, constValue] = match;

      this.constants.set(constName, {
        name: constName,
        value: constValue.trim(),
        tsValue: this.goValueToTsValue(constValue.trim()),
      });
    }
  }

  /**
   * Extraer cuerpo del handler HTTP
   */
  extractHandlerBody(content, startIndex) {
    let braceCount = 1;
    let i = startIndex;

    while (i < content.length && braceCount > 0) {
      if (content[i] === "{") braceCount++;
      if (content[i] === "}") braceCount--;
      i++;
    }

    return content.substring(startIndex, i - 1);
  }

  /**
   * Analizar cuerpo del handler HTTP
   */
  analyzeHandlerBody(handlerBody) {
    const analysis = {
      requestType: null,
      responseType: null,
      description: "",
    };

    // Buscar tipos de request
    const reqTypeMatch = handlerBody.match(/var\s+req\s+(\w+)/);
    if (reqTypeMatch) {
      analysis.requestType = reqTypeMatch[1];
    }

    // Buscar tipos de response
    const respTypeMatch = handlerBody.match(
      /json\.NewEncoder.*\.Encode\((\w+){/
    );
    if (respTypeMatch) {
      analysis.responseType = respTypeMatch[1];
    }

    // Extraer descripción de comentarios
    const commentMatch = handlerBody.match(/\/\/\s*(.+)/);
    if (commentMatch) {
      analysis.description = commentMatch[1];
    }

    return analysis;
  }

  /**
   * Extraer método HTTP del handler
   */
  extractHttpMethod(handlerBody) {
    if (handlerBody.includes("r.Method != http.MethodPost")) {
      return "POST";
    }
    if (handlerBody.includes("r.Method != http.MethodGet")) {
      return "GET";
    }
    if (handlerBody.includes("r.Method != http.MethodPut")) {
      return "PUT";
    }
    if (handlerBody.includes("r.Method != http.MethodDelete")) {
      return "DELETE";
    }
    return "POST"; // Por defecto
  }

  /**
   * Parsear parámetros de función Go
   */
  parseParameters(paramStr) {
    if (!paramStr.trim()) return [];

    const params = [];
    const parts = paramStr.split(",").map((p) => p.trim());

    for (const part of parts) {
      const paramMatch = part.match(/(\w+)\s+([^\s]+)/);
      if (paramMatch) {
        const [, paramName, paramType] = paramMatch;
        params.push({
          name: paramName,
          type: paramType,
          tsType: this.goTypeToTsType(paramType),
        });
      }
    }

    return params;
  }

  /**
   * Convertir tipos Go a TypeScript
   */
  goTypeToTsType(goType) {
    const typeMap = {
      string: "string",
      int: "number",
      int32: "number",
      int64: "number",
      uint32: "number",
      uint64: "number",
      float32: "number",
      float64: "number",
      bool: "boolean",
      "time.Time": "Date | string",
      "[]byte": "Uint8Array",
      error: "Error",
      "interface{}": "any",
      "*string": "string | null",
      "*int": "number | null",
      "*bool": "boolean | null",
    };

    // Tipos array
    if (goType.startsWith("[]")) {
      const innerType = goType.substring(2);
      return `${this.goTypeToTsType(innerType)}[]`;
    }

    // Tipos puntero
    if (goType.startsWith("*")) {
      const innerType = goType.substring(1);
      return `${this.goTypeToTsType(innerType)} | null`;
    }

    // Tipos map
    if (goType.startsWith("map[")) {
      return "Record<string, any>";
    }

    return typeMap[goType] || goType;
  }

  /**
   * Convertir valores Go a TypeScript
   */
  goValueToTsValue(goValue) {
    // Strings
    if (goValue.startsWith('"') && goValue.endsWith('"')) {
      return goValue;
    }

    // Números
    if (/^\d+(\.\d+)?$/.test(goValue)) {
      return goValue;
    }

    // Booleans
    if (goValue === "true" || goValue === "false") {
      return goValue;
    }

    return `"${goValue}"`;
  }

  /**
   * Generar definiciones TypeScript
   */
  generateTypes() {
    const outputDir = path.resolve(__dirname, OUTPUT_DIR);
    const outputPath = path.join(outputDir, OUTPUT_FILE);

    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let content = this.generateHeader();
    content += this.generateStructTypes();
    content += this.generateEndpointTypes();
    content += this.generateBridgeClientInterface();
    content += this.generateConstants();
    content += this.generateUtilityTypes();

    fs.writeFileSync(outputPath, content);

    console.log(`📄 Tipos generados en: ${outputPath}`);

    return outputPath;
  }

  /**
   * Generar header del archivo
   */
  generateHeader() {
    return `/**
 * Definiciones de tipos TypeScript para WhatsApp Bridge
 * 
 * Generado automáticamente por analyze-bridge-types.js
 * No editar manualmente - regenerar ejecutando el script
 * 
 * Fecha de generación: ${new Date().toISOString()}
 */

// Tipos base del bridge
export namespace WhatsAppBridge {

`;
  }

  /**
   * Generar tipos para structs
   */
  generateStructTypes() {
    let content = "  // Estructuras del bridge\n\n";

    for (const [structName, struct] of this.structs) {
      content += `  /**\n`;
      content += `   * ${structName} - Estructura del bridge Go\n`;
      content += `   */\n`;
      content += `  export interface ${structName} {\n`;

      for (const field of struct.fields) {
        const optional = field.tsType.includes("null") ? "?" : "";
        const cleanType = field.tsType.replace(" | null", "");

        content += `    /** ${field.name} (${field.type}) */\n`;
        content += `    ${field.jsonTag}${optional}: ${cleanType};\n`;
      }

      content += `  }\n\n`;
    }

    return content;
  }

  /**
   * Generar tipos para endpoints
   */
  generateEndpointTypes() {
    let content = "  // Endpoints del bridge\n\n";

    for (const [path, endpoint] of this.endpoints) {
      const endpointName = path
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^api/, "");

      content += `  /**\n`;
      content += `   * Endpoint: ${endpoint.method} ${path}\n`;
      if (endpoint.description) {
        content += `   * ${endpoint.description}\n`;
      }
      content += `   */\n`;
      content += `  export namespace ${endpointName} {\n`;

      if (endpoint.requestType && this.structs.has(endpoint.requestType)) {
        content += `    export type Request = ${endpoint.requestType};\n`;
      } else {
        content += `    export interface Request {\n`;
        content += `      [key: string]: any;\n`;
        content += `    }\n`;
      }

      if (endpoint.responseType && this.structs.has(endpoint.responseType)) {
        content += `    export type Response = ${endpoint.responseType};\n`;
      } else {
        content += `    export interface Response {\n`;
        content += `      success: boolean;\n`;
        content += `      message?: string;\n`;
        content += `      data?: any;\n`;
        content += `    }\n`;
      }

      content += `  }\n\n`;
    }

    return content;
  }

  /**
   * Generar interface principal del cliente bridge
   */
  generateBridgeClientInterface() {
    let content = "  // Interface principal del cliente bridge\n\n";

    content += `  /**\n`;
    content += `   * Cliente TypeScript para comunicarse con el WhatsApp Bridge\n`;
    content += `   */\n`;
    content += `  export interface IBridgeClient {\n`;

    // Métodos basados en endpoints
    for (const [path, endpoint] of this.endpoints) {
      const methodName = this.pathToMethodName(path);
      const endpointName = path
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^api/, "");

      content += `    /**\n`;
      content += `     * ${endpoint.method} ${path}\n`;
      if (endpoint.description) {
        content += `     * ${endpoint.description}\n`;
      }
      content += `     */\n`;
      content += `    ${methodName}(request: ${endpointName}.Request): Promise<${endpointName}.Response>;\n\n`;
    }

    // Métodos adicionales comunes
    content += `    /**\n`;
    content += `     * Verificar conexión con el bridge\n`;
    content += `     */\n`;
    content += `    ping(): Promise<boolean>;\n\n`;

    content += `    /**\n`;
    content += `     * Obtener estado del bridge\n`;
    content += `     */\n`;
    content += `    getStatus(): Promise<BridgeStatus>;\n\n`;

    content += `  }\n\n`;

    return content;
  }

  /**
   * Generar constantes
   */
  generateConstants() {
    let content = "  // Constantes del bridge\n\n";

    content += `  export const BRIDGE_CONSTANTS = {\n`;

    for (const [constName, constant] of this.constants) {
      content += `    ${constName}: ${constant.tsValue},\n`;
    }

    content += `  } as const;\n\n`;

    return content;
  }

  /**
   * Generar tipos utilitarios
   */
  generateUtilityTypes() {
    let content = "  // Tipos utilitarios\n\n";

    content += `  /**\n`;
    content += `   * Estado del bridge\n`;
    content += `   */\n`;
    content += `  export interface BridgeStatus {\n`;
    content += `    connected: boolean;\n`;
    content += `    uptime: number;\n`;
    content += `    messagesProcessed: number;\n`;
    content += `    lastActivity: string;\n`;
    content += `  }\n\n`;

    content += `  /**\n`;
    content += `   * Configuración del cliente bridge\n`;
    content += `   */\n`;
    content += `  export interface BridgeClientConfig {\n`;
    content += `    baseUrl: string;\n`;
    content += `    timeout: number;\n`;
    content += `    retries: number;\n`;
    content += `    apiKey?: string;\n`;
    content += `  }\n\n`;

    content += `  /**\n`;
    content += `   * Error del bridge\n`;
    content += `   */\n`;
    content += `  export interface BridgeError {\n`;
    content += `    code: string;\n`;
    content += `    message: string;\n`;
    content += `    details?: any;\n`;
    content += `  }\n\n`;

    // Cerrar namespace
    content += `}\n\n`;

    // Exportaciones por defecto
    content += `// Exportaciones por defecto para facilitar el uso\n`;
    content += `export type BridgeClient = WhatsAppBridge.IBridgeClient;\n`;
    content += `export type BridgeStatus = WhatsAppBridge.BridgeStatus;\n`;
    content += `export type BridgeError = WhatsAppBridge.BridgeError;\n`;

    return content;
  }

  /**
   * Convertir path de endpoint a nombre de método
   */
  pathToMethodName(path) {
    return path
      .replace(/^\/api\//, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
  }

  /**
   * Generar documentación adicional
   */
  generateDocumentation() {
    const docPath = path.resolve(__dirname, OUTPUT_DIR, "README.md");

    let content = `# WhatsApp Bridge Types

Definiciones de tipos TypeScript generadas automáticamente para el WhatsApp Bridge.

## Estructuras Disponibles

`;

    for (const [structName, struct] of this.structs) {
      content += `### ${structName}\n\n`;
      content += `\`\`\`typescript\n`;
      content += `interface ${structName} {\n`;

      for (const field of struct.fields) {
        content += `  ${field.jsonTag}: ${field.tsType};\n`;
      }

      content += `}\n`;
      content += `\`\`\`\n\n`;
    }

    content += `## Endpoints Disponibles\n\n`;

    for (const [path, endpoint] of this.endpoints) {
      content += `### ${endpoint.method} ${path}\n\n`;
      if (endpoint.description) {
        content += `${endpoint.description}\n\n`;
      }
      content += `**Request Type:** ${endpoint.requestType || "any"}\n\n`;
      content += `**Response Type:** ${endpoint.responseType || "any"}\n\n`;
    }

    content += `## Uso\n\n`;
    content += `\`\`\`typescript\n`;
    content += `import { WhatsAppBridge } from './bridge-types';\n\n`;
    content += `// Usar las interfaces\n`;
    content += `const client: WhatsAppBridge.IBridgeClient = new BridgeClient();\n`;
    content += `\`\`\`\n`;

    fs.writeFileSync(docPath, content);
    console.log(`📚 Documentación generada en: ${docPath}`);
  }
}

// Función principal
function main() {
  console.log("🚀 Iniciando análisis del WhatsApp Bridge...\n");

  try {
    const analyzer = new BridgeAnalyzer();

    // Analizar el bridge
    analyzer.analyze();

    // Generar tipos
    const outputPath = analyzer.generateTypes();

    // Generar documentación
    analyzer.generateDocumentation();

    console.log("\n✅ Proceso completado exitosamente!");
    console.log(
      `📁 Archivos generados en: ${path.resolve(__dirname, OUTPUT_DIR)}`
    );
    console.log("\n💡 Próximos pasos:");
    console.log("  1. Revisar los tipos generados");
    console.log("  2. Ajustar manualmente si es necesario");
    console.log("  3. Implementar el cliente TypeScript usando estos tipos");
  } catch (error) {
    console.error("❌ Error durante el análisis:", error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = BridgeAnalyzer;
