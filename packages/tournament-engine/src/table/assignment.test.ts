/**
 * Tests for Table Assignment Logic
 */

import { describe, it, expect } from 'vitest';
import {
  isTableAvailable,
  validateTableAssignment,
  createAssignmentMutation,
  createUnassignmentMutation,
  releaseTable,
  blockTable,
  getAvailableTables,
  getTablesInUse,
  findTableByMatch,
  TableAlreadyAssignedError,
  TableNotAvailableError,
  OptimisticLockError,
  TableAssignmentError,
  type Table,
  type Match,
} from './assignment';

describe('Table Assignment', () => {
  // Helper to create mock table
  function createTable(overrides?: Partial<Table>): Table {
    return {
      id: 'table-1',
      tournamentId: 'tournament-1',
      label: 'Table 1',
      status: 'available',
      currentMatchId: null,
      blockedUntil: null,
      ...overrides,
    };
  }

  // Helper to create mock match
  function createMatch(overrides?: Partial<Match>): Match {
    return {
      id: 'match-1',
      tournamentId: 'tournament-1',
      state: 'ready',
      tableId: null,
      rev: 1,
      ...overrides,
    };
  }

  describe('Table Availability', () => {
    it('should identify available table', () => {
      const table = createTable();
      expect(isTableAvailable(table)).toBe(true);
    });

    it('should reject table in_use', () => {
      const table = createTable({ status: 'in_use', currentMatchId: 'match-2' });
      expect(isTableAvailable(table)).toBe(false);
    });

    it('should reject blocked table', () => {
      const table = createTable({ status: 'blocked' });
      expect(isTableAvailable(table)).toBe(false);
    });

    it('should reject table with current match', () => {
      const table = createTable({ currentMatchId: 'match-2' });
      expect(isTableAvailable(table)).toBe(false);
    });

    it('should reject table blocked until future', () => {
      const future = new Date(Date.now() + 3600000); // 1 hour from now
      const table = createTable({ blockedUntil: future });
      expect(isTableAvailable(table)).toBe(false);
    });

    it('should accept table with expired block', () => {
      const past = new Date(Date.now() - 3600000); // 1 hour ago
      const table = createTable({ blockedUntil: past });
      expect(isTableAvailable(table)).toBe(true);
    });
  });

  describe('Assignment Validation', () => {
    it('should validate correct assignment', () => {
      const match = createMatch();
      const table = createTable();

      expect(() => validateTableAssignment(match, table, 1)).not.toThrow();
    });

    it('should reject different tournaments', () => {
      const match = createMatch({ tournamentId: 'tournament-1' });
      const table = createTable({ tournamentId: 'tournament-2' });

      expect(() => validateTableAssignment(match, table, 1)).toThrow(
        'belong to different tournaments'
      );
    });

    it('should reject stale revision (optimistic lock)', () => {
      const match = createMatch({ rev: 5 });
      const table = createTable();

      expect(() => validateTableAssignment(match, table, 3)).toThrow(OptimisticLockError);
    });

    it('should reject unavailable table', () => {
      const match = createMatch();
      const table = createTable({ status: 'blocked' });

      expect(() => validateTableAssignment(match, table, 1)).toThrow(TableNotAvailableError);
    });

    it('should reject table already assigned', () => {
      const match = createMatch();
      const table = createTable({ currentMatchId: 'match-2' });

      expect(() => validateTableAssignment(match, table, 1)).toThrow(TableAlreadyAssignedError);
    });

    it('should reject match not in ready state', () => {
      const match = createMatch({ state: 'pending' });
      const table = createTable();

      expect(() => validateTableAssignment(match, table, 1)).toThrow("must be in 'ready' state");
    });

    it('should reject match already assigned', () => {
      const match = createMatch({ tableId: 'table-2' });
      const table = createTable();

      expect(() => validateTableAssignment(match, table, 1)).toThrow('already assigned to table');
    });
  });

  describe('Assignment Mutation', () => {
    it('should create correct assignment mutation', () => {
      const match = createMatch({ rev: 2 });
      const table = createTable();

      const result = createAssignmentMutation(match, table);

      // Check match updates
      expect(result.match.tableId).toBe(table.id);
      expect(result.match.state).toBe('assigned');
      expect(result.match.rev).toBe(3); // Incremented

      // Check table updates
      expect(result.table.status).toBe('in_use');
      expect(result.table.currentMatchId).toBe(match.id);
    });

    it('should not mutate original objects', () => {
      const match = createMatch({ rev: 1 });
      const table = createTable();

      createAssignmentMutation(match, table);

      // Originals unchanged
      expect(match.tableId).toBeNull();
      expect(match.state).toBe('ready');
      expect(match.rev).toBe(1);
      expect(table.status).toBe('available');
      expect(table.currentMatchId).toBeNull();
    });
  });

  describe('Unassignment Mutation', () => {
    it('should create correct unassignment mutation', () => {
      const match = createMatch({ tableId: 'table-1', state: 'assigned', rev: 3 });
      const table = createTable({ id: 'table-1', status: 'in_use', currentMatchId: 'match-1' });

      const result = createUnassignmentMutation(match, table, 3);

      // Check match updates
      expect(result.match.tableId).toBeNull();
      expect(result.match.state).toBe('ready');
      expect(result.match.rev).toBe(4);

      // Check table updates
      expect(result.table.status).toBe('available');
      expect(result.table.currentMatchId).toBeNull();
    });

    it('should throw on stale revision', () => {
      const match = createMatch({ tableId: 'table-1', rev: 5 });
      const table = createTable({ id: 'table-1' });

      expect(() => createUnassignmentMutation(match, table, 3)).toThrow(OptimisticLockError);
    });

    it('should throw if table mismatch', () => {
      const match = createMatch({ tableId: 'table-2', rev: 1 });
      const table = createTable({ id: 'table-1' });

      expect(() => createUnassignmentMutation(match, table, 1)).toThrow('not assigned to table');
    });
  });

  describe('Table Operations', () => {
    it('should release table', () => {
      const table = createTable({ status: 'in_use', currentMatchId: 'match-1' });
      const released = releaseTable(table);

      expect(released.status).toBe('available');
      expect(released.currentMatchId).toBeNull();
    });

    it('should block table', () => {
      const table = createTable();
      const until = new Date(Date.now() + 3600000);
      const blocked = blockTable(table, until);

      expect(blocked.status).toBe('blocked');
      expect(blocked.blockedUntil).toBe(until);
    });
  });

  describe('Table Queries', () => {
    it('should get available tables', () => {
      const tables = [
        createTable({ id: 't1', status: 'available' }),
        createTable({ id: 't2', status: 'in_use' }),
        createTable({ id: 't3', status: 'available' }),
        createTable({ id: 't4', status: 'blocked' }),
      ];

      const available = getAvailableTables(tables);
      expect(available).toHaveLength(2);
      expect(available.map((t) => t.id)).toEqual(['t1', 't3']);
    });

    it('should get tables in use', () => {
      const tables = [
        createTable({ id: 't1', status: 'available' }),
        createTable({ id: 't2', status: 'in_use', currentMatchId: 'm1' }),
        createTable({ id: 't3', status: 'in_use', currentMatchId: 'm2' }),
      ];

      const inUse = getTablesInUse(tables);
      expect(inUse).toHaveLength(2);
      expect(inUse.map((t) => t.id)).toEqual(['t2', 't3']);
    });

    it('should find table by match', () => {
      const tables = [
        createTable({ id: 't1', currentMatchId: 'm1' }),
        createTable({ id: 't2', currentMatchId: 'm2' }),
        createTable({ id: 't3', currentMatchId: null }),
      ];

      expect(findTableByMatch(tables, 'm1')?.id).toBe('t1');
      expect(findTableByMatch(tables, 'm2')?.id).toBe('t2');
      expect(findTableByMatch(tables, 'm3')).toBeNull();
    });
  });

  describe('Concurrent Assignment Scenario', () => {
    it('should handle race condition with optimistic locking', () => {
      const match = createMatch({ rev: 1 });
      const table = createTable();

      // TD 1 validates and prepares assignment
      expect(() => validateTableAssignment(match, table, 1)).not.toThrow();
      const assignment1 = createAssignmentMutation(match, table);

      // TD 2 also validates (match still at rev 1)
      expect(() => validateTableAssignment(match, table, 1)).not.toThrow();

      // TD 1's assignment succeeds, updates match to rev 2
      const updatedMatch = assignment1.match;
      expect(updatedMatch.rev).toBe(2);

      // TD 2 tries to assign, but fails optimistic lock (expected rev 1, actual 2)
      expect(() => validateTableAssignment(updatedMatch, table, 1)).toThrow(OptimisticLockError);
    });
  });
});
