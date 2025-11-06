/**
 * Admin Tournament Analytics API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Tournament statistics and completion metrics.
 *
 * Routes:
 * - GET /api/admin/analytics/tournaments - Get tournament analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TournamentAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
});

// ============================================================================
// GET /api/admin/analytics/tournaments
// ============================================================================

/**
 * Get tournament analytics with creation and completion metrics
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
    const validation = TournamentAnalyticsQuerySchema.safeParse(queryParams);

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

    // Get tournaments created in date range
    const tournaments = await prisma.tournament.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        _count: {
          select: {
            players: true,
            matches: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group tournaments by time period
    const tournamentCreation: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {
      draft: 0,
      registration: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };
    const formatDistribution: Record<string, number> = {
      single_elimination: 0,
      double_elimination: 0,
      round_robin: 0,
      modified_single: 0,
      chip_format: 0,
    };

    let totalPlayers = 0;
    let totalMatches = 0;

    tournaments.forEach((tournament) => {
      // Format date based on granularity
      let dateKey: string;
      const date = new Date(tournament.createdAt);

      if (granularity === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = date.toISOString().substring(0, 7);
      }

      tournamentCreation[dateKey] = (tournamentCreation[dateKey] || 0) + 1;

      // Count status distribution
      if (tournament.status in statusDistribution) {
        statusDistribution[tournament.status as keyof typeof statusDistribution]++;
      }

      // Count format distribution
      if (tournament.format in formatDistribution) {
        formatDistribution[tournament.format as keyof typeof formatDistribution]++;
      }

      // Aggregate player and match counts
      totalPlayers += tournament._count.players;
      totalMatches += tournament._count.matches;
    });

    // Calculate completion metrics
    const completedTournaments = await prisma.tournament.count({
      where: {
        status: 'completed',
        completedAt: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get average tournament duration
    const completedWithDuration = await prisma.tournament.findMany({
      where: {
        status: 'completed',
        startedAt: { not: null },
        completedAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    let totalDurationHours = 0;
    completedWithDuration.forEach((t) => {
      if (t.startedAt && t.completedAt) {
        const duration = t.completedAt.getTime() - t.startedAt.getTime();
        totalDurationHours += duration / (1000 * 60 * 60); // Convert to hours
      }
    });

    const averageDurationHours =
      completedWithDuration.length > 0
        ? parseFloat((totalDurationHours / completedWithDuration.length).toFixed(2))
        : 0;

    // Get completion rate
    const totalTournamentsInPeriod = tournaments.length;
    const completionRate =
      totalTournamentsInPeriod > 0
        ? parseFloat(((completedTournaments / totalTournamentsInPeriod) * 100).toFixed(2))
        : 0;

    // Response
    return NextResponse.json(
      {
        analytics: {
          creation: Object.entries(tournamentCreation).map(([date, count]) => ({
            date,
            tournamentsCreated: count,
          })),
          statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({
            status,
            count,
            percentage:
              totalTournamentsInPeriod > 0
                ? parseFloat(((count / totalTournamentsInPeriod) * 100).toFixed(2))
                : 0,
          })),
          formatDistribution: Object.entries(formatDistribution).map(([format, count]) => ({
            format,
            count,
            percentage:
              totalTournamentsInPeriod > 0
                ? parseFloat(((count / totalTournamentsInPeriod) * 100).toFixed(2))
                : 0,
          })),
          completion: {
            totalTournaments: totalTournamentsInPeriod,
            completedTournaments,
            completionRate,
            averageDurationHours,
          },
          participation: {
            totalPlayers,
            totalMatches,
            averagePlayersPerTournament:
              totalTournamentsInPeriod > 0
                ? parseFloat((totalPlayers / totalTournamentsInPeriod).toFixed(2))
                : 0,
            averageMatchesPerTournament:
              totalTournamentsInPeriod > 0
                ? parseFloat((totalMatches / totalTournamentsInPeriod).toFixed(2))
                : 0,
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
