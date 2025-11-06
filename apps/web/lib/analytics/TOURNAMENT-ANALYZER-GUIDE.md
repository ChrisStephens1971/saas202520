# Tournament Analyzer Service - Complete Guide

**Sprint 10 Week 1 Day 3 - Advanced Tournament Analytics**

## Overview

The Tournament Analyzer service provides advanced tournament performance analysis and insights for pool tournament operations. It builds on the aggregation service (Day 1) and analytical services (Day 2) to deliver specialized tournament intelligence.

## Features

### Core Capabilities

1. **Complete Tournament Performance Analysis** - Comprehensive metrics with period comparisons
2. **Format Popularity Analysis** - Identify which tournament formats perform best
3. **Historical Trend Analysis** - Track tournament metrics over time
4. **Core Metrics Calculation** - Key performance indicators for tournament operations
5. **Attendance Prediction** - ML-based predictions for expected tournament attendance
6. **Player Engagement Analysis** - Understand player participation patterns
7. **Industry Benchmarking** - Compare performance to industry standards

### Key Benefits

- **Data-Driven Decisions** - Make informed choices about tournament formats and scheduling
- **Predictive Insights** - Forecast attendance and plan resources accordingly
- **Performance Optimization** - Identify areas for improvement with actionable recommendations
- **Player Retention** - Track and improve player engagement and return rates
- **Revenue Optimization** - Understand which formats and strategies drive revenue

## Architecture

### Service Dependencies

```
tournament-analyzer.ts
├── Prisma Client (database queries)
├── date-fns (date manipulation)
├── CacheManager (Redis caching)
└── Data Sources:
    ├── tournament_aggregates (pre-computed metrics)
    ├── tournaments (detailed tournament data)
    ├── players (player participation data)
    ├── matches (match and win data)
    └── payments (revenue data)
```

### Caching Strategy

| Function | Cache TTL | Reasoning |
|----------|-----------|-----------|
| `analyzeTournamentPerformance` | 5 minutes | Real-time performance data |
| `analyzeFormatPopularity` | 15 minutes | Moderately stable data |
| `analyzeTournamentTrends` | 15 minutes | Historical trends change slowly |
| `calculateTournamentMetrics` | 5 minutes | Current operational metrics |
| `predictTournamentAttendance` | 15 minutes | Predictions valid for planning window |
| `analyzePlayerEngagement` | 15 minutes | Player patterns evolve gradually |
| `getTournamentBenchmarks` | 1 hour | Industry benchmarks are stable |

## API Reference

### 1. Analyze Tournament Performance

Complete tournament performance analysis with optional comparisons and breakdowns.

```typescript
import { analyzeTournamentPerformance } from '@/lib/analytics/services/tournament-analyzer';

const performance = await analyzeTournamentPerformance(tenantId, {
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  periodType: 'month',
  compareToPrevious: true,
  includeFormatBreakdown: true,
  includePlayerMetrics: true,
});

console.log(performance.metrics);
// {
//   tournamentCount: 12,
//   completedCount: 11,
//   completionRate: 91.67,
//   avgPlayersPerTournament: 18.5,
//   avgDurationMinutes: 165.2,
//   totalPlayers: 222,
//   totalRevenue: 3340.00,
//   avgRevenuePerTournament: 278.33
// }

console.log(performance.comparison);
// {
//   tournamentCount: { value: 10, change: 2, trend: 'up' },
//   completionRate: { value: 88.0, change: 3.67, trend: 'up' },
//   avgPlayers: { value: 16.8, change: 1.7, trend: 'up' },
//   revenue: { value: 2800.00, change: 540.00, trend: 'up' }
// }

console.log(performance.insights);
// [
//   "Excellent completion rate (91.67%). Your tournaments are running smoothly.",
//   "Tournament count increased by 2 compared to previous period.",
//   "Revenue increased by $540 compared to previous period."
// ]
```

**Options:**

- `startDate` - Start of analysis period (default: start of current month)
- `endDate` - End of analysis period (default: today)
- `periodType` - 'day', 'week', or 'month' (default: 'month')
- `compareToPrevious` - Include period-over-period comparison (default: false)
- `includeFormatBreakdown` - Include format popularity data (default: false)
- `includePlayerMetrics` - Include player engagement metrics (default: false)

