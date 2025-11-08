/**
 * Cache Module - Main Exports
 * Sprint 9 Phase 3 - Scale & Performance
 *
 * Centralized exports for Redis caching functionality
 */

// Core cache service
export { cacheService } from './redis';
export type { CacheResult } from './redis';

// Cache strategies
import {
  cacheAside,
  writeThrough,
  refreshCache,
} from './strategies';

export {
  CacheTTL,
  TournamentCache,
  UserCache,
  AnalyticsCache,
  APICache,
  StaticCache,
  cacheAside,
  writeThrough,
  refreshCache,
} from './strategies';

// Cache invalidation
export {
  CacheEvent,
  CacheInvalidation,
  BulkInvalidation,
  TimeBasedInvalidation,
  emitCacheEvent,
  InvalidateCache,
} from './invalidation';

/**
 * Utility functions for common caching patterns
 */

/**
 * Generate cache key for tournament data
 */
export function tournamentKey(tournamentId: string): string {
  return `tournament:${tournamentId}`;
}

/**
 * Generate cache key for tournament list with filters
 */
export function tournamentListKey(filters: Record<string, unknown>): string {
  const filterStr = JSON.stringify(filters);
  const hash = simpleHash(filterStr);
  return `tournament:list:${hash}`;
}

/**
 * Generate cache key for tournament matches
 */
export function tournamentMatchesKey(tournamentId: string): string {
  return `tournament:${tournamentId}:matches`;
}

/**
 * Generate cache key for tournament leaderboard
 */
export function tournamentLeaderboardKey(tournamentId: string): string {
  return `tournament:${tournamentId}:leaderboard`;
}

/**
 * Generate cache key for user session
 */
export function userSessionKey(userId: string): string {
  return `user:${userId}:session`;
}

/**
 * Generate cache key for user profile
 */
export function userProfileKey(userId: string): string {
  return `user:${userId}:profile`;
}

/**
 * Generate cache key for user permissions
 */
export function userPermissionsKey(userId: string): string {
  return `user:${userId}:permissions`;
}

/**
 * Generate cache key for analytics data
 */
export function analyticsKey(type: string, resourceId?: string): string {
  if (resourceId) {
    return `analytics:${type}:${resourceId}`;
  }
  return `analytics:${type}`;
}

/**
 * Generate cache key for API response
 */
export function apiResponseKey(endpoint: string, params: Record<string, unknown>): string {
  const paramStr = JSON.stringify(params);
  const hash = simpleHash(paramStr);
  return `api:${endpoint}:${hash}`;
}

/**
 * Generate cache key for static configuration
 */
export function staticConfigKey(key: string): string {
  return `static:config:${key}`;
}

/**
 * Generate cache key for organization settings
 */
export function orgSettingsKey(): string {
  return 'static:org:settings';
}

/**
 * Simple hash function for generating cache keys
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse tenant ID from request/context
 *
 * Helper to extract tenant ID from various sources
 */
export function getTenantIdFromContext(context: {
  headers?: Headers;
  subdomain?: string;
  orgId?: string;
}): string {
  // Priority: subdomain > headers > orgId
  if (context.subdomain) {
    return context.subdomain;
  }

  if (context.headers) {
    const tenantHeader = context.headers.get('x-tenant-id');
    if (tenantHeader) {
      return tenantHeader;
    }
  }

  if (context.orgId) {
    return context.orgId;
  }

  throw new Error('Unable to determine tenant ID from context');
}

/**
 * Cache health check
 *
 * Returns current cache health status
 */
export async function getCacheHealth() {
  const { cacheService: cache } = await import('./redis');
  return await cache.health();
}

/**
 * Cache statistics
 *
 * Returns statistics about cache usage
 */
export async function getCacheStats(_tenantId: string) {
  const patterns = [
    'tournament:*',
    'user:*',
    'analytics:*',
    'api:*',
    'static:*',
  ];

  const stats: Record<string, number> = {};

  // Note: This is a simplified version. In production, you'd want to
  // track these metrics more efficiently using Redis commands
  for (const pattern of patterns) {
    const prefix = pattern.split(':')[0];
    // This is a placeholder - actual implementation would query Redis
    stats[prefix] = 0;
  }

  return stats;
}

