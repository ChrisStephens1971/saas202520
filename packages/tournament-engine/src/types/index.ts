/**
 * Tournament Engine Types
 *
 * Core types for bracket generation, match management, and tournament engine
 */

/**
 * Tournament Format
 */
export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'modified_single'
  | 'chip_format';

/**
 * Match State
 *
 * Lifecycle states for a match:
 * - pending: Match created but players not yet determined (future rounds, byes)
 * - ready: Both players known, ready to be assigned
 * - assigned: Assigned to table but not started
 * - active: Match in progress
 * - completed: Match finished with winner
 * - cancelled: Match cancelled
 */
export type MatchState = 'pending' | 'ready' | 'assigned' | 'active' | 'completed' | 'cancelled';

/**
 * Player for bracket generation
 */
export interface Player {
  id: string;
  name: string;
  seed?: number;
  rating?: {
    system: 'apa' | 'fargo' | 'bca';
    value: number | string;
  };
}

/**
 * Match Structure for Bracket Generation
 *
 * Represents a match in the bracket before it's saved to database
 */
export interface BracketMatch {
  round: number;
  position: number; // Position within the round (0-indexed)
  bracket?: 'winners' | 'losers'; // For double elimination
  playerAId?: string;
  playerBId?: string;
  state: MatchState;
  // For linking matches in bracket progression
  feedsInto?: {
    round: number;
    position: number;
    bracket?: 'winners' | 'losers';
    slot: 'A' | 'B'; // Which slot does the winner fill
  };
}

/**
 * Bracket Generation Result
 */
export interface BracketResult {
  matches: BracketMatch[];
  totalRounds: number;
  format: TournamentFormat;
  playerCount: number;
}

/**
 * Seeding Algorithm Type
 */
export type SeedingAlgorithm = 'random' | 'rating' | 'manual';

/**
 * Bracket Generation Options
 */
export interface BracketGenerationOptions {
  format: TournamentFormat;
  players: Player[];
  seedingAlgorithm?: SeedingAlgorithm;
  manualSeeds?: number[]; // For manual seeding
}
