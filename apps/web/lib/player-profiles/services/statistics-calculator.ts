/**
 * Statistics Calculator Service
 * Sprint 10 Week 2 - Day 2: Services & Logic
 *
 * Calculates and updates player statistics based on match results.
 * Handles win rates, streaks, head-to-head records, and performance metrics.
 *
 * @module statistics-calculator
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { StatisticsUpdate, PlayerProfileError } from '../types';

const prisma = new PrismaClient();

// ============================================================================
// STATISTICS RECALCULATION
// ============================================================================

/**
 * Recalculate all statistics for a player from scratch
 * Use this for data integrity checks or when importing historical data
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @returns Updated player statistics
 */
export async function recalculatePlayerStatistics(playerId: string, tenantId: string): Promise<any> {
  try {
    console.log(`[recalculatePlayerStatistics] Starting for player ${playerId}`);

    // Get all match history
    const matches = await prisma.matchHistory.findMany({
      where: {
        playerId,
        tenantId,
      },
      orderBy: {
        matchDate: 'asc',
      },
    });

    // Get tournament participation
    const _tournaments = await prisma.player.findMany({
      where: {
        // Note: This needs proper player-user relationship
        // For now, using match history to infer tournaments
      },
    });

    // Calculate totals
    const totalMatches = matches.length;
    const totalWins = matches.filter((m) => m.result === 'WIN').length;
    const totalLosses = matches.filter((m) => m.result === 'LOSS').length;
    const _totalDraws = matches.filter((m) => m.result === 'DRAW').length;

    // Calculate win rate
    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(matches);

    // Calculate average finish (from match metadata)
    const finishes: number[] = [];
    matches.forEach((match) => {
      const metadata = match.metadata as any;
      if (metadata?.finish) {
        finishes.push(metadata.finish);
      }
    });
    const averageFinish = finishes.length > 0 ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null;

    // Calculate favorite format
    const formatCounts = matches.reduce(
      (acc, match) => {
        acc[match.format] = (acc[match.format] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const favoriteFormat = Object.entries(formatCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Calculate total prizes won (from match metadata)
    const totalPrizeWon = matches.reduce((sum, match) => {
      const metadata = match.metadata as any;
      return sum + (metadata?.prizeWon || 0);
    }, 0);

    // Get last played date
    const lastPlayedAt = matches.length > 0 ? matches[matches.length - 1].matchDate : null;

    // Get unique tournaments
    const uniqueTournaments = new Set(matches.map((m) => m.tournamentId)).size;

    // Upsert statistics
    const statistics = await prisma.playerStatistics.upsert({
      where: {
        playerId,
      },
      update: {
        totalTournaments: uniqueTournaments,
        totalMatches,
        totalWins,
        totalLosses,
        winRate,
        currentStreak,
        longestStreak,
        averageFinish,
        favoriteFormat,
        totalPrizeWon,
        lastPlayedAt,
        updatedAt: new Date(),
      },
      create: {
        playerId,
        tenantId,
        totalTournaments: uniqueTournaments,
        totalMatches,
        totalWins,
        totalLosses,
        winRate,
        currentStreak,
        longestStreak,
        averageFinish,
        favoriteFormat,
        totalPrizeWon,
        lastPlayedAt,
      },
    });

    console.log(`[recalculatePlayerStatistics] Completed for player ${playerId}`, {
      totalMatches,
      totalWins,
      winRate: `${winRate.toFixed(2)}%`,
      currentStreak,
    });

    return statistics;
  } catch {
    console.error('[recalculatePlayerStatistics] Error');
    throw new PlayerProfileError('Failed to recalculate statistics', 'RECALCULATE_STATS_ERROR');
  }
}

/**
 * Update statistics incrementally after a single match
 * More efficient than full recalculation
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param update - Match result update
 * @returns Updated statistics
 */
export async function updateStatisticsAfterMatch(
  playerId: string,
  tenantId: string,
  update: StatisticsUpdate
): Promise<any> {
  try {
    // Get current statistics
    let stats = await prisma.playerStatistics.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    // Create if doesn't exist
    if (!stats) {
      stats = await prisma.playerStatistics.create({
        data: {
          playerId,
          tenantId,
        },
      });
    }

    // Calculate new values
    const totalMatches = stats.totalMatches + 1;
    const totalWins = stats.totalWins + (update.matchResult === 'WIN' ? 1 : 0);
    const totalLosses = stats.totalLosses + (update.matchResult === 'LOSS' ? 1 : 0);

    // Calculate new win rate
    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

    // Update streak
    let currentStreak = stats.currentStreak;
    let longestStreak = stats.longestStreak;

    if (update.matchResult === 'WIN') {
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (update.matchResult === 'LOSS') {
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
    }

    // Update average finish
    let averageFinish = stats.averageFinish;
    if (update.finish) {
      if (averageFinish) {
        // Calculate new average
        const currentTotal = parseFloat(averageFinish.toString()) * stats.totalTournaments;
        averageFinish = new Prisma.Decimal((currentTotal + update.finish) / (stats.totalTournaments + 1));
      } else {
        averageFinish = new Prisma.Decimal(update.finish);
      }
    }

    // Update favorite format
    let favoriteFormat = stats.favoriteFormat;
    if (update.format) {
      // Get format counts
      const formatCounts = await prisma.matchHistory.groupBy({
        by: ['format'],
        where: {
          playerId,
          tenantId,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 1,
      });

      favoriteFormat = formatCounts[0]?.format || favoriteFormat;
    }

    // Update total prize won
    let totalPrizeWon = stats.totalPrizeWon;
    if (update.prizeWon) {
      totalPrizeWon = new Prisma.Decimal(parseFloat(totalPrizeWon.toString()) + update.prizeWon);
    }

    // Update statistics
    const updated = await prisma.playerStatistics.update({
      where: {
        id: stats.id,
      },
      data: {
        totalMatches,
        totalWins,
        totalLosses,
        winRate,
        currentStreak,
        longestStreak,
        averageFinish,
        favoriteFormat,
        totalPrizeWon,
        lastPlayedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`[updateStatisticsAfterMatch] Updated for player ${playerId}`, {
      result: update.matchResult,
      newWinRate: `${winRate.toFixed(2)}%`,
      currentStreak,
    });

    return updated;
  } catch {
    console.error('[updateStatisticsAfterMatch] Error');
    throw new PlayerProfileError('Failed to update statistics', 'UPDATE_STATS_ERROR');
  }
}

// ============================================================================
// SPECIFIC CALCULATIONS
// ============================================================================

/**
 * Calculate win rate for a player
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @returns Win rate percentage
 */
export async function calculateWinRate(playerId: string, tenantId: string): Promise<number> {
  try {
    const stats = await prisma.playerStatistics.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!stats || stats.totalMatches === 0) {
      return 0;
    }

    return (stats.totalWins / stats.totalMatches) * 100;
  } catch (error) {
    console.error('[calculateWinRate] Error:', error);
    return 0;
  }
}

/**
 * Calculate current and longest streaks
 *
 * @param matches - Array of matches in chronological order
 * @returns Streak information
 */
export function calculateStreaks(matches: any[]): { currentStreak: number; longestStreak: number } {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const match of matches) {
    if (match.result === 'WIN') {
      tempStreak = tempStreak >= 0 ? tempStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, tempStreak);
      currentStreak = tempStreak;
    } else if (match.result === 'LOSS') {
      tempStreak = tempStreak <= 0 ? tempStreak - 1 : -1;
      currentStreak = tempStreak;
    }
  }

  return { currentStreak, longestStreak };
}

// ============================================================================
// HEAD-TO-HEAD RECORDS
// ============================================================================

/**
 * Update head-to-head record after a match
 *
 * @param player1Id - First player ID
 * @param player2Id - Second player ID
 * @param tenantId - Tenant ID
 * @param winnerId - Winner player ID
 * @returns Updated head-to-head record
 */
export async function updateHeadToHeadRecord(
  player1Id: string,
  player2Id: string,
  tenantId: string,
  winnerId: string
): Promise<any> {
  try {
    // Ensure consistent ordering (player1 < player2)
    const [p1, p2] = [player1Id, player2Id].sort();

    // Get or create record
    let record = await prisma.headToHeadRecord.findFirst({
      where: {
        player1Id: p1,
        player2Id: p2,
        tenantId,
      },
    });

    if (!record) {
      record = await prisma.headToHeadRecord.create({
        data: {
          player1Id: p1,
          player2Id: p2,
          tenantId,
          player1Wins: 0,
          player2Wins: 0,
          draws: 0,
          lastPlayed: new Date(),
        },
      });
    }

    // Update counts
    const updateData: any = {
      lastPlayed: new Date(),
      updatedAt: new Date(),
    };

    if (winnerId === p1) {
      updateData.player1Wins = record.player1Wins + 1;
    } else if (winnerId === p2) {
      updateData.player2Wins = record.player2Wins + 1;
    } else {
      updateData.draws = record.draws + 1;
    }

    // Update record
    const updated = await prisma.headToHeadRecord.update({
      where: {
        id: record.id,
      },
      data: updateData,
    });

    console.log(`[updateHeadToHeadRecord] Updated ${p1} vs ${p2}`, {
      player1Wins: updated.player1Wins,
      player2Wins: updated.player2Wins,
    });

    return updated;
  } catch (error) {
    console.error('[updateHeadToHeadRecord] Error:', error);
    throw new PlayerProfileError('Failed to update head-to-head record', 'UPDATE_H2H_ERROR');
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Recalculate statistics for multiple players
 * Useful for data migrations or integrity checks
 *
 * @param tenantId - Tenant ID
 * @param playerIds - Array of player IDs (optional, defaults to all)
 * @returns Number of players processed
 */
export async function batchRecalculateStatistics(tenantId: string, playerIds?: string[]): Promise<number> {
  try {
    // Get all players if not specified
    let players: string[];
    if (playerIds) {
      players = playerIds;
    } else {
      const allStats = await prisma.playerStatistics.findMany({
        where: { tenantId },
        select: { playerId: true },
      });
      players = allStats.map((s) => s.playerId);
    }

    console.log(`[batchRecalculateStatistics] Processing ${players.length} players`);

    let processed = 0;
    for (const playerId of players) {
      try {
        await recalculatePlayerStatistics(playerId, tenantId);
        processed++;

        // Log progress every 10 players
        if (processed % 10 === 0) {
          console.log(`[batchRecalculateStatistics] Processed ${processed}/${players.length} players`);
        }
      } catch (error) {
        console.error(`[batchRecalculateStatistics] Error for player ${playerId}:`, error);
      }
    }

    console.log(`[batchRecalculateStatistics] Completed. Processed ${processed} players`);
    return processed;
  } catch (error) {
    console.error('[batchRecalculateStatistics] Error:', error);
    throw new PlayerProfileError('Failed to batch recalculate statistics', 'BATCH_RECALCULATE_ERROR');
  }
}

/**
 * Update tournament count for a player
 * Called after tournament completion
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @returns Updated statistics
 */
export async function incrementTournamentCount(playerId: string, tenantId: string): Promise<any> {
  try {
    let stats = await prisma.playerStatistics.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!stats) {
      stats = await prisma.playerStatistics.create({
        data: {
          playerId,
          tenantId,
          totalTournaments: 1,
        },
      });
    } else {
      stats = await prisma.playerStatistics.update({
        where: {
          id: stats.id,
        },
        data: {
          totalTournaments: stats.totalTournaments + 1,
          updatedAt: new Date(),
        },
      });
    }

    console.log(`[incrementTournamentCount] Player ${playerId} now has ${stats.totalTournaments} tournaments`);

    return stats;
  } catch (error) {
    console.error('[incrementTournamentCount] Error:', error);
    throw new PlayerProfileError('Failed to increment tournament count', 'INCREMENT_TOURNAMENT_ERROR');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  updateStatisticsAfterMatch,
  calculateWinRate,
  calculateStreaks,
  updateHeadToHeadRecord,
  batchRecalculateStatistics,
  incrementTournamentCount,
};
