/**
 * Chip Format Queue Engine
 * Sprint 4 - CHIP-001
 *
 * Queue-based match assignment for chip format tournaments.
 * Supports random, rating-based, and round-robin pairing strategies.
 */

import { prisma } from '@/lib/prisma';
import type { ChipConfig } from '@/lib/chip-tracker';

// ============================================================================
// TYPES
// ============================================================================

export interface QueuedPlayer {
  id: string;
  name: string;
  chipCount: number;
  matchesPlayed: number;
  rating?: { system: string; value: number | string };
  matchHistory: string[]; // Array of opponent IDs they've played
}

export interface MatchAssignment {
  matchId: string;
  playerA: QueuedPlayer;
  playerB: QueuedPlayer;
  tableId: string | null;
  round: number;
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Get available players from the queue
 * Returns players who are checked in, active, and not currently in a match
 */
export async function getAvailableQueue(tournamentId: string): Promise<QueuedPlayer[]> {
  const players = await prisma.player.findMany({
    where: {
      tournamentId,
      status: {
        in: ['checked_in', 'active'],
      },
    },
    orderBy: [
      { chipCount: 'desc' }, // Prioritize players with fewer chips (fairness)
      { matchesPlayed: 'asc' },
    ],
  });

  // Check which players are currently in active matches
  const activeMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      state: {
        in: ['ready', 'assigned', 'active'],
      },
    },
    select: {
      playerAId: true,
      playerBId: true,
    },
  });

  const activePlayers = new Set<string>();
  activeMatches.forEach((match) => {
    if (match.playerAId) activePlayers.add(match.playerAId);
    if (match.playerBId) activePlayers.add(match.playerBId);
  });

  // Filter out players currently in matches
  const availablePlayers = players.filter((p) => !activePlayers.has(p.id));

  // Get match history for each player
  const playersWithHistory = await Promise.all(
    availablePlayers.map(async (player) => {
      const matches = await prisma.match.findMany({
        where: {
          tournamentId,
          state: 'completed',
          OR: [{ playerAId: player.id }, { playerBId: player.id }],
        },
        select: {
          playerAId: true,
          playerBId: true,
        },
      });

      const opponentIds = matches.map((match) =>
        match.playerAId === player.id ? match.playerBId : match.playerAId
      ).filter((id): id is string => id !== null);

      return {
        id: player.id,
        name: player.name,
        chipCount: player.chipCount ?? 0,
        matchesPlayed: player.matchesPlayed ?? 0,
        rating: player.rating as { system: string; value: number | string } | undefined,
        matchHistory: opponentIds,
      };
    })
  );

  return playersWithHistory;
}

// ============================================================================
// PAIRING STRATEGIES
// ============================================================================

/**
 * Random pairing strategy
 * Pairs players randomly from the queue
 */
export function pairRandom(
  queue: QueuedPlayer[],
  allowDuplicates: boolean
): [QueuedPlayer, QueuedPlayer] | null {
  if (queue.length < 2) return null;

  // Try to find a pairing without duplicates first
  if (!allowDuplicates) {
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const playerA = queue[i];
        const playerB = queue[j];

        if (!playerA.matchHistory.includes(playerB.id)) {
          return [playerA, playerB];
        }
      }
    }
  }

  // If no new pairing found or duplicates allowed, pair randomly
  const shuffled = [...queue].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

/**
 * Rating-based pairing strategy
 * Pairs players with similar ratings
 */
export function pairByRating(
  queue: QueuedPlayer[],
  allowDuplicates: boolean
): [QueuedPlayer, QueuedPlayer] | null {
  if (queue.length < 2) return null;

  // Sort by rating (if available)
  const sorted = [...queue].sort((a, b) => {
    const ratingA = typeof a.rating?.value === 'number' ? a.rating.value : 0;
    const ratingB = typeof b.rating?.value === 'number' ? b.rating.value : 0;
    return ratingB - ratingA;
  });

  // Try to pair adjacent players (similar rating) without duplicates
  if (!allowDuplicates) {
    for (let i = 0; i < sorted.length - 1; i++) {
      const playerA = sorted[i];
      const playerB = sorted[i + 1];

      if (!playerA.matchHistory.includes(playerB.id)) {
        return [playerA, playerB];
      }
    }
  }

  // If no new pairing found, pair adjacent players
  return [sorted[0], sorted[1]];
}

