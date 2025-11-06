/**
 * Playwright Global Teardown
 * Sprint 7 - E2E Testing (TEST-002)
 *
 * Runs once after all tests to clean up test environment:
 * - Clean up test data
 * - Close database connections
 * - Optional: Drop test database
 */

async function globalTeardown() {
  console.log('\n🧹 Cleaning up E2E test environment...\n');

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:postgres@localhost:5432/saas202520_test?schema=public',
      },
    },
  });

  try {
    // Clean up test data (but keep database for inspection if needed)
    console.log('🗑️  Removing test data...');

    // Delete in reverse order of foreign key dependencies
    await prisma.chipAward.deleteMany({});
    await prisma.match.deleteMany({});
    await prisma.tournamentPlayer.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ Test data cleaned');

    // Uncomment to drop test database entirely
    // const { exec } = require('child_process');
    // const { promisify } = require('util');
    // const execAsync = promisify(exec);
    // await execAsync('psql -U postgres -c "DROP DATABASE IF EXISTS saas202520_test;"');
    // console.log('✅ Test database dropped');

    console.log('\n✅ E2E test cleanup complete!\n');
  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
