/**
 * Scoring Validation Tests (TEST-004)
 * Tests for race-to validation, illegal score guards, and hill-hill detection
 */

import { describe, it, expect } from 'vitest';
import {
  validateScoreIncrement,
  validateScoreIntegrity,
  isHillHill,
  isMatchComplete,
  getMatchWinner,
  getGamesRemaining,
  formatScore,
} from './scoring-validation';
import type { MatchScore, ScoreValidationRules } from '../types/scoring';

describe('Scoring Validation', () => {
  const raceTo = 9;
  const rules: ScoreValidationRules = {
    raceTo,
    allowHillHill: true,
    requireConfirmation: true,
  };

  describe('validateScoreIncrement', () => {
    it('should allow valid score increment', () => {
      const currentScore: MatchScore = { playerA: 5, playerB: 3, raceTo };
      const result = validateScoreIncrement(currentScore, 'A', rules);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent score exceeding race-to', () => {
      const currentScore: MatchScore = { playerA: 9, playerB: 7, raceTo };
      const result = validateScoreIncrement(currentScore, 'A', rules);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`Player A score cannot exceed race-to ${raceTo}`);
    });

    it('should detect hill-hill situation', () => {
      const currentScore: MatchScore = { playerA: 8, playerB: 7, raceTo };
      const result = validateScoreIncrement(currentScore, 'B', rules);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Hill-hill situation: both players one game away from winning');
    });

    it('should warn when match is won', () => {
      const currentScore: MatchScore = { playerA: 8, playerB: 5, raceTo };
      const result = validateScoreIncrement(currentScore, 'A', rules);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Match complete'))).toBe(true);
    });
  });

  describe('validateScoreIntegrity', () => {
    it('should allow valid score', () => {
      const score: MatchScore = { playerA: 7, playerB: 5, raceTo };
      const result = validateScoreIntegrity(score, raceTo);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject both players at race-to', () => {
      const score: MatchScore = { playerA: 9, playerB: 9, raceTo };
      const result = validateScoreIntegrity(score, raceTo);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Both players cannot reach race-to simultaneously');
    });

    it('should reject negative scores', () => {
      const score: MatchScore = { playerA: -1, playerB: 5, raceTo };
      const result = validateScoreIntegrity(score, raceTo);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scores cannot be negative');
    });

    it('should warn on large score difference', () => {
      const score: MatchScore = { playerA: 7, playerB: 0, raceTo };
      const result = validateScoreIntegrity(score, raceTo);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Large score difference'))).toBe(true);
    });
  });

  describe('isHillHill', () => {
    it('should detect hill-hill (8-8 in race-to-9)', () => {
      const score: MatchScore = { playerA: 8, playerB: 8, raceTo: 9 };
      expect(isHillHill(score, 9)).toBe(true);
    });

    it('should not detect hill-hill for 7-8', () => {
      const score: MatchScore = { playerA: 7, playerB: 8, raceTo: 9 };
      expect(isHillHill(score, 9)).toBe(false);
    });

    it('should work for different race-to values', () => {
      const score: MatchScore = { playerA: 6, playerB: 6, raceTo: 7 };
      expect(isHillHill(score, 7)).toBe(true);
    });
  });

  describe('isMatchComplete', () => {
    it('should detect completed match', () => {
      const score: MatchScore = { playerA: 9, playerB: 7, raceTo };
      expect(isMatchComplete(score, raceTo)).toBe(true);
    });

    it('should not detect incomplete match', () => {
      const score: MatchScore = { playerA: 8, playerB: 7, raceTo };
      expect(isMatchComplete(score, raceTo)).toBe(false);
    });
  });

  describe('getMatchWinner', () => {
    it('should return A when player A wins', () => {
      const score: MatchScore = { playerA: 9, playerB: 5, raceTo };
      expect(getMatchWinner(score, raceTo)).toBe('A');
    });

    it('should return B when player B wins', () => {
      const score: MatchScore = { playerA: 6, playerB: 9, raceTo };
      expect(getMatchWinner(score, raceTo)).toBe('B');
    });

    it('should return null when no winner yet', () => {
      const score: MatchScore = { playerA: 7, playerB: 6, raceTo };
      expect(getMatchWinner(score, raceTo)).toBe(null);
    });
  });

  describe('getGamesRemaining', () => {
    it('should calculate games remaining correctly', () => {
      const score: MatchScore = { playerA: 6, playerB: 4, raceTo };
      const remaining = getGamesRemaining(score, raceTo);

      expect(remaining.playerA).toBe(3);
      expect(remaining.playerB).toBe(5);
    });

    it('should return 0 when player reaches race-to', () => {
      const score: MatchScore = { playerA: 9, playerB: 7, raceTo };
      const remaining = getGamesRemaining(score, raceTo);

      expect(remaining.playerA).toBe(0);
      expect(remaining.playerB).toBe(2);
    });
  });

  describe('formatScore', () => {
    it('should format score without race-to', () => {
      const score: MatchScore = { playerA: 5, playerB: 3 };
      expect(formatScore(score)).toBe('5-3');
    });

    it('should format score with race-to', () => {
      const score: MatchScore = { playerA: 5, playerB: 3, raceTo: 9 };
      expect(formatScore(score, 9)).toBe('5-3 (race to 9)');
    });
  });
});
