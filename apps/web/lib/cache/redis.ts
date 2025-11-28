/**
 * Redis Cache Service
 * Sprint 9 Phase 3 - Scale & Performance
 *
 * Provides centralized Redis caching with:
 * - Connection pooling
 * - Multi-tenant support (tenant-prefixed keys)
 * - Error handling with database fallback
 * - Type-safe operations
 * - Health monitoring
 */

import Redis, { RedisOptions } from 'ioredis';

// Performance tracking (optional - falls back gracefully if not available)
let trackCacheOperation:
  | ((requestId: string, operation: 'hit' | 'miss', key: string, duration: number) => void)
  | undefined;

// Try to import performance middleware if available (async initialization)
import('../monitoring/performance-middleware')
  .then((perfMiddleware) => {
    trackCacheOperation = perfMiddleware.trackCacheOperation;
  })
  .catch(() => {
    // Performance middleware not available, operations will work without tracking
    trackCacheOperation = undefined;
  });

/**
 * Cache operation result with metadata
 */
interface CacheResult<T> {
  data: T | null;
  cached: boolean;
  fromCache: boolean;
  error?: string;
}

/**
 * Redis connection configuration
 */
const redisConfig: RedisOptions = {
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
  lazyConnect: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  keepAlive: 30000,
};

/**
 * Redis Cache Service class
 *
 * Manages Redis connections with connection pooling,
 * error handling, and multi-tenant support.
 */
