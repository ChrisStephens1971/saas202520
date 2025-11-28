/**
 * GET /api/v1/players
 * List players with pagination
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@tournament/shared';
import {
  apiPaginated,
  internalError,
  validationError,
  calculatePaginationMeta,
  calculateSkip,
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import {
  playerListQuerySchema,
  safeValidateQuery,
} from '@/lib/api/validation/public-api.validation';
import type { PlayerSummary } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/players
 *
 * List players with pagination and optional filtering.
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search by name (partial match)
 * - skillLevel: Filter by skill level
 *
 * @example
 * GET /api/v1/players?page=1&limit=20&search=john&skillLevel=ADVANCED
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json({ error: auth.error.message }, { status: 401 });
    }

    const tenantId = auth.context.tenantId;

    // Validate query parameters
    const validation = safeValidateQuery(playerListQuerySchema, request.nextUrl.searchParams);

    if (!validation.success) {
      return validationError('Invalid query parameters', { errors: validation.error.errors });
    }

    const { page, limit, search, skillLevel } = validation.data;

    // Build where clause - get unique players from tournaments in this tenant
    const where: Prisma.PlayerWhereInput = {
      tournament: {
        orgId: tenantId,
      },
    };

    // Search by name
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get unique player IDs with their latest tournament data
    const players = await prisma.player.findMany({
      where,
      distinct: ['name'], // Group by player name (assuming same name = same player)
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
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

    // Get player profiles if they exist
    const playerProfiles = await prisma.playerProfile.findMany({
      where: {
        tenantId,
        ...(skillLevel && { skillLevel }),
      },
      select: {
        playerId: true,
        skillLevel: true,
        photoUrl: true,
      },
    });

    const profileMap = new Map(playerProfiles.map((p) => [p.playerId, p]));

    // Calculate stats for each player
    let playersWithStats = players.map((p) => {
      const profile = profileMap.get(p.id);

      const matchesAsA = p.matchesAsPlayerA;
      const matchesAsB = p.matchesAsPlayerB;

      const wins = [
        ...matchesAsA.filter((m) => m.winnerId === p.id),
        ...matchesAsB.filter((m) => m.winnerId === p.id),
      ].length;

      const totalMatches = matchesAsA.length + matchesAsB.length;
      const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

      // Count tournaments (approximate by grouping matches)
      const tournamentsPlayed = Math.ceil(totalMatches / 3); // Rough estimate

      return {
        id: p.id,
        name: p.name,
        skillLevel: profile?.skillLevel || 'BEGINNER',
        winRate: Math.round(winRate * 100) / 100,
        tournamentsPlayed,
        photoUrl: profile?.photoUrl,
        totalMatches,
      };
    });

    // Filter by skill level if specified
    if (skillLevel) {
      playersWithStats = playersWithStats.filter((p) => p.skillLevel === skillLevel);
    }

    // Apply pagination
    const total = playersWithStats.length;
    const skip = calculateSkip(page, limit);
    const paginatedPlayers = playersWithStats.slice(skip, skip + limit);

    // Transform to API response format
    const data: PlayerSummary[] = paginatedPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      skillLevel: p.skillLevel,
      winRate: p.winRate,
      tournamentsPlayed: p.tournamentsPlayed,
      photoUrl: p.photoUrl ?? undefined,
    }));

    const pagination = calculatePaginationMeta(total, page, limit);
    const rateLimitHeaders = getRateLimitHeaders(1000, 994, Date.now() + 3600000);

    return apiPaginated(data, pagination, rateLimitHeaders);
  } catch (error) {
    console.error('[API Error] GET /api/v1/players:', error);
    return internalError(
      'Failed to fetch players',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