/**
 * Round-robin pairing strategy
 * Pairs players to ensure everyone plays everyone
 */
export function pairRoundRobin(
  queue: QueuedPlayer[]
): [QueuedPlayer, QueuedPlayer] | null {
  if (queue.length < 2) return null;

  // Find player who has played the fewest opponents
  const playerWithFewestMatches = queue.reduce((min, player) =>
    player.matchHistory.length < min.matchHistory.length ? player : min
  );

  // Find an opponent they haven't played yet
  const availableOpponents = queue.filter(
    (p) =>
      p.id !== playerWithFewestMatches.id &&
      !playerWithFewestMatches.matchHistory.includes(p.id)
  );

  if (availableOpponents.length === 0) {
    // Everyone has played everyone, start over
    return [queue[0], queue[1]];
  }

  // Pair with opponent who has also played fewest matches
  const opponent = availableOpponents.reduce((min, player) =>
    player.matchHistory.length < min.matchHistory.length ? player : min
  );

  return [playerWithFewestMatches, opponent];
}

// ============================================================================
// MATCH ASSIGNMENT
// ============================================================================

/**
 * Assign next match from the queue
 * Returns null if not enough players available
 */
export async function assignNextMatch(
  tournamentId: string,
  chipConfig: ChipConfig
): Promise<MatchAssignment | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { tables: true },
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Check if qualification is locked (finals have started)
  if (tournament.qualificationLocked) {
    throw new Error('Qualification phase is locked. Finals have started.');
  }

  // Get available players
  const queue = await getAvailableQueue(tournamentId);

  if (queue.length < 2) {
    return null; // Not enough players
  }

  // Select pairing based on strategy
  let pairing: [QueuedPlayer, QueuedPlayer] | null = null;

  switch (chipConfig.pairingStrategy) {
    case 'rating':
      pairing = pairByRating(queue, chipConfig.allowDuplicatePairings);
      break;
    case 'round_robin':
      pairing = pairRoundRobin(queue);
      break;
    case 'random':
    default:
      pairing = pairRandom(queue, chipConfig.allowDuplicatePairings);
      break;
  }

  if (!pairing) {
    return null;
  }

  const [playerA, playerB] = pairing;

  // Find available table
  const availableTable = tournament.tables.find(
    (table) => table.status === 'available'
  );

  // Determine next round number
  const lastMatch = await prisma.match.findFirst({
    where: { tournamentId },
    orderBy: { round: 'desc' },
    select: { round: true },
  });

  const nextRound = lastMatch ? lastMatch.round + 1 : 1;

  // Create match
  const match = await prisma.match.create({
    data: {
      tournamentId,
      round: nextRound,
      position: 0, // Position not relevant for chip format
      playerAId: playerA.id,
      playerBId: playerB.id,
      state: availableTable ? 'assigned' : 'ready',
      tableId: availableTable?.id || null,
      score: { playerA: 0, playerB: 0 },
    },
  });

  // Update table status if assigned
  if (availableTable) {
    await prisma.table.update({
      where: { id: availableTable.id },
      data: {
        status: 'in_use',
        currentMatchId: match.id,
      },
    });
  }

  return {
    matchId: match.id,
    playerA,
    playerB,
    tableId: availableTable?.id || null,
    round: nextRound,
  };
}

/**
 * Assign multiple matches in batch
 * Useful for starting a new round
 */
export async function assignMatchBatch(
  tournamentId: string,
  chipConfig: ChipConfig,
  count: number
): Promise<MatchAssignment[]> {
  const assignments: MatchAssignment[] = [];

  for (let i = 0; i < count; i++) {
    const assignment = await assignNextMatch(tournamentId, chipConfig);
    if (!assignment) break;
    assignments.push(assignment);
  }

  return assignments;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(tournamentId: string) {
  const queue = await getAvailableQueue(tournamentId);

  const activeMatches = await prisma.match.count({
    where: {
      tournamentId,
      state: { in: ['ready', 'assigned', 'active'] },
    },
  });

  return {
    availablePlayers: queue.length,
    activeMatches,
    possiblePairings: Math.floor(queue.length / 2),
  };
}
