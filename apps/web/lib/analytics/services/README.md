# Analytics Services

Sprint 10 Week 1 Day 2 - Higher-level calculator services and infrastructure for analytics.

## Overview

This directory contains the Day 2 analytics infrastructure that provides business logic and insights on top of the aggregated data created by Day 1 services.

**Architecture:**
```
┌─────────────────────────────────────────┐
│         Analytics Service               │
│        (Orchestrator)                   │
│  - High-level APIs                      │
│  - Cache integration                    │
│  - Multi-source aggregation             │
└────────┬────────────────────┬───────────┘
         │                    │
    ┌────▼─────┐         ┌────▼──────┐
    │ Revenue  │         │  Cohort   │
    │Calculator│         │ Analyzer  │
    └────┬─────┘         └────┬──────┘
         │                    │
    ┌────▼────────────────────▼───────┐
    │      Cache Manager               │
    │   (Redis Layer)                  │
    └──────────────────────────────────┘
```

## Services

### 1. Revenue Calculator (`revenue-calculator.ts`)

Advanced revenue calculations and business insights.

**Key Functions:**
- `calculateMRR()` - Monthly Recurring Revenue
- `calculateARR()` - Annual Recurring Revenue
- `calculateChurnRate()` - Customer churn analysis
- `calculateGrowthRate()` - Period-over-period growth
- `calculateRevenueProjection()` - Linear revenue projections
- `getRevenueBreakdown()` - Revenue by category
- `calculateLifetimeValue()` - Customer LTV calculation

**Usage Example:**
```typescript
import * as RevenueCalculator from './revenue-calculator';

// Get current MRR
const metrics = await RevenueCalculator.calculateMRR('tenant_123');
console.log(`MRR: $${metrics.mrr}, ARR: $${metrics.arr}`);
console.log(`Growth: ${metrics.growthRate}%`);

// Get revenue breakdown
const breakdown = await RevenueCalculator.getRevenueBreakdown(
  'tenant_123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
console.log(`Total: $${breakdown.total}`);
console.log(`New: $${breakdown.breakdown.newRevenue}`);
console.log(`Success Rate: ${breakdown.metrics.successRate}%`);

// Project revenue
const projection = await RevenueCalculator.calculateRevenueProjection('tenant_123', 6);
projection.projections.forEach(p => {
  console.log(`${format(p.month, 'yyyy-MM')}: $${p.projectedRevenue}`);
});
```

**Return Types:**
- `RevenueMetrics` - MRR/ARR with comparison
- `ChurnRate` - Churn metrics and trends
- `GrowthRate` - Growth percentage and trend
- `RevenueProjection` - Future revenue estimates
- `RevenueBreakdown` - Revenue by category
- `LifetimeValue` - Customer LTV metrics

### 2. Cohort Analyzer (`cohort-analyzer.ts`)

User retention and cohort analysis.

**Key Functions:**
- `analyzeCohort()` - Complete cohort analysis
- `calculateRetentionCurve()` - Retention over time
- `calculateCohortLTV()` - LTV by cohort
- `compareCohortsRetention()` - Compare multiple cohorts
- `getRetentionBenchmarks()` - Industry benchmarks
- `predictFutureRetention()` - Retention forecasts
- `segmentCohortByAttribute()` - Segment analysis

**Usage Example:**
```typescript
import * as CohortAnalyzer from './cohort-analyzer';

// Analyze a cohort
const analysis = await CohortAnalyzer.analyzeCohort(
  'tenant_123',
  new Date('2024-01-01')
);
console.log(`Cohort Size: ${analysis.cohortSize}`);
console.log(`Month 1 Retention: ${analysis.metrics.month1Retention}%`);
console.log(`Avg LTV: $${analysis.revenue.ltv}`);

// Get retention curve
analysis.retentionCurve.forEach(point => {
  console.log(`Month ${point.monthNumber}: ${point.retentionRate}%`);
});

// Compare cohorts
const cohorts = [
  new Date('2024-01-01'),
  new Date('2024-02-01'),
  new Date('2024-03-01'),
];
const comparison = await CohortAnalyzer.compareCohortsRetention('tenant_123', cohorts);
console.log(`Best: ${format(comparison.insights.bestPerformingCohort, 'yyyy-MM')}`);
console.log(`Trend: ${comparison.insights.avgRetentionTrend}`);

// Get benchmarks
const benchmarks = await CohortAnalyzer.getRetentionBenchmarks('tenant_123');
console.log(`Month 1: ${benchmarks.benchmarks.month1.status}`);
benchmarks.recommendations.forEach(rec => console.log(`- ${rec}`));
```

**Return Types:**
- `CohortAnalysis` - Complete cohort metrics
- `RetentionDataPoint` - Single retention measurement
- `CohortLTV` - Lifetime value by cohort
- `CohortComparison` - Multi-cohort comparison
- `RetentionBenchmarks` - Industry benchmarks
- `RetentionPrediction` - Future retention forecast
- `CohortSegment` - Segmented analysis

### 3. Analytics Service (`analytics-service.ts`)

Main orchestrator that integrates all calculators with intelligent caching.

