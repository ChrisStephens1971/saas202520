/**
 * Achievement Unlock Engine
 * Sprint 10 Week 2 - Day 2: Services & Logic
 *
 * Intelligent achievement tracking and unlock system.
 * Checks player progress against all 20 achievement definitions and automatically unlocks.
 *
 * @module achievement-engine
 */

import { PrismaClient } from '@prisma/client';
import {
  AchievementEvent,
  PlayerAchievement,
  AchievementUnlockResult,
  AchievementProgress,
  AchievementError,
  AchievementDefinition,
  AchievementMetadata,
  AchievementRequirements,
} from '../types';

const prisma = new PrismaClient();

// ============================================================================
// ACHIEVEMENT CHECKING & UNLOCKING
// ============================================================================

/**
 * Check and unlock achievements after an event
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param event - Achievement trigger event
 * @returns Array of unlocked achievements
 */
export async function checkAchievements(
  playerId: string,
  tenantId: string,
  event: AchievementEvent
): Promise<AchievementUnlockResult[]> {
  try {
    const results: AchievementUnlockResult[] = [];

    // Get all active achievement definitions
    const definitions = await prisma.achievementDefinition.findMany({
      where: {
        isActive: true,
      },
    });

    // Get already unlocked achievements
    const unlockedAchievements = await prisma.playerAchievement.findMany({
      where: {
        playerId,
        tenantId,
      },
      select: {
        achievementId: true,
      },
    });

    const unlockedIds = new Set(unlockedAchievements.map((a) => a.achievementId));

    // Check each achievement
    for (const definition of definitions) {
      // Skip if already unlocked
      if (unlockedIds.has(definition.id)) {
        continue;
      }

      // Check if requirements are met
      const meetsRequirements = await checkAchievementRequirements(playerId, tenantId, definition as AchievementDefinition, event);

      if (meetsRequirements) {
        // Unlock the achievement
        const result = await unlockAchievement(playerId, tenantId, definition.code, {
          tournamentId: event.data.tournamentId,
          matchId: event.data.matchId,
          context: event.type,
        });

        results.push(result);
      }
    }

    return results;
  } catch (error) {
    console.error('[checkAchievements] Error:', error);
    throw new AchievementError('Failed to check achievements', 'CHECK_ACHIEVEMENTS_ERROR');
  }
}

/**
 * Manually unlock an achievement
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param achievementCode - Achievement code
 * @param metadata - Additional unlock metadata
 * @returns Unlock result
 */
export async function unlockAchievement(
  playerId: string,
  tenantId: string,
  achievementCode: string,
  metadata?: AchievementMetadata
): Promise<AchievementUnlockResult> {
  try {
    // Get achievement definition
    const definition = await prisma.achievementDefinition.findUnique({
      where: {
        code: achievementCode,
      },
    });

    if (!definition) {
      return {
        unlocked: false,
        message: `Achievement ${achievementCode} not found`,
      };
    }

    // Check if already unlocked
    const existing = await prisma.playerAchievement.findFirst({
      where: {
        playerId,
        tenantId,
        achievementId: definition.id,
      },
    });

    if (existing) {
      return {
        unlocked: false,
        achievement: existing as PlayerAchievement,
        message: 'Achievement already unlocked',
      };
    }

    // Create unlock record
    const achievement = await prisma.playerAchievement.create({
      data: {
        playerId,
        tenantId,
        achievementId: definition.id,
        progress: 100,
        metadata: (metadata as AchievementMetadata) || null,
      },
      include: {
        achievement: true,
      },
    });

    console.log(`[Achievement Unlocked] ${playerId}: ${definition.name} (${achievementCode})`);

    return {
      unlocked: true,
      achievement: achievement as PlayerAchievement,
      message: `Unlocked: ${definition.name}`,
    };
  } catch (error) {
    console.error('[unlockAchievement] Error:', error);
    throw new AchievementError('Failed to unlock achievement', 'UNLOCK_ACHIEVEMENT_ERROR');
  }
}

