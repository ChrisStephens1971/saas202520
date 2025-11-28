/**
 * Usage Examples
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * Comprehensive examples showing how to use all analytics services.
 * These examples can be used as reference for API routes, dashboards,
 * and other analytics integrations.
 */

import * as RevenueCalculator from './revenue-calculator';
import * as CohortAnalyzer from './cohort-analyzer';
import * as AnalyticsService from './analytics-service';
import * as CacheManager from './cache-manager';
import { seedAnalyticsData, clearTestData } from './seed-test-data';
import { format, subMonths } from 'date-fns';

/**
 * Example 1: Basic Revenue Analysis
 *
 * Get current month's revenue metrics with comparison to previous month.
 */
export async function example1_BasicRevenueAnalysis(tenantId: string) {
  console.log('\n=== Example 1: Basic Revenue Analysis ===\n');

  // Calculate MRR with period comparison
  const metrics = await RevenueCalculator.calculateMRR(tenantId);

  console.log('Current Period:');
  console.log(`  MRR: $${metrics.mrr.toLocaleString()}`);
  console.log(`  ARR: $${metrics.arr.toLocaleString()}`);
  console.log(`  Confidence: ${metrics.confidence}`);

  if (metrics.previousPeriod && metrics.growthRate !== undefined) {
    console.log('\nPrevious Period:');
    console.log(`  MRR: $${metrics.previousPeriod.mrr.toLocaleString()}`);
    console.log(`  Growth Rate: ${metrics.growthRate.toFixed(2)}%`);
  }

  return metrics;
}

/**
 * Example 2: Revenue Breakdown
 *
 * Get detailed breakdown of revenue sources and payment metrics.
 */
export async function example2_RevenueBreakdown(tenantId: string) {
  console.log('\n=== Example 2: Revenue Breakdown ===\n');

  const now = new Date();
  const breakdown = await RevenueCalculator.getRevenueBreakdown(tenantId, now, now);

  console.log('Revenue Breakdown:');
  console.log(`  Total Revenue: $${breakdown.total.toLocaleString()}`);
  console.log(`  New Revenue: $${breakdown.breakdown.newRevenue || 0}`);
  console.log(`  Existing Revenue: $${breakdown.breakdown.existingRevenue}`);
  console.log(`  Expansion: $${breakdown.breakdown.expansionRevenue || 0}`);
  console.log(`  Churned: $${breakdown.breakdown.churnedRevenue || 0}`);

  console.log('\nPayment Metrics:');
  console.log(`  Total Payments: ${breakdown.metrics.totalPayments}`);
  console.log(`  Success Rate: ${breakdown.metrics.successRate}%`);
  console.log(`  Avg Transaction: $${breakdown.metrics.avgTransactionValue}`);
  console.log(`  Refund Rate: ${breakdown.metrics.refundRate}%`);

  return breakdown;
}

/**
 * Example 3: Revenue Projection
 *
 * Project revenue for the next 6 months based on historical trends.
 */
export async function example3_RevenueProjection(tenantId: string) {
  console.log('\n=== Example 3: Revenue Projection ===\n');

  const projection = await RevenueCalculator.calculateRevenueProjection(tenantId, 6);

  console.log(`Method: ${projection.method}`);
  console.log(`Confidence: ${projection.confidence}`);
  console.log(`Avg Growth Rate: ${projection.baseData.avgGrowthRate.toFixed(2)}%`);
  console.log(`\nProjections:`);

  projection.projections.forEach((p) => {
    console.log(
      `  ${format(p.month, 'MMM yyyy')}: $${p.projectedRevenue.toLocaleString()} (±$${(
        p.confidenceInterval.high - p.projectedRevenue
      ).toLocaleString()})`
    );
  });

  return projection;
}

/**
 * Example 4: Cohort Retention Analysis
 *
 * Analyze a specific cohort's retention over time.
 */
