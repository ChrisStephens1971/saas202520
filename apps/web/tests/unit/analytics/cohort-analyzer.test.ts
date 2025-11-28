/**
 * Cohort Analyzer Service Tests
 * Sprint 10 Week 1 Day 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CohortAnalyzer } from '../cohort-analyzer';
import {
  createMockPrismaClient,
  mockUserModel,
  mockSubscriptionModel,
  fixtures,
  resetAllMocks,
} from '../../__tests__/test-utils';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => createMockPrismaClient()),
}));

describe('CohortAnalyzer', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('analyzeCohort', () => {
    it('should analyze cohort retention correctly', async () => {
      mockUserModel.findMany.mockResolvedValue(fixtures.users.cohort202401);

      mockSubscriptionModel.count
        .mockResolvedValueOnce(2) // Month 0: all active
        .mockResolvedValueOnce(2) // Month 1: still active
        .mockResolvedValueOnce(1) // Month 2: one churned
        .mockResolvedValueOnce(1); // Month 3: still one

      const result = await CohortAnalyzer.analyzeCohort('tenant-001', new Date('2024-01-01'), 6);

      expect(result).toBeDefined();
      expect(result.cohortSize).toBe(2);
      expect(result.retentionCurve).toHaveLength(6);
      expect(result.retentionCurve[0]).toBe(100); // Month 0 always 100%
    });

    it('should calculate retention percentages', async () => {
      mockUserModel.findMany.mockResolvedValue([
        { id: 'u1', createdAt: new Date('2024-01-15') },
        { id: 'u2', createdAt: new Date('2024-01-20') },
        { id: 'u3', createdAt: new Date('2024-01-25') },
        { id: 'u4', createdAt: new Date('2024-01-28') },
      ]);

      mockSubscriptionModel.count
        .mockResolvedValueOnce(4) // Month 0
        .mockResolvedValueOnce(3) // Month 1
        .mockResolvedValueOnce(2); // Month 2

      const result = await CohortAnalyzer.analyzeCohort('tenant-001', new Date('2024-01-01'), 3);

      expect(result.retentionCurve[1]).toBe(75); // 3/4 = 75%
      expect(result.retentionCurve[2]).toBe(50); // 2/4 = 50%
    });

    it('should handle empty cohort', async () => {
      mockUserModel.findMany.mockResolvedValue([]);

      const result = await CohortAnalyzer.analyzeCohort('tenant-001', new Date('2024-01-01'), 3);

      expect(result.cohortSize).toBe(0);
      expect(result.retentionCurve).toEqual([0, 0, 0]);
    });
  });

  describe('calculateRetentionCurve', () => {
    it('should generate retention curve over time', async () => {
      mockUserModel.findMany.mockResolvedValue(fixtures.users.cohort202401);

      const result = await CohortAnalyzer.calculateRetentionCurve(
        'tenant-001',
        new Date('2024-01-01'),
        12
      );

      expect(result).toHaveLength(12);
      expect(result[0]).toBe(100); // Always start at 100%
      expect(result[result.length - 1]).toBeLessThanOrEqual(100);
      expect(result[result.length - 1]).toBeGreaterThanOrEqual(0);
    });

    it('should show declining retention over time', async () => {
      mockUserModel.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `user-${i}`,
          createdAt: new Date('2024-01-15'),
        }))
      );

      mockSubscriptionModel.count
        .mockResolvedValueOnce(10) // Month 0
        .mockResolvedValueOnce(9) // Month 1
        .mockResolvedValueOnce(8) // Month 2
        .mockResolvedValueOnce(7); // Month 3

      const result = await CohortAnalyzer.calculateRetentionCurve(
        'tenant-001',
        new Date('2024-01-01'),
        4
      );

      expect(result[0]).toBe(100);
      expect(result[1]).toBe(90);
      expect(result[2]).toBe(80);
      expect(result[3]).toBe(70);
    });
  });

  describe('calculateCohortLTV', () => {
    it('should calculate lifetime value by cohort', async () => {
      mockUserModel.findMany.mockResolvedValue(fixtures.users.cohort202401);

      mockSubscriptionModel.aggregate.mockResolvedValue({
        _sum: { amount: 3000 }, // Total revenue from cohort
        _count: { id: 2 },
      });

      const result = await CohortAnalyzer.calculateCohortLTV('tenant-001', new Date('2024-01-01'));

      expect(result.ltv).toBe(1500); // 3000 / 2
      expect(result.cohortSize).toBe(2);
      expect(result.totalRevenue).toBe(3000);
    });

    it('should handle cohort with no revenue', async () => {
      mockUserModel.findMany.mockResolvedValue([{ id: 'u1', createdAt: new Date('2024-01-15') }]);

      mockSubscriptionModel.aggregate.mockResolvedValue({
        _sum: { amount: null },
        _count: { id: 0 },
      });

      const result = await CohortAnalyzer.calculateCohortLTV('tenant-001', new Date('2024-01-01'));

      expect(result.ltv).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('compareCohortsRetention', () => {
    it('should compare multiple cohorts', async () => {
      mockUserModel.findMany
        .mockResolvedValueOnce(fixtures.users.cohort202401)
        .mockResolvedValueOnce(fixtures.users.cohort202402);

      mockSubscriptionModel.count.mockResolvedValue(1);

      const result = await CohortAnalyzer.compareCohortsRetention(
        'tenant-001',
        [new Date('2024-01-01'), new Date('2024-02-01')],
        3
      );

      expect(result).toHaveLength(2);
      expect(result[0].cohortDate).toEqual(new Date('2024-01-01'));
      expect(result[1].cohortDate).toEqual(new Date('2024-02-01'));
    });

    it('should identify best performing cohort', async () => {
      const cohorts = await CohortAnalyzer.compareCohortsRetention(
        'tenant-001',
        [new Date('2024-01-01'), new Date('2024-02-01'), new Date('2024-03-01')],
        6
      );

      const bestCohort = cohorts.reduce((best, current) => {
        const bestAvgRetention =
          best.retentionCurve.reduce((a, b) => a + b, 0) / best.retentionCurve.length;
        const currentAvgRetention =
          current.retentionCurve.reduce((a, b) => a + b, 0) / current.retentionCurve.length;
        return currentAvgRetention > bestAvgRetention ? current : best;
      });

      expect(bestCohort).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      mockUserModel.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        CohortAnalyzer.analyzeCohort('tenant-001', new Date('2024-01-01'), 3)
      ).rejects.toThrow('Database error');
    });

    it('should validate cohort date', async () => {
      await expect(
        CohortAnalyzer.analyzeCohort('tenant-001', new Date('invalid'), 3)
      ).rejects.toThrow();
    });

    it('should validate months parameter', async () => {
      await expect(
        CohortAnalyzer.analyzeCohort('tenant-001', new Date('2024-01-01'), 0)
      ).rejects.toThrow();
    });
  });
});
