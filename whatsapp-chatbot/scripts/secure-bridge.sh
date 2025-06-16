#!/bin/bash

# Script para configurar el WhatsApp Bridge de forma segura
echo "🔒 Configurando WhatsApp Bridge con seguridad..."

# Detectar directorio del proyecto automáticamente
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BRIDGE_DIR="$PROJECT_ROOT/whatsapp-bridge"
BACKUP_DIR="$BRIDGE_DIR/backup-$(date +%Y%m%d-%H%M%S)"

# Crear backup del main.go original
echo "💾 Creando backup del main.go original..."
mkdir -p "$BACKUP_DIR"
cp "$BRIDGE_DIR/main.go" "$BACKUP_DIR/main.go.original"

# Crear versión segura del main.go
echo "🛡️  Aplicando configuración segura..."

# Buscar la línea que contiene ListenAndServe y reemplazarla
sed -i 's/http\.ListenAndServe(serverAddr, nil)/http.ListenAndServe("127.0.0.1"+serverAddr, nil)/' "$BRIDGE_DIR/main.go"

# También modificar el mensaje de log para mostrar que es solo local
sed -i 's/fmt\.Printf("Starting REST API server on %s\\.\\.\\.", serverAddr)/fmt.Printf("Starting REST API server on 127.0.0.1%s (LOCAL ONLY)...", serverAddr)/' "$BRIDGE_DIR/main.go"

echo "✅ Configuración de seguridad aplicada al WhatsApp Bridge"
echo "📍 El servidor ahora solo escuchará en 127.0.0.1:8080"
echo "💾 Backup guardado en: $BACKUP_DIR"
echo ""
echo "🔄 Para aplicar los cambios, reinicia el bridge:"
echo "   cd $BRIDGE_DIR"
echo "   go run main.go"
