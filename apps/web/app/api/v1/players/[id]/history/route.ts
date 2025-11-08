/**
 * GET /api/v1/players/[id]/history
 * Get player tournament history
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tournament/shared';
import {
  apiPaginated,
  notFoundError,
  internalError,
  validationError,
  forbiddenError,
  calculatePaginationMeta,
  calculateSkip,
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import {
  cuidSchema,
  playerHistoryQuerySchema,
  safeValidateQuery,
} from '@/lib/api/validation/public-api.validation';
import type { PlayerTournamentHistory } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/players/:id/history
 *
 * Get player's tournament history with pagination.
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by tournament status (completed)
 *
 * @example
 * GET /api/v1/players/clx1234/history?page=1&limit=20
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
    const idValidation = cuidSchema.safeParse(params.id);
    if (!idValidation.success) {
      return validationError('Invalid player ID format');
    }

    const playerId = idValidation.data;

    // Validate query parameters
    const queryValidation = safeValidateQuery(
      playerHistoryQuerySchema,
      request.nextUrl.searchParams
    );

    if (!queryValidation.success) {
      return validationError(
        'Invalid query parameters',
        { errors: queryValidation.error.errors }
      );
    }

    const { page, limit, status } = queryValidation.data;

    // Check player exists and profile privacy
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

    const privacySettings = (profile?.privacySettings as unknown as { showHistory?: boolean }) || {};
    if (!privacySettings.showHistory) {
      return forbiddenError('Player history is private');
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tournamentId: {
        in: await prisma.player.findMany({
          where: { id: playerId },
          select: { tournamentId: true },
        }).then(results => results.map(r => r.tournamentId)),
      },
      orgId: tenantId,
    };

    if (status === 'completed') {
      where.status = 'completed';
    }

    // Get total count
    const total = await prisma.tournament.count({ where });

    // Get tournaments where player participated
    const tournaments = await prisma.tournament.findMany({
      where,
      skip: calculateSkip(page, limit),
      take: limit,
      orderBy: {
        completedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        format: true,
        status: true,
        startedAt: true,
        completedAt: true,
        players: {
          where: {
            id: playerId,
          },
          select: {
            seed: true,
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
        },
      },
    });

    // Transform to API response format
    const data: PlayerTournamentHistory[] = tournaments.map(t => {
      const playerData = t.players[0];

      const matchesAsA = playerData?.matchesAsPlayerA || [];
      const matchesAsB = playerData?.matchesAsPlayerB || [];

      const wins = [
        ...matchesAsA.filter(m => m.winnerId === playerId),
        ...matchesAsB.filter(m => m.winnerId === playerId),
      ].length;

      const totalMatches = matchesAsA.length + matchesAsB.length;
      const losses = totalMatches - wins;

      return {
        tournamentId: t.id,
        tournamentName: t.name,
        format: t.format,
        status: t.status,
        placement: null, // Would need ranking logic to calculate
        wins,
        losses,
        startDate: t.startedAt?.toISOString() || null,
        completedDate: t.completedAt?.toISOString() || null,
      };
    });

    const pagination = calculatePaginationMeta(total, page, limit);
    const rateLimitHeaders = getRateLimitHeaders(1000, 992, Date.now() + 3600000);

    return apiPaginated(data, pagination, rateLimitHeaders);

  } catch (error) {
    console.error(`[API Error] GET /api/v1/players/${params.id}/history:`, error);
    return internalError(
      'Failed to fetch player history',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
