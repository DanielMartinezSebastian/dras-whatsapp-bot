# Nueva Arquitectura DrasBot - PM2

## ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE

### Arquitectura Actual (Junio 2025)
- **TODO SE EJECUTA POR PM2** - NO más tmux
- **drasBot-new** es TypeScript y necesita compilación antes de restart
- **whatsapp-bridge** es Go compilado, restart directo
- **whatsapp-chatbot** es legacy, se puede ignorar

### ✅ SCRIPT DE#### **Reinicio Rápido (Método Recomendado para producción)**
```bash
./manage-new.sh restart && ./manage-new.sh health
```

#### **Solo Bot (Cambios menores en TypeScript)**
```bash
./manage-new.sh dev && ./manage-new.sh logs drasbot-new
```

#### **Ecosistema Completo (Solo si es necesario)**
```bash
./manage-new.sh restart-all && ./manage-new.sh health
```AR SIEMPRE: `./manage-new.sh`**

El script anterior `manage.sh` está obsoleto porque:
- ❌ Usaba tmux para el bridge
- ❌ No compilaba drasbot-new
- ❌ Mezclaba arquitecturas

**Nuevo script automáticamente:**
- ✅ Cierra sesiones tmux obsoletas
- ✅ Compila drasbot-new antes de reiniciar
- ✅ Gestiona todo por PM2
- ✅ Health checks automáticos

### Servicios PM2 Activos

1. **drasbot-bridge** (id: 0)
   - Tipo: Go application 
   - Puerto: 8080
   - API REST para comunicación con WhatsApp
   - Restart directo: `pm2 restart drasbot-bridge`

2. **drasbot-new** (id: 1) 
   - Tipo: TypeScript/Node.js
   - Puerto: 3000 (webhook)
   - **REQUIERE COMPILACIÓN**: `npm run build` antes de restart
   - Proceso: compile → restart → verify

3. **whatsapp-chatbot** (id: 4)
   - Tipo: Legacy system
   - Estado: Stopped (ignorar)

### Flujo de Trabajo Correcto

#### ✅ COMANDOS PRINCIPALES

```bash
# Reiniciar solo el bot (RECOMENDADO para producción)
./manage-new.sh restart

# Reiniciar todo el ecosistema (solo si es necesario)
./manage-new.sh restart-all

# Ver estado completo
./manage-new.sh status

# Ver logs en tiempo real
./manage-new.sh logs

# Health check completo
./manage-new.sh health

# Solo compilar y reiniciar bot (desarrollo)
./manage-new.sh dev

# Reset completo del sistema (emergencia)
./manage-new.sh reset
```

#### Para cambios en drasBot-new:
```bash
cd /home/dras/Documentos/PROGRAMACION/drasBot/drasbot-new
npm run build                    # 1. Compilar TypeScript
cd ..
pm2 restart drasbot-new         # 2. Reiniciar servicio
pm2 logs drasbot-new --lines 20 # 3. Verificar logs
```

**O simplemente:**
```bash
./manage-new.sh dev              # Hace todo automáticamente
```

#### Para el bridge:
```bash
pm2 restart drasbot-bridge      # Restart directo
pm2 logs drasbot-bridge --lines 20
```

**O:**
```bash
./manage-new.sh restart          # Reinicia todo
```

#### Para ver estado:
```bash
pm2 status                      # Estado general
curl http://localhost:8080/health # Health check bridge
curl http://localhost:3000/health # Health check bot (si existe)
```

### ✅ VERIFICACIÓN DEL FUNCIONAMIENTO

**Estado actual (después de migración):**

1. **Bridge funcionando**: ✅ Online, recibe mensajes de WhatsApp
2. **Bot funcionando**: ✅ Online, procesa comandos y auto-respuestas  
3. **Comunicación**: ✅ Bridge → Bot → Bridge funciona
4. **Compilación automática**: ✅ Script compila antes de reiniciar
5. **Logs estructurados**: ✅ Todo logueado correctamente

