/**
 * GET /api/v1/matches/[id]
 * Get match details
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
import { cuidSchema } from '@/lib/api/validation/public-api.validation';
import type { MatchDetails, GameScore } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * Parse score field that may be stored as string or object
 * @param score - Unknown score value from database
 * @returns GameScore object with playerA and playerB scores
 */
function parseScore(score: unknown): GameScore {
  // If already an object with playerA/playerB, return it
  if (
    typeof score === 'object' &&
    score !== null &&
    'playerA' in score &&
    'playerB' in score
  ) {
    return score as GameScore;
  }

  // If string format (e.g., "21-15"), parse it
  if (typeof score === 'string') {
    const parts = score.split('-').map(Number);
    if (parts.length === 2 && !parts.some(isNaN)) {
      return { playerA: parts[0], playerB: parts[1] };
    }
  }

  // Fallback: return zeros
  return { playerA: 0, playerB: 0 };
}

/**
 * GET /api/v1/matches/:id
 *
 * Get detailed information about a specific match including:
 * - Players with seeds
 * - Tournament context
 * - Score breakdown with individual games
 * - Duration
 * - Match timeline
 *
 * @example
 * GET /api/v1/matches/clx1234567890
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: 401 }
      );
    }

    const tenantId = auth.context.tenantId;

    // Validate match ID
    const validation = cuidSchema.safeParse(id);
    if (!validation.success) {
      return validationError('Invalid match ID format');
    }

    const matchId = validation.data;

    // Fetch match with all details
    const matchResult = await prisma.match.findFirst({
      where: {
        id: matchId,
        tournament: {
          orgId: tenantId,
        },
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
        playerA: {
          select: {
            id: true,
            name: true,
            seed: true,
          },
        },
        playerB: {
          select: {
            id: true,
            name: true,
            seed: true,
          },
        },
        table: {
          select: {
            label: true,
          },
        },
      },
    });

    if (!matchResult) {
      return notFoundError('Match');
    }

    // Type assertion for Prisma include (until client is regenerated)
    const match = matchResult as typeof matchResult & {
      tournament: { id: string; name: string; format: string };
      playerA: { id: string; name: string; seed: number | null } | null;
      playerB: { id: string; name: string; seed: number | null } | null;
      table: { label: string } | null;
    };

    // Calculate duration
    let durationMinutes: number | null = null;
    if (match.startedAt && match.completedAt) {
      const durationMs = match.completedAt.getTime() - match.startedAt.getTime();
      durationMinutes = Math.round(durationMs / 60000);
    }

    // Parse score data
    const scoreData = match.score as unknown as {
      playerA?: number;
      playerB?: number;
      raceTo?: number;
      games?: Array<{ winner: string; score: string }>;
    };
    const games: GameScore[] | undefined = scoreData?.games?.map((g, idx: number) => ({
      gameNumber: idx + 1,
      winner: g.winner,
      score: parseScore(g.score),
    }));

    // Determine winner
    const winner = match.winnerId
      ? (match.playerA?.id === match.winnerId ? match.playerA : match.playerB)
      : null;

    // Transform to API response format
    const data: MatchDetails = {
      id: match.id,
      tournament: {
        id: match.tournament.id,
        name: match.tournament.name,
        format: match.tournament.format,
      },
      round: match.round,
      bracket: match.bracket,
      position: match.position,
      playerA: match.playerA ? {
        id: match.playerA.id,
        name: match.playerA.name,
        seed: match.playerA.seed,
      } : null,
      playerB: match.playerB ? {
        id: match.playerB.id,
        name: match.playerB.name,
        seed: match.playerB.seed,
      } : null,
      status: match.state,
      score: {
        playerA: scoreData?.playerA || 0,
        playerB: scoreData?.playerB || 0,
        raceTo: scoreData?.raceTo,
        games,
      },
      winner: winner ? {
        id: winner.id,
        name: winner.name,
      } : null,
      table: match.table?.label || null,
      startedAt: match.startedAt?.toISOString() || null,
      completedAt: match.completedAt?.toISOString() || null,
      durationMinutes,
    };

    const rateLimitHeaders = getRateLimitHeaders(1000, 989, Date.now() + 3600000);
    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    const { id } = await params;
    console.error(`[API Error] GET /api/v1/matches/${id}:`, error);
    return internalError(
      'Failed to fetch match details',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
