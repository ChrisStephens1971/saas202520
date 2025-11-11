/**
 * GET /api/players/[id]/statistics
 * Get player statistics and performance metrics
 * Sprint 10 Week 2 - Player Data Retrieval API
 *
 * Multi-tenant: Validates player belongs to tenant
 * Features: Complete statistics, win rates, streaks, rankings
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/auth/tenant';
import { getPlayerStatistics } from '@/lib/player-profiles/services/player-profile-service';
import { recalculatePlayerStatistics } from '@/lib/player-profiles/services/statistics-calculator';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/players/[id]/statistics
// ============================================================================

/**
 * Get player statistics
 * Returns comprehensive statistics including win rate, streaks, and rankings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract tenant context (authentication + org validation)
    const tenantResult = await extractTenantContext();
    if (!tenantResult.success) {
      return tenantResult.response;
    }

    const { orgId: tenantId } = tenantResult.context;
    const { id: playerId } = await params;

    // Verify player exists and belongs to tenant
    const playerProfile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!playerProfile) {
      return NextResponse.json(
        {
          error: {
            code: 'PLAYER_NOT_FOUND',
            message: 'Player not found or does not belong to your organization',
          },
        },
        { status: 404 }
      );
    }

    // Check if recalculate query param is set
    const { searchParams } = new URL(request.url);
    const recalculate = searchParams.get('recalculate') === 'true';

    let statistics;
    if (recalculate) {
      // Recalculate statistics from scratch
      statistics = await recalculatePlayerStatistics(playerId, tenantId);
    } else {
      // Get existing statistics
      statistics = await getPlayerStatistics(playerId, tenantId);
    }

    // Get player's ranking within tenant
    const winRateRank = await prisma.playerStatistics.count({
      where: {
        tenantId,
        winRate: {
          gt: statistics.winRate,
        },
        totalMatches: {
          gte: 10, // Minimum matches to qualify
        },
      },
    });

    const tournamentsRank = await prisma.playerStatistics.count({
      where: {
        tenantId,
        totalTournaments: {
          gt: statistics.totalTournaments,
        },
      },
    });

    const prizesRank = await prisma.playerStatistics.count({
      where: {
        tenantId,
        totalPrizeWon: {
          gt: statistics.totalPrizeWon,
        },
      },
    });

    // Format response
    return NextResponse.json(
      {
        playerId: statistics.playerId,
        statistics: {
          tournaments: {
            total: statistics.totalTournaments,
            rank: tournamentsRank + 1,
          },
          matches: {
            total: statistics.totalMatches,
            wins: statistics.totalWins,
            losses: statistics.totalLosses,
            winRate: parseFloat(statistics.winRate.toString()),
            rank: winRateRank + 1,
          },
          streaks: {
            current: statistics.currentStreak,
            longest: statistics.longestStreak,
          },
          performance: {
            averageFinish: statistics.averageFinish
              ? parseFloat(statistics.averageFinish.toString())
              : null,
            favoriteFormat: statistics.favoriteFormat,
          },
          prizes: {
            totalWon: parseFloat(statistics.totalPrizeWon.toString()),
            rank: prizesRank + 1,
          },
          activity: {
            lastPlayed: statistics.lastPlayedAt?.toISOString() || null,
          },
        },
        metadata: {
          lastUpdated: statistics.updatedAt.toISOString(),
          recalculated: recalculate,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[GET /api/players/[id]/statistics] Error:', error);

    // Handle known errors
    const err = error as { name?: string; code?: string; message?: string; statusCode?: number };
    if (err.name === 'PlayerProfileError') {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.statusCode || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch player statistics',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