### 2. Analyze Format Popularity

Identify which tournament formats are most popular and perform best.

```typescript
import { analyzeFormatPopularity } from '@/lib/analytics/services/tournament-analyzer';

const formats = await analyzeFormatPopularity(
  tenantId,
  new Date('2025-01-01'),
  new Date('2025-03-31')
);

formats.forEach((format) => {
  console.log(`${format.format}:`);
  console.log(`  Tournaments: ${format.tournamentCount}`);
  console.log(`  Market Share: ${format.marketShare}%`);
  console.log(`  Avg Players: ${format.avgPlayersPerTournament}`);
  console.log(`  Completion Rate: ${format.completionRate}%`);
  console.log(`  Avg Revenue: $${format.avgRevenuePerTournament}`);
});

// Output:
// single_elimination:
//   Tournaments: 15
//   Market Share: 45.5%
//   Avg Players: 20.3
//   Completion Rate: 93.3%
//   Avg Revenue: $305.00
//
// double_elimination:
//   Tournaments: 12
//   Market Share: 36.4%
//   Avg Players: 16.8
//   Completion Rate: 91.7%
//   Avg Revenue: $252.00
```

**Returns:** Array of `FormatPopularity` objects sorted by tournament count (most popular first).

### 3. Analyze Tournament Trends

Track tournament metrics over time to identify growth trends and seasonality.

```typescript
import { analyzeTournamentTrends } from '@/lib/analytics/services/tournament-analyzer';

const trends = await analyzeTournamentTrends(
  tenantId,
  'week', // period type: 'day', 'week', or 'month'
  12      // number of periods
);

trends.forEach((trend) => {
  console.log(`${trend.periodLabel}:`);
  console.log(`  Tournaments: ${trend.metrics.tournamentCount}`);
  console.log(`  Avg Players: ${trend.metrics.avgPlayers}`);
  console.log(`  Revenue: $${trend.metrics.totalRevenue}`);
  console.log(`  Growth Rates:`);
  console.log(`    Tournaments: ${trend.growthRates.tournaments}%`);
  console.log(`    Players: ${trend.growthRates.players}%`);
  console.log(`    Revenue: ${trend.growthRates.revenue}%`);
});

// Output:
// Jan 1:
//   Tournaments: 3
//   Avg Players: 18.3
//   Revenue: $825.00
//   Growth Rates:
//     Tournaments: 0%
//     Players: 0%
//     Revenue: 0%
//
// Jan 8:
//   Tournaments: 4
//   Avg Players: 19.5
//   Revenue: $1170.00
//   Growth Rates:
//     Tournaments: 33.33%
//     Players: 6.56%
//     Revenue: 41.82%
```

**Parameters:**

- `tenantId` - Organization ID
- `periodType` - 'day', 'week', or 'month' (default: 'week')
- `periods` - Number of periods to analyze (default: 12)

### 4. Calculate Tournament Metrics

Compute core KPIs for tournament operations.

```typescript
import { calculateTournamentMetrics } from '@/lib/analytics/services/tournament-analyzer';

// All tournaments for a tenant
const metrics = await calculateTournamentMetrics(tenantId);

// Specific tournament
const tournamentMetrics = await calculateTournamentMetrics(tenantId, tournamentId);

console.log(metrics);
// {
//   participationRate: 87.5,      // % of registered players who play
//   completionRate: 91.67,        // % of tournaments completed
//   avgDurationMinutes: 165.2,    // Average tournament duration
//   avgPlayersPerTournament: 18.5,
//   playerReturnRate: 62.3,       // % of players who return
//   avgMatchesPerTournament: 24.8,
//   tableUtilization: 78.4        // % of time tables are used
// }
```

**Key Metrics:**

- **Participation Rate** - Percentage of registered players who actually play (checked in and active/eliminated)
- **Completion Rate** - Percentage of tournaments that reach completed status
- **Player Return Rate** - Percentage of unique players who participate in multiple tournaments
- **Table Utilization** - Percentage of available table-time that is actually used during tournaments

### 5. Predict Tournament Attendance

Use historical data and patterns to predict expected attendance.

