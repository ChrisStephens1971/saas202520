/**
 * Analytics Service (Orchestrator)
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * Main service that orchestrates all analytics operations.
 * Integrates revenue calculator, cohort analyzer, and cache manager
 * to provide high-level analytics APIs with intelligent caching.
 */

import { PrismaClient } from '@prisma/client';
import { startOfMonth, subMonths, format } from 'date-fns';
import * as RevenueCalculator from './revenue-calculator';
import * as CohortAnalyzer from './cohort-analyzer';
import * as CacheManager from './cache-manager';

const prisma = new PrismaClient();

/**
 * Analytics options for queries
 */
export interface AnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  useCache?: boolean;
  cacheTTL?: number; // Seconds
  includeComparison?: boolean; // Include period-over-period comparison
}

/**
 * Revenue analytics result
 */
export interface RevenueAnalytics {
  current: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    period: { start: Date; end: Date };
  };
  previous?: {
    mrr: number;
    arr: number;
    totalRevenue: number;
  };
  growth?: {
    mrrGrowth: number;
    arrGrowth: number;
    revenueGrowth: number;
  };
  breakdown: RevenueCalculator.RevenueBreakdown;
  projection?: RevenueCalculator.RevenueProjection;
  cached: boolean;
  generatedAt: Date;
}

/**
 * Cohort analytics result
 */
export interface CohortAnalytics {
  cohorts: CohortAnalyzer.CohortAnalysis[];
  comparison?: CohortAnalyzer.CohortComparison;
  benchmarks?: CohortAnalyzer.RetentionBenchmarks;
  predictions?: CohortAnalyzer.RetentionPrediction[];
  cached: boolean;
  generatedAt: Date;
}

/**
 * Tournament analytics result
 */
export interface TournamentAnalytics {
  period: { start: Date; end: Date };
  metrics: {
    totalTournaments: number;
    completedTournaments: number;
    completionRate: number;
    totalPlayers: number;
    avgPlayers: number;
    avgDuration: number;
    popularFormat: string | null;
    revenue: number;
  };
  previous?: {
    totalTournaments: number;
    completionRate: number;
    revenue: number;
  };
  growth?: {
    tournamentGrowth: number;
    revenueGrowth: number;
  };
  cached: boolean;
  generatedAt: Date;
}

/**
 * Dashboard summary with high-level KPIs
 */
export interface DashboardSummary {
  tenantId: string;
  period: { start: Date; end: Date };
  kpis: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    mrrGrowth: number;
    activeUsers: number;
    retentionRate: number;
    churnRate: number;
    avgLTV: number;
    totalTournaments: number;
    completionRate: number;
  };
  trends: {
    revenue: 'up' | 'down' | 'flat';
    retention: 'up' | 'down' | 'flat';
    tournaments: 'up' | 'down' | 'flat';
  };
  alerts: Array<{
    type: 'warning' | 'info' | 'success';
    message: string;
  }>;
  cached: boolean;
  generatedAt: Date;
}

/**
 * Analytics health metrics
 */
export interface AnalyticsHealth {
  tenantId: string;
  status: 'healthy' | 'stale' | 'missing';
  dataFreshness: {
    revenue: { lastUpdate: Date; hoursAgo: number };
    cohorts: { lastUpdate: Date; hoursAgo: number };
    tournaments: { lastUpdate: Date; hoursAgo: number };
  };
  dataQuality: {
    revenueCompleteness: number; // Percentage
    cohortCompleteness: number;
    tournamentCompleteness: number;
  };
  cacheStats: {
    hitRate: number;
    missRate: number;
    avgResponseTime: number;
  };
  recommendations: string[];
}

/**
 * Get comprehensive revenue analytics
 *
 * @param tenantId - Organization ID
 * @param options - Analytics options
 * @returns Revenue analytics with caching
 */
