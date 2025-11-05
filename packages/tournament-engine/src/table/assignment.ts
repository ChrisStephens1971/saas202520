/**
 * Table Assignment Logic
 *
 * Handles assigning matches to tables with optimistic locking to prevent double-booking.
 * Supports concurrent table assignments across multiple TDs.
 */

/**
 * Table Status
 */
export type TableStatus = 'available' | 'in_use' | 'blocked';

/**
 * Table Assignment Error Types
 */
export class TableAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TableAssignmentError';
  }
}

export class TableAlreadyAssignedError extends TableAssignmentError {
  constructor(
    public tableId: string,
    public currentMatchId: string
  ) {
    super(`Table ${tableId} is already assigned to match ${currentMatchId}`);
    this.name = 'TableAlreadyAssignedError';
  }
}

export class TableNotAvailableError extends TableAssignmentError {
  constructor(
    public tableId: string,
    public status: TableStatus
  ) {
    super(`Table ${tableId} is not available (status: ${status})`);
    this.name = 'TableNotAvailableError';
  }
}

export class OptimisticLockError extends TableAssignmentError {
  constructor(
    public matchId: string,
    public expectedRev: number,
    public actualRev: number
  ) {
    super(
      `Match ${matchId} was modified by another user (expected rev ${expectedRev}, got ${actualRev})`
    );
    this.name = 'OptimisticLockError';
  }
}

/**
 * Table Resource
 */
export interface Table {
  id: string;
  tournamentId: string;
  label: string;
  status: TableStatus;
  currentMatchId: string | null;
  blockedUntil: Date | null;
}

/**
 * Match for table assignment
 */
export interface Match {
  id: string;
  tournamentId: string;
  state: string;
  tableId: string | null;
  rev: number; // Optimistic locking version
}

/**
 * Table Assignment Request
 */
export interface AssignTableRequest {
  matchId: string;
  tableId: string;
  expectedMatchRev: number; // For optimistic locking
}

/**
 * Table Assignment Result
 */
export interface AssignTableResult {
  success: boolean;
  match: Match;
  table: Table;
  newMatchRev: number;
}

/**
 * Check if a table is available for assignment
 *
 * @param table - Table to check
 * @returns true if table is available, false otherwise
 */
export function isTableAvailable(table: Table): boolean {
  // Table must be in available status
  if (table.status !== 'available') {
    return false;
  }

  // Table must not be currently assigned
  if (table.currentMatchId !== null) {
    return false;
  }

  // Table must not be blocked
  if (table.blockedUntil !== null && table.blockedUntil > new Date()) {
    return false;
  }

  return true;
}

/**
 * Validate table assignment request
 *
 * @param match - Match to assign
 * @param table - Table to assign to
 * @param expectedRev - Expected match revision
 * @throws TableAssignmentError if assignment is invalid
 */
export function validateTableAssignment(
  match: Match,
  table: Table,
  expectedRev: number
): void {
  // Check match and table belong to same tournament
  if (match.tournamentId !== table.tournamentId) {
    throw new TableAssignmentError(
      `Match ${match.id} and table ${table.id} belong to different tournaments`
    );
  }

  // Check match revision matches (optimistic locking)
  if (match.rev !== expectedRev) {
    throw new OptimisticLockError(match.id, expectedRev, match.rev);
  }

  // Check table is available
  if (!isTableAvailable(table)) {
    if (table.currentMatchId) {
      throw new TableAlreadyAssignedError(table.id, table.currentMatchId);
    } else {
      throw new TableNotAvailableError(table.id, table.status);
    }
  }

  // Check match is in correct state (should be 'ready')
  if (match.state !== 'ready') {
    throw new TableAssignmentError(
      `Match ${match.id} must be in 'ready' state to assign table (current: ${match.state})`
    );
  }

  // Check match doesn't already have a table
  if (match.tableId !== null) {
    throw new TableAssignmentError(`Match ${match.id} is already assigned to table ${match.tableId}`);
  }
}

/**
 * Create assignment mutation
 *
 * Returns the changes needed to assign a match to a table.
 * Caller is responsible for applying these changes atomically.
 *
 * @param match - Match to assign
 * @param table - Table to assign to
 * @returns Updated match and table
 */
export function createAssignmentMutation(
  match: Match,
  table: Table
): { match: Match; table: Table } {
  // Update match
  const updatedMatch: Match = {
    ...match,
    tableId: table.id,
    state: 'assigned',
    rev: match.rev + 1,
  };

  // Update table
  const updatedTable: Table = {
    ...table,
    status: 'in_use',
    currentMatchId: match.id,
  };

  return {
    match: updatedMatch,
    table: updatedTable,
  };
}

/**
 * Unassign table from match
 *
 * Returns the changes needed to unassign a table.
 * Caller is responsible for applying these changes atomically.
 *
 * @param match - Match to unassign
 * @param table - Table to unassign
 * @param expectedRev - Expected match revision
 * @returns Updated match and table
 */
export function createUnassignmentMutation(
  match: Match,
  table: Table,
  expectedRev: number
): { match: Match; table: Table } {
  // Check revision
  if (match.rev !== expectedRev) {
    throw new OptimisticLockError(match.id, expectedRev, match.rev);
  }

  // Check match has this table assigned
  if (match.tableId !== table.id) {
    throw new TableAssignmentError(
      `Match ${match.id} is not assigned to table ${table.id} (assigned to: ${match.tableId})`
    );
  }

  // Update match
  const updatedMatch: Match = {
    ...match,
    tableId: null,
    state: 'ready',
    rev: match.rev + 1,
  };

  // Update table
  const updatedTable: Table = {
    ...table,
    status: 'available',
    currentMatchId: null,
  };

  return {
    match: updatedMatch,
    table: updatedTable,
  };
}

/**
 * Release table when match completes
 *
 * Returns the changes needed to release a table.
 *
 * @param table - Table to release
 * @returns Updated table
 */
export function releaseTable(table: Table): Table {
  return {
    ...table,
    status: 'available',
    currentMatchId: null,
  };
}

/**
 * Block table temporarily
 *
 * Useful for maintenance or reservations.
 *
 * @param table - Table to block
 * @param until - When the block expires
 * @returns Updated table
 */
export function blockTable(table: Table, until: Date): Table {
  return {
    ...table,
    status: 'blocked',
    blockedUntil: until,
  };
}

/**
 * Get all available tables for a tournament
 *
 * @param tables - All tables in tournament
 * @returns Available tables
 */
export function getAvailableTables(tables: Table[]): Table[] {
  return tables.filter(isTableAvailable);
}

/**
 * Get tables currently in use
 *
 * @param tables - All tables in tournament
 * @returns Tables in use
 */
export function getTablesInUse(tables: Table[]): Table[] {
  return tables.filter((t) => t.status === 'in_use' && t.currentMatchId !== null);
}

/**
 * Find table by match
 *
 * @param tables - All tables
 * @param matchId - Match ID
 * @returns Table assigned to match, or null
 */
export function findTableByMatch(tables: Table[], matchId: string): Table | null {
  return tables.find((t) => t.currentMatchId === matchId) ?? null;
}