export async function example4_CohortRetentionAnalysis(tenantId: string) {
  console.log('\n=== Example 4: Cohort Retention Analysis ===\n');

  // Analyze the most recent cohort (3 months ago for maturity)
  const cohortDate = subMonths(new Date(), 3);
  const analysis = await CohortAnalyzer.analyzeCohort(tenantId, cohortDate);

  console.log(`Cohort: ${format(analysis.cohort, 'MMMM yyyy')}`);
  console.log(`Status: ${analysis.status}`);
  console.log(`Size: ${analysis.cohortSize} users`);

  console.log('\nRetention Metrics:');
  console.log(`  Avg Retention: ${analysis.metrics.avgRetentionRate}%`);
  console.log(`  Month 1: ${analysis.metrics.month1Retention}%`);
  console.log(`  Month 3: ${analysis.metrics.month3Retention}%`);

  console.log('\nRevenue Metrics:');
  console.log(`  Total Revenue: $${analysis.revenue.totalRevenue}`);
  console.log(`  Avg per User: $${analysis.revenue.avgRevenuePerUser}`);
  console.log(`  LTV: $${analysis.revenue.ltv}`);

  console.log('\nRetention Curve:');
  analysis.retentionCurve.slice(0, 6).forEach((point) => {
    console.log(
      `  Month ${point.monthNumber}: ${point.retentionRate.toFixed(2)}% (${
        point.retainedUsers
      } users)`
    );
  });

  return analysis;
}

/**
 * Example 5: Multi-Cohort Comparison
 *
 * Compare retention across multiple cohorts to identify trends.
 */
export async function example5_MultiCohortComparison(tenantId: string) {
  console.log('\n=== Example 5: Multi-Cohort Comparison ===\n');

  // Compare last 6 cohorts
  const cohorts = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i + 1));

  const comparison = await CohortAnalyzer.compareCohortsRetention(tenantId, cohorts);

  console.log('Cohort Performance:');
  comparison.cohorts.forEach((c) => {
    console.log(
      `  ${format(c.cohort, 'MMM yyyy')}: ${c.month1Retention.toFixed(2)}% Month 1 | LTV: $${c.currentLTV}`
    );
  });

  console.log('\nInsights:');
  console.log(`  Best Cohort: ${format(comparison.insights.bestPerformingCohort, 'MMM yyyy')}`);
  console.log(`  Worst Cohort: ${format(comparison.insights.worstPerformingCohort, 'MMM yyyy')}`);
  console.log(`  Trend: ${comparison.insights.avgRetentionTrend}`);
  console.log(`  Volatility: ${comparison.insights.retentionVolatility.toFixed(2)}%`);

  return comparison;
}

/**
 * Example 6: Retention Benchmarks
 *
 * Compare tenant retention to industry benchmarks.
 */
export async function example6_RetentionBenchmarks(tenantId: string) {
  console.log('\n=== Example 6: Retention Benchmarks ===\n');

  const benchmarks = await CohortAnalyzer.getRetentionBenchmarks(tenantId);

  console.log(`Industry: ${benchmarks.industry}`);
  console.log('\nBenchmark Comparison:');

  console.log(
    `  Month 1: ${benchmarks.benchmarks.month1.current.toFixed(2)}% vs ${
      benchmarks.benchmarks.month1.target
    }% target (${benchmarks.benchmarks.month1.status})`
  );
  console.log(
    `  Month 3: ${benchmarks.benchmarks.month3.current.toFixed(2)}% vs ${
      benchmarks.benchmarks.month3.target
    }% target (${benchmarks.benchmarks.month3.status})`
  );
  console.log(
    `  Month 6: ${benchmarks.benchmarks.month6.current.toFixed(2)}% vs ${
      benchmarks.benchmarks.month6.target
    }% target (${benchmarks.benchmarks.month6.status})`
  );

  console.log('\nRecommendations:');
  benchmarks.recommendations.forEach((rec, idx) => {
    console.log(`  ${idx + 1}. ${rec}`);
  });

  return benchmarks;
}

/**
 * Example 7: Complete Dashboard Data
 *
 * Get all data needed for an analytics dashboard.
 */
