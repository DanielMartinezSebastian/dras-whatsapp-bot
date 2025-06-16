#!/bin/bash

# Script de monitoreo visual para el chatbot WhatsApp
# Uso: ./scripts/monitor.sh

BOT_DIR="/home/dras/Documentos/PROGRAMACION/drasBot/whatsapp-chatbot"
LOG_FILE="$BOT_DIR/logs/out-0.log"

echo "🤖 MONITOR DEL CHATBOT WHATSAPP"
echo "================================"
echo "📁 Directorio: $BOT_DIR"
echo "📄 Log: $LOG_FILE"
echo "⏱️  Iniciado: $(date)"
echo "🔄 Presiona Ctrl+C para salir"
echo ""

# Función para mostrar estadísticas
show_stats() {
    echo "📊 ESTADÍSTICAS RÁPIDAS:"
    echo "├─ Estado PM2: $(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-chatbot") | .pm2_env.status')"
    echo "├─ Memoria: $(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-chatbot") | .monit.memory' | numfmt --to=iec)"
    echo "├─ CPU: $(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-chatbot") | .monit.cpu')%"
    echo "├─ Uptime: $(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-chatbot") | .pm2_env.pm_uptime' | xargs -I {} date -d @{} '+%H:%M:%S')"
    echo "└─ Reinicios: $(pm2 jlist | jq -r '.[] | select(.name=="whatsapp-chatbot") | .pm2_env.restart_time')"
    echo ""
}

# Función para colorear logs
colorize_logs() {
    sed -E 's/(📨.*)/\x1b[36m\1\x1b[0m/g; # Cyan para mensajes recibidos
           s/(📤.*)/\x1b[32m\1\x1b[0m/g; # Verde para respuestas enviadas
           s/(🎯.*)/\x1b[33m\1\x1b[0m/g; # Amarillo para patrones detectados
           s/(❌.*)/\x1b[31m\1\x1b[0m/g; # Rojo para errores
           s/(✅.*)/\x1b[32m\1\x1b[0m/g; # Verde para éxitos
           s/(⏳.*)/\x1b[35m\1\x1b[0m/g; # Magenta para rate limiting
           s/(🧹.*)/\x1b[34m\1\x1b[0m/g; # Azul para limpieza'
}

# Mostrar estadísticas iniciales
show_stats

# Monitorear logs en tiempo real con colores
echo "🔄 LOGS EN TIEMPO REAL:"
echo "----------------------"

tail -f "$LOG_FILE" | while read line; do
    timestamp=$(echo "$line" | cut -d':' -f1-3)
    message=$(echo "$line" | cut -d':' -f4-)
    
    # Colorear según el tipo de mensaje
    if [[ "$message" == *"📨"* ]]; then
        echo -e "\x1b[90m$timestamp\x1b[0m: \x1b[36m$message\x1b[0m"
    elif [[ "$message" == *"📤"* ]]; then
        echo -e "\x1b[90m$timestamp\x1b[0m: \x1b[32m$message\x1b[0m"
    elif [[ "$message" == *"🎯"* ]]; then
        echo -e "\x1b[90m$timestamp\x1b[0m: \x1b[33m$message\x1b[0m"
    elif [[ "$message" == *"❌"* ]]; then
        echo -e "\x1b[90m$timestamp\x1b[0m: \x1b[31m$message\x1b[0m"
    elif [[ "$message" == *"✅"* ]]; then
        echo -e "\x1b[90m$timestamp\x1b[0m: \x1b[32m$message\x1b[0m"
    else
        echo -e "\x1b[90m$timestamp\x1b[0m:$message"
    fi
done
