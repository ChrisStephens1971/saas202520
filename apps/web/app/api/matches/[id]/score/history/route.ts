/**
 * GET /api/matches/[id]/score/history
 * Get score history with audit trail (SCORE-006)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ScoreHistoryResponse } from '@tournament/shared/types/scoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: matchId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // TODO: Implement score history tracking when ScoreUpdate model is added to schema
    // Get score updates
    // const [updates, total] = await Promise.all([
    //   prisma.scoreUpdate.findMany({
    //     where: { matchId },
    //     orderBy: { timestamp: 'desc' },
    //     take: limit,
    //   }),
    //   prisma.scoreUpdate.count({
    //     where: { matchId },
    //   }),
    // ]);

    // // Check if undo is available
    // const undoableCount = await prisma.scoreUpdate.count({
    //   where: {
    //     matchId,
    //     undone: false,
    //     action: { in: ['increment_a', 'increment_b'] },
    //   },
    // });

    // const canUndo = undoableCount > 0;

    // Temporary placeholder response until ScoreUpdate model is implemented
    const response: ScoreHistoryResponse = {
      updates: [],
      total: 0,
      canUndo: false,
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