export async function example7_CompleteDashboard(tenantId: string) {
  console.log('\n=== Example 7: Complete Dashboard Data ===\n');

  const dashboard = await AnalyticsService.getDashboardSummary(tenantId);

  console.log('Key Performance Indicators:');
  console.log(`  MRR: $${dashboard.kpis.mrr.toLocaleString()}`);
  console.log(`  ARR: $${dashboard.kpis.arr.toLocaleString()}`);
  console.log(`  MRR Growth: ${dashboard.kpis.mrrGrowth.toFixed(2)}%`);
  console.log(`  Active Users: ${dashboard.kpis.activeUsers}`);
  console.log(`  Retention Rate: ${dashboard.kpis.retentionRate.toFixed(2)}%`);
  console.log(`  Churn Rate: ${dashboard.kpis.churnRate.toFixed(2)}%`);
  console.log(`  Avg LTV: $${dashboard.kpis.avgLTV.toLocaleString()}`);
  console.log(`  Tournaments: ${dashboard.kpis.totalTournaments}`);
  console.log(`  Completion Rate: ${dashboard.kpis.completionRate.toFixed(2)}%`);

  console.log('\nTrends:');
  console.log(`  Revenue: ${dashboard.trends.revenue}`);
  console.log(`  Retention: ${dashboard.trends.retention}`);
  console.log(`  Tournaments: ${dashboard.trends.tournaments}`);

  if (dashboard.alerts.length > 0) {
    console.log('\nAlerts:');
    dashboard.alerts.forEach((alert) => {
      console.log(`  [${alert.type.toUpperCase()}] ${alert.message}`);
    });
  }

  console.log(`\nCached: ${dashboard.cached}`);
  console.log(`Generated: ${dashboard.generatedAt.toISOString()}`);

  return dashboard;
}

/**
 * Example 8: Analytics Health Check
 *
 * Monitor data freshness and quality.
 */
export async function example8_AnalyticsHealthCheck(tenantId: string) {
  console.log('\n=== Example 8: Analytics Health Check ===\n');

  const health = await AnalyticsService.getAnalyticsHealth(tenantId);

  console.log(`Overall Status: ${health.status.toUpperCase()}`);

  console.log('\nData Freshness:');
  console.log(`  Revenue: ${health.dataFreshness.revenue.hoursAgo.toFixed(1)}h ago`);
  console.log(`  Cohorts: ${health.dataFreshness.cohorts.hoursAgo.toFixed(1)}h ago`);
  console.log(`  Tournaments: ${health.dataFreshness.tournaments.hoursAgo.toFixed(1)}h ago`);

  console.log('\nData Quality:');
  console.log(`  Revenue: ${health.dataQuality.revenueCompleteness.toFixed(1)}%`);
  console.log(`  Cohorts: ${health.dataQuality.cohortCompleteness.toFixed(1)}%`);
  console.log(`  Tournaments: ${health.dataQuality.tournamentCompleteness.toFixed(1)}%`);

  console.log('\nCache Performance:');
  console.log(`  Hit Rate: ${health.cacheStats.hitRate.toFixed(2)}%`);
  console.log(`  Miss Rate: ${health.cacheStats.missRate.toFixed(2)}%`);

  if (health.recommendations.length > 0) {
    console.log('\nRecommendations:');
    health.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
  }

  return health;
}

/**
 * Example 9: Cache Warming
 *
 * Pre-populate cache for better performance.
 */
