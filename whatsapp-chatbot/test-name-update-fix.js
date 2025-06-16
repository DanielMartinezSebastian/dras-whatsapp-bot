#!/usr/bin/env node

const { UserService } = require("./src/services/userService");

async function testNameUpdate() {
  console.log("🧪 Testing name update with correct JID format...");

  const userService = new UserService();
  await userService.init();

  // Test data
  const testJid = "34612345678@s.whatsapp.net";
  const testName = "TestUser";

  try {
    // First ensure user exists
    let user = await userService.getUserByJid(testJid);
    console.log(
      "📝 Existing user:",
      user
        ? {
            id: user.id,
            display_name: user.display_name,
            whatsapp_jid: user.whatsapp_jid,
          }
        : "Not found"
    );

    if (!user) {
      console.log("🔧 Creating user first...");
      user = await userService.createUser({
        whatsapp_jid: testJid,
        phone_number: "34612345678",
        display_name: "OldName",
        user_type: "customer",
        language: "es",
      });
      console.log("✅ User created:", user.id);
    }

    // Now test update
    console.log("🔄 Updating user name...");
    const updatedUser = await userService.updateUser(testJid, {
      display_name: testName,
    });

    console.log("✅ Update successful:", {
      id: updatedUser.id,
      display_name: updatedUser.display_name,
      whatsapp_jid: updatedUser.whatsapp_jid,
    });
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run test
testNameUpdate()
  .then(() => {
    console.log("🎉 Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });
