/**
 * Tests for Match Progression Logic
 */

import { describe, it, expect } from 'vitest';
import { generateSingleEliminationBracket } from '../bracket-generator/single-elimination';
import {
  completeMatch,
  getReadyMatches,
  getActiveMatches,
  getCompletedMatches,
  getPendingMatches,
  getTournamentProgress,
  getCurrentRound,
  isTournamentComplete,
  validateMatchCompletion,
  type MatchCompletionData,
} from './progression';

describe('Match Progression', () => {
  function createPlayers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
  }

  describe('Match Completion', () => {
    it('should complete match and advance winner', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);

      // Complete first match
      const match = bracket.matches[0];
      const completion: MatchCompletionData = {
        matchId: match.playerAId!,
        winnerId: match.playerAId!,
        loserId: match.playerBId!,
        score: { playerA: 5, playerB: 3 },
      };

      const result = completeMatch(bracket, completion);

      expect(result.completedMatch.state).toBe('completed');
      expect(result.isChampionshipMatch).toBe(false);
      expect(result.nextMatch).toBeDefined();
      expect(result.advancedTo).toEqual({
        round: 2,
        position: 0,
        slot: 'A',
      });

      // Winner should be in next match
      expect(result.nextMatch!.playerAId).toBe(match.playerAId);
    });

    it('should mark championship match as complete', () => {
      const players = createPlayers(2);
      const bracket = generateSingleEliminationBracket(players);

      const match = bracket.matches[0];
      const completion: MatchCompletionData = {
        matchId: match.playerAId!,
        winnerId: match.playerAId!,
        loserId: match.playerBId!,
        score: { playerA: 5, playerB: 2 },
      };

      const result = completeMatch(bracket, completion);

      expect(result.isChampionshipMatch).toBe(true);
      expect(result.nextMatch).toBeUndefined();
      expect(result.advancedTo).toBeUndefined();
    });

    it('should mark next match as ready when both players present', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);

      // Complete first match
      const match1 = bracket.matches[0];
      completeMatch(bracket, {
        matchId: match1.playerAId!,
        winnerId: match1.playerAId!,
        loserId: match1.playerBId!,
        score: { playerA: 5, playerB: 3 },
      });

      // Complete second match
      const match2 = bracket.matches[1];
      const result = completeMatch(bracket, {
        matchId: match2.playerAId!,
        winnerId: match2.playerAId!,
        loserId: match2.playerBId!,
        score: { playerA: 5, playerB: 1 },
      });

      // Next match should now be ready
      expect(result.nextMatch!.state).toBe('ready');
      expect(result.nextMatch!.playerAId).toBe(match1.playerAId);
      expect(result.nextMatch!.playerBId).toBe(match2.playerAId);
    });
  });

  describe('Match Queries', () => {
    it('should get ready matches', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      const ready = getReadyMatches(bracket);
      expect(ready).toHaveLength(4); // All Round 1 matches ready
    });

    it('should get active matches', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);

      // Mark one as active
      bracket.matches[0].state = 'active';

      const active = getActiveMatches(bracket);
      expect(active).toHaveLength(1);
      expect(active[0]).toBe(bracket.matches[0]);
    });

    it('should get completed matches', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);

      // Complete first match
      completeMatch(bracket, {
        matchId: bracket.matches[0].playerAId!,
        winnerId: bracket.matches[0].playerAId!,
        loserId: bracket.matches[0].playerBId!,
        score: { playerA: 5, playerB: 3 },
      });

      const completed = getCompletedMatches(bracket);
      expect(completed).toHaveLength(1);
    });

    it('should get pending matches', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);

      const pending = getPendingMatches(bracket);
      expect(pending).toHaveLength(1); // Round 2 match pending
    });
  });

  describe('Tournament Progress', () => {
    it('should calculate correct progress percentage', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);

      // 0% initially
      expect(getTournamentProgress(bracket)).toBe(0);

      // Complete first match (1/3 = 33%)
      completeMatch(bracket, {
        matchId: bracket.matches[0].playerAId!,
        winnerId: bracket.matches[0].playerAId!,
        loserId: bracket.matches[0].playerBId!,
        score: { playerA: 5, playerB: 3 },
      });
      expect(getTournamentProgress(bracket)).toBe(33);

      // Complete second match (2/3 = 67%)
      completeMatch(bracket, {
        matchId: bracket.matches[1].playerAId!,
        winnerId: bracket.matches[1].playerAId!,
        loserId: bracket.matches[1].playerBId!,
        score: { playerA: 5, playerB: 2 },
      });
      expect(getTournamentProgress(bracket)).toBe(67);

      // Complete championship (3/3 = 100%)
      completeMatch(bracket, {
        matchId: bracket.matches[2].playerAId!,
        winnerId: bracket.matches[2].playerAId!,
        loserId: bracket.matches[2].playerBId!,
        score: { playerA: 5, playerB: 4 },
      });
      expect(getTournamentProgress(bracket)).toBe(100);
    });

    it('should get current round', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      // Initially in Round 1
      expect(getCurrentRound(bracket)).toBe(1);

      // Complete all Round 1 matches
      for (let i = 0; i < 4; i++) {
        completeMatch(bracket, {
          matchId: bracket.matches[i].playerAId!,
          winnerId: bracket.matches[i].playerAId!,
          loserId: bracket.matches[i].playerBId!,
          score: { playerA: 5, playerB: 3 },
        });
      }

      // Now in Round 2
      expect(getCurrentRound(bracket)).toBe(2);
    });

    it('should detect tournament completion', () => {
      const players = createPlayers(2);
      const bracket = generateSingleEliminationBracket(players);

      expect(isTournamentComplete(bracket)).toBe(false);

      completeMatch(bracket, {
        matchId: bracket.matches[0].playerAId!,
        winnerId: bracket.matches[0].playerAId!,
        loserId: bracket.matches[0].playerBId!,
        score: { playerA: 5, playerB: 3 },
      });

      expect(isTournamentComplete(bracket)).toBe(true);
    });
  });

  describe('Match Completion Validation', () => {
    it('should validate active match', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);
      const match = bracket.matches[0];
      match.state = 'active';

      const completion: MatchCompletionData = {
        matchId: match.playerAId!,
        winnerId: match.playerAId!,
        loserId: match.playerBId!,
        score: { playerA: 5, playerB: 3 },
      };

      expect(() => validateMatchCompletion(match, completion)).not.toThrow();
    });

    it('should reject non-active match', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);
      const match = bracket.matches[0];

      const completion: MatchCompletionData = {
        matchId: match.playerAId!,
        winnerId: match.playerAId!,
        loserId: match.playerBId!,
        score: { playerA: 5, playerB: 3 },
      };

      expect(() => validateMatchCompletion(match, completion)).toThrow(
        'Match must be active'
      );
    });

    it('should reject invalid winner', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);
      const match = bracket.matches[0];
      match.state = 'active';

      const completion: MatchCompletionData = {
        matchId: match.playerAId!,
        winnerId: 'player-999',
        loserId: match.playerBId!,
        score: { playerA: 5, playerB: 3 },
      };

      expect(() => validateMatchCompletion(match, completion)).toThrow(
        'is not a player in this match'
      );
    });

    it('should reject invalid score', () => {
      const players = createPlayers(4);
      const bracket = generateSingleEliminationBracket(players);
      const match = bracket.matches[0];
      match.state = 'active';

      const completion: MatchCompletionData = {
        matchId: match.playerAId!,
        winnerId: match.playerAId!,
        loserId: match.playerBId!,
        score: { playerA: 3, playerB: 5 }, // Winner has lower score
      };

      expect(() => validateMatchCompletion(match, completion)).toThrow(
        'Winner must have higher score'
      );
    });
  });
});