```typescript
import { predictTournamentAttendance } from '@/lib/analytics/services/tournament-analyzer';

const prediction = await predictTournamentAttendance(
  tenantId,
  'single_elimination',
  new Date('2025-02-14') // Friday tournament
);

console.log(prediction);
// {
//   format: 'single_elimination',
//   date: 2025-02-14T00:00:00.000Z,
//   dayOfWeek: 'Friday',
//   predictedAttendance: 22,
//   confidenceInterval: { low: 17, high: 27 },
//   confidence: 'high',
//   factors: {
//     formatPopularity: 20.3,
//     dayOfWeekTrend: 115.2,   // Fridays are 15.2% above average
//     seasonalFactor: 105.8,   // February is 5.8% above average
//     historicalAverage: 18.5
//   },
//   recommendation: 'High attendance expected! Consider adding extra tables or staff.'
// }
```

**Prediction Factors:**

- **Format Popularity** - Average attendance for this format
- **Day of Week Trend** - How this day performs vs. average
- **Seasonal Factor** - How this month performs vs. average
- **Historical Average** - Overall average for the tenant

**Confidence Levels:**

- **High** - 10+ historical tournaments, ±15% confidence interval
- **Medium** - 5-9 historical tournaments, ±25% confidence interval
- **Low** - <5 historical tournaments, ±40% confidence interval

### 6. Analyze Player Engagement

Understand player participation patterns and identify top players.

```typescript
import { analyzePlayerEngagement } from '@/lib/analytics/services/tournament-analyzer';

const engagement = await analyzePlayerEngagement(
  tenantId,
  new Date('2025-01-01'),
  new Date('2025-03-31')
);

console.log(engagement.metrics);
// {
//   uniquePlayers: 156,
//   totalParticipations: 412,
//   avgTournamentsPerPlayer: 2.64,
//   repeatParticipationRate: 58.3,  // % who played multiple times
//   newPlayerRate: 41.7,             // % who played only once
//   retentionRate: 58.3              // % who returned
// }

console.log(engagement.segments);
// {
//   oneTournament: 65,    // 41.7%
//   twoToFive: 72,        // 46.2%
//   sixToTen: 15,         // 9.6%
//   moreThanTen: 4        // 2.6%
// }

console.log(engagement.topPlayers.slice(0, 3));
// [
//   { playerId: 'p1', playerName: 'John Doe', tournamentCount: 15, winRate: 26.67 },
//   { playerId: 'p2', playerName: 'Jane Smith', tournamentCount: 12, winRate: 33.33 },
//   { playerId: 'p3', playerName: 'Bob Wilson', tournamentCount: 10, winRate: 20.00 }
// ]
```

**Use Cases:**

- Identify highly engaged players for VIP programs
- Track player retention and churn
- Segment players by engagement level
- Recognize top performers

### 7. Get Tournament Benchmarks

Compare performance to industry standards and get recommendations.

```typescript
import { getTournamentBenchmarks } from '@/lib/analytics/services/tournament-analyzer';

const benchmarks = await getTournamentBenchmarks(tenantId);

console.log(benchmarks.benchmarks);
// {
//   completionRate: {
//     target: 85,
//     current: 91.67,
//     status: 'above',
//     percentile: 75
//   },
//   avgPlayers: {
//     target: 16,
//     current: 18.5,
//     status: 'above',
//     percentile: 75
//   },
//   avgDuration: {
//     target: 180,
//     current: 165.2,
//     status: 'below',
//     percentile: 75
//   },
//   playerRetention: {
//     target: 60,
//     current: 62.3,
//     status: 'above',
//     percentile: 60
//   }
// }

console.log(benchmarks.strengths);
// [
//   "Excellent tournament completion rate",
//   "Strong player turnout per tournament",
//   "Efficient tournament pacing and timing",
//   "High player retention and loyalty"
// ]

console.log(benchmarks.recommendations);
// [
//   "Consider expanding features for power users to further improve retention"
// ]
```

**Industry Benchmarks:**

- **Completion Rate** - 85% (tournaments successfully completed)
- **Avg Players** - 16 players per tournament
- **Avg Duration** - 180 minutes (3 hours)
- **Player Retention** - 60% (players who return for multiple tournaments)

## Integration Examples

### Dashboard Widget - Performance Summary

