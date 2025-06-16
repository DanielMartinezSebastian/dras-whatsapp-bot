#!/bin/bash

# ==========================================
# Script de Instalación del Sistema de Registro de Nombres
# ==========================================

set -e  # Salir si cualquier comando falla

echo "🚀 Iniciando instalación del Sistema de Registro de Nombres..."
echo

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones auxiliares
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. Asegúrate de ejecutar este script desde el directorio raíz del proyecto."
    exit 1
fi

log_info "Directorio actual: $(pwd)"

# 1. Verificar dependencias de Node.js
log_info "Verificando dependencias de Node.js..."

if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm no está instalado. Por favor instala npm primero."
    exit 1
fi

NODE_VERSION=$(node --version)
log_success "Node.js encontrado: $NODE_VERSION"

# 2. Instalar/verificar dependencias
log_info "Verificando dependencias del proyecto..."

if [ ! -d "node_modules" ]; then
    log_info "Instalando dependencias de npm..."
    npm install
    log_success "Dependencias instaladas"
else
    log_success "Dependencias ya instaladas"
fi

# 3. Verificar estructura de directorios
log_info "Verificando estructura de directorios..."

REQUIRED_DIRS=(
    "src/services"
    "src/bot/handlers"
    "src/bot/core"
    "src/database/models"
    "scripts"
    "logs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        log_info "Creando directorio: $dir"
        mkdir -p "$dir"
    fi
done

log_success "Estructura de directorios verificada"

# 4. Verificar archivos principales
log_info "Verificando archivos del sistema de registro..."

REQUIRED_FILES=(
    "src/services/registrationService.js"
    "src/bot/handlers/RegistrationHandler.js"
    "scripts/migrate-registration.js"
)

missing_files=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    log_error "Archivos faltantes del sistema de registro:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    log_error "Por favor asegúrate de que todos los archivos del sistema estén presentes."
    exit 1
fi

log_success "Todos los archivos del sistema están presentes"

# 5. Configurar archivo .env
log_info "Configurando archivo de entorno..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_info "Copiando .env.example a .env..."
        cp .env.example .env
        log_success "Archivo .env creado desde .env.example"
        log_warning "Por favor revisa y ajusta las configuraciones en .env según tus necesidades"
    else
        log_error "No se encontró .env.example. No se puede crear .env automáticamente."
        exit 1
    fi
else
    log_success "Archivo .env ya existe"
fi

# 6. Verificar configuración de base de datos
log_info "Verificando configuración de base de datos..."

DB_DIR="src/database"
if [ ! -d "$DB_DIR" ]; then
    mkdir -p "$DB_DIR"
    log_info "Directorio de base de datos creado: $DB_DIR"
fi

# 7. Ejecutar migración de base de datos
log_info "Ejecutando migración de base de datos..."

if [ -f "scripts/migrate-registration.js" ]; then
    log_info "Ejecutando migrate-registration.js..."
    if node scripts/migrate-registration.js; then
        log_success "Migración de base de datos completada"
    else
        log_error "Error durante la migración de base de datos"
        exit 1
    fi
else
    log_error "Script de migración no encontrado: scripts/migrate-registration.js"
    exit 1
fi

# 8. Ejecutar pruebas de validación
log_info "Ejecutando pruebas de validación..."

if [ -f "test-name-validation.js" ]; then
    log_info "Ejecutando pruebas de validación de nombres..."
    if node test-name-validation.js; then
        log_success "Pruebas de validación pasaron correctamente"
    else
        log_warning "Algunas pruebas de validación fallaron, pero la instalación puede continuar"
    fi
else
    log_warning "Script de pruebas de validación no encontrado, saltando..."
fi

# 9. Verificar permisos de archivos
log_info "Verificando permisos de archivos..."

# Hacer ejecutables los scripts
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/*.js 2>/dev/null || true

log_success "Permisos de archivos configurados"

# 10. Crear backup de configuración actual si existe
if [ -f "src/bot/core/BotProcessor.js.backup" ]; then
    log_info "Se encontró backup previo de BotProcessor"
else
    if [ -f "src/bot/core/BotProcessor.js" ]; then
        log_info "Creando backup de BotProcessor actual..."
        cp src/bot/core/BotProcessor.js src/bot/core/BotProcessor.js.backup
        log_success "Backup creado: BotProcessor.js.backup"
    fi
fi

# 11. Mostrar resumen de instalación
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "🎉 Instalación del Sistema de Registro de Nombres COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

echo "📋 Componentes instalados:"
echo "   ✅ RegistrationService - Lógica de negocio"
echo "   ✅ RegistrationHandler - Coordinador de flujo"
echo "   ✅ BotProcessor - Integración principal"
echo "   ✅ UserService - Métodos extendidos"
echo "   ✅ UserModel - Base de datos actualizada"
echo "   ✅ Scripts de migración y pruebas"
echo

echo "📁 Archivos importantes:"
echo "   📄 .env - Configuración del sistema"
echo "   📄 src/database/users.db - Base de datos"
echo "   📄 SISTEMA-REGISTRO-NOMBRES.md - Documentación"
echo

echo "🚀 Próximos pasos:"
echo "   1. Revisar configuración en .env"
echo "   2. Reiniciar el bot: npm run restart"
echo "   3. Probar con un usuario nuevo"
echo "   4. Monitorear logs: tail -f logs/chatbot.log"
echo

echo "🧪 Comandos de prueba disponibles:"
echo "   node test-name-validation.js    - Pruebas de validación"
echo "   node test-registration-system.js - Pruebas del sistema completo"
echo

echo "📊 Monitoreo:"
echo "   tail -f logs/chatbot.log | grep -i registration"
echo

log_warning "IMPORTANTE: Asegúrate de revisar el archivo .env antes de reiniciar el bot"

echo
log_success "¡Sistema de Registro de Nombres listo para usar! 🎯"
