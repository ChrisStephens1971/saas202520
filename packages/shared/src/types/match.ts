// Match Types

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  bracket?: BracketType; // Null for non-bracket formats
  position: number; // Position in bracket/round
  playerAId?: string;
  playerBId?: string;
  state: MatchState;
  winnerId?: string;
  score: MatchScore;
  tableId?: string;
  startedAt?: Date;
  completedAt?: Date;
  rev: number; // Revision for optimistic locking
}

export enum BracketType {
  WINNERS = 'winners',
  LOSERS = 'losers',
}

export enum MatchState {
  PENDING = 'pending', // Waiting for players
  READY = 'ready', // Players available, can be assigned
  ASSIGNED = 'assigned', // Assigned to table
  ACTIVE = 'active', // In progress
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface MatchScore {
  playerA: number;
  playerB: number;
  raceTo?: number; // e.g., race to 9 in 9-ball
  games?: GameScore[]; // Individual game scores
}

export interface GameScore {
  gameNumber: number;
  winner: 'A' | 'B';
  innings?: number;
  fouls?: number;
  timestamp: Date;
}

export interface MatchUpdate {
  matchId: string;
  action: MatchAction;
  payload: Record<string, any>;
  actor: string; // User ID who made the update
  device: string; // Device ID for conflict resolution
  timestamp: Date;
}

export enum MatchAction {
  ASSIGN_TABLE = 'assign_table',
  START_MATCH = 'start_match',
  UPDATE_SCORE = 'update_score',
  COMPLETE_MATCH = 'complete_match',
  CANCEL_MATCH = 'cancel_match',
  UNDO = 'undo',
}
