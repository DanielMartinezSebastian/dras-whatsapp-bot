#!/bin/bash

# WhatsApp Bridge Build and Run Script
# This script builds and runs the Go WhatsApp bridge server

set -e

echo "🔌 WhatsApp Bridge Builder"
echo "=========================="

BRIDGE_DIR="/home/dras/Documentos/PROGRAMACION/drasBot/whatsapp-bridge"
BUILD_DIR="$BRIDGE_DIR/build"

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Change to bridge directory
cd "$BRIDGE_DIR"

echo "📦 Building WhatsApp Bridge..."

# Build the Go application
go build -o "$BUILD_DIR/whatsapp-bridge" main.go

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📍 Binary location: $BUILD_DIR/whatsapp-bridge"
    echo ""
    
    # Ask if user wants to run the bridge
    read -p "🚀 Do you want to run the bridge now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Starting WhatsApp Bridge..."
        echo "⚠️  Make sure to scan the QR code when it appears"
        echo "🔌 Bridge will be available at: http://127.0.0.1:8080"
        echo "📋 Available endpoints:"
        echo "   POST /api/send - Send messages"
        echo "   POST /api/download - Download media"
        echo "   GET  /api/status - Connection status"
        echo "   GET  /api/qr - Get QR code"
        echo "   GET  /api/info - Bridge information"
        echo "   POST /api/disconnect - Disconnect"
        echo ""
        echo "Press Ctrl+C to stop the bridge"
        echo "=================================="
        
        # Run the bridge
        "$BUILD_DIR/whatsapp-bridge"
    else
        echo "📝 To run the bridge manually:"
        echo "   cd $BRIDGE_DIR"
        echo "   $BUILD_DIR/whatsapp-bridge"
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
