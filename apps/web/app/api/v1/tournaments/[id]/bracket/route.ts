/**
 * GET /api/v1/tournaments/[id]/bracket
 * Get tournament bracket structure
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
import type {
  BracketStructure,
  BracketRound,
  BracketMatchNode,
} from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/tournaments/:id/bracket
 *
 * Get the complete bracket structure for a tournament.
 * Includes winners bracket and losers bracket (for double elimination).
 *
 * @example
 * GET /api/v1/tournaments/clx1234/bracket
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

    // Fetch tournament with matches
    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        orgId: tenantId,
      },
      select: {
        id: true,
        format: true,
        matches: {
          orderBy: [
            { round: 'asc' },
            { position: 'asc' },
          ],
          select: {
            id: true,
            round: true,
            bracket: true,
            position: true,
            state: true,
            score: true,
            winnerId: true,
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
          },
        },
      },
    });

    if (!tournament) {
      return notFoundError('Tournament');
    }

    // Helper function to get round name
    const getRoundName = (round: number, totalRounds: number): string => {
      const roundsFromEnd = totalRounds - round;
      if (roundsFromEnd === 0) return 'Finals';
      if (roundsFromEnd === 1) return 'Semifinals';
      if (roundsFromEnd === 2) return 'Quarterfinals';
      return `Round ${round}`;
    };

    // Group matches by bracket and round
    const winnerMatches = tournament.matches.filter(
      m => m.bracket === 'winners' || m.bracket === null
    );
    const loserMatches = tournament.matches.filter(
      m => m.bracket === 'losers'
    );

    // Helper to build bracket rounds
    const buildBracketRounds = (matches: typeof winnerMatches): BracketRound[] => {
      const roundsMap = new Map<number, BracketMatchNode[]>();

      matches.forEach(match => {
        const score = match.score as unknown as { playerA?: number; playerB?: number };
        const winner = match.winnerId
          ? (match.playerA?.id === match.winnerId ? match.playerA : match.playerB)
          : null;

        const matchNode: BracketMatchNode = {
          matchId: match.id,
          round: match.round,
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
          winner: winner ? {
            id: winner.id,
            name: winner.name,
          } : null,
          score: {
            playerA: score?.playerA || 0,
            playerB: score?.playerB || 0,
          },
          status: match.state,
        };

        if (!roundsMap.has(match.round)) {
          roundsMap.set(match.round, []);
        }
        const roundMatches = roundsMap.get(match.round);
        if (roundMatches) {
          roundMatches.push(matchNode);
        }
      });

      const rounds: BracketRound[] = [];
      const totalRounds = Math.max(...Array.from(roundsMap.keys()));

      roundsMap.forEach((matches, round) => {
        rounds.push({
          round,
          name: getRoundName(round, totalRounds),
          matches: matches.sort((a, b) => a.position - b.position),
        });
      });

      return rounds.sort((a, b) => a.round - b.round);
    };

    // Build bracket structure
    const data: BracketStructure = {
      tournamentId: tournament.id,
      format: tournament.format,
      winnersBracket: buildBracketRounds(winnerMatches),
    };

    // Add losers bracket for double elimination
    if (loserMatches.length > 0) {
      data.losersBracket = buildBracketRounds(loserMatches);
    }

    const rateLimitHeaders = getRateLimitHeaders(1000, 995, Date.now() + 3600000);
    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    console.error(`[API Error] GET /api/v1/tournaments/${params.id}/bracket:`, error);
    return internalError(
      'Failed to fetch tournament bracket',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
