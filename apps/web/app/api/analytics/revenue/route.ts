/**
 * Analytics Revenue API
 * Sprint 10 Week 1 Day 1 - Business Intelligence Features
 *
 * Provides revenue analytics and metrics for tenant business intelligence.
 * Tenant-scoped endpoint (non-admin) for revenue tracking.
 *
 * Routes:
 * - GET /api/analytics/revenue - Get revenue metrics (MRR, ARR, churn, projections)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import { checkAPIRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  newRevenue: number;
  churnedRevenue: number;
  expansionRevenue: number;
  totalRevenue: number;
  paymentCount: number;
  paymentSuccessCount: number;
  refundCount: number;
  refundAmount: number;
  period: {
    start: string;
    end: string;
    type: string;
  };
}

export interface RevenueResponse {
  current: RevenueMetrics;
  previous?: RevenueMetrics;
  growth?: {
    mrrGrowth: number;
    arrGrowth: number;
    revenueGrowth: number;
    churnRate: number;
  };
  generatedAt: string;
}

// ============================================================================
// GET /api/analytics/revenue
// ============================================================================

/**
 * Get revenue metrics for the current tenant
 *
 * Query Parameters:
 * - periodType: 'day' | 'week' | 'month' | 'quarter' | 'year' (default: 'month')
 * - startDate: ISO date string (optional, defaults to current period)
 * - endDate: ISO date string (optional, defaults to current period)
 * - includePrevious: boolean (default: true) - Include previous period for comparison
 *
 * @returns {RevenueResponse} Revenue metrics with optional comparison
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in.',
          },
        },
        { status: 401 }
      );
    }

    // 2. Check rate limiting (100 requests per minute)
    const rateLimitResult = await checkAPIRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    // 3. Get organization context from headers (set by middleware)
    const headersList = await headers();
    const tenantId = headersList.get('x-org-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      );
    }

    // 4. Verify user has access to this organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId: tenantId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization.',
          },
        },
        { status: 403 }
      );
    }

    // 5. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodType = searchParams.get('periodType') || 'month';
    const includePrevious = searchParams.get('includePrevious') !== 'false';

    // Validate period type
    const validPeriods = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(periodType)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PERIOD',
            message: `Invalid period type. Must be one of: ${validPeriods.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // 6. Calculate date range for current period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;

    // Custom date range if provided
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (startDateParam && endDateParam) {
      periodStart = new Date(startDateParam);
      periodEnd = new Date(endDateParam);

      // Calculate previous period based on the custom date range duration
      const periodDuration = periodEnd.getTime() - periodStart.getTime();
      previousEnd = new Date(periodStart);
      previousStart = new Date(periodStart.getTime() - periodDuration);
    } else {
      // Calculate period based on type
      switch (periodType) {
        case 'day':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          previousStart = new Date(periodStart);
          previousStart.setDate(previousStart.getDate() - 1);
          previousEnd = new Date(periodStart);
          break;
        case 'week': {
          // Start of week (Sunday)
          const dayOfWeek = now.getDay();
          periodStart = new Date(now);
          periodStart.setDate(now.getDate() - dayOfWeek);
          periodStart.setHours(0, 0, 0, 0);
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 7);
          previousStart = new Date(periodStart);
          previousStart.setDate(previousStart.getDate() - 7);
          previousEnd = new Date(periodStart);
          break;
        }
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter': {
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
          previousStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
          previousEnd = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        }
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear() + 1, 0, 1);
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          previousEnd = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    // 7. Fetch revenue aggregates from database
    const [currentAggregate, previousAggregate] = await Promise.all([
      prisma.revenueAggregate.findFirst({
        where: {
          tenantId,
          periodType,
          periodStart: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        orderBy: {
          periodStart: 'desc',
        },
      }),
      includePrevious
        ? prisma.revenueAggregate.findFirst({
            where: {
              tenantId,
              periodType,
              periodStart: {
                gte: previousStart,
                lt: previousEnd,
              },
            },
            orderBy: {
              periodStart: 'desc',
            },
          })
        : null,
    ]);

    // 8. Transform to response format
    const formatMetrics = (
      aggregate: typeof currentAggregate,
      start: Date,
      end: Date
    ): RevenueMetrics => ({
      mrr: aggregate?.mrr ? parseFloat(aggregate.mrr.toString()) : 0,
      arr: aggregate?.arr ? parseFloat(aggregate.arr.toString()) : 0,
      newRevenue: aggregate?.newRevenue ? parseFloat(aggregate.newRevenue.toString()) : 0,
      churnedRevenue: aggregate?.churnedRevenue
        ? parseFloat(aggregate.churnedRevenue.toString())
        : 0,
      expansionRevenue: aggregate?.expansionRevenue
        ? parseFloat(aggregate.expansionRevenue.toString())
        : 0,
      totalRevenue: aggregate?.totalRevenue ? parseFloat(aggregate.totalRevenue.toString()) : 0,
      paymentCount: aggregate?.paymentCount || 0,
      paymentSuccessCount: aggregate?.paymentSuccessCount || 0,
      refundCount: aggregate?.refundCount || 0,
      refundAmount: aggregate?.refundAmount ? parseFloat(aggregate.refundAmount.toString()) : 0,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        type: periodType,
      },
    });

    const current = formatMetrics(currentAggregate, periodStart, periodEnd);
    const previous = includePrevious
      ? formatMetrics(previousAggregate, previousStart, previousEnd)
      : undefined;

    // 9. Calculate growth metrics
    let growth;
    if (includePrevious && previous) {
      const calculateGrowth = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(2));
      };

      const calculateChurnRate = (churned: number, total: number): number => {
        if (total === 0) return 0;
        return parseFloat(((churned / total) * 100).toFixed(2));
      };

      growth = {
        mrrGrowth: calculateGrowth(current.mrr, previous.mrr),
        arrGrowth: calculateGrowth(current.arr, previous.arr),
        revenueGrowth: calculateGrowth(current.totalRevenue, previous.totalRevenue),
        churnRate: calculateChurnRate(current.churnedRevenue, previous.totalRevenue),
      };
    }

    // 10. Build response
    const response: RevenueResponse = {
      current,
      previous,
      growth,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch revenue analytics',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
