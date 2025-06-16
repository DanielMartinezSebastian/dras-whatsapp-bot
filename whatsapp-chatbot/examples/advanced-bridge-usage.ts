import { WhatsAppBridgeClient, BridgeClientError } from '../src/bridge';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ejemplo avanzado del WhatsApp Bridge Client
 */
async function advancedExample() {
  console.log('🚀 Iniciando ejemplo avanzado del Bridge Client');

  const client = new WhatsAppBridgeClient();

  try {
    // Manejar errores específicos
    await handleErrorsExample(client);
    
    // Enviar multimedia
    await sendMediaExample(client);
    
    // Descargar multimedia
    await downloadMediaExample(client);

  } catch (error) {
    console.error('❌ Error en ejemplo avanzado:', error);
  } finally {
    await client.destroy();
  }
}

async function handleErrorsExample(client: WhatsAppBridgeClient) {
  console.log('\n🔍 Ejemplo de manejo de errores');
  
  try {
    // Intentar enviar a número inválido
    await client.sendMessage('invalid', 'test');
  } catch (error) {
    if (error instanceof BridgeClientError) {
      console.log('Tipo de error:', error.code);
      console.log('Es recuperable:', error.isRetryable());
      console.log('Es error de conexión:', error.isConnectionError());
      console.log('Detalles:', error.getErrorInfo());
    }
  }
}

async function sendMediaExample(client: WhatsAppBridgeClient) {
  console.log('\n📸 Ejemplo de envío de multimedia');
  
  // Crear archivo de prueba (imagen dummy)
  const testImagePath = path.join(__dirname, 'test-image.txt');
  fs.writeFileSync(testImagePath, 'Contenido de imagen de prueba');
  
  try {
    const result = await client.sendMedia(
      '1234567890', // Reemplaza con número real
      testImagePath,
      'Imagen de prueba desde TypeScript'
    );
    console.log('✅ Multimedia enviada:', result);
  } catch (error) {
    console.log('❌ Error enviando multimedia:', error.message);
  } finally {
    // Limpiar archivo de prueba
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

async function downloadMediaExample(client: WhatsAppBridgeClient) {
  console.log('\n⬇️  Ejemplo de descarga de multimedia');
  
  try {
    // Nota: Necesitas IDs reales de mensajes para que funcione
    const result = await client.downloadMedia(
      'messageId123', // Reemplaza con ID real
      'chatJid@s.whatsapp.net' // Reemplaza con JID real
    );
    
    if (result.success && result.data) {
      console.log('✅ Archivo descargado:', result.data.filename);
      console.log('📁 Ubicación:', result.data.path);
    }
  } catch (error) {
    console.log('❌ Error descargando (esperado con IDs ficticios):', error.message);
  }
}

// Ejecutar ejemplo
if (require.main === module) {
  advancedExample().catch(console.error);
}

export { advancedExample };