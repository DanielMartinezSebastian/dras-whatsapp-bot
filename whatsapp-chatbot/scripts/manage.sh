#!/bin/bash

# Script maestro para gestionar el sistema de chatbot WhatsApp
# NOTA: Este script es ahora un wrapper del sistema centralizado
# Uso: ./manage.sh [comando]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BRIDGE_DIR="$PROJECT_DIR/whatsapp-bridge"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  Este script ha sido migrado al sistema centralizado${NC}"
echo -e "${BLUE}💡 Usa el script principal: $PROJECT_DIR/manage.sh${NC}"
echo ""

# Redirigir al script principal
if [ -f "$PROJECT_DIR/manage.sh" ]; then
    echo -e "${GREEN}🔄 Redirigiendo al sistema centralizado...${NC}"
    exec "$PROJECT_DIR/manage.sh" "$@"
else
    echo -e "${RED}❌ Script centralizado no encontrado en $PROJECT_DIR/manage.sh${NC}"
    echo -e "${YELLOW}Por favor ejecuta desde la raíz del proyecto${NC}"
    exit 1
fi

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}🤖 WhatsApp Chatbot Manager${NC}"
    echo "================================"
    echo ""
    echo "Comandos disponibles:"
    echo ""
    echo -e "${GREEN}setup${NC}           - Configuración inicial completa"
    echo -e "${GREEN}deps${NC}            - Instalar solo dependencias del sistema"
    echo -e "${GREEN}security${NC}        - Configurar seguridad del servidor"
    echo -e "${GREEN}start${NC}           - Iniciar todos los servicios"
    echo -e "${GREEN}stop${NC}            - Detener todos los servicios"
    echo -e "${GREEN}restart${NC}         - Reiniciar todos los servicios"
    echo -e "${GREEN}status${NC}          - Ver estado de servicios"
    echo -e "${GREEN}logs${NC}            - Ver logs en tiempo real"
    echo -e "${GREEN}monitor${NC}         - Monitor de seguridad"
    echo -e "${GREEN}bridge-start${NC}    - Iniciar solo el bridge"
    echo -e "${GREEN}bridge-stop${NC}     - Detener solo el bridge"
    echo -e "${GREEN}chatbot-start${NC}   - Iniciar solo el chatbot"
    echo -e "${GREEN}chatbot-stop${NC}    - Detener solo el chatbot"
    echo -e "${GREEN}install${NC}         - Instalar dependencias"
    echo ""
    echo "Ejemplo: ./manage.sh start"
}

# Función para verificar dependencias
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
    
    local missing=0
    
    # Detectar distribución
    if command -v pacman &> /dev/null; then
        DISTRO="arch"
        echo -e "${BLUE}🐧 Sistema: Manjaro/Arch Linux${NC}"
    elif command -v apt &> /dev/null; then
        DISTRO="debian" 
        echo -e "${BLUE}🐧 Sistema: Debian/Ubuntu${NC}"
    else
        echo -e "${RED}❌ Distribución no soportada${NC}"
        missing=1
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no está instalado${NC}"
        missing=1
    else
        echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
    fi
    
    # Verificar Go
    if ! command -v go &> /dev/null; then
        echo -e "${RED}❌ Go no está instalado${NC}"
        missing=1
    else
        echo -e "${GREEN}✅ Go $(go version | cut -d' ' -f3)${NC}"
    fi
    
    # Verificar PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}⚠️  PM2 no está instalado (se instalará automáticamente)${NC}"
    else
        echo -e "${GREEN}✅ PM2 $(pm2 --version)${NC}"
    fi
    
    return $missing
}

# Función para instalar dependencias
install_dependencies() {
    echo -e "${BLUE}📦 Instalando dependencias...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Instalar dependencias de Node.js
    if [ -f "package.json" ]; then
        echo -e "${BLUE}📦 Instalando dependencias de Node.js...${NC}"
        npm install
    fi
    
    # Instalar PM2 globalmente
    if ! command -v pm2 &> /dev/null; then
        echo -e "${BLUE}📦 Instalando PM2...${NC}"
        npm install -g pm2
    fi
    
    # Verificar dependencias de Go en el bridge
    if [ -d "$BRIDGE_DIR" ]; then
        echo -e "${BLUE}📦 Verificando dependencias de Go...${NC}"
        cd "$BRIDGE_DIR"
        go mod tidy
    fi
    
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
}

# Función para configurar seguridad
setup_security() {
    echo -e "${BLUE}🔒 Configurando seguridad...${NC}"
    
    # Configurar firewall del sistema
    if [ -f "$SCRIPT_DIR/setup-security.sh" ]; then
        "$SCRIPT_DIR/setup-security.sh"
    fi
    
    # Configurar bridge seguro
    if [ -f "$SCRIPT_DIR/secure-bridge.sh" ]; then
        "$SCRIPT_DIR/secure-bridge.sh"
    fi
    
    echo -e "${GREEN}✅ Seguridad configurada${NC}"
}

# Función para iniciar el bridge
start_bridge() {
    echo -e "${BLUE}🌉 Iniciando WhatsApp Bridge...${NC}"
    
    if [ ! -d "$BRIDGE_DIR" ]; then
        echo -e "${RED}❌ Directorio del bridge no encontrado: $BRIDGE_DIR${NC}"
        return 1
    fi
    
    cd "$BRIDGE_DIR"
    
    # Verificar si ya está corriendo
    if pgrep -f "go.*main.go" > /dev/null; then
        echo -e "${YELLOW}⚠️  Bridge ya está ejecutándose${NC}"
        return 0
    fi
    
    # Iniciar en background con tmux
    if command -v tmux &> /dev/null; then
        tmux new-session -d -s whatsapp-bridge "cd $BRIDGE_DIR && go run main.go"
        echo -e "${GREEN}✅ Bridge iniciado en sesión tmux 'whatsapp-bridge'${NC}"
        echo -e "${BLUE}💡 Para ver logs: tmux attach -t whatsapp-bridge${NC}"
    else
        nohup go run main.go > ../whatsapp-chatbot/logs/bridge.log 2>&1 &
        echo -e "${GREEN}✅ Bridge iniciado en background${NC}"
        echo -e "${BLUE}💡 Logs en: ../whatsapp-chatbot/logs/bridge.log${NC}"
    fi
}