/**
 * Get achievement progress for a player
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param achievementCode - Achievement code
 * @returns Achievement progress
 */
export async function getAchievementProgress(
  playerId: string,
  tenantId: string,
  achievementCode: string
): Promise<AchievementProgress | null> {
  try {
    const definition = await prisma.achievementDefinition.findUnique({
      where: {
        code: achievementCode,
      },
    });

    if (!definition) {
      return null;
    }

    // Check if unlocked
    const unlocked = await prisma.playerAchievement.findFirst({
      where: {
        playerId,
        tenantId,
        achievementId: definition.id,
      },
    });

    if (unlocked) {
      return {
        achievementCode,
        progress: 100,
        isUnlocked: true,
        requirement: definition.requirements as AchievementRequirements,
        currentValue: definition.requirements.value || 0,
        targetValue: definition.requirements.value || 0,
      };
    }

    // Calculate progress
    const progress = await calculateAchievementProgress(playerId, tenantId, definition.requirements as AchievementRequirements);

    return {
      achievementCode,
      progress: progress.percentage,
      isUnlocked: false,
      requirement: definition.requirements as AchievementRequirements,
      currentValue: progress.current,
      targetValue: progress.target,
    };
  } catch (error) {
    console.error('[getAchievementProgress] Error:', error);
    return null;
  }
}

/**
 * Calculate progress towards an achievement
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param requirements - Achievement requirements
 * @returns Progress calculation
 */
