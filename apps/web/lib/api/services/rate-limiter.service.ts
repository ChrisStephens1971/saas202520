/**
 * Rate Limiter Service
 * Redis-based sliding window rate limiting for API requests
 *
 * @module lib/api/services/rate-limiter.service
 */

import Redis from 'ioredis';
import type { ApiTier, RateLimitResult } from '../types/api';

// Create dedicated Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  lazyConnect: false,
});

// Re-export RateLimitResult for middleware
export type { RateLimitResult };

// Rate limits for each tier (requests per hour)
const TIER_RATE_LIMITS: Record<ApiTier, number> = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

/**
 * Check if request is within rate limit
 * Uses Redis sliding window algorithm
 *
 * @param keyId - API key ID
 * @param tier - API tier (determines rate limit)
 * @returns Rate limit result with allowed status and remaining requests
 */
export async function checkRateLimit(
  keyId: string,
  tier: ApiTier
): Promise<RateLimitResult> {
  const limit = TIER_RATE_LIMITS[tier];
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000); // Current hour timestamp
  const redisKey = `ratelimit:${keyId}:${currentHour}`;

  try {
    // Get current count from Redis
    const currentCount = await redis.get(redisKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // Calculate reset time (top of next hour)
    const resetTimestamp = (currentHour + 1) * 3600;
    const resetDate = new Date(resetTimestamp * 1000);

    // Check if limit exceeded
    if (count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: resetTimestamp,
        resetDate,
      };
    }

    // Increment counter
    await incrementCounter(keyId, currentHour);

    // Calculate remaining requests
    const remaining = limit - (count + 1);

    return {
      allowed: true,
      limit,
      remaining,
      reset: resetTimestamp,
      resetDate,
    };
  } catch (error) {
    console.error('Rate limiter error:', error);

    // On error, allow the request (fail open for availability)
    // but log for monitoring
    const resetTimestamp = (currentHour + 1) * 3600;
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: resetTimestamp,
      resetDate: new Date(resetTimestamp * 1000),
    };
  }
}

/**
 * Increment rate limit counter
 * Uses Redis INCR and sets expiry
 *
 * @param keyId - API key ID
 * @param hour - Current hour timestamp
 */
export async function incrementCounter(
  keyId: string,
  hour: number
): Promise<void> {
  const redisKey = `ratelimit:${keyId}:${hour}`;

  try {
    // Increment counter
    await redis.incr(redisKey);

    // Set expiry to 2 hours (to handle edge cases around hour boundaries)
    await redis.expire(redisKey, 7200);
  } catch (error) {
    console.error('Error incrementing rate limit counter:', error);
    // Non-critical error, continue
  }
}

/**
 * Get remaining requests for an API key
 *
 * @param keyId - API key ID
 * @param tier - API tier
 * @returns Number of remaining requests in current hour
 */
export async function getRemainingRequests(
  keyId: string,
  tier: ApiTier
): Promise<number> {
  const limit = TIER_RATE_LIMITS[tier];
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000);
  const redisKey = `ratelimit:${keyId}:${currentHour}`;

  try {
    const currentCount = await redis.get(redisKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;
    return Math.max(0, limit - count);
  } catch {
    console.error('Error getting remaining requests');
    return limit; // Return full limit on error
  }
}

/**
 * Reset counter for an API key (admin function)
 *
 * @param keyId - API key ID
 */
export async function resetCounter(keyId: string): Promise<void> {
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000);
  const redisKey = `ratelimit:${keyId}:${currentHour}`;

  try {
    await redis.del(redisKey);
  } catch (error) {
    console.error('Error resetting rate limit counter:', error);
    throw error;
  }
}

/**
 * Get rate limit info without incrementing
 * Useful for displaying current status
 *
 * @param keyId - API key ID
 * @param tier - API tier
 * @returns Rate limit result without modifying counter
 */
export async function getRateLimitInfo(
  keyId: string,
  tier: ApiTier
): Promise<RateLimitResult> {
  const limit = TIER_RATE_LIMITS[tier];
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000);
  const redisKey = `ratelimit:${keyId}:${currentHour}`;

  try {
    const currentCount = await redis.get(redisKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    const resetTimestamp = (currentHour + 1) * 3600;
    const resetDate = new Date(resetTimestamp * 1000);

    return {
      allowed: count < limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset: resetTimestamp,
      resetDate,
    };
  } catch (error) {
    console.error('Error getting rate limit info:', error);
    const resetTimestamp = (currentHour + 1) * 3600;
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: resetTimestamp,
      resetDate: new Date(resetTimestamp * 1000),
    };
  }
}

/**
 * Check if an API key is currently rate limited
 *
 * @param keyId - API key ID
 * @param tier - API tier
 * @returns True if rate limited, false otherwise
 */
export async function isRateLimited(
  keyId: string,
  tier: ApiTier
): Promise<boolean> {
  const info = await getRateLimitInfo(keyId, tier);
  return !info.allowed;
}

/**
 * Get time until rate limit resets (in seconds)
 *
 * @param keyId - API key ID
 * @returns Seconds until reset
 */
export async function getTimeUntilReset(keyId: string): Promise<number> {
  const now = Date.now();
  const currentHour = Math.floor(now / 3600000);
  const resetTimestamp = (currentHour + 1) * 3600;
  const nowSeconds = Math.floor(now / 1000);

  return Math.max(0, resetTimestamp - nowSeconds);
}
