#!/bin/bash

# Script para configurar la seguridad del servidor
# Solo permite SSH y bloquea acceso externo a puertos de aplicación

echo "🔒 Configurando seguridad del servidor..."

# Detectar distribución
if command -v pacman &> /dev/null; then
    DISTRO="arch"
    echo "🐧 Detectado: Manjaro/Arch Linux"
elif command -v apt &> /dev/null; then
    DISTRO="debian"
    echo "🐧 Detectado: Debian/Ubuntu"
else
    echo "❌ Distribución no soportada"
    exit 1
fi

# Actualizar sistema según la distribución
echo "📦 Actualizando sistema..."
if [ "$DISTRO" = "arch" ]; then
    sudo pacman -Syu --noconfirm
elif [ "$DISTRO" = "debian" ]; then
    sudo apt update && sudo apt upgrade -y
fi

# Instalar ufw si no está instalado
if ! command -v ufw &> /dev/null; then
    echo "🛡️  Instalando UFW (Uncomplicated Firewall)..."
    if [ "$DISTRO" = "arch" ]; then
        sudo pacman -S --noconfirm ufw
    elif [ "$DISTRO" = "debian" ]; then
        sudo apt install -y ufw
    fi
fi

# Configurar UFW
echo "🔧 Configurando firewall..."

# Denegar todo por defecto
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (puerto 22)
sudo ufw allow 22/tcp comment 'SSH access'

# Permitir SSH alternativo si existe
if ss -tlnp | grep -q ':2222'; then
    sudo ufw allow 2222/tcp comment 'SSH alternate port'
fi

# Bloquear explícitamente puertos de aplicación desde exterior
sudo ufw deny 3000/tcp comment 'Block WhatsApp Chatbot'
sudo ufw deny 8080/tcp comment 'Block WhatsApp Bridge'

# Permitir loopback (importante para aplicaciones locales)
sudo ufw allow in on lo
sudo ufw allow out on lo

# Activar firewall
sudo ufw --force enable

# Mostrar estado
echo "🔍 Estado del firewall:"
sudo ufw status verbose

echo ""
echo "✅ Configuración de seguridad completada!"
echo "📍 Puertos bloqueados desde exterior:"
echo "   - 3000 (WhatsApp Chatbot)"
echo "   - 8080 (WhatsApp Bridge)"
echo "📍 Puertos permitidos:"
echo "   - 22 (SSH)"
echo "   - Loopback (127.0.0.1)"
echo ""
echo "⚠️  IMPORTANTE: Las aplicaciones solo serán accesibles desde:"
echo "   - http://127.0.0.1:3000 (Chatbot)"
echo "   - http://127.0.0.1:8080 (Bridge)"
