/**
 * API: Tournament ETA Calculation
 * GET /api/tournaments/[id]/eta
 * POST /api/tournaments/[id]/eta/recalculate
 * Sprint 2 - Queue Management & Scheduling
 *
 * Provides estimated times of arrival (ETAs) for all pending matches
 * Supports real-time updates and player-specific wait time queries
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateMatchETAs,
  getPlayerWaitTime,
  updateETAsAfterMatchCompletion,
} from '@/lib/tournament/eta-calculator';
import { getQueueStatus } from '@/lib/tournament/ready-queue';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/tournaments/[id]/eta
// Get current ETAs for all pending matches
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const { searchParams } = new URL(request.url);

    // Optional: Get ETA for specific player
    const playerId = searchParams.get('playerId');

    if (playerId) {
      // Return player-specific wait time
      const waitTime = await getPlayerWaitTime(playerId, tournamentId);

      if (!waitTime) {
        return NextResponse.json(
          {
            success: false,
            error: 'No upcoming matches found for this player',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          playerId,
          waitTime,
          tournamentId,
        },
      });
    }

    // Calculate ETAs for all matches
    const etaUpdate = await calculateMatchETAs(tournamentId);
    const queueStatus = await getQueueStatus(tournamentId);

    // Calculate queue metrics
    const now = new Date();
    const waitTimes = etaUpdate.etas.map((eta) =>
      Math.max(
        0,
        (eta.estimatedStartTime.getTime() - now.getTime()) / (1000 * 60)
      )
    );

    const averageWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, w) => sum + w, 0) / waitTimes.length
        : 0;

    // Estimate completion time (last match end time)
    const lastMatchETA = etaUpdate.etas[etaUpdate.etas.length - 1];
    const estimatedCompletionTime = lastMatchETA
      ? lastMatchETA.estimatedEndTime
      : now;

    // Calculate table utilization
    const totalTables = await prisma.table.count({
      where: { tournamentId },
    });

    const tableUtilization =
      totalTables > 0
        ? ((totalTables - queueStatus.availableTables) / totalTables) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        tournamentId,
        etas: etaUpdate.etas.map((eta) => ({
          ...eta,
          estimatedStartTime: eta.estimatedStartTime.toISOString(),
          estimatedEndTime: eta.estimatedEndTime.toISOString(),
        })),
        queueStatus: {
          ...queueStatus,
          updatedAt: queueStatus.updatedAt.toISOString(),
        },
        metrics: {
          averageWaitTimeMinutes: Math.round(averageWaitTime),
          tableUtilizationPercent: Math.round(tableUtilization),
          playersWaiting: queueStatus.readyMatches.filter(
            (m) => m.playerAId && m.playerBId
          ).length * 2,
          estimatedCompletionTime: estimatedCompletionTime.toISOString(),
        },
        updatedAt: etaUpdate.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error calculating ETAs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate ETAs',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/tournaments/[id]/eta/recalculate
// Force recalculation of ETAs (after match completion or state change)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Verify tournament exists and is tenant-scoped
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        orgId: true,
        status: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tournament not found',
        },
        { status: 404 }
      );
    }

    // TODO: Add tenant verification when auth is implemented
    // const session = await getServerSession();
    // if (session?.user?.orgId !== tournament.orgId) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 403 }
    //   );
    // }

    // Recalculate ETAs
    const etaUpdate = await updateETAsAfterMatchCompletion(tournamentId);

    return NextResponse.json({
      success: true,
      data: {
        tournamentId,
        etas: etaUpdate.etas.map((eta) => ({
          ...eta,
          estimatedStartTime: eta.estimatedStartTime.toISOString(),
          estimatedEndTime: eta.estimatedEndTime.toISOString(),
        })),
        recalculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error recalculating ETAs:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to recalculate ETAs',
      },
      { status: 500 }
    );
  }
}
