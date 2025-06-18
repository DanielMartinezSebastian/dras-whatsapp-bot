#!/bin/bash

# Script maestro para gestionar el ecosistema completo de DrasBot WhatsApp
# Gestiona tanto el whatsapp-bridge como el whatsapp-chatbot
# Uso: ./manage.sh [comando]

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

# Banner del sistema
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║          🤖 DrasBot WhatsApp             ║"
    echo "║     Sistema de Gestión Unificado        ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    show_banner
    echo ""
    echo "Comandos disponibles:"
    echo ""
    echo -e "${GREEN}📦 GESTIÓN GENERAL${NC}"
    echo -e "  ${CYAN}setup${NC}           - Configuración inicial completa del ecosistema"
    echo -e "  ${CYAN}deps${NC}            - Instalar dependencias del sistema"
    echo -e "  ${CYAN}security${NC}        - Configurar seguridad de ambos servicios"
    echo -e "  ${CYAN}status${NC}          - Ver estado completo del ecosistema"
    echo ""
    echo -e "${GREEN}🚀 CONTROL DE SERVICIOS${NC}"
    echo -e "  ${CYAN}start${NC}           - Iniciar todo el ecosistema (bridge + chatbot)"
    echo -e "  ${CYAN}stop${NC}            - Detener todo el ecosistema"
    echo -e "  ${CYAN}restart${NC}         - Reiniciar todo el ecosistema"
    echo -e "  ${CYAN}clean-start${NC}     - Detener todo, limpiar procesos y reiniciar"
    echo ""
    echo -e "${GREEN}🌉 BRIDGE (WhatsApp Connection)${NC}"
    echo -e "  ${CYAN}bridge-start${NC}    - Iniciar solo el bridge"
    echo -e "  ${CYAN}bridge-stop${NC}     - Detener solo el bridge"
    echo -e "  ${CYAN}bridge-status${NC}   - Estado del bridge"
    echo -e "  ${CYAN}bridge-logs${NC}     - Logs del bridge"
    echo ""
    echo -e "${GREEN}🤖 CHATBOT (Bot Logic)${NC}"
    echo -e "  ${CYAN}chatbot-start${NC}   - Iniciar solo el chatbot"
    echo -e "  ${CYAN}chatbot-stop${NC}    - Detener solo el chatbot"
    echo -e "  ${CYAN}chatbot-status${NC}  - Estado del chatbot"
    echo -e "  ${CYAN}chatbot-logs${NC}    - Logs del chatbot"
    echo ""
    echo -e "${GREEN}📊 MONITOREO${NC}"
    echo -e "  ${CYAN}logs${NC}            - Ver logs combinados en tiempo real"
    echo -e "  ${CYAN}monitor${NC}         - Monitor completo del sistema"
    echo -e "  ${CYAN}health${NC}          - Chequeo de salud del ecosistema"
    echo ""
    echo -e "${GREEN}🛠️  MANTENIMIENTO${NC}"
    echo -e "  ${CYAN}clean${NC}           - Limpiar procesos colgados y archivos temporales"
    echo -e "  ${CYAN}reset${NC}           - Reset completo (detener todo y limpiar)"
    echo ""
    echo "Ejemplo: ${CYAN}./manage.sh start${NC}"
}

# Función para verificar dependencias
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependencias del ecosistema...${NC}"
    
    local missing=0
    
    # Verificar directorios principales
    if [ ! -d "$BRIDGE_DIR" ]; then
        echo -e "${RED}❌ Directorio whatsapp-bridge no encontrado${NC}"
        missing=1
    else
        echo -e "${GREEN}✅ whatsapp-bridge encontrado${NC}"
    fi
    
    if [ ! -d "$CHATBOT_DIR" ]; then
        echo -e "${RED}❌ Directorio whatsapp-chatbot no encontrado${NC}"
        missing=1
    else
        echo -e "${GREEN}✅ whatsapp-chatbot encontrado${NC}"
    fi
    
    # Verificar Go
    if ! command -v go &> /dev/null; then
        echo -e "${RED}❌ Go no está instalado${NC}"
        missing=1
    else
        echo -e "${GREEN}✅ Go $(go version | cut -d' ' -f3)${NC}"
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no está instalado${NC}"
        missing=1
    else
        echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
    fi
    
    # Verificar PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}⚠️  PM2 no está instalado (se instalará automáticamente)${NC}"
    else
        echo -e "${GREEN}✅ PM2 $(pm2 --version)${NC}"
    fi
    
    # Verificar tmux (opcional pero recomendado)
    if ! command -v tmux &> /dev/null; then
        echo -e "${YELLOW}⚠️  tmux no está instalado (recomendado para el bridge)${NC}"
    else
        echo -e "${GREEN}✅ tmux $(tmux -V)${NC}"
    fi
    
    return $missing
}

