/**
 * API: Manual Chip Adjustment
 * PATCH /api/tournaments/[id]/players/[playerId]/chips
 * Sprint 4 - CHIP-002
 */

import { NextRequest, NextResponse } from 'next/server';
import { adjustChips } from '@/lib/chip-tracker';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  try {
    const { playerId } = params;
    const body = await request.json();

    const { adjustment, reason } = body;

    if (typeof adjustment !== 'number') {
      return NextResponse.json(
        { error: 'Chip adjustment must be a number' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason is required for manual chip adjustment' },
        { status: 400 }
      );
    }

    const updatedPlayer = await adjustChips(playerId, adjustment, reason);

    return NextResponse.json({
      success: true,
      player: {
        id: updatedPlayer.id,
        name: updatedPlayer.name,
        chipCount: updatedPlayer.chipCount,
        matchesPlayed: updatedPlayer.matchesPlayed,
      },
      adjustment,
      reason,
    });
  } catch (error) {
    console.error('Error adjusting chips:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to adjust chips' },
      { status: 500 }
    );
  }
}
