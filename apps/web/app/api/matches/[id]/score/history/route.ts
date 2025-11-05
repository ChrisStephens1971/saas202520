/**
 * GET /api/matches/[id]/score/history
 * Get score history with audit trail (SCORE-006)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ScoreHistoryResponse } from '@repo/shared/types/scoring';

const MAX_UNDO_DEPTH = 3;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Get score updates
    const [updates, total] = await Promise.all([
      prisma.scoreUpdate.findMany({
        where: { matchId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      }),
      prisma.scoreUpdate.count({
        where: { matchId },
      }),
    ]);

    // Check if undo is available
    const undoableCount = await prisma.scoreUpdate.count({
      where: {
        matchId,
        undone: false,
        action: { in: ['increment_a', 'increment_b'] },
      },
    });

    const canUndo = undoableCount > 0;

    const response: ScoreHistoryResponse = {
      updates: updates as any,
      total,
      canUndo,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching score history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
