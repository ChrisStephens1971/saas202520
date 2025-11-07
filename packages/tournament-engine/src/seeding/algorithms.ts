/**
 * Seeding Algorithms
 *
 * Provides different methods for seeding players in tournaments:
 * - Random: Shuffle players randomly
 * - Skill-based: Order by rating/skill level
 * - Manual: User-provided seed order
 */

import type { Player, SeedingAlgorithm } from '../types';

/**
 * Random Seeding
 *
 * Randomly shuffles players and assigns seeds.
 * Uses Fisher-Yates shuffle for uniform distribution.
 *
 * @param players - Players to seed
 * @param seed - Optional random seed for deterministic results
 * @returns Players with assigned seeds
 */
export function randomSeeding(players: Player[], seed?: number): Player[] {
  // Create a copy to avoid mutating original
  const shuffled = [...players];

  // Simple seeded random number generator (LCG)
  let randomSeed = seed ?? Math.floor(Math.random() * 2147483647);
  function seededRandom(): number {
    randomSeed = (randomSeed * 1103515245 + 12345) % 2147483647;
    return randomSeed / 2147483647;
  }

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Assign seeds
  return shuffled.map((player, index) => ({
    ...player,
    seed: index + 1,
  }));
}

/**
 * Skill-Based Seeding
 *
 * Orders players by their rating/skill level.
 * Higher rating = lower seed number (1 is best).
 *
 * @param players - Players to seed
 * @returns Players with assigned seeds based on rating
 */
export function skillBasedSeeding(players: Player[]): Player[] {
  // Create a copy
  const sorted = [...players];

  // Sort by rating (highest first)
  sorted.sort((a, b) => {
    // Players without rating go to the end
    if (!a.rating && !b.rating) return 0;
    if (!a.rating) return 1;
    if (!b.rating) return -1;

    // Convert rating to comparable number
    const ratingA = getRatingValue(a.rating);
    const ratingB = getRatingValue(b.rating);

    return ratingB - ratingA; // Descending order (highest first)
  });

  // Assign seeds
  return sorted.map((player, index) => ({
    ...player,
    seed: index + 1,
  }));
}

/**
 * Manual Seeding
 *
 * Assigns seeds based on provided order.
 *
 * @param players - Players to seed
 * @param seedOrder - Array of player IDs in desired seed order
 * @returns Players with assigned seeds
 * @throws Error if seedOrder doesn't match players
 */
export function manualSeeding(players: Player[], seedOrder: string[]): Player[] {
  if (seedOrder.length !== players.length) {
    throw new Error(
      `Seed order length (${seedOrder.length}) does not match player count (${players.length})`
    );
  }

  // Create player map for quick lookup
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Check all players are present
  for (const playerId of seedOrder) {
    if (!playerMap.has(playerId)) {
      throw new Error(`Player ${playerId} in seed order not found in player list`);
    }
  }

  // Assign seeds based on order
  return seedOrder.map((playerId, index) => {
    const player = playerMap.get(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in map`);
    }
    return {
      ...player,
      seed: index + 1,
    };
  });
}

/**
 * Snake Seeding
 *
 * Used for group/pool assignments. Distributes players evenly across groups
 * using a snake pattern (1-2-3-4, 8-7-6-5, 9-10-11-12, etc.)
 *
 * Example for 12 players into 4 groups:
 * Group A: [1, 8, 9]
 * Group B: [2, 7, 10]
 * Group C: [3, 6, 11]
 * Group D: [4, 5, 12]
 *
 * @param players - Seeded players
 * @param groupCount - Number of groups
 * @returns Array of player groups
 */
export function snakeSeeding(players: Player[], groupCount: number): Player[][] {
  if (groupCount < 2) {
    throw new Error('Group count must be at least 2');
  }

  if (players.length < groupCount) {
    throw new Error('Must have at least as many players as groups');
  }

  // Sort players by seed
  const sorted = [...players].sort((a, b) => {
    const seedA = a.seed ?? Infinity;
    const seedB = b.seed ?? Infinity;
    return seedA - seedB;
  });

  // Initialize groups
  const groups: Player[][] = Array.from({ length: groupCount }, () => []);

  // Distribute players in snake pattern
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const player of sorted) {
    groups[currentGroup].push(player);

    // Move to next group
    currentGroup += direction;

    // Reverse direction at boundaries
    if (currentGroup >= groupCount) {
      currentGroup = groupCount - 1;
      direction = -1;
    } else if (currentGroup < 0) {
      currentGroup = 0;
      direction = 1;
    }
  }

  return groups;
}

/**
 * Apply seeding algorithm to players
 *
 * @param players - Players to seed
 * @param algorithm - Seeding algorithm to use
 * @param options - Algorithm-specific options
 * @returns Seeded players
 */
export function applySeedingAlgorithm(
  players: Player[],
  algorithm: SeedingAlgorithm,
  options?: {
    randomSeed?: number;
    manualOrder?: string[];
  }
): Player[] {
  switch (algorithm) {
    case 'random':
      return randomSeeding(players, options?.randomSeed);

    case 'rating':
      return skillBasedSeeding(players);

    case 'manual':
      if (!options?.manualOrder) {
        throw new Error('Manual seeding requires manualOrder option');
      }
      return manualSeeding(players, options.manualOrder);

    default:
      throw new Error(`Unknown seeding algorithm: ${algorithm}`);
  }
}

/**
 * Helper: Get numeric rating value from player rating
 */
function getRatingValue(rating: { system: string; value: number | string }): number {
  if (typeof rating.value === 'number') {
    return rating.value;
  }

  // Try to parse string rating
  const parsed = parseFloat(rating.value);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Handle special cases (e.g., "A", "B", "C" letter grades)
  if (rating.system === 'bca' && typeof rating.value === 'string') {
    // BCA skill levels typically 2-7, or letter grades
    const letterGrades: Record<string, number> = {
      A: 7,
      B: 6,
      C: 5,
      D: 4,
      E: 3,
      F: 2,
    };
    return letterGrades[rating.value.toUpperCase()] ?? 0;
  }

  return 0;
}

/**
 * Validate seeding
 *
 * Checks that seeds are:
 * - Sequential (1, 2, 3, ...)
 * - Unique (no duplicates)
 * - Complete (all players have seeds)
 *
 * @param players - Players to validate
 * @returns true if valid, false otherwise
 */
export function validateSeeding(players: Player[]): boolean {
  const seeds = players.map((p) => p.seed).filter((s) => s !== undefined) as number[];

  // Check all players have seeds
  if (seeds.length !== players.length) {
    return false;
  }

  // Check seeds are sequential and unique
  const sortedSeeds = [...seeds].sort((a, b) => a - b);
  for (let i = 0; i < sortedSeeds.length; i++) {
    if (sortedSeeds[i] !== i + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Re-seed players after withdrawals
 *
 * When a player withdraws, close the gap in seeding.
 * Example: [1, 2, 3, 4, 5] -> remove 3 -> [1, 2, 3, 4]
 *
 * @param players - Remaining players (after withdrawal)
 * @returns Re-seeded players with sequential seeds
 */
export function reseedAfterWithdrawal(players: Player[]): Player[] {
  // Sort by current seed
  const sorted = [...players].sort((a, b) => {
    const seedA = a.seed ?? Infinity;
    const seedB = b.seed ?? Infinity;
    return seedA - seedB;
  });

  // Assign new sequential seeds
  return sorted.map((player, index) => ({
    ...player,
    seed: index + 1,
  }));
}