export async function calculateAchievementProgress(
  playerId: string,
  tenantId: string,
  requirements: AchievementRequirements
): Promise<{ current: number; target: number; percentage: number }> {
  const stats = await prisma.playerStatistics.findFirst({
    where: {
      playerId,
      tenantId,
    },
  });

  if (!stats) {
    return { current: 0, target: requirements.value || 1, percentage: 0 };
  }

  let current = 0;
  let target = requirements.value || 1;

  switch (requirements.type) {
    case 'tournament_count':
      current = stats.totalTournaments;
      break;

    case 'tournament_wins':
      current = await prisma.matchHistory.count({
        where: {
          playerId,
          tenantId,
          result: 'WIN',
        },
      });
      break;

    case 'unique_opponents': {
      const uniqueOpponents = await prisma.matchHistory.findMany({
        where: {
          playerId,
          tenantId,
        },
        select: {
          opponentId: true,
        },
        distinct: ['opponentId'],
      });
      current = uniqueOpponents.length;
      break;
    }

    case 'unique_venues': {
      const uniqueVenues = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT t.venue_id) as count
        FROM match_history mh
        JOIN tournaments t ON mh.tournament_id = t.id
        WHERE mh.player_id = ${playerId} AND mh.tenant_id = ${tenantId}
      `;
      current = Number(uniqueVenues[0]?.count || 0);
      break;
    }

    case 'format_wins':
      if (requirements.same_format) {
        // Count wins by format
        const formatWins = await prisma.matchHistory.groupBy({
          by: ['format'],
          where: {
            playerId,
            tenantId,
            result: 'WIN',
          },
          _count: {
            id: true,
          },
        });
        current = formatWins.length > 0 ? Math.max(...formatWins.map((f) => ((f._count as any).id))) : 0;
      }
      break;

    case 'format_win_rate':
      if (requirements.same_format && requirements.min_matches) {
        const formatStats = await prisma.matchHistory.groupBy({
          by: ['format'],
          where: {
            playerId,
            tenantId,
          },
          _count: {
            id: true,
          },
        });

        for (const formatStat of formatStats) {
          if (((formatStat._count as any).id) >= requirements.min_matches) {
            const wins = await prisma.matchHistory.count({
              where: {
                playerId,
                tenantId,
                format: (formatStat as any).format,
                result: 'WIN',
              },
            });
            const winRate = (wins / ((formatStat._count as any).id)) * 100;
            current = Math.max(current, winRate);
          }
        }
        target = requirements.win_rate;
      }
      break;

    case 'unique_formats': {
      const uniqueFormats = await prisma.matchHistory.findMany({
        where: {
          playerId,
          tenantId,
        },
        select: {
          format: true,
        },
        distinct: ['format'],
      });
      current = uniqueFormats.length;
      break;
    }

    default:
      current = 0;
  }

  const percentage = Math.min(100, Math.floor((current / target) * 100));

  return { current, target, percentage };
}

// ============================================================================
// REQUIREMENT CHECKING
// ============================================================================

/**
 * Check if a player meets achievement requirements
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param definition - Achievement definition
 * @param event - Triggering event
 * @returns True if requirements are met
 */
async function checkAchievementRequirements(
  playerId: string,
  tenantId: string,
  definition: AchievementDefinition,
  event: AchievementEvent
): Promise<boolean> {
  const requirements = definition.requirements;

  switch (requirements.type) {
    case 'tournament_count':
      return checkTournamentCount(playerId, tenantId, requirements.value);

    case 'tournament_wins':
      return checkTournamentWins(playerId, tenantId, requirements.value);

    case 'tournament_perfect':
      return checkPerfectTournament(playerId, tenantId, event);

    case 'loser_bracket_win':
      return checkLoserBracketWin(event);

    case 'all_matches_won':
      return checkAllMatchesWon(playerId, event);

    case 'lowest_seed_win':
      return checkLowestSeedWin(event);

    case 'early_registration':
      return checkEarlyRegistration(event, requirements.hours_before);

    case 'unique_opponents':
      return checkUniqueOpponents(playerId, tenantId, requirements.value);

    case 'repeated_opponent':
      return checkRepeatedOpponent(playerId, tenantId, requirements.value);

    case 'unique_venues':
      return checkUniqueVenues(playerId, tenantId, requirements.value);

    case 'tournament_duration':
      return checkTournamentDuration(event, requirements.hours);

    case 'exact_placement':
      return checkExactPlacement(event, requirements.placement);

    case 'format_wins':
      return checkFormatWins(playerId, tenantId, requirements);

    case 'format_win_rate':
      return checkFormatWinRate(playerId, tenantId, requirements);

    case 'unique_formats':
      return checkUniqueFormats(playerId, tenantId, requirements.value);

    default:
      console.warn(`[checkAchievementRequirements] Unknown requirement type: ${requirements.type}`);
      return false;
  }
}

// ============================================================================
// SPECIFIC REQUIREMENT CHECKS
// ============================================================================

async function checkTournamentCount(playerId: string, tenantId: string, required: number): Promise<boolean> {
  const stats = await prisma.playerStatistics.findFirst({
    where: { playerId, tenantId },
  });
  return (stats?.totalTournaments || 0) >= required;
}

async function checkTournamentWins(playerId: string, tenantId: string, required: number): Promise<boolean> {
  const wins = await prisma.matchHistory.count({
    where: {
      playerId,
      tenantId,
      result: 'WIN',
    },
  });
  return wins >= required;
}

async function checkPerfectTournament(playerId: string, tenantId: string, event: AchievementEvent): Promise<boolean> {
  if (!event.data.tournamentId) return false;

  const matches = await prisma.matchHistory.findMany({
    where: {
      playerId,
      tenantId,
      tournamentId: event.data.tournamentId,
    },
  });

  return matches.length > 0 && matches.every((m) => m.result === 'WIN');
}

function checkLoserBracketWin(event: AchievementEvent): boolean {
  return event.data.bracket === 'losers' && event.data.result === 'WIN';
}

async function checkAllMatchesWon(playerId: string, event: AchievementEvent): Promise<boolean> {
  if (!event.data.tournamentId) return false;

  const matches = await prisma.matchHistory.findMany({
    where: {
      playerId: playerId,
      tournamentId: event.data.tournamentId,
    },
  });

  return matches.length > 0 && matches.every((m) => m.result === 'WIN');
}

function checkLowestSeedWin(event: AchievementEvent): boolean {
  return event.data.seed !== undefined && event.data.finish === 1;
}

function checkEarlyRegistration(event: AchievementEvent, hoursBefore: number): boolean {
  if (!event.data.registrationTime || !event.data.tournamentStartTime) return false;

  const hoursDiff = (event.data.tournamentStartTime.getTime() - event.data.registrationTime.getTime()) / (1000 * 60 * 60);

  return hoursDiff >= hoursBefore;
}

async function checkUniqueOpponents(playerId: string, tenantId: string, required: number): Promise<boolean> {
  const uniqueOpponents = await prisma.matchHistory.findMany({
    where: {
      playerId,
      tenantId,
    },
    select: {
      opponentId: true,
    },
    distinct: ['opponentId'],
  });

  return uniqueOpponents.length >= required;
}

async function checkRepeatedOpponent(playerId: string, tenantId: string, required: number): Promise<boolean> {
  const opponentCounts = await prisma.matchHistory.groupBy({
    by: ['opponentId'],
    where: {
      playerId,
      tenantId,
    },
    _count: {
      id: true,
    },
  });

  return opponentCounts.some((count) => count._count as any).id >= required);
}

async function checkUniqueVenues(playerId: string, tenantId: string, required: number): Promise<boolean> {
  const uniqueVenues = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT t.venue_id) as count
    FROM match_history mh
    JOIN tournaments t ON mh.tournament_id = t.id
    WHERE mh.player_id = ${playerId} AND mh.tenant_id = ${tenantId}
  `;

  return Number(uniqueVenues[0]?.count || 0) >= required;
}

function checkTournamentDuration(event: AchievementEvent, requiredHours: number): boolean {
  return (event.data.tournamentDuration || 0) >= requiredHours;
}

function checkExactPlacement(event: AchievementEvent, placement: number): boolean {
  return event.data.finish === placement;
}

async function checkFormatWins(playerId: string, tenantId: string, requirements: AchievementRequirements): Promise<boolean> {
  const formatWins = await prisma.matchHistory.groupBy({
    by: ['format'],
    where: {
      playerId,
      tenantId,
      result: 'WIN',
    },
    _count: {
      id: true,
    },
  });

  return formatWins.some((fw) => ((fw._count as any).id) >= (requirements.value || 0));
}

async function checkFormatWinRate(playerId: string, tenantId: string, requirements: AchievementRequirements): Promise<boolean> {
  const formatStats = await prisma.matchHistory.groupBy({
    by: ['format'],
    where: {
      playerId,
      tenantId,
    },
    _count: {
      id: true,
    },
  });

  for (const formatStat of formatStats) {
    if (((formatStat._count as any).id) >= requirements.min_matches) {
      const wins = await prisma.matchHistory.count({
        where: {
          playerId,
          tenantId,
          format: (formatStat as any).format,
          result: 'WIN',
        },
      });
      const winRate = (wins / ((formatStat._count as any).id)) * 100;
      if (winRate >= requirements.win_rate) {
        return true;
      }
    }
  }

  return false;
}

async function checkUniqueFormats(playerId: string, tenantId: string, required: number): Promise<boolean> {
  const uniqueFormats = await prisma.matchHistory.findMany({
    where: {
      playerId,
      tenantId,
    },
    select: {
      format: true,
    },
    distinct: ['format'],
  });

  return uniqueFormats.length >= required;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Check achievements for multiple players
 * Useful for hourly background checks
 *
 * @param tenantId - Tenant ID
 * @param playerIds - Array of player IDs
 * @returns Map of player ID to unlocked achievements
 */
export async function batchCheckAchievements(
  tenantId: string,
  playerIds: string[]
): Promise<Map<string, AchievementUnlockResult[]>> {
  const results = new Map<string, AchievementUnlockResult[]>();

  for (const playerId of playerIds) {
    try {
      const unlocked = await checkAchievements(playerId, tenantId, {
        type: 'PROFILE_UPDATE',
        playerId,
        tenantId,
        data: {},
      });

      if (unlocked.length > 0) {
        results.set(playerId, unlocked);
      }
    } catch (error) {
      console.error(`[batchCheckAchievements] Error for player ${playerId}:`, error);
    }
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================
// Functions are already exported above with 'export async function ...'
