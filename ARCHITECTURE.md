# Nueva Arquitectura DrasBot - PM2

## ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE

### Arquitectura Actual (Junio 2025)
- **TODO SE EJECUTA POR PM2** - NO más tmux
- **drasBot-new** es TypeScript y necesita compilación antes de restart
- **whatsapp-bridge** es Go compilado, restart directo
- **Sistema legacy eliminado** - Solo drasbot-new + bridge

### ✅ SCRIPT DE#### **Reinicio Rápido (Método Recomendado para producción)**
```bash
./manage.sh restart && ./manage.sh health
```

#### **Solo Bot (Cambios menores en TypeScript)**
```bash
./manage.sh dev && ./manage.sh logs drasbot-new
```

#### **Ecosistema Completo (Solo si es necesario)**
```bash
./manage.sh restart-all && ./manage.sh health
```AR SIEMPRE: `./manage.sh`**

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

### Flujo de Trabajo Correcto

#### ✅ COMANDOS PRINCIPALES

```bash
# Reiniciar solo el bot (RECOMENDADO para producción)
./manage.sh restart

# Reiniciar todo el ecosistema (solo si es necesario)
./manage.sh restart-all

# Ver estado completo
./manage.sh status

# Ver logs en tiempo real
./manage.sh logs

# Health check completo
./manage.sh health

# Solo compilar y reiniciar bot (desarrollo)
./manage.sh dev

# Reset completo del sistema (emergencia)
./manage.sh reset
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
./manage.sh dev              # Hace todo automáticamente
```

#### Para el bridge:
```bash
pm2 restart drasbot-bridge      # Restart directo
pm2 logs drasbot-bridge --lines 20
```

**O:**
```bash
./manage.sh restart          # Reinicia todo
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
./manage.sh dev              # Compila y reinicia automáticamente
```

#### Problema: Bridge no conecta
**Causa**: Bridge puede estar corriendo en tmux en lugar de PM2
**Solución**:
```bash
./manage.sh clean            # Cierra tmux y limpia puertos
./manage.sh restart          # Reinicia todo correctamente
```

#### Problema: "ECONNREFUSED 127.0.0.1:8080"
**Causa**: Bridge no está disponible cuando bot intenta enviar respuesta
**Solución**: Normal durante reinicio, se resuelve automáticamente

#### Problema: Puertos ocupados
**Solución**:
```bash
./manage.sh clean            # Libera puertos automáticamente
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
2. ✅ Script `manage.sh` creado y configurado
3. ✅ Compilación automática implementada
4. ✅ Gestión unificada por PM2
5. ✅ Health checks implementados
6. ✅ Flujo de trabajo documentado
7. ✅ Sistema funcionando y probado

**Archivos obsoletos:**
- `manage.sh` (usar `manage.sh`)
- Cualquier referencia a tmux

### 📋 NOTAS FINALES

1. **Siempre usar `./manage.sh`** para gestión del sistema
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
```

### Puertos

- **8080**: WhatsApp Bridge (API REST)
- **3000**: DrasBot webhook server

---
**ÚLTIMA ACTUALIZACIÓN**: 18 Junio 2025 - Arquitectura PM2 pura

## 🚀 USO EN PRODUCCIÓN

### **DIFERENCIA: Desarrollo vs Producción**

| Entorno | Comando | Propósito |
|---------|---------|-----------|
| **Desarrollo** | `./manage.sh dev` | Compilar y reiniciar solo el bot para pruebas rápidas |
| **Producción** | `./manage.sh restart` | Compilar, reiniciar todo el ecosistema y verificar salud |

### **📋 COMANDOS PARA PRODUCCIÓN**

#### **1. Despliegue Rápido (Recomendado para producción)**
```bash
# Solo reinicia el bot (mantiene conexión WhatsApp estable)
./manage.sh restart
```

#### **2. Despliegue Completo (Solo si necesitas reiniciar el bridge)**
```bash
# Reinicia bot + bridge (puede interrumpir WhatsApp momentáneamente)
./manage.sh restart-all
```

#### **3. Actualización Solo del Bot (Cambios menores)**
```bash
# Solo si estás seguro que el bridge está estable
./manage.sh dev
```

