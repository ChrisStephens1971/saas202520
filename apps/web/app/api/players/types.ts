/**
 * API Types for Player Endpoints
 * Sprint 10 Week 2 - Player Data Retrieval API
 *
 * Type definitions for request/response objects used in player API endpoints
 */

import {
  SkillLevel,
  MatchResult,
  PlayerProfile,
  PlayerStatistics,
  PlayerAchievement,
  MatchHistoryWithDetails,
  HeadToHeadStats,
  SocialLinks,
} from '@/lib/player-profiles/types';

// ============================================================================
// SEARCH ENDPOINT TYPES
// ============================================================================

export interface SearchPlayersRequest {
  query?: string;
  skillLevel?: SkillLevel[];
  location?: string;
  minWinRate?: number;
  sortBy?: 'name' | 'winRate' | 'tournaments' | 'lastPlayed';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PlayerSearchResultDTO {
  id: string;
  name: string;
  photoUrl: string | null;
  skillLevel: SkillLevel;
  location: string | null;
  winRate: number;
  totalTournaments: number;
  lastPlayed: string | null;
}

export interface SearchPlayersResponse {
  players: PlayerSearchResultDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// STATISTICS ENDPOINT TYPES
// ============================================================================

export interface PlayerStatisticsResponse {
  playerId: string;
  statistics: {
    tournaments: {
      total: number;
      rank: number;
    };
    matches: {
      total: number;
      wins: number;
      losses: number;
      winRate: number;
      rank: number;
    };
    streaks: {
      current: number;
      longest: number;
    };
    performance: {
      averageFinish: number | null;
      favoriteFormat: string | null;
    };
    prizes: {
      totalWon: number;
      rank: number;
    };
    activity: {
      lastPlayed: string | null;
    };
  };
  metadata: {
    lastUpdated: string;
    recalculated: boolean;
  };
}

// ============================================================================
// MATCH HISTORY ENDPOINT TYPES
// ============================================================================

export interface GetMatchesQuery {
  limit?: number;
  offset?: number;
  status?: 'completed' | 'active' | 'all';
  tournamentId?: string;
}

export interface MatchOpponentDTO {
  id: string;
  name: string;
  photoUrl?: string;
  skillLevel?: SkillLevel;
}

export interface MatchTournamentDTO {
  id: string;
  name: string;
  format: string;
  date: string;
}

export interface MatchMetadataDTO {
  round?: number;
  bracket?: string;
  tableNumber?: string;
  duration: number | null;
}

export interface MatchHistoryDTO {
  id: string;
  matchId: string;
  result: MatchResult;
  score: {
    player: number;
    opponent: number;
  };
  opponent: MatchOpponentDTO;
  tournament: MatchTournamentDTO;
  metadata: MatchMetadataDTO;
  playedAt: string;
}

export interface MatchHistoryResponse {
  playerId: string;
  matches: MatchHistoryDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  error: APIError;
}

// ============================================================================
// VALIDATION ERROR TYPES
// ============================================================================

export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  details: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

// ============================================================================
// PLAYER PROFILE ENDPOINT TYPES (Sprint 10 Week 2 - CRUD Operations)
// ============================================================================

/**
 * Response for GET /api/players/[id]
 * Returns complete player profile with statistics, achievements, and match history
 */
export interface GetPlayerProfileResponse {
  success: true;
  data: {
    profile: PlayerProfile;
    statistics: {
      id: string;
      playerId: string;
      tenantId: string;
      totalTournaments: number;
      totalMatches: number;
      totalWins: number;
      totalLosses: number;
      winRate: number; // Converted from Decimal
      currentStreak: number;
      longestStreak: number;
      averageFinish: number | null; // Converted from Decimal
      favoriteFormat: string | null;
      totalPrizeWon: number; // Converted from Decimal
      lastPlayedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
    achievements: Array<{
      id: string;
      playerId: string;
      tenantId: string;
      achievementId: string;
      unlockedAt: Date;
      progress: number;
      metadata: unknown;
      createdAt: Date;
      achievement: {
        id: string;
        code: string;
        name: string;
        description: string;
        category: string;
        tier: string;
        requirements: unknown;
        points: number;
        iconUrl: string | null;
        badgeUrl: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
    }>;
    recentMatches: MatchHistoryWithDetails[];
    rivalries: HeadToHeadStats[];
  };
}

/**
 * Request body for PUT /api/players/profile
 * All fields are optional - only provided fields will be updated
 */
export interface UpdateProfileRequest {
  /** Player bio/description (max 500 characters) */
  bio?: string;
  /** URL to player profile photo */
  photoUrl?: string | null;
  /** Player location/city (max 100 characters) */
  location?: string | null;
  /** Player skill level */
  skillLevel?: SkillLevel;
  /** Social media links */
  socialLinks?: SocialLinks;
}

/**
 * Response for PUT /api/players/profile
 * Returns the updated profile
 */
export interface UpdateProfileResponse {
  success: true;
  data: {
    profile: PlayerProfile;
  };
  message: string;
}

/**
 * Error response for profile operations
 */
export interface ProfileOperationError {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Standard error codes for player profile API endpoints
 */
export enum PlayerProfileApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  NO_ORG_CONTEXT = 'NO_ORG_CONTEXT',

  // Validation errors
  INVALID_PLAYER_ID = 'INVALID_PLAYER_ID',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Not found errors
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',

  // Privacy errors
  PROFILE_PRIVATE = 'PROFILE_PRIVATE',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  GET_PROFILE_ERROR = 'GET_PROFILE_ERROR',
  UPDATE_PROFILE_ERROR = 'UPDATE_PROFILE_ERROR',
}
