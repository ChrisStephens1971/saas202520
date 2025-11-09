/**
 * Tournament Engine - Main Exports
 * Sprint 2: Core Tournament Engine
 *
 * Centralized exports for all tournament-related functionality
 */

// Bracket Generation
export {
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  generateModifiedSingleElimination,
  seedPlayers,
  validateBracket,
  getMatchesByRound,
  getReadyMatches,
  calculateTotalRounds,
  extractRatingValue,
} from './bracket-generator';

// Types
export type {
  BracketMatch,
  BracketStructure,
  SeedingOptions,
  PlayerWithRating,
} from './bracket-generator';

// Match State Machine & Lifecycle Management
export {
  canTransition,
  transition,
  startMatch,
  updateMatchScore,
  completeMatch,
  pauseMatch,
  resumeMatch,
  abandonMatch,
  forfeitMatch,
  cancelMatch,
  getMatchState,
  getMatchesByState,
  getMatchHistory,
  isTransitionAllowed,
} from './match-state-machine';

// Match State Machine Types
export type {
  MatchState,
  MatchTransitionEvent,
  StateTransition,
  StateGuard,
  GuardResult,
  MatchWithRelations,
  TransitionResult,
  StartMatchOptions,
  CompleteMatchOptions,
  PauseMatchOptions,
  ResumeMatchOptions,
  AbandonMatchOptions,
  ForfeitMatchOptions,
  UpdateScoreOptions,
} from './match-state-machine';

// Table Management
export {
  createTable,
  createTablesBulk,
  updateTableStatus,
  blockTableUntil,
  unblockTable,
  assignMatchToTable,
  releaseTable,
  autoReleaseTableOnMatchComplete,
  isTableAvailable,
  getAvailableTables,
  getAllTables,
  checkTableAvailability,
  deleteTable,
} from './table-manager';

// Table Types
export type {
  TableStatus,
  TableResource,
  TableAssignment,
  TableAvailability,
  TableConflict,
  CreateTableRequest,
  CreateTablesBulkRequest,
  UpdateTableStatusRequest,
  BlockTableRequest,
  AssignTableRequest,
  TableListResponse,
  TableAvailabilityResponse,
  TableAssignmentResponse,
  TableConflictCheckResponse,
} from './types';