#### **3. Verificación Post-Despliegue**
```bash
# Verificar estado
./manage.sh status

# Health check completo
./manage.sh health

# Ver logs en tiempo real (cancelar con Ctrl+C)
./manage.sh logs

# Ver logs específicos del bot
./manage.sh logs-bot

# Ver logs específicos del bridge
./manage.sh logs-bridge
```

### **🎯 FLUJO RECOMENDADO PARA PRODUCCIÓN**

#### **Despliegue Estándar (Recomendado):**
```bash
# 1. Hacer backup de logs importantes (opcional)
cp -r ~/.pm2/logs/ ~/.pm2/logs-backup-$(date +%Y%m%d-%H%M%S)

# 2. Desplegar cambios (solo bot)
./manage.sh restart

# 3. Verificar que todo funciona
./manage.sh health

# 4. Monitorear logs por unos minutos
./manage.sh logs
```

#### **Despliegue Completo (Solo si necesitas reiniciar bridge):**
```bash
# 1. Desplegar todo el ecosistema
./manage.sh restart-all

# 2. Verificación intensiva
./manage.sh health
./manage.sh status

# 3. Monitorear logs
./manage.sh logs
```

#### **Despliegue de Emergencia (Problemas críticos):**
```bash
# 1. Reset completo del sistema
./manage.sh reset

# 2. Verificación intensiva
./manage.sh health
./manage.sh status

# 3. Prueba manual enviando mensaje de WhatsApp
```

### **⚡ COMANDOS RÁPIDOS DE PRODUCCIÓN**

#### **Reinicio Rápido (Método Recomendado)**
```bash
./manage.sh restart && ./manage.sh health
```

#### **Solo Bot (Cambios menores en TypeScript)**
```bash
./manage.sh dev && ./manage.sh logs-bot
```

#### **Verificación de Estado**
```bash
./manage.sh status
```

#### **Resolución de Problemas**
```bash
# Si algo va mal
./manage.sh clean && ./manage.sh restart
```

### **🔍 MONITOREO EN PRODUCCIÓN**

#### **Logs en Tiempo Real**
```bash
# Todos los servicios
./manage.sh logs

# Solo el bot (recomendado para debug)
./manage.sh logs-bot

# Solo el bridge
./manage.sh logs-bridge
```

#### **Estado del Sistema**
```bash
# Vista completa del estado
./manage.sh status

# Health check de conectividad
./manage.sh health

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
1. **Usar `./manage.sh restart`** para cambios importantes
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
./manage.sh reset

# Si hay problemas de red/puertos
./manage.sh clean && ./manage.sh restart

# Si PM2 está corrupto
pm2 kill && ./manage.sh start
```

### **📈 AUTOMATIZACIÓN PARA PRODUCCIÓN**

#### **Script de Despliegue Automatizado (Opcional)**
```bash
#!/bin/bash
# deploy.sh - Para automatizar despliegues

echo "🚀 Iniciando despliegue..."
./manage.sh restart

echo "⏳ Esperando estabilización..."
sleep 10

echo "🔍 Verificando salud..."
./manage.sh health

echo "✅ Despliegue completado"
```

#### **Cron para Monitoreo (Opcional)**
```bash
# Agregar al crontab para verificar cada 5 minutos
# */5 * * * * cd /home/dras/Documentos/PROGRAMACION/drasBot && ./manage.sh health > /tmp/drasbot-health.log 2>&1
```

### **🎯 RESUMEN: COMANDOS CLAVE PARA PRODUCCIÓN**

| Situación | Comando |
|-----------|---------|
| **Despliegue normal** | `./manage.sh restart` |
| **Despliegue completo** | `./manage.sh restart-all` |
| **Cambio menor del bot** | `./manage.sh dev` |
| **Verificar estado** | `./manage.sh status` |
| **Ver logs** | `./manage.sh logs` |
| **Problema crítico** | `./manage.sh reset` |
| **Limpiar sistema** | `./manage.sh clean` |

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
- ✅ Usuarios persisten tras `./manage.sh restart`
- ✅ Bot reconoce usuarios existentes correctamente
- ✅ No hay usuarios duplicados por número de teléfono

**Archivos modificados**: `src/services/message-processor.service.ts`
