/**
 * Single Elimination Bracket Generator
 *
 * Generates single elimination tournament brackets with:
 * - Deterministic seeding
 * - Automatic bye placement for non-power-of-2 player counts
 * - Proper match progression links
 * - Support for 4-128 players
 */

import type { Player, BracketMatch, BracketResult } from '../types';

/**
 * Calculate the next power of 2 greater than or equal to n
 */
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Calculate number of rounds needed for bracket
 */
function calculateRounds(bracketSize: number): number {
  return Math.log2(bracketSize);
}

/**
 * Standard bracket seeding pairs for single elimination
 *
 * For 8-player bracket: [[1,8], [4,5], [2,7], [3,6]]
 * For 16-player: [[1,16], [8,9], [4,13], [5,12], [2,15], [7,10], [3,14], [6,11]]
 *
 * Algorithm: Iteratively build the correct seeding order
 * Reference: https://en.wikipedia.org/wiki/Seed_(sports)#Seeding_in_single-elimination_tournaments
 */
function generateSeedingPairs(bracketSize: number): number[][] {
  // Start with just seeds 1 and 2
  let seeds = [1, 2];

  // Iteratively expand to fill the bracket
  // Each iteration doubles the bracket size
  while (seeds.length < bracketSize) {
    const newSeeds: number[] = [];
    const nextSize = seeds.length * 2 + 1;

    // For each seed, pair it with its "complement"
    // Complement of X in bracket of size N is (N - X + 1)
    for (const seed of seeds) {
      newSeeds.push(seed);
      newSeeds.push(nextSize - seed);
    }

    seeds = newSeeds;
  }

  // Convert linear seed order to pairs
  const pairs: number[][] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    pairs.push([seeds[i], seeds[i + 1]]);
  }

  return pairs;
}

/**
 * Assign players to seeding positions
 *
 * Players are already sorted by seed (1 = highest seed)
 * Returns map of seed position -> player
 */
function assignPlayersToSeeds(players: Player[]): Map<number, Player> {
  const seedMap = new Map<number, Player>();

  // Sort players by seed (lower seed number = higher priority)
  const sortedPlayers = [...players].sort((a, b) => {
    const seedA = a.seed ?? Infinity;
    const seedB = b.seed ?? Infinity;
    return seedA - seedB;
  });

  // Assign players to seed positions (1-indexed)
  sortedPlayers.forEach((player, index) => {
    seedMap.set(index + 1, player);
  });

  return seedMap;
}

/**
 * Generate Single Elimination Bracket
 *
 * Algorithm:
 * 1. Calculate bracket size (next power of 2)
 * 2. Generate seeding pairs
 * 3. Create first round matches with byes
 * 4. Create remaining rounds with proper progression links
 *
 * @param players - List of players (should have seed assigned)
 * @returns Bracket with matches and progression links
 */
export function generateSingleEliminationBracket(players: Player[]): BracketResult {
  if (players.length < 2) {
    throw new Error('Cannot generate bracket with less than 2 players');
  }

  if (players.length > 128) {
    throw new Error('Maximum bracket size is 128 players');
  }

  const playerCount = players.length;
  const bracketSize = nextPowerOf2(playerCount);
  const totalRounds = calculateRounds(bracketSize);
  // byeCount calculated for future use: bracketSize - playerCount

  // Assign players to seed positions
  const seedMap = assignPlayersToSeeds(players);

  // Generate seeding pairs for bracket
  const seedingPairs = generateSeedingPairs(bracketSize);

  const matches: BracketMatch[] = [];

  // Create Round 1 matches
  seedingPairs.forEach((pair, pairIndex) => {
    const [seedA, seedB] = pair;
    const playerA = seedMap.get(seedA);
    const playerB = seedMap.get(seedB);

    // Determine match state based on whether players are present
    let state: 'pending' | 'ready' | 'completed' = 'pending';
    // winnerId for future use

    if (playerA && playerB) {
      // Both players present - ready to play
      state = 'ready';
    } else if (playerA && !playerB) {
      // Player A gets bye (auto-advances)
      state = 'completed';
      // winnerId = playerA.id;
    } else if (!playerA && playerB) {
      // Player B gets bye (auto-advances)
      state = 'completed';
      // winnerId = playerB.id;
    }
    // If neither player present, stays pending (shouldn't happen with proper seeding)

    const match: BracketMatch = {
      round: 1,
      position: pairIndex,
      playerAId: playerA?.id,
      playerBId: playerB?.id,
      state,
    };

    // Only add feedsInto if there are more rounds (not championship match)
    if (totalRounds > 1) {
      const nextRoundPosition = Math.floor(pairIndex / 2);
      const nextRoundSlot = pairIndex % 2 === 0 ? 'A' : 'B';

      match.feedsInto = {
        round: 2,
        position: nextRoundPosition,
        slot: nextRoundSlot,
      };
    }

    matches.push(match);
  });

  // Create remaining rounds (empty matches that will be filled as tournament progresses)
  // Only create additional rounds if there are more than 1 round total
  if (totalRounds > 1) {
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);

      for (let position = 0; position < matchesInRound; position++) {
        const match: BracketMatch = {
          round,
          position,
          state: 'pending',
        };

        // Add feedsInto link for all except championship match
        if (round < totalRounds) {
          match.feedsInto = {
            round: round + 1,
            position: Math.floor(position / 2),
            slot: position % 2 === 0 ? 'A' : 'B',
          };
        }

        matches.push(match);
      }
    }
  }

  return {
    matches,
    totalRounds,
    format: 'single_elimination',
    playerCount,
  };
}

/**
 * Get match by round and position
 */
export function getMatch(
  bracket: BracketResult,
  round: number,
  position: number
): BracketMatch | undefined {
  return bracket.matches.find((m) => m.round === round && m.position === position);
}

/**
 * Get all matches in a specific round
 */
export function getMatchesInRound(bracket: BracketResult, round: number): BracketMatch[] {
  return bracket.matches.filter((m) => m.round === round);
}

/**
 * Advance winner to next match
 *
 * Updates the next match with the winner's player ID
 */
export function advanceWinner(
  bracket: BracketResult,
  completedMatch: BracketMatch,
  winnerId: string
): void {
  if (!completedMatch.feedsInto) {
    // Championship match - no next match
    return;
  }

  const { round, position, slot } = completedMatch.feedsInto;
  const nextMatch = getMatch(bracket, round, position);

  if (!nextMatch) {
    throw new Error(`Next match not found: Round ${round}, Position ${position}`);
  }

  // Update next match with winner
  if (slot === 'A') {
    nextMatch.playerAId = winnerId;
  } else {
    nextMatch.playerBId = winnerId;
  }

  // Update next match state if both players are now present
  if (nextMatch.playerAId && nextMatch.playerBId) {
    nextMatch.state = 'ready';
  }
}
