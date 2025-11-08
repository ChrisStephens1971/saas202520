/**
 * GET /api/v1/players/[id]
 * Get player profile
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
import type { PlayerProfile } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/players/:id
 *
 * Get detailed player profile with career statistics.
 * Respects privacy settings - returns limited data if profile is private.
 *
 * @example
 * GET /api/v1/players/clx1234567890
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

    // Fetch player with profile and statistics
    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        tournament: {
          orgId: tenantId,
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!player) {
      return notFoundError('Player');
    }

    // Get player profile
    const profile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
      select: {
        bio: true,
        photoUrl: true,
        skillLevel: true,
        location: true,
        socialLinks: true,
        privacySettings: true,
      },
    });

    // Check privacy settings
    const privacySettings = (profile?.privacySettings as unknown as { profilePublic?: boolean }) || {};
    if (!privacySettings.profilePublic) {
      return forbiddenError('This player profile is private');
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
        totalPrizeWon: true,
        lastPlayedAt: true,
      },
    });

    // Transform to API response format
    const data: PlayerProfile = {
      id: player.id,
      name: player.name,
      bio: profile?.bio || null,
      photoUrl: profile?.photoUrl || null,
      skillLevel: profile?.skillLevel || 'BEGINNER',
      location: profile?.location || null,
      socialLinks: (profile?.socialLinks as unknown) || null,
      careerStats: {
        totalTournaments: stats?.totalTournaments || 0,
        totalMatches: stats?.totalMatches || 0,
        totalWins: stats?.totalWins || 0,
        totalLosses: stats?.totalLosses || 0,
        winRate: stats?.winRate ? parseFloat(stats.winRate.toString()) : 0,
        totalPrizeWon: stats?.totalPrizeWon ? parseFloat(stats.totalPrizeWon.toString()) : 0,
      },
      joinedAt: player.createdAt.toISOString(),
      lastActive: stats?.lastPlayedAt?.toISOString() || null,
    };

    const rateLimitHeaders = getRateLimitHeaders(1000, 993, Date.now() + 3600000);
    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    console.error(`[API Error] GET /api/v1/players/${params.id}:`, error);
    return internalError(
      'Failed to fetch player profile',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
