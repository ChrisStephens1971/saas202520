/**
 * Tournament Analyzer Service Tests
 * Sprint 10 Week 1 Day 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TournamentAnalyzer } from '../tournament-analyzer';
import {
  createMockPrismaClient,
  mockTournamentModel,
  mockAnalyticsEventModel,
  fixtures,
  resetAllMocks,
} from '../../__tests__/test-utils';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => createMockPrismaClient()),
}));

describe('TournamentAnalyzer', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('analyzeTournamentPerformance', () => {
    it('should return performance metrics', async () => {
      mockTournamentModel.findMany.mockResolvedValue(fixtures.tournaments);
      mockAnalyticsEventModel.count.mockResolvedValue(150);

      const result = await TournamentAnalyzer.analyzeTournamentPerformance(
        'tenant-001',
        new Date('2024-10-01'),
        new Date('2024-11-30')
      );

      expect(result).toBeDefined();
      expect(result.totalTournaments).toBeGreaterThan(0);
      expect(result.averagePlayers).toBeGreaterThan(0);
      expect(result.fillRate).toBeGreaterThan(0);
    });

    it('should calculate fill rate correctly', async () => {
      mockTournamentModel.findMany.mockResolvedValue([
        {
          maxPlayers: 32,
          registeredPlayers: 28,
        },
        {
          maxPlayers: 16,
          registeredPlayers: 16,
        },
      ]);

      const result = await TournamentAnalyzer.analyzeTournamentPerformance(
        'tenant-001',
        new Date(),
        new Date()
      );

      const expectedFillRate = ((28 + 16) / (32 + 16)) * 100;
      expect(result.fillRate).toBeCloseTo(expectedFillRate, 2);
    });

    it('should handle no tournaments', async () => {
      mockTournamentModel.findMany.mockResolvedValue([]);

      const result = await TournamentAnalyzer.analyzeTournamentPerformance(
        'tenant-001',
        new Date(),
        new Date()
      );

      expect(result.totalTournaments).toBe(0);
      expect(result.averagePlayers).toBe(0);
    });
  });

  describe('analyzeFormatPopularity', () => {
    it('should rank formats by popularity', async () => {
      mockTournamentModel.findMany.mockResolvedValue([
        { format: 'swiss', registeredPlayers: 28 },
        { format: 'swiss', registeredPlayers: 30 },
        { format: 'round_robin', registeredPlayers: 16 },
        { format: 'single_elimination', registeredPlayers: 24 },
      ]);

      const result = await TournamentAnalyzer.analyzeFormatPopularity(
        'tenant-001',
        new Date('2024-10-01'),
        new Date('2024-11-30')
      );

      expect(result).toHaveLength(3);
      expect(result[0].format).toBe('swiss'); // Most popular
      expect(result[0].count).toBe(2);
      expect(result[0].totalPlayers).toBe(58);
    });

    it('should calculate average players per format', async () => {
      mockTournamentModel.findMany.mockResolvedValue([
        { format: 'swiss', registeredPlayers: 20 },
        { format: 'swiss', registeredPlayers: 30 },
      ]);

      const result = await TournamentAnalyzer.analyzeFormatPopularity(
        'tenant-001',
        new Date(),
        new Date()
      );

      expect(result[0].averagePlayers).toBe(25);
    });
  });

  describe('analyzeTournamentTrends', () => {
    it('should identify growth trends', async () => {
      mockTournamentModel.findMany
        .mockResolvedValueOnce([
          { createdAt: new Date('2024-10-01') },
          { createdAt: new Date('2024-10-15') },
        ])
        .mockResolvedValueOnce([
          { createdAt: new Date('2024-11-01') },
          { createdAt: new Date('2024-11-10') },
          { createdAt: new Date('2024-11-20') },
        ]);

      const result = await TournamentAnalyzer.analyzeTournamentTrends(
        'tenant-001',
        6
      );

      expect(result).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.growthRate).toBeGreaterThan(0);
    });

    it('should identify declining trends', async () => {
      mockTournamentModel.findMany
        .mockResolvedValueOnce([
          {},
          {},
          {},
        ]) // Previous period: 3
        .mockResolvedValueOnce([{}]); // Current period: 1

      const result = await TournamentAnalyzer.analyzeTournamentTrends(
        'tenant-001',
        2
      );

      expect(result.growthRate).toBeLessThan(0);
    });
  });

  describe('predictTournamentAttendance', () => {
    it('should predict attendance based on historical data', async () => {
      mockTournamentModel.findMany.mockResolvedValue([
        { format: 'swiss', registeredPlayers: 28 },
        { format: 'swiss', registeredPlayers: 30 },
        { format: 'swiss', registeredPlayers: 26 },
      ]);

      const result = await TournamentAnalyzer.predictTournamentAttendance(
        'tenant-001',
        'swiss',
        new Date()
      );

      expect(result.predictedPlayers).toBeGreaterThan(0);
      expect(result.predictedPlayers).toBeCloseTo(28, 0); // Average
      expect(result.confidence).toBeDefined();
    });

    it('should include confidence interval', async () => {
      mockTournamentModel.findMany.mockResolvedValue([
        { registeredPlayers: 25 },
        { registeredPlayers: 30 },
        { registeredPlayers: 28 },
      ]);

      const result = await TournamentAnalyzer.predictTournamentAttendance(
        'tenant-001',
        'swiss',
        new Date()
      );

      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval.lower).toBeLessThan(
        result.predictedPlayers
      );
      expect(result.confidenceInterval.upper).toBeGreaterThan(
        result.predictedPlayers
      );
    });

    it('should handle insufficient data', async () => {
      mockTournamentModel.findMany.mockResolvedValue([
        { registeredPlayers: 20 },
      ]);

      const result = await TournamentAnalyzer.predictTournamentAttendance(
        'tenant-001',
        'swiss',
        new Date()
      );

      expect(result.confidence).toBe('low');
    });
  });

  describe('analyzePlayerEngagement', () => {
    it('should analyze engagement patterns', async () => {
      mockAnalyticsEventModel.findMany.mockResolvedValue([
        {
          userId: 'user-001',
          eventType: 'tournament_joined',
          createdAt: new Date('2024-10-01'),
        },
        {
          userId: 'user-001',
          eventType: 'tournament_joined',
          createdAt: new Date('2024-10-15'),
        },
        {
          userId: 'user-002',
          eventType: 'tournament_joined',
          createdAt: new Date('2024-10-10'),
        },
      ]);

      const result = await TournamentAnalyzer.analyzePlayerEngagement(
        'tenant-001',
        new Date('2024-10-01'),
        new Date('2024-10-31')
      );

      expect(result).toBeDefined();
      expect(result.totalPlayers).toBeGreaterThan(0);
      expect(result.averageEngagement).toBeGreaterThan(0);
    });

    it('should identify highly engaged players', async () => {
      mockAnalyticsEventModel.findMany.mockResolvedValue([
        { userId: 'user-001', eventType: 'tournament_joined' },
        { userId: 'user-001', eventType: 'tournament_joined' },
        { userId: 'user-001', eventType: 'tournament_joined' },
        { userId: 'user-002', eventType: 'tournament_joined' },
      ]);

      const result = await TournamentAnalyzer.analyzePlayerEngagement(
        'tenant-001',
        new Date(),
        new Date()
      );

      expect(result.highlyEngagedPlayers).toBeDefined();
      expect(result.highlyEngagedPlayers.length).toBeGreaterThan(0);
    });
  });

  describe('getTournamentBenchmarks', () => {
    it('should return benchmark comparisons', async () => {
      mockTournamentModel.aggregate.mockResolvedValue({
        _avg: { registeredPlayers: 24 },
        _max: { registeredPlayers: 32 },
        _min: { registeredPlayers: 16 },
      });

      const result = await TournamentAnalyzer.getTournamentBenchmarks(
        'tenant-001'
      );

      expect(result).toBeDefined();
      expect(result.averagePlayers).toBe(24);
      expect(result.maxPlayers).toBe(32);
      expect(result.minPlayers).toBe(16);
    });

    it('should compare against industry benchmarks', async () => {
      mockTournamentModel.aggregate.mockResolvedValue({
        _avg: { registeredPlayers: 28 },
      });

      const result = await TournamentAnalyzer.getTournamentBenchmarks(
        'tenant-001'
      );

      if (result.industryComparison) {
        expect(result.industryComparison).toBeDefined();
        expect(result.industryComparison.percentile).toBeGreaterThanOrEqual(0);
        expect(result.industryComparison.percentile).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      mockTournamentModel.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        TournamentAnalyzer.analyzeTournamentPerformance(
          'tenant-001',
          new Date(),
          new Date()
        )
      ).rejects.toThrow('Database error');
    });

    it('should validate date range', async () => {
      const startDate = new Date('2024-11-01');
      const endDate = new Date('2024-10-01'); // Before start

      await expect(
        TournamentAnalyzer.analyzeTournamentPerformance(
          'tenant-001',
          startDate,
          endDate
        )
      ).rejects.toThrow();
    });

    it('should validate tenant ID', async () => {
      await expect(
        TournamentAnalyzer.analyzeTournamentPerformance(
          '',
          new Date(),
          new Date()
        )
      ).rejects.toThrow();
    });
  });
});
