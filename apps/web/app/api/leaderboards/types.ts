/**
 * Leaderboard API Types
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * Type definitions for leaderboard API requests and responses
 */

import { z } from 'zod';

// ============================================================================
// REQUEST TYPES
// ============================================================================

export const LeaderboardTypeSchema = z.enum([
  'win-rate',
  'tournaments',
  'prize-money',
  'achievements',
]);

export type LeaderboardTypeUrl = z.infer<typeof LeaderboardTypeSchema>;

export const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  timeframe: z.enum(['all-time', 'month', 'week']).default('all-time'),
});

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface LeaderboardEntryResponse {
  rank: number;
  playerId: string;
  playerName: string;
  photoUrl: string | null;
  skillLevel: string;
  value: number;
  formattedValue: string;
  change: number; // Position change from previous period
}

export interface LeaderboardMetadata {
  limit: number;
  count: number;
  hasMore: boolean;
}

export interface LeaderboardResponse {
  type: LeaderboardTypeUrl;
  timeframe: 'all-time' | 'month' | 'week';
  leaderboard: {
    entries: LeaderboardEntryResponse[];
    totalPlayers: number;
    updatedAt: Date | string;
  };
  metadata: LeaderboardMetadata;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface LeaderboardErrorResponse {
  error: string;
  message?: string;
  code?: string;
  validTypes?: string[];
  details?: Record<string, unknown>;
}
