/**
 * Player Profiles - Type Definitions
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * Comprehensive type definitions for player profiles, statistics, achievements, and related features.
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// PLAYER PROFILE TYPES
// ============================================================================

export interface PlayerProfile {
  id: string;
  playerId: string;
  tenantId: string;
  bio: string | null;
  photoUrl: string | null;
  location: string | null;
  skillLevel: SkillLevel;
  privacySettings: PrivacySettings;
  notificationPreferences: NotificationPreferences;
  socialLinks: SocialLinks | null;
  customFields: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface PrivacySettings {
  profilePublic: boolean;
  showStats: boolean;
  showHistory: boolean;
  showAchievements?: boolean;
  showLocation?: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  categories: {
    tournaments: boolean;
    matches: boolean;
    achievements: boolean;
    social: boolean;
  };
}

export interface SocialLinks {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
  linkedin?: string;
}

// ============================================================================
// PLAYER STATISTICS TYPES
// ============================================================================

export interface PlayerStatistics {
  id: string;
  playerId: string;
  tenantId: string;
  totalTournaments: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  winRate: Decimal;
  currentStreak: number;
  longestStreak: number;
  averageFinish: Decimal | null;
  favoriteFormat: string | null;
  totalPrizeWon: Decimal;
  lastPlayedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatisticsUpdate {
  matchResult: 'WIN' | 'LOSS' | 'DRAW';
  format?: string;
  finish?: number;
  prizeWon?: number;
}

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

export interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  requirements: AchievementRequirements;
  points: number;
  iconUrl: string | null;
  badgeUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AchievementCategory = 'PARTICIPATION' | 'PERFORMANCE' | 'ENGAGEMENT' | 'FORMAT_MASTERY';

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface AchievementRequirements {
  type: string;
  value?: number;
  min_matches?: number;
  win_rate?: number;
  same_format?: boolean;
  hours_before?: number;
  bracket?: string;
  placement?: number;
  seed_position?: string;
  hours?: number;
}

export interface PlayerAchievement {
  id: string;
  playerId: string;
  tenantId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  metadata: AchievementMetadata | null;
  createdAt: Date;
  achievement: AchievementDefinition;
}

export interface AchievementMetadata {
  tournamentId?: string;
  matchId?: string;
  value?: number;
  context?: string;
}

export interface AchievementProgress {
  achievementCode: string;
  progress: number;
  isUnlocked: boolean;
  requirement: AchievementRequirements;
  currentValue: number;
  targetValue: number;
}

export interface AchievementUnlockResult {
  unlocked: boolean;
  achievement?: PlayerAchievement;
  message: string;
}

// ============================================================================
// MATCH HISTORY TYPES
// ============================================================================

export interface MatchHistory {
  id: string;
  matchId: string;
  playerId: string;
  tenantId: string;
  tournamentId: string;
  opponentId: string;
  result: MatchResult;
  playerScore: number;
  opponentScore: number;
  format: string;
  matchDate: Date;
  duration: number | null;
  metadata: MatchMetadata | null;
  createdAt: Date;
}

export type MatchResult = 'WIN' | 'LOSS' | 'DRAW';

export interface MatchMetadata {
  round?: number;
  bracket?: string;
  tableNumber?: string;
  notes?: string;
}

export interface MatchHistoryWithDetails extends MatchHistory {
  opponent: {
    id: string;
    name: string;
    photoUrl?: string;
    skillLevel?: SkillLevel;
  };
  tournament: {
    id: string;
    name: string;
    format: string;
    date: Date;
  };
}

// ============================================================================
// HEAD-TO-HEAD TYPES
// ============================================================================

export interface HeadToHeadRecord {
  id: string;
  player1Id: string;
  player2Id: string;
  tenantId: string;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  lastPlayed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HeadToHeadStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lastPlayed: Date;
  recentMatches: MatchHistoryWithDetails[];
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

export type LeaderboardType = 'winRate' | 'tournaments' | 'prizes' | 'achievements';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  photoUrl: string | null;
  skillLevel: SkillLevel;
  value: number | Decimal;
  formattedValue: string;
  change?: number; // Position change from previous period
}

export interface LeaderboardResult {
  type: LeaderboardType;
  entries: LeaderboardEntry[];
  updatedAt: Date;
  totalPlayers: number;
}

// ============================================================================
// COMPLETE PROFILE TYPES
// ============================================================================

export interface CompletePlayerProfile {
  profile: PlayerProfile;
  statistics: PlayerStatistics;
  achievements: PlayerAchievement[];
  recentMatches: MatchHistoryWithDetails[];
  rivalries: HeadToHeadStats[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface UpdateProfileRequest {
  bio?: string;
  photoUrl?: string;
  location?: string;
  skillLevel?: SkillLevel;
  socialLinks?: SocialLinks;
}

export interface UpdateSettingsRequest {
  privacySettings?: Partial<PrivacySettings>;
  notificationPreferences?: Partial<NotificationPreferences>;
}

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

export interface SearchPlayersResponse {
  players: PlayerSearchResult[];
  total: number;
  hasMore: boolean;
}

export interface PlayerSearchResult {
  id: string;
  name: string;
  photoUrl: string | null;
  skillLevel: SkillLevel;
  location: string | null;
  winRate: number;
  totalTournaments: number;
  lastPlayed: Date | null;
}

// ============================================================================
// SERVICE ERROR TYPES
// ============================================================================

export class PlayerProfileError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PlayerProfileError';
  }
}

export class AchievementError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AchievementError';
  }
}

// ============================================================================
// EVENT TYPES (for achievement triggers)
// ============================================================================

export type AchievementEventType =
  | 'TOURNAMENT_COMPLETE'
  | 'MATCH_COMPLETE'
  | 'REGISTRATION'
  | 'PROFILE_UPDATE';

export interface AchievementEvent {
  type: AchievementEventType;
  playerId: string;
  tenantId: string;
  data: {
    tournamentId?: string;
    matchId?: string;
    result?: MatchResult;
    format?: string;
    seed?: number;
    bracket?: string;
    finish?: number;
    tournamentDuration?: number;
    registrationTime?: Date;
    tournamentStartTime?: Date;
  };
}