# Función para limpiar procesos colgados
clean_hanging_processes() {
    echo -e "${BLUE}🧹 Limpiando procesos colgados...${NC}"
    
    # Matar procesos del bridge
    pkill -f "go.*main.go" 2>/dev/null || true
    
    # Detener sesiones tmux del bridge
    if command -v tmux &> /dev/null; then
        tmux kill-session -t whatsapp-bridge 2>/dev/null || true
        tmux kill-session -t drasbot-bridge 2>/dev/null || true
    fi
    
    # Detener PM2 del chatbot
    pm2 delete whatsapp-chatbot 2>/dev/null || true
    pm2 delete drasbot-chatbot 2>/dev/null || true
    
    # Limpiar puertos si están ocupados
    if command -v lsof &> /dev/null; then
        # Puerto 8080 (bridge)
        local bridge_pid=$(lsof -ti:8080 2>/dev/null || true)
        if [ ! -z "$bridge_pid" ]; then
            echo -e "${YELLOW}🔧 Liberando puerto 8080...${NC}"
            kill -9 $bridge_pid 2>/dev/null || true
        fi
        
        # Puerto 3000 (chatbot)
        local chatbot_pid=$(lsof -ti:3000 2>/dev/null || true)
        if [ ! -z "$chatbot_pid" ]; then
            echo -e "${YELLOW}🔧 Liberando puerto 3000...${NC}"
            kill -9 $chatbot_pid 2>/dev/null || true
        fi
    fi
    
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Función para verificar si el bridge está corriendo
is_bridge_running() {
    pgrep -f "go.*main.go" > /dev/null 2>&1
}

# Función para verificar si el chatbot está corriendo
is_chatbot_running() {
    pm2 jlist 2>/dev/null | grep -q "whatsapp-chatbot" || pm2 jlist 2>/dev/null | grep -q "drasbot-chatbot"
}

# Función para verificar puerto 8080
is_port_8080_open() {
    if command -v nc &> /dev/null; then
        nc -z 127.0.0.1 8080 2>/dev/null
    else
        # Fallback usando curl
        curl -s --connect-timeout 1 http://127.0.0.1:8080 >/dev/null 2>&1
    fi
}

# Función para iniciar el bridge
start_bridge() {
    echo -e "${BLUE}🌉 Iniciando WhatsApp Bridge...${NC}"
    
    if [ ! -d "$BRIDGE_DIR" ]; then
        echo -e "${RED}❌ Directorio del bridge no encontrado: $BRIDGE_DIR${NC}"
        return 1
    fi
    
    if is_bridge_running; then
        echo -e "${YELLOW}⚠️  Bridge ya está ejecutándose${NC}"
        return 0
    fi
    
    cd "$BRIDGE_DIR"
    
    # Verificar que main.go existe
    if [ ! -f "main.go" ]; then
        echo -e "${RED}❌ main.go no encontrado en $BRIDGE_DIR${NC}"
        return 1
    fi
    
    # Crear directorio de logs si no existe
    mkdir -p "$CHATBOT_DIR/logs"
    
    # Iniciar con tmux si está disponible, sino en background
    if command -v tmux &> /dev/null; then
        tmux new-session -d -s drasbot-bridge "cd $BRIDGE_DIR && go run main.go"
        echo -e "${GREEN}✅ Bridge iniciado en sesión tmux 'drasbot-bridge'${NC}"
        echo -e "${CYAN}💡 Para ver logs del bridge: tmux attach -t drasbot-bridge${NC}"
    else
        nohup go run main.go > "$CHATBOT_DIR/logs/bridge.log" 2>&1 &
        echo -e "${GREEN}✅ Bridge iniciado en background${NC}"
        echo -e "${CYAN}💡 Logs del bridge en: $CHATBOT_DIR/logs/bridge.log${NC}"
    fi
    
    # Esperar a que el bridge inicie completamente
    echo -e "${YELLOW}⏳ Esperando a que el bridge se conecte...${NC}"
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if is_port_8080_open; then
            echo -e "${GREEN}✅ Bridge conectado y API REST disponible en puerto 8080${NC}"
            return 0
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    echo -e "${YELLOW}⚠️  Bridge iniciado pero la API REST puede no estar lista${NC}"
    return 0
}

# Función para detener el bridge
stop_bridge() {
    echo -e "${BLUE}🛑 Deteniendo WhatsApp Bridge...${NC}"
    
    # Detener proceso Go
    pkill -f "go.*main.go" 2>/dev/null || true
    
    # Detener sesión tmux si existe
    if command -v tmux &> /dev/null; then
        tmux kill-session -t drasbot-bridge 2>/dev/null || true
        tmux kill-session -t whatsapp-bridge 2>/dev/null || true
    fi
    
    # Liberar puerto 8080 si está ocupado
    if command -v lsof &> /dev/null; then
        local pid=$(lsof -ti:8080 2>/dev/null || true)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
        fi
    fi
    
    echo -e "${GREEN}✅ Bridge detenido${NC}"
}

# Función para iniciar el chatbot
start_chatbot() {
    echo -e "${BLUE}🤖 Iniciando WhatsApp Chatbot...${NC}"
    
    if [ ! -d "$CHATBOT_DIR" ]; then
        echo -e "${RED}❌ Directorio del chatbot no encontrado: $CHATBOT_DIR${NC}"
        return 1
    fi
    
    if is_chatbot_running; then
        echo -e "${YELLOW}⚠️  Chatbot ya está ejecutándose${NC}"
        return 0
    fi
    
    cd "$CHATBOT_DIR"
    
    # Verificar dependencias
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependencias del chatbot...${NC}"
        npm install
    fi
    
    # Crear directorio de logs
    mkdir -p logs
    
    # Verificar que el bridge esté corriendo
    if ! is_port_8080_open; then
        echo -e "${RED}❌ El bridge no está disponible. Iniciando primero el bridge...${NC}"
        start_bridge
        sleep 3
    fi
    
    # Instalar PM2 si no está disponible
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}📦 Instalando PM2...${NC}"
        npm install -g pm2
    fi
    
    # Iniciar con PM2
    pm2 start config/ecosystem.config.js --env production --name drasbot-chatbot
    
    echo -e "${GREEN}✅ Chatbot iniciado${NC}"
}

