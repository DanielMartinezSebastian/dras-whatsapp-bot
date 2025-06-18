#!/bin/bash

# DrasBot PM2 Management Script
# Nueva Arquitectura - Todo por PM2, sin tmux
# Actualizado: Junio 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRASBOT_DIR="$SCRIPT_DIR/drasbot"
BRIDGE_DIR="$SCRIPT_DIR/whatsapp-bridge"
SECURITY_CONFIG="$SCRIPT_DIR/.security-config"

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
    echo "║          🤖 DrasBot PM2 System           ║"
    echo "║     Gestión Unificada - Arquitectura     ║"
    echo "║              Nueva 2025                  ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    show_banner
    echo ""
    echo "Comandos disponibles:"
    echo ""
    echo -e "${GREEN}🎯 COMANDOS PRINCIPALES${NC}"
    echo -e "  ${CYAN}status${NC}          - Ver estado completo del sistema PM2"
    echo -e "  ${CYAN}start${NC}           - Iniciar todos los servicios"
    echo -e "  ${CYAN}stop${NC}            - Detener todos los servicios"
    echo -e "  ${CYAN}restart${NC}         - Reiniciar todos los servicios"
    echo -e "  ${CYAN}logs${NC} [service]  - Ver logs (drasbot, drasbot-bridge, all)"
    echo ""
    echo -e "${GREEN}🔧 DESARROLLO${NC}"
    echo -e "  ${CYAN}build${NC}           - Compilar TypeScript del bot"
    echo -e "  ${CYAN}dev${NC}             - Compilar + reiniciar bot"
    echo -e "  ${CYAN}restart-bot${NC}     - Solo compilar y reiniciar bot (recomendado)"
    echo -e "  ${CYAN}restart-all${NC}     - Reiniciar bot + bridge (completo)"
    echo -e "  ${CYAN}health${NC}          - Verificar conectividad de servicios"
    echo ""
    echo -e "${GREEN}🧹 MANTENIMIENTO${NC}"
    echo -e "  ${CYAN}clean${NC}           - Limpiar procesos colgados y tmux"
    echo -e "  ${CYAN}reset${NC}           - Reset completo del sistema"
    echo ""
    echo -e "${GREEN}🔒 SEGURIDAD${NC}"
    echo -e "  ${CYAN}security${NC}        - Mostrar configuración de seguridad actual"
    echo -e "  ${CYAN}check-ports${NC}     - Verificar puertos y accesibilidad"
    echo ""
    echo -e "${GREEN}📋 SERVICIOS GESTIONADOS${NC}"
    echo -e "  ${YELLOW}drasbot${NC}     - Bot principal (TypeScript, puerto 3000)"
    echo -e "  ${YELLOW}drasbot-bridge${NC}  - Bridge WhatsApp (Go, puerto 8080)"
}

# Funciones de utilidad
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar que PM2 esté instalado
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 no está instalado. Instálalo con: npm install -g pm2"
        exit 1
    fi
}

# Limpiar procesos colgados y sesiones tmux
clean_system() {
    log_info "Limpiando sistema..."
    
    # Matar sesiones tmux si existen
    if command -v tmux &> /dev/null; then
        tmux kill-server 2>/dev/null || true
        log_success "Sesiones tmux cerradas"
    fi
    
    # Liberar puertos específicos
    for port in 8080 3000; do
        if lsof -ti:$port &> /dev/null; then
            log_warning "Liberando puerto $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    log_success "Sistema limpio"
}

# Compilar TypeScript del bot
build_bot() {
    log_info "Compilando DrasBot TypeScript..."
    cd "$DRASBOT_DIR"
    
    if [ ! -f "package.json" ]; then
        log_error "No se encontró package.json en $DRASBOT_DIR"
        exit 1
    fi
    
    npm run build
    if [ $? -eq 0 ]; then
        log_success "Compilación exitosa"
    else
        log_error "Error en la compilación"
        exit 1
    fi
    cd "$SCRIPT_DIR"
}

