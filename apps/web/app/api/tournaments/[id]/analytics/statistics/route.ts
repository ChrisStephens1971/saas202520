/**
 * API: Tournament Statistics
 * GET /api/tournaments/[id]/analytics/statistics
 * Sprint 7 - ANALYTICS-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const [players, matches, chipAwards, tournament] = await Promise.all([
      prisma.tournamentPlayer.count({ where: { tournamentId } }),
      prisma.match.count({ where: { tournamentId } }),
      prisma.chipAward.aggregate({
        where: { match: { tournamentId } },
        _sum: { chipsEarned: true },
      }),
      prisma.tournamentPlayer.aggregate({
        where: { tournamentId },
        _avg: { chipCount: true },
        _max: { chipCount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      statistics: {
        totalPlayers: players,
        totalMatches: matches,
        totalChipsAwarded: chipAwards._sum.chipsEarned || 0,
        averageChips: tournament._avg.chipCount || 0,
        maxChips: tournament._max.chipCount || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