/**
 * Warm cache with commonly accessed data
 *
 * Pre-loads cache with frequently accessed data
 */
export async function warmCache(
  tenantId: string,
  dataLoaders: {
    key: string;
    loader: () => Promise<unknown>;
    ttl: number;
  }[]
): Promise<void> {
  const { cacheService: cache } = await import('./redis');
  console.log(`[Cache] Warming cache for tenant ${tenantId} with ${dataLoaders.length} items`);

  const promises = dataLoaders.map(async ({ key, loader, ttl }) => {
    try {
      const data = await loader();
      await cache.set(tenantId, key, data, ttl);
    } catch (error) {
      console.error(`[Cache] Failed to warm cache for key ${key}:`, error);
    }
  });

  await Promise.allSettled(promises);
  console.log(`[Cache] Cache warming complete for tenant ${tenantId}`);
}

/**
 * Cache middleware helper for Next.js API routes
 *
 * Automatically caches API responses
 */
export function withCache<TReq = unknown, TRes = unknown>(
  handler: (req: TReq) => Promise<TRes>,
  options: {
    keyGenerator: (req: TReq) => string;
    ttl: number;
    tenantIdExtractor: (req: TReq) => string;
  }
) {
  return async (req: TReq): Promise<TRes | unknown> => {
    const { cacheService: cache } = await import('./redis');
    const tenantId = options.tenantIdExtractor(req);
    const cacheKey = options.keyGenerator(req);

    // Try cache first
    const cached = await cache.get(tenantId, cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - execute handler
    const result = await handler(req);

    // Store in cache
    await cache.set(tenantId, cacheKey, result, options.ttl);

    return result;
  };
}

/**
 * Batch cache operations helper
 *
 * Efficiently get/set multiple cache entries
 */
export async function batchGet<T>(
  tenantId: string,
  keys: string[]
): Promise<Map<string, T | null>> {
  const { cacheService: cache } = await import('./redis');
  return await cache.mget<T>(tenantId, keys);
}

export async function batchSet(
  tenantId: string,
  entries: Map<string, unknown>,
  ttl: number = 300
): Promise<number> {
  const { cacheService: cache } = await import('./redis');
  return await cache.mset(tenantId, entries, ttl);
}

/**
 * Cache lock helper (for preventing cache stampede)
 *
 * Prevents multiple processes from regenerating the same cache entry
 */
export async function withCacheLock<T>(
  tenantId: string,
  key: string,
  generator: () => Promise<T>,
  options: {
    ttl: number;
    lockTimeout: number;
  }
): Promise<T> {
  const { cacheService: cache } = await import('./redis');
  const lockKey = `lock:${key}`;
  const lockValue = Date.now().toString();

  try {
    // Try to acquire lock
    const acquired = await cache.set(
      tenantId,
      lockKey,
      lockValue,
      options.lockTimeout
    );

    if (!acquired) {
      // Someone else has the lock, wait and try to get from cache
      await new Promise((resolve) => setTimeout(resolve, 100));
      const cached = await cache.get<T>(tenantId, key);
      if (cached) {
        return cached;
      }
      // If still no cache, generate anyway (lock expired or failed)
    }

    // Generate fresh data
    const data = await generator();

    // Store in cache
    await cache.set(tenantId, key, data, options.ttl);

    return data;
  } finally {
    // Release lock
    await cache.delete(tenantId, lockKey);
  }
}

/**
 * Export commonly used cache patterns
 *
 * These are re-exported from strategies.ts for convenience
 */
export const CachePatterns = {
  /**
   * Cache-aside (lazy loading)
   */
  aside: cacheAside,

  /**
   * Write-through (update cache and DB together)
   */
  writeThrough: writeThrough,

  /**
   * Refresh-ahead (proactive cache refresh)
   */
  refreshAhead: refreshCache,

  /**
   * With lock (prevent cache stampede)
   */
  withLock: withCacheLock,
};