```typescript
import { analyzeTournamentPerformance } from '@/lib/analytics/services/tournament-analyzer';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function TournamentPerformanceWidget({ tenantId }: { tenantId: string }) {
  const now = new Date();
  const performance = await analyzeTournamentPerformance(tenantId, {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
    periodType: 'month',
    compareToPrevious: true,
  });

  return (
    <div className="widget">
      <h3>Tournament Performance - {format(now, 'MMMM yyyy')}</h3>

      <div className="metrics-grid">
        <MetricCard
          label="Tournaments"
          value={performance.metrics.tournamentCount}
          change={performance.comparison?.tournamentCount.change}
          trend={performance.comparison?.tournamentCount.trend}
        />
        <MetricCard
          label="Completion Rate"
          value={`${performance.metrics.completionRate}%`}
          change={performance.comparison?.completionRate.change}
          trend={performance.comparison?.completionRate.trend}
        />
        <MetricCard
          label="Avg Players"
          value={performance.metrics.avgPlayersPerTournament}
          change={performance.comparison?.avgPlayers.change}
          trend={performance.comparison?.avgPlayers.trend}
        />
        <MetricCard
          label="Revenue"
          value={`$${performance.metrics.totalRevenue}`}
          change={performance.comparison?.revenue.change}
          trend={performance.comparison?.revenue.trend}
        />
      </div>

      <div className="insights">
        {performance.insights.map((insight, idx) => (
          <InsightBadge key={idx}>{insight}</InsightBadge>
        ))}
      </div>
    </div>
  );
}
```

### Dashboard Widget - Format Analysis

```typescript
import { analyzeFormatPopularity } from '@/lib/analytics/services/tournament-analyzer';
import { subMonths } from 'date-fns';

export async function FormatPopularityWidget({ tenantId }: { tenantId: string }) {
  const now = new Date();
  const formats = await analyzeFormatPopularity(
    tenantId,
    subMonths(now, 3),
    now
  );

  return (
    <div className="widget">
      <h3>Format Popularity (Last 3 Months)</h3>

      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Tournaments</th>
            <th>Market Share</th>
            <th>Avg Players</th>
            <th>Completion %</th>
            <th>Avg Revenue</th>
          </tr>
        </thead>
        <tbody>
          {formats.map((format) => (
            <tr key={format.format}>
              <td>{formatName(format.format)}</td>
              <td>{format.tournamentCount}</td>
              <td>{format.marketShare}%</td>
              <td>{format.avgPlayersPerTournament}</td>
              <td>{format.completionRate}%</td>
              <td>${format.avgRevenuePerTournament}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Dashboard Widget - Attendance Predictor

```typescript
import { predictTournamentAttendance } from '@/lib/analytics/services/tournament-analyzer';
import { addWeeks } from 'date-fns';

export async function AttendancePredictorWidget({
  tenantId,
  format,
  scheduledDate
}: {
  tenantId: string;
  format: string;
  scheduledDate: Date;
}) {
  const prediction = await predictTournamentAttendance(tenantId, format, scheduledDate);

  return (
    <div className="widget">
      <h3>Attendance Prediction</h3>

      <div className="prediction-summary">
        <div className="predicted-attendance">
          <span className="label">Predicted</span>
          <span className="value">{prediction.predictedAttendance}</span>
          <span className="subtitle">players</span>
        </div>

        <div className="confidence-range">
          <span className="label">Range</span>
          <span className="value">
            {prediction.confidenceInterval.low} - {prediction.confidenceInterval.high}
          </span>
          <ConfidenceBadge level={prediction.confidence} />
        </div>
      </div>

      <div className="factors">
        <h4>Contributing Factors</h4>
        <Factor
          label="Format Popularity"
          value={prediction.factors.formatPopularity}
        />
        <Factor
          label={`${prediction.dayOfWeek} Trend`}
          value={`${prediction.factors.dayOfWeekTrend}%`}
        />
        <Factor
          label="Seasonal Factor"
          value={`${prediction.factors.seasonalFactor}%`}
        />
      </div>

      <div className="recommendation">
        {prediction.recommendation}
      </div>
    </div>
  );
}
```

### Dashboard Widget - Player Engagement

```typescript
import { analyzePlayerEngagement } from '@/lib/analytics/services/tournament-analyzer';
import { startOfQuarter, endOfQuarter } from 'date-fns';

