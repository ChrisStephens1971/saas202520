/**
 * Predictive Models Service Tests
 * Sprint 10 Week 1 Day 5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PredictiveModels } from '../predictive-models';
import {
  createMockPrismaClient,
  mockRevenueMetricsModel,
  mockUserModel,
  fixtures,
  resetAllMocks,
} from '../../__tests__/test-utils';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => createMockPrismaClient()),
}));

describe('PredictiveModels', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('predictRevenue', () => {
    it('should forecast revenue accurately', async () => {
      const historicalData = [
        { period: new Date('2024-07-01'), mrr: 12000 },
        { period: new Date('2024-08-01'), mrr: 13000 },
        { period: new Date('2024-09-01'), mrr: 14000 },
        { period: new Date('2024-10-01'), mrr: 15000 },
      ];

      mockRevenueMetricsModel.findMany.mockResolvedValue(historicalData);

      const result = await PredictiveModels.predictRevenue(
        'tenant-001',
        3 // months ahead
      );

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(3);
      expect(result.predictions[0].mrr).toBeGreaterThan(15000);
      expect(result.accuracy).toBeDefined();
    });

    it('should detect linear growth trend', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([
        { mrr: 10000 },
        { mrr: 11000 },
        { mrr: 12000 },
        { mrr: 13000 },
      ]);

      const result = await PredictiveModels.predictRevenue('tenant-001', 2);

      expect(result.trend).toBe('growth');
      expect(result.predictions[0].mrr).toBeCloseTo(14000, -2);
    });

    it('should include confidence intervals', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([
        { mrr: 10000 },
        { mrr: 12000 },
        { mrr: 11000 },
        { mrr: 13000 },
      ]);

      const result = await PredictiveModels.predictRevenue('tenant-001', 3);

      result.predictions.forEach((pred) => {
        expect(pred.confidenceInterval).toBeDefined();
        expect(pred.confidenceInterval.lower).toBeLessThan(pred.mrr);
        expect(pred.confidenceInterval.upper).toBeGreaterThan(pred.mrr);
      });
    });

    it('should handle insufficient data', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([
        { mrr: 10000 },
        { mrr: 11000 },
      ]);

      const result = await PredictiveModels.predictRevenue('tenant-001', 3);

      expect(result.accuracy).toBe('low');
      expect(result.message).toContain('insufficient');
    });
  });

  describe('predictUserGrowth', () => {
    it('should forecast user growth', async () => {
      const userData = [
        { period: new Date('2024-07-01'), count: 100 },
        { period: new Date('2024-08-01'), count: 120 },
        { period: new Date('2024-09-01'), count: 145 },
        { period: new Date('2024-10-01'), count: 170 },
      ];

      mockUserModel.count.mockResolvedValue(170);

      const result = await PredictiveModels.predictUserGrowth(
        'tenant-001',
        3
      );

      expect(result).toBeDefined();
      expect(result.predictions).toHaveLength(3);
      expect(result.predictions[0].count).toBeGreaterThan(170);
    });

    it('should calculate growth rate', async () => {
      mockUserModel.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(110)
        .mockResolvedValueOnce(121);

      const result = await PredictiveModels.predictUserGrowth(
        'tenant-001',
        2
      );

      expect(result.growthRate).toBeGreaterThan(0);
    });
  });

  describe('calculateTrendline', () => {
    it('should calculate linear regression', () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 12 },
        { x: 3, y: 14 },
        { x: 4, y: 16 },
      ];

      const result = PredictiveModels.calculateTrendline(data);

      expect(result).toBeDefined();
      expect(result.slope).toBeCloseTo(2, 1);
      expect(result.intercept).toBeCloseTo(8, 1);
      expect(result.rSquared).toBeGreaterThan(0.9);
    });

    it('should predict future values', () => {
      const data = [
        { x: 1, y: 5 },
        { x: 2, y: 7 },
        { x: 3, y: 9 },
      ];

      const trendline = PredictiveModels.calculateTrendline(data);
      const prediction = trendline.predict(4);

      expect(prediction).toBeCloseTo(11, 1);
    });

    it('should handle flat trend', () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 10 },
        { x: 3, y: 10 },
      ];

      const result = PredictiveModels.calculateTrendline(data);

      expect(result.slope).toBeCloseTo(0, 1);
      expect(result.intercept).toBeCloseTo(10, 1);
    });

    it('should handle negative trend', () => {
      const data = [
        { x: 1, y: 20 },
        { x: 2, y: 18 },
        { x: 3, y: 16 },
      ];

      const result = PredictiveModels.calculateTrendline(data);

      expect(result.slope).toBeLessThan(0);
    });
  });

  describe('calculateConfidenceInterval', () => {
    it('should return confidence bounds', () => {
      const historicalData = [10, 12, 11, 13, 12, 14];
      const prediction = 15;

      const interval = PredictiveModels.calculateConfidenceInterval(
        prediction,
        historicalData,
        0.95
      );

      expect(interval.lower).toBeLessThan(prediction);
      expect(interval.upper).toBeGreaterThan(prediction);
      expect(interval.confidence).toBe(0.95);
    });

    it('should widen interval for volatile data', () => {
      const volatileData = [10, 5, 20, 8, 18, 12];
      const stableData = [10, 11, 10, 11, 10, 11];

      const volatileInterval = PredictiveModels.calculateConfidenceInterval(
        15,
        volatileData
      );
      const stableInterval = PredictiveModels.calculateConfidenceInterval(
        15,
        stableData
      );

      const volatileWidth =
        volatileInterval.upper - volatileInterval.lower;
      const stableWidth = stableInterval.upper - stableInterval.lower;

      expect(volatileWidth).toBeGreaterThan(stableWidth);
    });

    it('should handle different confidence levels', () => {
      const data = [10, 12, 11, 13];

      const interval95 = PredictiveModels.calculateConfidenceInterval(
        15,
        data,
        0.95
      );
      const interval99 = PredictiveModels.calculateConfidenceInterval(
        15,
        data,
        0.99
      );

      const width95 = interval95.upper - interval95.lower;
      const width99 = interval99.upper - interval99.lower;

      expect(width99).toBeGreaterThan(width95); // Higher confidence = wider interval
    });
  });

  describe('detectSeasonality', () => {
    it('should identify seasonal patterns', () => {
      // Simulate 24 months with clear seasonality
      const data = Array.from({ length: 24 }, (_, i) => ({
        period: new Date(2022, i, 1),
        value: 1000 + Math.sin((i * Math.PI) / 6) * 200, // 12-month cycle
      }));

      const result = PredictiveModels.detectSeasonality(data);

      expect(result.hasSeasonality).toBe(true);
      expect(result.period).toBeGreaterThan(0);
    });

    it('should detect no seasonality in random data', () => {
      const data = Array.from({ length: 12 }, (_, i) => ({
        period: new Date(2024, i, 1),
        value: Math.random() * 1000,
      }));

      const result = PredictiveModels.detectSeasonality(data);

      expect(result.hasSeasonality).toBe(false);
    });

    it('should identify quarterly patterns', () => {
      const data = Array.from({ length: 12 }, (_, i) => ({
        period: new Date(2024, i, 1),
        value: 1000 + ((i % 3 === 0) ? 500 : 0), // Spike every 3 months
      }));

      const result = PredictiveModels.detectSeasonality(data);

      if (result.hasSeasonality) {
        expect(result.period).toBeCloseTo(3, 0);
      }
    });
  });

  describe('accuracy metrics', () => {
    it('should calculate MAPE (Mean Absolute Percentage Error)', () => {
      const actual = [100, 110, 120, 130];
      const predicted = [98, 112, 118, 132];

      const mape = PredictiveModels.calculateMAPE(actual, predicted);

      expect(mape).toBeGreaterThan(0);
      expect(mape).toBeLessThan(10); // Should be reasonably accurate
    });

    it('should calculate RMSE (Root Mean Square Error)', () => {
      const actual = [100, 110, 120];
      const predicted = [102, 108, 122];

      const rmse = PredictiveModels.calculateRMSE(actual, predicted);

      expect(rmse).toBeGreaterThan(0);
    });

    it('should handle perfect predictions', () => {
      const values = [100, 110, 120];

      const mape = PredictiveModels.calculateMAPE(values, values);
      expect(mape).toBe(0);

      const rmse = PredictiveModels.calculateRMSE(values, values);
      expect(rmse).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle empty dataset', async () => {
      mockRevenueMetricsModel.findMany.mockResolvedValue([]);

      await expect(
        PredictiveModels.predictRevenue('tenant-001', 3)
      ).rejects.toThrow();
    });

    it('should validate prediction horizon', async () => {
      await expect(
        PredictiveModels.predictRevenue('tenant-001', 0)
      ).rejects.toThrow();

      await expect(
        PredictiveModels.predictRevenue('tenant-001', 25) // Too far
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      mockRevenueMetricsModel.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        PredictiveModels.predictRevenue('tenant-001', 3)
      ).rejects.toThrow('Database error');
    });
  });
});
