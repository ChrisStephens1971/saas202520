/**
 * ETA Calculation Service
 * Sprint 2 - Queue Management & Scheduling
 *
 * Predictive duration model for match ETAs:
 * - Estimates match duration based on race-to and player skill
 * - Calculates ETAs for upcoming matches
 * - Updates ETAs in real-time as matches complete
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface MatchETA {
  matchId: string;
  estimatedStartTime: Date;
  estimatedEndTime: Date;
  estimatedDurationMinutes: number;
  confidence: number; // 0-1, how confident we are in the estimate
  position: number; // Position in queue (1 = next match)
  tableId: string | null;
  status: 'waiting' | 'ready' | 'assigned' | 'active';
}

export interface DurationEstimate {
  baseMinutes: number;
  adjustedMinutes: number;
  factors: {
    raceTo?: number;
    skillLevel?: string;
    historicalAverage?: number;
  };
}

export interface ETAUpdate {
  tournamentId: string;
  updatedAt: Date;
  activeMatches: number;
  pendingMatches: number;
  availableTables: number;
  etas: MatchETA[];
}

// ============================================================================
// DURATION ESTIMATION
// ============================================================================

/**
 * Base duration estimates by race-to value (in minutes)
 * These are conservative estimates for pool matches
 */
const BASE_DURATION_BY_RACE_TO: Record<number, number> = {
  1: 5,
  2: 10,
  3: 15,
  4: 20,
  5: 25,
  6: 30,
  7: 35,
  8: 40,
  9: 45,
  10: 50,
  11: 55,
  13: 65,
  15: 75,
};

/**
 * Skill level multipliers for duration
 * Higher skill = faster games (usually)
 */
const SKILL_MULTIPLIERS: Record<string, number> = {
  BEGINNER: 1.3, // Beginners take 30% longer
  INTERMEDIATE: 1.0, // Baseline
  ADVANCED: 0.9, // Advanced players 10% faster
  EXPERT: 0.8, // Experts 20% faster
};

/**
 * Estimate match duration based on race-to and player skill
 */
export function estimateMatchDuration(
  raceTo: number,
  playerASkill?: string,
  playerBSkill?: string,
  historicalAverageDuration?: number
): DurationEstimate {
  // Use historical average if available and reliable (>10 completed matches)
  if (historicalAverageDuration && historicalAverageDuration > 0) {
    return {
      baseMinutes: historicalAverageDuration,
      adjustedMinutes: historicalAverageDuration,
      factors: {
        raceTo,
        historicalAverage: historicalAverageDuration,
      },
    };
  }

  // Base duration from race-to lookup
  const baseMinutes = BASE_DURATION_BY_RACE_TO[raceTo] || raceTo * 5;

  // Calculate average skill multiplier
  const skillLevels = [playerASkill, playerBSkill].filter(
    (s): s is string => s !== undefined && s !== null
  );

  let skillMultiplier = 1.0;
  if (skillLevels.length > 0) {
    const multipliers = skillLevels.map(
      (skill) => SKILL_MULTIPLIERS[skill] || 1.0
    );
    skillMultiplier =
      multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
  }

  const adjustedMinutes = Math.round(baseMinutes * skillMultiplier);

  return {
    baseMinutes,
    adjustedMinutes,
    factors: {
      raceTo,
      skillLevel:
        skillLevels.length > 0 ? skillLevels.join(' vs ') : undefined,
    },
  };
}

/**
 * Get historical average match duration for a tournament
 */
export async function getHistoricalAverageDuration(
  tournamentId: string
): Promise<number | null> {
  const completedMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      state: 'completed',
      startedAt: { not: null },
      completedAt: { not: null },
    },
    select: {
      startedAt: true,
      completedAt: true,
    },
  });

  if (completedMatches.length < 3) {
    return null; // Not enough data
  }

  const durations = completedMatches
    .map((match) => {
      if (!match.startedAt || !match.completedAt) return null;
      const durationMs =
        match.completedAt.getTime() - match.startedAt.getTime();
      return Math.round(durationMs / (1000 * 60)); // Convert to minutes
    })
    .filter((d): d is number => d !== null && d > 0);

  if (durations.length === 0) return null;

  // Return average
  const sum = durations.reduce((acc, d) => acc + d, 0);
  return Math.round(sum / durations.length);
}

// ============================================================================
// ETA CALCULATION
// ============================================================================

/**
 * Calculate ETAs for all pending matches in a tournament
 */
