#!/usr/bin/env tsx

/**
 * Database Seeding CLI Tool
 * Command-line interface for database seeding
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DatabaseSeeder } from '../database-seeder';
import { Logger } from '../../utils/logger';

const logger = Logger.getInstance();

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .command('run [environment]', 'Seed the database', yargs => {
      return yargs.positional('environment', {
        describe: 'Environment to seed for',
        type: 'string',
        choices: ['development', 'test', 'production'],
        default: 'development',
      });
    })
    .command('status', 'Show database statistics', {})
    .command('clear', 'Clear all database data (use with caution!)', {})
    .demandCommand(1, 'You need to specify a command')
    .help().argv) as any;

  const command = argv._[0] as string;

  logger.info('DatabaseSeeder', `Starting seeding tool`, { command });

  try {
    const seeder = DatabaseSeeder.getInstance();

    switch (command) {
      case 'run':
        await runSeeding(seeder, argv.environment || 'development');
        break;

      case 'status':
        await showStatus(seeder);
        break;

      case 'clear':
        await clearData(seeder);
        break;

      default:
        logger.error('DatabaseSeeder', `Unknown command: ${command}`);
        process.exit(1);
    }

    logger.info('DatabaseSeeder', 'Seeding tool completed successfully');
  } catch (error) {
    logger.error('DatabaseSeeder', 'Seeding tool failed', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
}

async function runSeeding(
  seeder: DatabaseSeeder,
  environment: string
): Promise<void> {
  console.log(`\n🌱 Seeding database for ${environment} environment...\n`);

  // First seed, which will initialize the database
  await seeder.seed(environment as any);

  // Then get stats
  const statsAfter = await seeder.getStats();
  console.log(`\n✅ Seeding completed successfully!`);
  console.log(
    `📊 Final stats: ${statsAfter.users} users, ${statsAfter.messages} messages, ${statsAfter.contexts} contexts\n`
  );
}

async function showStatus(seeder: DatabaseSeeder): Promise<void> {
  console.log('\n📊 Database Statistics\n');

  const stats = await seeder.getStats();

  console.log('Current Data:');
  console.log('─'.repeat(40));
  console.log(`👥 Users:     ${stats.users.toString().padStart(8)}`);
  console.log(`💬 Messages:  ${stats.messages.toString().padStart(8)}`);
  console.log(`🔄 Contexts:  ${stats.contexts.toString().padStart(8)}`);
  console.log('─'.repeat(40));
  console.log();
}

async function clearData(seeder: DatabaseSeeder): Promise<void> {
  console.log('\n⚠️  WARNING: This will clear all database data!\n');
  console.log('This action is irreversible. In a production environment,');
  console.log('you should use migration rollback instead.\n');

  // In a real CLI, you'd prompt for confirmation here
  console.log('Proceeding with data clearing...\n');

  try {
    await seeder.clearAllData();
    console.log('✅ Database data cleared successfully!\n');
  } catch (error) {
    console.log('⚠️  Clear operation not fully implemented.');
    console.log('Use migration reset instead: npm run migrate reset\n');
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
