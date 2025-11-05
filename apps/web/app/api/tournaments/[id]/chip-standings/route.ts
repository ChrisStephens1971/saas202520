/**
 * API: Get Chip Standings
 * GET /api/tournaments/[id]/chip-standings
 * Sprint 4 - CHIP-002
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChipStandings, getChipStats } from '@/lib/chip-tracker';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const standings = await getChipStandings(tournamentId);

    const response: {
      standings: typeof standings;
      stats?: Awaited<ReturnType<typeof getChipStats>>;
    } = { standings };

    if (includeStats) {
      response.stats = await getChipStats(tournamentId);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching chip standings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}
