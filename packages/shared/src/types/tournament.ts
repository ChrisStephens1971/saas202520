// Tournament Types

export interface Tournament {
  id: string;
  orgId: string; // Tenant ID
  name: string;
  status: TournamentStatus;
  format: TournamentFormat;
  sportConfigId: string;
  sportConfigVersion: string; // Frozen at tournament creation
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export enum TournamentStatus {
  DRAFT = 'draft',
  REGISTRATION = 'registration',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  MODIFIED_SINGLE = 'modified_single',
  CHIP_FORMAT = 'chip_format',
}

export interface SportConfig {
  id: string;
  name: string; // e.g., "Pool 8-Ball", "Pool 9-Ball"
  sport: Sport;
  rules: Record<string, unknown>; // JSON schema for sport-specific rules
  scoringSchema: Record<string, unknown>;
  bracketTemplates: Record<string, unknown>;
  version: string;
  createdAt: Date;
}

export enum Sport {
  POOL = 'pool',
  // Future: DARTS = 'darts', CORNHOLE = 'cornhole', etc.
}

export interface Table {
  id: string;
  tournamentId: string;
  label: string; // e.g., "Table 1", "Back Corner"
  status: TableStatus;
  blockedUntil?: Date;
  currentMatchId?: string;
}

export enum TableStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  BLOCKED = 'blocked',
}
