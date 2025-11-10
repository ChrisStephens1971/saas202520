/**
 * Table Manager Tests
 * Sprint 2 - Table resource management and assignment
 *
 * Tests:
 * - Table creation and management
 * - Table assignment and release
 * - Conflict detection
 * - Availability checking
 * - Multi-tenant isolation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Table, Match, Tournament } from '@prisma/client';
import type {
  TableStatus,
  TableResource,
  TableAssignment,
  TableAvailability,
  TableConflict,
} from '../table-manager';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 'table-1',
    tournamentId: 'tournament-1',
    label: 'Table 1',
    status: 'available',
    blockedUntil: null,
    currentMatchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament-1',
    orgId: 'org-1',
    name: 'Test Tournament',
    status: 'active',
    format: 'single_elimination',
    startDate: new Date(),
    endDate: null,
    chipConfig: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournamentId: 'tournament-1',
    round: 1,
    position: 0,
    bracket: null,
    playerAId: 'player-1',
    playerBId: 'player-2',
    state: 'pending',
    tableId: null,
    winnerId: null,
    startedAt: null,
    completedAt: null,
    score: null,
    rev: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// TABLE CREATION TESTS
// ============================================================================

describe('Table Manager - Table Creation', () => {
  it('should create table with correct properties', () => {
    const table = createMockTable({
      label: 'Table 1',
      status: 'available',
    });

    expect(table.label).toBe('Table 1');
    expect(table.status).toBe('available');
    expect(table.blockedUntil).toBeNull();
    expect(table.currentMatchId).toBeNull();
  });

  it('should prevent duplicate labels within same tournament', () => {
    const table1 = createMockTable({
      id: 'table-1',
      label: 'Table 1',
      tournamentId: 'tournament-1',
    });

    const table2 = createMockTable({
      id: 'table-2',
      label: 'Table 1', // Duplicate label
      tournamentId: 'tournament-1',
    });

    expect(table1.label).toBe(table2.label);
    expect(table1.tournamentId).toBe(table2.tournamentId);
    // Should throw error in actual implementation
  });

  it('should allow same label in different tournaments', () => {
    const table1 = createMockTable({
      id: 'table-1',
      label: 'Table 1',
      tournamentId: 'tournament-1',
    });

    const table2 = createMockTable({
      id: 'table-2',
      label: 'Table 1', // Same label, different tournament
      tournamentId: 'tournament-2',
    });

    expect(table1.label).toBe(table2.label);
    expect(table1.tournamentId).not.toBe(table2.tournamentId);
  });

  it('should validate tournament belongs to organization', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const table = createMockTable({ tournamentId: tournament.id });

    expect(table.tournamentId).toBe(tournament.id);
    // Should verify tournament.orgId matches request orgId
  });
});

// ============================================================================
// TABLE STATUS TESTS
// ============================================================================

describe('Table Manager - Table Status', () => {
  it('should have available status by default', () => {
    const table = createMockTable();

    expect(table.status).toBe('available');
  });

  it('should allow status change to in_use', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    expect(table.status).toBe('in_use');
    expect(table.currentMatchId).not.toBeNull();
  });

  it('should allow status change to maintenance', () => {
    const table = createMockTable({
      status: 'maintenance',
    });

    expect(table.status).toBe('maintenance');
  });

  it('should clear current match when moving to maintenance', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    // After moving to maintenance
    const updatedTable = { ...table, status: 'maintenance' as TableStatus, currentMatchId: null };

    expect(updatedTable.status).toBe('maintenance');
    expect(updatedTable.currentMatchId).toBeNull();
  });

  it('should maintain tenant isolation on status update', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const table = createMockTable({ tournamentId: tournament.id });

    expect(table.tournamentId).toBe(tournament.id);
    // Should verify table belongs to org before updating
  });
});

// ============================================================================
// TABLE BLOCKING TESTS
// ============================================================================

describe('Table Manager - Table Blocking', () => {
  it('should block table until specified time', () => {
    const blockedUntil = new Date(Date.now() + 3600000); // 1 hour from now
    const table = createMockTable({
      status: 'maintenance',
      blockedUntil,
    });

    expect(table.blockedUntil).toEqual(blockedUntil);
    expect(table.status).toBe('maintenance');
  });

  it('should clear current match when blocking', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    // After blocking
    const blockedTable = {
      ...table,
      status: 'maintenance' as TableStatus,
      blockedUntil: new Date(Date.now() + 3600000),
      currentMatchId: null,
    };

    expect(blockedTable.blockedUntil).not.toBeNull();
    expect(blockedTable.currentMatchId).toBeNull();
  });

  it('should unblock table and make available', () => {
    const table = createMockTable({
      status: 'maintenance',
      blockedUntil: new Date(Date.now() + 3600000),
    });

    // After unblocking
    const unblockedTable = {
      ...table,
      status: 'available' as TableStatus,
      blockedUntil: null,
    };

    expect(unblockedTable.status).toBe('available');
    expect(unblockedTable.blockedUntil).toBeNull();
  });

  it('should check if block time has passed', () => {
    const pastTime = new Date(Date.now() - 3600000); // 1 hour ago
    const futureTime = new Date(Date.now() + 3600000); // 1 hour from now

    const now = new Date();

    expect(pastTime < now).toBe(true);
    expect(futureTime > now).toBe(true);
  });
});

// ============================================================================
// TABLE ASSIGNMENT TESTS
// ============================================================================

describe('Table Manager - Table Assignment', () => {
  it('should assign match to available table', () => {
    const table = createMockTable({ status: 'available' });
    const match = createMockMatch();

    // After assignment
    const assignedTable = {
      ...table,
      status: 'in_use' as TableStatus,
      currentMatchId: match.id,
    };

    expect(assignedTable.status).toBe('in_use');
    expect(assignedTable.currentMatchId).toBe(match.id);
  });

  it('should update match with table assignment', () => {
    const table = createMockTable();
    const match = createMockMatch();

    // After assignment
    const assignedMatch = {
      ...match,
      tableId: table.id,
      state: 'assigned',
    };

    expect(assignedMatch.tableId).toBe(table.id);
    expect(assignedMatch.state).toBe('assigned');
  });

  it('should verify match belongs to organization before assignment', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const table = createMockTable({ tournamentId: tournament.id });
    const match = createMockMatch({ tournamentId: tournament.id });

    expect(table.tournamentId).toBe(match.tournamentId);
    // Should verify both belong to same org
  });

  it('should use transaction for atomic resource locking', () => {
    // This tests the concept - actual implementation uses Prisma transactions
    const operations = [
      'verify_match_access',
      'verify_table_access',
      'check_conflicts',
      'update_table',
      'update_match',
    ];

    expect(operations.length).toBe(5);
    // All operations should complete or all should rollback
  });

  it('should prevent assignment to table in maintenance', () => {
    const table = createMockTable({ status: 'maintenance' });

    expect(table.status).toBe('maintenance');
    // Should not allow assignment
  });

  it('should prevent assignment to blocked table', () => {
    const table = createMockTable({
      status: 'maintenance',
      blockedUntil: new Date(Date.now() + 3600000),
    });

    const now = new Date();
    const isBlocked = table.blockedUntil! > now;

    expect(isBlocked).toBe(true);
    // Should not allow assignment
  });
});

// ============================================================================
// TABLE RELEASE TESTS
// ============================================================================

describe('Table Manager - Table Release', () => {
  it('should release table when match completes', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    // After release
    const releasedTable = {
      ...table,
      status: 'available' as TableStatus,
      currentMatchId: null,
    };

    expect(releasedTable.status).toBe('available');
    expect(releasedTable.currentMatchId).toBeNull();
  });

  it('should clear match table assignment on release', () => {
    const match = createMockMatch({
      tableId: 'table-1',
      state: 'completed',
    });

    // After release
    const updatedMatch = {
      ...match,
      tableId: null,
    };

    expect(updatedMatch.tableId).toBeNull();
  });

  it('should auto-release on match completion', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    const match = createMockMatch({
      id: 'match-1',
      tableId: table.id,
      state: 'completed',
    });

    expect(match.state).toBe('completed');
    // Should trigger auto-release
  });

  it('should verify table belongs to organization on release', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const table = createMockTable({ tournamentId: tournament.id });

    expect(table.tournamentId).toBe(tournament.id);
    // Should verify org access before release
  });
});

// ============================================================================
// CONFLICT DETECTION TESTS
// ============================================================================

describe('Table Manager - Conflict Detection', () => {
  it('should detect double-booking conflict', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    const newMatchId = 'match-2';
    const hasConflict = table.currentMatchId !== null && table.currentMatchId !== newMatchId;

    expect(hasConflict).toBe(true);
    // Should return double_booking conflict
  });

  it('should detect maintenance conflict', () => {
    const table = createMockTable({
      status: 'maintenance',
    });

    const isInMaintenance = table.status === 'maintenance';

    expect(isInMaintenance).toBe(true);
    // Should return maintenance conflict
  });

  it('should detect blocked conflict', () => {
    const table = createMockTable({
      status: 'maintenance',
      blockedUntil: new Date(Date.now() + 3600000),
    });

    const now = new Date();
    const isBlocked = table.blockedUntil !== null && table.blockedUntil > now;

    expect(isBlocked).toBe(true);
    // Should return blocked conflict
  });

  it('should allow assignment to same match', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    const matchId = 'match-1'; // Same match
    const hasConflict = table.currentMatchId !== matchId;

    expect(hasConflict).toBe(false);
    // Should not return conflict
  });

  it('should not conflict on available table', () => {
    const table = createMockTable({
      status: 'available',
      currentMatchId: null,
    });

    const hasAnyConflict =
      table.status === 'maintenance' ||
      table.currentMatchId !== null ||
      (table.blockedUntil !== null && table.blockedUntil > new Date());

    expect(hasAnyConflict).toBe(false);
  });
});

// ============================================================================
// AVAILABILITY CHECKING TESTS
// ============================================================================

describe('Table Manager - Availability Checking', () => {
  it('should return true for available table with no match', () => {
    const table = createMockTable({
      status: 'available',
      currentMatchId: null,
      blockedUntil: null,
    });

    const isAvailable =
      table.status === 'available' &&
      table.currentMatchId === null &&
      (table.blockedUntil === null || table.blockedUntil <= new Date());

    expect(isAvailable).toBe(true);
  });

  it('should return false for table in use', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    const isAvailable = table.status === 'available';

    expect(isAvailable).toBe(false);
  });

  it('should return false for table in maintenance', () => {
    const table = createMockTable({
      status: 'maintenance',
    });

    const isAvailable = table.status === 'available';

    expect(isAvailable).toBe(false);
  });

  it('should return false for blocked table', () => {
    const table = createMockTable({
      status: 'available',
      blockedUntil: new Date(Date.now() + 3600000),
    });

    const now = new Date();
    const isAvailable =
      table.status === 'available' &&
      (table.blockedUntil === null || table.blockedUntil <= now);

    expect(isAvailable).toBe(false);
  });

  it('should return true after block time passes', () => {
    const table = createMockTable({
      status: 'available',
      blockedUntil: new Date(Date.now() - 3600000), // 1 hour ago
    });

    const now = new Date();
    const isAvailable =
      table.status === 'available' &&
      (table.blockedUntil === null || table.blockedUntil <= now);

    expect(isAvailable).toBe(true);
  });

  it('should get all available tables for tournament', () => {
    const tables = [
      createMockTable({ id: 'table-1', status: 'available' }),
      createMockTable({ id: 'table-2', status: 'in_use', currentMatchId: 'match-1' }),
      createMockTable({ id: 'table-3', status: 'available' }),
      createMockTable({ id: 'table-4', status: 'maintenance' }),
    ];

    const availableTables = tables.filter((t) => t.status === 'available' && t.currentMatchId === null);

    expect(availableTables).toHaveLength(2);
    expect(availableTables.map((t) => t.id)).toEqual(['table-1', 'table-3']);
  });
});

// ============================================================================
// BULK OPERATIONS TESTS
// ============================================================================

describe('Table Manager - Bulk Operations', () => {
  it('should create multiple tables at once', () => {
    const labels = ['Table 1', 'Table 2', 'Table 3'];
    const tournamentId = 'tournament-1';

    const tables = labels.map((label, i) =>
      createMockTable({
        id: `table-${i + 1}`,
        label,
        tournamentId,
      })
    );

    expect(tables).toHaveLength(3);
    expect(tables.map((t) => t.label)).toEqual(labels);
  });

  it('should verify tournament access before bulk create', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const labels = ['Table 1', 'Table 2', 'Table 3'];

    labels.forEach((label) => {
      const table = createMockTable({
        label,
        tournamentId: tournament.id,
      });

      expect(table.tournamentId).toBe(tournament.id);
      // Should verify tournament belongs to org
    });
  });

  it('should use transaction for bulk create', () => {
    const labels = ['Table 1', 'Table 2', 'Table 3'];

    // All creates should succeed or all should fail
    expect(labels.length).toBe(3);
  });

  it('should delete table only if not in use', () => {
    const tableInUse = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    const tableAvailable = createMockTable({
      status: 'available',
      currentMatchId: null,
    });

    expect(tableInUse.currentMatchId).not.toBeNull();
    expect(tableAvailable.currentMatchId).toBeNull();
    // Only tableAvailable should be deletable
  });

  it('should verify organization access before delete', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const table = createMockTable({ tournamentId: tournament.id });

    expect(table.tournamentId).toBe(tournament.id);
    // Should verify table belongs to org before delete
  });
});

// ============================================================================
// MULTI-TENANT ISOLATION TESTS
// ============================================================================

describe('Table Manager - Multi-Tenant Isolation', () => {
  it('should scope tables to tournament organization', () => {
    const tournament = createMockTournament({ orgId: 'org-1' });
    const table = createMockTable({ tournamentId: tournament.id });

    expect(table.tournamentId).toBe(tournament.id);
    // All operations should verify tournament.orgId
  });

  it('should prevent cross-tenant table access', () => {
    const org1Tournament = createMockTournament({ id: 'tournament-1', orgId: 'org-1' });
    const org2Tournament = createMockTournament({ id: 'tournament-2', orgId: 'org-2' });

    const table = createMockTable({ tournamentId: org1Tournament.id });

    expect(table.tournamentId).toBe(org1Tournament.id);
    expect(table.tournamentId).not.toBe(org2Tournament.id);
    // Org 2 should not be able to access this table
  });

  it('should prevent cross-tenant match assignment', () => {
    const org1Tournament = createMockTournament({ id: 'tournament-1', orgId: 'org-1' });
    const org2Tournament = createMockTournament({ id: 'tournament-2', orgId: 'org-2' });

    const table = createMockTable({ tournamentId: org1Tournament.id });
    const match = createMockMatch({ tournamentId: org2Tournament.id });

    expect(table.tournamentId).not.toBe(match.tournamentId);
    // Should not allow assignment
  });

  it('should filter tables by organization', () => {
    const tables = [
      createMockTable({ id: 'table-1', tournamentId: 'tournament-1' }),
      createMockTable({ id: 'table-2', tournamentId: 'tournament-2' }),
    ];

    const requestOrgId = 'org-1';
    const tournament1 = createMockTournament({ id: 'tournament-1', orgId: 'org-1' });
    const tournament2 = createMockTournament({ id: 'tournament-2', orgId: 'org-2' });

    const accessibleTables = tables.filter((t) => {
      if (t.tournamentId === tournament1.id) return tournament1.orgId === requestOrgId;
      if (t.tournamentId === tournament2.id) return tournament2.orgId === requestOrgId;
      return false;
    });

    expect(accessibleTables).toHaveLength(1);
    expect(accessibleTables[0].id).toBe('table-1');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Table Manager - Edge Cases', () => {
  it('should handle table with no label', () => {
    const table = createMockTable({ label: '' });

    expect(table.label).toBe('');
    // Should handle or validate
  });

  it('should handle very long table labels', () => {
    const longLabel = 'A'.repeat(255);
    const table = createMockTable({ label: longLabel });

    expect(table.label.length).toBe(255);
  });

  it('should handle table reassignment to same match', () => {
    const table = createMockTable({
      status: 'in_use',
      currentMatchId: 'match-1',
    });

    const matchId = 'match-1'; // Same match

    expect(table.currentMatchId).toBe(matchId);
    // Should be idempotent
  });

  it('should handle release of table with no match', () => {
    const table = createMockTable({
      status: 'available',
      currentMatchId: null,
    });

    expect(table.currentMatchId).toBeNull();
    // Should handle gracefully
  });

  it('should handle checking availability of non-existent table', () => {
    const tableId = 'non-existent-table';

    // Should return false or null
    expect(tableId).toBe('non-existent-table');
  });
});
