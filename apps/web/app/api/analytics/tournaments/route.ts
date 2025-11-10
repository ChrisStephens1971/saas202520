/**
 * Analytics Tournaments API
 * Sprint 10 Week 1 Day 1 - Business Intelligence Features
 *
 * Provides tournament analytics and metrics for tenant business intelligence.
 * Tenant-scoped endpoint (non-admin) for tournament performance tracking.
 *
 * Routes:
 * - GET /api/analytics/tournaments - Get tournament performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import { checkAPIRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TournamentMetrics {
  tournamentCount: number;
  completedCount: number;
  completionRate: number;
  totalPlayers: number;
  avgPlayers: number;
  avgDurationMinutes: number;
  mostPopularFormat: string | null;
  revenue: number;
  period: {
    start: string;
    end: string;
    type: string;
  };
}

export interface TournamentTrend {
  period: string; // YYYY-MM-DD or YYYY-MM format
  count: number;
  completed: number;
  players: number;
  revenue: number;
}

export interface TournamentsResponse {
  current: TournamentMetrics;
  previous?: TournamentMetrics;
  growth?: {
    tournamentGrowth: number;
    playerGrowth: number;
    revenueGrowth: number;
    completionRateChange: number;
  };
  trends: TournamentTrend[];
  topFormats: {
    format: string;
    count: number;
    percentage: number;
  }[];
  generatedAt: string;
}

// ============================================================================
// GET /api/analytics/tournaments
// ============================================================================

/**
 * Get tournament analytics for the current tenant
 *
 * Query Parameters:
 * - periodType: 'day' | 'week' | 'month' | 'quarter' | 'year' (default: 'month')
 * - startDate: ISO date string (optional, defaults to current period)
 * - endDate: ISO date string (optional, defaults to current period)
 * - includePrevious: boolean (default: true) - Include previous period for comparison
 * - includeTrends: boolean (default: true) - Include historical trends
 * - trendsLimit: number (default: 12, max: 24) - Number of trend periods to return
 *
 * @returns {TournamentsResponse} Tournament analytics with trends and comparisons
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
    const includeTrends = searchParams.get('includeTrends') !== 'false';
    const trendsLimitParam = parseInt(searchParams.get('trendsLimit') || '12');

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

    const trendsLimit = Math.min(Math.max(trendsLimitParam, 1), 24);

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
      // Calculate period based on type (same logic as revenue route)
      switch (periodType) {
        case 'day':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          previousStart = new Date(periodStart);
          previousStart.setDate(previousStart.getDate() - 1);
          previousEnd = new Date(periodStart);
          break;
        case 'week': {
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

    // 7. Fetch tournament aggregates from database
    const [currentAggregate, previousAggregate, trendData] = await Promise.all([
      prisma.tournamentAggregate.findFirst({
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
        ? prisma.tournamentAggregate.findFirst({
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
      includeTrends
        ? prisma.tournamentAggregate.findMany({
            where: {
              tenantId,
              periodType,
            },
            orderBy: {
              periodStart: 'desc',
            },
            take: trendsLimit,
          })
        : [],
    ]);

    // 8. Transform to response format
    const formatMetrics = (
      aggregate: typeof currentAggregate,
      start: Date,
      end: Date
    ): TournamentMetrics => ({
      tournamentCount: aggregate?.tournamentCount || 0,
      completedCount: aggregate?.completedCount || 0,
      completionRate: aggregate?.completionRate
        ? parseFloat(aggregate.completionRate.toString())
        : 0,
      totalPlayers: aggregate?.totalPlayers || 0,
      avgPlayers: aggregate?.avgPlayers ? parseFloat(aggregate.avgPlayers.toString()) : 0,
      avgDurationMinutes: aggregate?.avgDurationMinutes
        ? parseFloat(aggregate.avgDurationMinutes.toString())
        : 0,
      mostPopularFormat: aggregate?.mostPopularFormat || null,
      revenue: aggregate?.revenue ? parseFloat(aggregate.revenue.toString()) : 0,
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

      const calculateChange = (current: number, previous: number): number => {
        return parseFloat((current - previous).toFixed(2));
      };

      growth = {
        tournamentGrowth: calculateGrowth(current.tournamentCount, previous.tournamentCount),
        playerGrowth: calculateGrowth(current.totalPlayers, previous.totalPlayers),
        revenueGrowth: calculateGrowth(current.revenue, previous.revenue),
        completionRateChange: calculateChange(current.completionRate, previous.completionRate),
      };
    }

    // 10. Build trends array
    const trends: TournamentTrend[] = trendData.map((data) => ({
      period:
        periodType === 'day' || periodType === 'week'
          ? data.periodStart.toISOString().substring(0, 10)
          : data.periodStart.toISOString().substring(0, 7),
      count: data.tournamentCount || 0,
      completed: data.completedCount || 0,
      players: data.totalPlayers || 0,
      revenue: data.revenue ? parseFloat(data.revenue.toString()) : 0,
    }));

    // 11. Calculate top formats from trends
    const formatCounts = new Map<string, number>();
    trendData.forEach((data) => {
      const dataAny = data as any;
      if (dataAny.mostPopularFormat) {
        const count = formatCounts.get(dataAny.mostPopularFormat) || 0;
        formatCounts.set(dataAny.mostPopularFormat, count + (dataAny.tournamentCount || 0));
      }
    });

    const totalTournaments = Array.from(formatCounts.values()).reduce((sum, count) => sum + count, 0);
    const topFormats = Array.from(formatCounts.entries())
      .map(([format, count]) => ({
        format,
        count,
        percentage: totalTournaments > 0 ? parseFloat(((count / totalTournaments) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 12. Build response
    const response: TournamentsResponse = {
      current,
      previous,
      growth,
      trends,
      topFormats,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching tournament analytics:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tournament analytics',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
