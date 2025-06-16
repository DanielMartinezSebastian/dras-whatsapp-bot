#!/bin/bash

# Script de instalación de dependencias para el ecosistema DrasBot
# Detecta la distribución y instala las dependencias necesarias
# Uso: ./install-deps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_DIR="$SCRIPT_DIR/whatsapp-bridge"
CHATBOT_DIR="$SCRIPT_DIR/whatsapp-chatbot"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║       📦 INSTALADOR DE DEPENDENCIAS     ║"
    echo "║           Ecosistema DrasBot             ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Detectar distribución
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        VERSION=$(lsb_release -sr)
    else
        DISTRO=$(uname -s | tr '[:upper:]' '[:lower:]')
        VERSION=""
    fi
    
    # Normalizar nombres
    case "$DISTRO" in
        "manjaro"|"archlinux"|"arch")
            DISTRO="arch"
            ;;
        "ubuntu"|"debian"|"linuxmint"|"elementary")
            DISTRO="debian"
            ;;
        "fedora"|"centos"|"rhel"|"rocky"|"almalinux")
            DISTRO="fedora"
            ;;
    esac
    
    echo -e "${BLUE}🐧 Sistema detectado: $DISTRO${NC}"
    if [ ! -z "$VERSION" ]; then
        echo -e "${BLUE}📋 Versión: $VERSION${NC}"
    fi
    echo ""
}

# Instalar dependencias según la distribución
install_system_deps() {
    echo -e "${BLUE}📦 Instalando dependencias del sistema...${NC}"
    
    case "$DISTRO" in
        "arch")
            echo -e "${BLUE}🔧 Actualizando repositorios...${NC}"
            sudo pacman -Sy
            
            echo -e "${BLUE}📦 Instalando paquetes base...${NC}"
            sudo pacman -S --needed --noconfirm \
                nodejs npm go git curl wget \
                tmux jq lsof netstat-nat \
                base-devel sqlite
            
            # FFmpeg (opcional para audio)
            if ! command -v ffmpeg &> /dev/null; then
                echo -e "${YELLOW}🎵 ¿Instalar FFmpeg para soporte de audio? (y/N)${NC}"
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    sudo pacman -S --needed --noconfirm ffmpeg
                fi
            fi
            ;;
        "debian")
            echo -e "${BLUE}🔧 Actualizando repositorios...${NC}"
            sudo apt update
            
            echo -e "${BLUE}📦 Instalando paquetes base...${NC}"
            sudo apt install -y \
                nodejs npm golang-go git curl wget \
                tmux jq lsof net-tools \
                build-essential sqlite3 libsqlite3-dev
            
            # FFmpeg (opcional para audio)
            if ! command -v ffmpeg &> /dev/null; then
                echo -e "${YELLOW}🎵 ¿Instalar FFmpeg para soporte de audio? (y/N)${NC}"
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    sudo apt install -y ffmpeg
                fi
            fi
            ;;
        "fedora")
            echo -e "${BLUE}🔧 Actualizando repositorios...${NC}"
            sudo dnf check-update || true
            
            echo -e "${BLUE}📦 Instalando paquetes base...${NC}"
            sudo dnf install -y \
                nodejs npm golang git curl wget \
                tmux jq lsof net-tools \
                gcc gcc-c++ make sqlite sqlite-devel
            
            # FFmpeg (opcional para audio)
            if ! command -v ffmpeg &> /dev/null; then
                echo -e "${YELLOW}🎵 ¿Instalar FFmpeg para soporte de audio? (y/N)${NC}"
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    sudo dnf install -y ffmpeg
                fi
            fi
            ;;
        *)
            echo -e "${YELLOW}⚠️  Distribución no reconocida: $DISTRO${NC}"
            echo -e "${YELLOW}Por favor instala manualmente:${NC}"
            echo -e "${YELLOW}  - Node.js y npm${NC}"
            echo -e "${YELLOW}  - Go${NC}"
            echo -e "${YELLOW}  - git, curl, wget${NC}"
            echo -e "${YELLOW}  - tmux, jq, lsof${NC}"
            echo -e "${YELLOW}  - SQLite y herramientas de desarrollo${NC}"
            return 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Dependencias del sistema instaladas${NC}"
    echo ""
}

# Verificar versiones de Node.js y Go
check_versions() {
    echo -e "${BLUE}🔍 Verificando versiones...${NC}"
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version | cut -d'v' -f2)
        local node_major=$(echo $node_version | cut -d'.' -f1)
        
        echo -e "${GREEN}✅ Node.js: v$node_version${NC}"
        
        if [ "$node_major" -lt 16 ]; then
            echo -e "${YELLOW}⚠️  Se recomienda Node.js 16 o superior${NC}"
        fi
    else
        echo -e "${RED}❌ Node.js no encontrado${NC}"
    fi
    
    # Verificar Go
    if command -v go &> /dev/null; then
        local go_version=$(go version | cut -d' ' -f3 | cut -d'o' -f2)
        echo -e "${GREEN}✅ Go: $go_version${NC}"
        
        # Verificar que Go tenga CGO habilitado
        local cgo_enabled=$(go env CGO_ENABLED)
        if [ "$cgo_enabled" = "1" ]; then
            echo -e "${GREEN}✅ CGO habilitado${NC}"
        else
            echo -e "${YELLOW}⚠️  CGO deshabilitado (necesario para SQLite)${NC}"
            echo -e "${CYAN}💡 Ejecutando: go env -w CGO_ENABLED=1${NC}"
            go env -w CGO_ENABLED=1
        fi
    else
        echo -e "${RED}❌ Go no encontrado${NC}"
    fi
    
    echo ""
}

