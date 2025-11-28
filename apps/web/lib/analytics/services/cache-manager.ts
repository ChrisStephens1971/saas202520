/**
 * Cache Manager
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * Dedicated Redis caching layer for analytics.
 * Provides type-safe caching with TTL, key generation,
 * invalidation patterns, and cache warming.
 */

import Redis from 'ioredis';

/**
 * Redis connection configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

/**
 * Redis client instance (singleton)
 */
let redisClient: Redis | null = null;

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  lastError?: string;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  errors: 0,
};

/**
 * Initialize Redis connection
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      console.log('[CacheManager] Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      console.error('[CacheManager] Redis error:', error);
      stats.errors++;
      stats.lastError = error.message;
    });

    redisClient.on('close', () => {
      console.warn('[CacheManager] Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Default TTL values for different data types (in seconds)
 */
export const DEFAULT_TTL = {
  REAL_TIME: 60, // 1 minute - for live data
  SHORT: 300, // 5 minutes - for frequently changing data
  MEDIUM: 1800, // 30 minutes - for moderately stable data
  LONG: 3600, // 1 hour - for historical/stable data
  VERY_LONG: 86400, // 24 hours - for rarely changing data
};

/**
 * Get a cached value
 *
 * @param key - Cache key
 * @returns Cached value or null if not found
 */
