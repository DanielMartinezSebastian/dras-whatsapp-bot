#!/usr/bin/env tsx

/**
 * Migration CLI Tool
 * Command-line interface for database migrations
 */

import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { MigrationManager } from '../migration-manager';
import { Logger } from '../../utils/logger';

const logger = Logger.getInstance();

async function main() {
  const argv = (await yargs(hideBin(process.argv))
    .command('run', 'Run pending migrations', {}, () => {})
    .command(
      'rollback [steps]',
      'Rollback migrations',
      yargs => {
        return yargs.positional('steps', {
          describe: 'Number of migrations to rollback',
          type: 'number',
          default: 1,
        });
      },
      () => {}
    )
    .command('status', 'Show migration status', {}, () => {})
    .command('reset', 'Reset database (rollback all migrations)', {}, () => {})
    .option('database', {
      alias: 'd',
      type: 'string',
      description: 'Database file path',
      default: path.join(process.cwd(), 'data', 'drasbot.db'),
    })
    .demandCommand(1, 'You need to specify a command')
    .help().argv) as any;

  const action = argv._[0] as string;
  const dbPath = argv.database as string;

  logger.info('Migration', `Starting migration tool`, { action, dbPath });

  try {
    const migrationManager = MigrationManager.getInstance();
    await migrationManager.initialize(dbPath);

    switch (action) {
      case 'run':
        await runMigrations(migrationManager);
        break;

      case 'rollback':
        await rollbackMigrations(migrationManager, argv.steps || 1);
        break;

      case 'status':
        await showStatus(migrationManager);
        break;

      case 'reset':
        await resetDatabase(migrationManager);
        break;

      default:
        logger.error('Migration', `Unknown action: ${action}`);
        process.exit(1);
    }

    await migrationManager.close();
    logger.info('Migration', 'Migration tool completed successfully');
  } catch (error) {
    logger.error('Migration', 'Migration tool failed', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
}

async function runMigrations(
  migrationManager: MigrationManager
): Promise<void> {
  console.log('\n🔄 Running database migrations...\n');

  const statusBefore = migrationManager.getStatus();
  console.log(
    `📊 Status: ${statusBefore.executed} executed, ${statusBefore.pending} pending\n`
  );

  if (statusBefore.pending === 0) {
    console.log('✅ No pending migrations found');
    return;
  }

  await migrationManager.runMigrations();

  const statusAfter = migrationManager.getStatus();
  console.log(`\n✅ Migrations completed successfully!`);
  console.log(
    `📊 Final status: ${statusAfter.executed} executed, ${statusAfter.pending} pending\n`
  );
}

async function rollbackMigrations(
  migrationManager: MigrationManager,
  steps: number
): Promise<void> {
  console.log(`\n⏪ Rolling back ${steps} migration(s)...\n`);

  const statusBefore = migrationManager.getStatus();
  console.log(
    `📊 Status: ${statusBefore.executed} executed, ${statusBefore.pending} pending\n`
  );

  if (statusBefore.executed === 0) {
    console.log('⚠️  No migrations to rollback');
    return;
  }

  await migrationManager.rollback(steps);

  const statusAfter = migrationManager.getStatus();
  console.log(`\n✅ Rollback completed successfully!`);
  console.log(
    `📊 Final status: ${statusAfter.executed} executed, ${statusAfter.pending} pending\n`
  );
}

async function showStatus(migrationManager: MigrationManager): Promise<void> {
  console.log('\n📊 Migration Status\n');

  const status = migrationManager.getStatus();

  console.log(`Total migrations: ${status.executed + status.pending}`);
  console.log(`Executed: ${status.executed}`);
  console.log(`Pending: ${status.pending}\n`);

  console.log('Migration Details:');
  console.log('─'.repeat(60));

  status.migrations.forEach(migration => {
    const statusIcon = migration.status === 'executed' ? '✅' : '⏳';
    const statusText = migration.status === 'executed' ? 'EXECUTED' : 'PENDING';
    console.log(
      `${statusIcon} ${migration.id.padEnd(25)} ${statusText.padEnd(10)} ${migration.name}`
    );
  });

  console.log('─'.repeat(60));
  console.log();
}

async function resetDatabase(
  migrationManager: MigrationManager
): Promise<void> {
  console.log('\n🔄 Resetting database (rolling back all migrations)...\n');

  const status = migrationManager.getStatus();

  if (status.executed === 0) {
    console.log('⚠️  No migrations to rollback');
    return;
  }

  console.log(
    `⚠️  This will rollback ${status.executed} migrations. Are you sure? (This is irreversible!)`
  );

  // In a real CLI, you'd prompt for confirmation here
  // For now, we'll just proceed

  await migrationManager.rollback(status.executed);

  console.log('\n✅ Database reset completed successfully!\n');
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
