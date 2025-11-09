/**
 * Public API Type Definitions
 * Sprint 10 Week 3 - Public API & Webhooks
 *
 * Type definitions for public-facing REST API v1.
 * All types represent read-only API responses.
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pagination metadata included in list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Standard paginated API response wrapper
 */
export interface PaginatedApiResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// ============================================================================
// TOURNAMENT TYPES
// ============================================================================

/**
 * Tournament summary for list endpoints
 */
export interface TournamentSummary {
  id: string;
  name: string;
  format: string;
  status: string;
  startDate: string | null;
  playerCount: number;
  description?: string;
}

/**
 * Full tournament details for single tournament endpoint
 */
export interface TournamentDetails {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  startDate: string | null;
  completedDate: string | null;
  playerCount: number;
  matchCount: number;
  currentRound: number | null;
  location?: string;
  rules?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Tournament match summary
 */
export interface TournamentMatchSummary {
  id: string;
  round: number;
  bracket: string | null;
  position: number;
  playerA: {
    id: string;
    name: string;
  } | null;
  playerB: {
    id: string;
    name: string;
  } | null;
  status: string;
  score: {
    playerA: number;
    playerB: number;
  };
  winner: {
    id: string;
    name: string;
  } | null;
  table: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Tournament player summary
 */
export interface TournamentPlayerSummary {
  id: string;
  name: string;
  seed: number | null;
  status: string;
  checkedInAt: string | null;
  wins: number;
  losses: number;
  chipCount?: number;
  standing?: number;
}

/**
 * Bracket match node
 */
export interface BracketMatchNode {
  matchId: string;
  round: number;
  position: number;
  playerA: {
    id: string;
    name: string;
    seed: number | null;
  } | null;
  playerB: {
    id: string;
    name: string;
    seed: number | null;
  } | null;
  winner: {
    id: string;
    name: string;
  } | null;
  score: {
    playerA: number;
    playerB: number;
  };
  status: string;
}

/**
 * Bracket round
 */
export interface BracketRound {
  round: number;
  name: string; // "Round 1", "Quarterfinals", "Semifinals", "Finals"
  matches: BracketMatchNode[];
}

/**
 * Complete bracket structure
 */
export interface BracketStructure {
  tournamentId: string;
  format: string;
  winnersBracket: BracketRound[];
  losersBracket?: BracketRound[]; // Only for double elimination
}

// ============================================================================
// PLAYER TYPES
// ============================================================================

/**
 * Player summary for list endpoints
 */
export interface PlayerSummary {
  id: string;
  name: string;
  skillLevel: string;
  winRate: number;
  tournamentsPlayed: number;
  photoUrl?: string;
}

/**
 * Full player profile
 */
export interface PlayerProfile {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  skillLevel: string;
  location: string | null;
  socialLinks: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  } | null;
  careerStats: {
    totalTournaments: number;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    totalPrizeWon: number;
  };
  joinedAt: string;
  lastActive: string | null;
}

/**
 * Player tournament history entry
 */
export interface PlayerTournamentHistory {
  tournamentId: string;
  tournamentName: string;
  format: string;
  status: string;
  placement: number | null;
  wins: number;
  losses: number;
  startDate: string | null;
  completedDate: string | null;
}

/**
 * Detailed player statistics
 */
export interface PlayerStats {
  playerId: string;
  overallStats: {
    totalTournaments: number;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    averageFinish: number | null;
  };
  streaks: {
    currentStreak: number; // Positive = win streak, negative = loss streak
    longestWinStreak: number;
  };
  performanceByFormat: {
    format: string;
    tournaments: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];
  rankings: {
    globalRank: number | null;
    venueRank: number | null;
  };
  recentPerformance: {
    last10Matches: {
      wins: number;
      losses: number;
      winRate: number;
    };
    last30Days: {
      tournaments: number;
      wins: number;
      losses: number;
    };
  };
}

// ============================================================================
// MATCH TYPES
// ============================================================================

/**
 * Match summary for list endpoints
 */
export interface MatchSummary {
  id: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  bracket: string | null;
  playerA: {
    id: string;
    name: string;
  } | null;
  playerB: {
    id: string;
    name: string;
  } | null;
  status: string;
  score: {
    playerA: number;
    playerB: number;
  };
  winner: {
    id: string;
    name: string;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Game score for detailed match info
 */
export interface GameScore {
  gameNumber: number;
  winner: string; // player ID
  score?: {
    playerA: number;
    playerB: number;
  };
}

/**
 * Full match details
 */
export interface MatchDetails {
  id: string;
  tournament: {
    id: string;
    name: string;
    format: string;
  };
  round: number;
  bracket: string | null;
  position: number;
  playerA: {
    id: string;
    name: string;
    seed: number | null;
  } | null;
  playerB: {
    id: string;
    name: string;
    seed: number | null;
  } | null;
  status: string;
  score: {
    playerA: number;
    playerB: number;
    raceTo?: number;
    games?: GameScore[];
  };
  winner: {
    id: string;
    name: string;
  } | null;
  table: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number | null;
}

// ============================================================================
// VALIDATION SCHEMAS (for query params)
// ============================================================================

/**
 * Tournament list query parameters
 */
export interface TournamentListQuery {
  page?: number;
  limit?: number;
  status?: 'upcoming' | 'active' | 'completed';
  format?: string;
}

/**
 * Tournament matches query parameters
 */
export interface TournamentMatchesQuery {
  round?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

/**
 * Tournament players query parameters
 */
export interface TournamentPlayersQuery {
  status?: 'registered' | 'checked_in' | 'eliminated' | 'winner';
}

/**
 * Player list query parameters
 */
export interface PlayerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  skillLevel?: string;
}

/**
 * Player history query parameters
 */
export interface PlayerHistoryQuery {
  page?: number;
  limit?: number;
  status?: 'completed';
}

/**
 * Match list query parameters
 */
export interface MatchListQuery {
  page?: number;
  limit?: number;
  status?: 'in_progress' | 'completed';
  tournamentId?: string;
}
