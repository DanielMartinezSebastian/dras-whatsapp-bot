#!/usr/bin/env tsx

/**
 * DrasBot Setup Script
 * Initial setup and configuration for DrasBot v2.0
 */

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Logger } from '../src/utils/logger';
import { DatabaseService } from '../src/services/database.service';
import { MigrationManager } from '../src/database/migration-manager';
import { DatabaseSeeder } from '../src/database/database-seeder';

const logger = Logger.getInstance();

interface SetupOptions {
  environment: 'development' | 'production';
  skipMigrations: boolean;
  skipSeeding: boolean;
  ownerPhone?: string;
  ownerName?: string;
}

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .option('environment', {
      alias: 'e',
      type: 'string',
      choices: ['development', 'production'],
      default: 'development',
      description: 'Environment to setup for',
    })
    .option('skip-migrations', {
      type: 'boolean',
      default: false,
      description: 'Skip running database migrations',
    })
    .option('skip-seeding', {
      type: 'boolean',
      default: false,
      description: 'Skip database seeding',
    })
    .option('owner-phone', {
      type: 'string',
      description: 'Phone number of the bot owner (production only)',
    })
    .option('owner-name', {
      type: 'string',
      description: 'Name of the bot owner (production only)',
    })
    .help().argv) as any;

  const options: SetupOptions = {
    environment: argv.environment,
    skipMigrations: argv.skipMigrations,
    skipSeeding: argv.skipSeeding,
    ownerPhone: argv.ownerPhone,
    ownerName: argv.ownerName,
  };

  console.log('\n🚀 DrasBot v2.0 Setup\n');
  console.log(`Environment: ${options.environment}`);
  console.log(`Skip Migrations: ${options.skipMigrations}`);
  console.log(`Skip Seeding: ${options.skipSeeding}\n`);

  try {
    await setupDirectories();
    await setupEnvironmentFile(options);

    if (!options.skipMigrations) {
      await runMigrations();
    }

    if (!options.skipSeeding) {
      await runSeeding(options);
    }

    await verifySetup();

    console.log('\n✅ DrasBot v2.0 setup completed successfully!\n');
    printNextSteps(options);
  } catch (error) {
    logger.error('Setup', 'Setup failed', {
      error: error instanceof Error ? error.message : error,
    });
    console.error(
      '\n❌ Setup failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

async function setupDirectories(): Promise<void> {
  console.log('📁 Creating directories...');

  const directories = ['data', 'logs', 'config', 'exports', 'backups', 'temp'];

  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`   ✓ Created ${dir}/`);
    } else {
      console.log(`   • ${dir}/ already exists`);
    }
  }

  console.log('');
}