**Pruebas realizadas:**
- ✅ Mensaje "hola" → Bot responde automáticamente
- ✅ Comando "!help" → Bot procesa y responde
- ✅ Comando "!stats" → Bot detecta comando inexistente correctamente
- ✅ Logs muestran flujo completo funcionando

### 🚨 PROBLEMAS COMUNES Y SOLUCIONES

#### Problema: Bot no responde
**Causa**: drasbot-new no está compilado o no se reinició después de cambios
**Solución**:
```bash
./manage-new.sh dev              # Compila y reinicia automáticamente
```

#### Problema: Bridge no conecta
**Causa**: Bridge puede estar corriendo en tmux en lugar de PM2
**Solución**:
```bash
./manage-new.sh clean            # Cierra tmux y limpia puertos
./manage-new.sh restart          # Reinicia todo correctamente
```

#### Problema: "ECONNREFUSED 127.0.0.1:8080"
**Causa**: Bridge no está disponible cuando bot intenta enviar respuesta
**Solución**: Normal durante reinicio, se resuelve automáticamente

#### Problema: Puertos ocupados
**Solución**:
```bash
./manage-new.sh clean            # Libera puertos automáticamente
```

### 📁 ARCHIVOS DE CONFIGURACIÓN

- **PM2 Config**: `/drasbot-new/ecosystem.config.js` (define ambos servicios)
- **Bot Config**: `/drasbot-new/src/config/`
- **Bridge Config**: `/whatsapp-bridge/` (configuración Go)

### 📊 LOGS Y MONITOREO

- **PM2 logs**: `~/.pm2/logs/`
- **drasbot-new logs**: `/drasbot-new/logs/`
- **Bridge logs**: Configurados en ecosystem.config.js

### 🎯 COMANDOS DE DESARROLLO

```bash
# Desarrollo con watch mode
cd drasbot-new && npm run dev

# Testing
cd drasbot-new && npm test

# Build manual
cd drasbot-new && npm run build

# Desarrollo del bridge
cd whatsapp-bridge && go run main.go
```

### 🔧 MIGRACIÓN COMPLETADA

**Cambios realizados:**

1. ✅ Todas las sesiones tmux cerradas
2. ✅ Script `manage-new.sh` creado y configurado
3. ✅ Compilación automática implementada
4. ✅ Gestión unificada por PM2
5. ✅ Health checks implementados
6. ✅ Flujo de trabajo documentado
7. ✅ Sistema funcionando y probado

**Archivos obsoletos:**
- `manage.sh` (usar `manage-new.sh`)
- Cualquier referencia a tmux

### 📋 NOTAS FINALES

1. **Siempre usar `./manage-new.sh`** para gestión del sistema
2. **drasbot-new requiere compilación** antes de cualquier restart
3. **Todo se gestiona por PM2** - no usar tmux
4. **El sistema está completamente funcional** y probado
5. **Los logs son detallados** y permiten debugging fácil

## ✅ MIGRACIÓN EXITOSA - SISTEMA FUNCIONAL

### Comandos de Diagnóstico

```bash
# Ver logs en tiempo real
pm2 logs drasbot-new --lines 0  # Bot logs en vivo
pm2 logs drasbot-bridge --lines 0 # Bridge logs en vivo

# Estado de conectividad
curl http://localhost:8080/status # Estado WhatsApp bridge

# Reinicio completo del sistema
pm2 restart all

# Parar todo
pm2 stop all

# Ver detalles de proceso específico
pm2 describe drasbot-new
pm2 describe drasbot-bridge
```

### Errores Comunes y Soluciones

1. **"Bridge not connected"**
   - Restart: `pm2 restart drasbot-bridge`
   - Verificar: `curl http://localhost:8080/status`

2. **"Changes not applied"** 
   - Compilar ANTES: `cd drasbot-new && npm run build`
   - Luego restart: `pm2 restart drasbot-new`

3. **"Port in use"**
   - Ver procesos: `pm2 status`
   - Matar tmux: `tmux kill-server`
   - Restart servicios: `pm2 restart all`

### Estructura de Archivos

