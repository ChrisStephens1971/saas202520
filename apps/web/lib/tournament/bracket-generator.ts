/**
 * Bracket Generator for All Tournament Formats
 * Sprint 2: BRACKET-001 to BRACKET-005, SEED-001 to SEED-003
 *
 * Implements:
 * - Single Elimination with bye placement
 * - Double Elimination (Winners + Losers brackets)
 * - Round Robin (all participants play each other)
 * - Modified Single Elimination
 * - Deterministic seeding (random, skill-based, manual)
 *
 * Multi-tenant safe: All operations are stateless and work with provided player data
 */

import type { Player } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BracketMatch {
  id: string;
  round: number;
  bracket?: 'winners' | 'losers' | null; // null for non-bracket formats
  position: number; // Position in bracket/round
  playerAId: string | null;
  playerBId: string | null;
  state: 'pending' | 'ready' | 'assigned' | 'active' | 'completed';
  winnerId: string | null;
  nextMatchId?: string; // ID of match winner advances to
  loserNextMatchId?: string; // For double elim: where loser goes
  isBye: boolean; // True if one player has a bye
}

export interface BracketStructure {
  matches: BracketMatch[];
  rounds: number;
  format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'modified_single';
  metadata: {
    totalPlayers: number;
    byeCount: number;
    totalRounds: number;
  };
}

export interface SeedingOptions {
  type: 'random' | 'skill-based' | 'manual';
  seed?: number; // For deterministic random seeding
  manualOrder?: string[]; // Player IDs in desired order (for manual seeding)
}

export interface PlayerWithRating extends Pick<Player, 'id' | 'name' | 'rating'> {
  rating: any; // { system: "apa" | "fargo" | "bca", value: number | string } or null
}

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

/**
 * Apply seeding to players based on seeding options
 * Returns deterministic player order
 */
export function seedPlayers(
  players: PlayerWithRating[],
  options: SeedingOptions = { type: 'random' }
): PlayerWithRating[] {
  switch (options.type) {
    case 'manual':
      return seedManual(players, options.manualOrder || []);
    case 'skill-based':
      return seedBySkill(players);
    case 'random':
    default:
      return seedRandom(players, options.seed);
  }
}

/**
 * Random seeding with deterministic shuffle
 * Uses Fisher-Yates algorithm with optional seed for reproducibility
 */
