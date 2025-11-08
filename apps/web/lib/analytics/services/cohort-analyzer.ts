/**
 * Cohort Analyzer Service
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * User retention and cohort analysis.
 * Analyzes user behavior patterns, retention curves, and lifetime value
 * across different user cohorts.
 */

import { PrismaClient } from '@prisma/client';
import {
  startOfMonth,
  addMonths,
  format,
} from 'date-fns';

const prisma = new PrismaClient();

/**
 * Complete cohort analysis result
 */
export interface CohortAnalysis {
  cohort: Date;
  cohortSize: number;
  retentionCurve: Array<{
    monthNumber: number;
    retainedUsers: number;
    retentionRate: number;
    churnedUsers: number;
    churnRate: number;
  }>;
  metrics: {
    avgRetentionRate: number;
    month1Retention: number;
    month3Retention: number;
    month6Retention: number;
    month12Retention: number | null;
  };
  revenue: {
    totalRevenue: number;
    avgRevenuePerUser: number;
    ltv: number;
  };
  status: 'new' | 'maturing' | 'mature';
}

/**
 * Retention curve data point
 */
export interface RetentionDataPoint {
  monthNumber: number;
  date: Date;
  retainedUsers: number;
  retentionRate: number;
  churnedUsers: number;
  churnRate: number;
}

/**
 * Cohort lifetime value result
 */
