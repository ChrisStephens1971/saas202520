/**
 * API: Get Queue Statistics
 * GET /api/tournaments/[id]/queue-stats
 * Sprint 4 - CHIP-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueueStats } from '@/lib/chip-format-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id;
    const stats = await getQueueStats(tournamentId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch queue stats' },
      { status: 500 }
    );
  }
}
