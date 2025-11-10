/**
 * Predictive Models Service
 * Sprint 10 Week 1 Day 4 - Predictive Analytics
 *
 * Provides forecasting and predictive analytics using statistical models:
 * - Revenue forecasting (linear regression)
 * - User growth prediction (exponential smoothing)
 * - Tournament attendance prediction (already implemented in tournament-analyzer)
 * - Trend analysis and seasonality detection
 *
 * Uses simple but effective statistical methods targeting >80% accuracy.
 */

import { PrismaClient } from '@prisma/client';
import {
  startOfMonth,
  subMonths,
  addMonths,
  format,
} from 'date-fns';
import * as RevenueCalculator from './revenue-calculator';
import * as CacheManager from './cache-manager';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Revenue prediction with confidence intervals
 */
export interface RevenuePrediction {
  month: Date;
  monthLabel: string;
  predictedMRR: number;
  predictedRevenue: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  confidence: 'high' | 'medium' | 'low';
  accuracy: number; // R² value (0-100)
}

/**
 * User growth prediction
 */
export interface UserGrowthPrediction {
  month: Date;
  monthLabel: string;
  predictedUsers: number;
  predictedActive: number;
  predictedChurn: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  confidence: 'high' | 'medium' | 'low';
  growthRate: number; // Percentage
}

/**
 * Linear trendline equation (y = mx + b)
 */
export interface TrendlineEquation {
  slope: number; // m
  intercept: number; // b
  rSquared: number; // R² (coefficient of determination)
  equation: string; // Human-readable equation
}

/**
 * Confidence interval bounds
 */
export interface ConfidenceInterval {
  low: number;
  high: number;
  confidence: number; // 0.95 = 95%
}

/**
 * Seasonality factors for each month
 */
export interface SeasonalityFactors {
  [monthIndex: number]: number; // 0-11, factor is multiplier (1.0 = average)
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  date: Date;
  value: number;
}

// ============================================================================
// REVENUE FORECASTING
// ============================================================================

/**
 * Predict future revenue for the next N months
 *
 * Uses linear regression on historical MRR data to forecast future revenue.
 * Includes confidence intervals and seasonality adjustments.
 *
 * @param tenantId - Organization ID
 * @param months - Number of months to predict (1-12)
 * @returns Array of revenue predictions
 */
export async function predictRevenue(
  tenantId: string,
  months: number = 6
): Promise<RevenuePrediction[]> {
  console.log(`[Predictive] Forecasting revenue for ${months} months: ${tenantId}`);

  // Validate input
  if (months < 1 || months > 12) {
    throw new Error('Months must be between 1 and 12');
  }

  // Check cache
  const cacheKey = CacheManager.getCacheKey(
    'predictive:revenue',
    tenantId,
    months.toString()
  );

  const cached = await CacheManager.get<RevenuePrediction[]>(cacheKey);
  if (cached) {
    console.log(`[Predictive] Cache hit for revenue prediction: ${tenantId}`);
    return cached;
  }

  // Get historical revenue data (last 12 months)
  const now = new Date();
  const historicalMonths: TimeSeriesData[] = [];

  for (let i = 11; i >= 0; i--) {
    const month = startOfMonth(subMonths(now, i));

    try {
      const metrics = await RevenueCalculator.calculateMRR(tenantId, month);
      historicalMonths.push({
        date: month,
        value: metrics.mrr,
      });
    } catch {
      // No data for this month, use 0
      historicalMonths.push({
        date: month,
        value: 0,
      });
    }
  }

  // Ensure we have enough data
  const nonZeroMonths = historicalMonths.filter((m) => m.value > 0).length;
  if (nonZeroMonths < 3) {
    throw new Error('Insufficient historical data for prediction (need at least 3 months)');
  }

  // Extract values for regression
  const values = historicalMonths.map((m) => m.value);

  // Calculate trendline
  const trendline = calculateTrendline(values);

  // Determine confidence level based on R²
  const getConfidence = (rSquared: number): 'high' | 'medium' | 'low' => {
    if (rSquared >= 0.8) return 'high';
    if (rSquared >= 0.6) return 'medium';
    return 'low';
  };

  // Detect seasonality
  const seasonality = detectSeasonality(historicalMonths);

  // Generate predictions
  const predictions: RevenuePrediction[] = [];
  const baseIndex = values.length;

  for (let i = 1; i <= months; i++) {
    const futureMonth = startOfMonth(addMonths(now, i));
    const monthIndex = futureMonth.getMonth();

    // Predict using trendline
    const trendValue = trendline.slope * (baseIndex + i - 1) + trendline.intercept;

    // Apply seasonality factor
    const seasonalFactor = seasonality[monthIndex] || 1.0;
    const predictedMRR = Math.max(0, trendValue * seasonalFactor);

    // Calculate confidence interval
    const interval = calculateConfidenceInterval(
      predictedMRR,
      values,
      0.95
    );

    predictions.push({
      month: futureMonth,
      monthLabel: format(futureMonth, 'MMM yyyy'),
      predictedMRR: Math.round(predictedMRR),
      predictedRevenue: Math.round(predictedMRR), // Same for now
      confidenceInterval: {
        low: Math.max(0, Math.round(interval.low)),
        high: Math.round(interval.high),
      },
      confidence: getConfidence(trendline.rSquared),
      accuracy: Math.round(trendline.rSquared * 100),
    });
  }

  // Cache predictions for 1 hour
  await CacheManager.set(cacheKey, predictions, 3600);

  console.log(
    `[Predictive] Revenue forecast complete: ${predictions.length} months (R²: ${
      trendline.rSquared.toFixed(2)
    })`
  );

  return predictions;
}

