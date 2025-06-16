import { WhatsAppBridgeClient, BridgeUtils } from "../src/bridge";

/**
 * Ejemplo básico de uso del WhatsApp Bridge Client
 */
async function basicExample() {
  console.log("🚀 Iniciando ejemplo básico del Bridge Client");

  // Crear cliente
  const client = new WhatsAppBridgeClient({
    baseUrl: "http://127.0.0.1:8080",
    timeout: 10000,
    enableLogging: true,
  });

  try {
    // Verificar disponibilidad
    const isAvailable = await client.isAvailable();
    console.log("📡 Bridge disponible:", isAvailable);

    if (!isAvailable) {
      console.log(
        "❌ Bridge no disponible. Asegúrate de que esté ejecutándose."
      );
      return;
    }

    // Obtener estado
    const status = await client.getStatus();
    console.log("📊 Estado del bridge:", status);

    // Enviar mensaje de texto
    console.log("📤 Enviando mensaje de texto...");
    const textResult = await client.sendMessage(
      "1234567890", // Reemplaza con un número real
      "¡Hola desde el cliente TypeScript tipado!"
    );
    console.log("✅ Resultado:", textResult);

    // Ejemplo de utilidades
    console.log("🔧 Probando utilidades:");
    const phoneNumber = "1234567890";
    console.log(
      "  Número válido:",
      BridgeUtils.isValidPhoneNumber(phoneNumber)
    );
    console.log(
      "  Número formateado:",
      BridgeUtils.formatPhoneNumber(phoneNumber)
    );
    console.log("  JID creado:", BridgeUtils.createJidFromPhone(phoneNumber));
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
  } finally {
    // Limpiar recursos
    await client.destroy();
    console.log("🧹 Cliente limpiado");
  }
}

// Ejecutar ejemplo
if (require.main === module) {
  basicExample().catch(console.error);
}

export { basicExample };
