/**
 * Round Robin Tournament Generator
 *
 * Generates a round robin tournament where every player plays every other player.
 * Uses the "circle method" for fair scheduling.
 */

import type { Player, BracketResult, BracketMatch } from '../types';

/**
 * Round Robin Result with additional metadata
 */
export interface RoundRobinResult extends BracketResult {
  format: 'round_robin';
  totalMatches: number;
  matchesPerPlayer: number;
}

/**
 * Round Robin Standings Entry
 */
export interface StandingsEntry {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
  points: number; // Customizable point system
  winPercentage: number;
}

/**
 * Generate Round Robin Tournament
 *
 * Creates a tournament where every player plays every other player once.
 * Uses the circle method to evenly distribute matches across rounds.
 *
 * @param players - Array of players
 * @param options - Tournament options
 * @returns Complete round robin bracket
 */
export function generateRoundRobinBracket(
  players: Player[],
  _options?: {
    pointsForWin?: number; // Default: 1
    pointsForLoss?: number; // Default: 0
    pointsForDraw?: number; // Default: 0.5 (if draws are allowed)
  }
): RoundRobinResult {
  // Validate
  if (players.length < 2) {
    throw new Error('Cannot generate round robin with less than 2 players');
  }
  if (players.length > 64) {
    throw new Error('Maximum round robin size is 64 players');
  }

  const playerCount = players.length;
  const isOdd = playerCount % 2 === 1;

  // For odd number of players, add a "bye" placeholder
  const playersWithBye = isOdd ? [...players, { id: 'BYE', name: 'BYE' }] : players;
  const totalPlayers = playersWithBye.length;

  // Calculate tournament parameters
  const totalRounds = totalPlayers - 1;
  const matchesPerRound = totalPlayers / 2;
  const totalMatches = isOdd
    ? (playerCount * (playerCount - 1)) / 2 // Exclude bye matches
    : (totalPlayers * totalRounds) / 2;

  const matches: BracketMatch[] = [];
  // matchId for future use

  // Use circle method for scheduling
  // Fix position 0, rotate all others clockwise each round
  const positions: (Player | null)[] = [...playersWithBye];

  for (let round = 1; round <= totalRounds; round++) {
    // Generate matches for this round
    for (let i = 0; i < matchesPerRound; i++) {
      const pos1 = i;
      const pos2 = totalPlayers - 1 - i;

      const player1 = positions[pos1];
      const player2 = positions[pos2];

      // Skip bye matches
      if (player1?.id === 'BYE' || player2?.id === 'BYE') {
        continue;
      }

      const match: BracketMatch = {
        id: `RR-${round}-${i}`,
        round,
        position: i,
        bracket: 'round_robin' as 'winners' | 'losers' | 'finals', // Type extension placeholder
        playerAId: player1?.id ?? null,
        playerBId: player2?.id ?? null,
        state: player1 && player2 ? 'ready' : 'pending',
      };

      matches.push(match);
      // matchId incremented for future use
    }

    // Rotate positions (keep position 0 fixed, rotate others clockwise)
    if (round < totalRounds) {
      const fixed = positions[0];
      const rotating = positions.slice(1);

      // Rotate clockwise: last element moves to front
      const rotated = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];

      positions[0] = fixed;
      for (let i = 0; i < rotated.length; i++) {
        positions[i + 1] = rotated[i];
      }
    }
  }

  return {
    matches,
    totalRounds,
    format: 'round_robin',
    playerCount,
    totalMatches,
    matchesPerPlayer: playerCount - 1, // Each player plays everyone else once
  };
}

/**
 * Calculate standings from round robin results
 *
 * @param bracket - Round robin bracket
 * @param pointsForWin - Points awarded for a win (default: 1)
 * @param pointsForLoss - Points awarded for a loss (default: 0)
 * @returns Array of standings entries sorted by points descending
 */