// ============================================================================
// USER GROWTH FORECASTING
// ============================================================================

/**
 * Predict user growth for the next N months
 *
 * Uses exponential smoothing with churn rate to forecast user growth.
 * Accounts for historical growth patterns and retention trends.
 *
 * @param tenantId - Organization ID
 * @param months - Number of months to predict (1-12)
 * @returns Array of user growth predictions
 */
export async function predictUserGrowth(
  tenantId: string,
  months: number = 6
): Promise<UserGrowthPrediction[]> {
  console.log(`[Predictive] Forecasting user growth for ${months} months: ${tenantId}`);

  if (months < 1 || months > 12) {
    throw new Error('Months must be between 1 and 12');
  }

  // Check cache
  const cacheKey = CacheManager.getCacheKey(
    'predictive:users',
    tenantId,
    months.toString()
  );

  const cached = await CacheManager.get<UserGrowthPrediction[]>(cacheKey);
  if (cached) {
    console.log(`[Predictive] Cache hit for user growth prediction: ${tenantId}`);
    return cached;
  }

  // Get historical user data (last 12 months)
  const now = new Date();
  const historicalMonths: Array<{
    date: Date;
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const month = startOfMonth(subMonths(now, i));

    const cohort = await prisma.userCohort.findFirst({
      where: {
        tenantId,
        cohort: month,
      },
    });

    if (cohort) {
      historicalMonths.push({
        date: month,
        totalUsers: cohort.cohortSize,
        activeUsers: Math.round(cohort.cohortSize * ((cohort as any).month0Retention / 100)),
        newUsers: cohort.cohortSize,
      });
    }
  }

  if (historicalMonths.length < 3) {
    throw new Error('Insufficient historical data for prediction (need at least 3 months)');
  }

  // Calculate average growth rate
  const growthRates: number[] = [];
  for (let i = 1; i < historicalMonths.length; i++) {
    const prev = historicalMonths[i - 1].totalUsers;
    const curr = historicalMonths[i].totalUsers;
    if (prev > 0) {
      growthRates.push((curr - prev) / prev);
    }
  }

  const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

  // Calculate average churn rate
  const churnRates: number[] = [];
  for (const month of historicalMonths) {
    const churnRate = 100 - (month.activeUsers / month.totalUsers) * 100;
    if (!isNaN(churnRate) && isFinite(churnRate)) {
      churnRates.push(churnRate);
    }
  }

  const avgChurnRate =
    churnRates.length > 0
      ? churnRates.reduce((a, b) => a + b, 0) / churnRates.length
      : 20; // Default 20% churn

  // Get latest user count
  const latestMonth = historicalMonths[historicalMonths.length - 1];
  let currentUsers = latestMonth.totalUsers;

  // Generate predictions using exponential growth model
  const predictions: UserGrowthPrediction[] = [];

  for (let i = 1; i <= months; i++) {
    const futureMonth = startOfMonth(addMonths(now, i));

    // Apply growth rate and churn
    const newUsers = Math.round(currentUsers * Math.max(avgGrowthRate, 0.05)); // Minimum 5% growth
    const churnedUsers = Math.round(currentUsers * (avgChurnRate / 100));
    const netGrowth = newUsers - churnedUsers;

    currentUsers = Math.max(0, currentUsers + netGrowth);
    const activeUsers = Math.round(currentUsers * (1 - avgChurnRate / 100));

    // Calculate confidence interval (±20% for user growth)
    const interval = {
      low: Math.round(currentUsers * 0.8),
      high: Math.round(currentUsers * 1.2),
    };

    // Determine confidence based on data consistency
    const stdDev = calculateStdDev(growthRates);
    const confidence: 'high' | 'medium' | 'low' =
      stdDev < 0.1 ? 'high' : stdDev < 0.2 ? 'medium' : 'low';

    predictions.push({
      month: futureMonth,
      monthLabel: format(futureMonth, 'MMM yyyy'),
      predictedUsers: currentUsers,
      predictedActive: activeUsers,
      predictedChurn: avgChurnRate,
      confidenceInterval: interval,
      confidence,
      growthRate: avgGrowthRate * 100,
    });
  }

  // Cache predictions for 1 hour
  await CacheManager.set(cacheKey, predictions, 3600);

  console.log(
    `[Predictive] User growth forecast complete: ${predictions.length} months (avg growth: ${
      (avgGrowthRate * 100).toFixed(1)
    }%)`
  );

  return predictions;
}