export async function get<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  try {
    const value = await redis.get(key);

    if (value === null) {
      stats.misses++;
      return null;
    }

    stats.hits++;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[CacheManager] Error getting key ${key}:`, error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
    return null;
  }
}

/**
 * Set a cached value with optional TTL
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds (default: 5 minutes)
 */
export async function set<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL.SHORT
): Promise<void> {
  const redis = getRedisClient();

  try {
    const serialized = JSON.stringify(value);

    if (ttl > 0) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }

    stats.sets++;
  } catch (error) {
    console.error(`[CacheManager] Error setting key ${key}:`, error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Delete a cached value
 *
 * @param key - Cache key
 */
export async function del(key: string): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[CacheManager] Error deleting key ${key}:`, error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Invalidate cache keys matching a pattern
 *
 * @param pattern - Redis key pattern (e.g., "analytics:*", "analytics:revenue:*")
 */
export async function invalidate(pattern: string): Promise<void> {
  const redis = getRedisClient();

  try {
    // Use SCAN to avoid blocking
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    console.log(`[CacheManager] Invalidated ${deletedCount} keys matching pattern: ${pattern}`);
  } catch (error) {
    console.error(`[CacheManager] Error invalidating pattern ${pattern}:`, error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Generate a consistent cache key
 *
 * @param namespace - Cache namespace (e.g., "analytics:revenue")
 * @param tenantId - Tenant ID
 * @param params - Additional parameters for the key
 * @returns Formatted cache key
 */
export function getCacheKey(namespace: string, tenantId: string, ...params: string[]): string {
  const parts = [namespace, tenantId, ...params];
  return parts.filter(Boolean).join(':');
}

/**
 * Warm cache with common queries
 *
 * Pre-populates cache with frequently accessed data to improve
 * response times for initial requests.
 *
 * @param tenantId - Tenant ID to warm cache for
 */
export async function warmCache(tenantId: string): Promise<void> {
  console.log(`[CacheManager] Warming cache for tenant: ${tenantId}`);

  try {
    // Import analytics service dynamically to avoid circular dependency
    const AnalyticsService = await import('./analytics-service');

    // Warm revenue analytics
    await AnalyticsService.getRevenueAnalytics(tenantId, {
      useCache: true,
      cacheTTL: DEFAULT_TTL.MEDIUM,
    });

    // Warm cohort analytics
    await AnalyticsService.getCohortAnalytics(tenantId, {
      useCache: true,
      cacheTTL: DEFAULT_TTL.LONG,
    });

    // Warm tournament analytics
    await AnalyticsService.getTournamentAnalytics(tenantId, {
      useCache: true,
      cacheTTL: DEFAULT_TTL.MEDIUM,
    });

    // Warm dashboard summary
    await AnalyticsService.getDashboardSummary(tenantId);

    console.log(`[CacheManager] Cache warming complete for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`[CacheManager] Error warming cache for ${tenantId}:`, error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache hit/miss rates and performance metrics
 */
export async function getCacheStats(): Promise<{
  hitRate: number;
  missRate: number;
  totalRequests: number;
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  lastError?: string;
  memoryUsage?: {
    used: string;
    peak: string;
    fragmentation: string;
  };
}> {
  const redis = getRedisClient();

  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
  const missRate = totalRequests > 0 ? (stats.misses / totalRequests) * 100 : 0;

  let memoryUsage;
  try {
    // Get Redis memory info
    const info = await redis.info('memory');
    const lines = info.split('\r\n');

    const usedMemory = lines.find((line) => line.startsWith('used_memory_human:'))?.split(':')[1];
    const peakMemory = lines
      .find((line) => line.startsWith('used_memory_peak_human:'))
      ?.split(':')[1];
    const fragmentation = lines
      .find((line) => line.startsWith('mem_fragmentation_ratio:'))
      ?.split(':')[1];

    memoryUsage = {
      used: usedMemory || 'N/A',
      peak: peakMemory || 'N/A',
      fragmentation: fragmentation || 'N/A',
    };
  } catch (error) {
    console.warn('[CacheManager] Could not retrieve memory info:', error);
  }

  return {
    hitRate: Math.round(hitRate * 100) / 100,
    missRate: Math.round(missRate * 100) / 100,
    totalRequests,
    hits: stats.hits,
    misses: stats.misses,
    sets: stats.sets,
    errors: stats.errors,
    lastError: stats.lastError,
    memoryUsage,
  };
}

/**
 * Reset cache statistics
 */
export function resetStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.errors = 0;
  stats.lastError = undefined;
}

/**
 * Check if Redis connection is healthy
 *
 * @returns True if connected and responsive
 */
export async function isHealthy(): Promise<boolean> {
  const redis = getRedisClient();

  try {
    const response = await redis.ping();
    return response === 'PONG';
  } catch (error) {
    console.error('[CacheManager] Health check failed:', error);
    return false;
  }
}

/**
 * Flush all analytics cache keys
 *
 * WARNING: This will clear ALL analytics caches for ALL tenants.
 * Use with caution.
 */
export async function flushAnalyticsCache(): Promise<void> {
  console.log('[CacheManager] Flushing all analytics cache...');

  try {
    await invalidate('analytics:*');
    console.log('[CacheManager] All analytics cache flushed');
  } catch (error) {
    console.error('[CacheManager] Error flushing analytics cache:', error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Close Redis connection
 *
 * Should be called when shutting down the application
 */
export async function close(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[CacheManager] Redis connection closed');
  }
}

/**
 * Batch get multiple keys
 *
 * @param keys - Array of cache keys
 * @returns Map of key to value
 */
export async function mget<T>(keys: string[]): Promise<Map<string, T>> {
  const redis = getRedisClient();
  const result = new Map<string, T>();

  try {
    if (keys.length === 0) return result;

    const values = await redis.mget(...keys);

    values.forEach((value, index) => {
      if (value !== null) {
        try {
          result.set(keys[index], JSON.parse(value) as T);
          stats.hits++;
        } catch (error) {
          console.error(`[CacheManager] Error parsing value for key ${keys[index]}:`, error);
          stats.misses++;
        }
      } else {
        stats.misses++;
      }
    });
  } catch (error) {
    console.error('[CacheManager] Error in batch get:', error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Batch set multiple key-value pairs
 *
 * @param entries - Array of [key, value, ttl] tuples
 */
export async function mset<T>(entries: Array<[string, T, number?]>): Promise<void> {
  const redis = getRedisClient();

  try {
    const pipeline = redis.pipeline();

    for (const [key, value, ttl] of entries) {
      const serialized = JSON.stringify(value);

      if (ttl && ttl > 0) {
        pipeline.setex(key, ttl, serialized);
      } else {
        pipeline.set(key, serialized);
      }
    }

    await pipeline.exec();
    stats.sets += entries.length;
  } catch (error) {
    console.error('[CacheManager] Error in batch set:', error);
    stats.errors++;
    stats.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Get or set pattern: Get from cache, or compute and cache if not found
 *
 * @param key - Cache key
 * @param computeFn - Function to compute value if not cached
 * @param ttl - Time to live in seconds
 * @returns Cached or computed value
 */
export async function getOrSet<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL.SHORT
): Promise<T> {
  // Try to get from cache first
  const cached = await get<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Compute value
  const value = await computeFn();

  // Cache the result
  await set(key, value, ttl);

  return value;
}
