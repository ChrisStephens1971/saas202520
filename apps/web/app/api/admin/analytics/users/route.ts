/**
 * Admin User Analytics API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * User growth, activity, and engagement metrics.
 *
 * Routes:
 * - GET /api/admin/analytics/users - Get user analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UserAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
});

// ============================================================================
// GET /api/admin/analytics/users
// ============================================================================

/**
 * Get user analytics with growth and activity metrics
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const validation = UserAnalyticsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { startDate, endDate, granularity } = validation.data;

    // Set default date range (last 30 days if not specified)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get user growth over time
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        createdAt: true,
        organizationMembers: {
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group users by time period
    const userGrowth: Record<string, number> = {};
    const roleDistribution: Record<string, number> = {
      owner: 0,
      admin: 0,
      td: 0,
      scorekeeper: 0,
      streamer: 0,
    };

    users.forEach((user) => {
      // Format date based on granularity
      let dateKey: string;
      const date = new Date(user.createdAt);

      if (granularity === 'day') {
        dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        // month
        dateKey = date.toISOString().substring(0, 7); // YYYY-MM
      }

      userGrowth[dateKey] = (userGrowth[dateKey] || 0) + 1;

      // Count role distribution
      user.organizationMembers.forEach((membership) => {
        if (membership.role in roleDistribution) {
          roleDistribution[membership.role as keyof typeof roleDistribution]++;
        }
      });
    });

    // Get active users (users with recent sessions)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const activeSessions = await prisma.session.findMany({
      where: {
        expires: {
          gte: last7Days,
        },
      },
      distinct: ['userId'],
      select: {
        userId: true,
      },
    });

    const activeUserCount = activeSessions.length;

    // Get total users for activity rate calculation
    const totalUsers = await prisma.user.count();

    // Get users by organization count
    const orgMemberships = await prisma.organizationMember.groupBy({
      by: ['userId'],
      _count: {
        orgId: true,
      },
    });

    const usersByOrgCount = {
      single: 0,
      multiple: 0,
    };

    orgMemberships.forEach((membership) => {
      if (membership._count.orgId === 1) {
        usersByOrgCount.single++;
      } else {
        usersByOrgCount.multiple++;
      }
    });

    // Response
    return NextResponse.json(
      {
        analytics: {
          growth: Object.entries(userGrowth).map(([date, count]) => ({
            date,
            newUsers: count,
          })),
          roleDistribution: Object.entries(roleDistribution).map(([role, count]) => ({
            role,
            count,
            percentage:
              users.length > 0 ? parseFloat(((count / users.length) * 100).toFixed(2)) : 0,
          })),
          activity: {
            totalUsers,
            activeUsersLast7Days: activeUserCount,
            activityRate:
              totalUsers > 0 ? parseFloat(((activeUserCount / totalUsers) * 100).toFixed(2)) : 0,
          },
          engagement: {
            singleOrganization: usersByOrgCount.single,
            multipleOrganizations: usersByOrgCount.multiple,
          },
        },
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          granularity,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user analytics',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
