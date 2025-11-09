/**
 * Scheduling Loop
 * Sprint 2 - Queue Management & Scheduling
 *
 * Continuous scheduling loop that:
 * - Polls for ready matches
 * - Auto-assigns matches to available tables
 * - Updates ETAs for all pending matches
 * - Emits real-time updates via WebSocket
 */

import { calculateMatchETAs, updateETAsAfterMatchCompletion } from './eta-calculator';
import { autoAssignTables, getQueueStatus, optimizeQueueAssignments } from './ready-queue';
import { emitMatchAssigned, emitQueueUpdate } from '@/lib/socket-server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface SchedulingConfig {
  pollIntervalMs: number; // How often to check for ready matches
  autoAssign: boolean; // Auto-assign matches to tables
  optimizeAssignments: boolean; // Use optimization algorithm
  enableWebSocket: boolean; // Emit WebSocket events
}

export interface SchedulerStats {
  tournamentId: string;
  startedAt: Date;
  lastRunAt: Date | null;
  totalRuns: number;
  totalAssignments: number;
  averageRunTimeMs: number;
  errors: number;
}

// ============================================================================
// SCHEDULER STATE
// ============================================================================

const activeSchedulers = new Map<string, NodeJS.Timeout>();
const schedulerStats = new Map<string, SchedulerStats>();

// ============================================================================
// SCHEDULING LOOP
// ============================================================================

/**
 * Start scheduling loop for a tournament
 */
export function startSchedulingLoop(
  tournamentId: string,
  config: Partial<SchedulingConfig> = {}
): void {
  // Stop existing scheduler if running
  stopSchedulingLoop(tournamentId);

  // Default config
  const fullConfig: SchedulingConfig = {
    pollIntervalMs: config.pollIntervalMs || 30000, // Default: 30 seconds
    autoAssign: config.autoAssign !== false, // Default: true
    optimizeAssignments: config.optimizeAssignments || false, // Default: false
    enableWebSocket: config.enableWebSocket !== false, // Default: true
  };

  // Initialize stats
  schedulerStats.set(tournamentId, {
    tournamentId,
    startedAt: new Date(),
    lastRunAt: null,
    totalRuns: 0,
    totalAssignments: 0,
    averageRunTimeMs: 0,
    errors: 0,
  });

  // Create interval
  const intervalId = setInterval(async () => {
    await runSchedulingCycle(tournamentId, fullConfig);
  }, fullConfig.pollIntervalMs);

  activeSchedulers.set(tournamentId, intervalId);

  console.log(`Scheduling loop started for tournament ${tournamentId}`);
}

/**
 * Stop scheduling loop for a tournament
 */
export function stopSchedulingLoop(tournamentId: string): void {
  const intervalId = activeSchedulers.get(tournamentId);

  if (intervalId) {
    clearInterval(intervalId);
    activeSchedulers.delete(tournamentId);
    console.log(`Scheduling loop stopped for tournament ${tournamentId}`);
  }
}

/**
 * Run single scheduling cycle
 */
