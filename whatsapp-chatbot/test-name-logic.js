const { UserService } = require("./dist/services/userService");

async function simulateGetUserName() {
  try {
    const userService = new UserService();
    await userService.init();

    // Simular el método getUserName del ContextualMessageHandler
    async function getUserName(phoneJid) {
      try {
        const phone = phoneJid.includes("@")
          ? phoneJid.split("@")[0]
          : phoneJid;
        const user = await userService.getUserByPhone(phone);

        if (user) {
          // Aplicar la nueva lógica mejorada
          const needsDisplayName =
            !user.display_name ||
            user.display_name.trim() === "" ||
            user.display_name === user.phone_number ||
            /^\d+$/.test(user.display_name.trim());

          if (needsDisplayName) {
            console.log(`📝 Usuario ${phone} necesita proporcionar su nombre`);
            console.log(`   Motivo: display_name="${user.display_name}"`);
            return "Usuario"; // Temporal hasta que proporcione el nombre
          }

          return user.display_name;
        }

        return "Usuario";
      } catch (error) {
        console.error(`Error: ${error.message}`);
        return "Usuario";
      }
    }

    // Probar con diferentes usuarios
    console.log("=== Simulación del método getUserName mejorado ===\n");

    const testUsers = [
      "34612345678@s.whatsapp.net", // Con número como nombre
      "34600000002@s.whatsapp.net", // Con nombre válido
      "34600000003@s.whatsapp.net", // Sin display_name
      "34612345679@s.whatsapp.net", // Sin display_name
    ];

    for (const jid of testUsers) {
      const phone = jid.split("@")[0];
      console.log(`Testing ${phone}:`);
      const result = await getUserName(jid);
      console.log(`  → Resultado: "${result}"`);
      console.log("");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

simulateGetUserName();
