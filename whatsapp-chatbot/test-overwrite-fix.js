const { UserService } = require("./dist/services/userService");

async function testOverwriteProblem() {
  try {
    console.log("=== Test del problema de sobrescritura ===");

    const userService = new UserService();
    await userService.init();

    const phoneJid = "34612345678@s.whatsapp.net";
    const phone = "34612345678";

    // 1. Establecer un nombre válido (simular el handleNameResponse)
    console.log("\n1. Estableciendo nombre válido...");
    await userService.updateUser(phoneJid, { display_name: "Daniel" });
    let user = await userService.getUserByJid(phoneJid);
    console.log(`   ✅ Display name establecido: "${user.display_name}"`);

    // 2. Simular processUserFromMessage (que antes causaba el problema)
    console.log("\n2. Simulando processUserFromMessage...");
    const mockMessage = {
      chatJid: phoneJid,
      chatName: null,
      sender: null,
      senderName: null,
      content: "Test message",
      type: "text",
    };

    await userService.processUserFromMessage(mockMessage);

    // 3. Verificar que el nombre se preserva
    user = await userService.getUserByJid(phoneJid);
    console.log(
      `   📋 Display name después del procesamiento: "${user.display_name}"`
    );

    if (user.display_name === "Daniel") {
      console.log("   ✅ ÉXITO: El nombre se preservó correctamente");
    } else {
      console.log("   ❌ FALLO: El nombre fue sobrescrito");
    }

    // 4. Test con usuario sin nombre válido
    console.log("\n3. Test con usuario sin nombre válido...");
    await userService.updateUser(phoneJid, { display_name: phone }); // Simular nombre inválido
    await userService.processUserFromMessage(mockMessage);

    user = await userService.getUserByJid(phoneJid);
    console.log(
      `   📋 Display name para usuario sin nombre válido: "${user.display_name}"`
    );

    // Revertir para futuras pruebas
    await userService.updateUser(phoneJid, { display_name: phone });
    console.log("\n↩️  Estado revertido para futuras pruebas");
  } catch (error) {
    console.error("Error en test:", error.message);
  }
}

testOverwriteProblem();
