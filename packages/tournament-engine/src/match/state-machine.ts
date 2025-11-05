/**
 * Match State Machine
 *
 * Defines valid match states and transitions with validation.
 * Implements a formal state machine for match lifecycle management.
 *
 * State Flow:
 * pending → ready → assigned → active → completed
 *          ↓         ↓         ↓
 *        cancelled cancelled cancelled
 */

import type { MatchState } from '../types';

/**
 * Match State Transition Event
 */
export interface MatchStateTransition {
  matchId: string;
  fromState: MatchState;
  toState: MatchState;
  reason?: string;
  actor: string; // User ID who triggered the transition
  timestamp: Date;
}

/**
 * Valid state transitions map
 *
 * Key: current state
 * Value: array of valid next states
 */
export const VALID_TRANSITIONS: Record<MatchState, MatchState[]> = {
  pending: ['ready', 'cancelled'],
  ready: ['assigned', 'cancelled'],
  assigned: ['active', 'ready', 'cancelled'], // Can go back to ready if table freed
  active: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Match State Transition Error
 */
export class MatchStateTransitionError extends Error {
  constructor(
    public matchId: string,
    public fromState: MatchState,
    public toState: MatchState,
    message: string
  ) {
    super(message);
    this.name = 'MatchStateTransitionError';
  }
}

/**
 * Check if a state transition is valid
 *
 * @param fromState - Current match state
 * @param toState - Desired next state
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(fromState: MatchState, toState: MatchState): boolean {
  // Same state is always valid (no-op)
  if (fromState === toState) {
    return true;
  }

  const validNextStates = VALID_TRANSITIONS[fromState];
  return validNextStates.includes(toState);
}

/**
 * Validate a state transition and throw error if invalid
 *
 * @param matchId - Match identifier
 * @param fromState - Current match state
 * @param toState - Desired next state
 * @throws MatchStateTransitionError if transition is invalid
 */
export function validateTransition(
  matchId: string,
  fromState: MatchState,
  toState: MatchState
): void {
  if (!isValidTransition(fromState, toState)) {
    throw new MatchStateTransitionError(
      matchId,
      fromState,
      toState,
      `Invalid state transition from '${fromState}' to '${toState}'. Valid transitions from '${fromState}': ${VALID_TRANSITIONS[fromState].join(', ')}`
    );
  }
}

/**
 * Match state transition context
 *
 * Additional data needed for specific transitions
 */
export interface TransitionContext {
  // For pending → ready
  playerAId?: string;
  playerBId?: string;

  // For ready → assigned
  tableId?: string;

  // For active → completed
  winnerId?: string;
  score?: {
    playerA: number;
    playerB: number;
  };

  // For any → cancelled
  reason?: string;
}

/**
 * Validate transition prerequisites
 *
 * Checks that required data is present for specific transitions
 *
 * @param fromState - Current state
 * @param toState - Target state
 * @param context - Transition context with required data
 * @throws Error if prerequisites are not met
 */
export function validateTransitionPrerequisites(
  fromState: MatchState,
  toState: MatchState,
  context: TransitionContext
): void {
  switch (toState) {
    case 'ready':
      // Ready state requires both players ONLY when coming from pending
      // (assigned → ready is just unassigning, players already exist)
      if (fromState === 'pending') {
        if (!context.playerAId || !context.playerBId) {
          throw new Error('Cannot transition to ready: both playerAId and playerBId required');
        }
      }
      break;

    case 'assigned':
      // Assigned state requires table
      if (!context.tableId) {
        throw new Error('Cannot transition to assigned: tableId required');
      }
      break;

    case 'completed':
      // Completed state requires winner and score
      if (!context.winnerId) {
        throw new Error('Cannot transition to completed: winnerId required');
      }
      if (!context.score) {
        throw new Error('Cannot transition to completed: score required');
      }
      break;

    case 'cancelled':
      // Cancelled should have a reason
      if (!context.reason) {
        throw new Error('Cannot transition to cancelled: reason required');
      }
      break;

    // Other states don't have prerequisites
    case 'pending':
    case 'active':
      break;
  }
}

/**
 * Execute a match state transition
 *
 * Validates the transition and returns a transition event if successful.
 *
 * @param matchId - Match identifier
 * @param fromState - Current state
 * @param toState - Desired state
 * @param context - Additional context for the transition
 * @param actor - User ID performing the transition
 * @returns Transition event
 * @throws MatchStateTransitionError if transition is invalid
 * @throws Error if prerequisites are not met
 */
export function transitionMatchState(
  matchId: string,
  fromState: MatchState,
  toState: MatchState,
  context: TransitionContext,
  actor: string
): MatchStateTransition {
  // Validate the transition is allowed
  validateTransition(matchId, fromState, toState);

  // Validate prerequisites for the target state
  validateTransitionPrerequisites(fromState, toState, context);

  // Create transition event
  const transition: MatchStateTransition = {
    matchId,
    fromState,
    toState,
    reason: context.reason,
    actor,
    timestamp: new Date(),
  };

  return transition;
}

/**
 * Get human-readable description of a state
 */
export function getStateDescription(state: MatchState): string {
  const descriptions: Record<MatchState, string> = {
    pending: 'Waiting for players to be determined',
    ready: 'Both players known, waiting for table assignment',
    assigned: 'Assigned to table, waiting to start',
    active: 'Match in progress',
    completed: 'Match finished',
    cancelled: 'Match cancelled',
  };

  return descriptions[state];
}

/**
 * Check if a match state is terminal (no further transitions possible)
 */
export function isTerminalState(state: MatchState): boolean {
  return VALID_TRANSITIONS[state].length === 0;
}

/**
 * Get all valid next states for a given state
 */
export function getValidNextStates(state: MatchState): MatchState[] {
  return [...VALID_TRANSITIONS[state]];
}
