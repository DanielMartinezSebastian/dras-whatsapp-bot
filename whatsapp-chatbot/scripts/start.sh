#!/bin/bash

# Script para iniciar el chatbot de WhatsApp de forma segura
echo "🤖 Iniciando WhatsApp Chatbot..."

# Verificar que estamos en el directorio correcto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Verificar que PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 no está instalado. Instalando..."
    npm install -g pm2
fi

# Verificar que las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Detener procesos previos si existen
echo "🛑 Deteniendo procesos previos..."
pm2 delete whatsapp-chatbot 2>/dev/null || true

# Verificar seguridad del firewall
echo "🔒 Verificando configuración de seguridad..."
if command -v ufw &> /dev/null; then
    ufw_status=$(sudo ufw status | grep "Status: active")
    if [ -z "$ufw_status" ]; then
        echo "⚠️  ADVERTENCIA: Firewall no está activo. ¿Ejecutar configuración de seguridad? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            ./scripts/setup-security.sh
        fi
    fi
fi

# Iniciar la aplicación usando el archivo de configuración de PM2
echo "🚀 Iniciando aplicación..."
pm2 start config/ecosystem.config.js --env production

# Mostrar estado
echo "📊 Estado de los procesos:"
pm2 status

# Mostrar logs
echo "📝 Logs en tiempo real (Ctrl+C para salir):"
echo "   - Logs combinados: ./logs/combined.log"
echo "   - Logs de salida: ./logs/out.log"
echo "   - Logs de error: ./logs/error.log"
echo ""
echo "🌐 Aplicación disponible en:"
echo "   - http://127.0.0.1:3000 (SOLO LOCAL)"
echo ""
echo "📋 Comandos útiles:"
echo "   - pm2 status        # Ver estado"
echo "   - pm2 logs          # Ver logs en tiempo real"
echo "   - pm2 restart all   # Reiniciar"
echo "   - pm2 stop all      # Detener"
echo ""

# Mostrar logs en tiempo real
pm2 logs whatsapp-chatbot --lines 20