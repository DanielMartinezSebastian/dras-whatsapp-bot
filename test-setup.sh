#!/bin/bash

# Configuración global para scripts de test de DrasBot
# Este archivo define variables comunes para todos los scripts de prueba

# Número de teléfono de prueba (España)
export TEST_PHONE="34633471003"
export TEST_PHONE_JID="${TEST_PHONE}@s.whatsapp.net"

# URLs de servicios
export BOT_URL="http://localhost:3000"
export BRIDGE_URL="http://127.0.0.1:8080"
export WEBHOOK_URL="${BOT_URL}/webhook/whatsapp"

# Configuración de pruebas
export TEST_DELAY=2  # segundos entre tests
export TEST_TIMEOUT=10000  # timeout en ms

# Colores para output
export COLOR_GREEN="\x1b[32m"
export COLOR_RED="\x1b[31m"
export COLOR_YELLOW="\x1b[33m"
export COLOR_BLUE="\x1b[34m"
export COLOR_CYAN="\x1b[36m"
export COLOR_MAGENTA="\x1b[35m"
export COLOR_RESET="\x1b[0m"
export COLOR_BOLD="\x1b[1m"

echo "🔧 Configuración de test cargada:"
echo "  📞 Teléfono de prueba: $TEST_PHONE"
echo "  🌐 Bot URL: $BOT_URL"
echo "  🌉 Bridge URL: $BRIDGE_URL"
echo "  📡 Webhook URL: $WEBHOOK_URL"
