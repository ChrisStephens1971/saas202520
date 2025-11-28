/**
 * Double Elimination Bracket Generator
 *
 * Generates a double elimination tournament bracket with:
 * - Winners Bracket: Standard single elimination
 * - Losers Bracket: Receives losers from winners bracket
 * - Grand Finals: Winners bracket champion vs Losers bracket champion
 * - Bracket Reset: If losers bracket champion wins grand finals
 */

import type { Player, BracketResult, BracketMatch } from '../types';

/**
 * Calculate next power of 2
 */
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Generate seeding pairs for standard tournament seeding
 * Example: 8 players -> [[1,8], [4,5], [2,7], [3,6]]
 */
function generateSeedingPairs(bracketSize: number): number[][] {
  let seeds = [1, 2];

  while (seeds.length < bracketSize) {
    const newSeeds: number[] = [];
    const nextSize = seeds.length * 2 + 1;

    for (const seed of seeds) {
      newSeeds.push(seed);
      newSeeds.push(nextSize - seed);
    }

    seeds = newSeeds;
  }

  // Convert to pairs
  const pairs: number[][] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    pairs.push([seeds[i], seeds[i + 1]]);
  }

  return pairs;
}

/**
 * Generate Double Elimination Bracket
 *
 * Creates a tournament with winners bracket, losers bracket, and grand finals.
 * Includes proper loser routing between brackets.
 *
 * @param players - Array of players (must have seeds assigned)
 * @param options - Bracket generation options
 * @returns Complete double elimination bracket structure
 */
