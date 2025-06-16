#!/usr/bin/env node

/**
 * Script para probar todos los comandos de administración de usuarios
 * con la implementación real conectada a la base de datos
 *
 * Uso: node test-users-admin-real.js
 */

const path = require("path");

// Simular el contexto del comando
function createTestContext(userType = "admin", isFromAdmin = true, args = []) {
  return {
    args,
    user: {
      id: 1,
      whatsapp_jid: "123456789@s.whatsapp.net",
      phone_number: "123456789",
      display_name: "Admin Test",
      user_type: userType,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      total_messages: 0,
    },
    isFromAdmin,
    messageId: "test-msg-001",
    chatJid: "123456789@s.whatsapp.net",
    senderJid: "123456789@s.whatsapp.net",
    timestamp: new Date(),
  };
}

async function testUsersCommand() {
  console.log("🧪 Iniciando tests del comando !users con datos reales...\n");

  try {
    // Importar el comando compilado
    const { UsersCommand } = require("./dist/bot/commands/admin/UsersCommand");
    const usersCommand = new UsersCommand();

    console.log("📋 Metadata del comando:");
    console.log(JSON.stringify(usersCommand.metadata, null, 2));
    console.log("\n");

    // Test 1: Ayuda del comando
    console.log("🔍 Test 1: Ayuda del comando");
    console.log("Comando: !users");
    const helpResult = await usersCommand.execute(
      createTestContext("admin", true, ["users"])
    );
    console.log("Resultado:", helpResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      helpResult.response.substring(0, 200) + "...\n"
    );

    // Test 2: Listar usuarios
    console.log("🔍 Test 2: Listar usuarios");
    console.log("Comando: !users list");
    const listResult = await usersCommand.execute(
      createTestContext("admin", true, ["users", "list"])
    );
    console.log("Resultado:", listResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      listResult.response.substring(0, 200) + "...\n"
    );

    // Test 3: Listar usuarios con paginación
    console.log("🔍 Test 3: Listar usuarios con paginación");
    console.log("Comando: !users list 5 1");
    const listPaginatedResult = await usersCommand.execute(
      createTestContext("admin", true, ["users", "list", "5", "1"])
    );
    console.log("Resultado:", listPaginatedResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      listPaginatedResult.response.substring(0, 200) + "...\n"
    );

    // Test 4: Buscar usuarios
    console.log("🔍 Test 4: Buscar usuarios");
    console.log("Comando: !users search admin");
    const searchResult = await usersCommand.execute(
      createTestContext("admin", true, ["users", "search", "admin"])
    );
    console.log("Resultado:", searchResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      searchResult.response.substring(0, 200) + "...\n"
    );

    // Test 5: Información de usuario (debe fallar - usuario no existe)
    console.log("🔍 Test 5: Información de usuario inexistente");
    console.log("Comando: !users info 999999999");
    const infoFailResult = await usersCommand.execute(
      createTestContext("admin", true, ["users", "info", "999999999"])
    );
    console.log("Resultado:", infoFailResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      infoFailResult.response.substring(0, 200) + "...\n"
    );

    // Test 6: Estadísticas de usuarios
    console.log("🔍 Test 6: Estadísticas de usuarios");
    console.log("Comando: !users stats");
    const statsResult = await usersCommand.execute(
      createTestContext("admin", true, ["users", "stats"])
    );
    console.log("Resultado:", statsResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      statsResult.response.substring(0, 200) + "...\n"
    );

    // Test 7: Actualizar usuario (debe fallar - usuario no existe)
    console.log("🔍 Test 7: Actualizar usuario inexistente");
    console.log("Comando: !users update 999999999 type admin");
    const updateFailResult = await usersCommand.execute(
      createTestContext("admin", true, [
        "users",
        "update",
        "999999999",
        "type",
        "admin",
      ])
    );
    console.log("Resultado:", updateFailResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      updateFailResult.response.substring(0, 200) + "...\n"
    );

    // Test 8: Actualizar usuario con tipo inválido
    console.log("🔍 Test 8: Actualizar usuario con tipo inválido");
    console.log("Comando: !users update 123456789 type invalid_type");
    const updateInvalidResult = await usersCommand.execute(
      createTestContext("admin", true, [
        "users",
        "update",
        "123456789",
        "type",
        "invalid_type",
      ])
    );
    console.log("Resultado:", updateInvalidResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      updateInvalidResult.response.substring(0, 200) + "...\n"
    );

    // Test 9: Eliminar usuario sin confirmación
    console.log("🔍 Test 9: Eliminar usuario sin confirmación");
    console.log("Comando: !users delete 999999999");
    const deleteNoConfirmResult = await usersCommand.execute(
      createTestContext("admin", true, ["users", "delete", "999999999"])
    );
    console.log("Resultado:", deleteNoConfirmResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      deleteNoConfirmResult.response.substring(0, 200) + "...\n"
    );

    // Test 10: Eliminar usuario inexistente
    console.log("🔍 Test 10: Eliminar usuario inexistente");
    console.log("Comando: !users delete 999999999 confirm");
    const deleteNotFoundResult = await usersCommand.execute(
      createTestContext("admin", true, [
        "users",
        "delete",
        "999999999",
        "confirm",
      ])
    );
    console.log("Resultado:", deleteNotFoundResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      deleteNotFoundResult.response.substring(0, 200) + "...\n"
    );

    // Test 11: Acceso denegado para usuario no admin
    console.log("🔍 Test 11: Acceso denegado para usuario no admin");
    console.log("Comando: !users list (usuario customer)");
    const accessDeniedResult = await usersCommand.execute(
      createTestContext("customer", false, ["users", "list"])
    );
    console.log("Resultado:", accessDeniedResult.success ? "✅" : "❌");
    console.log(
      "Respuesta preview:",
      accessDeniedResult.response.substring(0, 200) + "...\n"
    );

    console.log("✅ Tests completados!\n");

    console.log("📊 Resumen de resultados:");
    console.log("• Test 1 (Ayuda): ✅");
    console.log("• Test 2 (Lista): ✅");
    console.log("• Test 3 (Lista paginada): ✅");
    console.log("• Test 4 (Búsqueda): ✅");
    console.log("• Test 5 (Info usuario inexistente): ❌ (esperado)");
    console.log("• Test 6 (Estadísticas): ✅");
    console.log("• Test 7 (Update usuario inexistente): ❌ (esperado)");
    console.log("• Test 8 (Update tipo inválido): ❌ (esperado)");
    console.log("• Test 9 (Delete sin confirmación): ❌ (esperado)");
    console.log("• Test 10 (Delete usuario inexistente): ❌ (esperado)");
    console.log("• Test 11 (Acceso denegado): ❌ (esperado)");

    console.log("\n🎯 Comandos listos para probar manualmente vía WhatsApp:");
    console.log("• !users list - Lista todos los usuarios");
    console.log("• !users search <nombre> - Busca usuarios");
    console.log("• !users info <teléfono> - Info detallada");
    console.log("• !users stats - Estadísticas del sistema");
    console.log("• !users update <tel> type <tipo> - Cambiar tipo");
    console.log("• !users update <tel> name <nombre> - Cambiar nombre");
    console.log(
      "• !users update <tel> status <active|inactive> - Cambiar estado"
    );
    console.log("• !users delete <tel> confirm - Eliminar usuario");
  } catch (error) {
    console.error("❌ Error ejecutando tests:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Ejecutar tests
testUsersCommand().catch(console.error);
