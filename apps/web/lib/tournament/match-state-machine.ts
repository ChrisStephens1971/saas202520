/**
 * Match State Machine and Lifecycle Management
 * Sprint 2 - State transitions, validation, and event-sourced state changes
 *
 * State Flow:
 * pending → ready → active → completed
 *           ↓         ↓
 *        assigned   paused
 *                     ↓
 *                  active
 *
 * Additional states: cancelled, abandoned, forfeited
 */

import { prisma } from '@/lib/prisma';
import type { Match, Player, Tournament } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Valid match states
 */
export type MatchState =
  | 'pending'      // Match created, waiting for players
  | 'ready'        // Both players assigned, waiting to start
  | 'assigned'     // Assigned to table, not started yet
  | 'active'       // Match in progress
  | 'paused'       // Temporarily paused
  | 'completed'    // Match finished normally
  | 'cancelled'    // Match cancelled before completion
  | 'abandoned'    // Match abandoned (e.g., player left)
  | 'forfeited';   // One player forfeited

/**
 * Match state transition events
 */
export type MatchTransitionEvent =
  | 'assign_table'    // pending → ready
  | 'start'           // ready → active
  | 'pause'           // active → paused
  | 'resume'          // paused → active
  | 'complete'        // active → completed
  | 'cancel'          // any → cancelled
  | 'abandon'         // active/paused → abandoned
  | 'forfeit';        // active/paused → forfeited

/**
 * State transition definition
 */
export interface StateTransition {
  from: MatchState[];
  to: MatchState;
  event: MatchTransitionEvent;
  guards?: StateGuard[];
}

/**
 * Guard function to validate transitions
 */
export type StateGuard = (match: MatchWithRelations) => Promise<GuardResult>;

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Match with related data for state machine operations
 */
export type MatchWithRelations = Match & {
  tournament: Tournament;
  playerA: Player | null;
  playerB: Player | null;
};

/**
 * Result of a state transition
 */
export interface TransitionResult {
  success: boolean;
  newState?: MatchState;
  match?: Match;
  error?: string;
  violations?: string[];
}

/**
 * Options for starting a match
 */
export interface StartMatchOptions {
  actorId: string;
  device: string;
  tableId?: string;
}

/**
 * Options for completing a match
 */
export interface CompleteMatchOptions {
  actorId: string;
  device: string;
  winnerId: string;
  finalScore: {
    playerA: number;
    playerB: number;
    raceTo?: number;
  };
}

/**
 * Options for pausing a match
 */
export interface PauseMatchOptions {
  actorId: string;
  device: string;
  reason?: string;
}

/**
 * Options for resuming a match
 */
export interface ResumeMatchOptions {
  actorId: string;
  device: string;
}

/**
 * Options for abandoning a match
 */
export interface AbandonMatchOptions {
  actorId: string;
  device: string;
  reason: string;
}

/**
 * Options for forfeiting a match
 */
export interface ForfeitMatchOptions {
  actorId: string;
  device: string;
  forfeitingPlayerId: string;
  reason?: string;
}

/**
 * Options for updating match score
 */
export interface UpdateScoreOptions {
  actorId: string;
  device: string;
  player: 'A' | 'B';
  newScore: {
    playerA: number;
    playerB: number;
    raceTo?: number;
  };
}

// ============================================================================
// STATE MACHINE CONFIGURATION
// ============================================================================

/**
 * State transition rules
 */
const STATE_TRANSITIONS: StateTransition[] = [
  {
    from: ['pending'],
    to: 'ready',
    event: 'assign_table',
    guards: [hasPlayers, hasTable],
  },
  {
    from: ['ready', 'assigned'],
    to: 'active',
    event: 'start',
    guards: [hasPlayers, hasTable],
  },
  {
    from: ['active'],
    to: 'paused',
    event: 'pause',
  },
  {
    from: ['paused'],
    to: 'active',
    event: 'resume',
  },
  {
    from: ['active'],
    to: 'completed',
    event: 'complete',
    guards: [hasWinner],
  },
  {
    from: ['pending', 'ready', 'assigned'],
    to: 'cancelled',
    event: 'cancel',
  },
  {
    from: ['active', 'paused'],
    to: 'abandoned',
    event: 'abandon',
  },
  {
    from: ['active', 'paused'],
    to: 'forfeited',
    event: 'forfeit',
  },
];

