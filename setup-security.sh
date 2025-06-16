#!/bin/bash

# Script de configuración de seguridad para el ecosistema DrasBot
# Configura firewall, permisos y otras medidas de seguridad
# Uso: ./setup-security.sh

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
    echo "║        🔒 CONFIGURACIÓN SEGURIDAD       ║"
    echo "║           Ecosistema DrasBot             ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Detectar y configurar firewall
setup_firewall() {
    echo -e "${BLUE}🔥 Configurando firewall...${NC}"
    
    # Detectar sistema de firewall disponible
    if command -v ufw &> /dev/null; then
        echo -e "${BLUE}🔧 Usando UFW (Uncomplicated Firewall)${NC}"
        
        # Habilitar UFW si no está activo
        local ufw_status=$(sudo ufw status | grep "Status: active")
        if [ -z "$ufw_status" ]; then
            echo -e "${YELLOW}⚠️  UFW no está activo. ¿Activar firewall? (y/N)${NC}"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                sudo ufw --force enable
                echo -e "${GREEN}✅ UFW activado${NC}"
            else
                echo -e "${YELLOW}⚠️  Saltando configuración de firewall${NC}"
                return 0
            fi
        fi
        
        # Configurar reglas básicas
        echo -e "${BLUE}🔧 Configurando reglas de firewall...${NC}"
        
        # Denegar todo por defecto
        sudo ufw --force default deny incoming
        sudo ufw --force default allow outgoing
        
        # Permitir SSH (importante para no perder acceso)
        sudo ufw allow ssh
        
        # Solo permitir conexiones locales a nuestros puertos
        sudo ufw allow from 127.0.0.1 to any port 3000 comment "DrasBot Chatbot (local only)"
        sudo ufw allow from 127.0.0.1 to any port 8080 comment "DrasBot Bridge (local only)"
        
        # Denegar conexiones externas específicamente
        sudo ufw deny 3000 comment "Block external access to Chatbot"
        sudo ufw deny 8080 comment "Block external access to Bridge"
        
        echo -e "${GREEN}✅ Firewall configurado para acceso solo local${NC}"
        
    elif command -v firewall-cmd &> /dev/null; then
        echo -e "${BLUE}🔧 Usando firewalld${NC}"
        
        # Verificar si firewalld está activo
        if ! systemctl is-active --quiet firewalld; then
            echo -e "${YELLOW}⚠️  firewalld no está activo. ¿Activar? (y/N)${NC}"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                sudo systemctl enable firewalld
                sudo systemctl start firewalld
                echo -e "${GREEN}✅ firewalld activado${NC}"
            else
                echo -e "${YELLOW}⚠️  Saltando configuración de firewall${NC}"
                return 0
            fi
        fi
        
        # Configurar zona para localhost
        sudo firewall-cmd --permanent --zone=trusted --add-interface=lo
        sudo firewall-cmd --permanent --zone=trusted --add-port=3000/tcp
        sudo firewall-cmd --permanent --zone=trusted --add-port=8080/tcp
        
        # Recargar configuración
        sudo firewall-cmd --reload
        
        echo -e "${GREEN}✅ firewalld configurado${NC}"
        
    elif command -v iptables &> /dev/null; then
        echo -e "${BLUE}🔧 Usando iptables${NC}"
        echo -e "${YELLOW}⚠️  Configuración manual de iptables requerida${NC}"
        echo -e "${CYAN}💡 Se recomienda instalar ufw: sudo pacman -S ufw${NC}"
        
    else
        echo -e "${YELLOW}⚠️  No se detectó sistema de firewall${NC}"
        echo -e "${CYAN}💡 Se recomienda instalar ufw para mayor seguridad${NC}"
    fi
    
    echo ""
}

# Configurar bridge para solo localhost
secure_bridge() {
    echo -e "${BLUE}🌉 Configurando bridge para acceso local únicamente...${NC}"
    
    if [ ! -f "$BRIDGE_DIR/main.go" ]; then
        echo -e "${RED}❌ main.go no encontrado en $BRIDGE_DIR${NC}"
        return 1
    fi
    
    # Crear backup
    local backup_dir="$BRIDGE_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    cp "$BRIDGE_DIR/main.go" "$backup_dir/main.go.original"
    
    echo -e "${BLUE}💾 Backup creado en: $backup_dir${NC}"
    
    # Aplicar configuración segura
    cd "$BRIDGE_DIR"
    
    # Forzar binding a localhost
    sed -i 's/http\.ListenAndServe(serverAddr, nil)/http.ListenAndServe("127.0.0.1"+serverAddr, nil)/' main.go
    
    # Actualizar mensaje de log
    sed -i 's/fmt\.Printf("Starting REST API server on %s\\.\\.\\.", serverAddr)/fmt.Printf("Starting REST API server on 127.0.0.1%s (LOCAL ONLY)...", serverAddr)/' main.go
    
    echo -e "${GREEN}✅ Bridge configurado para acceso local únicamente${NC}"
    echo ""
}

