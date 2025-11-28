/**
 * Cache Usage Examples
 * Sprint 9 Phase 3 - Scale & Performance
 *
 * This file demonstrates how to use the Redis caching service
 * in various scenarios. These are example patterns you can
 * adapt for your own use cases.
 */

import { prisma } from '@/lib/prisma';
import {
  cacheService,
  TournamentCache,
  UserCache,
  AnalyticsCache,
  CacheTTL,
  cacheAside,
  writeThrough,
  emitCacheEvent,
  CacheEvent,
} from '@/lib/cache';

/**
 * Example 1: Basic cache operations
 */
export async function example1_BasicOperations() {
  const tenantId = 'demo-tenant';

  // Set a value
  await cacheService.set(tenantId, 'user:123', { name: 'John' }, 300);

  // Get a value
  const user = await cacheService.get(tenantId, 'user:123');
  console.log('Cached user:', user);

  // Delete a value
  await cacheService.delete(tenantId, 'user:123');

  // Check if exists
  const exists = await cacheService.exists(tenantId, 'user:123');
  console.log('User exists:', exists);
}

/**
 * Example 2: Cache-aside pattern (lazy loading)
 *
 * This is the most common caching pattern:
 * 1. Check cache first
 * 2. If miss, fetch from database
 * 3. Store in cache for next time
 */
export async function example2_CacheAsidePattern(tenantId: string, tournamentId: string) {
  const tournament = await cacheAside(
    tenantId,
    `tournament:${tournamentId}`,
    async () => {
      // This function only runs on cache miss
      console.log('Cache miss - fetching from database');
      return await prisma.tournament.findUnique({
        where: { id: tournamentId, orgId: tenantId },
        include: {
          players: true,
          matches: true,
        },
      });
    },
    CacheTTL.TOURNAMENT // 5 minutes
  );

  return tournament;
}

/**
 * Example 3: Write-through pattern
 *
 * Updates both cache and database simultaneously
 */
export async function example3_WriteThroughPattern(
  tenantId: string,
  tournamentId: string,
  updates: Record<string, unknown>
) {
  const success = await writeThrough(
    tenantId,
    `tournament:${tournamentId}`,
    updates,
    async () => {
      // Update database
      await prisma.tournament.update({
        where: { id: tournamentId, orgId: tenantId },
        data: updates,
      });
    },
    CacheTTL.TOURNAMENT
  );

  return success;
}

/**
 * Example 4: Using tournament cache strategies
 */