// ============================================================================
// STATISTICAL HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate linear trendline using least squares method
 *
 * Computes y = mx + b for the given data points.
 * Returns slope (m), intercept (b), and R² (goodness of fit).
 *
 * @param data - Array of numeric values
 * @returns Trendline equation
 */
export function calculateTrendline(data: number[]): TrendlineEquation {
  const n = data.length;

  if (n < 2) {
    throw new Error('Need at least 2 data points for trendline');
  }

  // Create x values (0, 1, 2, ...)
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;

  // Calculate means
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  // Calculate slope (m)
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Calculate intercept (b)
  const intercept = yMean - slope * xMean;

  // Calculate R² (coefficient of determination)
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += (y[i] - predicted) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }

  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return {
    slope,
    intercept,
    rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp to [0, 1]
    equation: `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`,
  };
}

/**
 * Calculate confidence interval for a prediction
 *
 * Uses standard error estimation to calculate confidence bounds.
 * Default is 95% confidence interval.
 *
 * @param prediction - Predicted value
 * @param historicalData - Historical data points
 * @param confidence - Confidence level (0.95 = 95%)
 * @returns Confidence interval
 */
export function calculateConfidenceInterval(
  prediction: number,
  historicalData: number[],
  confidence: number = 0.95
): ConfidenceInterval {
  // Calculate standard deviation
  const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
  const variance =
    historicalData.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
    historicalData.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for 95% confidence ≈ 1.96
  // Z-score for 90% confidence ≈ 1.645
  const zScore = confidence >= 0.95 ? 1.96 : 1.645;

  // Standard error
  const standardError = stdDev / Math.sqrt(historicalData.length);

  // Margin of error
  const marginOfError = zScore * standardError;

  return {
    low: prediction - marginOfError,
    high: prediction + marginOfError,
    confidence,
  };
}

/**
 * Detect seasonality patterns in time series data
 *
 * Analyzes month-over-month patterns to identify seasonal trends.
 * Returns multiplier factors for each month (1.0 = average).
 *
 * @param data - Time series data with dates and values
 * @returns Seasonality factors by month
 */
export function detectSeasonality(data: TimeSeriesData[]): SeasonalityFactors {
  if (data.length < 12) {
    console.warn('[Predictive] Not enough data for seasonality detection');
    return {};
  }

  // Group by month
  const byMonth: { [month: number]: number[] } = {};

  for (const point of data) {
    const month = point.date.getMonth();
    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(point.value);
  }

  // Calculate average for each month
  const overallAvg =
    data.reduce((sum, point) => sum + point.value, 0) / data.length;

  const factors: SeasonalityFactors = {};

  for (const month in byMonth) {
    const values = byMonth[month];
    const monthAvg = values.reduce((a, b) => a + b, 0) / values.length;

    // Factor = month average / overall average
    factors[parseInt(month)] = overallAvg > 0 ? monthAvg / overallAvg : 1.0;
  }

  console.log('[Predictive] Seasonality factors calculated');

  return factors;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

// ============================================================================
// TOURNAMENT ATTENDANCE PREDICTION (Wrapper)
// ============================================================================

/**
 * Predict tournament attendance
 *
 * This wraps the existing predictTournamentAttendance function
 * from tournament-analyzer.ts for consistency.
 *
 * @param tenantId - Organization ID
 * @param format - Tournament format
 * @param date - Scheduled tournament date
 * @returns Attendance prediction
 */
export async function predictTournamentAttendance(
  tenantId: string,
  format: string,
  date: Date
): Promise<any> {
  // Import dynamically to avoid circular dependencies
  const TournamentAnalyzer = await import('./tournament-analyzer');
  return TournamentAnalyzer.predictTournamentAttendance(tenantId, format, date);
}