export function generateDoubleEliminationBracket(
  players: Player[],
  options?: {
    allowBracketReset?: boolean; // If true, grand finals can have a reset match
  }
): BracketResult {
  // Validate
  if (players.length < 2) {
    throw new Error('Cannot generate bracket with less than 2 players');
  }
  if (players.length > 128) {
    throw new Error('Maximum bracket size is 128 players');
  }

  const playerCount = players.length;
  const bracketSize = nextPowerOf2(playerCount);
  const seedingPairs = generateSeedingPairs(bracketSize);

  // Create player map for quick lookup by seed
  const playerMap = new Map<number, Player>();
  for (const player of players) {
    if (player.seed !== undefined) {
      playerMap.set(player.seed, player);
    }
  }

  const matches: BracketMatch[] = [];

  // Calculate number of rounds
  const winnersRounds = Math.log2(bracketSize);
  const losersRounds = (winnersRounds - 1) * 2; // Losers bracket has 2x-1 rounds
  const totalRounds = winnersRounds + losersRounds + 1; // +1 for grand finals

  // ========================================
  // WINNERS BRACKET
  // ========================================

  // Winners Bracket Round 1
  let matchPosition = 0;
  for (const [seedA, seedB] of seedingPairs) {
    const playerA = playerMap.get(seedA) ?? null;
    const playerB = playerMap.get(seedB) ?? null;

    // Determine if this is a bye match
    const isByeMatch = !playerA || !playerB;

    const match: BracketMatch = {
      id: `W1-${matchPosition}`,
      round: 1,
      position: matchPosition,
      bracket: 'winners',
      playerAId: playerA?.id ?? null,
      playerBId: playerB?.id ?? null,
      state: isByeMatch ? 'completed' : 'ready', // Byes are auto-completed
      feedsInto: {
        round: 2,
        position: Math.floor(matchPosition / 2),
        slot: matchPosition % 2 === 0 ? 'A' : 'B',
      },
      feedsLoserInto: {
        round: winnersRounds + 1, // Losers Round 1
        position: matchPosition,
        slot: 'A', // Losers from W1 go directly into positions
      },
    };

    matches.push(match);
    matchPosition++;
  }

  // Winners Bracket Rounds 2 through Finals
  for (let round = 2; round <= winnersRounds; round++) {
    const matchesInRound = Math.pow(2, winnersRounds - round);

    for (let pos = 0; pos < matchesInRound; pos++) {
      const match: BracketMatch = {
        id: `W${round}-${pos}`,
        round,
        position: pos,
        bracket: 'winners',
        playerAId: null,
        playerBId: null,
        state: 'pending',
      };

      // Feed to next winners round (if not finals)
      if (round < winnersRounds) {
        match.feedsInto = {
          round: round + 1,
          position: Math.floor(pos / 2),
          slot: pos % 2 === 0 ? 'A' : 'B',
        };
      } else {
        // Winners finals feeds to grand finals
        match.feedsInto = {
          round: totalRounds,
          position: 0,
          slot: 'A',
        };
      }

      // Losers from winners bracket feed into losers bracket
      // Complex routing: W2 -> L2, W3 -> L4, W4 -> L6, etc.
      if (round === 2) {
        match.feedsLoserInto = {
          round: winnersRounds + 2,
          position: pos,
          slot: 'B',
        };
      } else if (round > 2 && round < winnersRounds) {
        const losersRound = winnersRounds + (round - 2) * 2 + 2;
        match.feedsLoserInto = {
          round: losersRound,
          position: pos,
          slot: 'B',
        };
      } else if (round === winnersRounds) {
        // Winners finals loser goes to losers finals
        match.feedsLoserInto = {
          round: totalRounds - 1,
          position: 0,
          slot: 'B',
        };
      }

      matches.push(match);
    }
  }

  // ========================================
  // LOSERS BRACKET
  // ========================================

  // Losers Bracket Round 1 (receives losers from Winners R1)
  const losersR1Matches = bracketSize / 2;
  for (let pos = 0; pos < losersR1Matches; pos++) {
    const match: BracketMatch = {
      id: `L1-${pos}`,
      round: winnersRounds + 1,
      position: pos,
      bracket: 'losers',
      playerAId: null, // Will be populated from winners bracket losers
      playerBId: null,
      state: 'pending',
      feedsInto: {
        round: winnersRounds + 2,
        position: Math.floor(pos / 2),
        slot: 'A',
      },
    };

    matches.push(match);
  }

  // Losers Bracket Rounds 2 through Losers Finals
  // Losers bracket alternates between:
  // - Odd rounds: receive new losers from winners + play
  // - Even rounds: advancement rounds (no new losers)

  for (let losersRoundNum = 2; losersRoundNum <= losersRounds; losersRoundNum++) {
    const actualRound = winnersRounds + losersRoundNum;
    const matchesInRound = Math.pow(2, Math.ceil(winnersRounds - 1 - losersRoundNum / 2));

    for (let pos = 0; pos < matchesInRound; pos++) {
      const match: BracketMatch = {
        id: `L${losersRoundNum}-${pos}`,
        round: actualRound,
        position: pos,
        bracket: 'losers',
        playerAId: null,
        playerBId: null,
        state: 'pending',
      };

      // Feed to next losers round (if not losers finals)
      if (losersRoundNum < losersRounds) {
        match.feedsInto = {
          round: actualRound + 1,
          position: Math.floor(pos / 2),
          slot: pos % 2 === 0 ? 'A' : 'B',
        };
      } else {
        // Losers finals feeds to grand finals
        match.feedsInto = {
          round: totalRounds,
          position: 0,
          slot: 'B',
        };
      }

      matches.push(match);
    }
  }

  // ========================================
  // GRAND FINALS
  // ========================================

  const grandFinals: BracketMatch = {
    id: 'GF',
    round: totalRounds,
    position: 0,
    bracket: 'grand_finals',
    playerAId: null, // Winners bracket champion
    playerBId: null, // Losers bracket champion
    state: 'pending',
  };

  // If bracket reset is allowed and losers champion wins, they play again
  if (options?.allowBracketReset) {
    grandFinals.feedsLoserInto = {
      round: totalRounds + 1,
      position: 0,
      slot: 'B', // Winners champion gets second chance
    };
  }

  matches.push(grandFinals);

  // ========================================
  // BRACKET RESET (Optional)
  // ========================================

  if (options?.allowBracketReset) {
    const resetMatch: BracketMatch = {
      id: 'GF-RESET',
      round: totalRounds + 1,
      position: 0,
      bracket: 'grand_finals',
      playerAId: null, // Will be populated if GF loser (winners champion)
      playerBId: null, // Winner of GF (from losers bracket)
      state: 'pending',
    };

    matches.push(resetMatch);
  }

  return {
    matches,
    totalRounds: options?.allowBracketReset ? totalRounds + 1 : totalRounds,
    format: 'double_elimination',
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
 * Get all matches in a specific bracket (winners/losers/grand_finals)
 */
export function getMatchesInBracket(
  bracket: BracketResult,
  bracketType: 'winners' | 'losers' | 'grand_finals'
): BracketMatch[] {
  return bracket.matches.filter((m) => m.bracket === bracketType);
}

/**
 * Advance winner to next match
 *
 * @param bracket - Tournament bracket
 * @param matchId - Match ID to complete
 * @param winnerId - Winner player ID
 * @param loserId - Loser player ID
 */
export function advanceWinner(
  bracket: BracketResult,
  matchId: string,
  winnerId: string,
  loserId: string
): void {
  const match = bracket.matches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }

  // Mark match as completed
  match.state = 'completed';

  // Advance winner to feedsInto
  if (match.feedsInto) {
    const nextMatch = getMatch(bracket, match.feedsInto.round, match.feedsInto.position);
    if (nextMatch) {
      if (match.feedsInto.slot === 'A') {
        nextMatch.playerAId = winnerId;
      } else {
        nextMatch.playerBId = winnerId;
      }

      // Update state if both players are present
      if (nextMatch.playerAId && nextMatch.playerBId && nextMatch.state === 'pending') {
        nextMatch.state = 'ready';
      }
    }
  }

  // Advance loser to feedsLoserInto (if in winners bracket)
  if (match.feedsLoserInto) {
    const loserMatch = getMatch(bracket, match.feedsLoserInto.round, match.feedsLoserInto.position);
    if (loserMatch) {
      if (match.feedsLoserInto.slot === 'A') {
        loserMatch.playerAId = loserId;
      } else {
        loserMatch.playerBId = loserId;
      }

      // Update state if both players are present
      if (loserMatch.playerAId && loserMatch.playerBId && loserMatch.state === 'pending') {
        loserMatch.state = 'ready';
      }
    }
  }
}
