#!/bin/bash

# Migration Script for DrasBot v2.0
# Migrates from old whatsapp-chatbot to new TypeScript architecture

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLD_BOT_DIR="$SCRIPT_DIR/../whatsapp-chatbot"
NEW_BOT_DIR="$SCRIPT_DIR/../drasbot-new"
BRIDGE_DIR="$SCRIPT_DIR/../whatsapp-bridge"

# Colors for output
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
    echo "║       🔄 DrasBot Migration v2.0          ║"
    echo "║    From JavaScript to TypeScript         ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Backup function
create_backup() {
    echo -e "${BLUE}📦 Creating backup of current system...${NC}"
    
    local backup_name="drasbot-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="$SCRIPT_DIR/../$backup_name"
    
    mkdir -p "$backup_dir"
    
    # Backup old chatbot
    if [ -d "$OLD_BOT_DIR" ]; then
        echo -e "${CYAN}   📂 Backing up whatsapp-chatbot...${NC}"
        cp -r "$OLD_BOT_DIR" "$backup_dir/whatsapp-chatbot-backup"
    fi
    
    # Backup bridge if exists
    if [ -d "$BRIDGE_DIR" ]; then
        echo -e "${CYAN}   📂 Backing up whatsapp-bridge...${NC}"
        cp -r "$BRIDGE_DIR" "$backup_dir/whatsapp-bridge-backup"
    fi
    
    # Backup any database files
    if [ -f "$OLD_BOT_DIR/data/users.db" ]; then
        echo -e "${CYAN}   🗄️  Backing up database...${NC}"
        mkdir -p "$backup_dir/data"
        cp "$OLD_BOT_DIR/data/users.db" "$backup_dir/data/"
    fi
    
    echo -e "${GREEN}✅ Backup created at: $backup_dir${NC}"
    echo "$backup_dir" > "$SCRIPT_DIR/.last_backup"
}

# Migrate database function
migrate_database() {
    echo -e "${BLUE}🗄️  Migrating database...${NC}"
    
    local old_db="$OLD_BOT_DIR/data/users.db"
    local new_data_dir="$NEW_BOT_DIR/data"
    
    if [ ! -f "$old_db" ]; then
        echo -e "${YELLOW}⚠️  No database found to migrate${NC}"
        return
    fi
    
    mkdir -p "$new_data_dir"
    
    # Copy old database as legacy backup
    cp "$old_db" "$new_data_dir/legacy-users.db"
    
    echo -e "${GREEN}✅ Database backed up to new system${NC}"
    echo -e "${CYAN}💡 New TypeScript system will migrate data on first run${NC}"
}

# Migrate configuration function
migrate_config() {
    echo -e "${BLUE}⚙️  Migrating configuration...${NC}"
    
    # Create .env from old config if exists
    local old_config="$OLD_BOT_DIR/.env"
    local new_env="$NEW_BOT_DIR/.env"
    
    if [ -f "$old_config" ]; then
        echo -e "${CYAN}   📝 Copying environment variables...${NC}"
        
        # Copy base .env.example
        cp "$NEW_BOT_DIR/.env.example" "$new_env"
        
        # Extract values from old config
        if grep -q "BRIDGE_URL" "$old_config"; then
            local bridge_url=$(grep "BRIDGE_URL" "$old_config" | cut -d'=' -f2)
            sed -i "s|BRIDGE_URL=.*|BRIDGE_URL=$bridge_url|" "$new_env"
        fi
        
        echo -e "${GREEN}✅ Configuration migrated${NC}"
    else
        echo -e "${YELLOW}⚠️  No old configuration found, using defaults${NC}"
        cp "$NEW_BOT_DIR/.env.example" "$NEW_BOT_DIR/.env"
    fi
}

