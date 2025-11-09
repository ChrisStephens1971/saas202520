/**
 * GET /api/v1/tournaments/[id]/matches
 * List all matches in a tournament
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@tournament/shared';
import {
  apiSuccess,
  notFoundError,
  internalError,
  validationError,
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import {
  cuidSchema,
  tournamentMatchesQuerySchema,
  safeValidateQuery,
} from '@/lib/api/validation/public-api.validation';
import type { TournamentMatchSummary } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/tournaments/:id/matches
 *
 * List all matches in a tournament with optional filtering.
 *
 * Query Parameters:
 * - round: Filter by round number
 * - status: Filter by match status (pending, in_progress, completed)
 *
 * @example
 * GET /api/v1/tournaments/clx1234/matches?round=1&status=completed
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
      tournamentMatchesQuerySchema,
      request.nextUrl.searchParams
    );

    if (!queryValidation.success) {
      return validationError(
        'Invalid query parameters',
        { errors: queryValidation.error.errors }
      );
    }

    const { round, status } = queryValidation.data;

    // Build where clause
    const where: Prisma.MatchWhereInput = {
      tournamentId,
    };

    if (round !== undefined) {
      where.round = round;
    }

    if (status) {
      switch (status) {
        case 'pending':
          where.state = 'pending';
          break;
        case 'in_progress':
          where.state = { in: ['ready', 'assigned', 'active'] };
          break;
        case 'completed':
          where.state = 'completed';
          break;
      }
    }

    // Fetch matches
    const matchesResult = await prisma.match.findMany({
      where,
      orderBy: [
        { round: 'asc' },
        { position: 'asc' },
      ],
      include: {
        playerA: {
          select: {
            id: true,
            name: true,
          },
        },
        playerB: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            label: true,
          },
        },
      },
    });

    // Type assertion for Prisma include (until client is regenerated)
    type MatchWithRelations = typeof matchesResult[0] & {
      playerA: { id: string; name: string } | null;
      playerB: { id: string; name: string } | null;
      table: { label: string } | null;
    };
    const matches = matchesResult as MatchWithRelations[];

    // Transform to API response format
    const data: TournamentMatchSummary[] = matches.map((m) => {
      const score = m.score as unknown as { playerA?: number; playerB?: number };
      const winner = m.winnerId
        ? (m.playerA?.id === m.winnerId ? m.playerA : m.playerB)
        : null;

      return {
        id: m.id,
        round: m.round,
        bracket: m.bracket,
        position: m.position,
        playerA: m.playerA ? { id: m.playerA.id, name: m.playerA.name } : null,
        playerB: m.playerB ? { id: m.playerB.id, name: m.playerB.name } : null,
        status: m.state,
        score: {
          playerA: score?.playerA || 0,
          playerB: score?.playerB || 0,
        },
        winner: winner ? { id: winner.id, name: winner.name } : null,
        table: m.table?.label || null,
        startedAt: m.startedAt?.toISOString() || null,
        completedAt: m.completedAt?.toISOString() || null,
      };
    });

    const rateLimitHeaders = getRateLimitHeaders(1000, 997, Date.now() + 3600000);
    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    console.error(`[API Error] GET /api/v1/tournaments/${params.id}/matches:`, error);
    return internalError(
      'Failed to fetch tournament matches',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