```
drasBot/
├── manage.sh                    # Script de gestión actualizado
├── drasbot-new/                 # Bot principal (TypeScript)
│   ├── package.json            # Dependencias propias
│   ├── tsconfig.json
│   ├── src/                    # Código fuente
│   └── dist/                   # Código compilado
├── whatsapp-bridge/            # Bridge WhatsApp (Go)
│   ├── main.go
│   └── store/
└── whatsapp-chatbot/           # Legacy (ignorar)
```

### Puertos

- **8080**: WhatsApp Bridge (API REST)
- **3000**: DrasBot webhook server
- **Otros**: Legacy (ignorar)

---
**ÚLTIMA ACTUALIZACIÓN**: 18 Junio 2025 - Arquitectura PM2 pura

## 🚀 USO EN PRODUCCIÓN

### **DIFERENCIA: Desarrollo vs Producción**

| Entorno | Comando | Propósito |
|---------|---------|-----------|
| **Desarrollo** | `./manage-new.sh dev` | Compilar y reiniciar solo el bot para pruebas rápidas |
| **Producción** | `./manage-new.sh restart` | Compilar, reiniciar todo el ecosistema y verificar salud |

### **📋 COMANDOS PARA PRODUCCIÓN**

#### **1. Despliegue Rápido (Recomendado para producción)**
```bash
# Solo reinicia el bot (mantiene conexión WhatsApp estable)
./manage-new.sh restart
```

#### **2. Despliegue Completo (Solo si necesitas reiniciar el bridge)**
```bash
# Reinicia bot + bridge (puede interrumpir WhatsApp momentáneamente)
./manage-new.sh restart-all
```

#### **3. Actualización Solo del Bot (Cambios menores)**
```bash
# Solo si estás seguro que el bridge está estable
./manage-new.sh dev
```

#### **3. Verificación Post-Despliegue**
```bash
# Verificar estado
./manage-new.sh status

# Health check completo
./manage-new.sh health

# Ver logs en tiempo real (cancelar con Ctrl+C)
./manage-new.sh logs

# Ver logs específicos del bot
./manage-new.sh logs-bot

# Ver logs específicos del bridge
./manage-new.sh logs-bridge
```

### **🎯 FLUJO RECOMENDADO PARA PRODUCCIÓN**

#### **Despliegue Estándar (Recomendado):**
```bash
# 1. Hacer backup de logs importantes (opcional)
cp -r ~/.pm2/logs/ ~/.pm2/logs-backup-$(date +%Y%m%d-%H%M%S)

# 2. Desplegar cambios (solo bot)
./manage-new.sh restart

# 3. Verificar que todo funciona
./manage-new.sh health

# 4. Monitorear logs por unos minutos
./manage-new.sh logs
```

#### **Despliegue Completo (Solo si necesitas reiniciar bridge):**
```bash
# 1. Desplegar todo el ecosistema
./manage-new.sh restart-all

# 2. Verificación intensiva
./manage-new.sh health
./manage-new.sh status

# 3. Monitorear logs
./manage-new.sh logs
```

#### **Despliegue de Emergencia (Problemas críticos):**
```bash
# 1. Reset completo del sistema
./manage-new.sh reset

# 2. Verificación intensiva
./manage-new.sh health
./manage-new.sh status

# 3. Prueba manual enviando mensaje de WhatsApp
```

### **⚡ COMANDOS RÁPIDOS DE PRODUCCIÓN**

#### **Reinicio Rápido (Método Recomendado)**
```bash
./manage-new.sh restart && ./manage-new.sh health
```

#### **Solo Bot (Cambios menores en TypeScript)**
```bash
./manage-new.sh dev && ./manage-new.sh logs-bot
```

#### **Verificación de Estado**
```bash
./manage-new.sh status
```

#### **Resolución de Problemas**
```bash
# Si algo va mal
./manage-new.sh clean && ./manage-new.sh restart
```

### **🔍 MONITOREO EN PRODUCCIÓN**

#### **Logs en Tiempo Real**
```bash
# Todos los servicios
./manage-new.sh logs

# Solo el bot (recomendado para debug)
./manage-new.sh logs-bot

# Solo el bridge
./manage-new.sh logs-bridge
```

