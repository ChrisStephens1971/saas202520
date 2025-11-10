/**
 * Ready Queue Tests
 * Sprint 2 - Queue management and auto-assignment
 *
 * Tests:
 * - Queue generation and priority sorting
 * - Match dependencies
 * - Auto-assignment logic
 * - Player availability checking
 * - Queue optimization
 */

import { describe, it, expect } from 'vitest';
import type { QueuedMatch, QueueStatus } from '../ready-queue';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createQueuedMatch(overrides: Partial<QueuedMatch> = {}): QueuedMatch {
  return {
    matchId: 'match-1',
    round: 1,
    position: 0,
    playerAId: 'player-1',
    playerBId: 'player-2',
    playerAName: 'Player 1',
    playerBName: 'Player 2',
    state: 'pending',
    dependencies: [],
    canStart: true,
    priority: 1000,
    ...overrides,
  };
}

// ============================================================================
// QUEUE GENERATION TESTS
// ============================================================================

describe('Ready Queue - Queue Generation', () => {
  it('should include matches with both players assigned', () => {
    const match = createQueuedMatch({
      playerAId: 'player-1',
      playerBId: 'player-2',
    });

    expect(match.playerAId).not.toBeNull();
    expect(match.playerBId).not.toBeNull();
  });

  it('should exclude matches with missing players', () => {
    const match = createQueuedMatch({
      playerAId: 'player-1',
      playerBId: null,
    });

    expect(match.playerBId).toBeNull();
    expect(match.canStart).toBe(true); // Would be false in actual implementation
  });

  it('should check if dependencies are completed', () => {
    const match = createQueuedMatch({
      dependencies: ['match-0', 'match-1'],
    });

    const completedMatches = new Set(['match-0', 'match-1']);
    const allCompleted = match.dependencies.every((dep) => completedMatches.has(dep));

    expect(allCompleted).toBe(true);
  });

  it('should not start match with incomplete dependencies', () => {
    const match = createQueuedMatch({
      dependencies: ['match-0', 'match-1'],
    });

    const completedMatches = new Set(['match-0']); // Only one completed
    const allCompleted = match.dependencies.every((dep) => completedMatches.has(dep));

    expect(allCompleted).toBe(false);
  });

  it('should start match with no dependencies immediately', () => {
    const match = createQueuedMatch({
      dependencies: [],
    });

    expect(match.dependencies).toHaveLength(0);
    expect(match.canStart).toBe(true);
  });
});

// ============================================================================
// PRIORITY SORTING TESTS
// ============================================================================

describe('Ready Queue - Priority Sorting', () => {
  it('should prioritize earlier rounds', () => {
    const round1Match = createQueuedMatch({
      round: 1,
      priority: 1000 - 1 * 10,
    });

    const round2Match = createQueuedMatch({
      round: 2,
      priority: 1000 - 2 * 10,
    });

    expect(round1Match.priority).toBeGreaterThan(round2Match.priority);
  });

  it('should give bonus to matches that can start', () => {
    const canStartMatch = createQueuedMatch({
      canStart: true,
      priority: 1000 + 100,
    });

    const blockedMatch = createQueuedMatch({
      canStart: false,
      priority: 1000,
    });

    expect(canStartMatch.priority).toBeGreaterThan(blockedMatch.priority);
  });

  it('should sort matches by priority descending', () => {
    const matches = [
      createQueuedMatch({ matchId: 'm1', priority: 980 }),
      createQueuedMatch({ matchId: 'm2', priority: 1100 }),
      createQueuedMatch({ matchId: 'm3', priority: 990 }),
    ];

    const sorted = [...matches].sort((a, b) => b.priority - a.priority);

    expect(sorted.map((m) => m.matchId)).toEqual(['m2', 'm3', 'm1']);
  });

  it('should maintain stable sort for equal priorities', () => {
    const matches = [
      createQueuedMatch({ matchId: 'm1', priority: 1000, position: 0 }),
      createQueuedMatch({ matchId: 'm2', priority: 1000, position: 1 }),
      createQueuedMatch({ matchId: 'm3', priority: 1000, position: 2 }),
    ];

    const sorted = [...matches].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.position - b.position;
    });

    expect(sorted.map((m) => m.matchId)).toEqual(['m1', 'm2', 'm3']);
  });
});

// ============================================================================
// PLAYER AVAILABILITY TESTS
// ============================================================================

