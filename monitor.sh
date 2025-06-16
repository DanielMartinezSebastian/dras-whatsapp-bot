#!/bin/bash

# Script de monitoreo visual mejorado para el ecosistema DrasBot WhatsApp
# Muestra estado en tiempo real con interfaz colorida y actualización automática
# Uso: ./monitor.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_DIR="$SCRIPT_DIR/whatsapp-bridge"
CHATBOT_DIR="$SCRIPT_DIR/whatsapp-chatbot"
LOG_FILE="$CHATBOT_DIR/logs/out-0.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Banner del monitor
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🖥️  MONITOR DRASBOT                      ║"
    echo "║                  Sistema de Monitoreo Visual                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
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
        curl -s --connect-timeout 1 http://127.0.0.1:8080 >/dev/null 2>&1
    fi
}

# Función para mostrar estadísticas del sistema
show_system_stats() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}📊 ESTADÍSTICAS DEL SISTEMA${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Información del sistema
    echo -e "${CYAN}🖥️  Sistema:${NC} $(uname -a | cut -d' ' -f1-3)"
    echo -e "${CYAN}⏰ Tiempo:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${CYAN}⏱️  Uptime:${NC} $(uptime | cut -d',' -f1 | cut -d' ' -f4-)"
    
    # Uso de memoria
    if command -v free &> /dev/null; then
        local mem_info=$(free -h | grep '^Mem:')
        local mem_used=$(echo $mem_info | awk '{print $3}')
        local mem_total=$(echo $mem_info | awk '{print $2}')
        echo -e "${CYAN}💾 Memoria:${NC} $mem_used / $mem_total"
    fi
    
    echo ""
}

# Función para mostrar estado de servicios
show_services_status() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}🔧 ESTADO DE SERVICIOS${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Estado del Bridge
    echo -e "${CYAN}🌉 WhatsApp Bridge:${NC}"
    if is_bridge_running; then
        echo -e "   Status: ${GREEN}● ACTIVO${NC}"
        if is_port_8080_open; then
            echo -e "   API REST: ${GREEN}● DISPONIBLE${NC} (puerto 8080)"
        else
            echo -e "   API REST: ${RED}● NO RESPONDE${NC}"
        fi
        
        # Información de tmux
        if command -v tmux &> /dev/null && tmux has-session -t drasbot-bridge 2>/dev/null; then
            echo -e "   Sesión: ${CYAN}● tmux:drasbot-bridge${NC}"
        fi
    else
        echo -e "   Status: ${RED}● INACTIVO${NC}"
        echo -e "   API REST: ${RED}● NO DISPONIBLE${NC}"
    fi
    echo ""
    
    # Estado del Chatbot
    echo -e "${CYAN}🤖 WhatsApp Chatbot:${NC}"
    if command -v pm2 &> /dev/null; then
        if is_chatbot_running; then
            echo -e "   Status: ${GREEN}● ACTIVO${NC}"
            
            # Obtener estadísticas de PM2
            local pm2_info=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="drasbot-chatbot" or .name=="whatsapp-chatbot") | "\(.monit.memory) \(.monit.cpu) \(.pm2_env.status) \(.pm2_env.restart_time)"' 2>/dev/null)
            
            if [ ! -z "$pm2_info" ]; then
                local memory=$(echo $pm2_info | cut -d' ' -f1)
                local cpu=$(echo $pm2_info | cut -d' ' -f2)
                local status=$(echo $pm2_info | cut -d' ' -f3)
                local restarts=$(echo $pm2_info | cut -d' ' -f4)
                
                if [ "$memory" != "null" ] && [ "$memory" -gt 0 ]; then
                    local memory_mb=$((memory / 1024 / 1024))
                    echo -e "   Memoria: ${YELLOW}${memory_mb}MB${NC}"
                fi
                
                if [ "$cpu" != "null" ]; then
                    echo -e "   CPU: ${YELLOW}${cpu}%${NC}"
                fi
                
                if [ "$restarts" != "null" ]; then
                    echo -e "   Reinicios: ${YELLOW}${restarts}${NC}"
                fi
                
                echo -e "   Estado PM2: ${GREEN}${status}${NC}"
            fi
        else
            echo -e "   Status: ${RED}● INACTIVO${NC}"
        fi
    else
        echo -e "   Status: ${RED}● PM2 NO INSTALADO${NC}"
    fi
    echo ""
}

