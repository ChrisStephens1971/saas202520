/**
 * Finals Cutoff Logic - Chip Format Tournament System
 * Sprint 4 - CHIP-003
 *
 * Ranking, tiebreaker resolution, and finals bracket generation
 * for chip format tournaments.
 */

import { prisma } from '@/lib/prisma';
import type { Player } from '@prisma/client';
import type { ChipConfig, ChipStanding } from '@/lib/chip-tracker';
import { getChipStandings } from '@/lib/chip-tracker';

// ============================================================================
// TYPES
// ============================================================================

export interface TiebreakerResult {
  playerId: string;
  reason: string; // 'head_to_head_win' | 'higher_rating' | 'random'
}

export interface FinalsResult {
  finalists: ChipStanding[];
  eliminated: ChipStanding[];
  tiebreakers: TiebreakerResult[];
}

// ============================================================================
// TIEBREAKER LOGIC
// ============================================================================

/**
 * Resolve tiebreaker between two players
 */
async function resolveTiebreaker(
  playerA: Player,
  playerB: Player,
  method: 'head_to_head' | 'rating' | 'random',
  tournamentId: string
): Promise<TiebreakerResult> {
  switch (method) {
    case 'head_to_head':
      return resolveHeadToHead(playerA, playerB, tournamentId);
    case 'rating':
      return resolveByRating(playerA, playerB);
    case 'random':
      return resolveRandomly(playerA, playerB);
    default:
      throw new Error(`Unknown tiebreaker method: ${method}`);
  }
}

/**
 * Head-to-head tiebreaker
 * Winner is player who won when they played each other
 */
async function resolveHeadToHead(
  playerA: Player,
  playerB: Player,
  tournamentId: string
): Promise<TiebreakerResult> {
  // Find matches where these two players faced each other
  const headToHeadMatches = await prisma.match.findMany({
    where: {
      tournamentId,
      state: 'completed',
      OR: [
        {
          AND: [
            { playerAId: playerA.id },
            { playerBId: playerB.id },
          ],
        },
        {
          AND: [
            { playerAId: playerB.id },
            { playerBId: playerA.id },
          ],
        },
      ],
    },
    select: {
      winnerId: true,
    },
  });

  if (headToHeadMatches.length === 0) {
    // They didn't play each other, fall back to rating
    return resolveByRating(playerA, playerB);
  }

  // Count wins for each player
  const playerAWins = headToHeadMatches.filter(
    (match) => match.winnerId === playerA.id
  ).length;
  const playerBWins = headToHeadMatches.filter(
    (match) => match.winnerId === playerB.id
  ).length;

  if (playerAWins > playerBWins) {
    return {
      playerId: playerA.id,
      reason: 'head_to_head_win',
    };
  } else if (playerBWins > playerAWins) {
    return {
      playerId: playerB.id,
      reason: 'head_to_head_win',
    };
  }

  // Head-to-head is tied, fall back to rating
  return resolveByRating(playerA, playerB);
}

/**
 * Rating tiebreaker
 * Winner is player with higher rating
 */
function resolveByRating(playerA: Player, playerB: Player): TiebreakerResult {
  const ratingA = playerA.rating as { system: string; value: number | string } | null;
  const ratingB = playerB.rating as { system: string; value: number | string } | null;

  const valueA = typeof ratingA?.value === 'number' ? ratingA.value : 0;
  const valueB = typeof ratingB?.value === 'number' ? ratingB.value : 0;

  if (valueA > valueB) {
    return { playerId: playerA.id, reason: 'higher_rating' };
  } else if (valueB > valueA) {
    return { playerId: playerB.id, reason: 'higher_rating' };
  }

  // Ratings are equal or both missing, use random
  return resolveRandomly(playerA, playerB);
}

/**
 * Random tiebreaker
 * Winner is chosen randomly (fair coin flip)
 */
function resolveRandomly(playerA: Player, playerB: Player): TiebreakerResult {
  const winner = Math.random() < 0.5 ? playerA : playerB;
  return {
    playerId: winner.id,
    reason: 'random',
  };
}

// ============================================================================
// FINALS CUTOFF
// ============================================================================

/**
 * Apply finals cutoff
 * Selects top N players to advance to finals bracket
 */