export async function getRevenueAnalytics(
  tenantId: string,
  options: AnalyticsOptions = {}
): Promise<RevenueAnalytics> {
  const {
    startDate = new Date(),
    useCache = true,
    cacheTTL = 300, // 5 minutes default
    includeComparison = true,
  } = options;

  // Generate cache key
  const cacheKey = CacheManager.getCacheKey(
    'analytics:revenue',
    tenantId,
    format(startDate, 'yyyy-MM')
  );

  // Try cache first
  if (useCache) {
    const cached = await CacheManager.get<RevenueAnalytics>(cacheKey);
    if (cached) {
      console.log(`[Analytics] Cache hit for revenue analytics: ${tenantId}`);
      return { ...cached, cached: true };
    }
  }

  console.log(`[Analytics] Computing revenue analytics for ${tenantId}`);

  // Calculate current period metrics
  const mrrMetrics = await RevenueCalculator.calculateMRR(tenantId, startDate);
  const breakdown = await RevenueCalculator.getRevenueBreakdown(
    tenantId,
    startOfMonth(startDate),
    startDate
  );

  // Build result
  const result: RevenueAnalytics = {
    current: {
      mrr: mrrMetrics.mrr,
      arr: mrrMetrics.arr,
      totalRevenue: breakdown.total,
      period: mrrMetrics.period,
    },
    breakdown,
    cached: false,
    generatedAt: new Date(),
  };

  // Add comparison if requested
  if (includeComparison && mrrMetrics.previousPeriod) {
    result.previous = {
      mrr: mrrMetrics.previousPeriod.mrr,
      arr: mrrMetrics.previousPeriod.arr,
      totalRevenue: mrrMetrics.previousPeriod.mrr * 1, // Approximation
    };

    result.growth = {
      mrrGrowth: mrrMetrics.growthRate || 0,
      arrGrowth: mrrMetrics.growthRate || 0,
      revenueGrowth:
        result.previous.totalRevenue > 0
          ? ((result.current.totalRevenue - result.previous.totalRevenue) /
              result.previous.totalRevenue) *
            100
          : 0,
    };
  }

  // Add projection
  try {
    result.projection = await RevenueCalculator.calculateRevenueProjection(
      tenantId,
      6
    );
  } catch (error) {
    console.warn(`[Analytics] Could not generate projection: ${error}`);
  }

  // Cache the result
  if (useCache) {
    await CacheManager.set(cacheKey, result, cacheTTL);
  }

  return result;
}

/**
 * Get comprehensive cohort analytics
 *
 * @param tenantId - Organization ID
 * @param options - Analytics options
 * @returns Cohort analytics with caching
 */
export async function getCohortAnalytics(
  tenantId: string,
  options: AnalyticsOptions = {}
): Promise<CohortAnalytics> {
  const { useCache = true, cacheTTL = 600, includeComparison = true } = options;

  // Generate cache key
  const cacheKey = CacheManager.getCacheKey('analytics:cohorts', tenantId);

  // Try cache first
  if (useCache) {
    const cached = await CacheManager.get<CohortAnalytics>(cacheKey);
    if (cached) {
      console.log(`[Analytics] Cache hit for cohort analytics: ${tenantId}`);
      return { ...cached, cached: true };
    }
  }

  console.log(`[Analytics] Computing cohort analytics for ${tenantId}`);

  // Get last 6 months of cohorts
  const now = new Date();
  const cohortMonths = [];
  for (let i = 0; i < 6; i++) {
    cohortMonths.push(startOfMonth(subMonths(now, i)));
  }

  // Analyze each cohort
  const cohorts: CohortAnalyzer.CohortAnalysis[] = [];
  for (const cohortMonth of cohortMonths) {
    try {
      const analysis = await CohortAnalyzer.analyzeCohort(tenantId, cohortMonth);
      cohorts.push(analysis);
    } catch (error) {
      console.warn(
        `[Analytics] No data for cohort ${format(cohortMonth, 'yyyy-MM')}`
      );
    }
  }

  const result: CohortAnalytics = {
    cohorts,
    cached: false,
    generatedAt: new Date(),
  };

  // Add comparison if requested
  if (includeComparison && cohorts.length >= 2) {
    try {
      result.comparison = await CohortAnalyzer.compareCohortsRetention(
        tenantId,
        cohortMonths.slice(0, Math.min(cohortMonths.length, 6))
      );
    } catch (error) {
      console.warn(`[Analytics] Could not generate cohort comparison: ${error}`);
    }
  }

  // Add benchmarks
  try {
    result.benchmarks = await CohortAnalyzer.getRetentionBenchmarks(tenantId);
  } catch (error) {
    console.warn(`[Analytics] Could not generate benchmarks: ${error}`);
  }

  // Add predictions for latest cohort
  if (cohorts.length > 0) {
    try {
      const latestCohort = cohorts[0];
      const prediction = await CohortAnalyzer.predictFutureRetention(
        tenantId,
        latestCohort.cohort,
        6
      );
      result.predictions = [prediction];
    } catch (error) {
      console.warn(`[Analytics] Could not generate predictions: ${error}`);
    }
  }

  // Cache the result
  if (useCache) {
    await CacheManager.set(cacheKey, result, cacheTTL);
  }

  return result;
}

