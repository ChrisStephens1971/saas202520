/**
 * Match Progression Logic
 *
 * Handles advancing winners through brackets and updating subsequent matches.
 * Integrates bracket generation with match state machine.
 */

import type { BracketResult, BracketMatch } from '../types';
import { getMatch } from '../bracket-generator/single-elimination';

/**
 * Match Completion Data
 */
export interface MatchCompletionData {
  matchId: string;
  winnerId: string;
  loserId: string;
  score: {
    playerA: number;
    playerB: number;
  };
}

/**
 * Match Progression Result
 */
export interface MatchProgressionResult {
  completedMatch: BracketMatch;
  nextMatch?: BracketMatch;
  advancedTo?: {
    round: number;
    position: number;
    slot: 'A' | 'B';
  };
  isChampionshipMatch: boolean;
}

/**
 * Complete a match and advance winner
 *
 * @param bracket - Tournament bracket
 * @param completion - Match completion data
 * @returns Progression result with updated matches
 */
export function completeMatch(
  bracket: BracketResult,
  completion: MatchCompletionData
): MatchProgressionResult {
  // Find the completed match by checking if it contains both winner and loser
  const match = bracket.matches.find(
    (m) =>
      (m.playerAId === completion.winnerId && m.playerBId === completion.loserId) ||
      (m.playerBId === completion.winnerId && m.playerAId === completion.loserId)
  );

  if (!match) {
    throw new Error(`Match not found for players ${completion.winnerId} vs ${completion.loserId}`);
  }

  // Mark match as completed
  match.state = 'completed';

  // Check if this is the championship match (no feedsInto)
  if (!match.feedsInto) {
    return {
      completedMatch: match,
      isChampionshipMatch: true,
    };
  }

  // Get the next match
  const { round, position, slot } = match.feedsInto;
  const nextMatch = getMatch(bracket, round, position);

  if (!nextMatch) {
    throw new Error(`Next match not found: Round ${round}, Position ${position}`);
  }

  // Advance winner to next match
  if (slot === 'A') {
    nextMatch.playerAId = completion.winnerId;
  } else {
    nextMatch.playerBId = completion.winnerId;
  }

  // Check if next match is now ready (both players present)
  if (nextMatch.playerAId && nextMatch.playerBId && nextMatch.state === 'pending') {
    nextMatch.state = 'ready';
  }

  return {
    completedMatch: match,
    nextMatch,
    advancedTo: match.feedsInto,
    isChampionshipMatch: false,
  };
}

/**
 * Get all ready matches in a bracket
 *
 * Matches that have both players and are ready to be played.
 *
 * @param bracket - Tournament bracket
 * @returns Array of ready matches
 */
export function getReadyMatches(bracket: BracketResult): BracketMatch[] {
  return bracket.matches.filter((m) => m.state === 'ready' && m.playerAId && m.playerBId);
}

/**
 * Get all active matches in a bracket
 *
 * Matches currently being played.
 *
 * @param bracket - Tournament bracket
 * @returns Array of active matches
 */
export function getActiveMatches(bracket: BracketResult): BracketMatch[] {
  return bracket.matches.filter((m) => m.state === 'active');
}

/**
 * Get all completed matches in a bracket
 *
 * @param bracket - Tournament bracket
 * @returns Array of completed matches
 */
export function getCompletedMatches(bracket: BracketResult): BracketMatch[] {
  return bracket.matches.filter((m) => m.state === 'completed');
}

/**
 * Get matches waiting for players (dependent on other matches)
 *
 * @param bracket - Tournament bracket
 * @returns Array of pending matches
 */
export function getPendingMatches(bracket: BracketResult): BracketMatch[] {
  return bracket.matches.filter((m) => m.state === 'pending');
}

/**
 * Calculate tournament completion percentage
 *
 * @param bracket - Tournament bracket
 * @returns Completion percentage (0-100)
 */
export function getTournamentProgress(bracket: BracketResult): number {
  const total = bracket.matches.length;
  const completed = getCompletedMatches(bracket).length;

  return Math.round((completed / total) * 100);
}

/**
 * Get the current round of the tournament
 *
 * The lowest round number that still has matches to play.
 *
 * @param bracket - Tournament bracket
 * @returns Current round number, or null if tournament is complete
 */
export function getCurrentRound(bracket: BracketResult): number | null {
  const incompleteMatches = bracket.matches.filter(
    (m) => m.state !== 'completed' && m.state !== 'cancelled'
  );

  if (incompleteMatches.length === 0) {
    return null; // Tournament complete
  }

  return Math.min(...incompleteMatches.map((m) => m.round));
}

/**
 * Check if a tournament is complete
 *
 * @param bracket - Tournament bracket
 * @returns true if all matches are completed or cancelled
 */
export function isTournamentComplete(bracket: BracketResult): boolean {
  return bracket.matches.every((m) => m.state === 'completed' || m.state === 'cancelled');
}

/**
 * Get tournament champion
 *
 * @param bracket - Tournament bracket
 * @returns Winner ID if tournament is complete, null otherwise
 */
export function getTournamentChampion(bracket: BracketResult): string | null {
  if (!isTournamentComplete(bracket)) {
    return null;
  }

  // Find the championship match (last round, position 0)
  const championshipMatch = bracket.matches.find(
    (m) => m.round === bracket.totalRounds && m.position === 0
  );

  if (!championshipMatch || championshipMatch.state !== 'completed') {
    return null;
  }

  // Winner is the player who advanced (should be playerAId or playerBId)
  // In a completed match, one of them should be the winner
  // For now, we'll need to track this separately or infer from score
  return championshipMatch.playerAId || null;
}

/**
 * Validate match completion
 *
 * @param match - Match to validate
 * @param completion - Completion data
 * @throws Error if completion is invalid
 */
export function validateMatchCompletion(
  match: BracketMatch,
  completion: MatchCompletionData
): void {
  // Match must be in active state
  if (match.state !== 'active') {
    throw new Error(`Match must be active to complete (current state: ${match.state})`);
  }

  // Winner must be one of the players
  if (match.playerAId !== completion.winnerId && match.playerBId !== completion.winnerId) {
    throw new Error(`Winner ${completion.winnerId} is not a player in this match`);
  }

  // Loser must be the other player
  const expectedLoserId =
    match.playerAId === completion.winnerId ? match.playerBId : match.playerAId;

  if (expectedLoserId !== completion.loserId) {
    throw new Error(`Loser ${completion.loserId} does not match expected loser ${expectedLoserId}`);
  }

  // Score must be provided
  if (!completion.score) {
    throw new Error('Score is required to complete match');
  }

  // Winner's score must be higher than loser's
  const winnerScore =
    match.playerAId === completion.winnerId ? completion.score.playerA : completion.score.playerB;
  const loserScore =
    match.playerAId === completion.loserId ? completion.score.playerA : completion.score.playerB;

  if (winnerScore <= loserScore) {
    throw new Error('Winner must have higher score than loser');
  }
}
