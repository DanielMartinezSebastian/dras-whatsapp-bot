/**
 * Script de diagnóstico para verificar el contexto de conversaciones
 *
 * Este script ayuda a depurar problemas con el reconocimiento de usuarios recurrentes
 * mostrando el estado actual del archivo de contexto de conversaciones.
 */

const fs = require("fs").promises;
const path = require("path");

async function diagnoseConversationContext() {
  console.log("🔍 Diagnóstico de Contexto de Conversaciones");
  console.log("===========================================");

  // Ruta del archivo de contexto
  const contextFilePath = path.join(
    __dirname,
    "../data/conversation-context.json"
  );
  console.log(`📁 Buscando archivo en: ${contextFilePath}`);

  try {
    // Verificar que el archivo existe
    await fs.access(contextFilePath);
    console.log("✅ Archivo de contexto encontrado");

    // Leer contenido del archivo
    const data = await fs.readFile(contextFilePath, "utf8");
    const savedContext = JSON.parse(data);

    console.log(
      `📅 Fecha de guardado: ${savedContext.savedAt || "desconocida"}`
    );

    if (
      savedContext.conversations &&
      Array.isArray(savedContext.conversations)
    ) {
      console.log(
        `📊 Total de conversaciones: ${savedContext.conversations.length}`
      );

      // Mostrar detalles de cada conversación
      console.log("\n📋 Detalles de las conversaciones:");
      console.log("--------------------------------");

      savedContext.conversations.forEach((item, index) => {
        console.log(`\n👤 Conversación #${index + 1}: ${item.phone}`);

        if (item.context) {
          const ctx = item.context;
          console.log(`   • messageCount: ${ctx.messageCount}`);
          console.log(`   • firstMessage: ${ctx.firstMessage}`);
          console.log(`   • lastActivity: ${ctx.lastActivity}`);
          console.log(`   • userType: ${ctx.userType || "desconocido"}`);
          console.log(`   • topics: ${ctx.topics?.length || 0} registrados`);

          // Verificar si es un usuario recurrente según el contador de mensajes
          const isReturningUser = ctx.messageCount > 1;
          console.log(
            `   • ¿Es usuario recurrente?: ${
              isReturningUser ? "✅ SÍ" : "❌ NO"
            }`
          );

          // Evaluar la validez de las fechas
          const firstMessageDate = new Date(ctx.firstMessage);
          const lastActivityDate = new Date(ctx.lastActivity);

          const isFirstMessageValid = !isNaN(firstMessageDate.getTime());
          const isLastActivityValid = !isNaN(lastActivityDate.getTime());

          console.log(
            `   • Validez de firstMessage: ${
              isFirstMessageValid ? "✅ Válida" : "❌ Inválida"
            }`
          );
          console.log(
            `   • Validez de lastActivity: ${
              isLastActivityValid ? "✅ Válida" : "❌ Inválida"
            }`
          );

          // Mostrar el último topic si existe
          if (ctx.topics && ctx.topics.length > 0) {
            const lastTopic = ctx.topics[ctx.topics.length - 1];
            console.log(
              `   • Último mensaje: "${lastTopic.text}" (${lastTopic.timestamp})`
            );
          }
        } else {
          console.log("   ❌ CRÍTICO: Contexto no encontrado o corrupto");
        }
      });
    } else {
      console.log(
        "❌ No se encontraron conversaciones en el archivo de contexto"
      );
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        "❌ Error: Archivo de contexto no encontrado. Esto significa que:"
      );
      console.error("   1. El bot nunca se ha ejecutado");
      console.error(
        "   2. El sistema de guardado de contexto no está funcionando correctamente"
      );
      console.error("   3. El archivo se ha eliminado manualmente");
    } else {
      console.error(`❌ Error leyendo archivo de contexto: ${error.message}`);
      if (error instanceof SyntaxError) {
        console.error(
          "   El archivo de contexto está corrupto (JSON inválido)"
        );
      }
    }
  }

  console.log("\n🔧 Recomendaciones:");
  console.log(
    "1. Verificar que el sistema de guardado de contexto esté funcionando"
  );
  console.log("2. Asegurarse que messageCount se incrementa correctamente");
  console.log(
    "3. Comprobar que las fechas se serializan y deserializan correctamente"
  );
  console.log(
    "4. Confirmar que el teléfono se normaliza consistentemente sin @s.whatsapp.net"
  );
}

// Ejecutar el diagnóstico
diagnoseConversationContext().catch(console.error);