async function runSchedulingCycle(
  tournamentId: string,
  config: SchedulingConfig
): Promise<void> {
  const startTime = Date.now();
  const stats = schedulerStats.get(tournamentId);

  if (!stats) return;

  try {
    // Check if tournament is still active
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { status: true },
    });

    if (!tournament) {
      console.log(`Tournament ${tournamentId} not found, stopping scheduler`);
      stopSchedulingLoop(tournamentId);
      return;
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      console.log(`Tournament ${tournamentId} is ${tournament.status}, stopping scheduler`);
      stopSchedulingLoop(tournamentId);
      return;
    }

    // Get queue status
    const queueStatus = await getQueueStatus(tournamentId);

    // Auto-assign matches if enabled
    let assignments = 0;
    if (config.autoAssign && queueStatus.availableTables > 0 && queueStatus.readyMatches.length > 0) {
      if (config.optimizeAssignments) {
        // Use optimization algorithm
        const { suggestedAssignments } = await optimizeQueueAssignments(tournamentId);

        // Apply suggested assignments
        for (const suggestion of suggestedAssignments) {
          await prisma.match.update({
            where: { id: suggestion.matchId },
            data: {
              state: 'assigned',
              tableId: suggestion.tableId,
            },
          });

          await prisma.table.update({
            where: { id: suggestion.tableId },
            data: {
              status: 'in_use',
              currentMatchId: suggestion.matchId,
            },
          });

          assignments++;

          // Emit WebSocket event
          if (config.enableWebSocket) {
            const io = global.io;
            if (io) {
              emitMatchAssigned(io, tournamentId, suggestion.matchId);
            }
          }
        }
      } else {
        // Use simple greedy assignment
        const tableAssignments = await autoAssignTables(tournamentId);
        assignments = tableAssignments.length;

        // Emit WebSocket events
        if (config.enableWebSocket) {
          const io = global.io;
          if (io) {
            tableAssignments.forEach((assignment) => {
              emitMatchAssigned(io, tournamentId, assignment.matchId);
            });
          }
        }
      }
    }

    // Update ETAs
    await calculateMatchETAs(tournamentId);

    // Emit queue update if assignments were made
    if (assignments > 0 && config.enableWebSocket) {
      const io = global.io;
      if (io) {
        emitQueueUpdate(io, tournamentId);
      }
    }

    // Update stats
    const endTime = Date.now();
    const runTime = endTime - startTime;

    stats.lastRunAt = new Date();
    stats.totalRuns++;
    stats.totalAssignments += assignments;
    stats.averageRunTimeMs =
      (stats.averageRunTimeMs * (stats.totalRuns - 1) + runTime) / stats.totalRuns;

    // Log if significant activity
    if (assignments > 0) {
      console.log(
        `Scheduling cycle for ${tournamentId}: assigned ${assignments} matches in ${runTime}ms`
      );
    }
  } catch (error) {
    console.error(`Error in scheduling cycle for ${tournamentId}:`, error);

    if (stats) {
      stats.errors++;
    }

    // Stop scheduler if too many errors
    if (stats && stats.errors > 10) {
      console.error(
        `Too many errors for tournament ${tournamentId}, stopping scheduler`
      );
      stopSchedulingLoop(tournamentId);
    }
  }
}

// ============================================================================
// MANUAL TRIGGERS
// ============================================================================

/**
 * Manually trigger a scheduling cycle
 * Useful for testing or forcing an immediate update
 */
export async function triggerSchedulingCycle(
  tournamentId: string
): Promise<{
  assignments: number;
  queueStatus: any;
  etas: any;
}> {
  const assignments = await autoAssignTables(tournamentId);
  const queueStatus = await getQueueStatus(tournamentId);
  const etas = await calculateMatchETAs(tournamentId);

  // Emit WebSocket events
  const io = global.io;
  if (io) {
    assignments.forEach((assignment) => {
      emitMatchAssigned(io, tournamentId, assignment.matchId);
    });
    emitQueueUpdate(io, tournamentId);
  }

  return {
    assignments: assignments.length,
    queueStatus,
    etas,
  };
}

/**
 * Force ETAs recalculation after a match completes
 */
export async function onMatchCompleted(
  tournamentId: string,
  matchId: string
): Promise<void> {
  // Recalculate ETAs
  await updateETAsAfterMatchCompletion(tournamentId);

  // Try to auto-assign next matches
  await autoAssignTables(tournamentId);

  // Emit WebSocket update
  const io = global.io;
  if (io) {
    emitQueueUpdate(io, tournamentId);
  }
}

// ============================================================================
// STATS & MONITORING
// ============================================================================

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(tournamentId: string): SchedulerStats | null {
  return schedulerStats.get(tournamentId) || null;
}

/**
 * Get all active schedulers
 */
export function getActiveSchedulers(): string[] {
  return Array.from(activeSchedulers.keys());
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(tournamentId: string): boolean {
  return activeSchedulers.has(tournamentId);
}

/**
 * Stop all schedulers (for graceful shutdown)
 */
export function stopAllSchedulers(): void {
  activeSchedulers.forEach((_, tournamentId) => {
    stopSchedulingLoop(tournamentId);
  });
  schedulerStats.clear();
}

// ============================================================================
// AUTO-START ON TOURNAMENT ACTIVATION
// ============================================================================

/**
 * Auto-start scheduler when tournament becomes active
 */
export async function autoStartSchedulerForTournament(
  tournamentId: string
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });

  if (!tournament) return;

  if (tournament.status === 'active' && !isSchedulerRunning(tournamentId)) {
    startSchedulingLoop(tournamentId, {
      pollIntervalMs: 30000, // 30 seconds
      autoAssign: true,
      optimizeAssignments: false,
      enableWebSocket: true,
    });
  }
}

/**
 * Auto-stop scheduler when tournament completes
 */
export async function autoStopSchedulerForTournament(
  tournamentId: string
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });

  if (!tournament) return;

  if (
    (tournament.status === 'completed' || tournament.status === 'cancelled') &&
    isSchedulerRunning(tournamentId)
  ) {
    stopSchedulingLoop(tournamentId);
  }
}
