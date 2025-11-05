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

export {
  generateDoubleEliminationBracket,
  getMatch as getMatchDE,
  getMatchesInRound as getMatchesInRoundDE,
  getMatchesInBracket,
  advanceWinner as advanceWinnerDE,
} from './bracket-generator/double-elimination';

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

// Match Progression
export {
  type MatchCompletionData,
  type MatchProgressionResult,
  completeMatch,
  getReadyMatches,
  getActiveMatches,
  getCompletedMatches,
  getPendingMatches,
  getTournamentProgress,
  getCurrentRound,
  isTournamentComplete,
  validateMatchCompletion,
} from './match/progression';

// Table Assignment
export {
  type TableStatus,
  type Table,
  type Match as TableMatch,
  type AssignTableRequest,
  type AssignTableResult,
  TableAssignmentError,
  TableAlreadyAssignedError,
  TableNotAvailableError,
  OptimisticLockError,
  isTableAvailable,
  validateTableAssignment,
  createAssignmentMutation,
  createUnassignmentMutation,
  releaseTable,
  blockTable,
  getAvailableTables,
  getTablesInUse,
  findTableByMatch,
} from './table/assignment';

// Seeding Algorithms
export {
  randomSeeding,
  skillBasedSeeding,
  manualSeeding,
  snakeSeeding,
  applySeedingAlgorithm,
  validateSeeding,
  reseedAfterWithdrawal,
} from './seeding/algorithms';
