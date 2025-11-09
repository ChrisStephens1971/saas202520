/**
 * Tournament Module Types
 * Sprint 2
 *
 * Shared TypeScript types for tournament resource management
 */

// ============================================================================
// TABLE TYPES
// ============================================================================

export type TableStatus = 'available' | 'in_use' | 'maintenance';

export interface TableResource {
  id: string;
  tournamentId: string;
  label: string;
  status: TableStatus;
  blockedUntil: Date | null;
  currentMatchId: string | null;
  createdAt?: Date;
}

export interface TableAssignment {
  tableId: string;
  matchId: string;
  assignedAt: Date;
  label: string;
}

export interface TableAvailability {
  tableId: string;
  label: string;
  isAvailable: boolean;
  status: TableStatus;
  currentMatch?: {
    id: string;
    round: number;
    position: number;
    players: string[];
  };
  blockedUntil?: Date;
}

export interface TableConflict {
  tableId: string;
  conflictType: 'double_booking' | 'blocked' | 'maintenance';
  existingMatchId?: string;
  message: string;
}

export interface CreateTableRequest {
  label: string;
}

export interface CreateTablesBulkRequest {
  labels: string[];
}

export interface UpdateTableStatusRequest {
  status: TableStatus;
}

export interface BlockTableRequest {
  blockedUntil: string; // ISO 8601 datetime
}

export interface AssignTableRequest {
  matchId: string;
}

export interface TableListResponse {
  tables: TableResource[];
  count: number;
}

export interface TableAvailabilityResponse {
  tables: TableAvailability[];
  availableCount: number;
  inUseCount: number;
  maintenanceCount: number;
}

export interface TableAssignmentResponse {
  assignment: TableAssignment;
  success: boolean;
}

export interface TableConflictCheckResponse {
  available: boolean;
  conflict?: TableConflict;
}

// ============================================================================
// ETA & SCHEDULING TYPES (Sprint 2)
// ============================================================================

export interface MatchETA {
  matchId: string;
  estimatedStartTime: Date;
  estimatedEndTime: Date;
  estimatedDurationMinutes: number;
  confidence: number; // 0-1, how confident we are in the estimate
  position: number; // Position in queue (1 = next match)
  tableId: string | null;
  status: 'waiting' | 'ready' | 'assigned' | 'active';
}

export interface DurationEstimate {
  baseMinutes: number;
  adjustedMinutes: number;
  factors: {
    raceTo?: number;
    skillLevel?: string;
    historicalAverage?: number;
  };
}

export interface ETAUpdate {
  tournamentId: string;
  updatedAt: Date;
  activeMatches: number;
  pendingMatches: number;
  availableTables: number;
  etas: MatchETA[];
}

export interface PlayerWaitTime {
  playerId: string;
  estimatedMinutes: number;
  position: number;
  nextMatchId: string | null;
}

export interface QueuedMatch {
  matchId: string;
  round: number;
  position: number;
  playerAId: string | null;
  playerBId: string | null;
  playerAName: string | null;
  playerBName: string | null;
  state: string;
  dependencies: string[];
  canStart: boolean;
  priority: number;
}

export interface QueueStatus {
  tournamentId: string;
  readyMatches: QueuedMatch[];
  availableTables: number;
  activeMatches: number;
  pendingMatches: number;
  updatedAt: Date;
}

export interface SchedulingConfig {
  pollIntervalMs: number;
  autoAssign: boolean;
  optimizeAssignments: boolean;
  enableWebSocket: boolean;
}

export interface SchedulerStats {
  tournamentId: string;
  startedAt: Date;
  lastRunAt: Date | null;
  totalRuns: number;
  totalAssignments: number;
  averageRunTimeMs: number;
  errors: number;
}
