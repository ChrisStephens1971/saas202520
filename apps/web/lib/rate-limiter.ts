/**
 * Rate Limiting Service with Monitoring
 * Sprint 4 - NOTIFY-006
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/prisma';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// ============================================================================
// RATE LIMITERS
// ============================================================================

export const rateLimiters = {
  email: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 emails per minute per org
    analytics: true,
    prefix: '@upstash/ratelimit/email',
  }),
  sms: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 SMS per minute per org
    analytics: true,
    prefix: '@upstash/ratelimit/sms',
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 API calls per minute per user
    analytics: true,
    prefix: '@upstash/ratelimit/api',
  }),
};

// ============================================================================
// RATE LIMIT CHECKING
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a specific key
 */
export async function checkRateLimit(
  type: 'email' | 'sms' | 'api',
  key: string
): Promise<RateLimitResult> {
  const limiter = rateLimiters[type];
  const result = await limiter.limit(key);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/**
 * Check if organization is within rate limits for email
 */
export async function checkEmailRateLimit(orgId: string): Promise<RateLimitResult> {
  const result = await checkRateLimit('email', orgId);

  // Log rate limit violation
  if (!result.success) {
    await logRateLimitViolation(orgId, 'email', result);
  }

  return result;
}

/**
 * Check if organization is within rate limits for SMS
 */
export async function checkSMSRateLimit(orgId: string): Promise<RateLimitResult> {
  const result = await checkRateLimit('sms', orgId);

  // Log rate limit violation
  if (!result.success) {
    await logRateLimitViolation(orgId, 'sms', result);
  }

  return result;
}

/**
 * Check if user is within API rate limits
 */
export async function checkAPIRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit('api', userId);
}

// ============================================================================
// RATE LIMIT MONITORING
// ============================================================================

/**
 * Log rate limit violation for monitoring
 */
async function logRateLimitViolation(
  identifier: string,
  type: 'email' | 'sms' | 'api',
  result: RateLimitResult
): Promise<void> {
  try {
    // Log to console for monitoring systems to pick up
    console.warn('Rate limit exceeded:', {
      identifier,
      type,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset).toISOString(),
      retryAfter: result.retryAfter,
    });

    // Store in Redis for analytics (24-hour TTL)
    const key = `rate_limit_violations:${type}:${identifier}:${Date.now()}`;
    await redis.setex(
      key,
      86400, // 24 hours
      JSON.stringify({
        identifier,
        type,
        timestamp: new Date().toISOString(),
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      })
    );
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}

/**
 * Get rate limit statistics for an organization
 */
export async function getRateLimitStats(
  orgId: string,
  type: 'email' | 'sms'
): Promise<{
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  violations24h: number;
}> {
  const limiter = rateLimiters[type];
  const result = await limiter.limit(orgId);

  // Count violations in last 24 hours
  const violationKeys = await redis.keys(`rate_limit_violations:${type}:${orgId}:*`);

  return {
    current: result.limit - result.remaining,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: new Date(result.reset),
    violations24h: violationKeys?.length || 0,
  };
}

// ============================================================================
// NOTIFICATION DELIVERY TRACKING
// ============================================================================

/**
 * Track notification delivery success/failure
 */
export async function trackNotificationDelivery(
  notificationId: string,
  status: 'success' | 'failure',
  error?: string
): Promise<void> {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: status === 'success' ? 'delivered' : 'failed',
        deliveredAt: status === 'success' ? new Date() : null,
        errorMessage: error,
      },
    });
  } catch (err) {
    console.error('Failed to track notification delivery:', err);
  }
}

/**
 * Get notification delivery statistics for an organization
 */
export async function getDeliveryStats(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  byType: {
    in_app: { total: number; delivered: number; failed: number };
    email: { total: number; delivered: number; failed: number };
    sms: { total: number; delivered: number; failed: number };
  };
}> {
  const notifications = await prisma.notification.findMany({
    where: {
      orgId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      status: true,
      type: true,
    },
  });

  const stats = {
    total: notifications.length,
    delivered: 0,
    failed: 0,
    pending: 0,
    byType: {
      in_app: { total: 0, delivered: 0, failed: 0 },
      email: { total: 0, delivered: 0, failed: 0 },
      sms: { total: 0, delivered: 0, failed: 0 },
    },
  };

  notifications.forEach((n) => {
    // Overall stats
    if (n.status === 'delivered') stats.delivered++;
    else if (n.status === 'failed') stats.failed++;
    else if (n.status === 'pending' || n.status === 'sent') stats.pending++;

    // By type
    const type = n.type as 'in_app' | 'email' | 'sms';
    stats.byType[type].total++;
    if (n.status === 'delivered') stats.byType[type].delivered++;
    else if (n.status === 'failed') stats.byType[type].failed++;
  });

  return stats;
}

// ============================================================================
// COMPLIANCE HELPERS
// ============================================================================

/**
 * Check if player has opted out of SMS
 */
export async function isPlayerOptedOut(playerId: string): Promise<boolean> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { playerId },
    select: { smsOptedOut: true },
  });

  return preference?.smsOptedOut ?? false;
}

/**
 * Check if current time is within quiet hours for a player
 */
export async function isWithinQuietHours(playerId: string): Promise<boolean> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { playerId },
    select: {
      quietHoursStart: true,
      quietHoursEnd: true,
      timezone: true,
    },
  });

  if (!preference?.quietHoursStart || !preference?.quietHoursEnd) {
    return false; // No quiet hours set
  }

  const now = new Date();
  const currentHour = now.getHours();
  const quietStart = parseInt(preference.quietHoursStart.split(':')[0]);
  const quietEnd = parseInt(preference.quietHoursEnd.split(':')[0]);

  // Simple check (doesn't handle cross-midnight ranges perfectly)
  if (quietStart < quietEnd) {
    // Normal range (e.g., 22:00 to 08:00 next day)
    return currentHour >= quietStart && currentHour < quietEnd;
  } else {
    // Cross-midnight range (e.g., 22:00 to 08:00)
    return currentHour >= quietStart || currentHour < quietEnd;
  }
}

/**
 * Validate notification can be sent to player
 */
export async function validateNotificationDelivery(
  playerId: string,
  type: 'email' | 'sms'
): Promise<{ allowed: boolean; reason?: string }> {
  if (type === 'sms') {
    // Check opt-out status
    const optedOut = await isPlayerOptedOut(playerId);
    if (optedOut) {
      return { allowed: false, reason: 'Player has opted out of SMS notifications' };
    }

    // Check quiet hours
    const inQuietHours = await isWithinQuietHours(playerId);
    if (inQuietHours) {
      return { allowed: false, reason: 'Current time is within player quiet hours' };
    }
  }

  return { allowed: true };
}