**Key Functions:**
- `getRevenueAnalytics()` - Comprehensive revenue analytics
- `getCohortAnalytics()` - Comprehensive cohort analytics
- `getTournamentAnalytics()` - Tournament performance metrics
- `getDashboardSummary()` - High-level KPIs for dashboard
- `refreshAnalytics()` - Force cache invalidation
- `getAnalyticsHealth()` - Data freshness and quality

**Usage Example:**
```typescript
import * as AnalyticsService from './analytics-service';

// Get revenue analytics (with caching)
const revenue = await AnalyticsService.getRevenueAnalytics('tenant_123', {
  useCache: true,
  cacheTTL: 300, // 5 minutes
  includeComparison: true,
});
console.log(`MRR: $${revenue.current.mrr}`);
console.log(`Growth: ${revenue.growth?.mrrGrowth}%`);
console.log(`Cached: ${revenue.cached}`);

// Get dashboard summary
const dashboard = await AnalyticsService.getDashboardSummary('tenant_123');
console.log(`KPIs:`, dashboard.kpis);
console.log(`Trends:`, dashboard.trends);
dashboard.alerts.forEach(alert => {
  console.log(`[${alert.type}] ${alert.message}`);
});

// Check analytics health
const health = await AnalyticsService.getAnalyticsHealth('tenant_123');
console.log(`Status: ${health.status}`);
console.log(`Revenue freshness: ${health.dataFreshness.revenue.hoursAgo}h ago`);
console.log(`Cache hit rate: ${health.cacheStats.hitRate}%`);
health.recommendations.forEach(rec => console.log(`- ${rec}`));

// Refresh cache
await AnalyticsService.refreshAnalytics('tenant_123');
```

**Return Types:**
- `RevenueAnalytics` - Full revenue analytics
- `CohortAnalytics` - Full cohort analytics
- `TournamentAnalytics` - Tournament metrics
- `DashboardSummary` - KPIs and trends
- `AnalyticsHealth` - Data quality metrics

### 4. Cache Manager (`cache-manager.ts`)

Dedicated Redis caching layer for analytics.

**Key Functions:**
- `get<T>()` - Get cached value
- `set<T>()` - Set cache with TTL
- `invalidate()` - Invalidate by pattern
- `getCacheKey()` - Generate consistent keys
- `warmCache()` - Pre-populate cache
- `getCacheStats()` - Hit/miss rates
- `getOrSet()` - Get or compute pattern
- `mget()` / `mset()` - Batch operations

**Usage Example:**
```typescript
import * as CacheManager from './cache-manager';

// Set a value
await CacheManager.set(
  'analytics:revenue:tenant_123',
  { mrr: 5000, arr: 60000 },
  CacheManager.DEFAULT_TTL.SHORT // 5 minutes
);

// Get a value
const data = await CacheManager.get<{ mrr: number; arr: number }>(
  'analytics:revenue:tenant_123'
);

// Generate consistent cache key
const key = CacheManager.getCacheKey(
  'analytics:revenue',
  'tenant_123',
  '2024-01'
);

// Get or compute pattern
const metrics = await CacheManager.getOrSet(
  key,
  async () => {
    // Compute if not cached
    return await computeExpensiveMetrics();
  },
  CacheManager.DEFAULT_TTL.MEDIUM
);

// Invalidate pattern
await CacheManager.invalidate('analytics:revenue:*');

// Warm cache for a tenant
await CacheManager.warmCache('tenant_123');

// Get cache stats
const stats = await CacheManager.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Memory used: ${stats.memoryUsage?.used}`);
```

**TTL Constants:**
- `REAL_TIME`: 60s - Live data
- `SHORT`: 300s - Frequently changing
- `MEDIUM`: 1800s - Moderately stable
- `LONG`: 3600s - Historical data
- `VERY_LONG`: 86400s - Rarely changing

### 5. Test Data Seeder (`seed-test-data.ts`)

Generate realistic test data for development.

**Key Functions:**
- `seedAnalyticsData()` - Seed all data types
- `seedRevenueData()` - Revenue transactions
- `seedUserCohortData()` - User signups and retention
- `seedTournamentData()` - Tournament events
- `clearTestData()` - Remove all test data

**Usage Example:**
```typescript
import { seedAnalyticsData, clearTestData } from './seed-test-data';

// Seed 12 months of data
await seedAnalyticsData('tenant_123', 12);

// Seed with custom configuration
await seedAnalyticsData('tenant_123', 12, {
  baseUsers: 200, // Start with 200 users
  baseRevenue: 10000, // $10k monthly revenue
  baseTournaments: 100, // 100 tournaments/month
  growthRate: 0.10, // 10% monthly growth
  churnRate: 0.15, // 15% churn
  seasonality: true, // Add seasonal patterns
});

// Clear test data
await clearTestData('tenant_123');
```

**CLI Usage:**
```bash
# Generate 12 months of test data
tsx apps/web/lib/analytics/services/seed-test-data.ts tenant_123 12