// ============================================================================
// GUARDS
// ============================================================================

/**
 * Guard: Match must have both players assigned
 */
async function hasPlayers(match: MatchWithRelations): Promise<GuardResult> {
  if (!match.playerAId || !match.playerBId) {
    return {
      allowed: false,
      reason: 'Match requires both players to be assigned',
    };
  }
  return { allowed: true };
}

/**
 * Guard: Match must have a table assigned
 */
async function hasTable(match: MatchWithRelations): Promise<GuardResult> {
  if (!match.tableId) {
    return {
      allowed: false,
      reason: 'Match requires a table to be assigned',
    };
  }
  return { allowed: true };
}

/**
 * Guard: Match must have a winner
 */
async function hasWinner(match: MatchWithRelations): Promise<GuardResult> {
  if (!match.winnerId) {
    return {
      allowed: false,
      reason: 'Match requires a winner to be completed',
    };
  }
  return { allowed: true };
}

// ============================================================================
// STATE MACHINE CORE
// ============================================================================

/**
 * Validate if a state transition is allowed
 */
export async function canTransition(
  match: MatchWithRelations,
  event: MatchTransitionEvent
): Promise<{ allowed: boolean; violations: string[] }> {
  const violations: string[] = [];

  // Find matching transition rule
  const transition = STATE_TRANSITIONS.find(
    (t) => t.event === event && t.from.includes(match.state as MatchState)
  );

  if (!transition) {
    violations.push(
      `Invalid transition: ${match.state} → ${event} (no rule exists)`
    );
    return { allowed: false, violations };
  }

  // Run guards if defined
  if (transition.guards) {
    for (const guard of transition.guards) {
      const result = await guard(match);
      if (!result.allowed) {
        violations.push(result.reason || 'Guard check failed');
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}

/**
 * Execute a state transition with validation and event sourcing
 */
export async function transition(
  matchId: string,
  event: MatchTransitionEvent,
  actorId: string,
  device: string,
  payload?: Record<string, any>
): Promise<TransitionResult> {
  try {
    // Fetch match with relations
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        playerA: true,
        playerB: true,
      },
    });

    if (!match) {
      return {
        success: false,
        error: 'Match not found',
      };
    }

    // Validate transition
    const validation = await canTransition(match, event);
    if (!validation.allowed) {
      return {
        success: false,
        error: 'Invalid state transition',
        violations: validation.violations,
      };
    }

    // Find transition rule
    const transition = STATE_TRANSITIONS.find(
      (t) => t.event === event && t.from.includes(match.state as MatchState)
    );

    if (!transition) {
      return {
        success: false,
        error: 'Transition rule not found',
      };
    }

    const newState = transition.to;

    // Execute transition in transaction (event-sourced)
    const result = await prisma.$transaction(async (tx) => {
      // Update match state
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          state: newState,
          ...(newState === 'active' && !match.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...(newState === 'completed' && !match.completedAt
            ? { completedAt: new Date() }
            : {}),
        },
      });

      // Create tournament event (event sourcing)
      await tx.tournamentEvent.create({
        data: {
          tournamentId: match.tournamentId,
          kind: `match.${event}`,
          actor: actorId,
          device,
          payload: {
            matchId,
            previousState: match.state,
            newState,
            ...payload,
          },
        },
      });

      return updatedMatch;
    });

    return {
      success: true,
      newState: result.state as MatchState,
      match: result,
    };
  } catch (error) {
    console.error('State transition error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// LIFECYCLE FUNCTIONS
// ============================================================================

/**
 * Start a match (ready/assigned → active)
 */
export async function startMatch(
  matchId: string,
  options: StartMatchOptions
): Promise<TransitionResult> {
  const { actorId, device, tableId } = options;

  // If tableId provided, assign it first
  if (tableId) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (match && !match.tableId) {
      await prisma.match.update({
        where: { id: matchId },
        data: { tableId },
      });
    }
  }

  return transition(matchId, 'start', actorId, device, {
    startedAt: new Date(),
  });
}

/**
 * Update match score (during active state)
 */
export async function updateMatchScore(
  matchId: string,
  options: UpdateScoreOptions
): Promise<{ success: boolean; match?: Match; error?: string }> {
  try {
    const { actorId, device, player, newScore } = options;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    if (match.state !== 'active') {
      return {
        success: false,
        error: `Cannot update score in state: ${match.state}`,
      };
    }

    // Update match in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: {
          score: newScore,
          rev: { increment: 1 },
        },
      });

      // Create tournament event
      await tx.tournamentEvent.create({
        data: {
          tournamentId: match.tournamentId,
          kind: 'match.score_updated',
          actor: actorId,
          device,
          payload: {
            matchId,
            player,
            newScore,
          },
        },
      });

      return updatedMatch;
    });

    return { success: true, match: result };
  } catch (error) {
    console.error('Update score error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete a match (active → completed)
 */
export async function completeMatch(
  matchId: string,
  options: CompleteMatchOptions
): Promise<TransitionResult> {
  const { actorId, device, winnerId, finalScore } = options;

  try {
    // Update match with winner and final score first
    await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        score: finalScore,
      },
    });

    return transition(matchId, 'complete', actorId, device, {
      winnerId,
      finalScore,
      completedAt: new Date(),
    });
  } catch (error) {
    console.error('Complete match error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pause a match (active → paused)
 */
export async function pauseMatch(
  matchId: string,
  options: PauseMatchOptions
): Promise<TransitionResult> {
  const { actorId, device, reason } = options;

  return transition(matchId, 'pause', actorId, device, {
    reason,
    pausedAt: new Date(),
  });
}

/**
 * Resume a match (paused → active)
 */
export async function resumeMatch(
  matchId: string,
  options: ResumeMatchOptions
): Promise<TransitionResult> {
  const { actorId, device } = options;

  return transition(matchId, 'resume', actorId, device, {
    resumedAt: new Date(),
  });
}

/**
 * Abandon a match (active/paused → abandoned)
 */
export async function abandonMatch(
  matchId: string,
  options: AbandonMatchOptions
): Promise<TransitionResult> {
  const { actorId, device, reason } = options;

  return transition(matchId, 'abandon', actorId, device, {
    reason,
    abandonedAt: new Date(),
  });
}

/**
 * Forfeit a match (active/paused → forfeited)
 */
export async function forfeitMatch(
  matchId: string,
  options: ForfeitMatchOptions
): Promise<TransitionResult> {
  const { actorId, device, forfeitingPlayerId, reason } = options;

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return { success: false, error: 'Match not found' };
    }

    // Determine winner (opposite of forfeiting player)
    const winnerId =
      forfeitingPlayerId === match.playerAId
        ? match.playerBId
        : match.playerAId;

    if (!winnerId) {
      return { success: false, error: 'Cannot determine winner' };
    }

    // Update match with winner
    await prisma.match.update({
      where: { id: matchId },
      data: { winnerId },
    });

    return transition(matchId, 'forfeit', actorId, device, {
      forfeitingPlayerId,
      winnerId,
      reason,
      forfeitedAt: new Date(),
    });
  } catch (error) {
    console.error('Forfeit match error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel a match (pending/ready/assigned → cancelled)
 */
export async function cancelMatch(
  matchId: string,
  actorId: string,
  device: string,
  reason?: string
): Promise<TransitionResult> {
  return transition(matchId, 'cancel', actorId, device, {
    reason,
    cancelledAt: new Date(),
  });
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get current match state
 */
export async function getMatchState(matchId: string): Promise<MatchState | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { state: true },
  });

  return match ? (match.state as MatchState) : null;
}

/**
 * Get all matches in a specific state for a tournament
 */
export async function getMatchesByState(
  tournamentId: string,
  state: MatchState
): Promise<Match[]> {
  return prisma.match.findMany({
    where: {
      tournamentId,
      state,
    },
    include: {
      playerA: true,
      playerB: true,
      table: true,
    },
  });
}

/**
 * Get match history (event log)
 */
export async function getMatchHistory(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    return null;
  }

  const events = await prisma.tournamentEvent.findMany({
    where: {
      tournamentId: match.tournamentId,
      payload: {
        path: ['matchId'],
        equals: matchId,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  return {
    match,
    events,
  };
}

/**
 * Check if a match can be transitioned to a specific state
 */
export async function isTransitionAllowed(
  matchId: string,
  event: MatchTransitionEvent
): Promise<{ allowed: boolean; violations: string[] }> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      playerA: true,
      playerB: true,
    },
  });

  if (!match) {
    return {
      allowed: false,
      violations: ['Match not found'],
    };
  }

  return canTransition(match, event);
}
