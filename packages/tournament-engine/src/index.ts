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
