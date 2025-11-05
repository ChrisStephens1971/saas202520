/**
 * POST /api/matches/[id]/score/increment
 * Increment score for a player with validation (SCORE-002, SCORE-003, SCORE-004)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canScoreMatches } from '@/lib/permissions';
import {
  validateScoreIncrement,
  isMatchComplete,
  getMatchWinner,
} from '@tournament/shared';
import type {
  IncrementScoreRequest,
  IncrementScoreResponse,
  MatchScore,
} from '@tournament/shared/types/scoring';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: matchId } = await params;
    const body: IncrementScoreRequest = await request.json();
    const { player, device, rev } = body;

    if (!player || !device || rev === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: player, device, rev' },
        { status: 400 }
      );
    }

    if (player !== 'A' && player !== 'B') {
      return NextResponse.json(
        { error: 'Invalid player: must be A or B' },
        { status: 400 }
      );
    }

    // Fetch match with optimistic locking
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        playerA: true,
        playerB: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // SCORE-007: Check if user has permission to score matches
    const hasPermission = await canScoreMatches(session.user.id, match.tournament.orgId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be a scorekeeper, TD, or owner to score matches' },
        { status: 403 }
      );
    }

    // Check optimistic lock (prevent concurrent updates)
    if (match.rev !== rev) {
      return NextResponse.json(
        {
          error: 'Match was updated by another user. Please refresh.',
          currentRev: match.rev,
        },
        { status: 409 } // Conflict
      );
    }

    // Only allow scoring on active matches
    if (match.state !== 'active') {
      return NextResponse.json(
        { error: `Cannot score match in state: ${match.state}` },
        { status: 400 }
      );
    }

    const currentScore = match.score as MatchScore;
    const raceTo = currentScore.raceTo || 9; // Default race-to-9

    // SCORE-002, SCORE-003, SCORE-004: Validate score increment
    const validation = validateScoreIncrement(
      currentScore,
      player,
      {
        raceTo,
        allowHillHill: true,
        requireConfirmation: true,
      }
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid score',
          validation,
        },
        { status: 400 }
      );
    }

    // Calculate new score
    const newScore: MatchScore = {
      playerA: player === 'A' ? currentScore.playerA + 1 : currentScore.playerA,
      playerB: player === 'B' ? currentScore.playerB + 1 : currentScore.playerB,
      raceTo,
      games: currentScore.games || [],
    };

    // Add game to history
    const gameNumber = (currentScore.games?.length || 0) + 1;
    newScore.games!.push({
      gameNumber,
      winner: player === 'A' ? 'playerA' : 'playerB',
      score: {
        playerA: newScore.playerA,
        playerB: newScore.playerB,
      },
      timestamp: new Date(),
    });

    // Check if match is complete
    const matchComplete = isMatchComplete(newScore, raceTo);
    const winner = matchComplete ? getMatchWinner(newScore, raceTo) : null;
    const winnerId = winner === 'A' ? match.playerAId : winner === 'B' ? match.playerBId : null;

    // Update match in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create score update record (SCORE-006: audit trail)
      const scoreUpdate = await tx.scoreUpdate.create({
        data: {
          matchId,
          tournamentId: match.tournamentId,
          actor: session.user.id,
          device,
          action: player === 'A' ? 'increment_a' : 'increment_b',
          previousScore: currentScore,
          newScore,
        },
      });

      // Update match
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          score: newScore,
          state: matchComplete ? 'completed' : 'active',
          winnerId,
          completedAt: matchComplete ? new Date() : null,
          rev: { increment: 1 }, // Increment version for optimistic locking
        },
      });

      // Create tournament event (audit log)
      await tx.tournamentEvent.create({
        data: {
          tournamentId: match.tournamentId,
          kind: 'match.score_updated',
          actor: session.user.id,
          device,
          payload: {
            matchId,
            player,
            previousScore: currentScore,
            newScore,
            matchComplete,
            winnerId,
          },
        },
      });

      if (matchComplete) {
        await tx.tournamentEvent.create({
          data: {
            tournamentId: match.tournamentId,
            kind: 'match.completed',
            actor: session.user.id,
            device,
            payload: {
              matchId,
              winnerId,
              finalScore: newScore,
            },
          },
        });
      }

      return { updatedMatch, scoreUpdate };
    });

    const response: IncrementScoreResponse = {
      match: {
        id: result.updatedMatch.id,
        score: result.updatedMatch.score as MatchScore,
        state: result.updatedMatch.state,
        winnerId: result.updatedMatch.winnerId || undefined,
        rev: result.updatedMatch.rev,
      },
      scoreUpdate: {
        ...result.scoreUpdate,
        timestamp: result.scoreUpdate.timestamp,
        previousScore: result.scoreUpdate.previousScore as never,
        newScore: result.scoreUpdate.newScore as never,
      },
      validation,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error incrementing score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
