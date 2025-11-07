/**
 * Type definitions for Public API v1
 *
 * These types define the structure of API requests and responses
 * for the Tournament Platform Public API.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  player: {
    id: string;
    name: string;
  };
  metric_value: number;
  change: string;
}

export interface VenueLeaderboardEntry {
  rank: number;
  player: {
    id: string;
    name: string;
  };
  metric_value: number;
  matches_played: number;
}

export interface FormatLeaderboardEntry {
  rank: number;
  player: {
    id: string;
    name: string;
  };
  win_rate: number;
  matches_played: number;
  tournaments_played: number;
}

export interface LeaderboardMeta {
  total: number;
  type: 'win-rate' | 'tournaments' | 'prize-money';
  updated_at: string;
}

export interface VenueLeaderboardMeta extends LeaderboardMeta {
  venue_id: string;
}

export interface FormatLeaderboardMeta {
  total: number;
  format: string;
  updated_at: string;
}

// ============================================================================
// Venue Types
// ============================================================================

export interface VenueListItem {
  id: string;
  name: string;
  location: string;
  tournament_count: number;
}

export interface VenueDetails {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  capacity: number;
  amenities: string[];
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  statistics: {
    total_tournaments: number;
    active_tournaments: number;
    total_players_hosted: number;
  };
}

export interface TournamentListItem {
  id: string;
  name: string;
  format: string;
  status: string;
  start_date: string;
  player_count: number;
}

export interface VenueTournamentsMeta extends PaginationMeta {
  venue_id: string;
}

// ============================================================================
// API Request Types
// ============================================================================

export interface LeaderboardQueryParams {
  type?: 'win-rate' | 'tournaments' | 'prize-money';
  limit?: number;
}

export interface VenueLeaderboardQueryParams {
  type?: 'win-rate' | 'tournaments';
  limit?: number;
}

export interface FormatLeaderboardQueryParams {
  limit?: number;
}

export interface VenuesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export interface VenueTournamentsQueryParams {
  status?: 'upcoming' | 'active' | 'completed' | 'all';
  page?: number;
  limit?: number;
}

// ============================================================================
// API Response Types (Full)
// ============================================================================

export type LeaderboardResponse = ApiResponse<LeaderboardEntry[]> & {
  meta: LeaderboardMeta;
};

export type VenueLeaderboardResponse = ApiResponse<VenueLeaderboardEntry[]> & {
  meta: VenueLeaderboardMeta;
};

export type FormatLeaderboardResponse = ApiResponse<FormatLeaderboardEntry[]> & {
  meta: FormatLeaderboardMeta;
};

export type VenuesResponse = PaginatedResponse<VenueListItem>;

export type VenueDetailsResponse = ApiResponse<VenueDetails>;

export type VenueTournamentsResponse = PaginatedResponse<TournamentListItem> & {
  meta: VenueTournamentsMeta;
};

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  rate_limit: number;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

// ============================================================================
// Error Types
// ============================================================================

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_parameter'
  | 'rate_limit_exceeded'
  | 'internal_error'
  | 'not_implemented';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isApiError(response: any): response is ApiErrorResponse {
  return response && typeof response === 'object' && 'error' in response;
}

export function isPaginatedResponse<T>(
  response: any
): response is PaginatedResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'meta' in response &&
    'page' in response.meta &&
    'limit' in response.meta &&
    'total' in response.meta
  );
}