#### **Estado del Sistema**
```bash
# Vista completa del estado
./manage-new.sh status

# Health check de conectividad
./manage-new.sh health

# Estado PM2 directo
pm2 status
```

#### **Métricas de Rendimiento**
```bash
# Monitor en tiempo real (opcional)
pm2 monit

# Información detallada de procesos
pm2 show drasbot-new
pm2 show drasbot-bridge
```

### **⚠️ MEJORES PRÁCTICAS PARA PRODUCCIÓN**

#### **✅ Hacer SIEMPRE:**
1. **Usar `./manage-new.sh restart`** para cambios importantes
2. **Verificar health** después de cada despliegue
3. **Monitorear logs** durante 2-3 minutos post-despliegue
4. **Tener backup** de configuraciones importantes

#### **❌ EVITAR en Producción:**
1. **NO usar comandos PM2 directos** (usar el script)
2. **NO hacer `pm2 restart all`** (puede afectar otros proyectos)
3. **NO reiniciar servicios por separado** sin coordinar

#### **🚨 En Caso de Emergencia:**
```bash
# Si el bot no responde para nada
./manage-new.sh reset

# Si hay problemas de red/puertos
./manage-new.sh clean && ./manage-new.sh restart

# Si PM2 está corrupto
pm2 kill && ./manage-new.sh start
```

### **📈 AUTOMATIZACIÓN PARA PRODUCCIÓN**

#### **Script de Despliegue Automatizado (Opcional)**
```bash
#!/bin/bash
# deploy.sh - Para automatizar despliegues

echo "🚀 Iniciando despliegue..."
./manage-new.sh restart

echo "⏳ Esperando estabilización..."
sleep 10

echo "🔍 Verificando salud..."
./manage-new.sh health

echo "✅ Despliegue completado"
```

#### **Cron para Monitoreo (Opcional)**
```bash
# Agregar al crontab para verificar cada 5 minutos
# */5 * * * * cd /home/dras/Documentos/PROGRAMACION/drasBot && ./manage-new.sh health > /tmp/drasbot-health.log 2>&1
```

### **🎯 RESUMEN: COMANDOS CLAVE PARA PRODUCCIÓN**

| Situación | Comando |
|-----------|---------|
| **Despliegue normal** | `./manage-new.sh restart` |
| **Despliegue completo** | `./manage-new.sh restart-all` |
| **Cambio menor del bot** | `./manage-new.sh dev` |
| **Verificar estado** | `./manage-new.sh status` |
| **Ver logs** | `./manage-new.sh logs` |
| **Problema crítico** | `./manage-new.sh reset` |
| **Limpiar sistema** | `./manage-new.sh clean` |

**💡 Reglas de oro:** 
- **Producción normal**: usar `restart` (solo bot)
- **Solo si hay problemas con bridge**: usar `restart-all`
- **Siempre verificar** el estado después de cualquier cambio

### 🎉 ACTUALIZACIONES RECIENTES

#### **✅ Fix de Persistencia de Usuarios (18/06/2025)**

**Problema solucionado**: Los usuarios no se guardaban en la base de datos SQLite tras reinicio.

**Antes**: El bot creaba nuevos usuarios en memoria en cada mensaje
```bash
👤 New user created | userId: 1750242392206  # Primer mensaje
👤 New user created | userId: 1750242401488  # Segundo mensaje (mismo usuario!)
```

**Después**: Los usuarios se persisten correctamente en SQLite
```bash
👤 New user created | userId: 7                # Primera vez
User updated successfully | userId: 7          # Mensajes posteriores
```

**Verificación**:
- ✅ Usuarios se guardan en `./drasbot-new/data/drasbot.db`
- ✅ Usuarios persisten tras `./manage-new.sh restart`
- ✅ Bot reconoce usuarios existentes correctamente
- ✅ No hay usuarios duplicados por número de teléfono

**Archivos modificados**: `src/services/message-processor.service.ts`
