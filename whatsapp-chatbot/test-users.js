const { UserService } = require("./dist/services/userService");

async function testNameRequest() {
  try {
    console.log("=== Test de solicitud de nombre ===");

    const userService = new UserService();
    await userService.init();

    // Buscar un usuario sin display_name
    const testUser = await userService.getUserByPhone("34600000003");
    if (testUser) {
      console.log("Usuario encontrado:");
      console.log(`- JID: ${testUser.whatsapp_jid}`);
      console.log(`- Teléfono: ${testUser.phone_number}`);
      console.log(`- Nombre: "${testUser.display_name || "SIN NOMBRE"}"`);

      if (!testUser.display_name || testUser.display_name.trim() === "") {
        console.log("✅ Este usuario necesita proporcionar su nombre");

        // Test de actualización
        console.log("\n=== Test de actualización de nombre ===");
        await userService.updateUser(testUser.whatsapp_jid, {
          display_name: "Juan Pérez Test",
        });

        const updatedUser = await userService.getUserByPhone("34600000003");
        console.log(`✅ Nombre actualizado: "${updatedUser.display_name}"`);

        // Revertir cambio
        await userService.updateUser(testUser.whatsapp_jid, {
          display_name: "",
        });
        console.log("↩️  Cambio revertido para próximas pruebas");
      } else {
        console.log("❌ Este usuario ya tiene nombre");
      }
    } else {
      console.log("❌ Usuario no encontrado");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testNameRequest();
