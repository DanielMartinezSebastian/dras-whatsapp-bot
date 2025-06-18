#!/bin/bash

# Script para probar el sistema de auto-respuestas
echo "🧪 Probando el sistema de auto-respuestas del bot..."

WEBHOOK_URL="http://localhost:3000/webhook/whatsapp"

echo "📨 Enviando mensaje: Hola"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "529934516094@s.whatsapp.net",
  "sender": "529934516094",
  "content": "Hola",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando mensaje: Gracias"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "529934516095@s.whatsapp.net",
  "sender": "529934516095",
  "content": "Gracias",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando mensaje: Que tal"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "529934516096@s.whatsapp.net",
  "sender": "529934516096",
  "content": "Que tal",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando mensaje: Adios"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "529934516097@s.whatsapp.net",
  "sender": "529934516097",
  "content": "Adios",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

sleep 2

echo "📨 Enviando comando: !help (no debería activar auto-respuesta)"
curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "chat_jid": "529934516098@s.whatsapp.net",
  "sender": "529934516098",
  "content": "!help",
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
}' | jq '.'

echo "✅ Pruebas completadas. Revisa los logs del bot para verificar las respuestas."
