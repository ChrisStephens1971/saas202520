// Room View Types for TD Console

import { Match, MatchState, Table, TableStatus } from '@/packages/shared/src/types';

/**
 * Tournament room overview data
 */
export interface TournamentRoomData {
  tournamentId: string;
  tournamentName: string;
  format: string;
  status: string;
  overview: TournamentOverview;
  tables: TableWithMatch[];
  matchQueue: QueuedMatch[];
  recentActivity: MatchActivity[];
  lastUpdated: Date;
}

/**
 * Real-time tournament statistics
 */
export interface TournamentOverview {
  totalMatches: number;
  activeMatches: number;
  completedMatches: number;
  pendingMatches: number;
  availableTables: number;
  totalTables: number;
  averageMatchDuration: number; // in minutes
  estimatedCompletionTime?: Date;
}

/**
 * Table with current match assignment
 */
export interface TableWithMatch {
  id: string;
  label: string;
  status: TableStatus;
  currentMatch?: Match;
  blockedUntil?: Date;
  estimatedAvailableAt?: Date;
  lastActivity?: Date;
}

/**
 * Match in the queue waiting for table assignment
 */
export interface QueuedMatch {
  match: Match;
  priority: number;
  estimatedStartTime?: Date;
  waitingDuration: number; // in minutes
  playerNames: {
    playerA?: string;
    playerB?: string;
  };
}

/**
 * Recent match activity for activity feed
 */
export interface MatchActivity {
  id: string;
  matchId: string;
  action: MatchActivityType;
  timestamp: Date;
  details: string;
  tableLabel?: string;
  playerNames?: string[];
}

export enum MatchActivityType {
  MATCH_ASSIGNED = 'match_assigned',
  MATCH_STARTED = 'match_started',
  MATCH_COMPLETED = 'match_completed',
  SCORE_UPDATED = 'score_updated',
  TABLE_FREED = 'table_freed',
  MATCH_CANCELLED = 'match_cancelled',
}

/**
 * Filters for room view
 */
export interface RoomViewFilters {
  searchQuery: string;
  matchStatus: MatchState | 'all';
  tableStatus: TableStatus | 'all';
  sortBy: 'priority' | 'waitTime' | 'tableNumber';
  showCompleted: boolean;
}

/**
 * Quick action types for match management
 */
export interface QuickAction {
  type: QuickActionType;
  matchId: string;
  tableId?: string;
  label: string;
  icon: string;
  disabled?: boolean;
  disabledReason?: string;
}

export enum QuickActionType {
  ASSIGN_TO_TABLE = 'assign_to_table',
  START_MATCH = 'start_match',
  COMPLETE_MATCH = 'complete_match',
  UPDATE_SCORE = 'update_score',
  CANCEL_MATCH = 'cancel_match',
  UNASSIGN = 'unassign',
}

/**
 * Real-time update event from server
 */
export interface RoomUpdateEvent {
  type: RoomUpdateEventType;
  tournamentId: string;
  data: unknown;
  timestamp: Date;
}

export enum RoomUpdateEventType {
  MATCH_UPDATED = 'match_updated',
  TABLE_UPDATED = 'table_updated',
  QUEUE_UPDATED = 'queue_updated',
  STATS_UPDATED = 'stats_updated',
}

/**
 * ETA calculation result
 */
export interface MatchETA {
  matchId: string;
  estimatedStartTime: Date;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}
