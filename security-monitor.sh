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