export async function PlayerEngagementWidget({ tenantId }: { tenantId: string }) {
  const now = new Date();
  const engagement = await analyzePlayerEngagement(
    tenantId,
    startOfQuarter(now),
    endOfQuarter(now)
  );

  return (
    <div className="widget">
      <h3>Player Engagement (This Quarter)</h3>

      <div className="key-metrics">
        <Metric label="Unique Players" value={engagement.metrics.uniquePlayers} />
        <Metric
          label="Avg Tournaments/Player"
          value={engagement.metrics.avgTournamentsPerPlayer}
        />
        <Metric
          label="Retention Rate"
          value={`${engagement.metrics.retentionRate}%`}
        />
      </div>

      <div className="segmentation">
        <h4>Player Segmentation</h4>
        <SegmentBar
          segments={[
            { label: '1 Tournament', value: engagement.segments.oneTournament },
            { label: '2-5 Tournaments', value: engagement.segments.twoToFive },
            { label: '6-10 Tournaments', value: engagement.segments.sixToTen },
            { label: '10+ Tournaments', value: engagement.segments.moreThanTen },
          ]}
          total={engagement.metrics.uniquePlayers}
        />
      </div>

      <div className="top-players">
        <h4>Most Active Players</h4>
        <PlayerList players={engagement.topPlayers.slice(0, 5)} />
      </div>
    </div>
  );
}
```

### Dashboard Widget - Performance Benchmarks

```typescript
import { getTournamentBenchmarks } from '@/lib/analytics/services/tournament-analyzer';