async function setupEnvironmentFile(options: SetupOptions): Promise<void> {
  console.log('⚙️  Setting up environment configuration...');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Create .env.example if it doesn't exist
  if (!fs.existsSync(envExamplePath)) {
    const envExample = generateEnvironmentTemplate();
    fs.writeFileSync(envExamplePath, envExample);
    console.log('   ✓ Created .env.example');
  }

  // Create .env if it doesn't exist
  if (!fs.existsSync(envPath)) {
    let envContent = generateEnvironmentTemplate();

    // Customize for environment
    if (options.environment === 'production') {
      envContent = envContent.replace(
        'NODE_ENV=development',
        'NODE_ENV=production'
      );
      envContent = envContent.replace('LOG_LEVEL=debug', 'LOG_LEVEL=info');

      if (options.ownerPhone) {
        envContent = envContent.replace(
          '# OWNER_PHONE=',
          `OWNER_PHONE=${options.ownerPhone}`
        );
      }

      if (options.ownerName) {
        envContent = envContent.replace(
          '# OWNER_NAME=',
          `OWNER_NAME=${options.ownerName}`
        );
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('   ✓ Created .env file');
  } else {
    console.log('   • .env file already exists');
  }

  console.log('');
}

function generateEnvironmentTemplate(): string {
  return `# DrasBot v2.0 Environment Configuration

# Application
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# Database
DATABASE_PATH=./data/drasbot.db

# WhatsApp Bridge
WHATSAPP_BRIDGE_URL=http://localhost:8080
WHATSAPP_BRIDGE_TIMEOUT=30000
WHATSAPP_BRIDGE_API_KEY=

# Bot Configuration
BOT_NAME=DrasBot
DEFAULT_LANGUAGE=es
MAX_MESSAGE_LENGTH=4000
COMMAND_PREFIX=!

# Owner Configuration (Production)
# OWNER_PHONE=
# OWNER_NAME=

# Security
SESSION_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Features
ENABLE_ANALYTICS=true
ENABLE_AUTO_BACKUP=true
BACKUP_INTERVAL=24h

# Rate Limiting
RATE_LIMIT_WINDOW=60s
RATE_LIMIT_MAX_REQUESTS=10

# Monitoring
HEALTH_CHECK_INTERVAL=30s
PERFORMANCE_MONITORING=true
`;
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');

  try {
    const dbPath = path.join(process.cwd(), 'data', 'drasbot.db');
    const migrationManager = MigrationManager.getInstance();

    await migrationManager.initialize(dbPath);
    await migrationManager.runMigrations();
    await migrationManager.close();

    console.log('   ✓ Migrations completed successfully\n');
  } catch (error) {
    console.log('   ❌ Migration failed');
    throw error;
  }
}

async function runSeeding(options: SetupOptions): Promise<void> {
  console.log(`🌱 Seeding database for ${options.environment}...`);

  try {
    // Set environment variables for production seeding
    if (options.environment === 'production') {
      if (options.ownerPhone) {
        process.env.OWNER_PHONE = options.ownerPhone;
      }
      if (options.ownerName) {
        process.env.OWNER_NAME = options.ownerName;
      }
    }

    const seeder = DatabaseSeeder.getInstance();
    await seeder.seed(options.environment);

    console.log('   ✓ Database seeding completed successfully\n');
  } catch (error) {
    console.log('   ❌ Seeding failed');
    throw error;
  }
}

async function verifySetup(): Promise<void> {
  console.log('🔍 Verifying setup...');

  try {
    // Test database connection
    const db = DatabaseService.getInstance();
    await db.initialize();

    const stats = await db.getUserStats();
    console.log(`   ✓ Database connected (${stats.totalUsers} users)`);

    await db.close();

    // Check required files
    const requiredFiles = [
      '.env',
      'data/drasbot.db',
      'config/main.json',
      'config/messages/es.json',
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`   ✓ ${file} exists`);
      } else {
        console.log(`   ⚠ ${file} missing (optional)`);
      }
    }

    console.log('');
  } catch (error) {
    console.log('   ❌ Verification failed');
    throw error;
  }
}

function printNextSteps(options: SetupOptions): void {
  console.log('📋 Next Steps:\n');

  if (options.environment === 'development') {
    console.log('1. Review and modify config files in config/');
    console.log('2. Start the WhatsApp bridge service');
    console.log('3. Run the bot in development mode:');
    console.log('   npm run dev\n');
    console.log('4. Run tests to verify everything works:');
    console.log('   npm test\n');
  } else {
    console.log('1. Configure your production environment variables');
    console.log('2. Set up your WhatsApp bridge service');
    console.log('3. Configure process management (PM2):');
    console.log('   npm run build');
    console.log('   pm2 start ecosystem.config.js\n');
    console.log('4. Set up monitoring and logging');
    console.log('5. Configure backups and health checks\n');
  }

  console.log('🔗 Useful Commands:');
  console.log('   npm run build      - Compile TypeScript');
  console.log('   npm run dev        - Start in development mode');
  console.log('   npm run start      - Start in production mode');
  console.log('   npm test          - Run test suite');
  console.log('   npm run migrate    - Run database migrations');
  console.log('   npm run seed       - Seed database with test data');
  console.log('');
  console.log('📚 Documentation: ./README.md');
  console.log('');
}

// Run the setup
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
