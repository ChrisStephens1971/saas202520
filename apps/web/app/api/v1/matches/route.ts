/**
 * GET /api/v1/matches
 * List matches with pagination
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
  matchListQuerySchema,
  safeValidateQuery,
} from '@/lib/api/validation/public-api.validation';
import type { MatchSummary } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/matches
 *
 * List matches with pagination and optional filtering.
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by match status (in_progress, completed)
 * - tournamentId: Filter by tournament ID
 *
 * @example
 * GET /api/v1/matches?page=1&limit=20&status=in_progress
 */
export async function GET(request: NextRequest) {
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

    // Validate query parameters
    const validation = safeValidateQuery(
      matchListQuerySchema,
      request.nextUrl.searchParams
    );

    if (!validation.success) {
      return validationError(
        'Invalid query parameters',
        { errors: validation.error.errors }
      );
    }

    const { page, limit, status, tournamentId } = validation.data;

    // Build where clause
    const where: Prisma.MatchWhereInput = {
      tournament: {
        orgId: tenantId,
      },
    };

    // Filter by tournament
    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    // Filter by status
    if (status) {
      switch (status) {
        case 'in_progress':
          where.state = { in: ['ready', 'assigned', 'active'] };
          break;
        case 'completed':
          where.state = 'completed';
          break;
      }
    }

    // Get total count
    const total = await prisma.match.count({ where });

    // Get matches with pagination
    const matches = await prisma.match.findMany({
      where,
      skip: calculateSkip(page, limit),
      take: limit,
      orderBy: [
        { startedAt: 'desc' },
        { round: 'desc' },
      ],
      select: {
        id: true,
        tournamentId: true,
        round: true,
        bracket: true,
        state: true,
        score: true,
        winnerId: true,
        startedAt: true,
        completedAt: true,
        tournament: {
          select: {
            name: true,
          },
        },
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
      },
    });

    // Transform to API response format
    const data: MatchSummary[] = matches.map(m => {
      const score = m.score as unknown as { playerA?: number; playerB?: number };
      const winner = m.winnerId
        ? (m.playerA?.id === m.winnerId ? m.playerA : m.playerB)
        : null;

      return {
        id: m.id,
        tournamentId: m.tournamentId,
        tournamentName: m.tournament.name,
        round: m.round,
        bracket: m.bracket,
        playerA: m.playerA ? { id: m.playerA.id, name: m.playerA.name } : null,
        playerB: m.playerB ? { id: m.playerB.id, name: m.playerB.name } : null,
        status: m.state,
        score: {
          playerA: score?.playerA || 0,
          playerB: score?.playerB || 0,
        },
        winner: winner ? { id: winner.id, name: winner.name } : null,
        startedAt: m.startedAt?.toISOString() || null,
        completedAt: m.completedAt?.toISOString() || null,
      };
    });

    const pagination = calculatePaginationMeta(total, page, limit);
    const rateLimitHeaders = getRateLimitHeaders(1000, 990, Date.now() + 3600000);

    return apiPaginated(data, pagination, rateLimitHeaders);

  } catch (error) {
    console.error('[API Error] GET /api/v1/matches:', error);
    return internalError(
      'Failed to fetch matches',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