export async function calculateMatchETAs(
  tournamentId: string
): Promise<ETAUpdate> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tables: true,
      matches: {
        where: {
          state: {
            in: ['pending', 'ready', 'assigned', 'active'],
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

  // Get available tables
  const availableTables = tournament.tables.filter(
    (t) => t.status === 'available'
  );

  // Separate matches by state
  const activeMatches = tournament.matches.filter((m) => m.state === 'active');
  const assignedMatches = tournament.matches.filter(
    (m) => m.state === 'assigned'
  );
  const readyMatches = tournament.matches.filter((m) => m.state === 'ready');
  const pendingMatches = tournament.matches.filter((m) => m.state === 'pending');

  // Get historical average duration
  const historicalAvg = await getHistoricalAverageDuration(tournamentId);

  // Extract race-to from tournament config or use default
  const raceTo =
    tournament.format === 'chip_format'
      ? ((tournament.chipConfig as any)?.raceTo as number | undefined) || 5
      : 5;

  // Calculate current time
  const now = new Date();

  // Track when each table will be free
  const tableFreeAt = new Map<string, Date>();

  // Initialize table availability
  tournament.tables.forEach((table) => {
    if (table.status === 'available') {
      tableFreeAt.set(table.id, now);
    }
  });

  // Add active match end times
  for (const match of activeMatches) {
    if (match.tableId && match.startedAt) {
      const playerASkill =
        ((match.playerA?.rating as any)?.skillLevel as string) || undefined;
      const playerBSkill =
        ((match.playerB?.rating as any)?.skillLevel as string) || undefined;

      const estimate = estimateMatchDuration(
        raceTo,
        playerASkill,
        playerBSkill,
        historicalAvg || undefined
      );

      // Calculate when this match will end
      const estimatedEndTime = new Date(
        match.startedAt.getTime() + estimate.adjustedMinutes * 60 * 1000
      );

      tableFreeAt.set(match.tableId, estimatedEndTime);
    }
  }

  // Calculate ETAs for all non-completed matches
  const allPendingMatches = [
    ...assignedMatches,
    ...readyMatches,
    ...pendingMatches,
  ];

  const etas: MatchETA[] = [];
  let position = 1;

  for (const match of allPendingMatches) {
    const playerASkill =
      ((match.playerA?.rating as any)?.skillLevel as string) || undefined;
    const playerBSkill =
      ((match.playerB?.rating as any)?.skillLevel as string) || undefined;

    const estimate = estimateMatchDuration(
      raceTo,
      playerASkill,
      playerBSkill,
      historicalAvg || undefined
    );

    // Find earliest available table
    let earliestTableTime = now;
    let assignedTableId: string | null = null;

    if (match.state === 'assigned' && match.tableId) {
      // Already assigned to a table
      assignedTableId = match.tableId;
      earliestTableTime = tableFreeAt.get(match.tableId) || now;
    } else if (match.state === 'active' && match.tableId) {
      // Active match
      assignedTableId = match.tableId;
      earliestTableTime = match.startedAt || now;
    } else {
      // Find next available table
      const sortedTables = Array.from(tableFreeAt.entries()).sort(
        (a, b) => a[1].getTime() - b[1].getTime()
      );

      if (sortedTables.length > 0) {
        [assignedTableId, earliestTableTime] = sortedTables[0];
      }
    }

    // Calculate ETA
    const estimatedStartTime =
      match.state === 'active' && match.startedAt
        ? match.startedAt
        : earliestTableTime;

    const estimatedEndTime = new Date(
      estimatedStartTime.getTime() + estimate.adjustedMinutes * 60 * 1000
    );

    // Update table free time for next iteration
    if (assignedTableId) {
      tableFreeAt.set(assignedTableId, estimatedEndTime);
    }

    // Calculate confidence based on available data
    let confidence = 0.5; // Base confidence
    if (historicalAvg) confidence += 0.3; // +30% if we have historical data
    if (playerASkill && playerBSkill) confidence += 0.2; // +20% if we know skill levels

    etas.push({
      matchId: match.id,
      estimatedStartTime,
      estimatedEndTime,
      estimatedDurationMinutes: estimate.adjustedMinutes,
      confidence: Math.min(confidence, 1.0),
      position: position++,
      tableId: assignedTableId,
      status: match.state as 'waiting' | 'ready' | 'assigned' | 'active',
    });
  }

  return {
    tournamentId,
    updatedAt: now,
    activeMatches: activeMatches.length,
    pendingMatches: allPendingMatches.length,
    availableTables: availableTables.length,
    etas,
  };
}

/**
 * Get ETA for a specific match
 */
export async function getMatchETA(matchId: string): Promise<MatchETA | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
    },
  });

  if (!match) return null;

  const etaUpdate = await calculateMatchETAs(match.tournamentId);
  return etaUpdate.etas.find((eta) => eta.matchId === matchId) || null;
}

/**
 * Recalculate ETAs after a match completes
 * This should be called automatically when match state changes
 */
export async function updateETAsAfterMatchCompletion(
  tournamentId: string
): Promise<ETAUpdate> {
  return calculateMatchETAs(tournamentId);
}

// ============================================================================
// ETA UTILITIES
// ============================================================================

/**
 * Get next N matches that are ready to start
 */
export async function getNextReadyMatches(
  tournamentId: string,
  limit: number = 5
): Promise<MatchETA[]> {
  const etaUpdate = await calculateMatchETAs(tournamentId);

  return etaUpdate.etas
    .filter((eta) => eta.status === 'ready' || eta.status === 'assigned')
    .slice(0, limit);
}

/**
 * Get estimated wait time for a player
 */
export async function getPlayerWaitTime(
  playerId: string,
  tournamentId: string
): Promise<{ estimatedMinutes: number; position: number } | null> {
  const etaUpdate = await calculateMatchETAs(tournamentId);

  // Find player's next match
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      OR: [{ playerAId: playerId }, { playerBId: playerId }],
      state: {
        in: ['pending', 'ready', 'assigned'],
      },
    },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
    take: 1,
  });

  if (matches.length === 0) return null;

  const matchId = matches[0].id;
  const eta = etaUpdate.etas.find((e) => e.matchId === matchId);

  if (!eta) return null;

  const now = new Date();
  const waitMinutes = Math.max(
    0,
    Math.round(
      (eta.estimatedStartTime.getTime() - now.getTime()) / (1000 * 60)
    )
  );

  return {
    estimatedMinutes: waitMinutes,
    position: eta.position,
  };
}
