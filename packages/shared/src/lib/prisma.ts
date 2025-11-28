// Prisma Client Singleton
// Best practice: single instance across app to prevent connection pool exhaustion

import { PrismaClient } from '@prisma/client';

// Re-export Prisma namespace for type usage
export { Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Set tenant context for RLS (Row-Level Security)
 *
 * Usage:
 * ```ts
 * await setTenantContext('org_123');
 * const tournaments = await prisma.tournament.findMany();
 * // Only returns tournaments for org_123
 * ```
 */
export async function setTenantContext(orgId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`SET app.current_org_id = '${orgId}'`);
}

/**
 * Clear tenant context
 */
export async function clearTenantContext(): Promise<void> {
  await prisma.$executeRawUnsafe(`RESET app.current_org_id`);
}

/**
 * Execute a function with tenant context
 *
 * Usage:
 * ```ts
 * const tournaments = await withTenantContext('org_123', async () => {
 *   return await prisma.tournament.findMany();
 * });
 * ```
 */
export async function withTenantContext<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  await setTenantContext(orgId);
  try {
    return await fn();
  } finally {
    await clearTenantContext();
  }
}
