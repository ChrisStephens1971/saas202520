/**
 * Admin Analytics Overview API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * System-wide metrics and analytics for admin dashboard.
 *
 * Routes:
 * - GET /api/admin/analytics/overview - Get system-wide metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';

// ============================================================================
// GET /api/admin/analytics/overview
// ============================================================================

/**
 * Get system-wide metrics
 * Returns high-level statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Get date ranges
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);

    // Run all queries in parallel for better performance
    const [
      totalUsers,
      newUsersLast30Days,
      newUsersLast7Days,
      totalOrganizations,
      totalTournaments,
      activeTournaments,
      completedTournaments,
      newTournamentsLast30Days,
      totalMatches,
      completedMatches,
      totalPlayers,
      // TODO: Add payment tracking when Payment model is created
      // totalPayments,
      // totalRevenue,
      // revenueByStatus,
    ] = await Promise.all([
      // User metrics
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: last30Days,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: last7Days,
          },
        },
      }),

      // Organization metrics
      prisma.organization.count(),

      // Tournament metrics
      prisma.tournament.count(),
      prisma.tournament.count({
        where: {
          status: 'active',
        },
      }),
      prisma.tournament.count({
        where: {
          status: 'completed',
        },
      }),
      prisma.tournament.count({
        where: {
          createdAt: {
            gte: last30Days,
          },
        },
      }),

      // Match metrics
      prisma.match.count(),
      prisma.match.count({
        where: {
          state: 'completed',
        },
      }),

      // Player metrics
      prisma.player.count(),

      // TODO: Add payment tracking when Payment model is created
      // Payment metrics
      // prisma.payment.count(),
      // prisma.payment.aggregate({
      //   _sum: {
      //     amount: true,
      //   },
      // }),
      // prisma.payment.groupBy({
      //   by: ['status'],
      //   _sum: {
      //     amount: true,
      //   },
      //   _count: {
      //     id: true,
      //   },
      // }),
    ]);

    // Calculate growth rates
    const userGrowthRate =
      totalUsers > 0 ? ((newUsersLast30Days / totalUsers) * 100).toFixed(2) : '0';

    const tournamentGrowthRate =
      totalTournaments > 0 ? ((newTournamentsLast30Days / totalTournaments) * 100).toFixed(2) : '0';

    // TODO: Add payment tracking when Payment model is created
    // Format revenue by status (placeholder until Payment model exists)
    const revenueMetrics = {
      total: 0, // totalRevenue._sum.amount || 0,
      succeeded: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
    };

    // revenueByStatus.forEach((item) => {
    //   const status = item.status as keyof typeof revenueMetrics;
    //   if (status in revenueMetrics && status !== 'total') {
    //     revenueMetrics[status] = item._sum.amount || 0;
    //   }
    // });

    // Response
    return NextResponse.json(
      {
        overview: {
          users: {
            total: totalUsers,
            newLast30Days: newUsersLast30Days,
            newLast7Days: newUsersLast7Days,
            growthRate: parseFloat(userGrowthRate),
          },
          organizations: {
            total: totalOrganizations,
          },
          tournaments: {
            total: totalTournaments,
            active: activeTournaments,
            completed: completedTournaments,
            newLast30Days: newTournamentsLast30Days,
            growthRate: parseFloat(tournamentGrowthRate),
          },
          matches: {
            total: totalMatches,
            completed: completedMatches,
            completionRate:
              totalMatches > 0
                ? parseFloat(((completedMatches / totalMatches) * 100).toFixed(2))
                : 0,
          },
          players: {
            total: totalPlayers,
            averagePerTournament:
              totalTournaments > 0 ? parseFloat((totalPlayers / totalTournaments).toFixed(2)) : 0,
          },
          revenue: {
            total: revenueMetrics.total,
            succeeded: revenueMetrics.succeeded,
            pending: revenueMetrics.pending,
            failed: revenueMetrics.failed,
            refunded: revenueMetrics.refunded,
            totalPayments: 0, // totalPayments - TODO: Add when Payment model exists
            averagePayment: 0, // TODO: Calculate when Payment model exists
            // totalPayments > 0
            //   ? parseFloat((revenueMetrics.total / totalPayments / 100).toFixed(2))
            //   : 0, // Convert cents to dollars
          },
        },
        generatedAt: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics overview',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