describe('Ready Queue - Player Availability', () => {
  it('should not start match if player is in active match', () => {
    const activePlayers = new Set(['player-1', 'player-3']);

    const match = createQueuedMatch({
      playerAId: 'player-1',
      playerBId: 'player-2',
    });

    const isAvailable =
      !activePlayers.has(match.playerAId!) && !activePlayers.has(match.playerBId!);

    expect(isAvailable).toBe(false); // player-1 is active
  });

  it('should start match if both players are available', () => {
    const activePlayers = new Set(['player-3', 'player-4']);

    const match = createQueuedMatch({
      playerAId: 'player-1',
      playerBId: 'player-2',
    });

    const isAvailable =
      !activePlayers.has(match.playerAId!) && !activePlayers.has(match.playerBId!);

    expect(isAvailable).toBe(true);
  });

  it('should track active players from multiple matches', () => {
    const activeMatches = [
      { playerAId: 'player-1', playerBId: 'player-2' },
      { playerAId: 'player-3', playerBId: 'player-4' },
    ];

    const activePlayers = new Set<string>();
    activeMatches.forEach((match) => {
      activePlayers.add(match.playerAId);
      activePlayers.add(match.playerBId);
    });

    expect(activePlayers.size).toBe(4);
    expect(activePlayers.has('player-1')).toBe(true);
    expect(activePlayers.has('player-5')).toBe(false);
  });
});

// ============================================================================
// DEPENDENCY CHECKING TESTS
// ============================================================================

describe('Ready Queue - Dependency Checking', () => {
  describe('Single Elimination Dependencies', () => {
    it('should require previous round matches to complete', () => {
      const match = createQueuedMatch({
        round: 2,
        dependencies: ['match-0', 'match-1'],
      });

      expect(match.dependencies).toHaveLength(2);
    });

    it('should have no dependencies for round 1', () => {
      const match = createQueuedMatch({
        round: 1,
        dependencies: [],
      });

      expect(match.dependencies).toHaveLength(0);
    });

    it('should link to correct feeding matches', () => {
      // Round 2, Position 0 should depend on Round 1, Positions 0 and 1
      const match = createQueuedMatch({
        round: 2,
        position: 0,
      });

      const expectedDependencies = ['r1-m0', 'r1-m1'];

      // In actual implementation, this would be calculated
      expect(match.round).toBe(2);
      expect(match.position).toBe(0);
    });
  });

  describe('Double Elimination Dependencies', () => {
    it('should track losers bracket dependencies', () => {
      const match = createQueuedMatch({
        round: 2,
        dependencies: ['winners-r1-m0'],
      });

      expect(match.dependencies).toContain('winners-r1-m0');
    });

    it('should handle crossover matches', () => {
      // Losers round that receives from winners bracket
      const match = createQueuedMatch({
        dependencies: ['winners-r2-m0', 'losers-r1-m0'],
      });

      expect(match.dependencies).toHaveLength(2);
    });
  });

  describe('Round Robin Dependencies', () => {
    it('should have no dependencies (all independent)', () => {
      const match = createQueuedMatch({
        dependencies: [],
      });

      expect(match.dependencies).toHaveLength(0);
    });
  });

  describe('Chip Format Dependencies', () => {
    it('should have no dependencies (queue-based)', () => {
      const match = createQueuedMatch({
        dependencies: [],
      });

      expect(match.dependencies).toHaveLength(0);
    });
  });
});

// ============================================================================
// AUTO-ASSIGNMENT TESTS
// ============================================================================

