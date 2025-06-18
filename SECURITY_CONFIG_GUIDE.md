# 🔒 Configuración de Seguridad DrasBot

## 📋 Resumen

Este archivo explica la configuración de seguridad implementada en DrasBot para garantizar que los servicios sean accesibles entre aplicaciones locales pero **NO** desde fuera del VPS.

## 🎯 Objetivo de Seguridad

- ✅ **Comunicación entre servicios locales**: Bot ↔ Bridge
- ✅ **Acceso de administración local**: Gestión desde el VPS
- ❌ **Acceso externo**: Bloqueado para seguridad

## 📁 Archivos Involucrados

### `.security-config`
Archivo de configuración centralizada con todas las variables de seguridad.

### `manage.sh`
Script de gestión que carga y usa la configuración de seguridad.

## 🔧 Configuración Actual

```bash
# === CONFIGURACIÓN DE RED Y ACCESO ===
DRASBOT_EXTERNAL_ACCESS=false          # No permitir acceso externo
DRASBOT_LOCALHOST_ONLY=true           # Solo localhost para servicios
DRASBOT_ALLOW_INTERNAL_NETWORKS=true  # Comunicación entre servicios

# === HOSTS Y PUERTOS ===
DRASBOT_BRIDGE_HOST=127.0.0.1         # Bridge solo local
DRASBOT_CHATBOT_HOST=127.0.0.1        # Bot solo local  
DRASBOT_WEBHOOK_HOST=0.0.0.0          # Webhook accesible desde bridge
DRASBOT_BRIDGE_PORT=8080              # Puerto del bridge
DRASBOT_CHATBOT_PORT=3000             # Puerto del bot
```

## 🚀 Comandos Disponibles

### Verificar Configuración de Seguridad
```bash
./manage.sh security
```
Muestra la configuración actual y verifica puertos.

### Verificar Solo Puertos
```bash
./manage.sh check-ports
```
Verifica qué puertos están en uso y la conectividad.

## 🛡️ Explicación de la Configuración

### 1. **Hosts Configurados**

- **Bridge (127.0.0.1:8080)**: Solo accesible localmente
- **Bot (127.0.0.1:3000)**: Solo accesible localmente
- **Webhook (0.0.0.0)**: Accesible desde el bridge, pero el bridge solo está en localhost

### 2. **Flujo de Comunicación Seguro**

```
WhatsApp ↔ Bridge Go (127.0.0.1:8080) ↔ Bot TS (127.0.0.1:3000)
```

- WhatsApp se conecta al Bridge Go
- Bridge Go envía webhooks al Bot TypeScript
- Todo permanece en localhost del VPS

### 3. **Verificación de Seguridad**

El sistema verifica automáticamente:
- ✅ Puertos en uso por los procesos correctos
- ✅ Conectividad local funcionando
- ✅ Acceso externo bloqueado
- ✅ IP externa no expuesta

## 🔍 Verificación de Estado

### Estado Esperado:
```
🔒 CONFIGURACIÓN DE SEGURIDAD ACTUAL
══════════════════════════════════════════
Acceso externo:     false
Solo localhost:     true
Host Bridge:        127.0.0.1:8080
Host Bot:          127.0.0.1:3000
Host Webhook:      0.0.0.0
══════════════════════════════════════════

🔍 VERIFICACIÓN DE PUERTOS Y ACCESIBILIDAD
📊 Estado de puertos:
  Puerto 8080: EN USO (Bridge)
  Puerto 3000: EN USO (Bot)
🔗 Conectividad local:
  Bridge (127.0.0.1:8080): ACCESIBLE
  Bot (127.0.0.1:3000): ACCESIBLE
🌐 Acceso externo:
  🔒 ACCESO EXTERNO DESHABILITADO (Recomendado)
```

## ⚙️ Modificar Configuración

Para cambiar la configuración, edita `.security-config`:

```bash
nano .security-config
```

**⚠️ IMPORTANTE**: Mantén `DRASBOT_EXTERNAL_ACCESS=false` para seguridad.

## 🚨 Alertas de Seguridad

El sistema alertará si:
- `DRASBOT_EXTERNAL_ACCESS=true` (no recomendado)
- Puertos no están siendo utilizados por los procesos esperados
- Conectividad local falla

## 📞 Troubleshooting

### Problema: Bridge no accesible
```bash
./manage.sh restart-all
./manage.sh check-ports
```

### Problema: Acceso externo detectado
1. Verificar `.security-config`
2. Confirmar que `DRASBOT_EXTERNAL_ACCESS=false`
3. Verificar firewall del VPS

### Problema: Puertos en conflicto
```bash
./manage.sh clean
./manage.sh start
```

## ✅ Estado Final

Con esta configuración tienes:
- 🔒 **Seguridad**: Servicios no expuestos externamente  
- 🔗 **Funcionalidad**: Comunicación interna funcionando
- 📊 **Monitoreo**: Herramientas para verificar estado
- ⚙️ **Flexibilidad**: Configuración centralizada y modificable

La configuración garantiza que solo las aplicaciones locales pueden comunicarse entre sí, mientras que el acceso externo está completamente bloqueado.
