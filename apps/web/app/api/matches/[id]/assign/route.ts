/**
 * POST /api/matches/[id]/assign
 * Assign a match to a table
 * Sprint 4 - NOTIFY-004 (triggers match-ready notifications)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notifyMatchReady } from '@/lib/match-notifications';

interface AssignMatchRequest {
  tableId: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: matchId } = await params;
    const body: AssignMatchRequest = await request.json();
    const { tableId } = body;

    if (!tableId) {
      return NextResponse.json({ error: 'Missing required field: tableId' }, { status: 400 });
    }

    // Fetch match
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

    // Check if match has both players assigned
    if (!match.playerAId || !match.playerBId) {
      return NextResponse.json(
        { error: 'Cannot assign match without both players' },
        { status: 400 }
      );
    }

    // TODO: Check if user has permission to assign matches

    // Verify table exists and is available
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (table.tournamentId !== match.tournamentId) {
      return NextResponse.json(
        { error: 'Table does not belong to this tournament' },
        { status: 400 }
      );
    }

    if (table.status !== 'available') {
      return NextResponse.json(
        { error: `Table is ${table.status}, not available` },
        { status: 400 }
      );
    }

    // Assign match to table in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update match
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          tableId,
          state: 'ready', // Mark match as ready
        },
        include: {
          playerA: true,
          playerB: true,
          table: true,
        },
      });

      // Update table status
      await tx.table.update({
        where: { id: tableId },
        data: {
          status: 'in_use',
          currentMatchId: matchId,
        },
      });

      // Create tournament event
      await tx.tournamentEvent.create({
        data: {
          tournamentId: match.tournamentId,
          kind: 'match.assigned',
          actor: session.user.id,
          device: 'web',
          payload: {
            matchId,
            tableId,
            playerAId: match.playerAId,
            playerBId: match.playerBId,
          },
        },
      });

      return updatedMatch;
    });

    // NOTIFY-004: Send match-ready notifications (non-blocking)
    notifyMatchReady(matchId).catch((err) =>
      console.error('Failed to send match-ready notifications:', err)
    );

    return NextResponse.json(
      {
        success: true,
        match: {
          id: result.id,
          state: result.state,
          tableId: result.tableId,
          tableName: result.table?.label,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning match:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
