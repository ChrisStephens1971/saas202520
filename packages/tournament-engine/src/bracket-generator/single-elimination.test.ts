/**
 * Tests for Single Elimination Bracket Generator
 */

import { describe, it, expect } from 'vitest';
import {
  generateSingleEliminationBracket,
  getMatch,
  getMatchesInRound,
  advanceWinner,
} from './single-elimination';
import type { Player } from '../types';

describe('Single Elimination Bracket Generator', () => {
  // Helper to create mock players
  function createPlayers(count: number): Player[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
  }

  describe('Power-of-2 brackets', () => {
    it('should generate valid 8-player bracket', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(8);
      expect(bracket.totalRounds).toBe(3); // 8 -> 4 -> 2 -> 1
      expect(bracket.format).toBe('single_elimination');
      expect(bracket.matches).toHaveLength(7); // 4 + 2 + 1

      // Round 1: 4 matches, all ready
      const round1 = getMatchesInRound(bracket, 1);
      expect(round1).toHaveLength(4);
      round1.forEach((match) => {
        expect(match.state).toBe('ready');
        expect(match.playerAId).toBeDefined();
        expect(match.playerBId).toBeDefined();
      });

      // Round 2: 2 matches, pending
      const round2 = getMatchesInRound(bracket, 2);
      expect(round2).toHaveLength(2);
      round2.forEach((match) => {
        expect(match.state).toBe('pending');
        expect(match.playerAId).toBeUndefined();
        expect(match.playerBId).toBeUndefined();
      });

      // Round 3: 1 match (championship), pending
      const round3 = getMatchesInRound(bracket, 3);
      expect(round3).toHaveLength(1);
      expect(round3[0].state).toBe('pending');
      expect(round3[0].feedsInto).toBeUndefined(); // No next match
    });

    it('should generate valid 16-player bracket', () => {
      const players = createPlayers(16);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(16);
      expect(bracket.totalRounds).toBe(4); // 16 -> 8 -> 4 -> 2 -> 1
      expect(bracket.matches).toHaveLength(15); // 8 + 4 + 2 + 1
    });

    it('should generate valid 32-player bracket', () => {
      const players = createPlayers(32);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(32);
      expect(bracket.totalRounds).toBe(5);
      expect(bracket.matches).toHaveLength(31); // 16 + 8 + 4 + 2 + 1
    });
  });

  describe('Non-power-of-2 brackets with byes', () => {
    it('should generate valid 5-player bracket with 3 byes', () => {
      const players = createPlayers(5);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(5);
      expect(bracket.totalRounds).toBe(3); // Bracket size 8: 3 rounds

      // Round 1: Some matches should be completed (byes)
      const round1 = getMatchesInRound(bracket, 1);
      const completedMatches = round1.filter((m) => m.state === 'completed');
      const readyMatches = round1.filter((m) => m.state === 'ready');

      expect(completedMatches).toHaveLength(3); // 3 byes
      expect(readyMatches).toHaveLength(1); // 1 actual match
    });

    it('should generate valid 7-player bracket with 1 bye', () => {
      const players = createPlayers(7);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(7);
      expect(bracket.totalRounds).toBe(3);

      const round1 = getMatchesInRound(bracket, 1);
      const completedMatches = round1.filter((m) => m.state === 'completed');
      const readyMatches = round1.filter((m) => m.state === 'ready');

      expect(completedMatches).toHaveLength(1); // 1 bye
      expect(readyMatches).toHaveLength(3); // 3 actual matches
    });

    it('should generate valid 12-player bracket with 4 byes', () => {
      const players = createPlayers(12);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(12);
      expect(bracket.totalRounds).toBe(4); // Bracket size 16

      const round1 = getMatchesInRound(bracket, 1);
      const completedMatches = round1.filter((m) => m.state === 'completed');
      const readyMatches = round1.filter((m) => m.state === 'ready');

      expect(completedMatches).toHaveLength(4); // 4 byes
      expect(readyMatches).toHaveLength(4); // 4 actual matches
    });
  });

  describe('Bracket progression', () => {
    it('should link matches correctly', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      // Check first round match links
      const match0 = getMatch(bracket, 1, 0)!;
      expect(match0.feedsInto).toEqual({
        round: 2,
        position: 0,
        slot: 'A',
      });

      const match1 = getMatch(bracket, 1, 1)!;
      expect(match1.feedsInto).toEqual({
        round: 2,
        position: 0,
        slot: 'B',
      });

      const match2 = getMatch(bracket, 1, 2)!;
      expect(match2.feedsInto).toEqual({
        round: 2,
        position: 1,
        slot: 'A',
      });

      const match3 = getMatch(bracket, 1, 3)!;
      expect(match3.feedsInto).toEqual({
        round: 2,
        position: 1,
        slot: 'B',
      });
    });

    it('should advance winner correctly', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      // Simulate winner of Round 1, Position 0
      const match = getMatch(bracket, 1, 0)!;
      const winnerId = match.playerAId!;

      advanceWinner(bracket, match, winnerId);

      // Check that winner advanced to Round 2, Position 0, Slot A
      const nextMatch = getMatch(bracket, 2, 0)!;
      expect(nextMatch.playerAId).toBe(winnerId);
      expect(nextMatch.state).toBe('pending'); // Still waiting for playerB
    });

    it('should update match state to ready when both players present', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      // Simulate both matches feeding into Round 2, Position 0
      const match0 = getMatch(bracket, 1, 0)!;
      const match1 = getMatch(bracket, 1, 1)!;

      advanceWinner(bracket, match0, match0.playerAId!);
      advanceWinner(bracket, match1, match1.playerBId!);

      // Next match should now be ready
      const nextMatch = getMatch(bracket, 2, 0)!;
      expect(nextMatch.state).toBe('ready');
      expect(nextMatch.playerAId).toBe(match0.playerAId);
      expect(nextMatch.playerBId).toBe(match1.playerBId);
    });
  });

  describe('Seeding', () => {
    it('should respect player seeding order', () => {
      const players = createPlayers(8);
      const bracket = generateSingleEliminationBracket(players);

      // Standard single elim seeding: 1v8, 4v5, 2v7, 3v6
      const round1 = getMatchesInRound(bracket, 1);

      // Match 0: Seed 1 vs Seed 8
      expect(round1[0].playerAId).toBe('player-1');
      expect(round1[0].playerBId).toBe('player-8');

      // Match 1: Seed 4 vs Seed 5
      expect(round1[1].playerAId).toBe('player-4');
      expect(round1[1].playerBId).toBe('player-5');

      // Match 2: Seed 2 vs Seed 7
      expect(round1[2].playerAId).toBe('player-2');
      expect(round1[2].playerBId).toBe('player-7');

      // Match 3: Seed 3 vs Seed 6
      expect(round1[3].playerAId).toBe('player-3');
      expect(round1[3].playerBId).toBe('player-6');
    });

    it('should give byes to top seeds', () => {
      const players = createPlayers(5);
      const bracket = generateSingleEliminationBracket(players);

      const round1 = getMatchesInRound(bracket, 1);
      const byeMatches = round1.filter((m) => m.state === 'completed');

      // 5 players in 8-bracket = 3 byes
      // Based on seeding algorithm, players with byes depend on bracket position
      expect(byeMatches).toHaveLength(3);

      const playersWithByes = byeMatches.map((m) => m.playerAId || m.playerBId);

      // Top seeds should be getting the byes
      expect(playersWithByes).toContain('player-1');
      expect(playersWithByes).toContain('player-2');
      // Third bye goes to seed 3 or 4 depending on bracket position
      expect(playersWithByes.length).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should throw error for less than 2 players', () => {
      expect(() => generateSingleEliminationBracket([])).toThrow(
        'Cannot generate bracket with less than 2 players'
      );
      expect(() => generateSingleEliminationBracket(createPlayers(1))).toThrow(
        'Cannot generate bracket with less than 2 players'
      );
    });

    it('should throw error for more than 128 players', () => {
      expect(() => generateSingleEliminationBracket(createPlayers(129))).toThrow(
        'Maximum bracket size is 128 players'
      );
    });

    it('should handle minimum bracket (2 players)', () => {
      const players = createPlayers(2);
      const bracket = generateSingleEliminationBracket(players);

      expect(bracket.playerCount).toBe(2);
      expect(bracket.totalRounds).toBe(1);
      expect(bracket.matches).toHaveLength(1);

      const match = bracket.matches[0];
      expect(match.state).toBe('ready');
      expect(match.feedsInto).toBeUndefined(); // Championship match
    });
  });
});