/**
 * Get tournament analytics
 *
 * @param tenantId - Organization ID
 * @param options - Analytics options
 * @returns Tournament analytics with caching
 */
export async function getTournamentAnalytics(
  tenantId: string,
  options: AnalyticsOptions = {}
): Promise<TournamentAnalytics> {
  const {
    startDate = new Date(),
    useCache = true,
    cacheTTL = 300,
    includeComparison = true,
  } = options;

  const periodStart = startOfMonth(startDate);

  // Generate cache key
  const cacheKey = CacheManager.getCacheKey(
    'analytics:tournaments',
    tenantId,
    format(periodStart, 'yyyy-MM')
  );

  // Try cache first
  if (useCache) {
    const cached = await CacheManager.get<TournamentAnalytics>(cacheKey);
    if (cached) {
      console.log(`[Analytics] Cache hit for tournament analytics: ${tenantId}`);
      return { ...cached, cached: true };
    }
  }

  console.log(`[Analytics] Computing tournament analytics for ${tenantId}`);

  // Get current period aggregate
  const aggregate = await prisma.tournamentAggregate.findUnique({
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
      `No tournament data found for tenant ${tenantId} in ${format(
        startDate,
        'yyyy-MM'
      )}`
    );
  }

  const result: TournamentAnalytics = {
    period: {
      start: aggregate.periodStart,
      end: aggregate.periodEnd,
    },
    metrics: {
      totalTournaments: aggregate.tournamentCount || 0,
      completedTournaments: aggregate.completedCount || 0,
      completionRate: aggregate.completionRate
        ? parseFloat(aggregate.completionRate.toString())
        : 0,
      totalPlayers: aggregate.totalPlayers || 0,
      avgPlayers: aggregate.avgPlayers
        ? parseFloat(aggregate.avgPlayers.toString())
        : 0,
      avgDuration: aggregate.avgDurationMinutes
        ? parseFloat(aggregate.avgDurationMinutes.toString())
        : 0,
      popularFormat: aggregate.mostPopularFormat,
      revenue: aggregate.revenue ? parseFloat(aggregate.revenue.toString()) : 0,
    },
    cached: false,
    generatedAt: new Date(),
  };

  // Add comparison if requested
  if (includeComparison) {
    const previousMonthStart = startOfMonth(subMonths(startDate, 1));
    const previousAggregate = await prisma.tournamentAggregate.findUnique({
      where: {
        tenantId_periodType_periodStart: {
          tenantId,
          periodType: 'month',
          periodStart: previousMonthStart,
        },
      },
    });

    if (previousAggregate) {
      const previousRevenue = previousAggregate.revenue
        ? parseFloat(previousAggregate.revenue.toString())
        : 0;

      result.previous = {
        totalTournaments: previousAggregate.tournamentCount || 0,
        completionRate: previousAggregate.completionRate
          ? parseFloat(previousAggregate.completionRate.toString())
          : 0,
        revenue: previousRevenue,
      };

      result.growth = {
        tournamentGrowth:
          result.previous.totalTournaments > 0
            ? ((result.metrics.totalTournaments - result.previous.totalTournaments) /
                result.previous.totalTournaments) *
              100
            : 0,
        revenueGrowth:
          result.previous.revenue > 0
            ? ((result.metrics.revenue - result.previous.revenue) /
                result.previous.revenue) *
              100
            : 0,
      };
    }
  }

  // Cache the result
  if (useCache) {
    await CacheManager.set(cacheKey, result, cacheTTL);
  }

  return result;
}

