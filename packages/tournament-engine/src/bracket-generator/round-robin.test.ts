/**
 * Tests for Round Robin Tournament Generator
 */

import { describe, it, expect } from 'vitest';
import {
  generateRoundRobinBracket,
  calculateStandings,
  recordMatchResult,
  getMatchesForPlayer,
  getMatchesInRound,
  isTournamentComplete,
  getTournamentProgress,
  getCurrentRound,
} from './round-robin';
import type { Player } from '../types';

describe('Round Robin Tournament Generator', () => {
  function createPlayers(count: number): Player[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
    }));
  }

  describe('Basic Bracket Generation', () => {
    it('should generate bracket for 2 players', () => {
      const players = createPlayers(2);
      const bracket = generateRoundRobinBracket(players);

      expect(bracket.format).toBe('round_robin');
      expect(bracket.playerCount).toBe(2);
      expect(bracket.totalMatches).toBe(1); // Only 1 match needed
      expect(bracket.matchesPerPlayer).toBe(1);
    });

    it('should generate bracket for 4 players', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      expect(bracket.format).toBe('round_robin');
      expect(bracket.playerCount).toBe(4);
      expect(bracket.totalMatches).toBe(6); // 4 players = 6 matches total
      expect(bracket.matchesPerPlayer).toBe(3); // Each plays 3 others
      expect(bracket.totalRounds).toBe(3);
    });

    it('should generate bracket for 5 players (odd)', () => {
      const players = createPlayers(5);
      const bracket = generateRoundRobinBracket(players);

      expect(bracket.format).toBe('round_robin');
      expect(bracket.playerCount).toBe(5);
      expect(bracket.totalMatches).toBe(10); // 5 players = 10 matches (5*4/2)
      expect(bracket.matchesPerPlayer).toBe(4);
      expect(bracket.totalRounds).toBe(5); // Odd players = playerCount rounds
    });

    it('should generate bracket for 8 players', () => {
      const players = createPlayers(8);
      const bracket = generateRoundRobinBracket(players);

      expect(bracket.format).toBe('round_robin');
      expect(bracket.playerCount).toBe(8);
      expect(bracket.totalMatches).toBe(28); // 8 players = 28 matches (8*7/2)
      expect(bracket.matchesPerPlayer).toBe(7);
      expect(bracket.totalRounds).toBe(7);
    });

    it('should reject invalid player counts', () => {
      expect(() => generateRoundRobinBracket([])).toThrow('less than 2');
      expect(() => generateRoundRobinBracket([{ id: '1', name: 'P1' }])).toThrow('less than 2');

      const tooMany = createPlayers(65);
      expect(() => generateRoundRobinBracket(tooMany)).toThrow('Maximum round robin size');
    });
  });

  describe('Match Scheduling', () => {
    it('should ensure every player plays every other player once', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      // Build a set of all pairings
      const pairings = new Set<string>();

      for (const match of bracket.matches) {
        const playerA = match.playerAId!;
        const playerB = match.playerBId!;

        // Create normalized pairing key (sorted to avoid duplicates)
        const pair = [playerA, playerB].sort().join('-');
        pairings.add(pair);
      }

      // For 4 players, we should have exactly 6 unique pairings
      expect(pairings.size).toBe(6);

      // Verify specific pairings exist
      expect(pairings.has('player-1-player-2')).toBe(true);
      expect(pairings.has('player-1-player-3')).toBe(true);
      expect(pairings.has('player-1-player-4')).toBe(true);
      expect(pairings.has('player-2-player-3')).toBe(true);
      expect(pairings.has('player-2-player-4')).toBe(true);
      expect(pairings.has('player-3-player-4')).toBe(true);
    });

    it('should ensure no player plays themselves', () => {
      const players = createPlayers(6);
      const bracket = generateRoundRobinBracket(players);

      for (const match of bracket.matches) {
        expect(match.playerAId).not.toBe(match.playerBId);
      }
    });

    it('should evenly distribute matches across rounds', () => {
      const players = createPlayers(6);
      const bracket = generateRoundRobinBracket(players);

      // Each round should have 3 matches (6 players / 2)
      for (let round = 1; round <= bracket.totalRounds; round++) {
        const roundMatches = getMatchesInRound(bracket, round);
        expect(roundMatches).toHaveLength(3);
      }
    });

    it('should ensure each player plays once per round', () => {
      const players = createPlayers(6);
      const bracket = generateRoundRobinBracket(players);

      for (let round = 1; round <= bracket.totalRounds; round++) {
        const roundMatches = getMatchesInRound(bracket, round);
        const playersInRound = new Set<string>();

        for (const match of roundMatches) {
          if (match.playerAId) playersInRound.add(match.playerAId);
          if (match.playerBId) playersInRound.add(match.playerBId);
        }

        // Each player should appear exactly once per round
        expect(playersInRound.size).toBe(6);
      }
    });

    it('should handle odd number of players with byes', () => {
      const players = createPlayers(5);
      const bracket = generateRoundRobinBracket(players);

      // With 5 players, each round should have 2 matches (one player gets bye)
      for (let round = 1; round <= bracket.totalRounds; round++) {
        const roundMatches = getMatchesInRound(bracket, round);
        expect(roundMatches).toHaveLength(2); // 5 players = 2 matches per round (one bye)
      }

      // Verify no match has 'BYE' as a player
      for (const match of bracket.matches) {
        expect(match.playerAId).not.toBe('BYE');
        expect(match.playerBId).not.toBe('BYE');
      }
    });
  });

  describe('Player Schedule', () => {
    it('should get all matches for a player', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      const player1Matches = getMatchesForPlayer(bracket, 'player-1');

      // Player 1 should have 3 matches (plays each of 3 other players)
      expect(player1Matches).toHaveLength(3);

      // Verify player-1 is in each match
      for (const match of player1Matches) {
        expect(match.playerAId === 'player-1' || match.playerBId === 'player-1').toBe(true);
      }
    });

    it('should get matches in a specific round', () => {
      const players = createPlayers(6);
      const bracket = generateRoundRobinBracket(players);

      const round1Matches = getMatchesInRound(bracket, 1);
      const round2Matches = getMatchesInRound(bracket, 2);

      expect(round1Matches).toHaveLength(3);
      expect(round2Matches).toHaveLength(3);

      // Verify round numbers
      expect(round1Matches.every((m) => m.round === 1)).toBe(true);
      expect(round2Matches.every((m) => m.round === 2)).toBe(true);
    });
  });

  describe('Match Results', () => {
    it('should record match result', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      const match = bracket.matches[0];
      const matchId = match.id!;
      const winnerId = match.playerAId!;
      const loserId = match.playerBId!;

      recordMatchResult(bracket, matchId, winnerId, loserId);

      expect(match.state).toBe('completed');
    });

    it('should reject invalid winner/loser', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      const match = bracket.matches[0];
      const matchId = match.id!;

      // Try to record result with player not in match
      expect(() => recordMatchResult(bracket, matchId, 'player-999', 'player-1')).toThrow(
        'must be players in this match'
      );
    });

    it('should throw for non-existent match', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      expect(() => recordMatchResult(bracket, 'fake-match', 'player-1', 'player-2')).toThrow(
        'not found'
      );
    });
  });

  describe('Standings Calculation', () => {
    it('should calculate initial standings', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      const standings = calculateStandings(bracket);

      expect(standings).toHaveLength(4);

      // Initial standings should all be zeros
      for (const entry of standings) {
        expect(entry.wins).toBe(0);
        expect(entry.losses).toBe(0);
        expect(entry.points).toBe(0);
        expect(entry.winPercentage).toBe(0);
      }
    });

    it('should handle completed matches in standings', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      // Complete a match
      const match = bracket.matches[0];
      recordMatchResult(bracket, match.id!, match.playerAId!, match.playerBId!);

      const standings = calculateStandings(bracket);

      // At least one player should have matchesPlayed > 0
      const totalMatchesPlayed = standings.reduce((sum, s) => sum + s.matchesPlayed, 0);
      expect(totalMatchesPlayed).toBeGreaterThan(0);
    });
  });

  describe('Tournament Progress', () => {
    it('should calculate tournament progress', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      // Initially 0%
      expect(getTournamentProgress(bracket)).toBe(0);

      // Complete half the matches
      for (let i = 0; i < bracket.matches.length / 2; i++) {
        const match = bracket.matches[i];
        recordMatchResult(bracket, match.id!, match.playerAId!, match.playerBId!);
      }

      const progress = getTournamentProgress(bracket);
      expect(progress).toBeGreaterThanOrEqual(40);
      expect(progress).toBeLessThanOrEqual(60);
    });

    it('should detect incomplete tournament', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      expect(isTournamentComplete(bracket)).toBe(false);
    });

    it('should detect complete tournament', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      // Complete all matches
      for (const match of bracket.matches) {
        recordMatchResult(bracket, match.id!, match.playerAId!, match.playerBId!);
      }

      expect(isTournamentComplete(bracket)).toBe(true);
      expect(getTournamentProgress(bracket)).toBe(100);
    });

    it('should get current round', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      // Initially round 1
      expect(getCurrentRound(bracket)).toBe(1);

      // Complete all round 1 matches
      const round1Matches = getMatchesInRound(bracket, 1);
      for (const match of round1Matches) {
        recordMatchResult(bracket, match.id!, match.playerAId!, match.playerBId!);
      }

      // Should advance to round 2
      expect(getCurrentRound(bracket)).toBe(2);
    });

    it('should return null when tournament complete', () => {
      const players = createPlayers(4);
      const bracket = generateRoundRobinBracket(players);

      // Complete all matches
      for (const match of bracket.matches) {
        recordMatchResult(bracket, match.id!, match.playerAId!, match.playerBId!);
      }

      expect(getCurrentRound(bracket)).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 2 player round robin', () => {
      const players = createPlayers(2);
      const bracket = generateRoundRobinBracket(players);

      expect(bracket.totalMatches).toBe(1);
      expect(bracket.totalRounds).toBe(1);
      expect(bracket.matches).toHaveLength(1);

      const match = bracket.matches[0];
      expect(match.playerAId).toBe('player-1');
      expect(match.playerBId).toBe('player-2');
    });

    it('should handle large tournament', () => {
      const players = createPlayers(16);
      const bracket = generateRoundRobinBracket(players);

      expect(bracket.playerCount).toBe(16);
      expect(bracket.totalMatches).toBe(120); // 16*15/2
      expect(bracket.matchesPerPlayer).toBe(15);
      expect(bracket.totalRounds).toBe(15);

      // Verify everyone plays everyone
      for (let i = 1; i <= 16; i++) {
        const playerMatches = getMatchesForPlayer(bracket, `player-${i}`);
        expect(playerMatches).toHaveLength(15);
      }
    });
  });
});
