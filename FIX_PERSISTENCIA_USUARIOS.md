# Fix de Persistencia de Usuarios - DrasBot

## Problema Identificado

El bot no estaba persistiendo usuarios en la base de datos SQLite tras los reinicios. En cada mensaje se creaba un nuevo usuario en memoria, pero no se guardaba en la base de datos.

### Síntomas

- Los usuarios aparecían en logs con IDs diferentes para el mismo número de teléfono
- Los comandos funcionaban pero el bot no recordaba usuarios previos
- Los mensajes mostraban `👤 New user created` en cada interacción

### Causa Raíz

En `message-processor.service.ts`, los métodos `createNewUser` y `findUserByPhone` tenían comentarios TODO y no implementaban integración con la base de datos:

```typescript
// ANTES (solo en memoria)
private async createNewUser(phone: string, whatsappJid: string): Promise<User> {
  // TODO: Implement with actual database insertion
  const user: User = {
    id: Date.now(), // Simple numeric ID
    jid: whatsappJid,
    phoneNumber: phone,
    // ... resto de campos
  };
  return user; // Solo retornaba objeto en memoria
}

private async findUserByPhone(_phone: string): Promise<User | null> {
  // TODO: Implement with actual database query
  return null; // Siempre retornaba null
}
```

## Solución Implementada

### 1. Integración con UserManagerService

Agregamos `UserManagerService` al `MessageProcessorService`:

```typescript
// Importamos el servicio
import { UserManagerService } from './user-manager.service';

// Agregamos como propiedad
private userManager: UserManagerService;

// Inicializamos en el constructor
this.userManager = UserManagerService.getInstance();
```

### 2. Implementación Real de createNewUser

```typescript
private async createNewUser(phone: string, whatsappJid: string): Promise<User> {
  const userData: Partial<User> = {
    jid: whatsappJid,
    phoneNumber: phone,
    name: phone, // Default name
    userLevel: UserLevel.USER,
    isRegistered: false,
    registrationDate: null,
    lastActivity: new Date(),
    messageCount: 0,
    banned: false,
    preferences: {},
  };

  return await this.userManager.createUser(userData);
}
```

### 3. Implementación Real de findUserByPhone

```typescript
private async findUserByPhone(phone: string): Promise<User | null> {
  return await this.userManager.getUserByPhoneNumber(phone);
}
```

### 4. Implementación Real de updateUserLastActivity

```typescript
private async updateUserLastActivity(userId: string): Promise<void> {
  const numericUserId = parseInt(userId, 10);
  await this.userManager.updateUser(numericUserId, {
    lastActivity: new Date(),
  });
  this.logger.debug('MessageProcessor', 'User last activity updated', {
    userId,
  });
}
```

## Resultados

### Antes del Fix
```
🔄 Processing message proc_1750242392205_9eyu3n | userId: 1750242392206
🔄 Processing message proc_1750242401487_lskwa | userId: 1750242401488
```
*Diferentes IDs para el mismo número de teléfono*

### Después del Fix
```
👤 New user created | userId: 7
User updated successfully | userId: 7
User updated successfully | userId: 7
```
*Mismo ID persistente para todas las interacciones*

## Verificación

### Base de Datos Antes del Fix
```sql
SELECT COUNT(*) FROM users WHERE phone_number LIKE '%34633471003%';
-- Result: 0 (usuarios no se guardaban)
```

### Base de Datos Después del Fix
```sql
SELECT id, jid, phone_number, name, created_at, last_activity 
FROM users WHERE id = 7;
-- Result: 7|34633471003@s.whatsapp.net|34633471003|34633471003|2025-06-18 10:30:07|2025-06-18T10:30:22.814Z
```

### Persistencia Tras Reinicio
- ✅ Usuario permanece en base de datos tras `./manage-new.sh restart`
- ✅ Usuario se encuentra correctamente en mensajes posteriores
- ✅ Se actualiza `last_activity` en lugar de crear usuario duplicado

## Impacto

- **Persistencia Real**: Los usuarios ahora se guardan en SQLite y persisten tras reinicios
- **Reconocimiento de Usuario**: El bot reconoce usuarios existentes correctamente
- **Performance**: Evita crear usuarios duplicados en cada mensaje
- **Integridad de Datos**: Los comandos y contextos ahora funcionan con usuarios persistentes

## Archivos Modificados

- `src/services/message-processor.service.ts`
  - Agregado import de `UserManagerService`
  - Implementados métodos de persistencia real
  - Conectado con base de datos SQLite

## Estado

✅ **COMPLETADO** - La persistencia de usuarios funciona correctamente tras reinicio.
