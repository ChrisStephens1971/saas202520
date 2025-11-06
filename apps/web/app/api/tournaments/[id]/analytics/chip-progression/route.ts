/**
 * API: Chip Progression Analytics
 * GET /api/tournaments/[id]/analytics/chip-progression
 * Sprint 7 - ANALYTICS-001
 *
 * Returns chip progression data over time for all players in a tournament
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Get all chip awards for this tournament, ordered by time
    const chipAwards = await prisma.chipAward.findMany({
      where: {
        match: {
          tournamentId,
        },
      },
      include: {
        match: {
          select: {
            completedAt: true,
          },
        },
        player: {
          include: {
            player: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by player and calculate running total
    const playerProgressionMap = new Map<string, {
      playerId: string;
      playerName: string;
      data: Array<{ timestamp: string; chips: number; matchNumber: number }>;
    }>();

    chipAwards.forEach((award, index) => {
      const playerId = award.playerId;
      const playerName = award.player.player.name;

      if (!playerProgressionMap.has(playerId)) {
        playerProgressionMap.set(playerId, {
          playerId,
          playerName,
          data: [{ timestamp: award.createdAt.toISOString(), chips: 0, matchNumber: 0 }],
        });
      }

      const progression = playerProgressionMap.get(playerId)!;
      const currentTotal = progression.data[progression.data.length - 1].chips;
      const newTotal = currentTotal + award.chipsEarned;

      progression.data.push({
        timestamp: award.createdAt.toISOString(),
        chips: newTotal,
        matchNumber: index + 1,
      });
    });

    // Convert map to array
    const progressionData = Array.from(playerProgressionMap.values());

    return NextResponse.json({
      success: true,
      data: progressionData,
      totalMatches: chipAwards.length,
    });
  } catch (error) {
    console.error('Error fetching chip progression:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chip progression' },
      { status: 500 }
    );
  }
}