# Función para detener el bridge
stop_bridge() {
    echo -e "${BLUE}🛑 Deteniendo WhatsApp Bridge...${NC}"
    
    # Detener proceso Go
    pkill -f "go.*main.go" || true
    
    # Detener sesión tmux si existe
    if command -v tmux &> /dev/null; then
        tmux kill-session -t whatsapp-bridge 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Bridge detenido${NC}"
}

# Función para iniciar el chatbot
start_chatbot() {
    echo -e "${BLUE}🤖 Iniciando WhatsApp Chatbot...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Verificar dependencias
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
        npm install
    fi
    
    # Crear directorio de logs
    mkdir -p logs
    
    # Iniciar con PM2
    pm2 start config/ecosystem.config.js --env production
    
    echo -e "${GREEN}✅ Chatbot iniciado${NC}"
}

# Función para detener el chatbot
stop_chatbot() {
    echo -e "${BLUE}🛑 Deteniendo WhatsApp Chatbot...${NC}"
    
    pm2 delete whatsapp-chatbot 2>/dev/null || true
    
    echo -e "${GREEN}✅ Chatbot detenido${NC}"
}

# Función para ver estado
show_status() {
    echo -e "${BLUE}📊 Estado de Servicios${NC}"
    echo "===================="
    echo ""
    
    # Estado del bridge
    if pgrep -f "go.*main.go" > /dev/null; then
        echo -e "${GREEN}✅ WhatsApp Bridge: EJECUTÁNDOSE${NC}"
    else
        echo -e "${RED}❌ WhatsApp Bridge: DETENIDO${NC}"
    fi
    
    # Estado del chatbot
    if command -v pm2 &> /dev/null; then
        if pm2 jlist 2>/dev/null | grep -q "whatsapp-chatbot"; then
            echo -e "${GREEN}✅ WhatsApp Chatbot: EJECUTÁNDOSE${NC}"
            echo ""
            pm2 status
        else
            echo -e "${RED}❌ WhatsApp Chatbot: DETENIDO${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  PM2 no instalado${NC}"
    fi
    
    echo ""
    # Mostrar estado de seguridad
    if [ -f "$SCRIPT_DIR/security-monitor.sh" ]; then
        "$SCRIPT_DIR/security-monitor.sh"
    fi
}

# Función para ver logs
show_logs() {
    echo -e "${BLUE}📝 Logs en Tiempo Real${NC}"
    echo "====================="
    echo ""
    echo -e "${YELLOW}Presiona Ctrl+C para salir${NC}"
    echo ""
    
    if command -v pm2 &> /dev/null && pm2 jlist 2>/dev/null | grep -q "whatsapp-chatbot"; then
        pm2 logs whatsapp-chatbot --lines 50
    else
        echo -e "${RED}❌ Chatbot no está ejecutándose${NC}"
        echo -e "${BLUE}💡 Inicia el chatbot con: ./manage.sh start${NC}"
    fi
}

# Función principal
main() {
    case "${1:-help}" in
        "setup")
            echo -e "${BLUE}🚀 Configuración inicial completa${NC}"
            echo "=================================="
            
            # Verificar e instalar dependencias
            if ! check_dependencies; then
                echo -e "${YELLOW}📦 Instalando dependencias faltantes...${NC}"
                if [ -f "$SCRIPT_DIR/install-deps.sh" ]; then
                    "$SCRIPT_DIR/install-deps.sh"
                else
                    install_dependencies
                fi
            fi
            
            # Instalar dependencias del proyecto
            install_dependencies
            
            # Configurar seguridad
            setup_security
            
            echo -e "${GREEN}🎉 Configuración inicial completa${NC}"
            echo ""
            echo -e "${BLUE}📋 Próximos pasos:${NC}"
            echo "   1. ./scripts/manage.sh start    # Iniciar servicios"
            echo "   2. ./scripts/manage.sh status   # Ver estado"
            echo "   3. ./scripts/manage.sh logs     # Ver logs"
            ;;
        "deps"|"dependencies")
            if [ -f "$SCRIPT_DIR/install-deps.sh" ]; then
                "$SCRIPT_DIR/install-deps.sh"
            else
                install_dependencies
            fi
            ;;
        "security")
            setup_security
            ;;
        "install")
            install_dependencies
            ;;
        "start")
            start_bridge
            sleep 3
            start_chatbot
            show_status
            ;;
        "stop")
            stop_chatbot
            stop_bridge
            ;;
        "restart")
            stop_chatbot
            stop_bridge
            sleep 2
            start_bridge
            sleep 3
            start_chatbot
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "monitor")
            if [ -f "$SCRIPT_DIR/security-monitor.sh" ]; then
                "$SCRIPT_DIR/security-monitor.sh"
            else
                echo -e "${RED}❌ Script de monitoreo no encontrado${NC}"
            fi
            ;;
        "bridge-start")
            start_bridge
            ;;
        "bridge-stop")
            stop_bridge
            ;;
        "chatbot-start")
            start_chatbot
            ;;
        "chatbot-stop")
            stop_chatbot
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"
