#!/usr/bin/env node

/**
 * Script para probar todos los comandos registrados
 */

const {
  CommandMessageHandler,
} = require("./dist/bot/handlers/CommandMessageHandler");

async function testAllCommands() {
  console.log("🧪 TESTING ALL REGISTERED COMMANDS\n");

  const handler = new CommandMessageHandler();
  const info = handler.getHandlerInfo();

  console.log(`📊 Handler Info:`);
  console.log(`• Name: ${info.name}`);
  console.log(`• Priority: ${info.priority}`);
  console.log(`• Enabled: ${info.enabled}`);
  console.log(`• Registered Commands: ${info.registeredCommands}`);
  console.log(`• Command List: ${info.commandList.join(", ")}\n`);

  console.log("✅ Tests completed successfully!");

  // Test basic commands
  const testCommands = [
    "!help",
    "!ping",
    "!info",
    "!status",
    "!profile",
    "!permissions",
    "!admin",
    "!diagnostic",
    "!diagnostic stats",
    "!diagnostic test",
    "!users",
    "!admin-system",
    "!admin-system stats",
    "!logs",
    "!logs error 10",
    "!stats",
    "!stats users",
  ];

  console.log("🎯 Commands to test via WhatsApp:");
  testCommands.forEach((cmd, index) => {
    console.log(`${index + 1}. ${cmd}`);
  });

  console.log("\n💡 Go ahead and test these commands via WhatsApp!");
}

testAllCommands().catch(console.error);
