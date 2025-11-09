/**
 * GET /api/v1/tournaments/[id]/players
 * List all players in a tournament
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
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import {
  cuidSchema,
  tournamentPlayersQuerySchema,
  safeValidateQuery,
} from '@/lib/api/validation/public-api.validation';
import type { TournamentPlayerSummary } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/tournaments/:id/players
 *
 * List all registered players in a tournament.
 *
 * Query Parameters:
 * - status: Filter by player status (registered, checked_in, eliminated, winner)
 *
 * @example
 * GET /api/v1/tournaments/clx1234/players?status=checked_in
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
        { error: auth.error.message },
        { status: 401 }
      );
    }

    const tenantId = auth.context.tenantId;

    // Validate tournament ID
    const idValidation = cuidSchema.safeParse(params.id);
    if (!idValidation.success) {
      return validationError('Invalid tournament ID format');
    }

    const tournamentId = idValidation.data;

    // Verify tournament exists and belongs to tenant
    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        orgId: tenantId,
      },
      select: { id: true },
    });

    if (!tournament) {
      return notFoundError('Tournament');
    }

    // Validate query parameters
    const queryValidation = safeValidateQuery(
      tournamentPlayersQuerySchema,
      request.nextUrl.searchParams
    );

    if (!queryValidation.success) {
      return validationError(
        'Invalid query parameters',
        { errors: queryValidation.error.errors }
      );
    }

    const { status } = queryValidation.data;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tournamentId,
    };

    if (status) {
      where.status = status;
    }

    // Fetch players with match stats
    const players = await prisma.player.findMany({
      where,
      orderBy: [
        { chipCount: 'desc' }, // For chip format tournaments
        { seed: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        seed: true,
        status: true,
        checkedInAt: true,
        chipCount: true,
        matchesPlayed: true,
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

    // Transform to API response format with calculated stats
    const data: TournamentPlayerSummary[] = players.map((p, index) => {
      // Calculate wins and losses
      const matchesAsA = p.matchesAsPlayerA;
      const matchesAsB = p.matchesAsPlayerB;

      const wins = [
        ...matchesAsA.filter(m => m.winnerId === p.id),
        ...matchesAsB.filter(m => m.winnerId === p.id),
      ].length;

      const totalMatches = matchesAsA.length + matchesAsB.length;
      const losses = totalMatches - wins;

      return {
        id: p.id,
        name: p.name,
        seed: p.seed,
        status: p.status,
        checkedInAt: p.checkedInAt?.toISOString() || null,
        wins,
        losses,
        chipCount: p.chipCount || undefined,
        standing: index + 1, // Based on sorted order (chipCount desc, seed asc)
      };
    });

    const rateLimitHeaders = getRateLimitHeaders(1000, 996, Date.now() + 3600000);
    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    console.error(`[API Error] GET /api/v1/tournaments/${params.id}/players:`, error);
    return internalError(
      'Failed to fetch tournament players',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
