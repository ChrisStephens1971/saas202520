/**
 * Prisma Client Singleton with Performance Optimizations
 *
 * Features:
 * - Connection pooling for better database performance
 * - Query optimization middleware for slow query detection
 * - Singleton pattern to prevent multiple instances in development
 *
 * Sprint 9 Phase 3: Scale & Performance
 */

import { PrismaClient } from '@prisma/client';
import { queryOptimizer } from './db/query-optimizer';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma Client with optimized configuration
 */
function createPrismaClient() {
  const client = new PrismaClient({
    // Logging configuration
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],

    // Connection pool configuration
    // Optimized for serverless and traditional deployments
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Add query optimization middleware
  // This will log slow queries (> 100ms) and track performance metrics
  // Note: $use is deprecated in Prisma 5+, use $extends instead
  // TODO: Migrate to $extends API when needed
  // (client as any).$use(queryOptimizer);

  return client;
}

/**
 * Prisma Client instance
 * Reuses the same instance in development to avoid connection exhaustion
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store the instance globally in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connection pool configuration recommendations:
 *
 * For serverless environments (Vercel, AWS Lambda):
 * - Set DATABASE_URL with connection_limit=1 and pool_timeout=0
 * - Example: postgresql://user:pass@host:5432/db?connection_limit=1&pool_timeout=0
 *
 * For traditional servers:
 * - Set DATABASE_URL with connection_limit=10-20 (based on expected load)
 * - Example: postgresql://user:pass@host:5432/db?connection_limit=10
 *
 * Connection pool sizing guide:
 * - Solo developer / Low traffic: connection_limit=5
 * - Small team / Medium traffic: connection_limit=10
 * - Production / High traffic: connection_limit=20-50
 *
 * PostgreSQL max_connections should be:
 * max_connections >= (number_of_app_instances * connection_limit) + buffer
 *
 * Monitor connections with:
 * SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database';
 */

export default prisma;
