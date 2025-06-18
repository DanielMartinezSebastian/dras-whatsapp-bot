# 👤 Sistema de Registro de Nombres - DrasBot

Este documento describe el sistema de registro de nombres implementado para DrasBot, que permite a los usuarios establecer un nombre amigable que no sea su número de teléfono.

## 🎯 Objetivo

Crear un flujo intuitivo donde el bot solicite el nombre al usuario para registrarlo en la base de datos y proporcionar una experiencia personalizada, evitando que el nombre sea un número de teléfono.

## ✨ Características

### 📝 Comandos de Registro de Nombre

El sistema incluye múltiples formas de establecer el nombre:

**Comandos explícitos:**
- `!mellamo [nombre]` - Establece el nombre del usuario
- `!soy [nombre]` - Alias para establecer el nombre
- `!llamame [nombre]` - Alias para establecer el nombre
- `!mi-nombre [nombre]` - Alias para establecer el nombre
- `!nombre [nombre]` - Alias para establecer el nombre
- `!name [nombre]` - Alias en inglés para establecer el nombre

**Lenguaje natural:**
- "Me llamo Juan"
- "Soy María"
- "Llamame Pedro"
- "Mi nombre es Ana"
- "Hola, soy Carlos"
- "Hola, me llamo Laura"

### 🔍 Comandos de Consulta de Perfil

- `!quien-soy` - Muestra la información del perfil actual
- `!mi-info` - Alias para mostrar información del perfil
- `!perfil` - Alias para mostrar el perfil
- `!profile` - Alias en inglés para mostrar el perfil
- `!whoami` - Alias en inglés para mostrar el perfil

## 🔄 Flujo de Registro

### 1. Usuario Nuevo
Cuando un usuario nuevo envía su primer mensaje (especialmente saludos), el bot:

1. **Detecta** que es un usuario nuevo (no registrado, pocos mensajes)
2. **Crea** un contexto de registro de nombres
3. **Solicita** el nombre de manera amigable
4. **Espera** la respuesta del usuario (hasta 5 minutos)

### 2. Detección de Nombre
El bot puede detectar nombres en mensajes naturales usando patrones como:
- `^me llamo `
- `^soy `
- `^llamame `
- `^mi nombre es `
- `^hola,?\s*soy `
- `^hola,?\s*me llamo `

### 3. Validación de Nombre
Antes de registrar un nombre, el sistema valida:

✅ **Válido:**
- Mínimo 2 caracteres
- Máximo 50 caracteres
- Contiene letras, números, espacios, guiones, puntos
- Incluye caracteres especiales en español (áéíóúñü)

❌ **Inválido:**
- Solo números (evita números de teléfono)
- Patrones de teléfono (+34, códigos de país)
- Cadenas vacías
- Caracteres especiales no permitidos

### 4. Registro Exitoso
Cuando el nombre es válido:
1. **Actualiza** el campo `name` en la base de datos
2. **Marca** al usuario como registrado (`isRegistered = true`)
3. **Limpia** el contexto de registro
4. **Confirma** el registro con un mensaje personalizado

## 🎯 Message Handlers

El sistema utiliza tres message handlers con diferentes prioridades:

### 1. NameRegistrationContextHandler (Prioridad: 20)
- **Función:** Procesa mensajes cuando el usuario está en contexto de registro
- **Activación:** Usuario tiene contexto de registro activo
- **Acción:** Valida y registra el nombre proporcionado

### 2. NameDetectionHandler (Prioridad: 15)
- **Función:** Detecta menciones de nombres en lenguaje natural
- **Activación:** Mensaje contiene patrones de nombre y usuario sin contexto activo
- **Acción:** Procesa directamente el registro de nombre

### 3. NewUserWelcomeHandler (Prioridad: 5)
- **Función:** Da la bienvenida a usuarios nuevos
- **Activación:** Usuario no registrado con pocos mensajes enviando saludos
- **Acción:** Inicia el contexto de registro de nombres

## 📊 Base de Datos

### Tabla: `users`
```sql
-- Campos relevantes para el registro de nombres
name TEXT NOT NULL,           -- Nombre amigable del usuario
isRegistered BOOLEAN DEFAULT false,  -- Estado de registro
phoneNumber TEXT NOT NULL,   -- Número de teléfono (no debe ser el nombre)
```

