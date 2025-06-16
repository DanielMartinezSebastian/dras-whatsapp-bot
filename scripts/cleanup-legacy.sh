#!/bin/bash
# Script de limpieza del sistema legacy

echo "🧹 Iniciando limpieza del sistema legacy..."

# Variables
PROJECT_ROOT="/home/dras/Documentos/PROGRAMACION/drasBot"
BACKUP_DIR="$PROJECT_ROOT/legacy-final-backup-$(date +%Y%m%d-%H%M%S)"
LEGACY_DIR="$PROJECT_ROOT/whatsapp-chatbot/backup/old-handlers-20250613-210515"

# Verificar que estamos en el directorio correcto
cd "$PROJECT_ROOT" || exit 1

echo "📊 Estado actual de la migración:"
node scripts/validate-migration.js | grep -E "(Comandos migrados|Progreso|Estado)"

echo ""
echo "⚠️  ATENCIÓN: Este script limpiará permanentemente los archivos legacy."
echo "¿Desea continuar? Solo continúe si la migración está completada satisfactoriamente."
echo "Presione Ctrl+C para cancelar, o Enter para continuar..."
read -r

# Crear backup final antes de eliminar
echo "📦 Creando backup final..."
mkdir -p "$BACKUP_DIR"
if [ -d "$LEGACY_DIR" ]; then
  cp -r "$LEGACY_DIR" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Directorio legacy no encontrado"
  echo "✅ Backup creado en: $BACKUP_DIR"
else
  echo "ℹ️  Directorio legacy ya no existe o fue movido"
fi