# Función para detener el chatbot
stop_chatbot() {
    echo -e "${BLUE}🛑 Deteniendo WhatsApp Chatbot...${NC}"
    
    pm2 delete drasbot-chatbot 2>/dev/null || true
    pm2 delete whatsapp-chatbot 2>/dev/null || true
    
    echo -e "${GREEN}✅ Chatbot detenido${NC}"
}

# Función para mostrar estado completo
show_status() {
    show_banner
    echo -e "${BLUE}📊 Estado del Ecosistema DrasBot${NC}"
    echo "=========================================="
    echo ""
    
    # Estado del bridge
    echo -e "${PURPLE}🌉 WhatsApp Bridge:${NC}"
    if is_bridge_running; then
        echo -e "   ${GREEN}✅ EJECUTÁNDOSE${NC}"
        if is_port_8080_open; then
            echo -e "   ${GREEN}✅ API REST disponible (puerto 8080)${NC}"
        else
            echo -e "   ${YELLOW}⚠️  API REST no responde${NC}"
        fi
        
        # Mostrar información de la sesión tmux si existe
        if command -v tmux &> /dev/null && tmux has-session -t drasbot-bridge 2>/dev/null; then
            echo -e "   ${CYAN}📺 Sesión tmux: drasbot-bridge${NC}"
        fi
    else
        echo -e "   ${RED}❌ DETENIDO${NC}"
    fi
    echo ""
    
    # Estado del chatbot
    echo -e "${PURPLE}🤖 WhatsApp Chatbot:${NC}"
    if command -v pm2 &> /dev/null; then
        if is_chatbot_running; then
            echo -e "   ${GREEN}✅ EJECUTÁNDOSE${NC}"
            echo ""
            echo -e "${CYAN}   📊 Detalles de PM2:${NC}"
            pm2 status | grep -E "(drasbot-chatbot|whatsapp-chatbot)" || echo "   No se encontraron procesos"
        else
            echo -e "   ${RED}❌ DETENIDO${NC}"
        fi
    else
        echo -e "   ${RED}❌ PM2 no instalado${NC}"
    fi
    echo ""
    
    # Estado de puertos
    echo -e "${PURPLE}🌐 Puertos:${NC}"
    if command -v lsof &> /dev/null; then
        local port_8080=$(lsof -ti:8080 2>/dev/null || echo "libre")
        local port_3000=$(lsof -ti:3000 2>/dev/null || echo "libre")
        
        if [ "$port_8080" != "libre" ]; then
            echo -e "   ${GREEN}✅ Puerto 8080 (Bridge): ocupado${NC}"
        else
            echo -e "   ${RED}❌ Puerto 8080 (Bridge): libre${NC}"
        fi
        
        if [ "$port_3000" != "libre" ]; then
            echo -e "   ${GREEN}✅ Puerto 3000 (Chatbot): ocupado${NC}"
        else
            echo -e "   ${RED}❌ Puerto 3000 (Chatbot): libre${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  lsof no disponible para verificar puertos${NC}"
    fi
    echo ""
    
    # Resumen
    local bridge_ok=false
    local chatbot_ok=false
    
    if is_bridge_running && is_port_8080_open; then
        bridge_ok=true
    fi
    
    if is_chatbot_running; then
        chatbot_ok=true
    fi
    
    echo -e "${PURPLE}📋 Resumen:${NC}"
    if $bridge_ok && $chatbot_ok; then
        echo -e "   ${GREEN}🎉 Sistema completamente operativo${NC}"
    elif $bridge_ok && ! $chatbot_ok; then
        echo -e "   ${YELLOW}⚠️  Bridge OK, Chatbot necesita iniciarse${NC}"
    elif ! $bridge_ok && $chatbot_ok; then
        echo -e "   ${YELLOW}⚠️  Chatbot OK, Bridge necesita iniciarse${NC}"
    else
        echo -e "   ${RED}❌ Sistema completamente detenido${NC}"
    fi
}