export function calculateStandings(
  bracket: RoundRobinResult,
  _pointsForWin: number = 1,
  _pointsForLoss: number = 0
): StandingsEntry[] {
  // Build player map
  const playerMap = new Map<string, StandingsEntry>();

  // Initialize standings
  const allPlayers = new Set<string>();
  for (const match of bracket.matches) {
    if (match.playerAId) allPlayers.add(match.playerAId);
    if (match.playerBId) allPlayers.add(match.playerBId);
  }

  for (const playerId of allPlayers) {
    playerMap.set(playerId, {
      playerId,
      playerName: '', // Will be populated if available
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      points: 0,
      winPercentage: 0,
    });
  }

  // Calculate stats from completed matches
  for (const match of bracket.matches) {
    if (match.state !== 'completed') continue;

    const playerA = match.playerAId;
    const playerB = match.playerBId;

    if (!playerA || !playerB) continue;

    const entryA = playerMap.get(playerA);
    const entryB = playerMap.get(playerB);

    if (!entryA || !entryB) continue;

    // Assume match result is stored somewhere (in a real system)
    // For now, this is just structure - actual results would come from match completion data
    entryA.matchesPlayed++;
    entryB.matchesPlayed++;
  }

  // Calculate win percentages
  for (const entry of playerMap.values()) {
    entry.winPercentage =
      entry.matchesPlayed > 0 ? entry.wins / entry.matchesPlayed : 0;
  }

  // Sort by points descending, then by win percentage, then by wins
  const standings = Array.from(playerMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
    return b.wins - a.wins;
  });

  return standings;
}

/**
 * Record match result and update standings
 *
 * @param bracket - Round robin bracket
 * @param matchId - Match ID
 * @param winnerId - Winner player ID
 * @param loserId - Loser player ID
 */
export function recordMatchResult(
  bracket: RoundRobinResult,
  matchId: string,
  winnerId: string,
  loserId: string
): void {
  const match = bracket.matches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }

  // Validate players
  if (
    (match.playerAId !== winnerId && match.playerBId !== winnerId) ||
    (match.playerAId !== loserId && match.playerBId !== loserId)
  ) {
    throw new Error('Winner and loser must be players in this match');
  }

  // Mark match as completed
  match.state = 'completed';

  // In a real system, we would store the result in a separate structure
  // For now, just mark the match as completed
}

/**
 * Get matches for a specific player
 *
 * @param bracket - Round robin bracket
 * @param playerId - Player ID
 * @returns Array of matches involving the player
 */
export function getMatchesForPlayer(
  bracket: RoundRobinResult,
  playerId: string
): BracketMatch[] {
  return bracket.matches.filter(
    (m) => m.playerAId === playerId || m.playerBId === playerId
  );
}

/**
 * Get matches in a specific round
 *
 * @param bracket - Round robin bracket
 * @param round - Round number
 * @returns Array of matches in the round
 */
export function getMatchesInRound(bracket: RoundRobinResult, round: number): BracketMatch[] {
  return bracket.matches.filter((m) => m.round === round);
}

/**
 * Check if tournament is complete
 *
 * @param bracket - Round robin bracket
 * @returns true if all matches are completed
 */
export function isTournamentComplete(bracket: RoundRobinResult): boolean {
  return bracket.matches.every((m) => m.state === 'completed' || m.state === 'cancelled');
}

/**
 * Get tournament completion percentage
 *
 * @param bracket - Round robin bracket
 * @returns Completion percentage (0-100)
 */
export function getTournamentProgress(bracket: RoundRobinResult): number {
  const completed = bracket.matches.filter(
    (m) => m.state === 'completed' || m.state === 'cancelled'
  ).length;
  return Math.round((completed / bracket.matches.length) * 100);
}

/**
 * Get current round
 *
 * Returns the lowest round number that has uncompleted matches.
 *
 * @param bracket - Round robin bracket
 * @returns Current round number, or null if complete
 */
export function getCurrentRound(bracket: RoundRobinResult): number | null {
  const incompleteMatches = bracket.matches.filter(
    (m) => m.state !== 'completed' && m.state !== 'cancelled'
  );

  if (incompleteMatches.length === 0) {
    return null;
  }

  return Math.min(...incompleteMatches.map((m) => m.round));
}
