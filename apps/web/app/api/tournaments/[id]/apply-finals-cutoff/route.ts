/**
 * API: Apply Finals Cutoff
 * POST /api/tournaments/[id]/apply-finals-cutoff
 * Sprint 4 - CHIP-003
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyFinalsCutoff } from '@/lib/finals-cutoff';
import { prisma } from '@/lib/prisma';
import type { ChipConfig } from '@/lib/chip-tracker';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id;

    // Get tournament with chip config
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.format !== 'chip_format') {
      return NextResponse.json(
        { error: 'Tournament is not chip format' },
        { status: 400 }
      );
    }

    const chipConfig = tournament.chipConfig as ChipConfig;

    if (!chipConfig) {
      return NextResponse.json(
        { error: 'Tournament missing chip configuration' },
        { status: 400 }
      );
    }

    // Apply finals cutoff
    const result = await applyFinalsCutoff(tournamentId, chipConfig);

    return NextResponse.json({
      success: true,
      finalists: result.finalists,
      eliminated: result.eliminated,
      tiebreakers: result.tiebreakers,
      finalistsCount: result.finalists.length,
      eliminatedCount: result.eliminated.length,
    });
  } catch (error) {
    console.error('Error applying finals cutoff:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply finals cutoff' },
      { status: 500 }
    );
  }
}
