/**
 * Player Profile Service
 * Sprint 10 Week 2 - Day 2: Services & Logic
 *
 * Comprehensive service for managing player profiles, statistics, and match history.
 * Multi-tenant architecture with privacy controls and performance optimization.
 *
 * @module player-profile-service
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  PlayerProfile,
  PlayerStatistics,
  CompletePlayerProfile,
  MatchHistoryWithDetails,
  HeadToHeadStats,
  LeaderboardEntry,
  LeaderboardType,
  LeaderboardResult,
  UpdateProfileRequest,
  PlayerProfileError,
  SearchPlayersRequest,
  SearchPlayersResponse,
  PlayerSearchResult,
  PrivacySettings,
  SocialLinks,
  PlayerAchievement,
  SkillLevel,
  MatchResult,
  MatchMetadata,
} from '../types';

const prisma = new PrismaClient();

// ============================================================================
// PLAYER PROFILE OPERATIONS
// ============================================================================

/**
 * Get complete player profile with statistics and achievements
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @param viewerId - Optional viewer ID for privacy checks
 * @returns Complete player profile
 * @throws PlayerProfileError if player not found or access denied
 */
export async function getPlayerProfile(
  playerId: string,
  tenantId: string,
  viewerId?: string
): Promise<CompletePlayerProfile> {
  try {
    // Get player profile
    const profile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!profile) {
      throw new PlayerProfileError('Player profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    // Check privacy settings
    const privacySettings = profile.privacySettings as PrivacySettings;
    const isOwner = viewerId === playerId;

    if (!isOwner && !privacySettings.profilePublic) {
      throw new PlayerProfileError('Profile is private', 'PROFILE_PRIVATE', 403);
    }

    // Get statistics
    const statistics = await getPlayerStatistics(playerId, tenantId);

    // Get achievements (if allowed)
    const achievements =
      isOwner || privacySettings.showAchievements
        ? await prisma.playerAchievement.findMany({
            where: {
              playerId,
              tenantId,
            },
            include: {
              achievement: true,
            },
            orderBy: {
              unlockedAt: 'desc',
            },
          })
        : [];

    // Get recent matches (if allowed)
    const recentMatches =
      isOwner || privacySettings.showHistory
        ? await getPlayerMatchHistory(playerId, tenantId, 10, 0)
        : [];

    // Get top rivalries
    const rivalries = isOwner || privacySettings.showHistory ? await getTopRivalries(playerId, tenantId, 5) : [];

    return {
      profile: profile as PlayerProfile,
      statistics,
      achievements: achievements as PlayerAchievement[],
      recentMatches,
      rivalries,
    };
  } catch (error) {
    if (error instanceof PlayerProfileError) {
      throw error;
    }
    console.error('[getPlayerProfile] Error:', error);
    throw new PlayerProfileError('Failed to get player profile', 'GET_PROFILE_ERROR');
  }
}

/**
 * Update player profile information
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param data - Profile update data
 * @returns Updated player profile
 */
export async function updatePlayerProfile(
  playerId: string,
  tenantId: string,
  data: UpdateProfileRequest
): Promise<PlayerProfile> {
  try {
    const profile = await prisma.playerProfile.upsert({
      where: {
        playerId,
      },
      update: {
        bio: data.bio,
        photoUrl: data.photoUrl,
        location: data.location,
        skillLevel: data.skillLevel,
        socialLinks: (data.socialLinks as SocialLinks) || null,
        updatedAt: new Date(),
      },
      create: {
        playerId,
        tenantId,
        bio: data.bio || null,
        photoUrl: data.photoUrl || null,
        location: data.location || null,
        skillLevel: data.skillLevel || 'BEGINNER',
        socialLinks: (data.socialLinks as SocialLinks) || null,
        privacySettings: {
          profilePublic: true,
          showStats: true,
          showHistory: true,
          showAchievements: true,
        },
        notificationPreferences: {
          email: true,
          sms: false,
          push: true,
          categories: {
            tournaments: true,
            matches: true,
            achievements: true,
            social: true,
          },
        },
      },
    });

    return profile as PlayerProfile;
  } catch (error) {
    console.error('[updatePlayerProfile] Error:', error);
    throw new PlayerProfileError('Failed to update player profile', 'UPDATE_PROFILE_ERROR');
  }
}

// ============================================================================
// PLAYER STATISTICS
// ============================================================================

/**
 * Get player statistics
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @returns Player statistics
 */
export async function getPlayerStatistics(playerId: string, tenantId: string): Promise<PlayerStatistics> {
  try {
    let statistics = await prisma.playerStatistics.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    // Create statistics record if it doesn't exist
    if (!statistics) {
      statistics = await prisma.playerStatistics.create({
        data: {
          playerId,
          tenantId,
        },
      });
    }

    return statistics as PlayerStatistics;
  } catch (error) {
    console.error('[getPlayerStatistics] Error:', error);
    throw new PlayerProfileError('Failed to get player statistics', 'GET_STATISTICS_ERROR');
  }
}

// ============================================================================
// MATCH HISTORY
// ============================================================================

/**
 * Get player match history with pagination
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param limit - Number of matches to return
 * @param offset - Pagination offset
 * @returns Array of match history with details
 */
export async function getPlayerMatchHistory(
  playerId: string,
  tenantId: string,
  limit: number = 20,
  offset: number = 0
): Promise<MatchHistoryWithDetails[]> {
  try {
    const matchHistory = await prisma.matchHistory.findMany({
      where: {
        playerId,
        tenantId,
      },
      orderBy: {
        matchDate: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Enrich with opponent and tournament details
    const enrichedHistory: MatchHistoryWithDetails[] = [];

    for (const match of matchHistory) {
      // Get opponent profile
      const opponentProfile = await prisma.playerProfile.findFirst({
        where: {
          playerId: match.opponentId,
          tenantId,
        },
      });

      // Get tournament details
      const tournament = await prisma.tournament.findUnique({
        where: {
          id: match.tournamentId,
        },
      });

      if (tournament) {
        enrichedHistory.push({
          ...match,
          opponent: {
            id: match.opponentId,
            name: opponentProfile?.playerId || 'Unknown',
            photoUrl: opponentProfile?.photoUrl || undefined,
            skillLevel: (opponentProfile?.skillLevel as SkillLevel) || 'BEGINNER',
          },
          tournament: {
            id: tournament.id,
            name: tournament.name,
            format: tournament.format,
            date: tournament.startDateTime,
          },
          result: match.result as MatchResult,
          metadata: match.metadata as MatchMetadata | null,
        });
      }
    }

    return enrichedHistory;
  } catch (error) {
    console.error('[getPlayerMatchHistory] Error:', error);
    throw new PlayerProfileError('Failed to get match history', 'GET_MATCH_HISTORY_ERROR');
  }
}

// ============================================================================
// HEAD-TO-HEAD RECORDS
// ============================================================================

/**
 * Get head-to-head record between two players
 *
 * @param player1Id - First player ID
 * @param player2Id - Second player ID
 * @param tenantId - Tenant ID
 * @returns Head-to-head statistics
 */
export async function getHeadToHeadRecord(
  player1Id: string,
  player2Id: string,
  tenantId: string
): Promise<HeadToHeadStats> {
  try {
    // Get all matches between these players
    const player1Matches = await prisma.matchHistory.findMany({
      where: {
        playerId: player1Id,
        opponentId: player2Id,
        tenantId,
      },
      orderBy: {
        matchDate: 'desc',
      },
      take: 10,
    });

    const player2Matches = await prisma.matchHistory.findMany({
      where: {
        playerId: player2Id,
        opponentId: player1Id,
        tenantId,
      },
      orderBy: {
        matchDate: 'desc',
      },
      take: 10,
    });

    const allMatches = [...player1Matches, ...player2Matches];

    // Calculate statistics
    const wins = player1Matches.filter((m) => m.result === 'WIN').length;
    const losses = player1Matches.filter((m) => m.result === 'LOSS').length;
    const draws = player1Matches.filter((m) => m.result === 'DRAW').length;
    const totalMatches = wins + losses + draws;

    const lastPlayed =
      allMatches.length > 0
        ? allMatches.reduce((latest, match) => (match.matchDate > latest ? match.matchDate : latest), allMatches[0].matchDate)
        : new Date();

    // Get recent matches with details
    const recentMatches = await getPlayerMatchHistory(player1Id, tenantId, 5, 0);
    const relevantMatches = recentMatches.filter((m) => m.opponentId === player2Id);

    return {
      totalMatches,
      wins,
      losses,
      draws,
      winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
      lastPlayed,
      recentMatches: relevantMatches,
    };
  } catch (error) {
    console.error('[getHeadToHeadRecord] Error:', error);
    throw new PlayerProfileError('Failed to get head-to-head record', 'GET_H2H_ERROR');
  }
}

/**
 * Get top rivalries for a player
 *
 * @param playerId - Player ID
 * @param tenantId - Tenant ID
 * @param limit - Number of rivalries to return
 * @returns Array of head-to-head statistics
 */
async function getTopRivalries(playerId: string, tenantId: string, limit: number = 5): Promise<HeadToHeadStats[]> {
  try {
    // Get all opponents
    const matches = await prisma.matchHistory.findMany({
      where: {
        playerId,
        tenantId,
      },
      select: {
        opponentId: true,
      },
    });

    // Count matches per opponent
    const opponentCounts = matches.reduce(
      (acc, match) => {
        acc[match.opponentId] = (acc[match.opponentId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get top opponents
    const topOpponents = Object.entries(opponentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([opponentId]) => opponentId);

    // Get head-to-head stats for each
    const rivalries: HeadToHeadStats[] = [];
    for (const opponentId of topOpponents) {
      const h2h = await getHeadToHeadRecord(playerId, opponentId, tenantId);
      rivalries.push(h2h);
    }

    return rivalries;
  } catch (error) {
    console.error('[getTopRivalries] Error:', error);
    return [];
  }
}

// ============================================================================
// LEADERBOARDS
// ============================================================================

/**
 * Get player leaderboard
 *
 * @param tenantId - Tenant ID
 * @param type - Leaderboard type
 * @param limit - Number of entries to return
 * @returns Leaderboard result
 */
export async function getPlayerLeaderboard(
  tenantId: string,
  type: LeaderboardType,
  limit: number = 50
): Promise<LeaderboardResult> {
  try {
    let entries: LeaderboardEntry[] = [];

    switch (type) {
      case 'winRate':
        entries = await getWinRateLeaderboard(tenantId, limit);
        break;
      case 'tournaments':
        entries = await getTournamentsLeaderboard(tenantId, limit);
        break;
      case 'prizes':
        entries = await getPrizesLeaderboard(tenantId, limit);
        break;
      case 'achievements':
        entries = await getAchievementsLeaderboard(tenantId, limit);
        break;
      default:
        throw new PlayerProfileError('Invalid leaderboard type', 'INVALID_LEADERBOARD_TYPE', 400);
    }

    const totalPlayers = await prisma.playerStatistics.count({
      where: { tenantId },
    });

    return {
      type,
      entries,
      updatedAt: new Date(),
      totalPlayers,
    };
  } catch (error) {
    console.error('[getPlayerLeaderboard] Error:', error);
    throw new PlayerProfileError('Failed to get leaderboard', 'GET_LEADERBOARD_ERROR');
  }
}

async function getWinRateLeaderboard(tenantId: string, limit: number): Promise<LeaderboardEntry[]> {
  const stats = await prisma.playerStatistics.findMany({
    where: {
      tenantId,
      totalMatches: {
        gte: 10, // Minimum 10 matches to qualify
      },
    },
    orderBy: {
      winRate: 'desc',
    },
    take: limit,
    include: {
      // Note: Would need to join with player profile here
    },
  });

  return stats.map((stat, index) => ({
    rank: index + 1,
    playerId: stat.playerId,
    playerName: stat.playerId, // Would get from profile
    photoUrl: null,
    skillLevel: 'INTERMEDIATE' as SkillLevel,
    value: stat.winRate,
    formattedValue: `${stat.winRate.toFixed(1)}%`,
  }));
}

async function getTournamentsLeaderboard(tenantId: string, limit: number): Promise<LeaderboardEntry[]> {
  const stats = await prisma.playerStatistics.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      totalTournaments: 'desc',
    },
    take: limit,
  });

  return stats.map((stat, index) => ({
    rank: index + 1,
    playerId: stat.playerId,
    playerName: stat.playerId,
    photoUrl: null,
    skillLevel: 'INTERMEDIATE' as SkillLevel,
    value: stat.totalTournaments,
    formattedValue: stat.totalTournaments.toString(),
  }));
}

async function getPrizesLeaderboard(tenantId: string, limit: number): Promise<LeaderboardEntry[]> {
  const stats = await prisma.playerStatistics.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      totalPrizeWon: 'desc',
    },
    take: limit,
  });

  return stats.map((stat, index) => ({
    rank: index + 1,
    playerId: stat.playerId,
    playerName: stat.playerId,
    photoUrl: null,
    skillLevel: 'INTERMEDIATE' as SkillLevel,
    value: stat.totalPrizeWon,
    formattedValue: `$${stat.totalPrizeWon.toFixed(2)}`,
  }));
}

async function getAchievementsLeaderboard(tenantId: string, limit: number): Promise<LeaderboardEntry[]> {
  // Get achievement counts per player
  const achievementCounts = await prisma.playerAchievement.groupBy({
    by: ['playerId'],
    where: {
      tenantId,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  return achievementCounts.map((count, index) => ({
    rank: index + 1,
    playerId: count.playerId,
    playerName: count.playerId,
    photoUrl: null,
    skillLevel: 'INTERMEDIATE' as SkillLevel,
    value: count._count.id,
    formattedValue: `${count._count.id} achievements`,
  }));
}

// ============================================================================
// PLAYER SEARCH
// ============================================================================

/**
 * Search players with filters
 *
 * @param tenantId - Tenant ID
 * @param request - Search request parameters
 * @returns Search results with pagination
 */
export async function searchPlayers(tenantId: string, request: SearchPlayersRequest): Promise<SearchPlayersResponse> {
  try {
    const { query, skillLevel, location, minWinRate, sortBy = 'name', sortOrder = 'asc', limit = 20, offset = 0 } = request;

    // Build where clause
    const where: Prisma.PlayerProfileWhereInput = {
      tenantId,
      privacySettings: {
        path: ['profilePublic'],
        equals: true,
      },
    };

    if (skillLevel && skillLevel.length > 0) {
      where.skillLevel = {
        in: skillLevel,
      };
    }

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive',
      };
    }

    // Get profiles
    const profiles = await prisma.playerProfile.findMany({
      where,
      take: limit,
      skip: offset,
    });

    // Enrich with statistics
    const players: PlayerSearchResult[] = [];

    for (const profile of profiles) {
      const stats = await prisma.playerStatistics.findFirst({
        where: {
          playerId: profile.playerId,
          tenantId,
        },
      });

      if (stats) {
        const winRate = parseFloat(stats.winRate.toString());

        // Apply win rate filter
        if (minWinRate && winRate < minWinRate) {
          continue;
        }

        players.push({
          id: profile.playerId,
          name: profile.playerId, // Would get from user/player
          photoUrl: profile.photoUrl,
          skillLevel: profile.skillLevel as SkillLevel,
          location: profile.location,
          winRate,
          totalTournaments: stats.totalTournaments,
          lastPlayed: stats.lastPlayedAt,
        });
      }
    }

    // Sort results
    players.sort((a, b) => {
      const aVal = a[sortBy as keyof PlayerSearchResult];
      const bVal = b[sortBy as keyof PlayerSearchResult];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = await prisma.playerProfile.count({ where });

    return {
      players,
      total,
      hasMore: offset + players.length < total,
    };
  } catch (error) {
    console.error('[searchPlayers] Error:', error);
    throw new PlayerProfileError('Failed to search players', 'SEARCH_PLAYERS_ERROR');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Profile operations
  updatePlayerProfile,
  getPlayerStatistics,
  getPlayerMatchHistory,
  getHeadToHeadRecord,
  getPlayerLeaderboard,
  searchPlayers,
};
