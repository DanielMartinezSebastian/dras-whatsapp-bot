#!/bin/bash

# Script para instalar dependencias según la distribución
# Soporta: Manjaro/Arch y Debian/Ubuntu

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detectar distribución
detect_distro() {
    if command -v pacman &> /dev/null; then
        echo "arch"
    elif command -v apt &> /dev/null; then
        echo "debian"
    else
        echo "unknown"
    fi
}

# Instalar Node.js
install_nodejs() {
    local distro=$1
    
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✅ Node.js ya está instalado: $(node --version)${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📦 Instalando Node.js...${NC}"
    
    case $distro in
        "arch")
            sudo pacman -S --noconfirm nodejs npm
            ;;
        "debian")
            # Instalar NodeSource repository para obtener una versión más reciente
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        *)
            echo -e "${RED}❌ No se puede instalar Node.js automáticamente en esta distribución${NC}"
            echo -e "${YELLOW}💡 Instala Node.js manualmente desde https://nodejs.org/${NC}"
            return 1
            ;;
    esac
    
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✅ Node.js instalado: $(node --version)${NC}"
    else
        echo -e "${RED}❌ Error instalando Node.js${NC}"
        return 1
    fi
}

# Instalar Go
install_go() {
    local distro=$1
    
    if command -v go &> /dev/null; then
        echo -e "${GREEN}✅ Go ya está instalado: $(go version | cut -d' ' -f3)${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📦 Instalando Go...${NC}"
    
    case $distro in
        "arch")
            sudo pacman -S --noconfirm go
            ;;
        "debian")
            # En Debian 11, Go puede estar desactualizado, así que instalamos desde el sitio oficial
            GO_VERSION="1.21.5"
            wget -q "https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz"
            sudo rm -rf /usr/local/go
            sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"
            rm "go${GO_VERSION}.linux-amd64.tar.gz"
            
            # Añadir Go al PATH si no está
            if ! grep -q "/usr/local/go/bin" ~/.bashrc; then
                echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
            fi
            if ! grep -q "/usr/local/go/bin" ~/.zshrc 2>/dev/null; then
                echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc 2>/dev/null || true
            fi
            
            export PATH=$PATH:/usr/local/go/bin
            ;;
        *)
            echo -e "${RED}❌ No se puede instalar Go automáticamente en esta distribución${NC}"
            echo -e "${YELLOW}💡 Instala Go manualmente desde https://golang.org/dl/${NC}"
            return 1
            ;;
    esac
    
    # Verificar instalación
    export PATH=$PATH:/usr/local/go/bin
    if command -v go &> /dev/null; then
        echo -e "${GREEN}✅ Go instalado: $(go version | cut -d' ' -f3)${NC}"
    else
        echo -e "${RED}❌ Error instalando Go${NC}"
        return 1
    fi
}

# Instalar herramientas del sistema
install_system_tools() {
    local distro=$1
    
    echo -e "${BLUE}📦 Instalando herramientas del sistema...${NC}"
    
    case $distro in
        "arch")
            sudo pacman -S --noconfirm curl wget git tmux htop
            ;;
        "debian")
            sudo apt update
            sudo apt install -y curl wget git tmux htop build-essential
            ;;
        *)
            echo -e "${YELLOW}⚠️  Instala manualmente: curl, wget, git, tmux, htop${NC}"
            ;;
    esac
}

# Función principal
main() {
    echo -e "${BLUE}🚀 Instalador de Dependencias - WhatsApp Chatbot${NC}"
    echo "=================================================="
    
    # Detectar distribución
    DISTRO=$(detect_distro)
    
    case $DISTRO in
        "arch")
            echo -e "${GREEN}🐧 Detectado: Manjaro/Arch Linux${NC}"
            ;;
        "debian")
            echo -e "${GREEN}🐧 Detectado: Debian/Ubuntu${NC}"
            ;;
        "unknown")
            echo -e "${RED}❌ Distribución no soportada${NC}"
            echo -e "${YELLOW}💡 Este script soporta: Manjaro/Arch y Debian/Ubuntu${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    
    # Instalar herramientas del sistema
    install_system_tools "$DISTRO"
    
    # Instalar Node.js
    install_nodejs "$DISTRO"
    
    # Instalar Go
    install_go "$DISTRO"
    
    # Instalar PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${BLUE}📦 Instalando PM2...${NC}"
        npm install -g pm2
        echo -e "${GREEN}✅ PM2 instalado: $(pm2 --version)${NC}"
    else
        echo -e "${GREEN}✅ PM2 ya está instalado: $(pm2 --version)${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 ¡Instalación completada!${NC}"
    echo ""
    echo -e "${BLUE}📋 Resumen de versiones instaladas:${NC}"
    echo "   • Node.js: $(node --version 2>/dev/null || echo 'No instalado')"
    echo "   • npm: $(npm --version 2>/dev/null || echo 'No instalado')"
    echo "   • Go: $(go version 2>/dev/null | cut -d' ' -f3 || echo 'No instalado')"
    echo "   • PM2: $(pm2 --version 2>/dev/null || echo 'No instalado')"
    echo ""
    
    if [ "$DISTRO" = "debian" ] && command -v go &> /dev/null; then
        echo -e "${YELLOW}💡 IMPORTANTE para Debian:${NC}"
        echo "   Recarga tu terminal o ejecuta: source ~/.bashrc"
        echo "   Para que Go esté disponible en tu PATH"
        echo ""
    fi
    
    echo -e "${BLUE}🚀 Siguiente paso:${NC}"
    echo "   cd whatsapp-chatbot && ./scripts/manage.sh setup"
}

# Ejecutar si se llama directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
