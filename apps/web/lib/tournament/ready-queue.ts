/**
 * Ready Queue Manager
 * Sprint 2 - Queue Management & Scheduling
 *
 * Maintains queue of matches ready to start (next 3-5 matches)
 * Auto-assigns matches to available tables
 * Handles match prerequisites and dependencies
 */

import { prisma } from '@/lib/prisma';
import { calculateMatchETAs } from './eta-calculator';

// ============================================================================
// TYPES
// ============================================================================

export interface QueuedMatch {
  matchId: string;
  round: number;
  position: number;
  playerAId: string | null;
  playerBId: string | null;
  playerAName: string | null;
  playerBName: string | null;
  state: string;
  dependencies: string[]; // Match IDs that must complete first
  canStart: boolean;
  priority: number; // Higher = more urgent
}

export interface TableAssignment {
  matchId: string;
  tableId: string;
  assignedAt: Date;
  estimatedStartTime: Date;
}

export interface QueueStatus {
  tournamentId: string;
  readyMatches: QueuedMatch[];
  availableTables: number;
  activeMatches: number;
  pendingMatches: number;
  updatedAt: Date;
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Get matches that are ready to start
 * Checks prerequisites and dependencies
 */
export async function getReadyQueue(
  tournamentId: string,
  limit: number = 5
): Promise<QueuedMatch[]> {
  // Get tournament with matches
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: {
        where: {
          state: {
            in: ['pending', 'ready'],
          },
        },
        include: {
          playerA: true,
          playerB: true,
        },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      },
    },
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Get completed matches
  const completedMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      state: 'completed',
    },
    select: { id: true },
  });

  const completedMatchIds = new Set(completedMatches.map((m) => m.id));

  // Get active matches
  const activeMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      state: {
        in: ['active', 'assigned'],
      },
    },
    select: {
      playerAId: true,
      playerBId: true,
    },
  });

  // Players currently in active matches
  const activePlayers = new Set<string>();
  activeMatches.forEach((match) => {
    if (match.playerAId) activePlayers.add(match.playerAId);
    if (match.playerBId) activePlayers.add(match.playerBId);
  });

  // Process matches to determine readiness
  const queuedMatches: QueuedMatch[] = [];

  for (const match of tournament.matches) {
    const dependencies = await getMatchDependencies(
      match.id,
      tournament.format
    );

    // Check if all dependencies are completed
    const canStart =
      dependencies.every((depId) => completedMatchIds.has(depId)) &&
      match.playerAId !== null &&
      match.playerBId !== null &&
      !activePlayers.has(match.playerAId!) &&
      !activePlayers.has(match.playerBId!);

    // Calculate priority (earlier rounds = higher priority)
    const priority = 1000 - match.round * 10 + (canStart ? 100 : 0);

    queuedMatches.push({
      matchId: match.id,
      round: match.round,
      position: match.position,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
      playerAName: match.playerA?.name || null,
      playerBName: match.playerB?.name || null,
      state: match.state,
      dependencies,
      canStart,
      priority,
    });
  }

  // Sort by priority and return top N that can start
  return queuedMatches
    .filter((m) => m.canStart)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Get dependencies for a match
 * Dependencies are matches that must complete before this match can start
 */
async function getMatchDependencies(
  matchId: string,
  format: string
): Promise<string[]> {
  const dependencies: string[] = [];

  // For bracket formats, check if this match depends on previous round results
  if (
    format === 'single_elimination' ||
    format === 'double_elimination' ||
    format === 'modified_single'
  ) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        round: true,
        position: true,
        bracket: true,
        tournamentId: true,
        playerAId: true,
        playerBId: true,
      },
    });

    if (!match) return dependencies;

    // If players are TBD (null), find which matches feed into this one
    if (!match.playerAId || !match.playerBId) {
      const previousRound = match.round - 1;

      if (previousRound > 0) {
        // Find matches from previous round that feed into this position
        const feedingMatches = await prisma.match.findMany({
          where: {
            tournamentId: match.tournamentId,
            round: previousRound,
            bracket: match.bracket,
          },
        });

        // Add IDs of matches that aren't completed yet
        dependencies.push(
          ...feedingMatches
            .filter((m) => m.state !== 'completed')
            .map((m) => m.id)
        );
      }
    }
  }

  // For chip format and round robin, no dependencies (all matches independent)
  // Chip format uses queue-based assignment, not bracket progression

  return dependencies;
}

/**
 * Auto-assign ready matches to available tables
 */