class CacheService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Create Redis client
      this.redis = new Redis(redisConfig);

      // Handle connection events
      this.redis.on('connect', () => {
        console.log('[Cache] Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.redis.on('ready', () => {
        console.log('[Cache] Redis ready to accept commands');
      });

      this.redis.on('error', (error) => {
        console.error('[Cache] Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.warn('[Cache] Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        this.connectionAttempts++;
        console.log(`[Cache] Redis reconnecting (attempt ${this.connectionAttempts})`);
      });

      // Connect to Redis
      await this.redis.connect();
    } catch (error) {
      console.error('[Cache] Failed to initialize Redis:', error);
      this.isConnected = false;
      this.redis = null;
    }
  }

  /**
   * Check if Redis is available and connected
   */
  private isAvailable(): boolean {
    return this.redis !== null && this.isConnected;
  }

  /**
   * Build cache key with tenant prefix
   *
   * @param tenantId - Tenant identifier
   * @param key - Base cache key
   * @returns Formatted cache key with tenant prefix
   */
  private buildKey(tenantId: string, key: string): string {
    return `${tenantId}:${key}`;
  }

  /**
   * Get value from cache
   *
   * @template T - Type of cached value
   * @param tenantId - Tenant identifier
   * @param key - Cache key
   * @param requestId - Optional request ID for performance tracking
   * @returns Cached value or null if not found
   */
  async get<T>(tenantId: string, key: string, requestId?: string): Promise<T | null> {
    if (!this.isAvailable()) {
      console.warn('[Cache] Redis unavailable, cache miss');
      return null;
    }

    const startTime = performance.now();
    const fullKey = this.buildKey(tenantId, key);

    try {
      const value = await this.redis!.get(fullKey);
      const duration = performance.now() - startTime;

      if (value === null) {
        if (requestId && trackCacheOperation) {
          trackCacheOperation(requestId, 'miss', fullKey, duration);
        }
        return null;
      }

      // Parse JSON value
      const parsed = JSON.parse(value) as T;

      if (requestId && trackCacheOperation) {
        trackCacheOperation(requestId, 'hit', fullKey, duration);
      }

      return parsed;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error('[Cache] Error getting value:', error);

      if (requestId && trackCacheOperation) {
        trackCacheOperation(requestId, 'miss', fullKey, duration);
      }

      return null;
    }
  }

  /**
   * Set value in cache with TTL
   *
   * @param tenantId - Tenant identifier
   * @param key - Cache key
   * @param value - Value to cache (will be JSON stringified)
   * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns True if successful, false otherwise
   */
  async set(tenantId: string, key: string, value: any, ttl: number = 300): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[Cache] Redis unavailable, skipping cache set');
      return false;
    }

    const fullKey = this.buildKey(tenantId, key);

    try {
      const stringValue = JSON.stringify(value);
      await this.redis!.setex(fullKey, ttl, stringValue);
      return true;
    } catch (error) {
      console.error('[Cache] Error setting value:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   *
   * @param tenantId - Tenant identifier
   * @param key - Cache key
   * @returns True if deleted, false otherwise
   */
  async delete(tenantId: string, key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const fullKey = this.buildKey(tenantId, key);

    try {
      const result = await this.redis!.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('[Cache] Error deleting value:', error);
      return false;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * @param tenantId - Tenant identifier
   * @param pattern - Pattern to match (supports wildcards)
   * @returns Number of keys deleted
   */
  async invalidate(tenantId: string, pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    const fullPattern = this.buildKey(tenantId, pattern);

    try {
      const keys = await this.redis!.keys(fullPattern);
      if (keys.length === 0) {
        return 0;
      }

      // Delete keys in batches using pipeline
      const pipeline = this.redis!.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      console.log(`[Cache] Invalidated ${keys.length} keys matching ${fullPattern}`);
      return keys.length;
    } catch (error) {
      console.error('[Cache] Error invalidating pattern:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries for a tenant
   *
   * @param tenantId - Tenant identifier
   * @returns Number of keys deleted
   */
  async clear(tenantId: string): Promise<number> {
    return this.invalidate(tenantId, '*');
  }

  /**
   * Get multiple values at once (batch operation)
   *
   * @template T - Type of cached values
   * @param tenantId - Tenant identifier
   * @param keys - Array of cache keys
   * @returns Map of key to value (null if not found)
   */
  async mget<T>(tenantId: string, keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    if (!this.isAvailable() || keys.length === 0) {
      keys.forEach((key) => result.set(key, null));
      return result;
    }

    try {
      const fullKeys = keys.map((key) => this.buildKey(tenantId, key));
      const values = await this.redis!.mget(...fullKeys);

      keys.forEach((key, index) => {
        const value = values[index];
        if (value === null) {
          result.set(key, null);
        } else {
          try {
            result.set(key, JSON.parse(value) as T);
          } catch {
            result.set(key, null);
          }
        }
      });

      return result;
    } catch (error) {
      console.error('[Cache] Error getting multiple values:', error);
      keys.forEach((key) => result.set(key, null));
      return result;
    }
  }

  /**
   * Set multiple values at once (batch operation)
   *
   * @param tenantId - Tenant identifier
   * @param entries - Map of key to value
   * @param ttl - Time to live in seconds
   * @returns Number of successfully set keys
   */
  async mset(tenantId: string, entries: Map<string, any>, ttl: number = 300): Promise<number> {
    if (!this.isAvailable() || entries.size === 0) {
      return 0;
    }

    try {
      const pipeline = this.redis!.pipeline();
      let count = 0;

      entries.forEach((value, key) => {
        try {
          const fullKey = this.buildKey(tenantId, key);
          const stringValue = JSON.stringify(value);
          pipeline.setex(fullKey, ttl, stringValue);
          count++;
        } catch (error) {
          console.error(`[Cache] Error stringifying value for key ${key}:`, error);
        }
      });

      await pipeline.exec();
      return count;
    } catch (error) {
      console.error('[Cache] Error setting multiple values:', error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   *
   * @param tenantId - Tenant identifier
   * @param key - Cache key
   * @returns True if exists, false otherwise
   */
  async exists(tenantId: string, key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const fullKey = this.buildKey(tenantId, key);

    try {
      const result = await this.redis!.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('[Cache] Error checking existence:', error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   *
   * @param tenantId - Tenant identifier
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if not found
   */
  async ttl(tenantId: string, key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -2;
    }

    const fullKey = this.buildKey(tenantId, key);

    try {
      return await this.redis!.ttl(fullKey);
    } catch (error) {
      console.error('[Cache] Error getting TTL:', error);
      return -2;
    }
  }

  /**
   * Get cache health status
   *
   * @returns Health status information
   */
  async health(): Promise<{
    connected: boolean;
    responseTime: number;
    memoryUsage?: string;
    keyCount?: number;
  }> {
    if (!this.isAvailable()) {
      return {
        connected: false,
        responseTime: -1,
      };
    }

    const startTime = performance.now();

    try {
      await this.redis!.ping();
      const responseTime = performance.now() - startTime;

      // Get memory info
      const info = await this.redis!.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : undefined;

      // Get key count
      const dbSize = await this.redis!.dbsize();

      return {
        connected: true,
        responseTime,
        memoryUsage,
        keyCount: dbSize,
      };
    } catch (error) {
      console.error('[Cache] Health check failed:', error);
      return {
        connected: false,
        responseTime: -1,
      };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
      console.log('[Cache] Redis disconnected');
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export type for use in other modules
export type { CacheResult };
