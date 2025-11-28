# Analytics Services - TypeScript Interfaces

Complete reference for all TypeScript interfaces, types, and return values.

## Revenue Calculator Interfaces

### RevenueMetrics

```typescript
interface RevenueMetrics {
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
```

### ChurnRate

```typescript
interface ChurnRate {
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
```

### GrowthRate

```typescript
interface GrowthRate {
  metric: string;
  currentValue: number;
  previousValue: number;
  growthRate: number; // Percentage
  absoluteChange: number;
  period: string;
  trend: 'up' | 'down' | 'flat';
}
```

### RevenueProjection

```typescript
interface RevenueProjection {
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
```

### RevenueBreakdown

```typescript
interface RevenueBreakdown {
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
```

### LifetimeValue

```typescript
interface LifetimeValue {
  cohort: Date;
  avgLTV: number;
  totalRevenue: number;
  cohortSize: number;
  avgRevenuePerUser: number;
  projectedLTV: number;
  confidence: 'high' | 'medium' | 'low';
}
```

## Cohort Analyzer Interfaces

### CohortAnalysis

```typescript
interface CohortAnalysis {
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
```

### RetentionDataPoint

```typescript
interface RetentionDataPoint {
  monthNumber: number;
  date: Date;
  retainedUsers: number;
  retentionRate: number;
  churnedUsers: number;
  churnRate: number;
}
```

### CohortLTV

```typescript
interface CohortLTV {
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
```

### CohortComparison

```typescript
interface CohortComparison {
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
```

### RetentionBenchmarks

```typescript
interface RetentionBenchmarks {
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
```

### RetentionPrediction

```typescript
interface RetentionPrediction {
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
```

### CohortSegment

```typescript
interface CohortSegment {
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
```

## Analytics Service Interfaces

### AnalyticsOptions

```typescript
interface AnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  useCache?: boolean;
  cacheTTL?: number; // Seconds
  includeComparison?: boolean; // Include period-over-period comparison
}
```

### RevenueAnalytics

```typescript
interface RevenueAnalytics {
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
  breakdown: RevenueBreakdown;
  projection?: RevenueProjection;
  cached: boolean;
  generatedAt: Date;
}
```

### CohortAnalytics

```typescript
interface CohortAnalytics {
  cohorts: CohortAnalysis[];
  comparison?: CohortComparison;
  benchmarks?: RetentionBenchmarks;
  predictions?: RetentionPrediction[];
  cached: boolean;
  generatedAt: Date;
}
```

### TournamentAnalytics

```typescript
interface TournamentAnalytics {
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
```

### DashboardSummary

```typescript
interface DashboardSummary {
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
```

### AnalyticsHealth

```typescript
interface AnalyticsHealth {
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
```

## Cache Manager Types

### DEFAULT_TTL

```typescript
const DEFAULT_TTL = {
  REAL_TIME: 60, // 1 minute
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};
```

### Cache Stats

```typescript
interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  lastError?: string;
  memoryUsage?: {
    used: string;
    peak: string;
    fragmentation: string;
  };
}
```

## Seeder Configuration

### SeederConfig

```typescript
interface SeederConfig {
  tenantId: string;
  months: number;
  baseUsers: number; // Starting cohort size
  baseRevenue: number; // Starting monthly revenue (in dollars)
  baseTournaments: number; // Starting tournaments per month
  growthRate: number; // Monthly growth rate (e.g., 0.05 = 5%)
  churnRate: number; // Monthly churn rate (e.g., 0.15 = 15%)
  seasonality: boolean; // Add seasonal patterns
}
```

## Usage Examples

### Basic Revenue Query

```typescript
import { calculateMRR } from '@/lib/analytics/services';

const metrics: RevenueMetrics = await calculateMRR('tenant_123');
// metrics.mrr, metrics.arr, metrics.growthRate
```

### Dashboard with Caching

```typescript
import { getDashboardSummary } from '@/lib/analytics/services';

const dashboard: DashboardSummary = await getDashboardSummary('tenant_123');
// dashboard.kpis, dashboard.trends, dashboard.alerts
```

### Cohort Analysis

```typescript
import { analyzeCohort } from '@/lib/analytics/services';

const analysis: CohortAnalysis = await analyzeCohort('tenant_123', new Date('2024-01-01'));
// analysis.retentionCurve, analysis.metrics, analysis.revenue
```

### Cache Operations

```typescript
import { getCached, setCached, DEFAULT_TTL } from '@/lib/analytics/services';

// Set
await setCached('my-key', { data: 'value' }, DEFAULT_TTL.SHORT);

// Get
const data = await getCached<{ data: string }>('my-key');
```

## Type Guards

### Check Confidence Level

```typescript
function isHighConfidence(result: RevenueMetrics | CohortAnalysis): boolean {
  return result.confidence === 'high';
}
```

### Check Status

```typescript
function isHealthy(health: AnalyticsHealth): boolean {
  return health.status === 'healthy';
}
```

### Check Trend

```typescript
function isPositiveTrend(dashboard: DashboardSummary): boolean {
  return dashboard.trends.revenue === 'up' && dashboard.trends.retention === 'up';
}
```

## Common Patterns

### Error Handling

```typescript
try {
  const metrics = await calculateMRR('tenant_123');
} catch (error) {
  if (error.message.includes('No revenue data found')) {
    // Handle missing data
  } else {
    // Handle other errors
  }
}
```

### Optional Chaining

```typescript
const growth = dashboard.growth?.mrrGrowth ?? 0;
const previousMRR = metrics.previousPeriod?.mrr ?? 0;
```

### Type Narrowing

```typescript
if (analysis.metrics.month12Retention !== null) {
  // TypeScript knows month12Retention is a number here
  console.log(`12-month retention: ${analysis.metrics.month12Retention}%`);
}
```

---

**Sprint 10 Week 1 Day 2 - Complete**