# Install dependencies function
install_dependencies() {
    echo -e "${BLUE}📦 Installing new dependencies...${NC}"
    
    cd "$NEW_BOT_DIR"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install Node.js${NC}"
        return 1
    fi
    
    echo -e "${CYAN}   📥 Running npm install...${NC}"
    npm install
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Setup new system function
setup_new_system() {
    echo -e "${BLUE}🔧 Setting up new TypeScript system...${NC}"
    
    cd "$NEW_BOT_DIR"
    
    # Create necessary directories
    mkdir -p data logs
    
    # Build TypeScript
    echo -e "${CYAN}   🔨 Building TypeScript...${NC}"
    npm run build
    
    echo -e "${GREEN}✅ New system setup complete${NC}"
}

# Stop old system function
stop_old_system() {
    echo -e "${BLUE}🛑 Stopping old system...${NC}"
    
    # Stop PM2 processes
    pm2 delete whatsapp-chatbot 2>/dev/null || true
    pm2 delete drasbot-chatbot 2>/dev/null || true
    
    # Stop any node processes running the old bot
    pkill -f "node.*src/app.js" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Old system stopped${NC}"
}

# Test new system function
test_new_system() {
    echo -e "${BLUE}🧪 Testing new system...${NC}"
    
    cd "$NEW_BOT_DIR"
    
    # Run tests if available
    if npm list jest &>/dev/null; then
        echo -e "${CYAN}   🔬 Running tests...${NC}"
        npm test
    fi
    
    # Try to build
    echo -e "${CYAN}   🔨 Testing build...${NC}"
    npm run build
    
    echo -e "${GREEN}✅ Tests passed${NC}"
}

# Start new system function
start_new_system() {
    echo -e "${BLUE}🚀 Starting new system...${NC}"
    
    cd "$NEW_BOT_DIR"
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    
    echo -e "${GREEN}✅ New system started${NC}"
    echo -e "${CYAN}💡 Use 'pm2 logs drasbot-new' to see logs${NC}"
    echo -e "${CYAN}💡 Use 'pm2 status' to check status${NC}"
}

# Show migration status
show_status() {
    echo -e "${PURPLE}📊 Migration Status${NC}"
    echo "=================="
    
    echo -e "${BLUE}Old System:${NC}"
    if pm2 jlist 2>/dev/null | grep -q "whatsapp-chatbot\|drasbot-chatbot"; then
        echo "   🟡 Still running"
    else
        echo "   🔴 Stopped"
    fi
    
    echo -e "${BLUE}New System:${NC}"
    if pm2 jlist 2>/dev/null | grep -q "drasbot-new"; then
        echo "   🟢 Running"
    else
        echo "   🔴 Not started"
    fi
    
    echo -e "${BLUE}Bridge:${NC}"
    if pm2 jlist 2>/dev/null | grep -q "drasbot-bridge"; then
        echo "   🟢 PM2 mode"
    elif tmux has-session -t drasbot-bridge 2>/dev/null; then
        echo "   🟡 tmux mode"
    else
        echo "   🔴 Not running"
    fi
}

# Rollback function
rollback() {
    echo -e "${YELLOW}🔄 Rolling back to old system...${NC}"
    
    if [ ! -f "$SCRIPT_DIR/.last_backup" ]; then
        echo -e "${RED}❌ No backup found to rollback${NC}"
        return 1
    fi
    
    local backup_dir=$(cat "$SCRIPT_DIR/.last_backup")
    
    if [ ! -d "$backup_dir" ]; then
        echo -e "${RED}❌ Backup directory not found: $backup_dir${NC}"
        return 1
    fi
    
    # Stop new system
    pm2 delete drasbot-new 2>/dev/null || true
    
    # Restore old system
    if [ -d "$backup_dir/whatsapp-chatbot-backup" ]; then
        rm -rf "$OLD_BOT_DIR"
        cp -r "$backup_dir/whatsapp-chatbot-backup" "$OLD_BOT_DIR"
    fi
    
    # Start old system
    cd "$OLD_BOT_DIR"
    pm2 start config/ecosystem.config.js --env production
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Main migration function
run_migration() {
    show_banner
    
    echo -e "${BLUE}🚀 Starting migration process...${NC}"
    echo ""
    
    # Step 1: Create backup
    create_backup
    echo ""
    
    # Step 2: Stop old system
    stop_old_system
    echo ""
    
    # Step 3: Install dependencies
    install_dependencies
    echo ""
    
    # Step 4: Migrate configuration
    migrate_config
    echo ""
    
    # Step 5: Migrate database
    migrate_database
    echo ""
    
    # Step 6: Setup new system
    setup_new_system
    echo ""
    
    # Step 7: Test new system
    test_new_system
    echo ""
    
    # Step 8: Start new system
    start_new_system
    echo ""
    
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}📋 Next steps:${NC}"
    echo "   1. Test the new system thoroughly"
    echo "   2. Check logs: pm2 logs drasbot-new"
    echo "   3. Monitor status: pm2 status"
    echo "   4. If issues, rollback: $0 rollback"
    echo ""
    show_status
}

# Command line interface
case "${1:-help}" in
    "migrate"|"run")
        run_migration
        ;;
    "backup")
        create_backup
        ;;
    "test")
        test_new_system
        ;;
    "start")
        start_new_system
        ;;
    "stop")
        pm2 delete drasbot-new 2>/dev/null || true
        echo -e "${GREEN}✅ New system stopped${NC}"
        ;;
    "status")
        show_status
        ;;
    "rollback")
        rollback
        ;;
    "help"|*)
        show_banner
        echo ""
        echo "Migration commands:"
        echo ""
        echo -e "${GREEN}🔄 MIGRATION${NC}"
        echo -e "  ${CYAN}migrate${NC}    - Run complete migration process"
        echo -e "  ${CYAN}backup${NC}     - Create backup only"
        echo -e "  ${CYAN}rollback${NC}   - Rollback to old system"
        echo ""
        echo -e "${GREEN}🧪 TESTING${NC}"
        echo -e "  ${CYAN}test${NC}       - Test new system"
        echo -e "  ${CYAN}status${NC}     - Show migration status"
        echo ""
        echo -e "${GREEN}🎛️  CONTROL${NC}"
        echo -e "  ${CYAN}start${NC}      - Start new system"
        echo -e "  ${CYAN}stop${NC}       - Stop new system"
        echo ""
        echo "Example: ${CYAN}$0 migrate${NC}"
        ;;
esac
