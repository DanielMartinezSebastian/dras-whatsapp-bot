#!/usr/bin/env node

/**
 * Test de integración para verificar que SQLite funciona correctamente
 * Este script prueba la funcionalidad completa de la base de datos
 */

const { DatabaseService } = require('./dist/services/database.service');
const { UserLevel } = require('./dist/types');

async function testSQLiteIntegration() {
  console.log('🧪 Iniciando test de integración SQLite...\n');

  try {
    const db = DatabaseService.getInstance();

    // Inicializar base de datos
    console.log('📦 Inicializando base de datos...');
    await db.initialize();
    console.log('✅ Base de datos inicializada\n');

    // Test 1: Crear usuario
    console.log('👤 Test 1: Crear usuario...');
    const timestamp = Date.now();
    const userData = {
      jid: `test${timestamp}@s.whatsapp.net`,
      phoneNumber: `${timestamp}`,
      name: 'Usuario Test',
      userLevel: UserLevel.USER,
      isRegistered: false,
      registrationDate: null,
      lastActivity: new Date(),
      messageCount: 0,
      banned: false,
      preferences: { language: 'es', notifications: true },
    };

    const createdUser = await db.createUser(userData);
    console.log('✅ Usuario creado:', {
      id: createdUser.id,
      name: createdUser.name,
      phone: createdUser.phoneNumber,
      level: createdUser.userLevel,
    });

    // Test 2: Buscar usuario por JID
    console.log('\n🔍 Test 2: Buscar usuario por JID...');
    const foundUser = await db.getUserByJid(`test${timestamp}@s.whatsapp.net`);
    console.log('✅ Usuario encontrado:', foundUser ? 'Sí' : 'No');

    // Test 3: Buscar usuario por teléfono
    console.log('\n📞 Test 3: Buscar usuario por teléfono...');
    const userByPhone = await db.getUserByPhone(`${timestamp}`);
    console.log(
      '✅ Usuario encontrado por teléfono:',
      userByPhone ? 'Sí' : 'No'
    );

    // Test 4: Actualizar usuario
    console.log('\n📝 Test 4: Actualizar usuario...');
    const updatedUser = await db.updateUser(createdUser.id.toString(), {
      isRegistered: true,
      registrationDate: new Date(),
      messageCount: 5,
    });
    console.log('✅ Usuario actualizado:', {
      isRegistered: updatedUser.isRegistered,
      messageCount: updatedUser.messageCount,
    });

    // Test 5: Guardar mensaje
    console.log('\n💬 Test 5: Guardar mensaje...');
    const messageData = {
      user_id: createdUser.id,
      whatsapp_message_id: 'wa_msg_123',
      content: 'Hola mundo!',
      message_type: 'text',
      is_from_bot: false,
      processed: false,
      metadata: { timestamp: new Date().toISOString() },
    };

    const savedMessage = await db.saveMessage(messageData);
    console.log('✅ Mensaje guardado:', {
      id: savedMessage.id,
      content: savedMessage.content,
      type: savedMessage.message_type,
    });

    // Test 6: Guardar contexto
    console.log('\n🔄 Test 6: Guardar contexto...');
    const contextData = {
      id: 'ctx_123',
      user_id: createdUser.id.toString(),
      context_type: 'registration',
      context_data: { step: 1, data: 'test' },
      is_active: true,
      expires_at: '',
      step_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.saveContext(contextData);
    console.log('✅ Contexto guardado');

    // Test 7: Obtener contexto
    console.log('\n📋 Test 7: Obtener contexto...');
    const retrievedContext = await db.getContext(createdUser.id.toString());
    console.log('✅ Contexto recuperado:', retrievedContext ? 'Sí' : 'No');
    if (retrievedContext) {
      console.log('   Tipo:', retrievedContext.context_type);
      console.log('   Datos:', retrievedContext.context_data);
    }

    // Test 8: Obtener usuarios por nivel
    console.log('\n👥 Test 8: Obtener usuarios por nivel...');
    const usersByLevel = await db.getUsersByLevel(UserLevel.USER);
    console.log('✅ Usuarios USER encontrados:', usersByLevel.length);

    // Test 9: Obtener estadísticas
    console.log('\n📊 Test 9: Obtener estadísticas...');
    const stats = await db.getUserStats();
    console.log('✅ Estadísticas:', {
      totalUsers: stats.totalUsers,
      registeredUsers: stats.registeredUsers,
      activeUsers: stats.activeUsers,
      bannedUsers: stats.bannedUsers,
    });

    // Test 10: Limpiar contexto
    console.log('\n🧹 Test 10: Limpiar contexto...');
    await db.deleteContext(createdUser.id.toString());
    const contextAfterDelete = await db.getContext(createdUser.id.toString());
    console.log('✅ Contexto eliminado:', contextAfterDelete ? 'No' : 'Sí');

    // Cerrar base de datos
    console.log('\n🔒 Cerrando base de datos...');
    await db.close();
    console.log('✅ Base de datos cerrada');

    console.log(
      '\n🎉 Todos los tests de integración SQLite pasaron exitosamente!'
    );
  } catch (error) {
    console.error('\n❌ Error en test de integración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSQLiteIntegration();