# Verificar estado de los servicios
check_status() {
    show_banner
    echo -e "${BLUE}📊 Estado del Sistema PM2${NC}"
    echo "========================================"
    
    check_pm2
    pm2 status
    
    echo ""
    echo -e "${BLUE}🌐 Estado de Conectividad${NC}"
    echo "========================================"
    
    # Check bridge health
    if curl -s -f http://localhost:8080/health &> /dev/null; then
        log_success "Bridge WhatsApp: ONLINE (puerto 8080)"
    else
        log_error "Bridge WhatsApp: OFFLINE (puerto 8080)"
    fi
    
    # Check bot webhook
    if curl -s -f http://localhost:3000/health &> /dev/null; then
        log_success "Bot Webhook: ONLINE (puerto 3000)"
    else
        log_warning "Bot Webhook: No responde en puerto 3000"
    fi
}

# Iniciar servicios
start_services() {
    show_banner
    log_info "Iniciando servicios DrasBot..."
    
    check_pm2
    clean_system
    
    # Compilar bot antes de iniciar
    build_bot
    
    # Iniciar bridge
    log_info "Iniciando WhatsApp Bridge..."
    pm2 start drasbot-bridge 2>/dev/null || pm2 restart drasbot-bridge
    
    # Iniciar bot
    log_info "Iniciando DrasBot..."
    pm2 start drasbot 2>/dev/null || pm2 restart drasbot
    
    sleep 3
    check_status
}

# Detener servicios
stop_services() {
    show_banner
    log_info "Deteniendo servicios DrasBot..."
    
    check_pm2
    pm2 stop drasbot-bridge drasbot 2>/dev/null || true
    
    log_success "Servicios detenidos"
}

# Reiniciar servicios (solo bot por defecto)
restart_services() {
    show_banner
    log_info "Reiniciando bot (drasbot)..."
    
    check_pm2
    
    # Compilar bot antes de reiniciar
    build_bot
    
    # Reiniciar solo el bot (más seguro)
    pm2 restart drasbot
    
    sleep 2
    check_status
    
    log_success "Bot reiniciado. Para reiniciar también el bridge usa: ./manage-new.sh restart-all"
}

# Reiniciar todo el ecosistema
restart_all_services() {
    show_banner
    log_info "Reiniciando TODOS los servicios DrasBot..."
    
    check_pm2
    
    # Compilar bot antes de reiniciar
    build_bot
    
    log_info "Reiniciando bridge (drasbot-bridge)..."
    pm2 restart drasbot-bridge
    
    log_info "Reiniciando bot (drasbot)..."
    pm2 restart drasbot
    
    sleep 5
    check_status
    
    log_success "Ecosistema completo reiniciado"
}

# Desarrollo: compilar + reiniciar bot
dev_restart() {
    show_banner
    log_info "Modo desarrollo: compilando y reiniciando bot..."
    
    build_bot
    pm2 restart drasbot
    
    sleep 2
    log_success "Bot reiniciado con nuevos cambios"
    
    # Mostrar logs recientes
    echo ""
    log_info "Logs recientes:"
    pm2 logs drasbot --lines 10
}

# Ver logs
show_logs() {
    local service=${1:-"all"}
    
    case $service in
        "drasbot"|"bot")
            pm2 logs drasbot --lines 50
            ;;
        "drasbot-bridge"|"bridge")
            pm2 logs drasbot-bridge --lines 50
            ;;
        "all"|*)
            pm2 logs --lines 30
            ;;
    esac
}

