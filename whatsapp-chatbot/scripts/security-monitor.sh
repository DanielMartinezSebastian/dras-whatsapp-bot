#!/bin/bash

# Script para monitorear la seguridad del sistema
echo "🔍 Verificando seguridad del sistema..."

# Función para mostrar estado de puertos
check_ports() {
    echo "📡 Estado de puertos críticos:"
    echo "----------------------------------------"
    
    # Verificar si los puertos están escuchando solo en localhost
    echo "🔍 Puertos en escucha:"
    ss -tlnp | grep -E ':(3000|8080|22)' | while read line; do
        if echo "$line" | grep -q "127.0.0.1"; then
            echo "✅ $line (SEGURO - Solo localhost)"
        elif echo "$line" | grep -q ":22"; then
            echo "⚠️  $line (SSH - NECESARIO)"
        else
            echo "❌ $line (PELIGRO - Accesible externamente)"
        fi
    done
    echo ""
}

# Función para verificar firewall
check_firewall() {
    echo "🛡️  Estado del firewall:"
    echo "----------------------------------------"
    
    if command -v ufw &> /dev/null; then
        if sudo ufw status | grep -q "Status: active"; then
            echo "✅ UFW está activo"
            echo ""
            sudo ufw status numbered
        else
            echo "❌ UFW está inactivo"
            echo "💡 Ejecuta: sudo ./scripts/setup-security.sh"
        fi
    else
        echo "❌ UFW no está instalado"
        echo "💡 Ejecuta: sudo apt install ufw"
    fi
    echo ""
}

# Función para verificar procesos
check_processes() {
    echo "🔄 Procesos en ejecución:"
    echo "----------------------------------------"
    
    # Verificar si PM2 está instalado
    if command -v pm2 &> /dev/null; then
        pm2_status=$(pm2 jlist 2>/dev/null)
        if [ "$pm2_status" != "[]" ]; then
            echo "✅ PM2 procesos activos:"
            pm2 status
        else
            echo "⚠️  No hay procesos PM2 en ejecución"
        fi
    else
        echo "❌ PM2 no está instalado"
        echo "💡 Ejecuta: npm install -g pm2"
    fi
    echo ""
}

# Función para verificar conexiones activas
check_connections() {
    echo "🌐 Conexiones de red activas:"
    echo "----------------------------------------"
    
    # Mostrar conexiones establecidas en puertos críticos
    netstat -tn 2>/dev/null | grep -E ':(3000|8080)' | head -10
    
    # Contar conexiones
    local count=$(netstat -tn 2>/dev/null | grep -E ':(3000|8080)' | wc -l)
    if [ "$count" -eq 0 ]; then
        echo "✅ No hay conexiones externas en puertos de aplicación"
    else
        echo "⚠️  Encontradas $count conexiones en puertos de aplicación"
    fi
    echo ""
}

# Función principal
main() {
    echo "🔒 Monitor de Seguridad - WhatsApp Chatbot"
    echo "========================================"
    echo "📅 $(date)"
    echo ""
    
    check_firewall
    check_ports
    check_processes
    check_connections
    
    echo "💡 Recomendaciones:"
    echo "- Solo accede via SSH o localhost"
    echo "- Mantén el firewall activo"
    echo "- Monitorea los logs regularmente"
    echo ""
    echo "📋 Comandos útiles:"
    echo "   ./scripts/setup-security.sh  # Configurar seguridad"
    echo "   ./scripts/start.sh           # Iniciar aplicación"
    echo "   sudo ufw status              # Ver firewall"
    echo "   pm2 status                   # Ver procesos"
    echo "   pm2 logs                     # Ver logs"
}

# Ejecutar si se llama directamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
