/**
 * Admin Rate Limiting Configuration
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Enhanced rate limiting for admin endpoints.
 * Provides stricter limits for sensitive operations.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// ============================================================================
// ADMIN RATE LIMITERS
// ============================================================================

/**
 * Standard admin API rate limiter
 * 100 requests per minute per admin user
 */
export const adminRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/admin',
});

/**
 * Sensitive operations rate limiter
 * For operations like ban, delete, bulk operations
 * 10 requests per minute per admin user
 */
export const adminSensitiveRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/admin-sensitive',
});

/**
 * Data export rate limiter
 * 5 exports per hour per admin user
 */
export const adminExportRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: '@upstash/ratelimit/admin-export',
});

// ============================================================================
// RATE LIMIT HELPERS
// ============================================================================

export interface AdminRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check admin rate limit
 */
export async function checkAdminRateLimit(
  userId: string,
  type: 'standard' | 'sensitive' | 'export' = 'standard'
): Promise<AdminRateLimitResult> {
  let limiter: Ratelimit;

  switch (type) {
    case 'sensitive':
      limiter = adminSensitiveRateLimiter;
      break;
    case 'export':
      limiter = adminExportRateLimiter;
      break;
    default:
      limiter = adminRateLimiter;
  }

  const result = await limiter.limit(userId);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/**
 * Log rate limit violation for admin monitoring
 */
export async function logAdminRateLimitViolation(
  userId: string,
  userEmail: string,
  type: 'standard' | 'sensitive' | 'export',
  endpoint: string
): Promise<void> {
  try {
    console.warn('[ADMIN_RATE_LIMIT_VIOLATION]', {
      userId,
      userEmail,
      type,
      endpoint,
      timestamp: new Date().toISOString(),
    });

    // Store in Redis for monitoring (24-hour TTL)
    const key = `admin_rate_limit_violations:${type}:${userId}:${Date.now()}`;
    await redis.setex(
      key,
      86400, // 24 hours
      JSON.stringify({
        userId,
        userEmail,
        type,
        endpoint,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Failed to log admin rate limit violation:', error);
  }
}