# Verificar salud del sistema
health_check() {
    show_banner
    echo -e "${BLUE}🔍 Verificación de Salud del Sistema${NC}"
    echo "========================================"
    
    # PM2 status
    pm2 status
    
    echo ""
    
    # Bridge health
    log_info "Verificando WhatsApp Bridge..."
    if response=$(curl -s http://localhost:8080/status 2>/dev/null); then
        log_success "Bridge responde correctamente"
        echo "Response: $response"
    else
        log_error "Bridge no responde"
    fi
    
    echo ""
    
    # Bot health  
    log_info "Verificando DrasBot Webhook..."
    if curl -s -f http://localhost:3000/ &> /dev/null; then
        log_success "Bot webhook responde"
    else
        log_warning "Bot webhook no responde (normal si no tiene endpoint /)"
    fi
    
    echo ""
    
    # Procesos en puertos
    log_info "Procesos en puertos críticos:"
    echo "Puerto 8080 (Bridge):"
    lsof -i :8080 2>/dev/null || echo "  No hay procesos"
    echo "Puerto 3000 (Bot):"
    lsof -i :3000 2>/dev/null || echo "  No hay procesos"
}

# Reset completo
reset_system() {
    show_banner
    log_warning "RESET COMPLETO DEL SISTEMA"
    
    read -p "¿Estás seguro? Esto detendrá todos los servicios y limpiará el sistema. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Reset cancelado"
        exit 0
    fi
    
    log_info "Ejecutando reset completo..."
    stop_services
    clean_system
    sleep 2
    start_services
    
    log_success "Reset completo terminado"
}

# === CONFIGURACIÓN DE SEGURIDAD ===

# Función para cargar configuración de seguridad
load_security_config() {
    if [[ -f "$SECURITY_CONFIG" ]]; then
        log_info "Cargando configuración de seguridad..."
        source "$SECURITY_CONFIG"
        
        # Validar configuración crítica
        if [[ "$DRASBOT_EXTERNAL_ACCESS" == "true" ]]; then
            log_warning "⚠️  ACCESO EXTERNO HABILITADO - Revisa la configuración de seguridad"
        fi
        
        if [[ "$DRASBOT_LOCALHOST_ONLY" == "true" ]]; then
            log_success "🔒 Modo localhost activado - Servicios protegidos"
        fi
        
        log_success "Configuración de seguridad cargada (v$DRASBOT_CONFIG_VERSION)"
    else
        log_warning "Archivo de configuración de seguridad no encontrado en: $SECURITY_CONFIG"
        log_info "Usando configuración por defecto..."
        
        # Configuración por defecto (segura)
        export DRASBOT_EXTERNAL_ACCESS=false
        export DRASBOT_LOCALHOST_ONLY=true
        export DRASBOT_BRIDGE_HOST=127.0.0.1
        export DRASBOT_CHATBOT_HOST=127.0.0.1
        export DRASBOT_BRIDGE_PORT=8080
        export DRASBOT_CHATBOT_PORT=3000
        export DRASBOT_WEBHOOK_HOST=127.0.0.1
    fi
}

# Función para mostrar configuración actual
show_security_status() {
    echo -e "${CYAN}🔒 CONFIGURACIÓN DE SEGURIDAD ACTUAL${NC}"
    echo "══════════════════════════════════════════"
    echo -e "Acceso externo:     ${YELLOW}$DRASBOT_EXTERNAL_ACCESS${NC}"
    echo -e "Solo localhost:     ${GREEN}$DRASBOT_LOCALHOST_ONLY${NC}"
    echo -e "Host Bridge:        ${BLUE}$DRASBOT_BRIDGE_HOST:$DRASBOT_BRIDGE_PORT${NC}"
    echo -e "Host Bot:          ${BLUE}$DRASBOT_CHATBOT_HOST:$DRASBOT_CHATBOT_PORT${NC}"
    echo -e "Host Webhook:      ${BLUE}$DRASBOT_WEBHOOK_HOST${NC}"
    echo "══════════════════════════════════════════"
}

# Función para verificar puertos y accesibilidad
check_ports() {
    echo -e "${CYAN}🔍 VERIFICACIÓN DE PUERTOS Y ACCESIBILIDAD${NC}"
    echo "════════════════════════════════════════════════"
    
    local bridge_port=${DRASBOT_BRIDGE_PORT:-8080}
    local bot_port=${DRASBOT_CHATBOT_PORT:-3000}
    
    # Verificar si los puertos están en uso
    echo -e "\n${YELLOW}📊 Estado de puertos:${NC}"
    
    if lsof -ti:$bridge_port &> /dev/null; then
        local bridge_pid=$(lsof -ti:$bridge_port)
        local bridge_process=$(ps -p $bridge_pid -o comm= 2>/dev/null || echo "desconocido")
        echo -e "  Puerto $bridge_port: ${GREEN}EN USO${NC} (PID: $bridge_pid, Proceso: $bridge_process)"
    else
        echo -e "  Puerto $bridge_port: ${RED}LIBRE${NC}"
    fi
    
    if lsof -ti:$bot_port &> /dev/null; then
        local bot_pid=$(lsof -ti:$bot_port)
        local bot_process=$(ps -p $bot_pid -o comm= 2>/dev/null || echo "desconocido")
        echo -e "  Puerto $bot_port: ${GREEN}EN USO${NC} (PID: $bot_pid, Proceso: $bot_process)"
    else
        echo -e "  Puerto $bot_port: ${RED}LIBRE${NC}"
    fi
    
    # Verificar conectividad local
    echo -e "\n${YELLOW}🔗 Conectividad local:${NC}"
    
    if curl -s "http://127.0.0.1:$bridge_port/api/info" &> /dev/null; then
        echo -e "  Bridge (127.0.0.1:$bridge_port): ${GREEN}ACCESIBLE${NC}"
    else
        echo -e "  Bridge (127.0.0.1:$bridge_port): ${RED}NO ACCESIBLE${NC}"
    fi
    
    if curl -s "http://127.0.0.1:$bot_port/health" &> /dev/null; then
        echo -e "  Bot (127.0.0.1:$bot_port): ${GREEN}ACCESIBLE${NC}"
    else
        echo -e "  Bot (127.0.0.1:$bot_port): ${RED}NO ACCESIBLE${NC}"
    fi
    
    # Verificar acceso externo (si está habilitado)
    echo -e "\n${YELLOW}🌐 Acceso externo:${NC}"
    local external_ip=$(curl -s ifconfig.me 2>/dev/null || echo "No disponible")
    
    if [[ "$DRASBOT_EXTERNAL_ACCESS" == "true" ]]; then
        echo -e "  ${RED}⚠️  ACCESO EXTERNO HABILITADO${NC}"
        echo -e "  IP Externa: $external_ip"
        echo -e "  Bridge: http://$external_ip:$bridge_port"
        echo -e "  Bot: http://$external_ip:$bot_port"
    else
        echo -e "  ${GREEN}🔒 ACCESO EXTERNO DESHABILITADO${NC} (Recomendado)"
        echo -e "  IP Externa: $external_ip (servicios no expuestos)"
    fi
    
    echo "════════════════════════════════════════════════"
}

# Proceso principal
main() {
    local command=${1:-"help"}
    
    # Cargar configuración de seguridad para todos los comandos
    load_security_config
    
    case $command in
        "help"|"-h"|"--help")
            show_help
            ;;
        "status"|"st")
            check_status
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "restart-bot"|"rb")
            restart_services
            ;;
        "restart-all"|"ra")
            restart_all_services
            ;;
        "build")
            build_bot
            ;;
        "dev")
            dev_restart
            ;;
        "logs"|"log")
            show_logs "$2"
            ;;
        "clean")
            clean_system
            ;;
        "health")
            health_check
            ;;
        "reset")
            reset_system
            ;;
        "security"|"sec")
            show_security_status
            check_ports
            ;;
        "check-ports"|"ports")
            check_ports
            ;;
        *)
            log_error "Comando desconocido: $command"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar comando principal
main "$@"
