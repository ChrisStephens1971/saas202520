/**
 * Analytics Cohorts API
 * Sprint 10 Week 1 Day 1 - Business Intelligence Features
 *
 * Provides user cohort analysis for tenant business intelligence.
 * Tenant-scoped endpoint (non-admin) for retention and cohort metrics.
 *
 * Routes:
 * - GET /api/analytics/cohorts - Get cohort retention analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import { checkAPIRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CohortData {
  cohortMonth: string; // YYYY-MM-01 format
  cohortSize: number;
  monthNumber: number;
  retainedUsers: number;
  retentionRate: number;
  revenue: number | null;
  ltv: number | null;
}

export interface CohortAnalysis {
  cohort: string; // YYYY-MM format for display
  initialSize: number;
  retentionByMonth: {
    month: number;
    retained: number;
    rate: number;
  }[];
  totalRevenue: number;
  averageLtv: number;
}

export interface CohortsResponse {
  cohorts: CohortAnalysis[];
  summary: {
    totalCohorts: number;
    averageRetention: {
      month1: number;
      month3: number;
      month6: number;
      month12: number;
    };
    averageLtv: number;
  };
  period: string; // 'monthly' or 'weekly'
  generatedAt: string;
}

// ============================================================================
// GET /api/analytics/cohorts
// ============================================================================

/**
 * Get cohort retention analysis for the current tenant
 *
 * Query Parameters:
 * - period: 'monthly' | 'weekly' (default: 'monthly')
 * - limit: number (default: 12, max: 24) - Number of cohorts to return
 * - months: number (default: 12, max: 24) - Number of retention months to include
 *
 * @returns {CohortsResponse} Cohort analysis with retention rates
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
    const period = searchParams.get('period') || 'monthly';
    const limitParam = parseInt(searchParams.get('limit') || '12');
    const monthsParam = parseInt(searchParams.get('months') || '12');

    // Validate parameters
    if (period !== 'monthly' && period !== 'weekly') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PERIOD',
            message: 'Period must be either "monthly" or "weekly"',
          },
        },
        { status: 400 }
      );
    }

    const limit = Math.min(Math.max(limitParam, 1), 24);
    const months = Math.min(Math.max(monthsParam, 1), 24);

    // 6. Fetch cohort data from database
    // Get unique cohort months first
    const cohortMonths = await prisma.userCohort.findMany({
      where: {
        tenantId,
      },
      select: {
        cohortMonth: true,
      },
      distinct: ['cohortMonth'],
      orderBy: {
        cohortMonth: 'desc',
      },
      take: limit,
    });

    if (cohortMonths.length === 0) {
      // No cohort data available
      return NextResponse.json(
        {
          cohorts: [],
          summary: {
            totalCohorts: 0,
            averageRetention: {
              month1: 0,
              month3: 0,
              month6: 0,
              month12: 0,
            },
            averageLtv: 0,
          },
          period,
          generatedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Fetch all retention data for these cohorts
    const cohortData = await prisma.userCohort.findMany({
      where: {
        tenantId,
        cohortMonth: {
          in: cohortMonths.map((c) => c.cohortMonth),
        },
        monthNumber: {
          lte: months,
        },
      },
      orderBy: [{ cohortMonth: 'desc' }, { monthNumber: 'asc' }],
    });

    // 7. Group by cohort and transform data
    const cohortMap = new Map<string, CohortData[]>();

    cohortData.forEach((data) => {
      const cohortKey = data.cohortMonth.toISOString().substring(0, 7); // YYYY-MM
      const existingData = cohortMap.get(cohortKey);

      const newEntry: CohortData = {
        cohortMonth: data.cohortMonth.toISOString(),
        cohortSize: data.cohortSize,
        monthNumber: data.monthNumber,
        retainedUsers: data.retainedUsers,
        retentionRate: parseFloat(data.retentionRate.toString()),
        revenue: data.revenue ? parseFloat(data.revenue.toString()) : null,
        ltv: data.ltv ? parseFloat(data.ltv.toString()) : null,
      };

      if (existingData) {
        existingData.push(newEntry);
      } else {
        cohortMap.set(cohortKey, [newEntry]);
      }
    });

    // 8. Build cohort analysis
    const cohorts: CohortAnalysis[] = Array.from(cohortMap.entries()).map(
      ([cohortKey, data]) => {
        const initialData = data.find((d) => d.monthNumber === 0);
        const totalRevenue = data.reduce((sum, d) => sum + (d.revenue || 0), 0);
        const ltvValues = data.filter((d) => d.ltv !== null).map((d) => d.ltv as number);
        const averageLtv =
          ltvValues.length > 0
            ? ltvValues.reduce((sum, ltv) => sum + ltv, 0) / ltvValues.length
            : 0;

        return {
          cohort: cohortKey,
          initialSize: initialData?.cohortSize || 0,
          retentionByMonth: data.map((d) => ({
            month: d.monthNumber,
            retained: d.retainedUsers,
            rate: d.retentionRate,
          })),
          totalRevenue,
          averageLtv,
        };
      }
    );

    // 9. Calculate summary statistics
    const calculateAverageRetention = (monthNum: number): number => {
      const retentionRates = cohorts
        .map((c) => c.retentionByMonth.find((r) => r.month === monthNum)?.rate)
        .filter((rate): rate is number => rate !== undefined);

      if (retentionRates.length === 0) return 0;
      return parseFloat(
        (retentionRates.reduce((sum, rate) => sum + rate, 0) / retentionRates.length).toFixed(2)
      );
    };

    const totalLtv = cohorts.reduce((sum, c) => sum + c.averageLtv, 0);
    const averageLtv = cohorts.length > 0 ? totalLtv / cohorts.length : 0;

    const summary = {
      totalCohorts: cohorts.length,
      averageRetention: {
        month1: calculateAverageRetention(1),
        month3: calculateAverageRetention(3),
        month6: calculateAverageRetention(6),
        month12: calculateAverageRetention(12),
      },
      averageLtv: parseFloat(averageLtv.toFixed(2)),
    };

    // 10. Build response
    const response: CohortsResponse = {
      cohorts,
      summary,
      period,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching cohort analytics:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch cohort analytics',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