# Función para mostrar logs combinados
show_logs() {
    echo -e "${BLUE}📝 Logs del Ecosistema DrasBot${NC}"
    echo "======================================"
    echo ""
    echo -e "${YELLOW}Presiona Ctrl+C para salir${NC}"
    echo ""
    
    if is_chatbot_running && command -v pm2 &> /dev/null; then
        echo -e "${CYAN}📊 Logs del Chatbot (PM2):${NC}"
        pm2 logs drasbot-chatbot --lines 50 2>/dev/null || pm2 logs whatsapp-chatbot --lines 50 2>/dev/null || echo "No se pudieron obtener logs del chatbot"
    else
        echo -e "${RED}❌ Chatbot no está ejecutándose${NC}"
    fi
}

# Función para instalar dependencias
install_dependencies() {
    echo -e "${BLUE}📦 Instalando dependencias del ecosistema...${NC}"
    
    # Instalar dependencias del chatbot
    if [ -d "$CHATBOT_DIR" ] && [ -f "$CHATBOT_DIR/package.json" ]; then
        echo -e "${BLUE}📦 Instalando dependencias del chatbot...${NC}"
        cd "$CHATBOT_DIR"
        npm install
    fi
    
    # Instalar PM2 globalmente si no está disponible
    if ! command -v pm2 &> /dev/null; then
        echo -e "${BLUE}📦 Instalando PM2 globalmente...${NC}"
        npm install -g pm2
    fi
    
    # Verificar dependencias de Go en el bridge
    if [ -d "$BRIDGE_DIR" ] && [ -f "$BRIDGE_DIR/go.mod" ]; then
        echo -e "${BLUE}📦 Verificando dependencias del bridge...${NC}"
        cd "$BRIDGE_DIR"
        go mod tidy
    fi
    
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
}