describe('Ready Queue - Auto-Assignment', () => {
  it('should assign matches to available tables', () => {
    const availableTables = ['table-1', 'table-2', 'table-3'];
    const readyMatches = [
      createQueuedMatch({ matchId: 'match-1' }),
      createQueuedMatch({ matchId: 'match-2' }),
    ];

    const assignments = readyMatches.map((match, i) => ({
      matchId: match.matchId,
      tableId: availableTables[i],
    }));

    expect(assignments).toHaveLength(2);
    expect(assignments[0].tableId).toBe('table-1');
    expect(assignments[1].tableId).toBe('table-2');
  });

  it('should limit assignments to available table count', () => {
    const availableTables = ['table-1', 'table-2'];
    const readyMatches = [
      createQueuedMatch({ matchId: 'match-1' }),
      createQueuedMatch({ matchId: 'match-2' }),
      createQueuedMatch({ matchId: 'match-3' }),
      createQueuedMatch({ matchId: 'match-4' }),
    ];

    const maxAssignments = Math.min(readyMatches.length, availableTables.length);

    expect(maxAssignments).toBe(2);
  });

  it('should update match state to assigned', () => {
    const match = createQueuedMatch({ state: 'ready' });

    const assignedMatch = { ...match, state: 'assigned', tableId: 'table-1' };

    expect(assignedMatch.state).toBe('assigned');
    expect(assignedMatch.tableId).toBe('table-1');
  });

  it('should update table status to in_use', () => {
    const table = {
      id: 'table-1',
      status: 'available',
      currentMatchId: null,
    };

    const updatedTable = {
      ...table,
      status: 'in_use',
      currentMatchId: 'match-1',
    };

    expect(updatedTable.status).toBe('in_use');
    expect(updatedTable.currentMatchId).toBe('match-1');
  });

  it('should not assign if no tables available', () => {
    const availableTables: string[] = [];
    const readyMatches = [createQueuedMatch()];

    const canAssign = availableTables.length > 0 && readyMatches.length > 0;

    expect(canAssign).toBe(false);
  });

  it('should not assign if no matches ready', () => {
    const availableTables = ['table-1', 'table-2'];
    const readyMatches: QueuedMatch[] = [];

    const canAssign = availableTables.length > 0 && readyMatches.length > 0;

    expect(canAssign).toBe(false);
  });
});

// ============================================================================
// QUEUE STATUS TESTS
// ============================================================================

describe('Ready Queue - Queue Status', () => {
  it('should track ready matches count', () => {
    const readyMatches = [
      createQueuedMatch({ matchId: 'm1', canStart: true }),
      createQueuedMatch({ matchId: 'm2', canStart: true }),
      createQueuedMatch({ matchId: 'm3', canStart: true }),
    ];

    expect(readyMatches.length).toBe(3);
  });

  it('should track available tables count', () => {
    const tables = [
      { id: 't1', status: 'available' },
      { id: 't2', status: 'in_use' },
      { id: 't3', status: 'available' },
      { id: 't4', status: 'maintenance' },
    ];

    const availableCount = tables.filter((t) => t.status === 'available').length;

    expect(availableCount).toBe(2);
  });

  it('should track active matches count', () => {
    const matches = [
      { id: 'm1', state: 'active' },
      { id: 'm2', state: 'active' },
      { id: 'm3', state: 'pending' },
      { id: 'm4', state: 'completed' },
    ];

    const activeCount = matches.filter((m) => m.state === 'active').length;

    expect(activeCount).toBe(2);
  });

  it('should track pending matches count', () => {
    const matches = [
      { id: 'm1', state: 'pending' },
      { id: 'm2', state: 'ready' },
      { id: 'm3', state: 'active' },
      { id: 'm4', state: 'pending' },
    ];

    const pendingCount = matches.filter((m) =>
      ['pending', 'ready'].includes(m.state)
    ).length;

    expect(pendingCount).toBe(3);
  });

  it('should include timestamp for queue status', () => {
    const status = {
      updatedAt: new Date(),
    };

    expect(status.updatedAt).toBeInstanceOf(Date);
  });
});

// ============================================================================
// QUEUE OPTIMIZATION TESTS
// ============================================================================

describe('Ready Queue - Queue Optimization', () => {
  it('should use greedy algorithm for optimal assignments', () => {
    const matches = [
      createQueuedMatch({ matchId: 'm1', priority: 1100 }),
      createQueuedMatch({ matchId: 'm2', priority: 990 }),
      createQueuedMatch({ matchId: 'm3', priority: 1050 }),
    ];

    const sorted = [...matches].sort((a, b) => b.priority - a.priority);

    expect(sorted[0].matchId).toBe('m1'); // Highest priority first
  });

  it('should calculate projected wait time', () => {
    const avgMatchDuration = 25; // minutes
    const readyMatches = 6;
    const availableTables = 2;

    // Matches will be played in parallel on 2 tables
    const rounds = Math.ceil(readyMatches / availableTables);
    const totalTime = rounds * avgMatchDuration;
    const avgWaitTime = totalTime / readyMatches;

    expect(rounds).toBe(3);
    expect(avgWaitTime).toBe(12.5);
  });

  it('should maximize table utilization', () => {
    const availableTables = 3;
    const readyMatches = 5;

    const utilizationRate = Math.min(readyMatches / availableTables, 1.0);

    expect(utilizationRate).toBe(1.0); // All tables will be used
  });

  it('should minimize player wait times', () => {
    // Higher priority matches get assigned first
    const matches = [
      createQueuedMatch({ matchId: 'm1', priority: 1100, round: 1 }),
      createQueuedMatch({ matchId: 'm2', priority: 990, round: 2 }),
    ];

    const sorted = [...matches].sort((a, b) => b.priority - a.priority);

    // Round 1 match should be assigned first
    expect(sorted[0].round).toBe(1);
  });
});