# Generate 6 months
tsx apps/web/lib/analytics/services/seed-test-data.ts tenant_123 6
```

## Integration with Day 1 Services

These Day 2 services work with the aggregated data created by Day 1 services:

**Day 1 Services** (`aggregation-service.ts`):
- `aggregateRevenue()` - Populate `revenue_aggregates` table
- `aggregateCohorts()` - Populate `user_cohorts` table
- `aggregateTournaments()` - Populate `tournament_aggregates` table

**Day 2 Services** (this directory):
- Read from aggregate tables
- Perform calculations and analysis
- Provide business insights
- Cache results for performance

**Workflow:**
1. Day 1: Raw events → Aggregation → Database tables
2. Day 2: Database tables → Calculations → Cached insights
3. API: Cached insights → Response

## Caching Strategy

**Cache Keys:**
```
analytics:{type}:{tenantId}:{params}

Examples:
- analytics:revenue:tenant_123:2024-01
- analytics:cohorts:tenant_123
- analytics:tournaments:tenant_123:2024-01
```

**TTL Recommendations:**
- Revenue metrics: 5 minutes (SHORT)
- Cohort analysis: 1 hour (LONG)
- Tournament metrics: 5 minutes (SHORT)
- Dashboard summary: 5 minutes (SHORT)
- Historical data: 24 hours (VERY_LONG)

**Cache Invalidation:**
```typescript
// Invalidate all analytics for a tenant
await CacheManager.invalidate('analytics:*:tenant_123*');

// Invalidate specific type
await CacheManager.invalidate('analytics:revenue:*');

// Refresh all analytics (invalidates and recomputes)
await AnalyticsService.refreshAnalytics('tenant_123');
```

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const metrics = await RevenueCalculator.calculateMRR('tenant_123');
} catch (error) {
  if (error.message.includes('No revenue data found')) {
    // Handle missing data
  } else {
    // Handle other errors
  }
}
```

**Common Errors:**
- `No revenue data found` - No aggregates for the period
- `No cohort data found` - No cohort records
- `Insufficient data for projection` - Need more historical data
- `Missing revenue data for churn calculation` - Missing comparison period

## Performance Considerations

**Query Optimization:**
- All services use Prisma's `findUnique` where possible
- Aggregates have indexes on `[tenantId, periodType, periodStart]`
- Cohorts have indexes on `[tenantId, cohortMonth]`

**Caching:**
- Enable caching for all production queries
- Use appropriate TTLs based on data volatility
- Warm cache during off-peak hours
- Monitor hit rates with `getCacheStats()`

**Batch Operations:**
```typescript
// Instead of multiple sequential calls
for (const cohort of cohorts) {
  await analyzeCohort(tenantId, cohort); // Slow
}

// Use parallel execution
const analyses = await Promise.all(
  cohorts.map(cohort => analyzeCohort(tenantId, cohort)) // Fast
);
```

## Testing

**Unit Tests:**
```typescript
import { calculateMRR } from './revenue-calculator';
import { seedAnalyticsData, clearTestData } from './seed-test-data';

describe('Revenue Calculator', () => {
  const testTenantId = 'test_tenant';

  beforeAll(async () => {
    await seedAnalyticsData(testTenantId, 6);
  });

  afterAll(async () => {
    await clearTestData(testTenantId);
  });

  it('should calculate MRR', async () => {
    const metrics = await calculateMRR(testTenantId);
    expect(metrics.mrr).toBeGreaterThan(0);
    expect(metrics.arr).toBe(metrics.mrr * 12);
  });
});
```

## Monitoring

**Health Checks:**
```typescript
const health = await AnalyticsService.getAnalyticsHealth('tenant_123');

if (health.status === 'missing') {
  // Alert: Critical data missing
} else if (health.status === 'stale') {
  // Warning: Data needs refresh
}
```

**Cache Monitoring:**
```typescript
const stats = await CacheManager.getCacheStats();

if (stats.hitRate < 50) {
  // Alert: Low cache hit rate
}

if (stats.errors > 0) {
  console.error('Cache errors:', stats.lastError);
}
```

## API Integration

**Example Express Route:**
```typescript
import * as AnalyticsService from '@/lib/analytics/services/analytics-service';

app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const dashboard = await AnalyticsService.getDashboardSummary(tenantId);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/revenue', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const revenue = await AnalyticsService.getRevenueAnalytics(tenantId, {
      useCache: true,
      includeComparison: true,
    });
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Future Enhancements

**Planned Features:**
- Real-time event streaming
- Machine learning predictions
- Custom metric definitions
- Multi-dimensional segmentation
- Export to CSV/Excel
- Scheduled reports
- Anomaly detection
- Comparative analytics (vs industry)

## Related Documentation

- **Day 1 Services**: `../aggregation-service.ts` - Data aggregation
- **Jobs**: `../jobs/` - Background processing
- **Database Schema**: `../../../prisma/schema.prisma` - Data models
- **Cache Infrastructure**: `../../cache/` - Base cache layer

## Support

For issues or questions:
1. Check existing aggregates in database
2. Verify cache connectivity: `CacheManager.isHealthy()`
3. Review analytics health: `getAnalyticsHealth()`
4. Check logs for error messages
5. Validate data with test seeder

---

**Sprint 10 Week 1 Day 2 - Complete**