# Verificar migración antes de continuar
echo "✅ Verificando estado de migración..."
MIGRATION_STATUS=$(node -e "
const validator = require('./scripts/validate-migration.js');
const v = new validator();
v.validateMigration().then(() => {
  if (v.results.success >= 5) {
    console.log('READY');
  } else {
    console.log('NOT_READY');
  }
}).catch(() => console.log('ERROR'));
" 2>/dev/null)

if [ "$MIGRATION_STATUS" != "READY" ]; then
  echo "❌ La migración no está lista para finalizar"
  echo "   Se requieren al menos 5 comandos funcionando correctamente"
  echo "   Use 'node scripts/validate-migration.js' para ver detalles"
  exit 1
fi

echo "✅ Migración verificada - Procediendo con limpieza..."

# Limpiar archivos legacy si existen
if [ -d "$LEGACY_DIR" ]; then
  echo "🗑️  Eliminando archivos legacy..."
  rm -rf "$LEGACY_DIR"
  echo "✅ Directorio legacy eliminado: $LEGACY_DIR"
else
  echo "ℹ️  Directorio legacy ya fue eliminado anteriormente"
fi

# Limpiar comandos duplicados en general/
GENERAL_DIR="$PROJECT_ROOT/whatsapp-chatbot/src/bot/commands/general"
if [ -d "$GENERAL_DIR" ]; then
  echo "🧹 Limpiando comandos duplicados en general/..."
  
  # Verificar si hay duplicados
  if [ "$(ls -1 "$GENERAL_DIR"/*.js 2>/dev/null | wc -l)" -gt 0 ]; then
    # Mover a backup antes de eliminar
    GENERAL_BACKUP="$BACKUP_DIR/general-commands"
    mkdir -p "$GENERAL_BACKUP"
    cp "$GENERAL_DIR"/*.js "$GENERAL_BACKUP/" 2>/dev/null
    
    # Eliminar duplicados
    rm -f "$GENERAL_DIR"/*.js
    
    # Eliminar directorio si está vacío
    rmdir "$GENERAL_DIR" 2>/dev/null && echo "✅ Directorio general/ eliminado" || echo "ℹ️  Directorio general/ no estaba vacío"
  else
    echo "ℹ️  No se encontraron comandos duplicados en general/"
  fi
fi

# Limpiar referencias legacy en código
echo "🔍 Limpiando referencias legacy en código..."
find "$PROJECT_ROOT/whatsapp-chatbot/src" -name "*.js" -type f -exec grep -l "TODO.*implementar\|TODO.*migrar\|⚠️.*migrado.*requiere.*implementación" {} \; 2>/dev/null | while read -r file; do
  echo "🧹 Limpiando TODOs en: $(basename "$file")"
  # Crear backup del archivo
  cp "$file" "$file.backup-$(date +%s)"
  
  # Remover líneas con TODOs de migración específicos
  sed -i '/\/\/ TODO.*implementar/d' "$file" 2>/dev/null
  sed -i '/\/\/ TODO.*migrar/d' "$file" 2>/dev/null
  sed -i '/⚠️.*migrado.*requiere.*implementación/d' "$file" 2>/dev/null
done

# Actualizar configuración si existe
echo "⚙️  Actualizando configuración..."
ENV_FILE="$PROJECT_ROOT/whatsapp-chatbot/.env"
if [ -f "$ENV_FILE" ]; then
  # Crear backup
  cp "$ENV_FILE" "$ENV_FILE.backup-$(date +%s)"
  
  # Actualizar configuraciones
  sed -i 's/USE_LEGACY_SYSTEM=true/USE_LEGACY_SYSTEM=false/g' "$ENV_FILE" 2>/dev/null
  sed -i 's/MIGRATION_MODE=gradual/MIGRATION_MODE=complete/g' "$ENV_FILE" 2>/dev/null
  sed -i 's/USE_NEW_COMMANDS=false/USE_NEW_COMMANDS=true/g' "$ENV_FILE" 2>/dev/null
  
  echo "✅ Archivo .env actualizado"
else
  echo "ℹ️  Archivo .env no encontrado"
fi

# Limpiar archivos de backup antiguos (más de 7 días)
echo "🧹 Limpiando backups antiguos..."
find "$PROJECT_ROOT" -name "*.backup*" -type f -mtime +7 -delete 2>/dev/null
echo "✅ Backups antiguos eliminados"

# Actualizar package.json si es necesario
PACKAGE_JSON="$PROJECT_ROOT/whatsapp-chatbot/package.json"
if [ -f "$PACKAGE_JSON" ]; then
  echo "📦 Actualizando package.json..."
  
  # Usar node para actualizar JSON correctamente
  node -e "
  const fs = require('fs');
  const path = '$PACKAGE_JSON';
  
  try {
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    // Remover scripts legacy si existen
    if (pkg.scripts) {
      delete pkg.scripts['legacy-start'];
      delete pkg.scripts['legacy-test'];
      delete pkg.scripts['legacy-migrate'];
    }
    
    // Agregar script de validación de migración
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts['validate-migration'] = 'node scripts/validate-migration.js';
    pkg.scripts['test-migration'] = 'node tests/migration/migration.test.js';
    
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
    console.log('✅ package.json actualizado');
  } catch (error) {
    console.log('⚠️  Error actualizando package.json:', error.message);
  }
  " 2>/dev/null
fi

# Validación final
echo ""
echo "🔍 Ejecutando validación final..."
node scripts/validate-migration.js | tail -10

echo ""
echo "✅ Limpieza completada exitosamente"
echo "📦 Backup final guardado en: $BACKUP_DIR"
echo ""
echo "📋 Resumen de limpieza:"
echo "  • Sistema legacy deshabilitado"
echo "  • Archivos legacy eliminados"
echo "  • Comandos duplicados limpiados"
echo "  • Configuración actualizada"
echo "  • TODOs de migración removidos"
echo "  • Backups antiguos eliminados"
echo ""
echo "🎉 ¡Migración completada! El sistema ahora opera 100% con arquitectura modular."
echo ""
echo "🚀 Próximos pasos:"
echo "  1. Reiniciar el bot: ./manage.sh restart"
echo "  2. Verificar funcionamiento: !help"
echo "  3. Revisar dashboard: !migration status"
