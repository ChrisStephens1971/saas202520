/**
 * API: Assign Next Match (Chip Format Queue)
 * POST /api/tournaments/[id]/matches/assign-next
 * Sprint 4 - CHIP-001
 * Sprint 6 - WebSocket integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { assignNextMatch, assignMatchBatch } from '@/lib/chip-format-engine';
import type { ChipConfig } from '@/lib/chip-tracker';
import { emitMatchAssigned, emitQueueUpdate } from '@/lib/socket-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();

    // Get chip config from request or use defaults
    const chipConfig: ChipConfig = body.chipConfig || {
      winnerChips: 3,
      loserChips: 1,
      qualificationRounds: 5,
      finalsCount: 8,
      pairingStrategy: 'random',
      allowDuplicatePairings: false,
      tiebreaker: 'head_to_head',
    };

    const count = body.count || 1; // Number of matches to assign

    if (count === 1) {
      // Assign single match
      const assignment = await assignNextMatch(tournamentId, chipConfig);

      if (!assignment) {
        return NextResponse.json(
          { error: 'Not enough players available in queue' },
          { status: 400 }
        );
      }

      // Emit WebSocket events
      const io = global.io;
      if (io) {
        emitMatchAssigned(io, tournamentId, assignment.matchId);
        emitQueueUpdate(io, tournamentId);
      }

      return NextResponse.json({
        success: true,
        assignment,
      });
    } else {
      // Assign multiple matches in batch
      const assignments = await assignMatchBatch(tournamentId, chipConfig, count);

      // Emit WebSocket events for batch assignment
      const io = global.io;
      if (io) {
        assignments.forEach((assignment) => {
          emitMatchAssigned(io, tournamentId, assignment.matchId);
        });
        emitQueueUpdate(io, tournamentId);
      }

      return NextResponse.json({
        success: true,
        assignments,
        count: assignments.length,
      });
    }
  } catch (error) {
    console.error('Error assigning match:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign match' },
      { status: 500 }
    );
  }
}
