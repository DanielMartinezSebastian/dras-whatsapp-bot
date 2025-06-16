const fs = require("fs");
const path = require("path");

class LegacyAuditor {
  constructor() {
    this.legacyPath = path.join(
      __dirname,
      "../whatsapp-chatbot/backup/old-handlers-20250613-210515"
    );
    this.results = {
      commands: [],
      handlers: [],
      dependencies: [],
      businessLogic: [],
    };
  }

  async audit() {
    console.log("🔍 Iniciando auditoría del sistema legacy...");

    // Verificar si existe el directorio legacy
    if (!fs.existsSync(this.legacyPath)) {
      console.log("⚠️  Directorio legacy no encontrado:", this.legacyPath);
      return;
    }

    // Escanear archivos
    const files = this.scanDirectory(this.legacyPath);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Generar reporte
    this.generateReport();
  }

  scanDirectory(dirPath) {
    const files = [];

    try {
      const items = fs.readdirSync(dirPath);

      items.forEach((item) => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isFile() && item.endsWith(".js")) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      console.error("Error escaneando directorio:", error);
    }

    return files;
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const fileName = path.basename(filePath);

      console.log(`🔍 Analizando: ${fileName}`);

      // Extraer comandos (patrones como /comando, !comando)
      const commands = content.match(/["'`][\/!]\w+["'`]/g) || [];

      // Extraer handlers (métodos handle* o execute*)
      const handlers = content.match(/async\s+(handle|execute)\w+/g) || [];

      // Extraer funciones generales
      const functions =
        content.match(/function\s+\w+|const\s+\w+\s*=\s*async/g) || [];

      // Extraer requires
      const requires = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];

      // Buscar lógica de negocio específica (patrones comunes)
      const businessLogic = [];
      if (content.includes("await"))
        businessLogic.push("async/await operations");
      if (content.includes("database") || content.includes("db."))
        businessLogic.push("database operations");
      if (content.includes("permission") || content.includes("role"))
        businessLogic.push("permission/role logic");
      if (content.includes("whatsapp") || content.includes("message"))
        businessLogic.push("WhatsApp integration");

      this.results.commands.push(
        ...commands.map((cmd) => ({
          file: fileName,
          command: cmd.replace(/["'`]/g, ""),
        }))
      );
      this.results.handlers.push(
        ...handlers.map((handler) => ({ file: fileName, handler }))
      );
      this.results.dependencies.push(
        ...requires.map((req) => ({ file: fileName, dependency: req }))
      );
      this.results.businessLogic.push(
        ...businessLogic.map((logic) => ({ file: fileName, logic }))
      );

      console.log(
        `✅ Analizado: ${fileName} - ${commands.length} comandos, ${handlers.length} handlers`
      );
    } catch (error) {
      console.error(`Error analizando ${filePath}:`, error);
    }
  }

  generateReport() {
    const uniqueCommands = [
      ...new Set(this.results.commands.map((c) => c.command)),
    ];
    const uniqueDependencies = [
      ...new Set(this.results.dependencies.map((d) => d.dependency)),
    ];

    const report = `# 📊 Reporte de Auditoría Legacy

**Fecha de auditoría:** ${new Date().toLocaleString()}
**Directorio analizado:** ${this.legacyPath}

## 📋 Resumen Ejecutivo
- **Archivos analizados:** ${this.scanDirectory(this.legacyPath).length}
- **Comandos únicos encontrados:** ${uniqueCommands.length}
- **Handlers encontrados:** ${this.results.handlers.length}
- **Dependencias únicas:** ${uniqueDependencies.length}
- **Elementos de lógica de negocio:** ${this.results.businessLogic.length}

## 🎯 Comandos Identificados
${uniqueCommands.map((cmd) => `- \`${cmd}\``).join("\n")}

## 🔧 Handlers por Archivo
${this.results.handlers
  .map((h) => `- **${h.file}**: \`${h.handler}\``)
  .join("\n")}

## 📦 Dependencias Detectadas
${uniqueDependencies.map((dep) => `- ${dep}`).join("\n")}

## 🏗️ Lógica de Negocio por Archivo
${this.results.businessLogic
  .map((bl) => `- **${bl.file}**: ${bl.logic}`)
  .join("\n")}

## 📊 Comandos Detallados por Archivo
${this.results.commands
  .map((c) => `- **${c.file}**: \`${c.command}\``)
  .join("\n")}

## ⚠️ Recomendaciones de Migración
1. **Prioridad Alta:** Comandos más utilizados (${uniqueCommands
      .slice(0, 5)
      .join(", ")})
2. **Revisar dependencias:** Verificar compatibilidad de todas las dependencias
3. **Preservar lógica:** Especial atención a la lógica de permisos y base de datos
4. **Testing:** Crear tests para cada comando migrado

---
*Reporte generado automáticamente por LegacyAuditor*
`;

    const reportPath = path.join(__dirname, "../LEGACY_AUDIT_REPORT.md");
    fs.writeFileSync(reportPath, report);
    console.log("📄 Reporte guardado en:", reportPath);

    // También mostrar resumen en consola
    console.log("\n📊 RESUMEN DE AUDITORÍA:");
    console.log(
      `• Archivos analizados: ${this.scanDirectory(this.legacyPath).length}`
    );
    console.log(`• Comandos únicos: ${uniqueCommands.length}`);
    console.log(`• Handlers encontrados: ${this.results.handlers.length}`);
    console.log(`• Dependencias: ${uniqueDependencies.length}`);
    console.log("\n✅ Auditoría completada exitosamente");
  }
}

// Ejecutar auditoría
if (require.main === module) {
  new LegacyAuditor().audit().catch(console.error);
}

module.exports = LegacyAuditor;
