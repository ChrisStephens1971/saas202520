/**
 * Unit Tests: Chip Format System
 * Tests chip tracking, queue management, and finals cutoff
 * Sprint 4 - CHIP-001, CHIP-002, CHIP-003
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { awardChips, adjustChips, getChipStandings, getChipStats } from '@/lib/chip-tracker';
import { assignNextMatch, assignMatchBatch, getQueueStats } from '@/lib/chip-format-engine';
import { applyFinalsCutoff } from '@/lib/finals-cutoff';
import type { ChipConfig } from '@/lib/chip-tracker';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    match: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
    },
    chipAward: {
      create: vi.fn(),
    },
    tournamentEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      player: {
        update: vi.fn(),
      },
      tournamentEvent: {
        create: vi.fn(),
      },
    })),
  },
}));

describe('Chip Format System - Chip Tracker', () => {
  const mockChipConfig: ChipConfig = {
    winnerChips: 3,
    loserChips: 1,
    qualificationRounds: 5,
    finalsCount: 8,
    pairingStrategy: 'random',
    allowDuplicatePairings: false,
    tiebreaker: 'head_to_head',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('awardChips', () => {
    it('should award chips to both winner and loser', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Mock players
      vi.mocked(prisma.player.findUnique)
        .mockResolvedValueOnce({
          id: 'winner-id',
          name: 'Winner',
          chipCount: 10,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 1,
          wins: 2,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'loser-id',
          name: 'Loser',
          chipCount: 5,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1400,
          rank: 2,
          wins: 1,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      vi.mocked(prisma.player.update)
        .mockResolvedValueOnce({
          id: 'winner-id',
          name: 'Winner',
          chipCount: 13, // 10 + 3
          matchesPlayed: 3,
          chipHistory: [{ matchId: 'match-1', chipsEarned: 3, timestamp: new Date() }],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 1,
          wins: 3,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'loser-id',
          name: 'Loser',
          chipCount: 6, // 5 + 1
          matchesPlayed: 3,
          chipHistory: [{ matchId: 'match-1', chipsEarned: 1, timestamp: new Date() }],
          tournamentId: 'tournament-1',
          rating: 1400,
          rank: 2,
          wins: 1,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const result = await awardChips('match-1', 'winner-id', 'loser-id', mockChipConfig);

      expect(result.winner.chipCount).toBe(13);
      expect(result.loser.chipCount).toBe(6);
      expect(result.winner.matchesPlayed).toBe(3);
      expect(result.loser.matchesPlayed).toBe(3);
    });

    it('should throw error if players not found', async () => {
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.player.findUnique).mockResolvedValue(null);

      await expect(
        awardChips('match-1', 'invalid-winner', 'invalid-loser', mockChipConfig)
      ).rejects.toThrow('Players not found');
    });
  });

  describe('adjustChips', () => {
    it('should manually adjust chips for a player', async () => {
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: 'player-1',
        name: 'Test Player',
        chipCount: 10,
        matchesPlayed: 3,
        chipHistory: [],
        tournamentId: 'tournament-1',
        rating: 1500,
        rank: 1,
        wins: 2,
        losses: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.player.update).mockResolvedValue({
        id: 'player-1',
        name: 'Test Player',
        chipCount: 15, // 10 + 5
        matchesPlayed: 3,
        chipHistory: [{ matchId: 'manual-123', chipsEarned: 5, timestamp: new Date() }],
        tournamentId: 'tournament-1',
        rating: 1500,
        rank: 1,
        wins: 2,
        losses: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await adjustChips('player-1', 5, 'TD correction');

      expect(result.chipCount).toBe(15);
    });

    it('should handle negative adjustments', async () => {
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.player.findUnique).mockResolvedValue({
        id: 'player-1',
        name: 'Test Player',
        chipCount: 10,
        matchesPlayed: 3,
        chipHistory: [],
        tournamentId: 'tournament-1',
        rating: 1500,
        rank: 1,
        wins: 2,
        losses: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.player.update).mockResolvedValue({
        id: 'player-1',
        name: 'Test Player',
        chipCount: 7, // 10 - 3
        matchesPlayed: 3,
        chipHistory: [{ matchId: 'manual-456', chipsEarned: -3, timestamp: new Date() }],
        tournamentId: 'tournament-1',
        rating: 1500,
        rank: 1,
        wins: 2,
        losses: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await adjustChips('player-1', -3, 'Penalty');

      expect(result.chipCount).toBe(7);
    });
  });

  describe('getChipStandings', () => {
    it('should return players ranked by chip count', async () => {
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Top Player',
          chipCount: 20,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1600,
          rank: 1,
          wins: 5,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Second Player',
          chipCount: 15,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 2,
          wins: 4,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-3',
          name: 'Third Player',
          chipCount: 10,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1400,
          rank: 3,
          wins: 3,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const standings = await getChipStandings('tournament-1');

      expect(standings).toHaveLength(3);
      expect(standings[0].chipCount).toBe(20);
      expect(standings[0].rank).toBe(1);
      expect(standings[1].chipCount).toBe(15);
      expect(standings[1].rank).toBe(2);
      expect(standings[2].chipCount).toBe(10);
      expect(standings[2].rank).toBe(3);
    });
  });

  describe('getChipStats', () => {
    it('should calculate tournament chip statistics', async () => {
      const { prisma } = await import('@/lib/prisma');

      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 20,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1600,
          rank: 1,
          wins: 5,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Player 2',
          chipCount: 15,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 2,
          wins: 4,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-3',
          name: 'Player 3',
          chipCount: 10,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1400,
          rank: 3,
          wins: 3,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const stats = await getChipStats('tournament-1');

      expect(stats.totalChips).toBe(45); // 20 + 15 + 10
      expect(stats.averageChips).toBe(15); // 45 / 3
      expect(stats.maxChips).toBe(20);
      expect(stats.minChips).toBe(10);
      expect(stats.activePlayers).toBe(3);
    });
  });
});

describe('Chip Format System - Queue Management', () => {
  const mockChipConfig: ChipConfig = {
    winnerChips: 3,
    loserChips: 1,
    qualificationRounds: 5,
    finalsCount: 8,
    pairingStrategy: 'chip_diff',
    allowDuplicatePairings: false,
    tiebreaker: 'head_to_head',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignNextMatch', () => {
    it('should assign match from available players in queue', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Mock available players
      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 10,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 1,
          wins: 2,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Player 2',
          chipCount: 8,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1450,
          rank: 2,
          wins: 1,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Mock active matches
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);

      // Mock match creation
      vi.mocked(prisma.match.create).mockResolvedValue({
        id: 'match-1',
        tournamentId: 'tournament-1',
        playerAId: 'player-1',
        playerBId: 'player-2',
        tableNumber: null,
        state: 'pending',
        score: { playerA: 0, playerB: 0, raceTo: 9, games: [] },
        winnerId: null,
        startedAt: null,
        completedAt: null,
        rev: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const assignment = await assignNextMatch('tournament-1', mockChipConfig);

      expect(assignment).toBeDefined();
      expect(assignment?.match.playerAId).toBe('player-1');
      expect(assignment?.match.playerBId).toBe('player-2');
    });

    it('should return null when not enough players available', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Mock only one player available
      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 10,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 1,
          wins: 2,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.match.findMany).mockResolvedValue([]);

      const assignment = await assignNextMatch('tournament-1', mockChipConfig);

      expect(assignment).toBeNull();
    });
  });

  describe('assignMatchBatch', () => {
    it('should assign multiple matches from queue', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Mock available players (4 players = 2 matches)
      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 15,
          matchesPlayed: 3,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1600,
          rank: 1,
          wins: 3,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Player 2',
          chipCount: 12,
          matchesPlayed: 3,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1550,
          rank: 2,
          wins: 2,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-3',
          name: 'Player 3',
          chipCount: 10,
          matchesPlayed: 3,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 3,
          wins: 2,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-4',
          name: 'Player 4',
          chipCount: 8,
          matchesPlayed: 3,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1450,
          rank: 4,
          wins: 1,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.match.findMany).mockResolvedValue([]);

      vi.mocked(prisma.match.create)
        .mockResolvedValueOnce({
          id: 'match-1',
          tournamentId: 'tournament-1',
          playerAId: 'player-1',
          playerBId: 'player-2',
          tableNumber: null,
          state: 'pending',
          score: { playerA: 0, playerB: 0, raceTo: 9, games: [] },
          winnerId: null,
          startedAt: null,
          completedAt: null,
          rev: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'match-2',
          tournamentId: 'tournament-1',
          playerAId: 'player-3',
          playerBId: 'player-4',
          tableNumber: null,
          state: 'pending',
          score: { playerA: 0, playerB: 0, raceTo: 9, games: [] },
          winnerId: null,
          startedAt: null,
          completedAt: null,
          rev: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const assignments = await assignMatchBatch('tournament-1', mockChipConfig, 2);

      expect(assignments).toHaveLength(2);
      expect(assignments[0].match.id).toBe('match-1');
      expect(assignments[1].match.id).toBe('match-2');
    });
  });

  describe('getQueueStats', () => {
    it('should calculate queue statistics', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Mock players in queue
      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 10,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 1,
          wins: 2,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Player 2',
          chipCount: 8,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1450,
          rank: 2,
          wins: 1,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-3',
          name: 'Player 3',
          chipCount: 6,
          matchesPlayed: 2,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1400,
          rank: 3,
          wins: 1,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Mock active matches
      vi.mocked(prisma.match.findMany).mockResolvedValue([
        {
          id: 'match-1',
          tournamentId: 'tournament-1',
          playerAId: 'player-4',
          playerBId: 'player-5',
          tableNumber: 1,
          state: 'active',
          score: { playerA: 2, playerB: 1, raceTo: 9, games: [] },
          winnerId: null,
          startedAt: new Date(),
          completedAt: null,
          rev: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const stats = await getQueueStats('tournament-1');

      expect(stats.playersInQueue).toBe(3);
      expect(stats.activeMatches).toBe(1);
      expect(stats.availableForPairing).toBe(3);
    });
  });
});

describe('Chip Format System - Finals Cutoff', () => {
  const mockChipConfig: ChipConfig = {
    winnerChips: 3,
    loserChips: 1,
    qualificationRounds: 5,
    finalsCount: 4,
    pairingStrategy: 'random',
    allowDuplicatePairings: false,
    tiebreaker: 'head_to_head',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyFinalsCutoff', () => {
    it('should select top N players for finals', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Mock 6 players, top 4 should qualify
      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 20,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1600,
          rank: 1,
          wins: 5,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Player 2',
          chipCount: 18,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1580,
          rank: 2,
          wins: 4,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-3',
          name: 'Player 3',
          chipCount: 15,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1550,
          rank: 3,
          wins: 4,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-4',
          name: 'Player 4',
          chipCount: 12,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1520,
          rank: 4,
          wins: 3,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-5',
          name: 'Player 5',
          chipCount: 10,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 5,
          wins: 3,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-6',
          name: 'Player 6',
          chipCount: 8,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1480,
          rank: 6,
          wins: 2,
          losses: 3,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.player.update).mockResolvedValue({} as never);
      vi.mocked(prisma.tournamentEvent.create).mockResolvedValue({} as never);

      const result = await applyFinalsCutoff('tournament-1', mockChipConfig);

      expect(result.finalists).toHaveLength(4);
      expect(result.eliminated).toHaveLength(2);
      expect(result.finalists[0].id).toBe('player-1');
      expect(result.eliminated[0].id).toBe('player-5');
    });

    it('should handle ties at cutoff line', async () => {
      const { prisma } = await import('@/lib/prisma');

      // Players with tie at 4th place (both have 12 chips)
      vi.mocked(prisma.player.findMany).mockResolvedValue([
        {
          id: 'player-1',
          name: 'Player 1',
          chipCount: 20,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1600,
          rank: 1,
          wins: 5,
          losses: 0,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-2',
          name: 'Player 2',
          chipCount: 18,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1580,
          rank: 2,
          wins: 4,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-3',
          name: 'Player 3',
          chipCount: 15,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1550,
          rank: 3,
          wins: 4,
          losses: 1,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-4',
          name: 'Player 4',
          chipCount: 12,
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1520,
          rank: 4,
          wins: 3,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'player-5',
          name: 'Player 5',
          chipCount: 12, // Tied with player 4
          matchesPlayed: 5,
          chipHistory: [],
          tournamentId: 'tournament-1',
          rating: 1500,
          rank: 5,
          wins: 3,
          losses: 2,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(prisma.player.update).mockResolvedValue({} as never);
      vi.mocked(prisma.tournamentEvent.create).mockResolvedValue({} as never);

      const result = await applyFinalsCutoff('tournament-1', mockChipConfig);

      // Should have tiebreakers noted
      expect(result.tiebreakers).toBeDefined();
      expect(result.finalists.length + result.eliminated.length).toBe(5);
    });
  });
});
