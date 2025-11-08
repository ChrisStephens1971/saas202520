/**
 * Revenue Calculator Service
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * Advanced revenue calculations and business insights.
 * Works with aggregated revenue data to provide MRR, ARR, churn,
 * growth rates, projections, and revenue breakdowns.
 */

import { PrismaClient } from '@prisma/client';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  
  format,
} from 'date-fns';

const prisma = new PrismaClient();

/**
 * Revenue metrics result
 */
export interface RevenueMetrics {
  mrr: number;
  arr: number;
  period: {
    start: Date;
    end: Date;
  };
  previousPeriod?: {
    mrr: number;
    arr: number;
  };
  growthRate?: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Churn rate result
 */
export interface ChurnRate {
  rate: number; // Percentage (0-100)
  churnedRevenue: number;
  totalRevenue: number;
  period: {
    start: Date;
    end: Date;
  };
  previousPeriod: {
    rate: number;
    churnedRevenue: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Growth rate result
 */
export interface GrowthRate {
  metric: string;
  currentValue: number;
  previousValue: number;
  growthRate: number; // Percentage
  absoluteChange: number;
  period: string;
  trend: 'up' | 'down' | 'flat';
}

/**
 * Revenue projection result
 */
export interface RevenueProjection {
  projections: Array<{
    month: Date;
    projectedRevenue: number;
    confidenceInterval: {
      low: number;
      high: number;
    };
  }>;
  method: 'linear' | 'exponential';
  confidence: 'high' | 'medium' | 'low';
  baseData: {
    historicalMonths: number;
    avgGrowthRate: number;
  };
}

/**
 * Revenue breakdown by category
 */
export interface RevenueBreakdown {
  period: {
    start: Date;
    end: Date;
  };
  total: number;
  breakdown: {
    newRevenue: number | null;
    existingRevenue: number;
    expansionRevenue: number | null;
    churnedRevenue: number | null;
  };
  metrics: {
    totalPayments: number;
    successRate: number;
    avgTransactionValue: number;
    refundRate: number;
  };
}

/**
 * Customer lifetime value
 */
export interface LifetimeValue {
  cohort: Date;
  avgLTV: number;
  totalRevenue: number;
  cohortSize: number;
  avgRevenuePerUser: number;
  projectedLTV: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate Monthly Recurring Revenue (MRR) for a tenant
 *
 * @param tenantId - Organization ID
 * @param date - Reference date (defaults to current month)
 * @returns MRR metrics with comparison to previous period
 */
export async function calculateMRR(
  tenantId: string,
  date: Date = new Date()
): Promise<RevenueMetrics> {
  const periodStart = startOfMonth(date);
  const periodEnd = endOfMonth(date);

  // Get current month's aggregate
  const currentAggregate = await prisma.revenueAggregate.findUnique({
    where: {
      tenantId_periodType_periodStart: {
        tenantId,
        periodType: 'month',
        periodStart,
      },
    },
  });

  if (!currentAggregate) {
    throw new Error(
      `No revenue data found for tenant ${tenantId} in ${format(date, 'yyyy-MM')}`
    );
  }

  const mrr = currentAggregate.mrr ? parseFloat(currentAggregate.mrr.toString()) : 0;
  const arr = currentAggregate.arr ? parseFloat(currentAggregate.arr.toString()) : 0;

  // Get previous month for comparison
  const previousMonthStart = startOfMonth(subMonths(date, 1));
  const previousAggregate = await prisma.revenueAggregate.findUnique({
    where: {
      tenantId_periodType_periodStart: {
        tenantId,
        periodType: 'month',
        periodStart: previousMonthStart,
      },
    },
  });

  let previousMRR: number | undefined;
  let previousARR: number | undefined;
  let growthRate: number | undefined;

  if (previousAggregate) {
    previousMRR = previousAggregate.mrr
      ? parseFloat(previousAggregate.mrr.toString())
      : 0;
    previousARR = previousAggregate.arr
      ? parseFloat(previousAggregate.arr.toString())
      : 0;

    if (previousMRR > 0) {
      growthRate = ((mrr - previousMRR) / previousMRR) * 100;
    }
  }

  // Determine confidence based on data availability
  const confidence: 'high' | 'medium' | 'low' =
    currentAggregate.paymentCount && currentAggregate.paymentCount > 10
      ? 'high'
      : currentAggregate.paymentCount && currentAggregate.paymentCount > 3
      ? 'medium'
      : 'low';

  return {
    mrr,
    arr,
    period: {
      start: periodStart,
      end: periodEnd,
    },
    previousPeriod:
      previousMRR !== undefined && previousARR !== undefined
        ? {
            mrr: previousMRR,
            arr: previousARR,
          }
        : undefined,
    growthRate,
    confidence,
  };
}

/**
 * Calculate Annual Recurring Revenue (ARR) for a tenant
 *
 * @param tenantId - Organization ID
 * @param date - Reference date (defaults to current month)
 * @returns ARR metrics (same structure as MRR)
 */
export async function calculateARR(
  tenantId: string,
  date: Date = new Date()
): Promise<RevenueMetrics> {
  // ARR is calculated from MRR, so we can reuse the same function
  return calculateMRR(tenantId, date);
}

/**
 * Calculate customer churn rate between two periods
 *
 * @param tenantId - Organization ID
 * @param period - Current period date
 * @param previousPeriod - Previous period date
 * @returns Churn rate metrics and trend
 */
export async function calculateChurnRate(
  tenantId: string,
  period: Date,
  previousPeriod: Date
): Promise<ChurnRate> {
  const currentStart = startOfMonth(period);
  const previousStart = startOfMonth(previousPeriod);

  // Get aggregates for both periods
  const [currentAggregate, previousAggregate] = await Promise.all([
    prisma.revenueAggregate.findUnique({
      where: {
        tenantId_periodType_periodStart: {
          tenantId,
          periodType: 'month',
          periodStart: currentStart,
        },
      },
    }),
    prisma.revenueAggregate.findUnique({
      where: {
        tenantId_periodType_periodStart: {
          tenantId,
          periodType: 'month',
          periodStart: previousStart,
        },
      },
    }),
  ]);

  if (!currentAggregate || !previousAggregate) {
    throw new Error(
      `Missing revenue data for churn calculation: tenant ${tenantId}`
    );
  }

  // Calculate current churn rate
  const currentChurnedRevenue = currentAggregate.churnedRevenue
    ? parseFloat(currentAggregate.churnedRevenue.toString())
    : 0;
  const currentTotalRevenue = currentAggregate.totalRevenue
    ? parseFloat(currentAggregate.totalRevenue.toString())
    : 0;

  const currentChurnRate =
    currentTotalRevenue > 0
      ? (currentChurnedRevenue / currentTotalRevenue) * 100
      : 0;

  // Calculate previous churn rate
  const previousChurnedRevenue = previousAggregate.churnedRevenue
    ? parseFloat(previousAggregate.churnedRevenue.toString())
    : 0;
  const previousTotalRevenue = previousAggregate.totalRevenue
    ? parseFloat(previousAggregate.totalRevenue.toString())
    : 0;

  const previousChurnRate =
    previousTotalRevenue > 0
      ? (previousChurnedRevenue / previousTotalRevenue) * 100
      : 0;

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable';
  const difference = Math.abs(currentChurnRate - previousChurnRate);

  if (difference < 0.5) {
    trend = 'stable';
  } else if (currentChurnRate > previousChurnRate) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }

  return {
    rate: currentChurnRate,
    churnedRevenue: currentChurnedRevenue,
    totalRevenue: currentTotalRevenue,
    period: {
      start: currentStart,
      end: endOfMonth(period),
    },
    previousPeriod: {
      rate: previousChurnRate,
      churnedRevenue: previousChurnedRevenue,
    },
    trend,
  };
}

/**
 * Calculate growth rate for any metric
 *
 * @param tenantId - Organization ID (for logging/context)
 * @param metric - Name of the metric being measured
 * @param currentValue - Current period value
 * @param previousValue - Previous period value
 * @returns Growth rate with trend analysis
 */
export async function calculateGrowthRate(
  tenantId: string,
  metric: string,
  currentValue: number,
  previousValue: number
): Promise<GrowthRate> {
  const absoluteChange = currentValue - previousValue;

  let growthRate: number;
  if (previousValue === 0) {
    growthRate = currentValue > 0 ? 100 : 0;
  } else {
    growthRate = (absoluteChange / previousValue) * 100;
  }

  let trend: 'up' | 'down' | 'flat';
  if (Math.abs(growthRate) < 1) {
    trend = 'flat';
  } else if (growthRate > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }

  return {
    metric,
    currentValue,
    previousValue,
    growthRate,
    absoluteChange,
    period: format(new Date(), 'yyyy-MM'),
    trend,
  };
}

/**
 * Calculate revenue projection using simple linear regression
 *
 * @param tenantId - Organization ID
 * @param months - Number of months to project forward
 * @returns Revenue projections with confidence intervals
 */
export async function calculateRevenueProjection(
  tenantId: string,
  months: number = 6
): Promise<RevenueProjection> {
  // Get last 6 months of data for baseline
  const now = new Date();
  const historicalMonths = 6;

  const aggregates = await prisma.revenueAggregate.findMany({
    where: {
      tenantId,
      periodType: 'month',
      periodStart: {
        gte: startOfMonth(subMonths(now, historicalMonths)),
      },
    },
    orderBy: {
      periodStart: 'asc',
    },
  });

  if (aggregates.length < 3) {
    throw new Error(
      `Insufficient data for projection: need at least 3 months, found ${aggregates.length}`
    );
  }

  // Calculate average growth rate
  let totalGrowthRate = 0;
  let growthRateCount = 0;

  for (let i = 1; i < aggregates.length; i++) {
    const current = aggregates[i].totalRevenue
      ? parseFloat(aggregates[i].totalRevenue.toString())
      : 0;
    const previous = aggregates[i - 1].totalRevenue
      ? parseFloat(aggregates[i - 1].totalRevenue.toString())
      : 0;

    if (previous > 0) {
      const growthRate = ((current - previous) / previous) * 100;
      totalGrowthRate += growthRate;
      growthRateCount++;
    }
  }

  const avgGrowthRate =
    growthRateCount > 0 ? totalGrowthRate / growthRateCount : 0;

  // Get last month's revenue as baseline
  const lastRevenue = aggregates[aggregates.length - 1].totalRevenue
    ? parseFloat(aggregates[aggregates.length - 1].totalRevenue.toString())
    : 0;

  // Project forward
  const projections = [];
  let currentProjection = lastRevenue;

  for (let i = 1; i <= months; i++) {
    const month = addMonths(now, i);

    // Apply growth rate
    currentProjection = currentProjection * (1 + avgGrowthRate / 100);

    // Calculate confidence interval (±20% for linear projection)
    const confidenceRange = currentProjection * 0.2;

    projections.push({
      month: startOfMonth(month),
      projectedRevenue: Math.round(currentProjection * 100) / 100,
      confidenceInterval: {
        low: Math.round((currentProjection - confidenceRange) * 100) / 100,
        high: Math.round((currentProjection + confidenceRange) * 100) / 100,
      },
    });
  }

  // Determine overall confidence based on data quality
  const confidence: 'high' | 'medium' | 'low' =
    aggregates.length >= 6 ? 'high' : aggregates.length >= 4 ? 'medium' : 'low';

  return {
    projections,
    method: 'linear',
    confidence,
    baseData: {
      historicalMonths: aggregates.length,
      avgGrowthRate: Math.round(avgGrowthRate * 100) / 100,
    },
  };
}

/**
 * Get detailed revenue breakdown by category
 *
 * @param tenantId - Organization ID
 * @param startDate - Start of period
 * @param endDate - End of period
 * @returns Revenue breakdown with payment metrics
 */
export async function getRevenueBreakdown(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<RevenueBreakdown> {
  const periodStart = startOfMonth(startDate);

  // Get aggregate for the period
  const aggregate = await prisma.revenueAggregate.findUnique({
    where: {
      tenantId_periodType_periodStart: {
        tenantId,
        periodType: 'month',
        periodStart,
      },
    },
  });

  if (!aggregate) {
    throw new Error(
      `No revenue data found for tenant ${tenantId} in ${format(
        startDate,
        'yyyy-MM'
      )}`
    );
  }

  const totalRevenue = aggregate.totalRevenue
    ? parseFloat(aggregate.totalRevenue.toString())
    : 0;
  const newRevenue = aggregate.newRevenue
    ? parseFloat(aggregate.newRevenue.toString())
    : null;
  const expansionRevenue = aggregate.expansionRevenue
    ? parseFloat(aggregate.expansionRevenue.toString())
    : null;
  const churnedRevenue = aggregate.churnedRevenue
    ? parseFloat(aggregate.churnedRevenue.toString())
    : null;

  // Calculate existing revenue (total - new - expansion)
  const existingRevenue =
    totalRevenue -
    (newRevenue || 0) -
    (expansionRevenue || 0) +
    (churnedRevenue || 0);

  // Calculate payment metrics
  const totalPayments = aggregate.paymentCount || 0;
  const successfulPayments = aggregate.paymentSuccessCount || 0;
  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
  const avgTransactionValue =
    successfulPayments > 0 ? totalRevenue / successfulPayments : 0;

  const refundAmount = aggregate.refundAmount
    ? parseFloat(aggregate.refundAmount.toString())
    : 0;
  const refundRate = totalRevenue > 0 ? (refundAmount / totalRevenue) * 100 : 0;

  return {
    period: {
      start: periodStart,
      end: endOfMonth(startDate),
    },
    total: totalRevenue,
    breakdown: {
      newRevenue,
      existingRevenue: Math.max(0, existingRevenue),
      expansionRevenue,
      churnedRevenue,
    },
    metrics: {
      totalPayments,
      successRate: Math.round(successRate * 100) / 100,
      avgTransactionValue: Math.round(avgTransactionValue * 100) / 100,
      refundRate: Math.round(refundRate * 100) / 100,
    },
  };
}

/**
 * Calculate average customer lifetime value (LTV) for a cohort
 *
 * @param tenantId - Organization ID
 * @param cohort - Cohort month (first day of month)
 * @returns LTV metrics for the cohort
 */
export async function calculateLifetimeValue(
  tenantId: string,
  cohort: Date
): Promise<LifetimeValue> {
  const cohortStart = startOfMonth(cohort);

  // Get cohort data
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
        cohort,
        'yyyy-MM'
      )}`
    );
  }

  const cohortSize = cohortData[0].cohortSize;

  // Sum up revenue across all months
  const totalRevenue = cohortData.reduce((sum, data) => {
    const revenue = data.revenue ? parseFloat(data.revenue.toString()) : 0;
    return sum + revenue;
  }, 0);

  const avgRevenuePerUser = cohortSize > 0 ? totalRevenue / cohortSize : 0;

  // Calculate projected LTV based on retention curve
  // Get the latest LTV value if available
  const latestData = cohortData[cohortData.length - 1];
  const calculatedLTV = latestData.ltv
    ? parseFloat(latestData.ltv.toString())
    : avgRevenuePerUser;

  // Project LTV based on current trend (simple multiplication)
  const monthsActive = cohortData.length;
  const projectionMultiplier = monthsActive < 12 ? 12 / monthsActive : 1.2;
  const projectedLTV = calculatedLTV * projectionMultiplier;

  // Determine confidence
  const confidence: 'high' | 'medium' | 'low' =
    monthsActive >= 6 ? 'high' : monthsActive >= 3 ? 'medium' : 'low';

  return {
    cohort: cohortStart,
    avgLTV: Math.round(calculatedLTV * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    cohortSize,
    avgRevenuePerUser: Math.round(avgRevenuePerUser * 100) / 100,
    projectedLTV: Math.round(projectedLTV * 100) / 100,
    confidence,
  };
}
