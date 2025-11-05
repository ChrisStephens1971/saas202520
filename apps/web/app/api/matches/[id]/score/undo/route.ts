/**
 * POST /api/matches/[id]/score/undo
 * Undo the last score action (SCORE-005)
 * Supports undoing up to the last 3 actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canScoreMatches } from '@/lib/permissions';
import type {
  UndoScoreRequest,
  UndoScoreResponse,
  MatchScore,
} from '@repo/shared/types/scoring';

const MAX_UNDO_DEPTH = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = params.id;
    const body: UndoScoreRequest = await request.json();
    const { device, rev } = body;

    if (!device || rev === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: device, rev' },
        { status: 400 }
      );
    }

    // Fetch match with optimistic locking
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // SCORE-007: Check if user has permission to score matches
    const hasPermission = await canScoreMatches(session.user.id, match.tournament.orgId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be a scorekeeper, TD, or owner to undo scores' },
        { status: 403 }
      );
    }

    // Check optimistic lock
    if (match.rev !== rev) {
      return NextResponse.json(
        {
          error: 'Match was updated by another user. Please refresh.',
          currentRev: match.rev,
        },
        { status: 409 }
      );
    }

    // Only allow undo on active matches
    if (match.state !== 'active' && match.state !== 'completed') {
      return NextResponse.json(
        { error: `Cannot undo score on match in state: ${match.state}` },
        { status: 400 }
      );
    }

    // Get recent score updates (not yet undone)
    const recentUpdates = await prisma.scoreUpdate.findMany({
      where: {
        matchId,
        undone: false,
        action: { in: ['increment_a', 'increment_b'] }, // Only undo increment actions
      },
      orderBy: { timestamp: 'desc' },
      take: MAX_UNDO_DEPTH,
    });

    if (recentUpdates.length === 0) {
      return NextResponse.json(
        { error: 'No actions available to undo' },
        { status: 400 }
      );
    }

    // Get the most recent update to undo
    const updateToUndo = recentUpdates[0];
    const previousScore = updateToUndo.previousScore as MatchScore;

    // Perform undo in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark the score update as undone
      await tx.scoreUpdate.update({
        where: { id: updateToUndo.id },
        data: { undone: true },
      });

      // Create undo action record
      const undoUpdate = await tx.scoreUpdate.create({
        data: {
          matchId,
          tournamentId: match.tournamentId,
          actor: session.user.id,
          device,
          action: 'undo',
          previousScore: updateToUndo.newScore,
          newScore: previousScore,
        },
      });

      // Restore previous score
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          score: previousScore,
          state: 'active', // Revert to active if was completed
          winnerId: null, // Clear winner
          completedAt: null, // Clear completion time
          rev: { increment: 1 },
        },
      });

      // Create tournament event
      await tx.tournamentEvent.create({
        data: {
          tournamentId: match.tournamentId,
          kind: 'match.score_undone',
          actor: session.user.id,
          device,
          payload: {
            matchId,
            undoneUpdateId: updateToUndo.id,
            previousScore: updateToUndo.newScore,
            restoredScore: previousScore,
          },
        },
      });

      return { updatedMatch, undoUpdate };
    });

    // Check how many more actions can be undone
    const remainingUndoableUpdates = await prisma.scoreUpdate.count({
      where: {
        matchId,
        undone: false,
        action: { in: ['increment_a', 'increment_b'] },
        timestamp: { lt: updateToUndo.timestamp },
      },
    });

    const canUndo = remainingUndoableUpdates > 0;

    const response: UndoScoreResponse = {
      match: {
        id: result.updatedMatch.id,
        score: result.updatedMatch.score as MatchScore,
        state: result.updatedMatch.state,
        winnerId: result.updatedMatch.winnerId || undefined,
        rev: result.updatedMatch.rev,
      },
      undoneUpdates: [{
        ...updateToUndo,
        timestamp: updateToUndo.timestamp,
        previousScore: updateToUndo.previousScore as never,
        newScore: updateToUndo.newScore as never,
      }],
      canUndo,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error undoing score:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
