// Redis-backed per-message rate limiting
// Addresses: Per-message throttling must be custom (not just HTTP handshake)

import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { createClient } from 'redis';

// Rate limit configurations
const RATE_LIMITS = {
  // Per connection message rate: 100 messages per second
  perConnection: {
    points: 100, // Number of messages
    duration: 1, // Per second
  },
  // Per user message rate: 500 messages per second (across all connections)
  perUser: {
    points: 500,
    duration: 1,
  },
  // Per org message rate: 2000 messages per second (across all users)
  perOrg: {
    points: 2000,
    duration: 1,
  },
};

let redisClient: any = null;
let connectionLimiter: RateLimiterRedis | RateLimiterMemory;
let userLimiter: RateLimiterRedis | RateLimiterMemory;
let orgLimiter: RateLimiterRedis | RateLimiterMemory;

/**
 * Initialize rate limiters (attempt Redis, fallback to in-memory)
 */
export async function initRateLimiters() {
  const redisUrl = process.env.REDIS_URL;

  try {
    if (redisUrl) {
      // Try Redis
      redisClient = createClient({ url: redisUrl });
      await redisClient.connect();

      connectionLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl:conn:',
        points: RATE_LIMITS.perConnection.points,
        duration: RATE_LIMITS.perConnection.duration,
      });

      userLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl:user:',
        points: RATE_LIMITS.perUser.points,
        duration: RATE_LIMITS.perUser.duration,
      });

      orgLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rl:org:',
        points: RATE_LIMITS.perOrg.points,
        duration: RATE_LIMITS.perOrg.duration,
      });

      console.log('[RateLimiter] Initialized with Redis backend');
    } else {
      throw new Error('Redis not configured, using in-memory fallback');
    }
  } catch (error) {
    console.warn('[RateLimiter] Redis unavailable, using in-memory fallback:', error);

    // Fallback to in-memory (not distributed, but better than nothing)
    connectionLimiter = new RateLimiterMemory({
      points: RATE_LIMITS.perConnection.points,
      duration: RATE_LIMITS.perConnection.duration,
    });

    userLimiter = new RateLimiterMemory({
      points: RATE_LIMITS.perUser.points,
      duration: RATE_LIMITS.perUser.duration,
    });

    orgLimiter = new RateLimiterMemory({
      points: RATE_LIMITS.perOrg.points,
      duration: RATE_LIMITS.perOrg.duration,
    });
  }
}

/**
 * Check if a message should be rate limited
 * Returns null if allowed, error message if limited
 */
export async function checkMessageRateLimit(
  connectionId: string,
  userId: string,
  orgId: string
): Promise<string | null> {
  try {
    // Check all three tiers (most specific to least specific)
    // All must pass for message to be allowed

    // 1. Per-connection rate limit
    try {
      await connectionLimiter.consume(connectionId);
    } catch (rejRes: any) {
      return `Connection rate limit exceeded. Retry after ${Math.ceil(rejRes.msBeforeNext / 1000)}s`;
    }

    // 2. Per-user rate limit (across all connections)
    try {
      await userLimiter.consume(userId);
    } catch (rejRes: any) {
      return `User rate limit exceeded. Retry after ${Math.ceil(rejRes.msBeforeNext / 1000)}s`;
    }

    // 3. Per-org rate limit (across all users)
    try {
      await orgLimiter.consume(orgId);
    } catch (rejRes: any) {
      return `Organization rate limit exceeded. Retry after ${Math.ceil(rejRes.msBeforeNext / 1000)}s`;
    }

    return null; // All checks passed
  } catch (error) {
    console.error('[RateLimiter] Error checking rate limit:', error);
    // Fail open (allow message) if rate limiter errors
    return null;
  }
}

/**
 * Get current rate limit status for diagnostics
 */
export async function getRateLimitStatus(
  connectionId: string,
  userId: string,
  orgId: string
) {
  try {
    const [connRes, userRes, orgRes] = await Promise.all([
      connectionLimiter.get(connectionId),
      userLimiter.get(userId),
      orgLimiter.get(orgId),
    ]);

    return {
      connection: {
        remaining: connRes ? RATE_LIMITS.perConnection.points - connRes.consumedPoints : RATE_LIMITS.perConnection.points,
        limit: RATE_LIMITS.perConnection.points,
        resetAt: connRes?.msBeforeNext ? new Date(Date.now() + connRes.msBeforeNext).toISOString() : null,
      },
      user: {
        remaining: userRes ? RATE_LIMITS.perUser.points - userRes.consumedPoints : RATE_LIMITS.perUser.points,
        limit: RATE_LIMITS.perUser.points,
        resetAt: userRes?.msBeforeNext ? new Date(Date.now() + userRes.msBeforeNext).toISOString() : null,
      },
      org: {
        remaining: orgRes ? RATE_LIMITS.perOrg.points - orgRes.consumedPoints : RATE_LIMITS.perOrg.points,
        limit: RATE_LIMITS.perOrg.points,
        resetAt: orgRes?.msBeforeNext ? new Date(Date.now() + orgRes.msBeforeNext).toISOString() : null,
      },
    };
  } catch (error) {
    console.error('[RateLimiter] Error getting status:', error);
    return null;
  }
}

/**
 * Cleanup rate limiters on shutdown
 */
export async function destroyRateLimiters() {
  if (redisClient) {
    await redisClient.quit();
  }
}