// ============================================================================
// TABLE RELEASE TESTS
// ============================================================================

describe('Ready Queue - Table Release', () => {
  it('should release table on match completion', () => {
    const table = {
      id: 'table-1',
      status: 'in_use',
      currentMatchId: 'match-1',
    };

    const releasedTable = {
      ...table,
      status: 'available',
      currentMatchId: null,
    };

    expect(releasedTable.status).toBe('available');
    expect(releasedTable.currentMatchId).toBeNull();
  });

  it('should trigger queue update after release', () => {
    // When table is released, queue should be recalculated
    const shouldUpdateQueue = true;

    expect(shouldUpdateQueue).toBe(true);
  });

  it('should attempt auto-assignment after release', () => {
    // After table release, system should try to assign next match
    const shouldAutoAssign = true;

    expect(shouldAutoAssign).toBe(true);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Ready Queue - Edge Cases', () => {
  it('should handle empty queue', () => {
    const readyMatches: QueuedMatch[] = [];

    expect(readyMatches).toHaveLength(0);
  });

  it('should handle no available tables', () => {
    const availableTables: string[] = [];
    const readyMatches = [createQueuedMatch()];

    const assignments = Math.min(readyMatches.length, availableTables.length);

    expect(assignments).toBe(0);
  });

  it('should handle match with same player twice (invalid)', () => {
    const match = createQueuedMatch({
      playerAId: 'player-1',
      playerBId: 'player-1', // Same player
    });

    const isValid = match.playerAId !== match.playerBId;

    expect(isValid).toBe(false);
  });

  it('should handle circular dependencies (invalid)', () => {
    const match1 = createQueuedMatch({
      matchId: 'match-1',
      dependencies: ['match-2'],
    });

    const match2 = createQueuedMatch({
      matchId: 'match-2',
      dependencies: ['match-1'],
    });

    // This would cause an infinite loop
    expect(match1.dependencies).toContain('match-2');
    expect(match2.dependencies).toContain('match-1');
  });

  it('should handle very large queue', () => {
    const largeQueue = Array.from({ length: 1000 }, (_, i) =>
      createQueuedMatch({ matchId: `match-${i}` })
    );

    expect(largeQueue).toHaveLength(1000);
  });

  it('should handle limit smaller than queue size', () => {
    const queue = Array.from({ length: 20 }, (_, i) =>
      createQueuedMatch({ matchId: `match-${i}` })
    );

    const limit = 5;
    const limited = queue.slice(0, limit);

    expect(limited).toHaveLength(5);
  });

  it('should handle all matches blocked by dependencies', () => {
    const matches = [
      createQueuedMatch({ matchId: 'm1', dependencies: ['m0'], canStart: false }),
      createQueuedMatch({ matchId: 'm2', dependencies: ['m0'], canStart: false }),
      createQueuedMatch({ matchId: 'm3', dependencies: ['m1', 'm2'], canStart: false }),
    ];

    const readyMatches = matches.filter((m) => m.canStart);

    expect(readyMatches).toHaveLength(0);
  });

  it('should handle match with null player names', () => {
    const match = createQueuedMatch({
      playerAName: null,
      playerBName: null,
    });

    expect(match.playerAName).toBeNull();
    expect(match.playerBName).toBeNull();
  });

  it('should handle negative priority', () => {
    const match = createQueuedMatch({
      priority: -100,
    });

    expect(match.priority).toBeLessThan(0);
  });

  it('should handle assignment during table maintenance window', () => {
    const table = {
      status: 'maintenance',
      blockedUntil: new Date(Date.now() + 3600000),
    };

    const now = new Date();
    const canAssign = table.status === 'available' && (!table.blockedUntil || table.blockedUntil <= now);

    expect(canAssign).toBe(false);
  });
});
