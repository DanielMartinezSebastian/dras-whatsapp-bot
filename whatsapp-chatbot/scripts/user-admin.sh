#!/bin/bash

# Script de administración de usuarios WhatsApp Chatbot
# Facilita la gestión de tipos de usuario desde la terminal

set -e

PROJECT_DIR="/home/dras/Documentos/PROGRAMACION/drasBot/whatsapp-chatbot"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para mostrar el banner
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                ADMINISTRADOR DE USUARIOS                     ║"
    echo "║                    WhatsApp Chatbot                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    show_banner
    echo -e "${CYAN}COMANDOS DISPONIBLES:${NC}"
    echo ""
    echo -e "${GREEN}stats${NC}                    - Ver estadísticas de usuarios"
    echo -e "${GREEN}list [número]${NC}            - Listar usuarios (defecto: 10)"
    echo -e "${GREEN}search <teléfono>${NC}        - Buscar usuario por teléfono"
    echo -e "${GREEN}types${NC}                    - Ver tipos de usuario disponibles"
    echo -e "${GREEN}by-type <tipo>${NC}           - Listar usuarios por tipo"
    echo -e "${GREEN}change <jid> <tipo>${NC}      - Cambiar tipo de usuario"
    echo -e "${GREEN}block <jid> [razón]${NC}      - Bloquear usuario"
    echo -e "${GREEN}unblock <jid> [tipo]${NC}     - Desbloquear usuario"
    echo -e "${GREEN}export${NC}                   - Exportar usuarios a JSON"
    echo -e "${GREEN}interactive${NC}              - Modo interactivo"
    echo ""
    echo -e "${YELLOW}EJEMPLOS:${NC}"
    echo "  ./user-admin.sh stats"
    echo "  ./user-admin.sh search 34612345678"
    echo "  ./user-admin.sh change 34612345678@s.whatsapp.net admin"
    echo "  ./user-admin.sh by-type customer"
    echo ""
    echo -e "${PURPLE}TIPOS DE USUARIO:${NC}"
    echo "  • customer  - Cliente (nivel 1)"
    echo "  • provider  - Proveedor (nivel 2)"
    echo "  • friend    - Amigo (nivel 2)"
    echo "  • familiar  - Familiar (nivel 2)"
    echo "  • employee  - Empleado (nivel 3)"
    echo "  • admin     - Administrador (nivel 4)"
    echo "  • block     - Bloqueado (nivel 0)"
}

# Función para ejecutar comando de node
run_node_cmd() {
    cd "$PROJECT_DIR"
    node scripts/db-admin.js "$@"
}

# Función para modo interactivo
interactive_mode() {
    show_banner
    echo -e "${CYAN}🔄 MODO INTERACTIVO ACTIVADO${NC}"
    echo -e "${YELLOW}Escribe 'exit' para salir${NC}"
    echo ""

    while true; do
        echo -e "${BLUE}┌─────────────────────────────────────────┐${NC}"
        echo -e "${BLUE}│  ${CYAN}1${NC}. Ver estadísticas                   ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}2${NC}. Listar usuarios                    ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}3${NC}. Buscar usuario por teléfono        ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}4${NC}. Ver tipos de usuario               ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}5${NC}. Cambiar tipo de usuario            ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}6${NC}. Bloquear usuario                   ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}7${NC}. Desbloquear usuario                ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}8${NC}. Exportar usuarios                  ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${CYAN}9${NC}. Listar por tipo                    ${BLUE}│${NC}"
        echo -e "${BLUE}│  ${RED}0${NC}. Salir                             ${BLUE}│${NC}"
        echo -e "${BLUE}└─────────────────────────────────────────┘${NC}"
        echo ""
        
        read -p "$(echo -e "${CYAN}Selecciona una opción:${NC} ")" option
        
        case $option in
            1)
                echo -e "\n${YELLOW}📊 Obteniendo estadísticas...${NC}"
                run_node_cmd stats
                ;;
            2)
                read -p "$(echo -e "${CYAN}Número de usuarios a mostrar (defecto 10):${NC} ")" limit
                limit=${limit:-10}
                echo -e "\n${YELLOW}👥 Listando ${limit} usuarios...${NC}"
                run_node_cmd list "$limit"
                ;;
            3)
                read -p "$(echo -e "${CYAN}Teléfono a buscar:${NC} ")" phone
                if [[ -n "$phone" ]]; then
                    echo -e "\n${YELLOW}🔍 Buscando usuario ${phone}...${NC}"
                    run_node_cmd find-phone "$phone"
                else
                    echo -e "${RED}❌ Debes especificar un teléfono${NC}"
                fi
                ;;
            4)
                echo -e "\n${YELLOW}📋 Mostrando tipos de usuario...${NC}"
                run_node_cmd user-types
                ;;
            5)
                read -p "$(echo -e "${CYAN}JID del usuario:${NC} ")" jid
                read -p "$(echo -e "${CYAN}Nuevo tipo:${NC} ")" type
                if [[ -n "$jid" && -n "$type" ]]; then
                    echo -e "\n${YELLOW}🔄 Cambiando tipo de usuario...${NC}"
                    run_node_cmd change-type "$jid" "$type"
                else
                    echo -e "${RED}❌ Debes especificar JID y tipo${NC}"
                fi
                ;;
            6)
                read -p "$(echo -e "${CYAN}JID del usuario a bloquear:${NC} ")" jid
                read -p "$(echo -e "${CYAN}Razón del bloqueo (opcional):${NC} ")" reason
                if [[ -n "$jid" ]]; then
                    echo -e "\n${YELLOW}🚫 Bloqueando usuario...${NC}"
                    if [[ -n "$reason" ]]; then
                        run_node_cmd block "$jid" "$reason"
                    else
                        run_node_cmd block "$jid"
                    fi
                else
                    echo -e "${RED}❌ Debes especificar un JID${NC}"
                fi
                ;;
            7)
                read -p "$(echo -e "${CYAN}JID del usuario a desbloquear:${NC} ")" jid
                read -p "$(echo -e "${CYAN}Nuevo tipo (defecto customer):${NC} ")" type
                type=${type:-customer}
                if [[ -n "$jid" ]]; then
                    echo -e "\n${YELLOW}✅ Desbloqueando usuario...${NC}"
                    run_node_cmd unblock "$jid" "$type"
                else
                    echo -e "${RED}❌ Debes especificar un JID${NC}"
                fi
                ;;
            8)
                echo -e "\n${YELLOW}📤 Exportando usuarios...${NC}"
                run_node_cmd export
                ;;
            9)
                read -p "$(echo -e "${CYAN}Tipo de usuario:${NC} ")" type
                if [[ -n "$type" ]]; then
                    echo -e "\n${YELLOW}👤 Listando usuarios tipo ${type}...${NC}"
                    run_node_cmd by-type "$type"
                else
                    echo -e "${RED}❌ Debes especificar un tipo${NC}"
                fi
                ;;
            0|exit|quit)
                echo -e "\n${GREEN}👋 ¡Hasta luego!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Opción no válida${NC}"
                ;;
        esac
        
        echo ""
        read -p "$(echo -e "${CYAN}Presiona Enter para continuar...${NC}")"
        clear
        show_banner
    done
}