# Instalar PM2 globalmente
install_pm2() {
    echo -e "${BLUE}📦 Instalando PM2...${NC}"
    
    if command -v pm2 &> /dev/null; then
        echo -e "${GREEN}✅ PM2 ya está instalado: $(pm2 --version)${NC}"
    else
        npm install -g pm2
        if command -v pm2 &> /dev/null; then
            echo -e "${GREEN}✅ PM2 instalado: $(pm2 --version)${NC}"
        else
            echo -e "${RED}❌ Error instalando PM2${NC}"
            return 1
        fi
    fi
    echo ""
}

# Instalar dependencias de Node.js para el chatbot
install_node_deps() {
    echo -e "${BLUE}📦 Instalando dependencias del chatbot...${NC}"
    
    if [ ! -d "$CHATBOT_DIR" ]; then
        echo -e "${RED}❌ Directorio del chatbot no encontrado: $CHATBOT_DIR${NC}"
        return 1
    fi
    
    cd "$CHATBOT_DIR"
    
    if [ -f "package.json" ]; then
        npm install
        echo -e "${GREEN}✅ Dependencias del chatbot instaladas${NC}"
    else
        echo -e "${YELLOW}⚠️  package.json no encontrado en $CHATBOT_DIR${NC}"
    fi
    echo ""
}

# Verificar y preparar dependencias de Go para el bridge
setup_go_deps() {
    echo -e "${BLUE}📦 Configurando dependencias del bridge...${NC}"
    
    if [ ! -d "$BRIDGE_DIR" ]; then
        echo -e "${RED}❌ Directorio del bridge no encontrado: $BRIDGE_DIR${NC}"
        return 1
    fi
    
    cd "$BRIDGE_DIR"
    
    if [ -f "go.mod" ]; then
        echo -e "${BLUE}🔧 Ejecutando go mod tidy...${NC}"
        go mod tidy
        
        echo -e "${BLUE}🔧 Descargando dependencias...${NC}"
        go mod download
        
        echo -e "${GREEN}✅ Dependencias del bridge configuradas${NC}"
    else
        echo -e "${YELLOW}⚠️  go.mod no encontrado en $BRIDGE_DIR${NC}"
    fi
    echo ""
}

# Crear directorios necesarios
create_directories() {
    echo -e "${BLUE}📁 Creando directorios necesarios...${NC}"
    
    # Directorios del chatbot
    mkdir -p "$CHATBOT_DIR/logs"
    mkdir -p "$CHATBOT_DIR/exports"
    
    # Directorios del bridge
    mkdir -p "$BRIDGE_DIR/store"
    
    echo -e "${GREEN}✅ Directorios creados${NC}"
    echo ""
}

# Mostrar resumen final
show_summary() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}📋 RESUMEN DE INSTALACIÓN${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Verificar instalaciones
    echo -e "${CYAN}🔍 Verificación final:${NC}"
    
    if command -v node &> /dev/null; then
        echo -e "   ${GREEN}✅ Node.js: $(node --version)${NC}"
    else
        echo -e "   ${RED}❌ Node.js: No instalado${NC}"
    fi
    
    if command -v npm &> /dev/null; then
        echo -e "   ${GREEN}✅ npm: v$(npm --version)${NC}"
    else
        echo -e "   ${RED}❌ npm: No instalado${NC}"
    fi
    
    if command -v go &> /dev/null; then
        echo -e "   ${GREEN}✅ Go: $(go version | cut -d' ' -f3)${NC}"
    else
        echo -e "   ${RED}❌ Go: No instalado${NC}"
    fi
    
    if command -v pm2 &> /dev/null; then
        echo -e "   ${GREEN}✅ PM2: v$(pm2 --version)${NC}"
    else
        echo -e "   ${RED}❌ PM2: No instalado${NC}"
    fi
    
    if command -v tmux &> /dev/null; then
        echo -e "   ${GREEN}✅ tmux: $(tmux -V)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  tmux: No instalado (recomendado)${NC}"
    fi
    
    if command -v jq &> /dev/null; then
        echo -e "   ${GREEN}✅ jq: $(jq --version)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  jq: No instalado (recomendado)${NC}"
    fi
    
    if command -v ffmpeg &> /dev/null; then
        echo -e "   ${GREEN}✅ FFmpeg: $(ffmpeg -version | head -1 | cut -d' ' -f3)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  FFmpeg: No instalado (opcional para audio)${NC}"
    fi
    
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ¡Instalación completada!${NC}"
    echo ""
    echo -e "${CYAN}📋 Próximos pasos:${NC}"
    echo -e "   1. ${YELLOW}./manage.sh setup${NC}      # Configuración inicial completa"
    echo -e "   2. ${YELLOW}./manage.sh start${NC}      # Iniciar el ecosistema"
    echo -e "   3. ${YELLOW}./manage.sh status${NC}     # Verificar estado"
    echo -e "   4. ${YELLOW}./monitor.sh${NC}           # Monitor en tiempo real"
    echo ""
}

# Función principal
main() {
    show_banner
    
    echo -e "${BLUE}🚀 Iniciando instalación de dependencias...${NC}"
    echo ""
    
    # Detectar distribución
    detect_distro
    
    # Instalar dependencias del sistema
    install_system_deps
    
    # Verificar versiones
    check_versions
    
    # Instalar PM2
    install_pm2
    
    # Instalar dependencias de Node.js
    install_node_deps
    
    # Configurar dependencias de Go
    setup_go_deps
    
    # Crear directorios
    create_directories
    
    # Mostrar resumen
    show_summary
}

# Ejecutar función principal
main "$@"
