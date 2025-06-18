#!/bin/bash

# Script para probar el sistema de auto-respuestas
# Usa configuración centralizada

# Cargar configuración si existe
if [ -f "../test-config.sh" ]; then
    source ../test-config.sh
else
    # Configuración local por defecto
    TEST_PHONE="34633471003"
    WEBHOOK_URL="http://localhost:3000/webhook/whatsapp"
fi

echo "🧪 Probando el sistema de auto-respuestas del bot..."
echo "📞 Usando número: $TEST_PHONE"

echo "📨 Enviando mensaje: Hola"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "'$TEST_PHONE'@s.whatsapp.net",
  "sender": "'$TEST_PHONE'",
  "content": "Hola",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando mensaje: Gracias"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "'$TEST_PHONE'@s.whatsapp.net",
  "sender": "'$TEST_PHONE'",
  "content": "Gracias",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando mensaje: Que tal"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "'$TEST_PHONE'@s.whatsapp.net",
  "sender": "'$TEST_PHONE'",
  "content": "Que tal",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando mensaje: Adios"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "'$TEST_PHONE'@s.whatsapp.net",
  "sender": "'$TEST_PHONE'",
  "content": "Adios",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando comando: !help (no debería activar auto-respuesta)"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "'$TEST_PHONE'@s.whatsapp.net",
  "sender": "'$TEST_PHONE'",
  "content": "!help",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

echo "✅ Pruebas completadas. Revisa los logs del bot para verificar las respuestas."