/**
 * Get high-level dashboard summary
 *
 * @param tenantId - Organization ID
 * @returns Dashboard KPIs and trends
 */
export async function getDashboardSummary(
  tenantId: string
): Promise<DashboardSummary> {
  console.log(`[Analytics] Generating dashboard summary for ${tenantId}`);

  const now = new Date();

  // Get all analytics in parallel
  const [revenue, cohorts, tournaments] = await Promise.all([
    getRevenueAnalytics(tenantId, { includeComparison: true }),
    getCohortAnalytics(tenantId, { includeComparison: true }),
    getTournamentAnalytics(tenantId, { includeComparison: true }),
  ]);

  // Calculate KPIs
  const latestCohort = cohorts.cohorts[0];
  const avgLTV = latestCohort?.revenue.ltv || 0;
  const retentionRate = latestCohort?.metrics.month1Retention || 0;

  // Calculate churn rate (simplified)
  const churnRate = 100 - retentionRate;

  // Get active users count (from latest cohort)
  const activeUsers = latestCohort?.cohortSize || 0;

  // Determine trends
  const revenueTrend: 'up' | 'down' | 'flat' =
    revenue.growth?.revenueGrowth && revenue.growth.revenueGrowth > 2
      ? 'up'
      : revenue.growth?.revenueGrowth && revenue.growth.revenueGrowth < -2
      ? 'down'
      : 'flat';

  const retentionTrend: 'up' | 'down' | 'flat' =
    cohorts.comparison?.insights.avgRetentionTrend === 'improving'
      ? 'up'
      : cohorts.comparison?.insights.avgRetentionTrend === 'declining'
      ? 'down'
      : 'flat';

  const tournamentTrend: 'up' | 'down' | 'flat' =
    tournaments.growth?.tournamentGrowth && tournaments.growth.tournamentGrowth > 5
      ? 'up'
      : tournaments.growth?.tournamentGrowth &&
        tournaments.growth.tournamentGrowth < -5
      ? 'down'
      : 'flat';

  // Generate alerts
  const alerts: Array<{ type: 'warning' | 'info' | 'success'; message: string }> = [];

  if (churnRate > 70) {
    alerts.push({
      type: 'warning',
      message: 'High churn rate detected. Review onboarding and engagement strategies.',
    });
  }

  if (revenueTrend === 'up' && revenue.growth?.revenueGrowth && revenue.growth.revenueGrowth > 20) {
    alerts.push({
      type: 'success',
      message: `Strong revenue growth of ${revenue.growth.revenueGrowth.toFixed(1)}%!`,
    });
  }

  if (tournaments.metrics.completionRate < 50) {
    alerts.push({
      type: 'warning',
      message: 'Low tournament completion rate. Investigate user experience issues.',
    });
  }

  return {
    tenantId,
    period: revenue.current.period,
    kpis: {
      mrr: revenue.current.mrr,
      arr: revenue.current.arr,
      totalRevenue: revenue.current.totalRevenue,
      mrrGrowth: revenue.growth?.mrrGrowth || 0,
      activeUsers,
      retentionRate,
      churnRate,
      avgLTV,
      totalTournaments: tournaments.metrics.totalTournaments,
      completionRate: tournaments.metrics.completionRate,
    },
    trends: {
      revenue: revenueTrend,
      retention: retentionTrend,
      tournaments: tournamentTrend,
    },
    alerts,
    cached: revenue.cached && cohorts.cached && tournaments.cached,
    generatedAt: new Date(),
  };
}