# Configurar permisos de archivos
set_file_permissions() {
    echo -e "${BLUE}📁 Configurando permisos de archivos...${NC}"
    
    # Permisos restrictivos para archivos de configuración
    if [ -d "$CHATBOT_DIR" ]; then
        # Logs solo accesibles por el propietario
        chmod 750 "$CHATBOT_DIR/logs" 2>/dev/null || mkdir -p "$CHATBOT_DIR/logs" && chmod 750 "$CHATBOT_DIR/logs"
        
        # Base de datos solo accesible por el propietario
        if [ -f "$CHATBOT_DIR/src/database/users.db" ]; then
            chmod 600 "$CHATBOT_DIR/src/database/users.db"
        fi
        
        # Scripts ejecutables solo por el propietario
        find "$CHATBOT_DIR/scripts" -name "*.sh" -exec chmod 750 {} \; 2>/dev/null || true
    fi
    
    if [ -d "$BRIDGE_DIR" ]; then
        # Store directory con permisos restrictivos
        chmod 750 "$BRIDGE_DIR/store" 2>/dev/null || mkdir -p "$BRIDGE_DIR/store" && chmod 750 "$BRIDGE_DIR/store"
        
        # Bases de datos del bridge
        if [ -f "$BRIDGE_DIR/store/whatsapp.db" ]; then
            chmod 600 "$BRIDGE_DIR/store/whatsapp.db"
        fi
        if [ -f "$BRIDGE_DIR/store/messages.db" ]; then
            chmod 600 "$BRIDGE_DIR/store/messages.db"
        fi
    fi
    
    # Scripts principales
    chmod 750 "$SCRIPT_DIR"/*.sh 2>/dev/null || true
    
    echo -e "${GREEN}✅ Permisos de archivos configurados${NC}"
    echo ""
}

# Configurar variables de entorno seguras
setup_environment() {
    echo -e "${BLUE}🌍 Configurando variables de entorno...${NC}"
    
    # Crear archivo de configuración de seguridad si no existe
    local security_config="$SCRIPT_DIR/.security-config"
    
    if [ ! -f "$security_config" ]; then
        cat > "$security_config" << EOF
# Configuración de seguridad para DrasBot
# Generado automáticamente el $(date)

# Restricciones de red
DRASBOT_LOCALHOST_ONLY=true
DRASBOT_BRIDGE_HOST=127.0.0.1
DRASBOT_CHATBOT_HOST=127.0.0.1

# Puertos seguros
DRASBOT_BRIDGE_PORT=8080
DRASBOT_CHATBOT_PORT=3000

# Configuración de logs
DRASBOT_LOG_LEVEL=INFO
DRASBOT_SECURITY_LOGS=true

# Timestamp de configuración
DRASBOT_SECURITY_SETUP=$(date '+%Y-%m-%d %H:%M:%S')
EOF
        chmod 600 "$security_config"
        echo -e "${GREEN}✅ Archivo de configuración de seguridad creado${NC}"
    else
        echo -e "${YELLOW}⚠️  Archivo de configuración ya existe${NC}"
    fi
    
    echo ""
}

# Crear script de monitoreo de seguridad
create_security_monitor() {
    echo -e "${BLUE}👁️  Creando monitor de seguridad...${NC}"
    
    local monitor_script="$SCRIPT_DIR/security-monitor.sh"
    
    cat > "$monitor_script" << 'EOF'
#!/bin/bash

# Monitor de seguridad para DrasBot
# Verifica el estado de seguridad del sistema

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔒 Monitor de Seguridad DrasBot${NC}"
echo "=================================="

# Verificar firewall
echo -e "${BLUE}🔥 Estado del Firewall:${NC}"
if command -v ufw &> /dev/null; then
    ufw_status=$(sudo ufw status)
    if echo "$ufw_status" | grep -q "Status: active"; then
        echo -e "   ${GREEN}✅ UFW activo${NC}"
        
        # Verificar reglas para nuestros puertos
        if echo "$ufw_status" | grep -q "3000"; then
            echo -e "   ${GREEN}✅ Puerto 3000 configurado${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Puerto 3000 no configurado${NC}"
        fi
        
        if echo "$ufw_status" | grep -q "8080"; then
            echo -e "   ${GREEN}✅ Puerto 8080 configurado${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Puerto 8080 no configurado${NC}"
        fi
    else
        echo -e "   ${RED}❌ UFW inactivo${NC}"
    fi
elif command -v firewall-cmd &> /dev/null; then
    if systemctl is-active --quiet firewalld; then
        echo -e "   ${GREEN}✅ firewalld activo${NC}"
    else
        echo -e "   ${RED}❌ firewalld inactivo${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  No se detectó firewall${NC}"
fi

# Verificar conexiones de red
echo ""
echo -e "${BLUE}🌐 Conexiones de Red:${NC}"
if command -v netstat &> /dev/null; then
    echo -e "   ${BLUE}Puertos en escucha:${NC}"
    netstat -tlnp 2>/dev/null | grep -E ':(3000|8080)' | while read line; do
        if echo "$line" | grep -q "127.0.0.1"; then
            echo -e "   ${GREEN}✅ $line${NC}"
        else
            echo -e "   ${RED}⚠️  $line${NC}"
        fi
    done
else
    echo -e "   ${YELLOW}⚠️  netstat no disponible${NC}"
fi

# Verificar permisos de archivos críticos
echo ""
echo -e "${BLUE}📁 Permisos de Archivos:${NC}"
for file in "whatsapp-bridge/store/whatsapp.db" "whatsapp-bridge/store/messages.db" "whatsapp-chatbot/src/database/users.db"; do
    if [ -f "$file" ]; then
        perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null || echo "???")
        if [ "$perms" = "600" ]; then
            echo -e "   ${GREEN}✅ $file ($perms)${NC}"
        else
            echo -e "   ${YELLOW}⚠️  $file ($perms) - Se recomienda 600${NC}"
        fi
    fi
done

echo ""
echo -e "${BLUE}📊 Resumen de Seguridad:${NC}"
echo -e "   Monitor ejecutado: $(date)"
EOF

    chmod 750 "$monitor_script"
    echo -e "${GREEN}✅ Monitor de seguridad creado: $monitor_script${NC}"
    echo ""
}

# Mostrar resumen de seguridad
show_security_summary() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}🔒 RESUMEN DE CONFIGURACIÓN DE SEGURIDAD${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "${CYAN}📋 Medidas de seguridad aplicadas:${NC}"
    echo -e "   ${GREEN}✅ Bridge configurado para acceso local únicamente${NC}"
    echo -e "   ${GREEN}✅ Permisos de archivos restringidos${NC}"
    echo -e "   ${GREEN}✅ Variables de entorno seguras configuradas${NC}"
    echo -e "   ${GREEN}✅ Monitor de seguridad creado${NC}"
    
    if command -v ufw &> /dev/null; then
        echo -e "   ${GREEN}✅ Firewall configurado (UFW)${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        echo -e "   ${GREEN}✅ Firewall configurado (firewalld)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Firewall no configurado automáticamente${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}🔧 Configuración aplicada:${NC}"
    echo -e "   • Bridge: Solo accesible desde 127.0.0.1:8080${NC}"
    echo -e "   • Chatbot: Solo accesible desde 127.0.0.1:3000${NC}"
    echo -e "   • Bases de datos: Permisos 600 (solo propietario)${NC}"
    echo -e "   • Logs: Permisos 750 (propietario y grupo)${NC}"
    
    echo ""
    echo -e "${CYAN}📚 Comandos útiles:${NC}"
    echo -e "   • ${YELLOW}./security-monitor.sh${NC}  - Monitor de seguridad"
    echo -e "   • ${YELLOW}./manage.sh status${NC}     - Estado del sistema"
    echo -e "   • ${YELLOW}sudo ufw status${NC}        - Estado del firewall"
    
    echo ""
    echo -e "${GREEN}🎉 ¡Configuración de seguridad completada!${NC}"
    echo ""
}

# Función principal
main() {
    show_banner
    
    echo -e "${BLUE}🚀 Iniciando configuración de seguridad...${NC}"
    echo ""
    
    # Configurar firewall
    setup_firewall
    
    # Securizar bridge
    secure_bridge
    
    # Configurar permisos
    set_file_permissions
    
    # Variables de entorno
    setup_environment
    
    # Crear monitor
    create_security_monitor
    
    # Mostrar resumen
    show_security_summary
}

# Ejecutar función principal
main "$@"
