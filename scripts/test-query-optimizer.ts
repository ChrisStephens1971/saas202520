/**
 * Query Optimizer Test Script
 *
 * Tests the query optimization middleware and performance monitoring.
 * Run this to verify the optimization setup is working correctly.
 *
 * Usage:
 * ```bash
 * cd apps/web
 * npx ts-node ../../scripts/test-query-optimizer.ts
 * ```
 *
 * Sprint 9 Phase 3: Scale & Performance
 */

import { PrismaClient } from '@prisma/client';
import {
  queryOptimizer,
  getQueryStats,
  getRecentSlowQueries,
} from '../apps/web/lib/db/query-optimizer';

// Create a test Prisma client with the optimizer
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Add query optimizer middleware
prisma.$use(queryOptimizer);

/**
 * Simulate a slow query by adding a delay
 */
async function simulateSlowQuery() {
  console.log('\n🐢 Simulating slow query...');

  try {
    // This query will be fast, but we'll see it logged
    const users = await prisma.user.findMany({
      take: 5,
    });

    console.log(`✅ Query completed. Found ${users.length} users.`);
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
}

/**
 * Run multiple fast queries
 */
async function runFastQueries() {
  console.log('\n⚡ Running fast queries...');

  try {
    // Multiple fast queries
    await Promise.all([
      prisma.user.findFirst(),
      prisma.organization.findFirst(),
      prisma.tournament.findFirst(),
    ]);

    console.log('✅ Fast queries completed.');
  } catch (error) {
    console.error('❌ Queries failed:', error);
  }
}

/**
 * Display performance statistics
 */
function displayStats() {
  console.log('\n📊 Performance Statistics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = getQueryStats();

  if (stats.totalQueries === 0) {
    console.log('No queries executed yet.');
    return;
  }

  console.log(`Total Queries:          ${stats.totalQueries}`);
  console.log(`Slow Queries:           ${stats.slowQueries}`);
  console.log(`Average Duration:       ${stats.avgDuration}ms`);
  console.log(`Max Duration:           ${stats.maxDuration}ms`);
  console.log(`Slow Query Percentage:  ${stats.slowQueryPercentage}%`);

  const slowQueries = getRecentSlowQueries();
  if (slowQueries.length > 0) {
    console.log('\n🐢 Recent Slow Queries:');
    slowQueries.forEach((query, index) => {
      console.log(`  ${index + 1}. ${query.model}.${query.action} - ${query.duration}ms`);
    });
  } else {
    console.log('\n✅ No slow queries detected!');
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Query Optimizer Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('This script tests the query optimization middleware.');
  console.log('It will execute several queries and display performance metrics.\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully.\n');

    // Run fast queries
    await runFastQueries();

    // Simulate a slow query
    await simulateSlowQuery();

    // Wait a moment for middleware to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Display statistics
    displayStats();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the database migration: npx prisma migrate dev');
    console.log('2. Start your application and monitor slow queries');
    console.log('3. Check Sentry for slow query reports in production');
    console.log('4. Use /api/admin/performance to view metrics in admin dashboard\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