# Función para configurar seguridad
setup_security() {
    echo -e "${BLUE}🔒 Configurando seguridad del ecosistema...${NC}"
    
    # Configurar seguridad del chatbot
    if [ -f "$CHATBOT_DIR/scripts/setup-security.sh" ]; then
        echo -e "${BLUE}🔒 Configurando seguridad del chatbot...${NC}"
        "$CHATBOT_DIR/scripts/setup-security.sh"
    fi
    
    # Configurar bridge seguro
    if [ -f "$CHATBOT_DIR/scripts/secure-bridge.sh" ]; then
        echo -e "${BLUE}🔒 Configurando bridge seguro...${NC}"
        "$CHATBOT_DIR/scripts/secure-bridge.sh"
    fi
    
    echo -e "${GREEN}✅ Configuración de seguridad aplicada${NC}"
}

# Función para chequeo de salud
health_check() {
    show_banner
    echo -e "${BLUE}🏥 Chequeo de Salud del Ecosistema${NC}"
    echo "===================================="
    echo ""
    
    local issues=0
    
    # Verificar bridge
    echo -e "${PURPLE}🌉 Verificando Bridge:${NC}"
    if is_bridge_running; then
        echo -e "   ${GREEN}✅ Proceso activo${NC}"
        if is_port_8080_open; then
            echo -e "   ${GREEN}✅ API REST responde${NC}"
        else
            echo -e "   ${RED}❌ API REST no responde${NC}"
            issues=$((issues + 1))
        fi
    else
        echo -e "   ${RED}❌ Proceso no activo${NC}"
        issues=$((issues + 1))
    fi
    echo ""
    
    # Verificar chatbot
    echo -e "${PURPLE}🤖 Verificando Chatbot:${NC}"
    if is_chatbot_running; then
        echo -e "   ${GREEN}✅ Proceso PM2 activo${NC}"
        
        # Verificar memoria y CPU
        if command -v pm2 &> /dev/null; then
            local memory=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-chatbot" or .name=="whatsapp-chatbot") | .monit.memory' 2>/dev/null || echo "0")
            local cpu=$(pm2 jlist | jq -r '.[] | select(.name=="drasbot-chatbot" or .name=="whatsapp-chatbot") | .monit.cpu' 2>/dev/null || echo "0")
            
            if [ "$memory" -gt 0 ]; then
                local memory_mb=$((memory / 1024 / 1024))
                echo -e "   ${CYAN}📊 Memoria: ${memory_mb}MB${NC}"
                if [ "$memory_mb" -gt 300 ]; then
                    echo -e "   ${YELLOW}⚠️  Alto uso de memoria${NC}"
                fi
            fi
            
            if [ "$cpu" -gt 0 ]; then
                echo -e "   ${CYAN}📊 CPU: ${cpu}%${NC}"
                if [ "$cpu" -gt 80 ]; then
                    echo -e "   ${YELLOW}⚠️  Alto uso de CPU${NC}"
                fi
            fi
        fi
    else
        echo -e "   ${RED}❌ Proceso no activo${NC}"
        issues=$((issues + 1))
    fi
    echo ""
    
    # Verificar conectividad entre servicios
    echo -e "${PURPLE}🔗 Verificando Conectividad:${NC}"
    if is_bridge_running && is_chatbot_running && is_port_8080_open; then
        echo -e "   ${GREEN}✅ Comunicación bridge-chatbot OK${NC}"
    else
        echo -e "   ${RED}❌ Problemas de comunicación${NC}"
        issues=$((issues + 1))
    fi
    echo ""
    
    # Resumen final
    echo -e "${PURPLE}📋 Resumen de Salud:${NC}"
    if [ $issues -eq 0 ]; then
        echo -e "   ${GREEN}🎉 Sistema saludable - Todo funciona correctamente${NC}"
    else
        echo -e "   ${RED}⚠️  Se encontraron $issues problema(s)${NC}"
        echo -e "   ${CYAN}💡 Ejecuta './manage.sh restart' para intentar resolver${NC}"
    fi
}

