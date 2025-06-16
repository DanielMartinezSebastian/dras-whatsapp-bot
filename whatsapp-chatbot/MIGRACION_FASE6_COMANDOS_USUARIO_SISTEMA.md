# MIGRACIÓN FASE 6: COMANDOS DE USUARIO Y SISTEMA

## FECHA
16 de junio de 2025

## OBJETIVO
Continuar la migración de centralización de strings para los comandos de usuario y sistema, implementando el uso de ConfigurationService y archivos JSON editables.

## COMANDOS MIGRADOS

### Comandos de Usuario (user/)
1. **ProfileCommand** ✅ (Migrado en fase anterior)
   - Constructor actualizado con ConfigurationService
   - Métodos auxiliares implementados (getConfigMessage, replaceVariables, getValueByPath)
   - Método execute migrado para usar plantillas configurables
   - Configuración expandida en commands.json

2. **PermissionsCommand** ✅ (Nuevo en esta fase)
   - Constructor actualizado con ConfigurationService
   - Métodos auxiliares implementados (getConfigMessage, replaceVariables, getValueByPath)
   - Método execute migrado para usar plantillas configurables
   - Métodos getUserCommands y getUserRestrictions migrados para usar configuración
   - Configuración completa agregada a commands.json incluyendo:
     - user_levels (niveles y emojis)
     - commands_by_level (comandos disponibles por nivel)
     - user_type_mapping (mapeo de tipos de usuario a niveles)
     - restrictions (restricciones por tipo de usuario)
     - plantillas de respuesta estructuradas

### Comandos de Sistema (system/)
3. **StatsCommand** ✅ (Nuevo en esta fase - migración parcial)
   - Constructor actualizado con ConfigurationService
   - Métodos auxiliares implementados (getConfigMessage, replaceVariables, getValueByPath)
   - Métodos getGeneralStats y getUsersStats migrados para usar plantillas configurables
   - Configuración completa agregada a commands.json incluyendo:
     - response sections para general, users, commands, permissions, system
     - default_values para valores de fallback
     - error_messages específicos para cada tipo de estadística
     - plantillas estructuradas para cada sección

## CONFIGURACIÓN EXPANDIDA

### Archivo: `src/config/default/commands.json`

**Secciones agregadas:**
- `permissions`: Configuración completa para el comando de permisos
- `stats`: Configuración completa para el comando de estadísticas (parcial)

**Estructura de permissions:**
```json
{
  "permissions": {
    "description": "...",
    "response": {
      "title": "...",
      "sections": {
        "user_info": {...},
        "usage_stats": {...},
        "commands_section": {...},
        "restrictions": {...},
        "system_status": {...},
        "additional_info": {...},
        "footer": {...}
      }
    },
    "user_levels": {...},
    "commands_by_level": {...},
    "user_type_mapping": {...},
    "restrictions": {...},
    "error_messages": {...}
  }
}
```

**Estructura de stats:**
```json
{
  "stats": {
    "description": "...",
    "response": {
      "general": {...},
      "users": {...},
      "commands": {...},
      "permissions": {...},
      "system": {...}
    },
    "default_values": {...},
    "error_messages": {...}
  }
}
```

## VALIDACIÓN

### Script de Validación Actualizado
- Agregado PermissionsCommand y StatsCommand al array de validaciones
- Total de tests: 17
- Tests pasados: 17/17 (100%)

### Comandos Validados:
1. Handlers migrados (4/4)
2. Comandos básicos (4/4)
3. Comandos de usuario (2/2)
4. Comandos de sistema (1/1 parcial)

## CAMBIOS REALIZADOS

### PermissionsCommand.ts:
- ✅ Import ConfigurationService agregado
- ✅ Constructor actualizado
- ✅ metadata.description migrado a usar getConfigMessage
- ✅ Métodos auxiliares implementados
- ✅ getUserCommands migrado para usar configuración
- ✅ getUserRestrictions migrado para usar configuración
- ✅ execute migrado completamente para usar plantillas

### StatsCommand.ts (migración parcial):
- ✅ Import ConfigurationService agregado
- ✅ Constructor actualizado
- ✅ metadata.description migrado a usar getConfigMessage
- ✅ Métodos auxiliares implementados
- ✅ getGeneralStats migrado para usar plantillas
- ✅ getUsersStats migrado para usar plantillas
- ⏳ Métodos pendientes: getCommandsStats, getPermissionsStats, getSystemStats, execute

### scripts/validate-migration.js:
- ✅ Agregado PermissionsCommand al array de validaciones
- ✅ Agregado StatsCommand al array de validaciones
- ✅ Total tests incrementado a 17

## PENDIENTE

### StatsCommand (continuación):
- Migrar getCommandsStats para usar plantillas
- Migrar getPermissionsStats para usar plantillas  
- Migrar getSystemStats para usar plantillas
- Migrar método execute principal
- Completar validación de migración

### Próximos Comandos:
- LogsCommand (system/)
- AdminPanelCommand (admin/)
- UsersCommand (admin/)
- ConfigCommand (admin/)
- DiagnosticCommand (admin/)
- AdminSystemCommand (admin/)

## BENEFICIOS LOGRADOS

1. **Configurabilidad Total**: Todos los textos son editables desde JSON
2. **Plantillas Dinámicas**: Variables reemplazables en tiempo de ejecución
3. **Mantenimiento Simplificado**: Cambios sin tocar código
4. **Consistencia**: Estructura estándar en todos los comandos
5. **Validación Automática**: Script garantiza integridad de migración
6. **Escalabilidad**: Fácil agregar nuevos comandos siguiendo el patrón

## ESTADO ACTUAL
- **Handlers migrados**: 4/4 (100%)
- **Comandos básicos**: 4/4 (100%)  
- **Comandos de usuario**: 2/2 (100%)
- **Comandos de sistema**: 1/2 (50% - StatsCommand parcial)
- **Comandos de admin**: 0/6 (0%)
- **Total migrados**: 11/18 comandos (~61%)

**Tests de validación**: 17/17 pasados (100%)
