/**
 * Playwright Global Setup
 * Sprint 7 - E2E Testing (TEST-002)
 *
 * Runs once before all tests to set up test environment:
 * - Create test database
 * - Run migrations
 * - Seed test data
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup() {
  console.log('\n🧪 Setting up E2E test environment...\n');

  try {
    // 1. Create test database (if it doesn't exist)
    console.log('📦 Creating test database...');
    try {
      await execAsync('psql -U postgres -c "CREATE DATABASE saas202520_test;"');
      console.log('✅ Test database created');
    } catch (error) {
      // Database might already exist
      console.log('ℹ️  Test database already exists');
    }

    // 2. Run Prisma migrations on test database
    console.log('🔄 Running database migrations...');
    await execAsync('pnpm prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/saas202520_test?schema=public',
      },
    });
    console.log('✅ Migrations complete');

    // 3. Generate Prisma client
    console.log('⚙️  Generating Prisma client...');
    await execAsync('pnpm prisma generate');
    console.log('✅ Prisma client generated');

    // 4. Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData();
    console.log('✅ Test data seeded');

    console.log('\n✅ E2E test environment ready!\n');
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    throw error;
  }
}

/**
 * Seed minimal test data for E2E tests
 */
async function seedTestData() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:postgres@localhost:5432/saas202520_test?schema=public',
      },
    },
  });

  try {
    // Create test user
    await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: new Date(),
      },
    });

    console.log('  - Created test user');

    // Create test game
    await prisma.game.upsert({
      where: { slug: 'test-game' },
      update: {},
      create: {
        name: 'Test Game',
        slug: 'test-game',
        description: 'Game for E2E testing',
      },
    });

    console.log('  - Created test game');
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
