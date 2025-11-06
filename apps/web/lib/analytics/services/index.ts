/**
 * Analytics Services - Main Exports
 * Sprint 10 Week 1 Day 2 - Analytics Infrastructure
 *
 * Centralized exports for all analytics calculator services.
 */

// Revenue Calculator
export * from './revenue-calculator';
export {
  calculateMRR,
  calculateARR,
  calculateChurnRate,
  calculateGrowthRate,
  calculateRevenueProjection,
  getRevenueBreakdown,
  calculateLifetimeValue,
} from './revenue-calculator';

// Cohort Analyzer
export * from './cohort-analyzer';
export {
  analyzeCohort,
  calculateRetentionCurve,
  calculateCohortLTV,
  compareCohortsRetention,
  getRetentionBenchmarks,
  predictFutureRetention,
  segmentCohortByAttribute,
} from './cohort-analyzer';

// Analytics Service (Orchestrator)
export * from './analytics-service';
export {
  getRevenueAnalytics,
  getCohortAnalytics,
  getTournamentAnalytics,
  getDashboardSummary,
  refreshAnalytics,
  getAnalyticsHealth,
} from './analytics-service';

// Cache Manager
export * from './cache-manager';
export {
  get as getCached,
  set as setCached,
  del as deleteCached,
  invalidate as invalidateCache,
  getCacheKey,
  warmCache,
  getCacheStats,
  isHealthy as isCacheHealthy,
  getOrSet as getOrSetCached,
  DEFAULT_TTL,
} from './cache-manager';

// Test Data Seeder
export {
  seedAnalyticsData,
  seedRevenueData,
  seedUserCohortData,
  seedTournamentData,
  clearTestData,
  seedMultipleTenants,
} from './seed-test-data';

// Aggregation Service (Day 1)
export {
  aggregateRevenue,
  aggregateCohorts,
  aggregateTournaments,
  aggregateAll,
  getActiveTenants,
  getStandardPeriods,
} from './aggregation-service';

/**
 * Quick access namespaces
 */
export { default as RevenueCalculator } from './revenue-calculator';
export { default as CohortAnalyzer } from './cohort-analyzer';
export { default as AnalyticsService } from './analytics-service';
export { default as CacheManager } from './cache-manager';