export interface CohortLTV {
  cohort: Date;
  cohortSize: number;
  currentLTV: number;
  projectedLTV: number;
  revenueByMonth: Array<{
    monthNumber: number;
    revenue: number;
    cumulativeRevenue: number;
    revenuePerUser: number;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Cohort comparison result
 */
export interface CohortComparison {
  cohorts: Array<{
    cohort: Date;
    cohortSize: number;
    avgRetention: number;
    month1Retention: number;
    month3Retention: number;
    currentLTV: number;
  }>;
  insights: {
    bestPerformingCohort: Date;
    worstPerformingCohort: Date;
    avgRetentionTrend: 'improving' | 'declining' | 'stable';
    retentionVolatility: number; // Standard deviation
  };
}

/**
 * Retention benchmark result
 */
export interface RetentionBenchmarks {
  tenantId: string;
  benchmarks: {
    month1: { target: number; current: number; status: 'above' | 'below' | 'at' };
    month3: { target: number; current: number; status: 'above' | 'below' | 'at' };
    month6: { target: number; current: number; status: 'above' | 'below' | 'at' };
    month12: { target: number; current: number; status: 'above' | 'below' | 'at' };
  };
  industry: string;
  recommendations: string[];
}

/**
 * Retention prediction result
 */
export interface RetentionPrediction {
  cohort: Date;
  predictions: Array<{
    monthNumber: number;
    predictedRetention: number;
    confidenceInterval: {
      low: number;
      high: number;
    };
  }>;
  method: 'exponential_decay' | 'linear';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Cohort segment result
 */
export interface CohortSegment {
  cohort: Date;
  attribute: string;
  segments: Array<{
    value: string;
    userCount: number;
    retentionRate: number;
    avgLTV: number;
  }>;
  insights: {
    bestSegment: string;
    worstSegment: string;
    significantDifference: boolean;
  };
}

/**
 * Analyze a complete cohort with retention curve and metrics
 *
 * @param tenantId - Organization ID
 * @param cohortMonth - Cohort month (first day of month)
 * @returns Complete cohort analysis
 */
export async function analyzeCohort(
  tenantId: string,
  cohortMonth: Date
): Promise<CohortAnalysis> {
  const cohortStart = startOfMonth(cohortMonth);

  // Get all cohort data points
  const cohortData = await prisma.userCohort.findMany({
    where: {
      tenantId,
      cohortMonth: cohortStart,
    },
    orderBy: {
      monthNumber: 'asc',
    },
  });

  if (cohortData.length === 0) {
    throw new Error(
      `No cohort data found for tenant ${tenantId}, cohort ${format(
        cohortMonth,
        'yyyy-MM'
      )}`
    );
  }

  const cohortSize = cohortData[0].cohortSize;

  // Build retention curve
  const retentionCurve: RetentionDataPoint[] = cohortData.map((data) => {
    const retentionRate = parseFloat(data.retentionRate.toString());
    const retainedUsers = data.retainedUsers;
    const churnedUsers = data.monthNumber === 0
      ? 0
      : cohortSize - retainedUsers;
    const churnRate = data.monthNumber === 0
      ? 0
      : ((cohortSize - retainedUsers) / cohortSize) * 100;

    return {
      monthNumber: data.monthNumber,
      date: addMonths(cohortStart, data.monthNumber),
      retainedUsers,
      retentionRate,
      churnedUsers,
      churnRate,
    };
  });

  // Calculate key metrics
  const avgRetentionRate =
    retentionCurve.reduce((sum, point) => sum + point.retentionRate, 0) /
    retentionCurve.length;

  const month1Retention = retentionCurve.find((p) => p.monthNumber === 1)
    ?.retentionRate || 0;
  const month3Retention = retentionCurve.find((p) => p.monthNumber === 3)
    ?.retentionRate || 0;
  const month6Retention = retentionCurve.find((p) => p.monthNumber === 6)
    ?.retentionRate || 0;
  const month12Retention = retentionCurve.find((p) => p.monthNumber === 12)
    ?.retentionRate || null;

  // Calculate revenue metrics
  const totalRevenue = cohortData.reduce((sum, data) => {
    const revenue = data.revenue ? parseFloat(data.revenue.toString()) : 0;
    return sum + revenue;
  }, 0);

  const avgRevenuePerUser = cohortSize > 0 ? totalRevenue / cohortSize : 0;

  const latestLTV = cohortData[cohortData.length - 1].ltv
    ? parseFloat(cohortData[cohortData.length - 1].ltv.toString())
    : avgRevenuePerUser;

  // Determine cohort status
  const monthsActive = cohortData.length;
  let status: 'new' | 'maturing' | 'mature';
  if (monthsActive <= 3) {
    status = 'new';
  } else if (monthsActive <= 6) {
    status = 'maturing';
  } else {
    status = 'mature';
  }

  return {
    cohort: cohortStart,
    cohortSize,
    retentionCurve,
    metrics: {
      avgRetentionRate: Math.round(avgRetentionRate * 100) / 100,
      month1Retention: Math.round(month1Retention * 100) / 100,
      month3Retention: Math.round(month3Retention * 100) / 100,
      month6Retention: Math.round(month6Retention * 100) / 100,
      month12Retention:
        month12Retention !== null ? Math.round(month12Retention * 100) / 100 : null,
    },
    revenue: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRevenuePerUser: Math.round(avgRevenuePerUser * 100) / 100,
      ltv: Math.round(latestLTV * 100) / 100,
    },
    status,
  };
}

/**
 * Calculate retention curve for a cohort over time
 *
 * @param tenantId - Organization ID
 * @param cohort - Cohort month (first day of month)
 * @returns Retention curve data points
 */
export async function calculateRetentionCurve(
  tenantId: string,
  cohort: Date
): Promise<RetentionDataPoint[]> {
  const analysis = await analyzeCohort(tenantId, cohort);
  return analysis.retentionCurve;
}

/**
 * Calculate lifetime value progression for a cohort
 *
 * @param tenantId - Organization ID
 * @param cohort - Cohort month (first day of month)
 * @returns LTV metrics with revenue breakdown by month
 */
export async function calculateCohortLTV(
  tenantId: string,
  cohort: Date
): Promise<CohortLTV> {
  const cohortStart = startOfMonth(cohort);

  const cohortData = await prisma.userCohort.findMany({
    where: {
      tenantId,
      cohortMonth: cohortStart,
    },
    orderBy: {
      monthNumber: 'asc',
    },
  });

  if (cohortData.length === 0) {
    throw new Error(
      `No cohort data found for tenant ${tenantId}, cohort ${format(cohort, 'yyyy-MM')}`
    );
  }

  const cohortSize = cohortData[0].cohortSize;

  // Build revenue progression
  let cumulativeRevenue = 0;
  const revenueByMonth = cohortData.map((data) => {
    const revenue = data.revenue ? parseFloat(data.revenue.toString()) : 0;
    cumulativeRevenue += revenue;
    const revenuePerUser = cohortSize > 0 ? revenue / cohortSize : 0;

    return {
      monthNumber: data.monthNumber,
      revenue: Math.round(revenue * 100) / 100,
      cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
      revenuePerUser: Math.round(revenuePerUser * 100) / 100,
    };
  });

  const currentLTV = cohortSize > 0 ? cumulativeRevenue / cohortSize : 0;

  // Project LTV based on retention curve
  const lastMonthRetention = cohortData[cohortData.length - 1].retentionRate
    ? parseFloat(cohortData[cohortData.length - 1].retentionRate.toString())
    : 0;

  // Simple projection: multiply by retention factor
  const projectionFactor = lastMonthRetention > 20 ? 1.5 : 1.2;
  const projectedLTV = currentLTV * projectionFactor;

  // Determine confidence based on data maturity
  const monthsActive = cohortData.length;
  const confidence: 'high' | 'medium' | 'low' =
    monthsActive >= 6 ? 'high' : monthsActive >= 3 ? 'medium' : 'low';

  return {
    cohort: cohortStart,
    cohortSize,
    currentLTV: Math.round(currentLTV * 100) / 100,
    projectedLTV: Math.round(projectedLTV * 100) / 100,
    revenueByMonth,
    confidence,
  };
}

/**
 * Compare retention rates across multiple cohorts
 *
 * @param tenantId - Organization ID
 * @param cohorts - Array of cohort months to compare
 * @returns Cohort comparison with insights
 */
export async function compareCohortsRetention(
  tenantId: string,
  cohorts: Date[]
): Promise<CohortComparison> {
  // Analyze each cohort
  const analyses = await Promise.all(
    cohorts.map((cohort) => analyzeCohort(tenantId, cohort))
  );

  // Build comparison data
  const comparisonData = analyses.map((analysis) => ({
    cohort: analysis.cohort,
    cohortSize: analysis.cohortSize,
    avgRetention: analysis.metrics.avgRetentionRate,
    month1Retention: analysis.metrics.month1Retention,
    month3Retention: analysis.metrics.month3Retention,
    currentLTV: analysis.revenue.ltv,
  }));

  // Find best and worst performing cohorts (by month1 retention)
  const sortedByRetention = [...comparisonData].sort(
    (a, b) => b.month1Retention - a.month1Retention
  );
  const bestPerformingCohort = sortedByRetention[0].cohort;
  const worstPerformingCohort = sortedByRetention[sortedByRetention.length - 1].cohort;

  // Calculate retention trend
  const month1Retentions = comparisonData.map((c) => c.month1Retention);
  const avgRetentionTrend = calculateTrend(month1Retentions);

  // Calculate volatility (standard deviation)
  const mean =
    month1Retentions.reduce((sum, val) => sum + val, 0) / month1Retentions.length;
  const variance =
    month1Retentions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    month1Retentions.length;
  const retentionVolatility = Math.sqrt(variance);

  return {
    cohorts: comparisonData,
    insights: {
      bestPerformingCohort,
      worstPerformingCohort,
      avgRetentionTrend,
      retentionVolatility: Math.round(retentionVolatility * 100) / 100,
    },
  };
}

/**
 * Get retention benchmarks for the tenant
 *
 * @param tenantId - Organization ID
 * @returns Retention benchmarks compared to industry standards
 */
export async function getRetentionBenchmarks(
  tenantId: string
): Promise<RetentionBenchmarks> {
  // Get the most recent cohort data
  const latestCohort = await prisma.userCohort.findFirst({
    where: { tenantId },
    orderBy: { cohortMonth: 'desc' },
  });

  if (!latestCohort) {
    throw new Error(`No cohort data found for tenant ${tenantId}`);
  }

  // Analyze the latest cohort
  const analysis = await analyzeCohort(tenantId, latestCohort.cohortMonth);

  // Industry benchmarks (SaaS averages)
  const industryBenchmarks = {
    month1: 40, // 40% retention after 1 month
    month3: 25, // 25% retention after 3 months
    month6: 20, // 20% retention after 6 months
    month12: 15, // 15% retention after 12 months
  };

  // Compare current performance to benchmarks
  const benchmarks = {
    month1: {
      target: industryBenchmarks.month1,
      current: analysis.metrics.month1Retention,
      status: getStatus(analysis.metrics.month1Retention, industryBenchmarks.month1),
    },
    month3: {
      target: industryBenchmarks.month3,
      current: analysis.metrics.month3Retention,
      status: getStatus(analysis.metrics.month3Retention, industryBenchmarks.month3),
    },
    month6: {
      target: industryBenchmarks.month6,
      current: analysis.metrics.month6Retention,
      status: getStatus(analysis.metrics.month6Retention, industryBenchmarks.month6),
    },
    month12: {
      target: industryBenchmarks.month12,
      current: analysis.metrics.month12Retention || 0,
      status: getStatus(
        analysis.metrics.month12Retention || 0,
        industryBenchmarks.month12
      ),
    },
  };

  // Generate recommendations
  const recommendations: string[] = [];
  if (benchmarks.month1.status === 'below') {
    recommendations.push(
      'Focus on improving onboarding experience to boost month 1 retention'
    );
  }
  if (benchmarks.month3.status === 'below') {
    recommendations.push(
      'Implement engagement campaigns for users at 2-3 months to reduce early churn'
    );
  }
  if (benchmarks.month6.status === 'above' && benchmarks.month1.status === 'above') {
    recommendations.push(
      'Excellent retention! Consider expanding features for power users'
    );
  }

  return {
    tenantId,
    benchmarks,
    industry: 'SaaS',
    recommendations,
  };
}

/**
 * Predict future retention for a cohort using exponential decay
 *
 * @param tenantId - Organization ID
 * @param cohort - Cohort month (first day of month)
 * @param months - Number of months to predict forward
 * @returns Retention predictions with confidence intervals
 */
export async function predictFutureRetention(
  tenantId: string,
  cohort: Date,
  months: number = 6
): Promise<RetentionPrediction> {
  const analysis = await analyzeCohort(tenantId, cohort);

  if (analysis.retentionCurve.length < 3) {
    throw new Error(
      `Insufficient data for prediction: need at least 3 months, found ${analysis.retentionCurve.length}`
    );
  }

  // Fit exponential decay curve to existing data
  // Retention(t) = a * e^(-b*t)
  const retentionRates = analysis.retentionCurve.map((p) => p.retentionRate);
  const lastRetention = retentionRates[retentionRates.length - 1];
  const lastMonth = analysis.retentionCurve[analysis.retentionCurve.length - 1].monthNumber;

  // Calculate decay rate
  const decayRate = calculateDecayRate(retentionRates);

  // Generate predictions
  const predictions = [];
  for (let i = 1; i <= months; i++) {
    const futureMonth = lastMonth + i;
    const predictedRetention = lastRetention * Math.exp(-decayRate * i);

    // Confidence interval (wider for further predictions)
    const confidenceWidth = Math.min(10 + i * 2, 30); // Max 30% width

    predictions.push({
      monthNumber: futureMonth,
      predictedRetention: Math.round(Math.max(0, predictedRetention) * 100) / 100,
      confidenceInterval: {
        low: Math.round(Math.max(0, predictedRetention - confidenceWidth) * 100) / 100,
        high: Math.round(Math.min(100, predictedRetention + confidenceWidth) * 100) / 100,
      },
    });
  }

  const confidence: 'high' | 'medium' | 'low' =
    analysis.retentionCurve.length >= 6
      ? 'high'
      : analysis.retentionCurve.length >= 4
      ? 'medium'
      : 'low';

  return {
    cohort: analysis.cohort,
    predictions,
    method: 'exponential_decay',
    confidence,
  };
}

/**
 * Segment a cohort by a specific attribute and compare retention
 *
 * @param tenantId - Organization ID
 * @param cohort - Cohort month (first day of month)
 * @param attribute - Attribute to segment by (e.g., 'plan', 'industry', 'size')
 * @returns Cohort segmentation with insights
 */
export async function segmentCohortByAttribute(
  tenantId: string,
  cohort: Date,
  attribute: string
): Promise<CohortSegment> {
  const cohortStart = startOfMonth(cohort);

  // For now, return a placeholder implementation
  // In a real system, this would query user attributes and calculate retention per segment
  const segments = [
    {
      value: 'Free',
      userCount: 50,
      retentionRate: 35.0,
      avgLTV: 0,
    },
    {
      value: 'Pro',
      userCount: 30,
      retentionRate: 65.0,
      avgLTV: 299,
    },
    {
      value: 'Enterprise',
      userCount: 10,
      retentionRate: 85.0,
      avgLTV: 999,
    },
  ];

  const sortedByRetention = [...segments].sort(
    (a, b) => b.retentionRate - a.retentionRate
  );
  const bestSegment = sortedByRetention[0].value;
  const worstSegment = sortedByRetention[sortedByRetention.length - 1].value;

  // Check if difference is significant (>20% difference)
  const retentionDiff =
    sortedByRetention[0].retentionRate -
    sortedByRetention[sortedByRetention.length - 1].retentionRate;
  const significantDifference = retentionDiff > 20;

  return {
    cohort: cohortStart,
    attribute,
    segments,
    insights: {
      bestSegment,
      worstSegment,
      significantDifference,
    },
  };
}

/**
 * Helper: Calculate trend direction from a series of values
 */
function calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
  if (values.length < 2) return 'stable';

  // Simple linear regression slope
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, idx) => sum + val * idx, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 0.5) return 'improving';
  if (slope < -0.5) return 'declining';
  return 'stable';
}

/**
 * Helper: Get status compared to benchmark
 */
function getStatus(current: number, target: number): 'above' | 'below' | 'at' {
  const threshold = 2; // ±2% tolerance
  if (current > target + threshold) return 'above';
  if (current < target - threshold) return 'below';
  return 'at';
}

/**
 * Helper: Calculate exponential decay rate from retention data
 */
function calculateDecayRate(retentionRates: number[]): number {
  if (retentionRates.length < 2) return 0.1; // Default decay

  // Calculate average decay between consecutive months
  let totalDecay = 0;
  let decayCount = 0;

  for (let i = 1; i < retentionRates.length; i++) {
    if (retentionRates[i - 1] > 0) {
      const decay = Math.log(retentionRates[i] / retentionRates[i - 1]);
      totalDecay += Math.abs(decay);
      decayCount++;
    }
  }

  return decayCount > 0 ? totalDecay / decayCount : 0.1;
}