export async function example9_CacheWarming(tenantId: string) {
  console.log('\n=== Example 9: Cache Warming ===\n');

  console.log('Warming cache for tenant...');

  const startTime = Date.now();
  await CacheManager.warmCache(tenantId);
  const duration = Date.now() - startTime;

  console.log(`Cache warming complete in ${duration}ms`);

  // Check cache stats
  const stats = await CacheManager.getCacheStats();
  console.log('\nCache Statistics:');
  console.log(`  Total Requests: ${stats.totalRequests}`);
  console.log(`  Hits: ${stats.hits}`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Hit Rate: ${stats.hitRate.toFixed(2)}%`);
  console.log(`  Sets: ${stats.sets}`);

  if (stats.memoryUsage) {
    console.log('\nMemory Usage:');
    console.log(`  Used: ${stats.memoryUsage.used}`);
    console.log(`  Peak: ${stats.memoryUsage.peak}`);
    console.log(`  Fragmentation: ${stats.memoryUsage.fragmentation}`);
  }

  return stats;
}

/**
 * Example 10: Complete Workflow
 *
 * Full workflow from seeding data to generating analytics.
 */
export async function example10_CompleteWorkflow(tenantId: string) {
  console.log('\n=== Example 10: Complete Workflow ===\n');

  // Step 1: Clear any existing test data
  console.log('Step 1: Clearing existing test data...');
  await clearTestData(tenantId);

  // Step 2: Seed test data
  console.log('\nStep 2: Seeding 12 months of test data...');
  await seedAnalyticsData(tenantId, 12, {
    baseUsers: 150,
    baseRevenue: 7500,
    baseTournaments: 75,
    growthRate: 0.1,
    churnRate: 0.18,
    seasonality: true,
  });

  // Step 3: Warm cache
  console.log('\nStep 3: Warming cache...');
  await CacheManager.warmCache(tenantId);

  // Step 4: Get dashboard summary
  console.log('\nStep 4: Fetching dashboard summary...');
  const dashboard = await AnalyticsService.getDashboardSummary(tenantId);

  console.log('\nDashboard Summary:');
  console.log(`  MRR: $${dashboard.kpis.mrr.toLocaleString()}`);
  console.log(`  Active Users: ${dashboard.kpis.activeUsers}`);
  console.log(`  Retention: ${dashboard.kpis.retentionRate.toFixed(1)}%`);
  console.log(`  Tournaments: ${dashboard.kpis.totalTournaments}`);

  // Step 5: Check health
  console.log('\nStep 5: Checking analytics health...');
  const health = await AnalyticsService.getAnalyticsHealth(tenantId);
  console.log(`  Status: ${health.status}`);
  console.log(`  Cache Hit Rate: ${health.cacheStats.hitRate.toFixed(1)}%`);

  console.log('\n✅ Complete workflow finished successfully!');

  return { dashboard, health };
}

/**
 * Run all examples
 *
 * Execute all example functions in sequence.
 */
export async function runAllExamples(tenantId: string) {
  console.log('====================================');
  console.log('  ANALYTICS SERVICES - ALL EXAMPLES');
  console.log('====================================');

  try {
    // Ensure test data exists
    console.log('\nPreparing test data...');
    await seedAnalyticsData(tenantId, 12);

    // Run examples
    await example1_BasicRevenueAnalysis(tenantId);
    await example2_RevenueBreakdown(tenantId);
    await example3_RevenueProjection(tenantId);
    await example4_CohortRetentionAnalysis(tenantId);
    await example5_MultiCohortComparison(tenantId);
    await example6_RetentionBenchmarks(tenantId);
    await example7_CompleteDashboard(tenantId);
    await example8_AnalyticsHealthCheck(tenantId);
    await example9_CacheWarming(tenantId);

    console.log('\n====================================');
    console.log('  ALL EXAMPLES COMPLETED SUCCESSFULLY');
    console.log('====================================\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    throw error;
  }
}

/**
 * CLI entry point
 *
 * Usage: tsx usage-examples.ts <tenantId> [exampleNumber]
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx usage-examples.ts <tenantId> [exampleNumber]');
    console.error('Example: tsx usage-examples.ts tenant_123 1');
    console.error('         tsx usage-examples.ts tenant_123 all');
    process.exit(1);
  }

  const tenantId = args[0];
  const exampleNum = args[1] || 'all';

  try {
    if (exampleNum === 'all') {
      await runAllExamples(tenantId);
    } else {
      const num = parseInt(exampleNum);
      switch (num) {
        case 1:
          await example1_BasicRevenueAnalysis(tenantId);
          break;
        case 2:
          await example2_RevenueBreakdown(tenantId);
          break;
        case 3:
          await example3_RevenueProjection(tenantId);
          break;
        case 4:
          await example4_CohortRetentionAnalysis(tenantId);
          break;
        case 5:
          await example5_MultiCohortComparison(tenantId);
          break;
        case 6:
          await example6_RetentionBenchmarks(tenantId);
          break;
        case 7:
          await example7_CompleteDashboard(tenantId);
          break;
        case 8:
          await example8_AnalyticsHealthCheck(tenantId);
          break;
        case 9:
          await example9_CacheWarming(tenantId);
          break;
        case 10:
          await example10_CompleteWorkflow(tenantId);
          break;
        default:
          console.error(`Invalid example number: ${num}`);
          process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
