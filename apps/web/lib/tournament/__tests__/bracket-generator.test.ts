/**
 * Bracket Generator Tests
 * Sprint 2: BRACKET-001 to BRACKET-005, SEED-001 to SEED-003
 *
 * Tests:
 * - Single elimination with various player counts
 * - Double elimination with winners/losers brackets
 * - Round robin scheduling
 * - Modified single elimination
 * - Seeding algorithms (random, skill-based, manual)
 * - Bye placement
 * - Match dependencies
 */

import { describe, it, expect } from 'vitest';
import {
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  generateModifiedSingleElimination,
  seedPlayers,
  validateBracket,
  getMatchesByRound,
  getReadyMatches,
  calculateTotalRounds,
  extractRatingValue,
  type PlayerWithRating,
  type SeedingOptions,
} from '../bracket-generator';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createPlayers(count: number, withRatings = false): PlayerWithRating[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    rating: withRatings
      ? {
          system: 'fargo',
          value: Math.floor(Math.random() * 400) + 400, // 400-800 range
        }
      : null,
  }));
}

// ============================================================================
// SEEDING TESTS
// ============================================================================

describe('Bracket Generator - Seeding', () => {
  describe('seedPlayers - Random', () => {
    it('should shuffle players randomly', () => {
      const players = createPlayers(8);
      const seeded = seedPlayers(players, { type: 'random' });

      expect(seeded).toHaveLength(8);
      expect(seeded.map((p) => p.id).sort()).toEqual(players.map((p) => p.id).sort());
    });

    it('should produce deterministic shuffle with seed', () => {
      const players = createPlayers(8);
      const seeded1 = seedPlayers(players, { type: 'random', seed: 12345 });
      const seeded2 = seedPlayers(players, { type: 'random', seed: 12345 });

      expect(seeded1.map((p) => p.id)).toEqual(seeded2.map((p) => p.id));
    });

    it('should produce different shuffles with different seeds', () => {
      const players = createPlayers(8);
      const seeded1 = seedPlayers(players, { type: 'random', seed: 12345 });
      const seeded2 = seedPlayers(players, { type: 'random', seed: 54321 });

      expect(seeded1.map((p) => p.id)).not.toEqual(seeded2.map((p) => p.id));
    });
  });

  describe('seedPlayers - Skill-based', () => {
    it('should sort players by rating descending', () => {
      const players: PlayerWithRating[] = [
        { id: 'p1', name: 'Player 1', rating: { system: 'fargo', value: 500 } },
        { id: 'p2', name: 'Player 2', rating: { system: 'fargo', value: 700 } },
        { id: 'p3', name: 'Player 3', rating: { system: 'fargo', value: 600 } },
        { id: 'p4', name: 'Player 4', rating: { system: 'fargo', value: 800 } },
      ];

      const seeded = seedPlayers(players, { type: 'skill-based' });

      expect(seeded.map((p) => p.id)).toEqual(['p4', 'p2', 'p3', 'p1']);
    });

    it('should handle players without ratings', () => {
      const players: PlayerWithRating[] = [
        { id: 'p1', name: 'Player 1', rating: { system: 'fargo', value: 500 } },
        { id: 'p2', name: 'Player 2', rating: null },
        { id: 'p3', name: 'Player 3', rating: { system: 'fargo', value: 600 } },
      ];

      const seeded = seedPlayers(players, { type: 'skill-based' });

      // Players without ratings should be at the end
      expect(seeded[seeded.length - 1].id).toBe('p2');
    });

    it('should handle string rating values', () => {
      const players: PlayerWithRating[] = [
        { id: 'p1', name: 'Player 1', rating: { system: 'apa', value: '5' } },
        { id: 'p2', name: 'Player 2', rating: { system: 'apa', value: '7' } },
        { id: 'p3', name: 'Player 3', rating: { system: 'apa', value: '6' } },
      ];

      const seeded = seedPlayers(players, { type: 'skill-based' });

      expect(seeded.map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
    });
  });

  describe('seedPlayers - Manual', () => {
    it('should order players according to manual order', () => {
      const players = createPlayers(4);
      const manualOrder = ['player-3', 'player-1', 'player-4', 'player-2'];

      const seeded = seedPlayers(players, { type: 'manual', manualOrder });

      expect(seeded.map((p) => p.id)).toEqual(manualOrder);
    });

    it('should append players not in manual order', () => {
      const players = createPlayers(4);
      const manualOrder = ['player-3', 'player-1'];

      const seeded = seedPlayers(players, { type: 'manual', manualOrder });

      expect(seeded.slice(0, 2).map((p) => p.id)).toEqual(['player-3', 'player-1']);
      expect(
        seeded
          .slice(2)
          .map((p) => p.id)
          .sort()
      ).toEqual(['player-2', 'player-4']);
    });
  });

  describe('extractRatingValue', () => {
    it('should extract numeric rating', () => {
      expect(extractRatingValue({ system: 'fargo', value: 650 })).toBe(650);
    });

    it('should extract string rating', () => {
      expect(extractRatingValue({ system: 'apa', value: '7' })).toBe(7);
    });

    it('should return 0 for null rating', () => {
      expect(extractRatingValue(null)).toBe(0);
    });

    it('should return 0 for invalid rating', () => {
      expect(extractRatingValue({ system: 'unknown', value: 'invalid' })).toBe(0);
    });
  });
});

// ============================================================================
// SINGLE ELIMINATION TESTS
// ============================================================================

describe('Bracket Generator - Single Elimination', () => {
  it('should generate 8-player bracket correctly', () => {
    const players = createPlayers(8);
    const bracket = generateSingleElimination(players);

    expect(bracket.format).toBe('single_elimination');
    expect(bracket.metadata.totalPlayers).toBe(8);
    expect(bracket.metadata.byeCount).toBe(0);
    expect(bracket.rounds).toBe(3); // 8 players = 3 rounds
    expect(bracket.matches).toHaveLength(7); // 4 + 2 + 1 = 7 matches
  });

  it('should generate 16-player bracket correctly', () => {
    const players = createPlayers(16);
    const bracket = generateSingleElimination(players);

    expect(bracket.rounds).toBe(4); // 16 players = 4 rounds
    expect(bracket.matches).toHaveLength(15); // 8 + 4 + 2 + 1 = 15 matches
  });

  it('should handle odd player count with byes', () => {
    const players = createPlayers(7);
    const bracket = generateSingleElimination(players);

    expect(bracket.metadata.totalPlayers).toBe(7);
    expect(bracket.metadata.byeCount).toBe(1); // 8 - 7 = 1 bye
    expect(bracket.rounds).toBe(3); // Next power of 2 is 8

    // Check for bye matches
    const byeMatches = bracket.matches.filter((m) => m.isBye);
    expect(byeMatches).toHaveLength(1);
    expect(byeMatches[0].state).toBe('completed');
    expect(byeMatches[0].winnerId).not.toBeNull();
  });

  it('should distribute byes evenly', () => {
    const players = createPlayers(5);
    const bracket = generateSingleElimination(players);

    expect(bracket.metadata.byeCount).toBe(3); // 8 - 5 = 3 byes

    const byeMatches = bracket.matches.filter((m) => m.isBye);
    expect(byeMatches).toHaveLength(3);

    // Byes should be in first round only
    byeMatches.forEach((match) => {
      expect(match.round).toBe(1);
    });
  });

  it('should link matches correctly (winner progression)', () => {
    const players = createPlayers(8);
    const bracket = generateSingleElimination(players);

    const round1 = getMatchesByRound(bracket, 1);
    const round2 = getMatchesByRound(bracket, 2);

    // Each round 1 match should link to a round 2 match
    round1.forEach((match) => {
      expect(match.nextMatchId).toBeDefined();
      const nextMatch = bracket.matches.find((m) => m.id === match.nextMatchId);
      expect(nextMatch).toBeDefined();
      expect(nextMatch?.round).toBe(2);
    });
  });

  it('should validate bracket structure', () => {
    const players = createPlayers(8);
    const bracket = generateSingleElimination(players);

    const validation = validateBracket(bracket);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

// ============================================================================
// DOUBLE ELIMINATION TESTS
// ============================================================================

describe('Bracket Generator - Double Elimination', () => {
  it('should generate 8-player double elimination bracket', () => {
    const players = createPlayers(8);
    const bracket = generateDoubleElimination(players);

    expect(bracket.format).toBe('double_elimination');
    expect(bracket.metadata.totalPlayers).toBe(8);

    // Check for winners and losers brackets
    const winnersMatches = bracket.matches.filter((m) => m.bracket === 'winners');
    const losersMatches = bracket.matches.filter((m) => m.bracket === 'losers');
    const grandFinals = bracket.matches.filter((m) => m.id === 'grand-finals');

    expect(winnersMatches.length).toBeGreaterThan(0);
    expect(losersMatches.length).toBeGreaterThan(0);
    expect(grandFinals).toHaveLength(1);
  });

  it('should link losers from winners bracket to losers bracket', () => {
    const players = createPlayers(8);
    const bracket = generateDoubleElimination(players);

    const winnersRound1 = bracket.matches.filter((m) => m.bracket === 'winners' && m.round === 1);

    // Each winners round 1 match should have a loserNextMatchId
    winnersRound1.forEach((match) => {
      if (!match.isBye) {
        expect(match.loserNextMatchId).toBeDefined();

        const loserMatch = bracket.matches.find((m) => m.id === match.loserNextMatchId);
        expect(loserMatch).toBeDefined();
        expect(loserMatch?.bracket).toBe('losers');
      }
    });
  });

  it('should link winners bracket final to grand finals', () => {
    const players = createPlayers(8);
    const bracket = generateDoubleElimination(players);

    const winnersMatches = bracket.matches.filter((m) => m.bracket === 'winners');
    const winnersFinal = winnersMatches[winnersMatches.length - 1];
    const grandFinals = bracket.matches.find((m) => m.id === 'grand-finals');

    expect(winnersFinal.nextMatchId).toBe(grandFinals?.id);
  });

  it('should link losers bracket final to grand finals', () => {
    const players = createPlayers(8);
    const bracket = generateDoubleElimination(players);

    const losersMatches = bracket.matches.filter((m) => m.bracket === 'losers');
    const losersFinal = losersMatches[losersMatches.length - 1];
    const grandFinals = bracket.matches.find((m) => m.id === 'grand-finals');

    expect(losersFinal.nextMatchId).toBe(grandFinals?.id);
  });

  it('should validate double elimination bracket', () => {
    const players = createPlayers(8);
    const bracket = generateDoubleElimination(players);

    const validation = validateBracket(bracket);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

// ============================================================================
// ROUND ROBIN TESTS
// ============================================================================

describe('Bracket Generator - Round Robin', () => {
  it('should generate round robin for 4 players', () => {
    const players = createPlayers(4);
    const bracket = generateRoundRobin(players);

    expect(bracket.format).toBe('round_robin');
    expect(bracket.metadata.totalPlayers).toBe(4);

    // Total matches: n * (n - 1) / 2 = 4 * 3 / 2 = 6
    expect(bracket.matches).toHaveLength(6);

    // Total rounds: n - 1 = 3
    expect(bracket.rounds).toBe(3);
  });

  it('should ensure all players play each other once', () => {
    const players = createPlayers(4);
    const bracket = generateRoundRobin(players);

    const pairings = new Set<string>();

    bracket.matches.forEach((match) => {
      const pair = [match.playerAId, match.playerBId].sort().join('-');
      expect(pairings.has(pair)).toBe(false); // No duplicates
      pairings.add(pair);
    });

    expect(pairings.size).toBe(6); // All unique pairings
  });

  it('should handle odd number of players', () => {
    const players = createPlayers(5);
    const bracket = generateRoundRobin(players);

    // Total matches: n * (n - 1) / 2 = 5 * 4 / 2 = 10
    expect(bracket.matches).toHaveLength(10);

    // Total rounds: n (for odd players)
    expect(bracket.rounds).toBe(5);
  });

  it('should balance matches per round', () => {
    const players = createPlayers(6);
    const bracket = generateRoundRobin(players);

    // Each round should have n/2 matches (for even players)
    for (let round = 1; round <= bracket.rounds; round++) {
      const roundMatches = getMatchesByRound(bracket, round);
      expect(roundMatches).toHaveLength(3); // 6 / 2 = 3
    }
  });

  it('should validate round robin bracket', () => {
    const players = createPlayers(6);
    const bracket = generateRoundRobin(players);

    const validation = validateBracket(bracket);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should throw error for less than 2 players', () => {
    const players = createPlayers(1);

    expect(() => generateRoundRobin(players)).toThrow('Round robin requires at least 2 players');
  });
});

// ============================================================================
// MODIFIED SINGLE ELIMINATION TESTS
// ============================================================================

describe('Bracket Generator - Modified Single Elimination', () => {
  it('should generate modified single elimination with consolation', () => {
    const players = createPlayers(8);
    const bracket = generateModifiedSingleElimination(players, undefined, {
      includeConsolation: true,
    });

    expect(bracket.format).toBe('modified_single');

    // Should have consolation match
    const consolation = bracket.matches.find((m) => m.id === 'consolation');
    expect(consolation).toBeDefined();

    // Consolation should be linked from semi-finals
    const semiFinals = bracket.matches.filter((m) => m.round === bracket.rounds - 2);
    expect(semiFinals).toHaveLength(2);

    semiFinals.forEach((match) => {
      expect(match.loserNextMatchId).toBe('consolation');
    });
  });

  it('should generate without consolation if disabled', () => {
    const players = createPlayers(8);
    const bracket = generateModifiedSingleElimination(players, undefined, {
      includeConsolation: false,
    });

    const consolation = bracket.matches.find((m) => m.id === 'consolation');
    expect(consolation).toBeUndefined();
  });

  it('should validate modified single elimination bracket', () => {
    const players = createPlayers(8);
    const bracket = generateModifiedSingleElimination(players);

    const validation = validateBracket(bracket);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Bracket Generator - Utilities', () => {
  describe('calculateTotalRounds', () => {
    it('should calculate rounds for single elimination', () => {
      expect(calculateTotalRounds(8, 'single_elimination')).toBe(3);
      expect(calculateTotalRounds(16, 'single_elimination')).toBe(4);
      expect(calculateTotalRounds(7, 'single_elimination')).toBe(3); // Next power of 2
    });

    it('should calculate rounds for double elimination', () => {
      expect(calculateTotalRounds(8, 'double_elimination')).toBeGreaterThan(3);
      expect(calculateTotalRounds(16, 'double_elimination')).toBeGreaterThan(4);
    });

    it('should calculate rounds for round robin', () => {
      expect(calculateTotalRounds(4, 'round_robin')).toBe(3);
      expect(calculateTotalRounds(5, 'round_robin')).toBe(5);
      expect(calculateTotalRounds(6, 'round_robin')).toBe(5);
    });
  });

  describe('getMatchesByRound', () => {
    it('should filter matches by round', () => {
      const players = createPlayers(8);
      const bracket = generateSingleElimination(players);

      const round1 = getMatchesByRound(bracket, 1);
      expect(round1).toHaveLength(4);
      round1.forEach((match) => expect(match.round).toBe(1));
    });
  });

  describe('getReadyMatches', () => {
    it('should return only ready matches', () => {
      const matches = [
        {
          id: '1',
          round: 1,
          bracket: null,
          position: 0,
          playerAId: 'p1',
          playerBId: 'p2',
          state: 'ready' as const,
          winnerId: null,
          isBye: false,
        },
        {
          id: '2',
          round: 1,
          bracket: null,
          position: 1,
          playerAId: 'p3',
          playerBId: null,
          state: 'pending' as const,
          winnerId: null,
          isBye: false,
        },
        {
          id: '3',
          round: 1,
          bracket: null,
          position: 2,
          playerAId: 'p4',
          playerBId: 'p5',
          state: 'active' as const,
          winnerId: null,
          isBye: false,
        },
      ];

      const ready = getReadyMatches(matches);
      expect(ready).toHaveLength(1);
      expect(ready[0].id).toBe('1');
    });

    it('should exclude bye matches', () => {
      const matches = [
        {
          id: '1',
          round: 1,
          bracket: null,
          position: 0,
          playerAId: 'p1',
          playerBId: null,
          state: 'ready' as const,
          winnerId: null,
          isBye: true,
        },
      ];

      const ready = getReadyMatches(matches);
      expect(ready).toHaveLength(0);
    });
  });
});

// ============================================================================
// PROPERTY-BASED TESTS
// ============================================================================

describe('Bracket Generator - Property Tests', () => {
  it('should never create duplicate player pairings in round robin', () => {
    const playerCounts = [4, 5, 6, 7, 8, 10, 12];

    playerCounts.forEach((count) => {
      const players = createPlayers(count);
      const bracket = generateRoundRobin(players);

      const pairings = new Set<string>();

      bracket.matches.forEach((match) => {
        const pair = [match.playerAId, match.playerBId].sort().join('-');
        expect(pairings.has(pair)).toBe(false);
        pairings.add(pair);
      });
    });
  });

  it('should ensure every player appears in correct number of matches', () => {
    const players = createPlayers(6);
    const bracket = generateSingleElimination(players);

    // Count appearances (including byes)
    const appearances = new Map<string, number>();

    bracket.matches.forEach((match) => {
      if (match.playerAId) {
        appearances.set(match.playerAId, (appearances.get(match.playerAId) || 0) + 1);
      }
      if (match.playerBId) {
        appearances.set(match.playerBId, (appearances.get(match.playerBId) || 0) + 1);
      }
    });

    // Each player should appear at least once
    players.forEach((player) => {
      const count = appearances.get(player.id);
      expect(count).toBeDefined();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  it('should maintain bracket integrity for various player counts', () => {
    const playerCounts = [4, 7, 8, 12, 16, 32];

    playerCounts.forEach((count) => {
      const players = createPlayers(count);

      const singleElim = generateSingleElimination(players);
      expect(validateBracket(singleElim).valid).toBe(true);

      const doubleElim = generateDoubleElimination(players);
      expect(validateBracket(doubleElim).valid).toBe(true);

      const roundRobin = generateRoundRobin(players);
      expect(validateBracket(roundRobin).valid).toBe(true);

      const modifiedSingle = generateModifiedSingleElimination(players);
      expect(validateBracket(modifiedSingle).valid).toBe(true);
    });
  });
});
