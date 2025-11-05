/**
 * Scoring Validation Logic (Sprint 3 - SCORE-002, SCORE-003, SCORE-004)
 * Prevents illegal scores and enforces race-to rules
 */

import type { MatchScore, ScoreValidationResult, ScoreValidationRules } from '../types/scoring';

/**
 * Validates a score increment against race-to rules
 * SCORE-002: Race-to validation logic
 * SCORE-003: Illegal score guards
 */
export function validateScoreIncrement(
  currentScore: MatchScore,
  player: 'A' | 'B',
  rules: ScoreValidationRules
): ScoreValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { raceTo } = rules;
  const newScore = {
    playerA: player === 'A' ? currentScore.playerA + 1 : currentScore.playerA,
    playerB: player === 'B' ? currentScore.playerB + 1 : currentScore.playerB,
  };

  // SCORE-003: Prevent illegal scores (exceeding race-to)
  if (newScore.playerA > raceTo) {
    errors.push(`Player A score cannot exceed race-to ${raceTo}`);
  }
  if (newScore.playerB > raceTo) {
    errors.push(`Player B score cannot exceed race-to ${raceTo}`);
  }

  // SCORE-002: Validate race-to logic
  // Example: In race-to-9, max valid score is 9-8 (not 10-8)
  const maxScore = Math.max(newScore.playerA, newScore.playerB);
  if (maxScore > raceTo) {
    errors.push(`Maximum score in race-to-${raceTo} is ${raceTo}`);
  }

  // SCORE-004: Hill-hill detection (both players one game away from winning)
  const isHillHill =
    newScore.playerA === raceTo - 1 && newScore.playerB === raceTo - 1;

  if (isHillHill && rules.requireConfirmation) {
    warnings.push('Hill-hill situation: both players one game away from winning');
  }

  // Check if match is won
  if (newScore.playerA === raceTo || newScore.playerB === raceTo) {
    const winner = newScore.playerA === raceTo ? 'Player A' : 'Player B';
    warnings.push(`Match complete: ${winner} wins ${newScore.playerA}-${newScore.playerB}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * SCORE-004: Hill-hill sanity check
 * Returns true if the current score is hill-hill (one game away each)
 */
export function isHillHill(score: MatchScore, raceTo: number): boolean {
  return score.playerA === raceTo - 1 && score.playerB === raceTo - 1;
}

/**
 * Checks if a match is complete (either player reached race-to)
 */
export function isMatchComplete(score: MatchScore, raceTo: number): boolean {
  return score.playerA === raceTo || score.playerB === raceTo;
}

/**
 * Determines the winner of a match
 * Returns 'A', 'B', or null if no winner yet
 */
export function getMatchWinner(
  score: MatchScore,
  raceTo: number
): 'A' | 'B' | null {
  if (score.playerA === raceTo) return 'A';
  if (score.playerB === raceTo) return 'B';
  return null;
}

/**
 * SCORE-003: Validate that a score doesn't violate game rules
 * Prevents impossible score combinations
 */
export function validateScoreIntegrity(
  score: MatchScore,
  raceTo: number
): ScoreValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Both scores can't be at race-to (only one player can win)
  if (score.playerA === raceTo && score.playerB === raceTo) {
    errors.push('Both players cannot reach race-to simultaneously');
  }

  // Scores can't be negative
  if (score.playerA < 0 || score.playerB < 0) {
    errors.push('Scores cannot be negative');
  }

  // If one player won, the other must be below race-to
  if (score.playerA === raceTo && score.playerB >= raceTo) {
    errors.push(`Player B score (${score.playerB}) must be less than ${raceTo} when Player A wins`);
  }
  if (score.playerB === raceTo && score.playerA >= raceTo) {
    errors.push(`Player A score (${score.playerA}) must be less than ${raceTo} when Player B wins`);
  }

  // Warn if score difference is large (possible data entry error)
  const scoreDiff = Math.abs(score.playerA - score.playerB);
  if (scoreDiff >= raceTo - 1 && !isMatchComplete(score, raceTo)) {
    warnings.push(`Large score difference (${scoreDiff}). Please verify.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * SCORE-002: Calculate games remaining for each player
 */
export function getGamesRemaining(score: MatchScore, raceTo: number): {
  playerA: number;
  playerB: number;
} {
  return {
    playerA: Math.max(0, raceTo - score.playerA),
    playerB: Math.max(0, raceTo - score.playerB),
  };
}

/**
 * Format score for display (e.g., "7-5 (race to 9)")
 */
export function formatScore(score: MatchScore, raceTo?: number): string {
  const baseScore = `${score.playerA}-${score.playerB}`;
  return raceTo ? `${baseScore} (race to ${raceTo})` : baseScore;
}
