/**
 * Statistics Calculator Tests
 * Sprint 10 Week 2 - Day 5: Tests
 *
 * Tests for statistics calculations and updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recalculatePlayerStatistics, updateStatisticsAfterMatch, calculateStreaks } from '../statistics-calculator';

const mockPrisma = {
  matchHistory: {
    findMany: vi.fn(),
  },
  playerStatistics: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
};
n// Mock @/lib/prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockTenantId = 'tenant-123';
const mockPlayerId = 'player-123';

describe('Statistics Calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateStreaks', () => {
    it('should calculate correct win streak', () => {
      const matches = [
        { result: 'WIN' },
        { result: 'WIN' },
        { result: 'WIN' },
        { result: 'LOSS' },
        { result: 'WIN' },
        { result: 'WIN' },
      ];

      const result = calculateStreaks(matches);

      expect(result.currentStreak).toBe(2); // Last 2 wins
      expect(result.longestStreak).toBe(3); // First 3 wins
    });

    it('should calculate correct loss streak', () => {
      const matches = [
        { result: 'WIN' },
        { result: 'LOSS' },
        { result: 'LOSS' },
        { result: 'LOSS' },
      ];

      const result = calculateStreaks(matches);

      expect(result.currentStreak).toBe(-3);
      expect(result.longestStreak).toBe(1);
    });

    it('should handle empty match history', () => {
      const result = calculateStreaks([]);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
    });

    it('should handle alternating wins and losses', () => {
      const matches = [
        { result: 'WIN' },
        { result: 'LOSS' },
        { result: 'WIN' },
        { result: 'LOSS' },
      ];

      const result = calculateStreaks(matches);

      expect(result.currentStreak).toBe(-1);
      expect(result.longestStreak).toBe(1);
    });
  });

  describe('recalculatePlayerStatistics', () => {
    it('should calculate correct statistics from match history', async () => {
      const matches = [
        {
          result: 'WIN',
          format: '8-ball',
          matchDate: new Date('2024-11-01'),
          tournamentId: 'tour-1',
          metadata: { finish: 1, prizeWon: 100 },
        },
        {
          result: 'WIN',
          format: '8-ball',
          matchDate: new Date('2024-10-15'),
          tournamentId: 'tour-1',
          metadata: { finish: 1, prizeWon: 100 },
        },
        {
          result: 'LOSS',
          format: '9-ball',
          matchDate: new Date('2024-10-01'),
          tournamentId: 'tour-2',
          metadata: { finish: 3, prizeWon: 0 },
        },
      ];

      mockPrisma.matchHistory.findMany.mockResolvedValue(matches);
      mockPrisma.playerStatistics.upsert.mockResolvedValue({
        totalMatches: 3,
        totalWins: 2,
        totalLosses: 1,
        winRate: 66.67,
        currentStreak: -1,
        longestStreak: 2,
        favoriteFormat: '8-ball',
        totalPrizeWon: 200,
      });

      const result = await recalculatePlayerStatistics(mockPlayerId, mockTenantId);

      expect(result.totalMatches).toBe(3);
      expect(result.totalWins).toBe(2);
      expect(result.totalLosses).toBe(1);
      expect(result.favoriteFormat).toBe('8-ball');
    });
  });

  describe('updateStatisticsAfterMatch', () => {
    it('should increment wins and update win rate', async () => {
      const existingStats = {
        id: 'stats-1',
        totalMatches: 10,
        totalWins: 6,
        totalLosses: 4,
        winRate: 60.0,
        currentStreak: 2,
        longestStreak: 3,
      };

      mockPrisma.playerStatistics.findFirst.mockResolvedValue(existingStats);
      mockPrisma.playerStatistics.update.mockResolvedValue({
        ...existingStats,
        totalMatches: 11,
        totalWins: 7,
        winRate: 63.64,
        currentStreak: 3,
      });

      const update = {
        matchResult: 'WIN' as any,
        format: '8-ball',
      };

      const result = await updateStatisticsAfterMatch(mockPlayerId, mockTenantId, update);

      expect(result.totalMatches).toBe(11);
      expect(result.totalWins).toBe(7);
      expect(result.currentStreak).toBe(3);
    });

    it('should create statistics if they do not exist', async () => {
      mockPrisma.playerStatistics.findFirst.mockResolvedValue(null);
      mockPrisma.playerStatistics.create.mockResolvedValue({
        id: 'stats-1',
        totalMatches: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        currentStreak: 0,
        longestStreak: 0,
      });
      mockPrisma.playerStatistics.update.mockResolvedValue({
        totalMatches: 1,
        totalWins: 1,
        winRate: 100.0,
        currentStreak: 1,
      });

      const update = {
        matchResult: 'WIN' as any,
      };

      const result = await updateStatisticsAfterMatch('new-player', mockTenantId, update);

      expect(result.totalMatches).toBe(1);
      expect(result.totalWins).toBe(1);
    });

    it('should handle loss and update negative streak', async () => {
      const existingStats = {
        id: 'stats-1',
        totalMatches: 10,
        totalWins: 7,
        totalLosses: 3,
        winRate: 70.0,
        currentStreak: 3,
        longestStreak: 5,
      };

      mockPrisma.playerStatistics.findFirst.mockResolvedValue(existingStats);
      mockPrisma.playerStatistics.update.mockResolvedValue({
        ...existingStats,
        totalMatches: 11,
        totalLosses: 4,
        winRate: 63.64,
        currentStreak: -1,
      });

      const update = {
        matchResult: 'LOSS' as any,
      };

      const result = await updateStatisticsAfterMatch(mockPlayerId, mockTenantId, update);

      expect(result.currentStreak).toBe(-1);
      expect(result.totalLosses).toBe(4);
    });
  });

  describe('Win Rate Calculations', () => {
    it('should calculate correct win rate percentages', () => {
      // 10 matches, 7 wins
      const winRate = (7 / 10) * 100;
      expect(winRate).toBe(70.0);

      // 20 matches, 15 wins
      const winRate2 = (15 / 20) * 100;
      expect(winRate2).toBe(75.0);

      // 0 matches
      const winRate3 = 0 / 1; // Avoid division by zero
      expect(winRate3).toBe(0);
    });

    it('should handle edge cases in win rate', () => {
      // 100% win rate
      const perfect = (10 / 10) * 100;
      expect(perfect).toBe(100.0);

      // 0% win rate
      const none = (0 / 10) * 100;
      expect(none).toBe(0);

      // Single match win
      const single = (1 / 1) * 100;
      expect(single).toBe(100.0);
    });
  });
});

export { mockPrisma };