# Función para buscar por teléfono (comando rápido)
quick_search() {
    local phone="$1"
    echo -e "${YELLOW}🔍 Buscando usuario con teléfono: ${phone}${NC}"
    run_node_cmd find-phone "$phone"
}

# Función para cambio rápido de tipo
quick_change() {
    local jid="$1"
    local new_type="$2"
    
    if [[ -z "$jid" || -z "$new_type" ]]; then
        echo -e "${RED}❌ Uso: change <jid> <nuevo_tipo>${NC}"
        echo -e "${YELLOW}Ejemplo: change 34612345678@s.whatsapp.net admin${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🔄 Cambiando tipo de usuario...${NC}"
    echo -e "${CYAN}JID: ${jid}${NC}"
    echo -e "${CYAN}Nuevo tipo: ${new_type}${NC}"
    echo ""
    
    run_node_cmd change-type "$jid" "$new_type"
}

# Función principal
main() {
    case "${1:-help}" in
        "stats")
            echo -e "${YELLOW}📊 Obteniendo estadísticas...${NC}"
            run_node_cmd stats
            ;;
        "list")
            local limit="${2:-10}"
            echo -e "${YELLOW}👥 Listando ${limit} usuarios...${NC}"
            run_node_cmd list "$limit"
            ;;
        "search")
            if [[ -z "$2" ]]; then
                echo -e "${RED}❌ Uso: search <teléfono>${NC}"
                exit 1
            fi
            quick_search "$2"
            ;;
        "types")
            echo -e "${YELLOW}📋 Mostrando tipos de usuario...${NC}"
            run_node_cmd user-types
            ;;
        "by-type")
            if [[ -z "$2" ]]; then
                echo -e "${RED}❌ Uso: by-type <tipo>${NC}"
                exit 1
            fi
            echo -e "${YELLOW}👤 Listando usuarios tipo ${2}...${NC}"
            run_node_cmd by-type "$2"
            ;;
        "change")
            quick_change "$2" "$3"
            ;;
        "block")
            if [[ -z "$2" ]]; then
                echo -e "${RED}❌ Uso: block <jid> [razón]${NC}"
                exit 1
            fi
            echo -e "${YELLOW}🚫 Bloqueando usuario...${NC}"
            run_node_cmd block "$2" "$3"
            ;;
        "unblock")
            if [[ -z "$2" ]]; then
                echo -e "${RED}❌ Uso: unblock <jid> [nuevo_tipo]${NC}"
                exit 1
            fi
            local new_type="${3:-customer}"
            echo -e "${YELLOW}✅ Desbloqueando usuario...${NC}"
            run_node_cmd unblock "$2" "$new_type"
            ;;
        "export")
            echo -e "${YELLOW}📤 Exportando usuarios...${NC}"
            run_node_cmd export
            ;;
        "interactive"|"i")
            interactive_mode
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"
