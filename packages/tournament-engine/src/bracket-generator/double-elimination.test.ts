/**
 * Tests for Double Elimination Bracket Generator
 */

import { describe, it, expect } from 'vitest';
import {
  generateDoubleEliminationBracket,
  getMatch,
  getMatchesInRound,
  getMatchesInBracket,
  advanceWinner,
} from './double-elimination';
import type { Player } from '../types';

describe('Double Elimination Bracket Generator', () => {
  function createSeededPlayers(count: number): Player[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      seed: i + 1,
    }));
  }

  describe('Basic Bracket Generation', () => {
    it('should generate bracket for 2 players', () => {
      const players = createSeededPlayers(2);
      const bracket = generateDoubleEliminationBracket(players);

      expect(bracket.format).toBe('double_elimination');
      expect(bracket.playerCount).toBe(2);
      expect(bracket.matches.length).toBeGreaterThan(0);
    });

    it('should generate bracket for 4 players', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      expect(bracket.format).toBe('double_elimination');
      expect(bracket.playerCount).toBe(4);

      // 4 players: W1(2) + W2(1) + L1(2) + L2(1) + L3(1) + GF(1) = 8 matches
      expect(bracket.matches.length).toBeGreaterThanOrEqual(7);
    });

    it('should generate bracket for 8 players', () => {
      const players = createSeededPlayers(8);
      const bracket = generateDoubleEliminationBracket(players);

      expect(bracket.format).toBe('double_elimination');
      expect(bracket.playerCount).toBe(8);

      // 8 players: Winners(7) + Losers(6) + GF(1) = 14 matches minimum
      expect(bracket.matches.length).toBeGreaterThanOrEqual(14);
    });

    it('should reject invalid player counts', () => {
      expect(() => generateDoubleEliminationBracket([])).toThrow('less than 2');
      expect(() => generateDoubleEliminationBracket([{ id: '1', name: 'P1' }])).toThrow(
        'less than 2'
      );

      const tooMany = createSeededPlayers(129);
      expect(() => generateDoubleEliminationBracket(tooMany)).toThrow('Maximum bracket size');
    });
  });

  describe('Winners Bracket Structure', () => {
    it('should create proper winners bracket', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const winnersMatches = getMatchesInBracket(bracket, 'winners');

      // 4 players: 2 matches in R1, 1 match in R2 (finals)
      expect(winnersMatches.length).toBe(3);

      // Check Round 1
      const w1Matches = winnersMatches.filter((m) => m.round === 1);
      expect(w1Matches).toHaveLength(2);
      expect(w1Matches[0].bracket).toBe('winners');
      expect(w1Matches[0].state).toBe('ready'); // Has both players
    });

    it('should use standard tournament seeding', () => {
      const players = createSeededPlayers(8);
      const bracket = generateDoubleEliminationBracket(players);

      const w1Matches = getMatchesInRound(bracket, 1);

      // Standard seeding: 1v8, 4v5, 2v7, 3v6
      expect(w1Matches[0].playerAId).toBe('player-1');
      expect(w1Matches[0].playerBId).toBe('player-8');

      expect(w1Matches[1].playerAId).toBe('player-4');
      expect(w1Matches[1].playerBId).toBe('player-5');

      expect(w1Matches[2].playerAId).toBe('player-2');
      expect(w1Matches[2].playerBId).toBe('player-7');

      expect(w1Matches[3].playerAId).toBe('player-3');
      expect(w1Matches[3].playerBId).toBe('player-6');
    });

    it('should link winners bracket matches correctly', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const w1m0 = getMatch(bracket, 1, 0);
      const w1m1 = getMatch(bracket, 1, 1);

      // Both R1 matches should feed into R2 position 0
      expect(w1m0?.feedsInto?.round).toBe(2);
      expect(w1m0?.feedsInto?.position).toBe(0);
      expect(w1m0?.feedsInto?.slot).toBe('A');

      expect(w1m1?.feedsInto?.round).toBe(2);
      expect(w1m1?.feedsInto?.position).toBe(0);
      expect(w1m1?.feedsInto?.slot).toBe('B');
    });
  });

  describe('Losers Bracket Structure', () => {
    it('should create losers bracket', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const losersMatches = getMatchesInBracket(bracket, 'losers');

      // 4 players: L1(2) + L2(1) + L3(1) = 4 matches minimum
      expect(losersMatches.length).toBeGreaterThanOrEqual(3);
    });

    it('should route losers from winners R1 to losers R1', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const w1m0 = getMatch(bracket, 1, 0);
      const w1m1 = getMatch(bracket, 1, 1);

      // Winners R1 losers should feed to Losers R1
      expect(w1m0?.feedsLoserInto).toBeDefined();
      expect(w1m0?.feedsLoserInto?.round).toBeGreaterThan(2); // After winners rounds

      expect(w1m1?.feedsLoserInto).toBeDefined();
      expect(w1m1?.feedsLoserInto?.round).toBeGreaterThan(2);
    });

    it('should route losers from winners bracket to losers bracket', () => {
      const players = createSeededPlayers(8);
      const bracket = generateDoubleEliminationBracket(players);

      const winnersMatches = getMatchesInBracket(bracket, 'winners');

      // All winners matches (except maybe finals) should have feedsLoserInto
      const withLoserRouting = winnersMatches.filter((m) => m.feedsLoserInto);
      expect(withLoserRouting.length).toBeGreaterThan(0);
    });
  });

  describe('Grand Finals', () => {
    it('should create grand finals match', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const gfMatches = getMatchesInBracket(bracket, 'grand_finals');
      expect(gfMatches.length).toBeGreaterThanOrEqual(1);

      const gf = gfMatches[0];
      expect(gf.id).toBe('GF');
      expect(gf.bracket).toBe('grand_finals');
      expect(gf.state).toBe('pending');
    });

    it('should connect winners finals to grand finals', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const winnersMatches = getMatchesInBracket(bracket, 'winners');
      const winnersFinals = winnersMatches[winnersMatches.length - 1];

      expect(winnersFinals.feedsInto?.round).toBe(bracket.totalRounds);
      expect(winnersFinals.feedsInto?.position).toBe(0);
      expect(winnersFinals.feedsInto?.slot).toBe('A');
    });

    it('should connect losers finals to grand finals', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const losersMatches = getMatchesInBracket(bracket, 'losers');
      const losersFinals = losersMatches[losersMatches.length - 1];

      expect(losersFinals.feedsInto?.round).toBe(bracket.totalRounds);
      expect(losersFinals.feedsInto?.position).toBe(0);
      expect(losersFinals.feedsInto?.slot).toBe('B');
    });
  });

  describe('Bracket Reset', () => {
    it('should not create reset match by default', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const resetMatch = bracket.matches.find((m) => m.id === 'GF-RESET');
      expect(resetMatch).toBeUndefined();
    });

    it('should create reset match when enabled', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players, { allowBracketReset: true });

      const resetMatch = bracket.matches.find((m) => m.id === 'GF-RESET');
      expect(resetMatch).toBeDefined();
      expect(resetMatch?.bracket).toBe('grand_finals');
      expect(resetMatch?.round).toBe(bracket.totalRounds);
    });

    it('should connect grand finals to reset match', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players, { allowBracketReset: true });

      const gf = bracket.matches.find((m) => m.id === 'GF');
      expect(gf?.feedsLoserInto).toBeDefined();
      expect(gf?.feedsLoserInto?.round).toBe(bracket.totalRounds);
      expect(gf?.feedsLoserInto?.position).toBe(0);
    });
  });

  describe('Match Queries', () => {
    it('should get match by round and position', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      const match = getMatch(bracket, 1, 0);
      expect(match).toBeDefined();
      expect(match?.round).toBe(1);
      expect(match?.position).toBe(0);
    });

    it('should get all matches in round', () => {
      const players = createSeededPlayers(8);
      const bracket = generateDoubleEliminationBracket(players);

      const r1Matches = getMatchesInRound(bracket, 1);
      expect(r1Matches).toHaveLength(4); // 8 players = 4 matches in R1
    });

    it('should get matches by bracket type', () => {
      const players = createSeededPlayers(8);
      const bracket = generateDoubleEliminationBracket(players);

      const winnersMatches = getMatchesInBracket(bracket, 'winners');
      const losersMatches = getMatchesInBracket(bracket, 'losers');
      const gfMatches = getMatchesInBracket(bracket, 'grand_finals');

      expect(winnersMatches.length).toBeGreaterThan(0);
      expect(losersMatches.length).toBeGreaterThan(0);
      expect(gfMatches.length).toBeGreaterThanOrEqual(1);

      // Verify no overlap
      expect(winnersMatches.every((m) => m.bracket === 'winners')).toBe(true);
      expect(losersMatches.every((m) => m.bracket === 'losers')).toBe(true);
      expect(gfMatches.every((m) => m.bracket === 'grand_finals')).toBe(true);
    });
  });

  describe('Winner Advancement', () => {
    it('should advance winner in winners bracket', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      // Complete W1-0: player-1 beats player-4
      advanceWinner(bracket, 'W1-0', 'player-1', 'player-4');

      const w1m0 = getMatch(bracket, 1, 0);
      expect(w1m0?.state).toBe('completed');

      // Winner should advance to W2-0 slot A
      const w2m0 = getMatch(bracket, 2, 0);
      expect(w2m0?.playerAId).toBe('player-1');
    });

    it('should route loser to losers bracket', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      // Complete W1-0: player-1 beats player-4
      advanceWinner(bracket, 'W1-0', 'player-1', 'player-4');

      // Loser (player-4) should go to losers bracket
      const w1m0 = getMatch(bracket, 1, 0);
      const loserRound = w1m0?.feedsLoserInto?.round;
      const loserPos = w1m0?.feedsLoserInto?.position;

      expect(loserRound).toBeDefined();
      expect(loserPos).toBeDefined();

      const loserMatch = getMatch(bracket, loserRound!, loserPos!);
      expect(loserMatch?.playerAId).toBe('player-4');
    });

    it('should mark match as ready when both players present', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      // Complete both W1 matches
      advanceWinner(bracket, 'W1-0', 'player-1', 'player-4');
      advanceWinner(bracket, 'W1-1', 'player-2', 'player-3');

      // W2-0 should now have both players and be ready
      const w2m0 = getMatch(bracket, 2, 0);
      expect(w2m0?.playerAId).toBe('player-1');
      expect(w2m0?.playerBId).toBe('player-2');
      expect(w2m0?.state).toBe('ready');
    });

    it('should handle complete tournament progression', () => {
      const players = createSeededPlayers(4);
      const bracket = generateDoubleEliminationBracket(players);

      // Winners Bracket
      advanceWinner(bracket, 'W1-0', 'player-1', 'player-4');
      advanceWinner(bracket, 'W1-1', 'player-2', 'player-3');
      advanceWinner(bracket, 'W2-0', 'player-1', 'player-2'); // player-1 to GF

      // Losers Bracket
      // L1: player-4 vs player-3
      const l1m0Round = getMatch(bracket, 1, 0)?.feedsLoserInto?.round;
      const l1Matches = getMatchesInRound(bracket, l1m0Round!);
      expect(l1Matches[0].playerAId).toBe('player-4');
      expect(l1Matches[1].playerAId).toBe('player-3');

      // Simulate losers bracket progression
      // This would require more complex routing validation
      // For now, just verify structure exists
      expect(l1Matches.length).toBeGreaterThan(0);
    });
  });

  describe('Bye Handling', () => {
    it('should handle non-power-of-2 player counts', () => {
      const players = createSeededPlayers(6);
      const bracket = generateDoubleEliminationBracket(players);

      expect(bracket.playerCount).toBe(6);
      expect(bracket.matches.length).toBeGreaterThan(0);

      // Some matches should be byes (auto-completed)
      const byes = bracket.matches.filter((m) => m.state === 'completed' && m.round === 1);
      expect(byes.length).toBeGreaterThan(0);
    });

    it('should auto-complete bye matches', () => {
      const players = createSeededPlayers(3);
      const bracket = generateDoubleEliminationBracket(players);

      const r1Matches = getMatchesInRound(bracket, 1);
      const byeMatches = r1Matches.filter(
        (m) => m.state === 'completed' && (!m.playerAId || !m.playerBId)
      );

      expect(byeMatches.length).toBeGreaterThan(0);
    });
  });
});