export async function applyFinalsCutoff(
  tournamentId: string,
  chipConfig: ChipConfig
): Promise<FinalsResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  if (tournament.qualificationLocked) {
    throw new Error('Finals cutoff already applied');
  }

  // Get chip standings
  const standings = await getChipStandings(tournamentId);

  if (standings.length < chipConfig.finalsCount) {
    throw new Error(
      `Not enough players for finals. Need ${chipConfig.finalsCount}, have ${standings.length}`
    );
  }

  // Separate into finalists and eliminated
  const initialFinalists = standings.slice(0, chipConfig.finalsCount);
  const initialEliminated = standings.slice(chipConfig.finalsCount);

  // Check for ties at the cutoff line
  const cutoffChips = initialFinalists[initialFinalists.length - 1].chipCount;
  const tiedPlayers = standings.filter((s) => s.chipCount === cutoffChips);

  const tiebreakers: TiebreakerResult[] = [];
  let finalists = initialFinalists;

  // If there's a tie at the cutoff, resolve it
  if (tiedPlayers.length > 1) {
    // Get full player data for tied players
    const tiedPlayerIds = tiedPlayers.map((p) => p.playerId);
    const tiedPlayerRecords = await prisma.player.findMany({
      where: { id: { in: tiedPlayerIds } },
    });

    // Resolve tiebreakers for all tied players
    const sortedTied = await sortByTiebreaker(
      tiedPlayerRecords,
      chipConfig.tiebreaker,
      tournamentId
    );

    // Record tiebreaker results
    tiebreakers.push(
      ...sortedTied.map((result, index) => ({
        playerId: result.playerId,
        reason: `${result.reason} (rank ${index + 1} among tied)`,
      }))
    );

    // Rebuild finalists list with tiebreaker-resolved players
    const nonTiedFinalists = standings.filter(
      (s) => s.chipCount > cutoffChips && s.rank <= chipConfig.finalsCount
    );

    const resolvedTiedFinalists = sortedTied
      .slice(0, chipConfig.finalsCount - nonTiedFinalists.length)
      .map((result) => tiedPlayers.find((p) => p.playerId === result.playerId)!);

    finalists = [...nonTiedFinalists, ...resolvedTiedFinalists];
  }

  const eliminated = standings.filter(
    (s) => !finalists.find((f) => f.playerId === s.playerId)
  );

  // Lock qualification phase
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { qualificationLocked: true },
  });

  // Update player statuses
  await Promise.all([
    prisma.player.updateMany({
      where: {
        id: { in: finalists.map((f) => f.playerId) },
      },
      data: { status: 'active' },
    }),
    prisma.player.updateMany({
      where: {
        id: { in: eliminated.map((e) => e.playerId) },
      },
      data: { status: 'eliminated' },
    }),
  ]);

  return {
    finalists,
    eliminated,
    tiebreakers,
  };
}

/**
 * Sort tied players using tiebreaker rules
 */
async function sortByTiebreaker(
  players: Player[],
  method: 'head_to_head' | 'rating' | 'random',
  tournamentId: string
): Promise<TiebreakerResult[]> {
  if (players.length <= 1) {
    return players.map((p) => ({ playerId: p.id, reason: 'no_tie' }));
  }

  const results: TiebreakerResult[] = [];
  const remaining = [...players];

  // Resolve pairwise comparisons
  while (remaining.length > 1) {
    const playerA = remaining[0];
    const playerB = remaining[1];

    const result = await resolveTiebreaker(playerA, playerB, method, tournamentId);

    results.push(result);
    remaining.shift();

    if (result.playerId === playerB.id) {
      // PlayerB won, swap them for next comparison
      remaining.unshift(playerA);
      remaining[0] = playerB;
    }
  }

  // Add last remaining player
  if (remaining.length === 1) {
    results.push({
      playerId: remaining[0].id,
      reason: 'last_remaining',
    });
  }

  return results;
}

// ============================================================================
// FINALS BRACKET GENERATION
// ============================================================================

/**
 * Generate finals bracket from finalists
 * Seeding based on chip count (highest chips = #1 seed)
 */
export async function generateFinalsBracket(
  tournamentId: string,
  finalists: ChipStanding[],
  bracketFormat: 'single_elimination' | 'double_elimination'
) {
  // Seed finalists by chip count
  const seededFinalists = finalists.map((finalist, index) => ({
    ...finalist,
    seed: index + 1,
  }));

  // Update player seeds
  await Promise.all(
    seededFinalists.map((finalist) =>
      prisma.player.update({
        where: { id: finalist.playerId },
        data: { seed: finalist.seed },
      })
    )
  );

  // TODO: Call bracket generation logic
  // This would integrate with existing bracket generator
  // For now, just return the seeded finalists

  return {
    format: bracketFormat,
    finalists: seededFinalists,
    message: 'Finals bracket ready to generate with existing bracket system',
  };
}

/**
 * Unlock qualification (for testing or restart)
 */
export async function unlockQualification(tournamentId: string): Promise<void> {
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { qualificationLocked: false },
  });

  // Reset player statuses
  await prisma.player.updateMany({
    where: {
      tournamentId,
      status: { in: ['active', 'eliminated'] },
    },
    data: { status: 'checked_in' },
  });
}