export async function autoAssignTables(
  tournamentId: string
): Promise<TableAssignment[]> {
  // Get available tables
  const availableTables = await prisma.table.findMany({
    where: {
      tournamentId,
      status: 'available',
    },
  });

  if (availableTables.length === 0) {
    return []; // No tables available
  }

  // Get ready matches
  const readyMatches = await getReadyQueue(
    tournamentId,
    availableTables.length
  );

  if (readyMatches.length === 0) {
    return []; // No matches ready
  }

  // Get ETAs for timing
  const etaUpdate = await calculateMatchETAs(tournamentId);

  // Assign matches to tables
  const assignments: TableAssignment[] = [];
  const now = new Date();

  for (let i = 0; i < Math.min(readyMatches.length, availableTables.length); i++) {
    const match = readyMatches[i];
    const table = availableTables[i];

    // Update match to assigned state
    await prisma.match.update({
      where: { id: match.matchId },
      data: {
        state: 'assigned',
        tableId: table.id,
      },
    });

    // Update table status
    await prisma.table.update({
      where: { id: table.id },
      data: {
        status: 'in_use',
        currentMatchId: match.matchId,
      },
    });

    // Get estimated start time from ETAs
    const eta = etaUpdate.etas.find((e) => e.matchId === match.matchId);
    const estimatedStartTime = eta?.estimatedStartTime || now;

    assignments.push({
      matchId: match.matchId,
      tableId: table.id,
      assignedAt: now,
      estimatedStartTime,
    });
  }

  return assignments;
}

/**
 * Release a table when a match completes
 */
export async function releaseTable(tableId: string): Promise<void> {
  await prisma.table.update({
    where: { id: tableId },
    data: {
      status: 'available',
      currentMatchId: null,
    },
  });
}

/**
 * Get queue status for a tournament
 */
export async function getQueueStatus(
  tournamentId: string
): Promise<QueueStatus> {
  const readyMatches = await getReadyQueue(tournamentId, 10);

  const [availableTables, activeMatches, pendingMatches] = await Promise.all([
    prisma.table.count({
      where: {
        tournamentId,
        status: 'available',
      },
    }),
    prisma.match.count({
      where: {
        tournamentId,
        state: 'active',
      },
    }),
    prisma.match.count({
      where: {
        tournamentId,
        state: {
          in: ['pending', 'ready'],
        },
      },
    }),
  ]);

  return {
    tournamentId,
    readyMatches,
    availableTables,
    activeMatches,
    pendingMatches,
    updatedAt: new Date(),
  };
}

// ============================================================================
// MATCH STATE TRANSITIONS
// ============================================================================

/**
 * Mark match as started
 */
export async function startMatch(matchId: string): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: {
      state: 'active',
      startedAt: new Date(),
    },
  });
}

/**
 * Mark match as completed and release table
 */
export async function completeMatch(
  matchId: string,
  winnerId: string
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tableId: true },
  });

  await prisma.match.update({
    where: { id: matchId },
    data: {
      state: 'completed',
      winnerId,
      completedAt: new Date(),
    },
  });

  // Release table if assigned
  if (match?.tableId) {
    await releaseTable(match.tableId);
  }
}

// ============================================================================
// QUEUE OPTIMIZATION
// ============================================================================

/**
 * Suggest optimal match assignments to minimize wait times
 * Uses greedy algorithm to maximize table utilization
 */
export async function optimizeQueueAssignments(
  tournamentId: string
): Promise<{
  suggestedAssignments: TableAssignment[];
  projectedWaitTime: number;
}> {
  const readyMatches = await getReadyQueue(tournamentId, 20);
  const availableTables = await prisma.table.findMany({
    where: {
      tournamentId,
      status: 'available',
    },
  });

  if (availableTables.length === 0 || readyMatches.length === 0) {
    return {
      suggestedAssignments: [],
      projectedWaitTime: 0,
    };
  }

  const etaUpdate = await calculateMatchETAs(tournamentId);
  const now = new Date();
  const assignments: TableAssignment[] = [];

  // Greedy assignment: assign highest priority matches first
  const sortedMatches = [...readyMatches].sort(
    (a, b) => b.priority - a.priority
  );

  for (let i = 0; i < Math.min(sortedMatches.length, availableTables.length); i++) {
    const match = sortedMatches[i];
    const table = availableTables[i];
    const eta = etaUpdate.etas.find((e) => e.matchId === match.matchId);

    assignments.push({
      matchId: match.matchId,
      tableId: table.id,
      assignedAt: now,
      estimatedStartTime: eta?.estimatedStartTime || now,
    });
  }

  // Calculate projected wait time (average of all ready matches)
  const totalWaitMinutes = etaUpdate.etas
    .filter((eta) => eta.status === 'ready' || eta.status === 'assigned')
    .reduce((sum, eta) => {
      const waitMinutes = Math.max(
        0,
        (eta.estimatedStartTime.getTime() - now.getTime()) / (1000 * 60)
      );
      return sum + waitMinutes;
    }, 0);

  const avgWaitTime =
    readyMatches.length > 0 ? totalWaitMinutes / readyMatches.length : 0;

  return {
    suggestedAssignments: assignments,
    projectedWaitTime: Math.round(avgWaitTime),
  };
}
