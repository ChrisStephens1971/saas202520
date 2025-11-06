/**
 * Revenue Calculator Service Tests
 * Sprint 10 Week 1 Day 5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RevenueCalculator } from '../revenue-calculator';
import {
  createMockPrismaClient,
  mockRevenueMetricsModel,
  mockSubscriptionModel,
  fixtures,
  resetAllMocks,
  dateHelpers,
} from '../../__tests__/test-utils';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => createMockPrismaClient()),
}));

describe('RevenueCalculator', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateMRR', () => {
    it('should calculate MRR correctly for current period', async () => {
      mockRevenueMetricsModel.findFirst.mockResolvedValue(
        fixtures.revenueMetrics.current
      );
      mockRevenueMetricsModel.aggregate.mockResolvedValue({
        _sum: { mrr: 15000 },
        _count: { id: 1 },
      });

      const result = await RevenueCalculator.calculateMRR(
        'tenant-001',
        new Date('2024-11-01')
      );

      expect(result).toBeDefined();
      expect(result.mrr).toBe(15000);
      expect(result.arr).toBe(180000);
      expect(result.confidence).toBe('high');
    });

    it('should include previous period for comparison', async () => {
      mockRevenueMetricsModel.findFirst
        .mockResolvedValueOnce(fixtures.revenueMetrics.current)
        .mockResolvedValueOnce(fixtures.revenueMetrics.previous);

      const result = await RevenueCalculator.calculateMRR(
        'tenant-001',
        new Date('2024-11-01')
      );

      expect(result.previousPeriod).toBeDefined();
      expect(result.previousPeriod?.mrr).toBe(14000);
      expect(result.growthRate).toBeGreaterThan(0);
    });

    it('should handle missing data gracefully', async () => {
      mockRevenueMetricsModel.findFirst.mockResolvedValue(null);
      mockRevenueMetricsModel.aggregate.mockResolvedValue({
        _sum: { mrr: null },
        _count: { id: 0 },
      });

      const result = await RevenueCalculator.calculateMRR(
        'invalid-tenant',
        new Date()
      );

      expect(result.mrr).toBe(0);
      expect(result.arr).toBe(0);
      expect(result.confidence).toBe('low');
    });

    it('should calculate growth rate correctly', async () => {
      mockRevenueMetricsModel.findFirst
        .mockResolvedValueOnce(fixtures.revenueMetrics.current) // current: 15000
        .mockResolvedValueOnce(fixtures.revenueMetrics.previous); // previous: 14000

      const result = await RevenueCalculator.calculateMRR(
        'tenant-001',
        new Date('2024-11-01')
      );

      const expectedGrowth = ((15000 - 14000) / 14000) * 100;
      expect(result.growthRate).toBeCloseTo(expectedGrowth, 2);
    });
  });

  describe('calculateARR', () => {
    it('should calculate ARR as MRR * 12', async () => {
      mockRevenueMetricsModel.findFirst.mockResolvedValue(
        fixtures.revenueMetrics.current
      );

      const result = await RevenueCalculator.calculateARR(
        'tenant-001',
        new Date('2024-11-01')
      );

      expect(result.arr).toBe(180000);
      expect(result.mrr).toBe(15000);
    });
  });

  describe('calculateChurnRate', () => {
    it('should calculate churn percentage correctly', async () => {
      mockSubscriptionModel.count
        .mockResolvedValueOnce(100) // total start
        .mockResolvedValueOnce(8); // churned

      const result = await RevenueCalculator.calculateChurnRate(
        'tenant-001',
        dateHelpers.startOfMonth(),
        dateHelpers.endOfMonth()
      );

      expect(result.rate).toBe(8); // 8%
      expect(result.churnedRevenue).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero churn', async () => {
      mockSubscriptionModel.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(0);

      const result = await RevenueCalculator.calculateChurnRate(
        'tenant-001',
        dateHelpers.startOfMonth(),
        dateHelpers.endOfMonth()
      );

      expect(result.rate).toBe(0);
    });

    it('should handle no subscriptions', async () => {
      mockSubscriptionModel.count.mockResolvedValue(0);

      const result = await RevenueCalculator.calculateChurnRate(
        'tenant-001',
        new Date(),
        new Date()
      );

      expect(result.rate).toBe(0);
      expect(result.churnedRevenue).toBe(0);
    });
  });

  describe('calculateGrowthRate', () => {
    it('should calculate positive growth', async () => {
      const result = await RevenueCalculator.calculateGrowthRate(
        15000, // current
        14000 // previous
      );

      expect(result).toBeCloseTo(7.14, 2);
    });

    it('should calculate negative growth', async () => {
      const result = await RevenueCalculator.calculateGrowthRate(
        13000, // current
        14000 // previous
      );

      expect(result).toBeCloseTo(-7.14, 2);
    });

    it('should handle zero previous value', async () => {
      const result = await RevenueCalculator.calculateGrowthRate(5000, 0);

      expect(result).toBe(0);
    });
  });

  describe('calculateRevenueProjection', () => {
    it('should project revenue for future months', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([
        { ...fixtures.revenueMetrics.previous, mrr: 12000 },
        { ...fixtures.revenueMetrics.previous, mrr: 13000 },
        { ...fixtures.revenueMetrics.current, mrr: 14000 },
      ]);

      const result = await RevenueCalculator.calculateRevenueProjection(
        'tenant-001',
        3 // months
      );

      expect(result).toBeDefined();
      expect(result.projections).toHaveLength(3);
      expect(result.projections[0].mrr).toBeGreaterThan(14000);
      expect(result.confidence).toBeDefined();
    });

    it('should include confidence intervals', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([
        fixtures.revenueMetrics.previous,
        fixtures.revenueMetrics.current,
      ]);

      const result = await RevenueCalculator.calculateRevenueProjection(
        'tenant-001',
        6
      );

      result.projections.forEach((projection) => {
        expect(projection.confidenceInterval).toBeDefined();
        expect(projection.confidenceInterval.lower).toBeLessThan(
          projection.mrr
        );
        expect(projection.confidenceInterval.upper).toBeGreaterThan(
          projection.mrr
        );
      });
    });

    it('should handle insufficient historical data', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([
        fixtures.revenueMetrics.current,
      ]);

      const result = await RevenueCalculator.calculateRevenueProjection(
        'tenant-001',
        3
      );

      expect(result.confidence).toBe('low');
      expect(result.message).toContain('insufficient');
    });
  });

  describe('getRevenueBreakdown', () => {
    it('should breakdown revenue by category', async () => {
      mockRevenueMetricsModel.findFirst.mockResolvedValue(
        fixtures.revenueMetrics.current
      );

      const result = await RevenueCalculator.getRevenueBreakdown(
        'tenant-001',
        new Date('2024-11-01')
      );

      expect(result).toBeDefined();
      expect(result.newRevenue).toBe(2000);
      expect(result.expansionRevenue).toBe(500);
      expect(result.contractionRevenue).toBe(200);
      expect(result.churnedRevenue).toBe(300);
    });

    it('should calculate net revenue correctly', async () => {
      mockRevenueMetricsModel.findFirst.mockResolvedValue(
        fixtures.revenueMetrics.current
      );

      const result = await RevenueCalculator.getRevenueBreakdown(
        'tenant-001',
        new Date('2024-11-01')
      );

      const netRevenue =
        result.newRevenue +
        result.expansionRevenue -
        result.contractionRevenue -
        result.churnedRevenue;

      expect(netRevenue).toBe(2000);
    });
  });

  describe('calculateLifetimeValue', () => {
    it('should calculate customer LTV', async () => {
      mockSubscriptionModel.aggregate.mockResolvedValue({
        _avg: { amount: 150 },
      });

      mockRevenueMetricsModel.aggregate.mockResolvedValue({
        _avg: { churnedRevenue: 300 },
      });

      const result = await RevenueCalculator.calculateLifetimeValue(
        'tenant-001'
      );

      expect(result.ltv).toBeGreaterThan(0);
      expect(result.averageRevenuePerUser).toBe(150);
    });

    it('should handle edge case of zero churn', async () => {
      mockSubscriptionModel.aggregate.mockResolvedValue({
        _avg: { amount: 100 },
      });

      mockRevenueMetricsModel.aggregate.mockResolvedValue({
        _avg: { churnedRevenue: 0 },
      });

      const result = await RevenueCalculator.calculateLifetimeValue(
        'tenant-001'
      );

      expect(result.ltv).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockRevenueMetricsModel.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        RevenueCalculator.calculateMRR('tenant-001', new Date())
      ).rejects.toThrow('Database connection failed');
    });

    it('should validate tenant ID', async () => {
      await expect(
        RevenueCalculator.calculateMRR('', new Date())
      ).rejects.toThrow();
    });

    it('should validate date parameters', async () => {
      await expect(
        RevenueCalculator.calculateMRR('tenant-001', new Date('invalid'))
      ).rejects.toThrow();
    });
  });
});