function seedRandom(players: PlayerWithRating[], seed?: number): PlayerWithRating[] {
  const shuffled = [...players];
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Skill-based seeding: Sort players by rating (highest first)
 * Handles different rating systems (APA, Fargo, BCA)
 */
function seedBySkill(players: PlayerWithRating[]): PlayerWithRating[] {
  return [...players].sort((a, b) => {
    const ratingA = extractRatingValue(a.rating);
    const ratingB = extractRatingValue(b.rating);

    // Sort descending (highest rating first)
    return ratingB - ratingA;
  });
}

/**
 * Manual seeding: Order players according to provided IDs
 */
function seedManual(players: PlayerWithRating[], order: string[]): PlayerWithRating[] {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const seeded: PlayerWithRating[] = [];

  // Add players in specified order
  for (const playerId of order) {
    const player = playerMap.get(playerId);
    if (player) {
      seeded.push(player);
      playerMap.delete(playerId);
    }
  }

  // Append any remaining players not in manual order
  seeded.push(...Array.from(playerMap.values()));

  return seeded;
}

/**
 * Extract numeric rating value from rating object
 */
function extractRatingValue(rating: any): number {
  if (!rating || typeof rating !== 'object') {
    return 0; // No rating = lowest priority
  }

  const value = rating.value;

  // Handle different rating systems
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Seeded pseudo-random number generator (PRNG)
 * Uses simple LCG algorithm for deterministic randomness
 */
function seededRandom(seed: number): () => number {
  let state = seed;

  return function () {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ============================================================================
// BRACKET GENERATION - SINGLE ELIMINATION
// ============================================================================

/**
 * Generate single elimination bracket
 * Handles byes with deterministic placement
 *
 * Algorithm:
 * 1. Calculate next power of 2 for bracket size
 * 2. Distribute byes evenly across first round
 * 3. Standard bracket progression (winner advances)
 */
export function generateSingleElimination(
  players: PlayerWithRating[],
  seedingOptions?: SeedingOptions
): BracketStructure {
  const seededPlayers = seedPlayers(players, seedingOptions);
  const playerCount = seededPlayers.length;

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
  const byeCount = bracketSize - playerCount;
  const totalRounds = Math.log2(bracketSize);

  const matches: BracketMatch[] = [];
  let matchCounter = 0;

  // Generate first round with bye placement
  const firstRoundMatchCount = bracketSize / 2;
  const firstRoundMatches: BracketMatch[] = [];

  // Distribute byes evenly (top and bottom of bracket)
  const byePositions = calculateByePositions(firstRoundMatchCount, byeCount);

  let playerIndex = 0;

  for (let position = 0; position < firstRoundMatchCount; position++) {
    const isBye = byePositions.has(position);

    const match: BracketMatch = {
      id: `match-${matchCounter++}`,
      round: 1,
      bracket: null,
      position,
      playerAId: seededPlayers[playerIndex++]?.id || null,
      playerBId: isBye ? null : seededPlayers[playerIndex++]?.id || null,
      state: isBye ? 'completed' : 'pending', // Byes are auto-completed
      winnerId: isBye ? seededPlayers[playerIndex - 1]?.id || null : null,
      isBye,
    };

    firstRoundMatches.push(match);
  }

  matches.push(...firstRoundMatches);

  // Generate subsequent rounds
  let previousRoundMatches = firstRoundMatches;

  for (let round = 2; round <= totalRounds; round++) {
    const roundMatchCount = Math.pow(2, totalRounds - round);
    const roundMatches: BracketMatch[] = [];

    for (let position = 0; position < roundMatchCount; position++) {
      const match: BracketMatch = {
        id: `match-${matchCounter++}`,
        round,
        bracket: null,
        position,
        playerAId: null, // Filled by winner of previous round
        playerBId: null,
        state: 'pending',
        winnerId: null,
        isBye: false,
      };

      // Link previous round matches to this match
      const prevMatch1 = previousRoundMatches[position * 2];
      const prevMatch2 = previousRoundMatches[position * 2 + 1];

      if (prevMatch1) prevMatch1.nextMatchId = match.id;
      if (prevMatch2) prevMatch2.nextMatchId = match.id;

      roundMatches.push(match);
    }

    matches.push(...roundMatches);
    previousRoundMatches = roundMatches;
  }

  return {
    matches,
    rounds: totalRounds,
    format: 'single_elimination',
    metadata: {
      totalPlayers: playerCount,
      byeCount,
      totalRounds,
    },
  };
}

/**
 * Calculate bye positions for even distribution
 * Byes are placed at top and bottom of bracket
 */
function calculateByePositions(matchCount: number, byeCount: number): Set<number> {
  const positions = new Set<number>();

  if (byeCount === 0) return positions;

  // Distribute byes evenly: alternate top and bottom
  for (let i = 0; i < byeCount; i++) {
    if (i % 2 === 0) {
      // Top of bracket
      positions.add(Math.floor(i / 2));
    } else {
      // Bottom of bracket
      positions.add(matchCount - 1 - Math.floor(i / 2));
    }
  }

  return positions;
}

// ============================================================================
// BRACKET GENERATION - DOUBLE ELIMINATION
// ============================================================================

/**
 * Generate double elimination bracket
 * Creates Winners bracket + Losers bracket
 *
 * Algorithm:
 * 1. Generate winners bracket (same as single elim)
 * 2. Generate losers bracket with crossovers
 * 3. Link losers from winners bracket to losers bracket
 * 4. Add grand finals (winners bracket champion vs losers bracket champion)
 */
export function generateDoubleElimination(
  players: PlayerWithRating[],
  seedingOptions?: SeedingOptions
): BracketStructure {
  const seededPlayers = seedPlayers(players, seedingOptions);
  const playerCount = seededPlayers.length;

  // Calculate bracket size
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
  const byeCount = bracketSize - playerCount;
  const winnersRounds = Math.log2(bracketSize);
  const losersRounds = (winnersRounds - 1) * 2; // Losers bracket is longer
  const totalRounds = winnersRounds + losersRounds + 1; // +1 for grand finals

  const matches: BracketMatch[] = [];
  const matchCounter = 0;

  // ========== WINNERS BRACKET ==========
  const winnersMatches: BracketMatch[][] = [];

  // Winners Round 1
  const firstRoundMatchCount = bracketSize / 2;
  const byePositions = calculateByePositions(firstRoundMatchCount, byeCount);
  const winnersRound1: BracketMatch[] = [];

  let playerIndex = 0;

  for (let position = 0; position < firstRoundMatchCount; position++) {
    const isBye = byePositions.has(position);

    const match: BracketMatch = {
      id: `w-r1-m${position}`,
      round: 1,
      bracket: 'winners',
      position,
      playerAId: seededPlayers[playerIndex++]?.id || null,
      playerBId: isBye ? null : seededPlayers[playerIndex++]?.id || null,
      state: isBye ? 'completed' : 'pending',
      winnerId: isBye ? seededPlayers[playerIndex - 1]?.id || null : null,
      isBye,
    };

    winnersRound1.push(match);
  }

  winnersMatches.push(winnersRound1);

  // Winners subsequent rounds
  for (let round = 2; round <= winnersRounds; round++) {
    const roundMatchCount = Math.pow(2, winnersRounds - round);
    const roundMatches: BracketMatch[] = [];

    for (let position = 0; position < roundMatchCount; position++) {
      const match: BracketMatch = {
        id: `w-r${round}-m${position}`,
        round,
        bracket: 'winners',
        position,
        playerAId: null,
        playerBId: null,
        state: 'pending',
        winnerId: null,
        isBye: false,
      };

      // Link previous winners round
      const prevRound = winnersMatches[round - 2];
      const prevMatch1 = prevRound[position * 2];
      const prevMatch2 = prevRound[position * 2 + 1];

      if (prevMatch1) prevMatch1.nextMatchId = match.id;
      if (prevMatch2) prevMatch2.nextMatchId = match.id;

      roundMatches.push(match);
    }

    winnersMatches.push(roundMatches);
  }

  // ========== LOSERS BRACKET ==========
  const losersMatches: BracketMatch[][] = [];

  // Losers Round 1: Losers from Winners Round 1
  const losersRound1MatchCount = firstRoundMatchCount / 2;
  const losersRound1: BracketMatch[] = [];

  for (let position = 0; position < losersRound1MatchCount; position++) {
    const match: BracketMatch = {
      id: `l-r1-m${position}`,
      round: 1,
      bracket: 'losers',
      position,
      playerAId: null,
      playerBId: null,
      state: 'pending',
      winnerId: null,
      isBye: false,
    };

    // Link losers from winners round 1
    const winnersMatch1 = winnersRound1[position * 2];
    const winnersMatch2 = winnersRound1[position * 2 + 1];

    if (winnersMatch1) winnersMatch1.loserNextMatchId = match.id;
    if (winnersMatch2) winnersMatch2.loserNextMatchId = match.id;

    losersRound1.push(match);
  }

  losersMatches.push(losersRound1);

  // Losers subsequent rounds (alternating: crossover from winners, then losers vs losers)
  let losersRoundNumber = 2;
  let winnersRoundForCrossover = 2;

  for (let i = 0; i < losersRounds - 1; i++) {
    const isLosersVsLosers = i % 2 === 0; // Even rounds: losers play each other
    const roundMatchCount = isLosersVsLosers
      ? losersMatches[losersMatches.length - 1].length / 2
      : losersMatches[losersMatches.length - 1].length;

    const roundMatches: BracketMatch[] = [];

    for (let position = 0; position < roundMatchCount; position++) {
      const match: BracketMatch = {
        id: `l-r${losersRoundNumber}-m${position}`,
        round: losersRoundNumber,
        bracket: 'losers',
        position,
        playerAId: null,
        playerBId: null,
        state: 'pending',
        winnerId: null,
        isBye: false,
      };

      if (isLosersVsLosers) {
        // Link from previous losers round
        const prevRound = losersMatches[losersMatches.length - 1];
        const prevMatch1 = prevRound[position * 2];
        const prevMatch2 = prevRound[position * 2 + 1];

        if (prevMatch1) prevMatch1.nextMatchId = match.id;
        if (prevMatch2) prevMatch2.nextMatchId = match.id;
      } else {
        // Crossover: losers from winners bracket
        if (winnersRoundForCrossover <= winnersMatches.length) {
          const winnersRound = winnersMatches[winnersRoundForCrossover - 1];
          const winnersMatch = winnersRound[position];

          if (winnersMatch) winnersMatch.loserNextMatchId = match.id;
        }
      }

      roundMatches.push(match);
    }

    losersMatches.push(roundMatches);
    losersRoundNumber++;

    if (!isLosersVsLosers) {
      winnersRoundForCrossover++;
    }
  }

  // ========== GRAND FINALS ==========
  const grandFinals: BracketMatch = {
    id: 'grand-finals',
    round: totalRounds,
    bracket: null,
    position: 0,
    playerAId: null, // Winner of winners bracket
    playerBId: null, // Winner of losers bracket
    state: 'pending',
    winnerId: null,
    isBye: false,
  };

  // Link winners bracket final
  const winnersFinal = winnersMatches[winnersMatches.length - 1][0];
  if (winnersFinal) winnersFinal.nextMatchId = grandFinals.id;

  // Link losers bracket final
  const losersFinal = losersMatches[losersMatches.length - 1][0];
  if (losersFinal) losersFinal.nextMatchId = grandFinals.id;

  // Assemble all matches
  matches.push(...winnersMatches.flat());
  matches.push(...losersMatches.flat());
  matches.push(grandFinals);

  return {
    matches,
    rounds: totalRounds,
    format: 'double_elimination',
    metadata: {
      totalPlayers: playerCount,
      byeCount,
      totalRounds,
    },
  };
}

// ============================================================================
// BRACKET GENERATION - ROUND ROBIN
// ============================================================================

/**
 * Generate round robin bracket
 * All participants play each other once
 *
 * Algorithm:
 * 1. Calculate total matches: n * (n - 1) / 2
 * 2. Generate all unique pairings
 * 3. Organize into rounds (balanced scheduling)
 */
export function generateRoundRobin(
  players: PlayerWithRating[],
  seedingOptions?: SeedingOptions
): BracketStructure {
  const seededPlayers = seedPlayers(players, seedingOptions);
  const playerCount = seededPlayers.length;

  if (playerCount < 2) {
    throw new Error('Round robin requires at least 2 players');
  }

  const matches: BracketMatch[] = [];
  let matchCounter = 0;

  // Round robin scheduling using circle method
  // If odd number of players, add a "bye" player
  const hasOddPlayers = playerCount % 2 === 1;
  const schedulePlayerCount = hasOddPlayers ? playerCount + 1 : playerCount;
  const totalRounds = schedulePlayerCount - 1;
  const matchesPerRound = schedulePlayerCount / 2;

  // Create player array (with bye if needed)
  const schedulePlayers: (PlayerWithRating | null)[] = [...seededPlayers];
  if (hasOddPlayers) {
    schedulePlayers.push(null); // Placeholder for bye
  }

  // Circle method for round robin
  for (let round = 0; round < totalRounds; round++) {
    for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
      let home: number;
      let away: number;

      if (matchIdx === 0) {
        // First position stays fixed
        home = 0;
        away = schedulePlayerCount - 1;
      } else {
        home = matchIdx;
        away = schedulePlayerCount - matchIdx - 1;
      }

      const playerA = schedulePlayers[home];
      const playerB = schedulePlayers[away];

      // Skip if either player is the bye placeholder
      if (!playerA || !playerB) continue;

      const match: BracketMatch = {
        id: `rr-r${round + 1}-m${matchCounter}`,
        round: round + 1,
        bracket: null,
        position: matchCounter,
        playerAId: playerA.id,
        playerBId: playerB.id,
        state: 'pending',
        winnerId: null,
        isBye: false,
      };

      matches.push(match);
      matchCounter++;
    }

    // Rotate players (keep first player fixed)
    if (schedulePlayers.length > 2) {
      const lastPlayer = schedulePlayers.pop();
      if (lastPlayer !== undefined) {
        schedulePlayers.splice(1, 0, lastPlayer);
      }
    }
  }

  const totalMatches = (playerCount * (playerCount - 1)) / 2;

  return {
    matches,
    rounds: totalRounds,
    format: 'round_robin',
    metadata: {
      totalPlayers: playerCount,
      byeCount: 0,
      totalRounds,
    },
  };
}

// ============================================================================
// BRACKET GENERATION - MODIFIED SINGLE ELIMINATION
// ============================================================================

/**
 * Generate modified single elimination bracket
 * Similar to single elim, but with rule variations
 *
 * Modifications:
 * - Players eliminated in early rounds may get a "second chance" match
 * - Consolation bracket for 3rd/4th place
 * - Custom rules can be applied
 */
export function generateModifiedSingleElimination(
  players: PlayerWithRating[],
  seedingOptions?: SeedingOptions,
  options?: {
    includeConsolation?: boolean; // Add 3rd/4th place match
    secondChanceRound?: number; // Round where losers get second chance
  }
): BracketStructure {
  // Start with standard single elimination
  const bracket = generateSingleElimination(players, seedingOptions);

  const includeConsolation = options?.includeConsolation ?? true;

  if (includeConsolation) {
    // Add consolation match (3rd/4th place)
    // Losers of semi-finals play for 3rd place
    const semiFinals = bracket.matches.filter(
      (m) => m.round === bracket.rounds - 1
    );

    if (semiFinals.length === 2) {
      const consolationMatch: BracketMatch = {
        id: 'consolation',
        round: bracket.rounds + 1,
        bracket: null,
        position: 0,
        playerAId: null,
        playerBId: null,
        state: 'pending',
        winnerId: null,
        isBye: false,
      };

      // Link losers from semi-finals
      semiFinals[0].loserNextMatchId = consolationMatch.id;
      semiFinals[1].loserNextMatchId = consolationMatch.id;

      bracket.matches.push(consolationMatch);
      bracket.rounds += 1;
    }
  }

  return {
    ...bracket,
    format: 'modified_single',
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate bracket structure
 * Ensures all matches are properly linked and no orphans exist
 */
export function validateBracket(bracket: BracketStructure): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check all matches have valid rounds
  for (const match of bracket.matches) {
    if (match.round < 1 || match.round > bracket.rounds) {
      errors.push(`Match ${match.id} has invalid round ${match.round}`);
    }
  }

  // Check match linkage (single/double elim only)
  if (
    bracket.format === 'single_elimination' ||
    bracket.format === 'double_elimination' ||
    bracket.format === 'modified_single'
  ) {
    for (const match of bracket.matches) {
      if (match.nextMatchId) {
        const nextMatch = bracket.matches.find((m) => m.id === match.nextMatchId);
        if (!nextMatch) {
          errors.push(`Match ${match.id} links to non-existent match ${match.nextMatchId}`);
        }
      }

      if (match.loserNextMatchId) {
        const loserMatch = bracket.matches.find((m) => m.id === match.loserNextMatchId);
        if (!loserMatch) {
          errors.push(
            `Match ${match.id} links loser to non-existent match ${match.loserNextMatchId}`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get matches by round
 */
export function getMatchesByRound(
  bracket: BracketStructure,
  round: number
): BracketMatch[] {
  return bracket.matches.filter((m) => m.round === round);
}

/**
 * Get ready matches (both players assigned, not yet started)
 */
export function getReadyMatches(matches: BracketMatch[]): BracketMatch[] {
  return matches.filter(
    (m) =>
      m.state === 'ready' &&
      m.playerAId !== null &&
      m.playerBId !== null &&
      !m.isBye
  );
}

/**
 * Calculate total rounds for a given player count and format
 */
export function calculateTotalRounds(
  playerCount: number,
  format: BracketStructure['format']
): number {
  switch (format) {
    case 'single_elimination':
    case 'modified_single':
      return Math.ceil(Math.log2(playerCount));

    case 'double_elimination': {
      const winnersRounds = Math.ceil(Math.log2(playerCount));
      const losersRounds = (winnersRounds - 1) * 2;
      return winnersRounds + losersRounds + 1; // +1 for grand finals
    }

    case 'round_robin':
      return playerCount % 2 === 0 ? playerCount - 1 : playerCount;

    default:
      return 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  seedRandom,
  seedBySkill,
  seedManual,
  extractRatingValue,
  calculateByePositions,
};
