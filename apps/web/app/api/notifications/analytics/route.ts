/**
 * GET /api/notifications/analytics
 * Get notification delivery statistics and rate limit info
 * Sprint 4 - NOTIFY-006
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDeliveryStats, getRateLimitStats } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: orgId' },
        { status: 400 }
      );
    }

    // TODO: Check if user has permission to view analytics for this org

    // Default to last 7 days if dates not provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get delivery statistics
    const deliveryStats = await getDeliveryStats(orgId, start, end);

    // Get rate limit stats
    const [emailRateLimit, smsRateLimit] = await Promise.all([
      getRateLimitStats(orgId, 'email'),
      getRateLimitStats(orgId, 'sms'),
    ]);

    return NextResponse.json(
      {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        delivery: deliveryStats,
        rateLimits: {
          email: {
            current: emailRateLimit.current,
            limit: emailRateLimit.limit,
            remaining: emailRateLimit.remaining,
            resetAt: emailRateLimit.resetAt.toISOString(),
            violations24h: emailRateLimit.violations24h,
          },
          sms: {
            current: smsRateLimit.current,
            limit: smsRateLimit.limit,
            remaining: smsRateLimit.remaining,
            resetAt: smsRateLimit.resetAt.toISOString(),
            violations24h: smsRateLimit.violations24h,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