/**
 * Force refresh analytics by invalidating cache
 *
 * @param tenantId - Organization ID
 */
export async function refreshAnalytics(tenantId: string): Promise<void> {
  console.log(`[Analytics] Refreshing analytics cache for ${tenantId}`);

  // Invalidate all analytics caches for this tenant
  await CacheManager.invalidate(`analytics:*:${tenantId}*`);

  console.log(`[Analytics] Analytics cache refreshed for ${tenantId}`);
}

/**
 * Get analytics health and data quality metrics
 *
 * @param tenantId - Organization ID
 * @returns Analytics health status
 */
export async function getAnalyticsHealth(
  tenantId: string
): Promise<AnalyticsHealth> {
  console.log(`[Analytics] Checking analytics health for ${tenantId}`);

  const now = new Date();

  // Check revenue data freshness
  const latestRevenue = await prisma.revenueAggregate.findFirst({
    where: { tenantId, periodType: 'month' },
    orderBy: { updatedAt: 'desc' },
  });

  const revenueHoursAgo = latestRevenue
    ? (now.getTime() - latestRevenue.updatedAt.getTime()) / (1000 * 60 * 60)
    : 999;

  // Check cohort data freshness
  const latestCohort = await prisma.userCohort.findFirst({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
  });

  const cohortHoursAgo = latestCohort
    ? (now.getTime() - latestCohort.updatedAt.getTime()) / (1000 * 60 * 60)
    : 999;

  // Check tournament data freshness
  const latestTournament = await prisma.tournamentAggregate.findFirst({
    where: { tenantId, periodType: 'month' },
    orderBy: { updatedAt: 'desc' },
  });

  const tournamentHoursAgo = latestTournament
    ? (now.getTime() - latestTournament.updatedAt.getTime()) / (1000 * 60 * 60)
    : 999;

  // Determine overall status
  const maxHoursAgo = Math.max(revenueHoursAgo, cohortHoursAgo, tournamentHoursAgo);
  const status: 'healthy' | 'stale' | 'missing' =
    maxHoursAgo < 24 ? 'healthy' : maxHoursAgo < 72 ? 'stale' : 'missing';

  // Get cache stats
  const cacheStats = await CacheManager.getCacheStats();

  // Generate recommendations
  const recommendations: string[] = [];
  if (status === 'stale') {
    recommendations.push('Run aggregation job to update analytics data');
  }
  if (status === 'missing') {
    recommendations.push('Critical: Analytics data is outdated. Run aggregation immediately.');
  }
  if (cacheStats.hitRate < 50) {
    recommendations.push('Low cache hit rate. Consider warming cache or increasing TTL.');
  }

  return {
    tenantId,
    status,
    dataFreshness: {
      revenue: {
        lastUpdate: latestRevenue?.updatedAt || new Date(0),
        hoursAgo: Math.round(revenueHoursAgo * 10) / 10,
      },
      cohorts: {
        lastUpdate: latestCohort?.updatedAt || new Date(0),
        hoursAgo: Math.round(cohortHoursAgo * 10) / 10,
      },
      tournaments: {
        lastUpdate: latestTournament?.updatedAt || new Date(0),
        hoursAgo: Math.round(tournamentHoursAgo * 10) / 10,
      },
    },
    dataQuality: {
      revenueCompleteness: latestRevenue ? 100 : 0,
      cohortCompleteness: latestCohort ? 100 : 0,
      tournamentCompleteness: latestTournament ? 100 : 0,
    },
    cacheStats,
    recommendations,
  };
}
