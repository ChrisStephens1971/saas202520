/**
 * Table Resource Management System
 * Sprint 2
 *
 * Manages table assignment, availability tracking, and conflict prevention
 * for tournament matches. Ensures proper resource allocation with tenant isolation.
 */

import { prisma } from '@/lib/prisma';
import type { Table, Match } from '@prisma/client';

// ============================================================================
// TYPES
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

// ============================================================================
// TABLE CREATION & MANAGEMENT
// ============================================================================

/**
 * Create a table resource for a tournament
 * Multi-tenant: Tables are scoped to tournament, which is scoped to organization
 */
export async function createTable(
  tournamentId: string,
  label: string,
  orgId: string
): Promise<TableResource> {
  // Verify tournament belongs to organization (tenant isolation)
  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      orgId,
    },
  });

  if (!tournament) {
    throw new Error('Tournament not found or access denied');
  }

  // Check for duplicate label within tournament
  const existing = await prisma.table.findFirst({
    where: {
      tournamentId,
      label,
    },
  });

  if (existing) {
    throw new Error(`Table with label "${label}" already exists in this tournament`);
  }

  const table = await prisma.table.create({
    data: {
      tournamentId,
      label,
      status: 'available',
      blockedUntil: null,
      currentMatchId: null,
    },
  });

  return tableToResource(table);
}

/**
 * Update table status (available, in_use, maintenance)
 */
export async function updateTableStatus(
  tableId: string,
  status: TableStatus,
  orgId: string
): Promise<TableResource> {
  // Verify table belongs to organization's tournament
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      tournament: {
        orgId,
      },
    },
  });

  if (!table) {
    throw new Error('Table not found or access denied');
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: {
      status,
      // Clear current match if moving to maintenance
      ...(status === 'maintenance' && { currentMatchId: null }),
    },
  });

  return tableToResource(updated);
}

/**
 * Block a table until a specific time (for maintenance or events)
 */
export async function blockTableUntil(
  tableId: string,
  blockedUntil: Date,
  orgId: string
): Promise<TableResource> {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      tournament: {
        orgId,
      },
    },
  });

  if (!table) {
    throw new Error('Table not found or access denied');
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: {
      status: 'maintenance',
      blockedUntil,
      currentMatchId: null,
    },
  });

  return tableToResource(updated);
}

/**
 * Unblock a table and make it available
 */
export async function unblockTable(
  tableId: string,
  orgId: string
): Promise<TableResource> {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      tournament: {
        orgId,
      },
    },
  });

  if (!table) {
    throw new Error('Table not found or access denied');
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: {
      status: 'available',
      blockedUntil: null,
    },
  });

  return tableToResource(updated);
}

// ============================================================================
// TABLE ASSIGNMENT
// ============================================================================

/**
 * Assign a match to a table with conflict checking
 * Implements resource locking to prevent double-booking
 */
export async function assignMatchToTable(
  matchId: string,
  tableId: string,
  orgId: string
): Promise<TableAssignment> {
  // Use transaction for atomic resource locking
  return await prisma.$transaction(async (tx) => {
    // Verify match belongs to organization
    const match = await tx.match.findFirst({
      where: {
        id: matchId,
        tournament: {
          orgId,
        },
      },
    });

    if (!match) {
      throw new Error('Match not found or access denied');
    }

    // Verify table belongs to organization
    const table = await tx.table.findFirst({
      where: {
        id: tableId,
        tournament: {
          orgId,
        },
      },
    });

    if (!table) {
      throw new Error('Table not found or access denied');
    }

    // Check for conflicts
    const conflict = await checkTableConflict(tableId, matchId, tx);
    if (conflict) {
      throw new Error(conflict.message);
    }

    // Update table status
    await tx.table.update({
      where: { id: tableId },
      data: {
        status: 'in_use',
        currentMatchId: matchId,
        blockedUntil: null,
      },
    });

    // Update match with table assignment
    await tx.match.update({
      where: { id: matchId },
      data: {
        tableId,
        state: 'assigned',
      },
    });

    return {
      tableId,
      matchId,
      assignedAt: new Date(),
      label: table.label,
    };
  });
}

/**
 * Release a table when a match completes
 */
export async function releaseTable(
  tableId: string,
  orgId: string
): Promise<TableResource> {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      tournament: {
        orgId,
      },
    },
  });

  if (!table) {
    throw new Error('Table not found or access denied');
  }

  // Clear the match assignment
  if (table.currentMatchId) {
    await prisma.match.updateMany({
      where: {
        id: table.currentMatchId,
        tableId,
      },
      data: {
        tableId: null,
      },
    });
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: {
      status: 'available',
      currentMatchId: null,
    },
  });

  return tableToResource(updated);
}

/**
 * Auto-release table when match completes
 * Called automatically by match completion logic
 */
export async function autoReleaseTableOnMatchComplete(
  matchId: string,
  orgId: string
): Promise<void> {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      tournament: {
        orgId,
      },
    },
    include: {
      table: true,
    },
  });

  if (!match || !match.table) {
    return; // No table assigned or match not found
  }

  await releaseTable(match.table.id, orgId);
}

// ============================================================================
// TABLE AVAILABILITY
// ============================================================================

/**
 * Check if a specific table is available
 */