# Función principal
main() {
    case "${1:-help}" in
        "setup")
            show_banner
            echo -e "${BLUE}🚀 Configuración inicial del ecosistema DrasBot${NC}"
            echo "================================================="
            
            # Verificar e instalar dependencias
            if ! check_dependencies; then
                echo -e "${YELLOW}📦 Instalando dependencias faltantes...${NC}"
                if [ -f "$CHATBOT_DIR/scripts/install-deps.sh" ]; then
                    "$CHATBOT_DIR/scripts/install-deps.sh"
                else
                    install_dependencies
                fi
            fi
            
            # Instalar dependencias del proyecto
            install_dependencies
            
            # Configurar seguridad
            setup_security
            
            echo ""
            echo -e "${GREEN}🎉 Configuración inicial completada${NC}"
            echo ""
            echo -e "${BLUE}📋 Próximos pasos:${NC}"
            echo "   1. ./manage.sh start        # Iniciar todo el ecosistema"
            echo "   2. ./manage.sh status       # Ver estado"
            echo "   3. ./manage.sh logs         # Ver logs"
            echo "   4. ./manage.sh health       # Chequeo de salud"
            ;;
        "deps"|"dependencies")
            install_dependencies
            ;;
        "security")
            setup_security
            ;;
        "start")
            show_banner
            echo -e "${BLUE}🚀 Iniciando ecosistema DrasBot${NC}"
            clean_hanging_processes
            sleep 1
            start_bridge
            sleep 3
            start_chatbot
            echo ""
            show_status
            ;;
        "stop")
            show_banner
            echo -e "${BLUE}🛑 Deteniendo ecosistema DrasBot${NC}"
            stop_chatbot
            stop_bridge
            echo -e "${GREEN}✅ Ecosistema detenido completamente${NC}"
            ;;
        "restart")
            show_banner
            echo -e "${BLUE}🔄 Reiniciando ecosistema DrasBot${NC}"
            stop_chatbot
            stop_bridge
            clean_hanging_processes
            sleep 2
            start_bridge
            sleep 3
            start_chatbot
            echo ""
            show_status
            ;;
        "clean-start")
            show_banner
            echo -e "${BLUE}🧹 Inicio limpio del ecosistema DrasBot${NC}"
            stop_chatbot
            stop_bridge
            clean_hanging_processes
            sleep 3
            start_bridge
            sleep 5
            start_chatbot
            echo ""
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "health")
            health_check
            ;;
        "clean")
            clean_hanging_processes
            ;;
        "reset")
            show_banner
            echo -e "${YELLOW}⚠️  Realizando reset completo del ecosistema${NC}"
            stop_chatbot
            stop_bridge
            clean_hanging_processes
            echo -e "${GREEN}✅ Reset completado${NC}"
            ;;
        "bridge-start")
            start_bridge
            ;;
        "bridge-stop")
            stop_bridge
            ;;
        "bridge-status")
            echo -e "${PURPLE}🌉 Estado del Bridge:${NC}"
            if is_bridge_running; then
                echo -e "${GREEN}✅ EJECUTÁNDOSE${NC}"
                if is_port_8080_open; then
                    echo -e "${GREEN}✅ API REST disponible${NC}"
                else
                    echo -e "${YELLOW}⚠️  API REST no responde${NC}"
                fi
            else
                echo -e "${RED}❌ DETENIDO${NC}"
            fi
            ;;
        "bridge-logs")
            if command -v tmux &> /dev/null && tmux has-session -t drasbot-bridge 2>/dev/null; then
                echo -e "${BLUE}📺 Conectando a sesión tmux del bridge...${NC}"
                tmux attach -t drasbot-bridge
            elif [ -f "$CHATBOT_DIR/logs/bridge.log" ]; then
                echo -e "${BLUE}📝 Logs del bridge:${NC}"
                tail -f "$CHATBOT_DIR/logs/bridge.log"
            else
                echo -e "${RED}❌ No se encontraron logs del bridge${NC}"
            fi
            ;;
        "chatbot-start")
            start_chatbot
            ;;
        "chatbot-stop")
            stop_chatbot
            ;;
        "chatbot-status")
            echo -e "${PURPLE}🤖 Estado del Chatbot:${NC}"
            if is_chatbot_running; then
                echo -e "${GREEN}✅ EJECUTÁNDOSE${NC}"
                if command -v pm2 &> /dev/null; then
                    pm2 status | grep -E "(drasbot-chatbot|whatsapp-chatbot)" || echo "No se encontraron procesos"
                fi
            else
                echo -e "${RED}❌ DETENIDO${NC}"
            fi
            ;;
        "chatbot-logs")
            if is_chatbot_running && command -v pm2 &> /dev/null; then
                pm2 logs drasbot-chatbot 2>/dev/null || pm2 logs whatsapp-chatbot 2>/dev/null || echo "No se pudieron obtener logs"
            else
                echo -e "${RED}❌ Chatbot no está ejecutándose${NC}"
            fi
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"
