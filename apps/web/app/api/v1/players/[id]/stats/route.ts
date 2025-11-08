/**
 * GET /api/v1/players/[id]/stats
 * Get detailed player statistics
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tournament/shared';
import {
  apiSuccess,
  notFoundError,
  internalError,
  validationError,
  forbiddenError,
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import { cuidSchema } from '@/lib/api/validation/public-api.validation';
import type { PlayerStats } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/players/:id/stats
 *
 * Get detailed statistics for a player including:
 * - Overall performance metrics
 * - Win/loss streaks
 * - Performance by tournament format
 * - Rankings
 * - Recent performance
 *
 * @example
 * GET /api/v1/players/clx1234/stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error!.message },
        { status: 401 }
      );
    }

    const tenantId = auth.context!.tenantId;

    // Validate player ID
    const validation = cuidSchema.safeParse(params.id);
    if (!validation.success) {
      return validationError('Invalid player ID format');
    }

    const playerId = validation.data;

    // Check player exists
    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        tournament: {
          orgId: tenantId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!player) {
      return notFoundError('Player');
    }

    // Check privacy settings
    const profile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
      select: {
        privacySettings: true,
      },
    });

    const privacySettings = (profile?.privacySettings as unknown as { showStatistics?: boolean }) || {};
    if (!privacySettings.showStatistics) {
      return forbiddenError('Player statistics are private');
    }

    // Get player statistics
    const stats = await prisma.playerStatistics.findFirst({
      where: {
        playerId,
        tenantId,
      },
      select: {
        totalTournaments: true,
        totalMatches: true,
        totalWins: true,
        totalLosses: true,
        winRate: true,
        averageFinish: true,
        currentStreak: true,
        longestStreak: true,
        favoriteFormat: true,
      },
    });

    // Get match history for recent performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMatches = await prisma.matchHistory.findMany({
      where: {
        playerId,
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        result: true,
        createdAt: true,
      },
    });

    const recentTournaments = await prisma.player.findMany({
      where: {
        id: playerId,
        tournament: {
          orgId: tenantId,
          completedAt: {
            gte: thirtyDaysAgo,
          },
        },
      },
      select: {
        tournamentId: true,
        matchesAsPlayerA: {
          where: {
            state: 'completed',
          },
          select: {
            winnerId: true,
          },
        },
        matchesAsPlayerB: {
          where: {
            state: 'completed',
          },
          select: {
            winnerId: true,
          },
        },
      },
    });

    // Calculate recent performance
    const last10Wins = recentMatches
      .slice(0, 10)
      .filter(m => m.result === 'WIN').length;
    const last10Matches = Math.min(recentMatches.length, 10);

    const last30DaysWins = recentTournaments.reduce((sum, t) => {
      const wins = [
        ...t.matchesAsPlayerA.filter(m => m.winnerId === playerId),
        ...t.matchesAsPlayerB.filter(m => m.winnerId === playerId),
      ].length;
      return sum + wins;
    }, 0);

    const last30DaysMatches = recentTournaments.reduce((sum, t) => {
      return sum + t.matchesAsPlayerA.length + t.matchesAsPlayerB.length;
    }, 0);

    // Get performance by format (simplified - would need aggregation)
    const performanceByFormat = stats?.favoriteFormat ? [{
      format: stats.favoriteFormat,
      tournaments: stats.totalTournaments,
      wins: stats.totalWins,
      losses: stats.totalLosses,
      winRate: stats.winRate ? parseFloat(stats.winRate.toString()) : 0,
    }] : [];

    // Transform to API response format
    const data: PlayerStats = {
      playerId: playerId,
      overallStats: {
        totalTournaments: stats?.totalTournaments || 0,
        totalMatches: stats?.totalMatches || 0,
        totalWins: stats?.totalWins || 0,
        totalLosses: stats?.totalLosses || 0,
        winRate: stats?.winRate ? parseFloat(stats.winRate.toString()) : 0,
        averageFinish: stats?.averageFinish ? parseFloat(stats.averageFinish.toString()) : null,
      },
      streaks: {
        currentStreak: stats?.currentStreak || 0,
        longestWinStreak: stats?.longestStreak || 0,
      },
      performanceByFormat,
      rankings: {
        globalRank: null, // Would need ranking calculation
        venueRank: null,
      },
      recentPerformance: {
        last10Matches: {
          wins: last10Wins,
          losses: last10Matches - last10Wins,
          winRate: last10Matches > 0 ? (last10Wins / last10Matches) * 100 : 0,
        },
        last30Days: {
          tournaments: recentTournaments.length,
          wins: last30DaysWins,
          losses: last30DaysMatches - last30DaysWins,
        },
      },
    };

    const rateLimitHeaders = getRateLimitHeaders(1000, 991, Date.now() + 3600000);
    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    console.error(`[API Error] GET /api/v1/players/${params.id}/stats:`, error);
    return internalError(
      'Failed to fetch player statistics',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
