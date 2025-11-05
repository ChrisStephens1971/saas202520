/**
 * Tests for Seeding Algorithms
 */

import { describe, it, expect } from 'vitest';
import {
  randomSeeding,
  skillBasedSeeding,
  manualSeeding,
  snakeSeeding,
  applySeedingAlgorithm,
  validateSeeding,
  reseedAfterWithdrawal,
} from './algorithms';
import type { Player } from '../types';

describe('Seeding Algorithms', () => {
  function createPlayers(count: number): Player[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
    }));
  }

  function createRatedPlayers(): Player[] {
    return [
      { id: 'p1', name: 'Alice', rating: { system: 'fargo', value: 700 } },
      { id: 'p2', name: 'Bob', rating: { system: 'fargo', value: 600 } },
      { id: 'p3', name: 'Carol', rating: { system: 'fargo', value: 500 } },
      { id: 'p4', name: 'Dave', rating: { system: 'fargo', value: 550 } },
    ];
  }

  describe('Random Seeding', () => {
    it('should assign seeds to all players', () => {
      const players = createPlayers(8);
      const seeded = randomSeeding(players);

      expect(seeded).toHaveLength(8);
      expect(validateSeeding(seeded)).toBe(true);
    });

    it('should be deterministic with seed', () => {
      const players = createPlayers(8);
      const seeded1 = randomSeeding(players, 12345);
      const seeded2 = randomSeeding(players, 12345);

      expect(seeded1.map((p) => p.id)).toEqual(seeded2.map((p) => p.id));
    });

    it('should produce different results with different seeds', () => {
      const players = createPlayers(8);
      const seeded1 = randomSeeding(players, 111);
      const seeded2 = randomSeeding(players, 222);

      expect(seeded1.map((p) => p.id)).not.toEqual(seeded2.map((p) => p.id));
    });

    it('should shuffle all players', () => {
      const players = createPlayers(8);
      const seeded = randomSeeding(players, 42);

      // Verify all original players are present
      const originalIds = players.map((p) => p.id).sort();
      const seededIds = seeded.map((p) => p.id).sort();
      expect(seededIds).toEqual(originalIds);
    });
  });

  describe('Skill-Based Seeding', () => {
    it('should order by rating descending', () => {
      const players = createRatedPlayers();
      const seeded = skillBasedSeeding(players);

      expect(seeded[0].id).toBe('p1'); // 700 rating
      expect(seeded[1].id).toBe('p2'); // 600 rating
      expect(seeded[2].id).toBe('p4'); // 550 rating
      expect(seeded[3].id).toBe('p3'); // 500 rating
    });

    it('should assign seeds correctly', () => {
      const players = createRatedPlayers();
      const seeded = skillBasedSeeding(players);

      expect(seeded[0].seed).toBe(1);
      expect(seeded[1].seed).toBe(2);
      expect(seeded[2].seed).toBe(3);
      expect(seeded[3].seed).toBe(4);
    });

    it('should handle players without ratings', () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', rating: { system: 'fargo', value: 700 } },
        { id: 'p2', name: 'Bob' }, // No rating
        { id: 'p3', name: 'Carol', rating: { system: 'fargo', value: 600 } },
      ];

      const seeded = skillBasedSeeding(players);

      expect(seeded[0].id).toBe('p1'); // Highest rating
      expect(seeded[1].id).toBe('p3'); // Second rating
      expect(seeded[2].id).toBe('p2'); // No rating (last)
    });

    it('should handle string ratings', () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', rating: { system: 'bca', value: 'B' } },
        { id: 'p2', name: 'Bob', rating: { system: 'bca', value: 'A' } },
        { id: 'p3', name: 'Carol', rating: { system: 'bca', value: 'C' } },
      ];

      const seeded = skillBasedSeeding(players);

      expect(seeded[0].id).toBe('p2'); // A (7)
      expect(seeded[1].id).toBe('p1'); // B (6)
      expect(seeded[2].id).toBe('p3'); // C (5)
    });
  });

  describe('Manual Seeding', () => {
    it('should assign seeds in specified order', () => {
      const players = createPlayers(4);
      const order = ['player-3', 'player-1', 'player-4', 'player-2'];

      const seeded = manualSeeding(players, order);

      expect(seeded[0].id).toBe('player-3');
      expect(seeded[0].seed).toBe(1);
      expect(seeded[1].id).toBe('player-1');
      expect(seeded[1].seed).toBe(2);
    });

    it('should throw if order length mismatches', () => {
      const players = createPlayers(4);
      const order = ['player-1', 'player-2']; // Only 2

      expect(() => manualSeeding(players, order)).toThrow('does not match player count');
    });

    it('should throw if player not found', () => {
      const players = createPlayers(4);
      const order = ['player-1', 'player-999', 'player-3', 'player-4'];

      expect(() => manualSeeding(players, order)).toThrow('not found in player list');
    });
  });

  describe('Snake Seeding', () => {
    it('should distribute players evenly', () => {
      const players = createPlayers(12).map((p, i) => ({ ...p, seed: i + 1 }));
      const groups = snakeSeeding(players, 4);

      expect(groups).toHaveLength(4);
      expect(groups[0]).toHaveLength(3);
      expect(groups[1]).toHaveLength(3);
      expect(groups[2]).toHaveLength(3);
      expect(groups[3]).toHaveLength(3);
    });

    it('should use snake pattern', () => {
      const players = createPlayers(8).map((p, i) => ({ ...p, seed: i + 1 }));
      const groups = snakeSeeding(players, 4);

      // Group A: 1, 8
      expect(groups[0].map((p) => p.seed)).toEqual([1, 8]);
      // Group B: 2, 7
      expect(groups[1].map((p) => p.seed)).toEqual([2, 7]);
      // Group C: 3, 6
      expect(groups[2].map((p) => p.seed)).toEqual([3, 6]);
      // Group D: 4, 5
      expect(groups[3].map((p) => p.seed)).toEqual([4, 5]);
    });

    it('should throw if too few groups', () => {
      const players = createPlayers(8);
      expect(() => snakeSeeding(players, 1)).toThrow('at least 2');
    });

    it('should throw if more groups than players', () => {
      const players = createPlayers(4);
      expect(() => snakeSeeding(players, 6)).toThrow('at least as many players');
    });
  });

  describe('Apply Seeding Algorithm', () => {
    it('should apply random seeding', () => {
      const players = createPlayers(8);
      const seeded = applySeedingAlgorithm(players, 'random', { randomSeed: 42 });

      expect(validateSeeding(seeded)).toBe(true);
    });

    it('should apply skill-based seeding', () => {
      const players = createRatedPlayers();
      const seeded = applySeedingAlgorithm(players, 'rating');

      expect(seeded[0].id).toBe('p1'); // Highest rating
    });

    it('should apply manual seeding', () => {
      const players = createPlayers(4);
      const seeded = applySeedingAlgorithm(players, 'manual', {
        manualOrder: ['player-2', 'player-4', 'player-1', 'player-3'],
      });

      expect(seeded[0].id).toBe('player-2');
    });

    it('should throw for manual without order', () => {
      const players = createPlayers(4);
      expect(() => applySeedingAlgorithm(players, 'manual')).toThrow(
        'requires manualOrder'
      );
    });
  });

  describe('Seeding Validation', () => {
    it('should validate correct seeding', () => {
      const players = createPlayers(8).map((p, i) => ({ ...p, seed: i + 1 }));
      expect(validateSeeding(players)).toBe(true);
    });

    it('should reject missing seeds', () => {
      const players = createPlayers(4);
      players[0].seed = 1;
      players[1].seed = 2;
      // players[2] and players[3] missing seeds

      expect(validateSeeding(players)).toBe(false);
    });

    it('should reject duplicate seeds', () => {
      const players = createPlayers(4).map((p) => ({ ...p, seed: 1 }));
      expect(validateSeeding(players)).toBe(false);
    });

    it('should reject non-sequential seeds', () => {
      const players = createPlayers(4);
      players[0].seed = 1;
      players[1].seed = 2;
      players[2].seed = 4; // Skip 3
      players[3].seed = 5;

      expect(validateSeeding(players)).toBe(false);
    });
  });

  describe('Re-seeding After Withdrawal', () => {
    it('should close gaps in seeding', () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', seed: 1 },
        { id: 'p2', name: 'Bob', seed: 2 },
        // Player 3 withdrew
        { id: 'p4', name: 'Dave', seed: 4 },
        { id: 'p5', name: 'Eve', seed: 5 },
      ];

      const reseeded = reseedAfterWithdrawal(players);

      expect(reseeded[0].seed).toBe(1);
      expect(reseeded[1].seed).toBe(2);
      expect(reseeded[2].seed).toBe(3); // Was 4
      expect(reseeded[3].seed).toBe(4); // Was 5
    });

    it('should maintain relative order', () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', seed: 1 },
        { id: 'p4', name: 'Dave', seed: 4 },
        { id: 'p5', name: 'Eve', seed: 5 },
      ];

      const reseeded = reseedAfterWithdrawal(players);

      expect(reseeded[0].id).toBe('p1');
      expect(reseeded[1].id).toBe('p4');
      expect(reseeded[2].id).toBe('p5');
    });
  });
});
