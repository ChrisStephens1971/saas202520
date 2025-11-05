/**
 * Tournament Engine
 *
 * Core tournament engine for bracket generation, match management, and table assignment
 */

// Types
export * from './types';

// Bracket Generation
export {
  generateSingleEliminationBracket,
  getMatch,
  getMatchesInRound,
  advanceWinner,
} from './bracket-generator/single-elimination';

// Match State Machine
export {
  type MatchStateTransition,
  type TransitionContext,
  VALID_TRANSITIONS,
  MatchStateTransitionError,
  isValidTransition,
  validateTransition,
  validateTransitionPrerequisites,
  transitionMatchState,
  getStateDescription,
  isTerminalState,
  getValidNextStates,
} from './match/state-machine';
