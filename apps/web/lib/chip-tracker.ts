/**
 * Chip Tracker - Chip Format Tournament System
 * Sprint 4 - CHIP-002
 *
 * Manages chip awards, tracking, and history for chip format tournaments.
 */

import { prisma } from '@/lib/prisma';
import type { Player } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ChipConfig {
  winnerChips: number;
  loserChips: number;
  qualificationRounds: number;
  finalsCount: number;
  pairingStrategy: 'random' | 'rating' | 'round_robin';
  allowDuplicatePairings: boolean;
  tiebreaker: 'head_to_head' | 'rating' | 'random';
}

export interface ChipAward {
  matchId: string;
  chipsEarned: number;
  timestamp: Date;
}

export interface ChipStanding {
  playerId: string;
  name: string;
  chipCount: number;
  matchesPlayed: number;
  rank: number;
  rating?: { system: string; value: number | string };
}

// ============================================================================
// CHIP AWARD FUNCTIONS
// ============================================================================

/**
 * Award chips to players after match completion
 * Called automatically when a match is completed
 */
export async function awardChips(
  matchId: string,
  winnerId: string,
  loserId: string,
  chipConfig: ChipConfig
): Promise<{ winner: Player; loser: Player }> {
  const now = new Date();

  // Get current player data
  const [winner, loser] = await Promise.all([
    prisma.player.findUnique({ where: { id: winnerId } }),
    prisma.player.findUnique({ where: { id: loserId } }),
  ]);

  if (!winner || !loser) {
    throw new Error('Players not found');
  }

  // Parse chip history
  const winnerHistory = (winner.chipHistory as ChipAward[] | null) || [];
  const loserHistory = (loser.chipHistory as ChipAward[] | null) || [];

  // Add new chip awards to history
  winnerHistory.push({
    matchId,
    chipsEarned: chipConfig.winnerChips,
    timestamp: now,
  });

  loserHistory.push({
    matchId,
    chipsEarned: chipConfig.loserChips,
    timestamp: now,
  });

  // Update players with new chip counts
  const [updatedWinner, updatedLoser] = await Promise.all([
    prisma.player.update({
      where: { id: winnerId },
      data: {
        chipCount: winner.chipCount + chipConfig.winnerChips,
        matchesPlayed: winner.matchesPlayed + 1,
        chipHistory: winnerHistory,
      },
    }),
    prisma.player.update({
      where: { id: loserId },
      data: {
        chipCount: loser.chipCount + chipConfig.loserChips,
        matchesPlayed: loser.matchesPlayed + 1,
        chipHistory: loserHistory,
      },
    }),
  ]);

  return { winner: updatedWinner, loser: updatedLoser };
}

/**
 * Manually adjust chips for a player (for corrections or penalties)
 */
export async function adjustChips(
  playerId: string,
  chipAdjustment: number,
  reason: string
): Promise<Player> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new Error('Player not found');
  }

  const history = (player.chipHistory as ChipAward[] | null) || [];
  history.push({
    matchId: `manual-${Date.now()}`,
    chipsEarned: chipAdjustment,
    timestamp: new Date(),
  });

  return prisma.player.update({
    where: { id: playerId },
    data: {
      chipCount: player.chipCount + chipAdjustment,
      chipHistory: history,
    },
  });
}

/**
 * Get chip standings for a tournament
 * Returns players ranked by chip count
 */
export async function getChipStandings(
  tournamentId: string
): Promise<ChipStanding[]> {
  const players = await prisma.player.findMany({
    where: {
      tournamentId,
      status: {
        notIn: ['withdrawn', 'no_show'],
      },
    },
    orderBy: [
      { chipCount: 'desc' },
      { matchesPlayed: 'asc' }, // Fewer matches is better if tied
    ],
  });

  return players.map((player, index) => ({
    playerId: player.id,
    name: player.name,
    chipCount: player.chipCount,
    matchesPlayed: player.matchesPlayed,
    rank: index + 1,
    rating: player.rating as { system: string; value: number | string } | undefined,
  }));
}

/**
 * Get chip history for a player
 */
export async function getChipHistory(playerId: string): Promise<ChipAward[]> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { chipHistory: true },
  });

  if (!player) {
    throw new Error('Player not found');
  }

  return (player.chipHistory as ChipAward[] | null) || [];
}

/**
 * Reset chip counts for all players (for testing or restart)
 */
export async function resetChips(tournamentId: string): Promise<number> {
  const result = await prisma.player.updateMany({
    where: { tournamentId },
    data: {
      chipCount: 0,
      matchesPlayed: 0,
      chipHistory: [],
    },
  });

  return result.count;
}

// ============================================================================
// CHIP STATISTICS
// ============================================================================

/**
 * Get chip distribution statistics
 */
export async function getChipStats(tournamentId: string) {
  const players = await prisma.player.findMany({
    where: {
      tournamentId,
      status: { notIn: ['withdrawn', 'no_show'] },
    },
    select: { chipCount: true, matchesPlayed: true },
  });

  if (players.length === 0) {
    return {
      totalPlayers: 0,
      averageChips: 0,
      medianChips: 0,
      maxChips: 0,
      minChips: 0,
      averageMatches: 0,
    };
  }

  const chipCounts = players.map((p) => p.chipCount).sort((a, b) => a - b);
  const totalChips = chipCounts.reduce((sum, chips) => sum + chips, 0);
  const totalMatches = players.reduce((sum, p) => sum + p.matchesPlayed, 0);

  return {
    totalPlayers: players.length,
    averageChips: totalChips / players.length,
    medianChips:
      chipCounts.length % 2 === 0
        ? (chipCounts[chipCounts.length / 2 - 1] + chipCounts[chipCounts.length / 2]) / 2
        : chipCounts[Math.floor(chipCounts.length / 2)],
    maxChips: Math.max(...chipCounts),
    minChips: Math.min(...chipCounts),
    averageMatches: totalMatches / players.length,
  };
}
