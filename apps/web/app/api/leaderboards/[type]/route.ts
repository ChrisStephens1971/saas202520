/**
 * Leaderboard API Endpoint
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * GET /api/leaderboards/[type]
 * Retrieves leaderboard data for different metrics with tenant isolation
 *
 * Supported types: win-rate, tournaments, prize-money, achievements
 */

import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth'; // TODO: Uncomment when auth is connected
import { z } from 'zod';
import { getPlayerLeaderboard } from '@/lib/player-profiles/services/player-profile-service';
import { LeaderboardType, PlayerProfileError } from '@/lib/player-profiles/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LeaderboardTypeSchema = z.enum(['win-rate', 'tournaments', 'prize-money', 'achievements']);

const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  timeframe: z.enum(['all-time', 'month', 'week']).default('all-time'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map URL-friendly leaderboard type to internal type
 */
function mapLeaderboardType(urlType: string): LeaderboardType {
  const mapping: Record<string, LeaderboardType> = {
    'win-rate': 'winRate',
    'tournaments': 'tournaments',
    'prize-money': 'prizes',
    'achievements': 'achievements',
  };

  return mapping[urlType] || 'winRate';
}

/**
 * Get tenant ID from session
 * TODO: Replace with actual session handling when auth is connected
 */
async function getTenantId(): Promise<string> {
  // const session = await getServerSession();
  // if (!session?.user?.orgId) {
  //   throw new Error('Unauthorized');
  // }
  // return session.user.orgId;

  // Mock tenant ID for development
  return 'org_123';
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    // Validate leaderboard type
    const typeValidation = LeaderboardTypeSchema.safeParse(type);
    if (!typeValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid leaderboard type',
          message: 'Type must be one of: win-rate, tournaments, prize-money, achievements',
          validTypes: ['win-rate', 'tournaments', 'prize-money', 'achievements'],
        },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = LeaderboardQuerySchema.safeParse({
      limit: searchParams.get('limit') || '100',
      timeframe: searchParams.get('timeframe') || 'all-time',
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { limit, timeframe } = queryValidation.data;

    // Get tenant ID from session (with multi-tenant isolation)
    const tenantId = await getTenantId();

    // Map URL type to internal type
    const leaderboardType = mapLeaderboardType(type);

    // Fetch leaderboard data from service
    const leaderboardResult = await getPlayerLeaderboard(tenantId, leaderboardType, limit);

    // Format response
    return NextResponse.json({
      type,
      timeframe,
      leaderboard: {
        entries: leaderboardResult.entries.map((entry) => ({
          rank: entry.rank,
          playerId: entry.playerId,
          playerName: entry.playerName,
          photoUrl: entry.photoUrl,
          skillLevel: entry.skillLevel,
          value: entry.value,
          formattedValue: entry.formattedValue,
          change: entry.change || 0,
        })),
        totalPlayers: leaderboardResult.totalPlayers,
        updatedAt: leaderboardResult.updatedAt,
      },
      metadata: {
        limit,
        count: leaderboardResult.entries.length,
        hasMore: leaderboardResult.entries.length >= limit,
      },
    });
  } catch (error) {
    console.error('[GET /api/leaderboards/[type]] Error:', error);

    // Handle specific error types
    if (error instanceof PlayerProfileError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    // Handle unauthorized errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to view leaderboards',
        },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard',
        message: 'An unexpected error occurred while fetching leaderboard data',
      },
      { status: 500 }
    );
  }
}