export async function isTableAvailable(
  tableId: string,
  orgId: string
): Promise<boolean> {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      tournament: {
        orgId,
      },
    },
  });

  if (!table) {
    return false;
  }

  return checkAvailability(table);
}

/**
 * Get all available tables for a tournament
 */
export async function getAvailableTables(
  tournamentId: string,
  orgId: string
): Promise<TableAvailability[]> {
  const tables = await prisma.table.findMany({
    where: {
      tournamentId,
      tournament: {
        orgId,
      },
    },
    include: {
      matches: {
        where: {
          id: {
            not: null,
          },
        },
        include: {
          playerA: {
            select: { name: true },
          },
          playerB: {
            select: { name: true },
          },
        },
        take: 1,
        orderBy: {
          startedAt: 'desc',
        },
      },
    },
  });

  return tables.map((table) => {
    const isAvailable = checkAvailability(table);
    const currentMatch = table.currentMatchId
      ? table.matches.find((m) => m.id === table.currentMatchId)
      : null;

    return {
      tableId: table.id,
      label: table.label,
      isAvailable,
      status: table.status as TableStatus,
      ...(currentMatch && {
        currentMatch: {
          id: currentMatch.id,
          round: currentMatch.round,
          position: currentMatch.position,
          players: [
            currentMatch.playerA?.name || 'TBD',
            currentMatch.playerB?.name || 'TBD',
          ],
        },
      }),
      ...(table.blockedUntil && { blockedUntil: table.blockedUntil }),
    };
  });
}

/**
 * Get all tables for a tournament (regardless of availability)
 */
export async function getAllTables(
  tournamentId: string,
  orgId: string
): Promise<TableResource[]> {
  const tables = await prisma.table.findMany({
    where: {
      tournamentId,
      tournament: {
        orgId,
      },
    },
    orderBy: {
      label: 'asc',
    },
  });

  return tables.map(tableToResource);
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Check for table assignment conflicts
 */
async function checkTableConflict(
  tableId: string,
  matchId: string,
  tx: any // Prisma transaction client
): Promise<TableConflict | null> {
  const table = await tx.table.findUnique({
    where: { id: tableId },
  });

  if (!table) {
    return {
      tableId,
      conflictType: 'double_booking',
      message: 'Table not found',
    };
  }

  // Check if table is in maintenance
  if (table.status === 'maintenance') {
    return {
      tableId,
      conflictType: 'maintenance',
      message: `Table "${table.label}" is under maintenance`,
    };
  }

  // Check if table is blocked
  if (table.blockedUntil && table.blockedUntil > new Date()) {
    return {
      tableId,
      conflictType: 'blocked',
      message: `Table "${table.label}" is blocked until ${table.blockedUntil.toISOString()}`,
    };
  }

  // Check for double-booking
  if (table.currentMatchId && table.currentMatchId !== matchId) {
    return {
      tableId,
      conflictType: 'double_booking',
      existingMatchId: table.currentMatchId,
      message: `Table "${table.label}" is already assigned to match ${table.currentMatchId}`,
    };
  }

  return null;
}

/**
 * Public API for checking conflicts before assignment
 */
export async function checkTableAvailability(
  tableId: string,
  matchId: string,
  orgId: string
): Promise<{ available: boolean; conflict?: TableConflict }> {
  return await prisma.$transaction(async (tx) => {
    // Verify table belongs to organization
    const table = await tx.table.findFirst({
      where: {
        id: tableId,
        tournament: {
          orgId,
        },
      },
    });

    if (!table) {
      return {
        available: false,
        conflict: {
          tableId,
          conflictType: 'double_booking',
          message: 'Table not found or access denied',
        },
      };
    }

    const conflict = await checkTableConflict(tableId, matchId, tx);

    return {
      available: !conflict,
      ...(conflict && { conflict }),
    };
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkAvailability(table: Table): boolean {
  if (table.status !== 'available') {
    return false;
  }

  if (table.currentMatchId) {
    return false;
  }

  if (table.blockedUntil && table.blockedUntil > new Date()) {
    return false;
  }

  return true;
}

function tableToResource(table: Table): TableResource {
  return {
    id: table.id,
    tournamentId: table.tournamentId,
    label: table.label,
    status: table.status as TableStatus,
    blockedUntil: table.blockedUntil,
    currentMatchId: table.currentMatchId,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Create multiple tables at once
 */
export async function createTablesBulk(
  tournamentId: string,
  labels: string[],
  orgId: string
): Promise<TableResource[]> {
  // Verify tournament belongs to organization
  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      orgId,
    },
  });

  if (!tournament) {
    throw new Error('Tournament not found or access denied');
  }

  const tables = await prisma.$transaction(
    labels.map((label) =>
      prisma.table.create({
        data: {
          tournamentId,
          label,
          status: 'available',
          blockedUntil: null,
          currentMatchId: null,
        },
      })
    )
  );

  return tables.map(tableToResource);
}

/**
 * Delete a table (only if not in use)
 */
export async function deleteTable(
  tableId: string,
  orgId: string
): Promise<void> {
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      tournament: {
        orgId,
      },
    },
  });

  if (!table) {
    throw new Error('Table not found or access denied');
  }

  if (table.currentMatchId) {
    throw new Error('Cannot delete table that is currently in use');
  }

  await prisma.table.delete({
    where: { id: tableId },
  });
}