export async function BenchmarksWidget({ tenantId }: { tenantId: string }) {
  const benchmarks = await getTournamentBenchmarks(tenantId);

  return (
    <div className="widget">
      <h3>Industry Benchmarks</h3>

      <div className="benchmarks-grid">
        <BenchmarkCard
          label="Completion Rate"
          current={benchmarks.benchmarks.completionRate.current}
          target={benchmarks.benchmarks.completionRate.target}
          status={benchmarks.benchmarks.completionRate.status}
          percentile={benchmarks.benchmarks.completionRate.percentile}
        />
        <BenchmarkCard
          label="Avg Players"
          current={benchmarks.benchmarks.avgPlayers.current}
          target={benchmarks.benchmarks.avgPlayers.target}
          status={benchmarks.benchmarks.avgPlayers.status}
          percentile={benchmarks.benchmarks.avgPlayers.percentile}
        />
        <BenchmarkCard
          label="Tournament Duration"
          current={benchmarks.benchmarks.avgDuration.current}
          target={benchmarks.benchmarks.avgDuration.target}
          status={benchmarks.benchmarks.avgDuration.status}
          percentile={benchmarks.benchmarks.avgDuration.percentile}
        />
        <BenchmarkCard
          label="Player Retention"
          current={benchmarks.benchmarks.playerRetention.current}
          target={benchmarks.benchmarks.playerRetention.target}
          status={benchmarks.benchmarks.playerRetention.status}
          percentile={benchmarks.benchmarks.playerRetention.percentile}
        />
      </div>

      {benchmarks.strengths.length > 0 && (
        <div className="strengths">
          <h4>Strengths</h4>
          {benchmarks.strengths.map((strength, idx) => (
            <StrengthBadge key={idx}>{strength}</StrengthBadge>
          ))}
        </div>
      )}

      {benchmarks.recommendations.length > 0 && (
        <div className="recommendations">
          <h4>Recommendations</h4>
          {benchmarks.recommendations.map((rec, idx) => (
            <RecommendationCard key={idx}>{rec}</RecommendationCard>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Testing Guide

### Unit Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  analyzeTournamentPerformance,
  analyzeFormatPopularity,
  calculateTournamentMetrics,
  predictTournamentAttendance,
} from './tournament-analyzer';

describe('Tournament Analyzer', () => {
  const testTenantId = 'test-tenant-123';

  describe('analyzeTournamentPerformance', () => {
    it('should return performance metrics for the period', async () => {
      const result = await analyzeTournamentPerformance(testTenantId, {
        periodType: 'month',
      });

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('tournamentCount');
      expect(result.metrics).toHaveProperty('completionRate');
      expect(result.metrics).toHaveProperty('avgPlayersPerTournament');
    });

    it('should include comparison when compareToPrevious is true', async () => {
      const result = await analyzeTournamentPerformance(testTenantId, {
        periodType: 'month',
        compareToPrevious: true,
      });

      expect(result).toHaveProperty('comparison');
      expect(result.comparison).toHaveProperty('tournamentCount');
      expect(result.comparison?.tournamentCount).toHaveProperty('change');
      expect(result.comparison?.tournamentCount).toHaveProperty('trend');
    });

    it('should include format breakdown when requested', async () => {
      const result = await analyzeTournamentPerformance(testTenantId, {
        periodType: 'month',
        includeFormatBreakdown: true,
      });

      expect(result).toHaveProperty('formatBreakdown');
      expect(Array.isArray(result.formatBreakdown)).toBe(true);
    });
  });

  describe('analyzeFormatPopularity', () => {
    it('should return format statistics', async () => {
      const result = await analyzeFormatPopularity(
        testTenantId,
        new Date('2025-01-01'),
        new Date('2025-03-31')
      );

      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('format');
        expect(result[0]).toHaveProperty('tournamentCount');
        expect(result[0]).toHaveProperty('marketShare');
        expect(result[0]).toHaveProperty('avgPlayersPerTournament');
      }
    });

    it('should sort formats by popularity', async () => {
      const result = await analyzeFormatPopularity(
        testTenantId,
        new Date('2025-01-01'),
        new Date('2025-03-31')
      );

      if (result.length > 1) {
        expect(result[0].tournamentCount).toBeGreaterThanOrEqual(
          result[1].tournamentCount
        );
      }
    });
  });

  describe('predictTournamentAttendance', () => {
    it('should return attendance prediction', async () => {
      const result = await predictTournamentAttendance(
        testTenantId,
        'single_elimination',
        new Date('2025-02-14')
      );

      expect(result).toHaveProperty('predictedAttendance');
      expect(result).toHaveProperty('confidenceInterval');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('factors');
      expect(result).toHaveProperty('recommendation');
    });

    it('should provide confidence interval', async () => {
      const result = await predictTournamentAttendance(
        testTenantId,
        'single_elimination',
        new Date('2025-02-14')
      );

      expect(result.confidenceInterval.low).toBeLessThanOrEqual(
        result.predictedAttendance
      );
      expect(result.confidenceInterval.high).toBeGreaterThanOrEqual(
        result.predictedAttendance
      );
    });
  });

  describe('calculateTournamentMetrics', () => {
    it('should return all core metrics', async () => {
      const result = await calculateTournamentMetrics(testTenantId);

      expect(result).toHaveProperty('participationRate');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('avgDurationMinutes');
      expect(result).toHaveProperty('playerReturnRate');
      expect(result).toHaveProperty('tableUtilization');
    });

    it('should calculate metrics for specific tournament', async () => {
      const tournamentId = 'tournament-123';
      const result = await calculateTournamentMetrics(testTenantId, tournamentId);

      expect(result).toBeDefined();
      expect(typeof result.participationRate).toBe('number');
    });
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import { analyzeTournamentPerformance } from './tournament-analyzer';
import * as CacheManager from '../cache-manager';

describe('Tournament Analyzer Integration', () => {
  it('should cache results properly', async () => {
    const tenantId = 'test-tenant-123';

    // First call - cache miss
    const result1 = await analyzeTournamentPerformance(tenantId);

    // Second call - cache hit
    const result2 = await analyzeTournamentPerformance(tenantId);

    expect(result1).toEqual(result2);

    const stats = await CacheManager.getCacheStats();
    expect(stats.hits).toBeGreaterThan(0);
  });

  it('should invalidate cache when requested', async () => {
    const tenantId = 'test-tenant-123';

    await analyzeTournamentPerformance(tenantId);

    // Invalidate tournament analytics cache
    await CacheManager.invalidate('analytics:tournament:*');

    // Next call should recalculate
    const result = await analyzeTournamentPerformance(tenantId);
    expect(result).toBeDefined();
  });
});
```

## Performance Considerations

### Query Optimization

The service is optimized for performance:

1. **Leverages Pre-computed Aggregates** - Uses `tournament_aggregates` table for fast queries
2. **Redis Caching** - Results cached with appropriate TTLs
3. **Efficient Queries** - Uses Prisma's optimized query generation
4. **Selective Includes** - Only fetches necessary relations
5. **Batch Operations** - Groups related queries together

### Scalability

- **Horizontal Scaling** - Service is stateless and can scale horizontally
- **Cache Warming** - Can pre-populate cache during off-peak hours
- **Read Replicas** - Can route analytical queries to read replicas
- **Partitioning** - Tournament aggregates partitioned by date for faster queries

### Cache Management

```typescript
import * as CacheManager from '@/lib/analytics/cache-manager';

// Warm cache for specific tenant
await CacheManager.warmCache(tenantId);

// Invalidate tournament analytics when data changes
await CacheManager.invalidate(`analytics:tournament:${tenantId}:*`);

// Get cache statistics
const stats = await CacheManager.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
```

## Best Practices

### 1. Use Appropriate Period Types

```typescript
// For real-time dashboards - daily
const dailyPerf = await analyzeTournamentPerformance(tenantId, {
  periodType: 'day',
});

// For weekly reviews - weekly
const weeklyPerf = await analyzeTournamentPerformance(tenantId, {
  periodType: 'week',
});

// For executive reports - monthly
const monthlyPerf = await analyzeTournamentPerformance(tenantId, {
  periodType: 'month',
});
```

### 2. Enable Comparisons for Trend Analysis

```typescript
const performance = await analyzeTournamentPerformance(tenantId, {
  compareToPrevious: true, // Always enable for dashboards
});

if (performance.comparison?.revenue.trend === 'up') {
  // Celebrate growth!
}
```

### 3. Use Predictions for Planning

```typescript
// Predict attendance 2 weeks in advance
const upcomingDate = addWeeks(new Date(), 2);
const prediction = await predictTournamentAttendance(
  tenantId,
  plannedFormat,
  upcomingDate
);

// Use prediction to plan resources
if (prediction.predictedAttendance > 20) {
  recommendExtraTables = true;
  recommendExtraStaff = true;
}
```

### 4. Monitor Player Engagement

```typescript
// Monthly engagement check
const engagement = await analyzePlayerEngagement(
  tenantId,
  startOfMonth(new Date()),
  endOfMonth(new Date())
);

// Alert on declining retention
if (engagement.metrics.retentionRate < 50) {
  sendAlert('Player retention is below 50%');
}
```

### 5. Track Against Benchmarks

```typescript
// Quarterly benchmark review
const benchmarks = await getTournamentBenchmarks(tenantId);

// Create action items from recommendations
benchmarks.recommendations.forEach((rec) => {
  createActionItem(rec);
});

// Celebrate strengths
benchmarks.strengths.forEach((strength) => {
  logSuccess(strength);
});
```

## Common Use Cases

### 1. Executive Dashboard

Combine multiple analytics for comprehensive overview:

```typescript
const [performance, engagement, benchmarks] = await Promise.all([
  analyzeTournamentPerformance(tenantId, { compareToPrevious: true }),
  analyzePlayerEngagement(tenantId, startOfQuarter(now), endOfQuarter(now)),
  getTournamentBenchmarks(tenantId),
]);

return {
  performance,
  engagement,
  benchmarks,
};
```

### 2. Format Selection Tool

Help organizers choose the best format:

```typescript
const formats = await analyzeFormatPopularity(tenantId, startDate, endDate);

const recommendations = formats.map((format) => ({
  format: format.format,
  score: calculateScore(format),
  pros: [],
  cons: [],
}));

// Highest revenue per player
if (format.avgRevenuePerTournament / format.avgPlayersPerTournament > threshold) {
  recommendations[0].pros.push('Highest revenue per player');
}

// Best completion rate
if (format.completionRate > 90) {
  recommendations[0].pros.push('Excellent completion rate');
}
```

### 3. Tournament Planning Assistant

Suggest optimal dates and formats:

```typescript
// Check multiple upcoming dates
const dates = [
  addWeeks(now, 1),
  addWeeks(now, 2),
  addWeeks(now, 3),
];

const predictions = await Promise.all(
  dates.map((date) =>
    predictTournamentAttendance(tenantId, preferredFormat, date)
  )
);

// Find date with highest predicted attendance
const bestDate = predictions.reduce((best, pred, idx) =>
  pred.predictedAttendance > predictions[best].predictedAttendance ? idx : best,
  0
);

return {
  recommendedDate: dates[bestDate],
  expectedAttendance: predictions[bestDate].predictedAttendance,
  reasoning: predictions[bestDate].recommendation,
};
```

### 4. Player Retention Program

Identify at-risk players:

```typescript
const engagement = await analyzePlayerEngagement(tenantId, startDate, endDate);

// Players who only played once - at risk of not returning
const atRiskCount = engagement.segments.oneTournament;

// Target them with re-engagement campaign
if (atRiskCount > 0) {
  await createMarketingCampaign({
    segment: 'one-time-players',
    count: atRiskCount,
    message: 'We miss you! Come back for your next tournament.',
  });
}
```

### 5. Performance Optimization

Identify areas for improvement:

```typescript
const benchmarks = await getTournamentBenchmarks(tenantId);
const metrics = await calculateTournamentMetrics(tenantId);

// Check table utilization
if (metrics.tableUtilization < 60) {
  recommendations.push({
    area: 'Table Management',
    issue: 'Low table utilization',
    action: 'Consider reducing table count or increasing player capacity',
    priority: 'medium',
  });
}

// Check completion rate
if (benchmarks.benchmarks.completionRate.status === 'below') {
  recommendations.push({
    area: 'Tournament Operations',
    issue: 'Below-average completion rate',
    action: 'Investigate causes of tournament cancellations',
    priority: 'high',
  });
}
```

## Troubleshooting

### Issue: Predictions are inaccurate

**Causes:**
- Insufficient historical data
- Data quality issues
- Seasonal changes

**Solutions:**
```typescript
const prediction = await predictTournamentAttendance(tenantId, format, date);

// Check confidence level
if (prediction.confidence === 'low') {
  console.warn('Prediction has low confidence - need more historical data');
  // Use conservative estimates or manual input
}

// Check data points
const formats = await analyzeFormatPopularity(tenantId, startDate, endDate);
const formatData = formats.find((f) => f.format === format);

if (!formatData || formatData.tournamentCount < 5) {
  console.warn('Not enough historical data for this format');
}
```

### Issue: Slow query performance

**Causes:**
- Missing aggregates
- Cache not being used
- Large date ranges

**Solutions:**
```typescript
// Check if aggregates exist
const aggregates = await prisma.tournamentAggregate.findMany({
  where: { tenantId, periodType: 'month' },
  take: 1,
});

if (aggregates.length === 0) {
  console.warn('No aggregates found - run aggregation job first');
}

// Verify cache is working
const stats = await CacheManager.getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);

// Use smaller date ranges
const threeMonths = await analyzeFormatPopularity(
  tenantId,
  subMonths(now, 3), // Instead of 12 months
  now
);
```

### Issue: Metrics don't match expectations

**Causes:**
- Data inconsistencies
- Timezone issues
- Status field mismatches

**Solutions:**
```typescript
// Validate data quality
const metrics = await calculateTournamentMetrics(tenantId);

// Check for anomalies
if (metrics.participationRate < 50 || metrics.participationRate > 100) {
  console.error('Participation rate out of expected range');
  // Investigate player status values
}

if (metrics.tableUtilization > 100) {
  console.error('Table utilization cannot exceed 100%');
  // Check match duration calculations
}
```

## Next Steps

1. **Review Day 1** - `aggregation-service.ts` for data pipeline
2. **Review Day 2** - `revenue-calculator.ts` and `cohort-analyzer.ts` for related analytics
3. **Build Dashboards** - Use these services to create tournament analytics UI
4. **Schedule Reports** - Integrate with scheduled reporting system
5. **Optimize** - Monitor performance and optimize queries as needed

## Related Documentation

- **Aggregation Service** - `apps/web/lib/analytics/services/aggregation-service.ts`
- **Revenue Calculator** - `apps/web/lib/analytics/services/revenue-calculator.ts`
- **Cohort Analyzer** - `apps/web/lib/analytics/services/cohort-analyzer.ts`
- **Cache Manager** - `apps/web/lib/analytics/cache-manager.ts`
- **Prisma Schema** - `prisma/schema.prisma`
- **Sprint 10 Plan** - `sprints/current/sprint-10-analytics-reporting.md`