### Contextos: `contexts`
```sql
-- Contexto de registro de nombres
contextType: 'registration'
data: {
  step: 'awaiting_name',
  attempts: number,
  triggered_by: 'welcome' | 'command',
  startedAt: string
}
```

## 🛠️ Implementación Técnica

### Archivos Principales

1. **`name.commands.ts`** - Definiciones de comandos
2. **`name.handlers.ts`** - Lógica de procesamiento de comandos
3. **`name.context-handlers.ts`** - Message handlers para detección automática
4. **`basic.commands.ts`** - Registro de comandos en el sistema
5. **`basic.handlers.ts`** - Exportación de handlers

### Integración con Message Processor

Los handlers se registran automáticamente en `MessageProcessorService`:

```typescript
// En initializeMessageHandlers()
this.messageHandlers.push(new NameRegistrationContextHandler());
this.messageHandlers.push(new NameDetectionHandler());
this.messageHandlers.push(new NewUserWelcomeHandler());
```

## 🧪 Testing

### Casos de Prueba

1. **Usuario Nuevo - Bienvenida**
   ```
   Usuario: "Hola"
   Bot: "👋 ¡Hola y bienvenido a DrasBot! ¿Cómo te llamas?"
   ```

2. **Registro con Lenguaje Natural**
   ```
   Usuario: "Me llamo Juan"
   Bot: "✅ ¡Perfecto, Juan! Tu nombre ha sido registrado..."
   ```

3. **Registro con Comando**
   ```
   Usuario: "!mellamo María"
   Bot: "✅ ¡Perfecto, María! Tu nombre ha sido registrado..."
   ```

4. **Validación de Nombre Inválido**
   ```
   Usuario: "Me llamo 123456789"
   Bot: "❌ Nombre no válido: El nombre no puede ser solo números..."
   ```

5. **Consulta de Perfil**
   ```
   Usuario: "!quien-soy"
   Bot: "👤 Tu Perfil\nNombre: Juan\nTeléfono: +34***\n..."
   ```

### Script de Pruebas

Ejecuta el script de pruebas:
```bash
./test-name-registration.sh
```

## 📋 Ejemplos de Uso

### Escenario 1: Nuevo Usuario
```
Usuario: "Hola"
Bot: "👋 ¡Hola y bienvenido a DrasBot!
      
      Para darte una mejor experiencia, me gustaría conocerte mejor.
      
      ¿Cómo te llamas?
      
      Puedes decirme tu nombre de cualquiera de estas formas:
      • 'Me llamo [tu nombre]'
      • 'Soy [tu nombre]'
      • 'Llamame [tu nombre]'
      • O simplemente escribe tu nombre"

Usuario: "Me llamo Ana"
Bot: "🎉 ¡Excelente, Ana!
     
     Tu nombre ha sido registrado exitosamente. A partir de ahora te reconoceré como Ana.
     
     ✨ ¡Ya puedes usar todos los comandos del bot!
     
     💡 Escribe !help para ver qué puedo hacer por ti."
```

### Escenario 2: Cambio de Nombre
```
Usuario: "!soy Pedro"
Bot: "✅ ¡Perfecto, Pedro!
     
     Tu nombre ha sido registrado exitosamente. Ahora te reconoceré como Pedro en nuestras conversaciones.
     
     💡 Tip: Puedes cambiar tu nombre en cualquier momento usando los mismos comandos."
```

### Escenario 3: Consulta de Perfil
```
Usuario: "!quien-soy"
Bot: "👤 Tu Perfil
     
     Nombre: Pedro
     Teléfono: +34***
     Nivel: user
     Estado: ✅ Registrado
     Última actividad: 15/06/2025, 14:30:25"
```

## 🔒 Consideraciones de Seguridad

1. **Validación Estricta:** Los nombres pasan por múltiples validaciones
2. **Límite de Intentos:** Máximo 3 intentos por contexto de registro
3. **Timeout de Contexto:** Los contextos expiran después de 5 minutos
4. **Sanitización:** Los nombres se limpian de caracteres peligrosos

## 🚀 Funcionalidades Futuras

- [ ] Soporte para nombres con emojis
- [ ] Historial de cambios de nombre
- [ ] Verificación de nombres únicos (opcional)
- [ ] Importación masiva de nombres
- [ ] API REST para gestión de nombres

---

**Última actualización:** 18 de junio de 2025  
**Versión:** 1.0.0  
**Autor:** DrasBot Development Team