# Función para mostrar logs recientes
show_recent_logs() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}📝 LOGS RECIENTES${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Logs del chatbot
    if [ -f "$LOG_FILE" ]; then
        echo -e "${CYAN}🤖 Últimos logs del chatbot:${NC}"
        tail -n 5 "$LOG_FILE" 2>/dev/null | while read line; do
            # Colorear según el tipo de mensaje
            if [[ "$line" == *"📨"* ]]; then
                echo -e "   ${CYAN}$line${NC}"
            elif [[ "$line" == *"📤"* ]]; then
                echo -e "   ${GREEN}$line${NC}"
            elif [[ "$line" == *"❌"* ]]; then
                echo -e "   ${RED}$line${NC}"
            elif [[ "$line" == *"✅"* ]]; then
                echo -e "   ${GREEN}$line${NC}"
            elif [[ "$line" == *"⚠️"* ]]; then
                echo -e "   ${YELLOW}$line${NC}"
            else
                echo -e "   ${WHITE}$line${NC}"
            fi
        done
    else
        echo -e "${RED}   ❌ Archivo de logs no encontrado: $LOG_FILE${NC}"
    fi
    echo ""
    
    # Logs del bridge
    local bridge_log="$CHATBOT_DIR/logs/bridge.log"
    if [ -f "$bridge_log" ]; then
        echo -e "${CYAN}🌉 Últimos logs del bridge:${NC}"
        tail -n 3 "$bridge_log" 2>/dev/null | while read line; do
            echo -e "   ${WHITE}$line${NC}"
        done
    fi
    echo ""
}

# Función para mostrar información de red
show_network_info() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}🌐 INFORMACIÓN DE RED${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if command -v lsof &> /dev/null; then
        echo -e "${CYAN}📡 Puertos en uso:${NC}"
        
        # Puerto 8080 (Bridge)
        local port_8080=$(lsof -ti:8080 2>/dev/null)
        if [ ! -z "$port_8080" ]; then
            echo -e "   Puerto 8080 (Bridge): ${GREEN}● OCUPADO${NC} (PID: $port_8080)"
        else
            echo -e "   Puerto 8080 (Bridge): ${RED}● LIBRE${NC}"
        fi
        
        # Puerto 3000 (Chatbot)
        local port_3000=$(lsof -ti:3000 2>/dev/null)
        if [ ! -z "$port_3000" ]; then
            echo -e "   Puerto 3000 (Chatbot): ${GREEN}● OCUPADO${NC} (PID: $port_3000)"
        else
            echo -e "   Puerto 3000 (Chatbot): ${RED}● LIBRE${NC}"
        fi
        
        # Conexiones activas
        local connections=$(netstat -tn 2>/dev/null | grep -E ':(3000|8080)' | wc -l)
        echo -e "   Conexiones activas: ${YELLOW}$connections${NC}"
    else
        echo -e "${YELLOW}   ⚠️  lsof no disponible${NC}"
    fi
    echo ""
}

# Función para mostrar comandos disponibles
show_commands() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}⌨️  COMANDOS DISPONIBLES${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}r${NC} - Actualizar pantalla    ${CYAN}q${NC} - Salir del monitor"
    echo -e "${CYAN}s${NC} - Ejecutar ./manage.sh status"
    echo -e "${CYAN}h${NC} - Ejecutar ./manage.sh health"
    echo -e "${CYAN}l${NC} - Ver logs en tiempo real"
    echo ""
    echo -e "${YELLOW}Actualización automática cada 5 segundos...${NC}"
    echo -e "${YELLOW}Presiona una tecla para comando manual${NC}"
}

# Función principal del monitor
monitor_loop() {
    local auto_refresh=true
    
    while true; do
        show_banner
        show_system_stats
        show_services_status
        show_recent_logs
        show_network_info
        show_commands
        
        if $auto_refresh; then
            # Esperar 5 segundos o hasta que se presione una tecla
            read -t 5 -n 1 key
            local exit_code=$?
            
            case "$key" in
                'q'|'Q')
                    echo -e "\n${GREEN}👋 Saliendo del monitor...${NC}"
                    exit 0
                    ;;
                'r'|'R')
                    continue
                    ;;
                's'|'S')
                    clear
                    echo -e "${BLUE}📊 Ejecutando status completo...${NC}"
                    "$SCRIPT_DIR/manage.sh" status
                    echo -e "\n${YELLOW}Presiona Enter para volver al monitor...${NC}"
                    read
                    ;;
                'h'|'H')
                    clear
                    echo -e "${BLUE}🏥 Ejecutando chequeo de salud...${NC}"
                    "$SCRIPT_DIR/manage.sh" health
                    echo -e "\n${YELLOW}Presiona Enter para volver al monitor...${NC}"
                    read
                    ;;
                'l'|'L')
                    clear
                    echo -e "${BLUE}📝 Logs en tiempo real (Ctrl+C para volver)...${NC}"
                    if [ -f "$LOG_FILE" ]; then
                        tail -f "$LOG_FILE"
                    else
                        echo -e "${RED}❌ Archivo de logs no encontrado${NC}"
                        sleep 2
                    fi
                    ;;
                *)
                    # Si no se presionó ninguna tecla (timeout), continuar
                    if [ $exit_code -eq 142 ]; then
                        continue
                    fi
                    ;;
            esac
        fi
    done
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$BRIDGE_DIR" ] || [ ! -d "$CHATBOT_DIR" ]; then
    echo -e "${RED}❌ Error: Directorios del proyecto no encontrados${NC}"
    echo -e "${YELLOW}Asegúrate de ejecutar este script desde la raíz del proyecto DrasBot${NC}"
    exit 1
fi

# Iniciar el monitor
echo -e "${GREEN}🚀 Iniciando monitor del ecosistema DrasBot...${NC}"
sleep 1
monitor_loop
