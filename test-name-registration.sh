#!/bin/bash

# Test script for Name Registration System
# This script tests the name registration flow for DrasBot

echo "🧪 Testing DrasBot Name Registration System"
echo "=========================================="

# Set working directory
cd /home/dras/Documentos/PROGRAMACION/drasBot/drasbot

echo ""
echo "📋 Test Plan:"
echo "1. Start the bot"
echo "2. Test new user welcome flow"
echo "3. Test name detection with natural language"
echo "4. Test command-based name registration"
echo "5. Test name update functionality"
echo "6. Test profile display"
echo ""

echo "🔧 Prerequisites Check:"

# Check if Node.js is available
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
    exit 1
fi

# Check if npm is available
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
    exit 1
fi

# Check if TypeScript is available
if command -v npx tsc &> /dev/null; then
    echo "✅ TypeScript available"
else
    echo "❌ TypeScript not found"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🗃️ Database setup..."
# Ensure data directory exists
mkdir -p data

echo ""
echo "📝 Test Scenarios:"
echo ""
echo "Scenario 1: New User Welcome"
echo "- Send a greeting message from a new user"
echo "- Bot should welcome the user and ask for their name"
echo ""
echo "Scenario 2: Natural Language Name Registration"
echo "- User says 'Me llamo Juan'"
echo "- Bot should register the name and confirm"
echo ""
echo "Scenario 3: Command-based Name Registration"
echo "- User types '!mellamo María'"
echo "- Bot should register the name and confirm"
echo ""
echo "Scenario 4: Name Update"
echo "- Registered user changes their name"
echo "- Bot should update the name and confirm"
echo ""
echo "Scenario 5: Profile Display"
echo "- User types '!quien-soy'"
echo "- Bot should show current profile information"
echo ""

echo "🚀 Ready to test! To start the bot, run:"
echo "   npm start"
echo ""
echo "💡 Test Commands to try:"
echo "   - Hola (from new user)"
echo "   - Me llamo Juan"
echo "   - !mellamo María"
echo "   - !soy Pedro"
echo "   - Llamame Ana"
echo "   - !quien-soy"
echo "   - !mi-info"
echo "   - !perfil"
echo "   - !profile"
echo ""

echo "📋 Expected Flow for New Users:"
echo "1. User sends 'Hola' → Bot welcomes and asks for name"
echo "2. User responds with name → Bot registers and confirms"
echo "3. User can later check profile with !quien-soy"
echo ""

echo "⚠️  Important Notes:"
echo "- Test with WhatsApp numbers that haven't used the bot before"
echo "- Name validation prevents phone numbers as names"
echo "- Context expires after 5 minutes of inactivity"
echo "- Users can change their name at any time"
echo ""

echo "✅ Test environment ready!"