export async function example4_TournamentStrategies(tenantId: string, tournamentId: string) {
  // Cache tournament data
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId, orgId: tenantId },
  });
  if (tournament) {
    await TournamentCache.setTournament(tenantId, tournamentId, tournament as any);
  }

  // Retrieve from cache
  const cached = await TournamentCache.getTournament(tenantId, tournamentId);

  // Cache leaderboard
  const leaderboard = await prisma.player.findMany({
    where: { tournamentId, tournament: { orgId: tenantId } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  await TournamentCache.setLeaderboard(tenantId, tournamentId, leaderboard as any);

  // Invalidate when tournament updates
  await TournamentCache.invalidateTournament(tenantId, tournamentId);

  return cached;
}

/**
 * Example 5: Event-based cache invalidation
 *
 * Automatically invalidate related cache when data changes
 */
export async function example5_EventBasedInvalidation(
  tenantId: string,
  tournamentId: string,
  matchId: string
) {
  // Update match
  await prisma.match.update({
    where: { id: matchId },
    data: { state: 'completed' },
  });

  // Emit cache event to invalidate related data
  await emitCacheEvent(
    CacheEvent.MATCH_COMPLETED,
    tenantId,
    matchId,
    [tournamentId] // Related tournament ID
  );

  // This will automatically invalidate:
  // - Tournament matches cache
  // - Tournament leaderboard cache
  // - Tournament summary cache
  // - Tournament analytics cache
}

/**
 * Example 6: User session caching
 */
export async function example6_UserSessionCaching(
  tenantId: string,
  userId: string,
  sessionData: unknown
) {
  // Store session (24 hour TTL)
  await UserCache.setSession(tenantId, userId, sessionData as any);

  // Retrieve session
  const session = await UserCache.getSession(tenantId, userId);

  // When user logs out, clear session
  await UserCache.deleteSession(tenantId, userId);

  return session;
}

/**
 * Example 7: Analytics caching
 */
export async function example7_AnalyticsCaching(tenantId: string, tournamentId: string) {
  // Calculate expensive analytics
  const analytics = {
    totalPlayers: await prisma.player.count({
      where: { tournamentId, tournament: { orgId: tenantId } },
    }),
    totalMatches: await prisma.match.count({
      where: { tournamentId },
    }),
    avgMatchDuration: 45, // Minutes (calculated)
    completionRate: 0.87, // Percentage (calculated)
  };

  // Cache for 15 minutes
  await AnalyticsCache.setTournamentAnalytics(tenantId, tournamentId, analytics as any);

  // Retrieve cached analytics
  const cached = await AnalyticsCache.getTournamentAnalytics(tenantId, tournamentId);

  return cached || analytics;
}

/**
 * Example 8: Batch operations for efficiency
 */
export async function example8_BatchOperations(tenantId: string, tournamentIds: string[]) {
  // Prepare cache keys
  const keys = tournamentIds.map((id) => `tournament:${id}`);

  // Batch get
  const { batchGet } = await import('@/lib/cache');
  const results = await batchGet(tenantId, keys);

  // Find which tournaments are not cached
  const missingIds: string[] = [];
  tournamentIds.forEach((id, index) => {
    const key = keys[index];
    if (results.get(key) === null) {
      missingIds.push(id);
    }
  });

  // Fetch missing tournaments from database
  if (missingIds.length > 0) {
    const tournaments = await prisma.tournament.findMany({
      where: { id: { in: missingIds }, orgId: tenantId },
    });

    // Batch set missing tournaments
    const entries = new Map();
    tournaments.forEach((tournament) => {
      entries.set(`tournament:${tournament.id}`, tournament);
    });

    const { batchSet } = await import('@/lib/cache');
    await batchSet(tenantId, entries, CacheTTL.TOURNAMENT);
  }

  return results;
}

/**
 * Example 9: Cache warming on application start
 */
export async function example9_CacheWarming(tenantId: string) {
  const { warmCache } = await import('@/lib/cache');

  await warmCache(tenantId, [
    {
      key: 'static:org:settings',
      loader: async () => {
        return await prisma.organization.findUnique({
          where: { id: tenantId },
          select: { name: true, slug: true },
        });
      },
      ttl: CacheTTL.STATIC_DATA, // 1 hour
    },
    {
      key: 'tournament:list:active',
      loader: async () => {
        return await prisma.tournament.findMany({
          where: { orgId: tenantId, status: 'active' },
        });
      },
      ttl: CacheTTL.TOURNAMENT_LIST, // 3 minutes
    },
  ]);

  console.log('Cache warmed for tenant:', tenantId);
}

/**
 * Example 10: Cache with performance tracking
 *
 * Integrates with performance monitoring middleware
 */
export async function example10_PerformanceTracking(
  tenantId: string,
  tournamentId: string,
  requestId: string
) {
  // Get with performance tracking
  const tournament = await TournamentCache.getTournament(
    tenantId,
    tournamentId,
    requestId // Pass request ID for tracking
  );

  // Cache hits/misses are automatically tracked in Sentry
  // and performance middleware

  return tournament;
}

/**
 * Example 11: Pattern-based invalidation
 */
export async function example11_PatternInvalidation(tenantId: string) {
  // Invalidate all tournament caches
  const count1 = await cacheService.invalidate(tenantId, 'tournament:*');
  console.log(`Invalidated ${count1} tournament caches`);

  // Invalidate all analytics
  const count2 = await cacheService.invalidate(tenantId, 'analytics:*');
  console.log(`Invalidated ${count2} analytics caches`);

  // Clear all cache for tenant
  const count3 = await cacheService.clear(tenantId);
  console.log(`Cleared ${count3} total cache entries`);
}

/**
 * Example 12: Health monitoring
 */
export async function example12_HealthMonitoring() {
  const health = await cacheService.health();

  console.log('Cache Health:', {
    connected: health.connected,
    responseTime: `${health.responseTime?.toFixed(2)}ms`,
    memoryUsage: health.memoryUsage,
    keyCount: health.keyCount,
  });

  if (!health.connected) {
    console.error('Redis is not connected!');
    // Fallback to database-only operations
  }
}

/**
 * Example 13: API endpoint caching
 *
 * Automatically cache API responses
 */
export async function example13_APIEndpointCaching() {
  const { withCache } = await import('@/lib/cache');

  const _handler = withCache(
    async (req: Request) => {
      // Your API logic here
      const tenantId = req.headers.get('x-tenant-id') || '';
      const tournaments = await prisma.tournament.findMany({
        where: { orgId: tenantId },
      });
      return { success: true, data: tournaments };
    },
    {
      keyGenerator: (req) => {
        const url = new URL(req.url);
        return `api:tournaments:${url.search}`;
      },
      ttl: CacheTTL.API_RESPONSE,
      tenantIdExtractor: (req) => req.headers.get('x-tenant-id') || '',
    }
  );

  // Use in Next.js API route
  // export const GET = handler;
}

/**
 * Example 14: Preventing cache stampede with locks
 */
export async function example14_CacheLock(tenantId: string, tournamentId: string) {
  const { withCacheLock } = await import('@/lib/cache');

  // Multiple concurrent requests won't regenerate the same cache entry
  const tournament = await withCacheLock(
    tenantId,
    `tournament:${tournamentId}`,
    async () => {
      // Expensive operation (only runs once even with concurrent requests)
      console.log('Generating expensive tournament data...');
      return await prisma.tournament.findUnique({
        where: { id: tournamentId, orgId: tenantId },
        include: {
          players: true,
          matches: true,
        },
      });
    },
    {
      ttl: CacheTTL.TOURNAMENT,
      lockTimeout: 10, // Lock expires after 10 seconds
    }
  );

  return tournament;
}
