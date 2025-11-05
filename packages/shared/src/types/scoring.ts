/**
 * Scoring System Types (Sprint 3)
 * Mobile-first scoring with validation, undo, and audit trail
 */

import type { MatchScore, GameScore } from './match';

export interface ScoreUpdate {
  id: string;
  matchId: string;
  tournamentId: string;
  actor: string; // User ID
  device: string; // Device ID
  action: 'increment_a' | 'increment_b' | 'undo';
  previousScore: MatchScore;
  newScore: MatchScore;
  timestamp: Date;
  undone: boolean;
}

// Re-export for convenience
export type { MatchScore, GameScore };

export interface ScoreValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ScoreValidationRules {
  raceTo: number;
  allowHillHill: boolean;
  requireConfirmation: boolean;
}

// API Request/Response types

export interface IncrementScoreRequest {
  matchId: string;
  player: 'A' | 'B';
  device: string;
  rev: number; // Optimistic locking
}

export interface IncrementScoreResponse {
  match: {
    id: string;
    score: MatchScore;
    state: string;
    winnerId?: string;
    rev: number;
  };
  scoreUpdate: ScoreUpdate;
  validation: ScoreValidationResult;
}

export interface UndoScoreRequest {
  matchId: string;
  device: string;
  rev: number;
}

export interface UndoScoreResponse {
  match: {
    id: string;
    score: MatchScore;
    state: string;
    winnerId?: string;
    rev: number;
  };
  undoneUpdates: ScoreUpdate[];
  canUndo: boolean; // Can undo more actions?
}

export interface ScoreHistoryRequest {
  matchId: string;
  limit?: number;
}

export interface ScoreHistoryResponse {
  updates: ScoreUpdate[];
  total: number;
  canUndo: boolean;
}
