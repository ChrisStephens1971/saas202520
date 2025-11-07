/**
 * GET /api/players/[id]
 * Retrieve player profile with statistics and achievements
 *
 * Sprint 10 Week 2 - Player Profile API Endpoints
 * Multi-tenant: Enforces tenant isolation via session
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPlayerProfile } from '@/lib/player-profiles/services/player-profile-service';
import { PlayerProfileError } from '@/lib/player-profiles/types';

/**
 * Get player profile by ID
 * Returns complete profile with statistics, achievements, and match history
 *
 * @param request - Next.js request
 * @param params - Route parameters containing player ID
 * @returns Player profile data or error response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from session (multi-tenant isolation)
    const tenantId = session.user.orgId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No organization context' },
        { status: 400 }
      );
    }

    const { id: playerId } = await params;

    // Validate player ID format
    if (!playerId || playerId.length === 0) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    // Get player profile with statistics and achievements
    // Pass viewerId for privacy checks
    const profile = await getPlayerProfile(
      playerId,
      tenantId,
      session.user.id
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          profile: profile.profile,
          statistics: {
            ...profile.statistics,
            winRate: parseFloat(profile.statistics.winRate.toString()),
            averageFinish: profile.statistics.averageFinish
              ? parseFloat(profile.statistics.averageFinish.toString())
              : null,
            totalPrizeWon: parseFloat(profile.statistics.totalPrizeWon.toString()),
          },
          achievements: profile.achievements.map(achievement => ({
            ...achievement,
            achievement: {
              ...achievement.achievement,
            }
          })),
          recentMatches: profile.recentMatches,
          rivalries: profile.rivalries,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle known errors from service layer
    if (error instanceof PlayerProfileError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    // Handle unexpected errors
    console.error('[GET /api/players/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
