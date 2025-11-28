# Analytics Cache Strategy

**Sprint 10 Week 1 Day 5**
**Last Updated:** 2025-11-06

## Overview

Comprehensive caching strategy for the analytics infrastructure, detailing TTL policies, invalidation patterns, warming strategies, and memory management.

---

## 1. Cache Layer Architecture

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CacheManager   │ ← Abstraction Layer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Redis Cache   │ ← Storage Layer
└─────────────────┘
         │
         ▼
┌─────────────────┐
│    Database     │ ← Source of Truth
└─────────────────┘
```

---

## 2. TTL Strategy by Service

### A. Revenue Calculator

| Data Type          | TTL    | Rationale             | Invalidation Trigger |
| ------------------ | ------ | --------------------- | -------------------- |
| Current month MRR  | 5 min  | Actively changing     | Subscription change  |
| Historical MRR     | 1 hour | Rarely changes        | Manual correction    |
| Revenue projection | 1 hour | Expensive calculation | New month            |
| LTV calculation    | 30 min | Medium volatility     | Churn event          |
| Revenue breakdown  | 15 min | Moderate changes      | Payment event        |

**Example:**

```typescript
// Cache current MRR for 5 minutes
await CacheManager.set(
  CacheManager.getCacheKey('revenue', 'mrr', tenantId, currentMonth),
  mrrData,
  300 // 5 minutes
);

// Cache historical MRR for 1 hour
await CacheManager.set(
  CacheManager.getCacheKey('revenue', 'mrr', tenantId, historicalMonth),
  historicalMrr,
  3600 // 1 hour
);
```

### B. Cohort Analyzer

| Data Type         | TTL    | Rationale                     | Invalidation Trigger |
| ----------------- | ------ | ----------------------------- | -------------------- |
| Cohort retention  | 30 min | Infrequent updates            | User churn           |
| Cohort LTV        | 30 min | Calculated from subscriptions | Subscription change  |
| Retention curve   | 1 hour | Historical analysis           | End of month         |
| Cohort comparison | 1 hour | Expensive query               | New cohort data      |

**Example:**

```typescript
await CacheManager.set(
  CacheManager.getCacheKey('cohort', 'retention', tenantId, cohortDate),
  retentionData,
  1800 // 30 minutes
);
```

### C. Tournament Analyzer

| Data Type                 | TTL      | Rationale          | Invalidation Trigger |
| ------------------------- | -------- | ------------------ | -------------------- |
| Active tournament metrics | 5 min    | Real-time data     | Tournament update    |
| Completed tournament      | 24 hours | Immutable          | Never (historical)   |
| Format popularity         | 1 hour   | Aggregate data     | New tournament       |
| Player engagement         | 15 min   | Moderate frequency | Player action        |

**Example:**

```typescript
// Short TTL for active tournaments
await CacheManager.set(
  CacheManager.getCacheKey('tournament', tournamentId, 'metrics'),
  metrics,
  300 // 5 minutes
);

// Long TTL for completed tournaments
await CacheManager.set(
  CacheManager.getCacheKey('tournament', tournamentId, 'final'),
  finalMetrics,
  86400 // 24 hours
);
```

### D. Predictive Models

| Data Type              | TTL     | Rationale             | Invalidation Trigger    |
| ---------------------- | ------- | --------------------- | ----------------------- |
| Revenue forecast       | 1 hour  | Expensive computation | New revenue data        |
| User growth prediction | 1 hour  | Complex calculation   | Significant user change |
| Trend analysis         | 2 hours | Long-term patterns    | End of week             |

**Example:**

```typescript
await CacheManager.set(
  CacheManager.getCacheKey('prediction', 'revenue', tenantId, months),
  forecast,
  3600 // 1 hour
);
```

### E. Export Service

| Data Type         | TTL      | Rationale       | Invalidation Trigger |
| ----------------- | -------- | --------------- | -------------------- |
| Export job status | 1 hour   | Temporary state | Job completion       |
| Generated export  | 24 hours | Static file     | Manual deletion      |
| Export metadata   | 1 hour   | Job tracking    | Never                |

---

## 3. Cache Key Naming Convention

### Pattern

```
{namespace}:{entity}:{tenantId}:{identifier}:{variant}
```

### Examples

**Revenue:**

```
revenue:mrr:tenant-001:2024-11:current
revenue:mrr:tenant-001:2024-10:historical
revenue:breakdown:tenant-001:2024-11
```

**Cohorts:**

```
cohort:retention:tenant-001:2024-01:12months
cohort:ltv:tenant-001:2024-01
cohort:compare:tenant-001:2024-01-02-03
```

**Tournaments:**

```
tournament:metrics:tenant-001:tour-001
tournament:popularity:tenant-001:2024-11
tournament:engagement:tenant-001:2024-11
```

**Predictions:**

```
prediction:revenue:tenant-001:6months
prediction:users:tenant-001:3months
```

### Namespace Benefits

- Easy pattern-based invalidation
- Clear data organization
- Simple debugging and monitoring

---

## 4. Cache Invalidation Patterns

### A. Event-Based Invalidation

**Subscription Events:**

```typescript
// When subscription is created/updated/canceled
async function onSubscriptionEvent(subscription: Subscription) {
  const month = format(new Date(), 'yyyy-MM');

  await CacheManager.invalidate([
    // Invalidate current month revenue
    CacheManager.getCacheKey('revenue', 'mrr', subscription.tenantId, month),
    CacheManager.getCacheKey('revenue', 'breakdown', subscription.tenantId, month),

    // Invalidate LTV calculations
    CacheManager.getCacheKey('revenue', 'ltv', subscription.tenantId),

    // Invalidate cohort data for user's cohort
    CacheManager.getCacheKey(
      'cohort',
      'retention',
      subscription.tenantId,
      format(subscription.user.createdAt, 'yyyy-MM')
    ),
  ]);
}
```

**Tournament Events:**

```typescript
async function onTournamentUpdate(tournament: Tournament) {
  await CacheManager.invalidate([
    // Invalidate specific tournament metrics
    CacheManager.getCacheKey('tournament', 'metrics', tournament.tenantId, tournament.id),

    // Invalidate format popularity
    CacheManager.getCacheKey(
      'tournament',
      'popularity',
      tournament.tenantId,
      format(new Date(), 'yyyy-MM')
    ),
  ]);
}
```

### B. Pattern-Based Invalidation

**Clear all revenue caches for a tenant:**

```typescript
await CacheManager.invalidatePattern(`revenue:*:${tenantId}:*`);
```

**Clear all caches for a specific month:**

```typescript
await CacheManager.invalidatePattern(`*:*:${tenantId}:${month}:*`);
```

**Clear all prediction caches:**

```typescript
await CacheManager.invalidatePattern(`prediction:*`);
```

### C. Time-Based Invalidation

**Scheduled cache invalidation (via cron):**

```typescript
// Clear old export caches daily
cron.schedule('0 0 * * *', async () => {
  const oldDate = subDays(new Date(), 7);
  await CacheManager.invalidatePattern(`export:*:${format(oldDate, 'yyyy-MM-dd')}:*`);
});

// Refresh predictions every 6 hours
cron.schedule('0 */6 * * *', async () => {
  await CacheManager.invalidatePattern('prediction:*');
});
```

---

## 5. Cache Warming Strategies

### A. Proactive Warming

**On Application Start:**

```typescript
async function warmCriticalCaches() {
  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    take: 100, // Top 100 active tenants
  });

  await Promise.all(
    tenants.map(async (tenant) => {
      const currentMonth = startOfMonth(new Date());

      // Warm current month revenue
      await CacheManager.warmCache(
        CacheManager.getCacheKey('revenue', 'mrr', tenant.id, format(currentMonth, 'yyyy-MM')),
        () => RevenueCalculator.calculateMRR(tenant.id, currentMonth),
        300
      );

      // Warm cohort retention
      await CacheManager.warmCache(
        CacheManager.getCacheKey('cohort', 'retention', tenant.id, format(currentMonth, 'yyyy-MM')),
        () => CohortAnalyzer.analyzeCohort(tenant.id, currentMonth, 12),
        1800
      );
    })
  );
}
```

### B. Scheduled Warming

**Hourly warming for active data:**

```typescript
cron.schedule('0 * * * *', async () => {
  await warmCommonCaches();
});

async function warmCommonCaches() {
  const activeTenants = await getActiveTenants();

  await Promise.all(
    activeTenants.map(async (tenantId) => {
      const currentMonth = startOfMonth(new Date());

      // Warm current + last 3 months
      await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          CacheManager.warmCache(
            CacheManager.getCacheKey(
              'revenue',
              'mrr',
              tenantId,
              format(subMonths(currentMonth, i), 'yyyy-MM')
            ),
            () => RevenueCalculator.calculateMRR(tenantId, subMonths(currentMonth, i)),
            3600,
            { skipIfExists: true }
          )
        )
      );
    })
  );
}
```

### C. On-Demand Warming

**After data import:**

```typescript
async function onDataImport(tenantId: string) {
  // Warm all analytics caches after bulk import
  await Promise.all([
    warmRevenueCaches(tenantId),
    warmCohortCaches(tenantId),
    warmTournamentCaches(tenantId),
  ]);
}
```

---

## 6. Memory Usage Management

### A. Per-Tenant Estimates

**Average Cache Size:**

```
Revenue Metrics:
- Current month MRR: 2 KB
- Historical (12 months): 24 KB
- Projections: 5 KB
- Breakdown: 3 KB
Total: ~34 KB

Cohort Analysis:
- Retention curve (12 months): 15 KB
- Cohort LTV: 5 KB
- Multiple cohorts (6): 90 KB
Total: ~110 KB

Tournament Analytics:
- Active tournaments (10): 20 KB
- Popularity data: 5 KB
- Engagement metrics: 10 KB
Total: ~35 KB

Predictions:
- Revenue forecast: 10 KB
- User growth: 10 KB
Total: ~20 KB

Grand Total per Tenant: ~200 KB
```

### B. Scaling Calculations

| Tenants | Total Cache Size | Redis Memory | Headroom |
| ------- | ---------------- | ------------ | -------- |
| 100     | 20 MB            | 256 MB       | 92%      |
| 500     | 100 MB           | 512 MB       | 80%      |
| 1,000   | 200 MB           | 512 MB       | 61%      |
| 5,000   | 1 GB             | 2 GB         | 50%      |
| 10,000  | 2 GB             | 4 GB         | 50%      |

**Recommended Redis Configuration:**

- 1-1,000 tenants: 512 MB instance
- 1,000-5,000 tenants: 2 GB instance
- 5,000-10,000 tenants: 4 GB instance
- 10,000+ tenants: Redis Cluster (3-6 nodes @ 4 GB each)

### C. Eviction Policy

**Redis Configuration:**

```conf
# Evict least recently used keys when max memory reached
maxmemory-policy allkeys-lru

# Maximum memory (adjust based on tenants)
maxmemory 2gb

# Sample size for LRU
maxmemory-samples 10
```

---

## 7. Cache Statistics & Monitoring

### A. Key Metrics

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  memoryUsage: number;
  keyCount: number;
}
```

### B. Monitoring Dashboard

**Track:**

1. Hit rate (target: > 80%)
2. Memory usage (alert: > 85%)
3. Key count trend
4. Eviction rate
5. Average latency

### C. Alerts

```typescript
// Alert on low hit rate
if (stats.hitRate < 60) {
  alert('Cache hit rate below 60%! Check warming strategy.');
}

// Alert on high memory
if (stats.memoryUsage > 85) {
  alert('Redis memory usage > 85%! Consider scaling.');
}

// Alert on high error rate
if (stats.errors / stats.sets > 0.01) {
  alert('Cache error rate > 1%! Check Redis connection.');
}
```

---

## 8. Redis Configuration

### A. Connection Settings

```typescript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,

  // Connection pool
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),

  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,

  // Keep-alive
  keepAlive: 30000,
  enableReadyCheck: true,
  enableOfflineQueue: true,
};
```

### B. High Availability (Production)

**Redis Sentinel Configuration:**

```typescript
const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 },
  ],
  name: 'analytics-master',
  password: process.env.REDIS_PASSWORD,
});
```

**Redis Cluster (10,000+ tenants):**

```typescript
const redis = new Redis.Cluster(
  [
    { host: 'redis-1', port: 6379 },
    { host: 'redis-2', port: 6379 },
    { host: 'redis-3', port: 6379 },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
  }
);
```

---

## 9. Best Practices

1. **Always use TTL** - Never cache without expiration
2. **Namespace keys** - Use consistent key patterns
3. **Invalidate on change** - Clear related caches on updates
4. **Monitor hit rate** - Target 80%+ cache efficiency
5. **Warm proactively** - Pre-populate common queries
6. **Handle cache misses** - Always fallback to database
7. **Test eviction** - Verify behavior under memory pressure
8. **Log cache operations** - Track performance and errors

---

## 10. Implementation Checklist

- [x] TTL strategy defined for all services
- [x] Cache key naming convention established
- [x] Invalidation patterns implemented
- [x] Cache warming scheduled
- [x] Memory usage calculated
- [x] Redis configured with eviction policy
- [ ] Monitoring dashboard created (production)
- [ ] Alert rules configured (production)
- [ ] High availability setup (production)

---

## Summary

**Cache Strategy Highlights:**

- Hit rate target: 80%+
- Memory usage per tenant: ~200 KB
- Recommended Redis: 2 GB for 1,000 tenants
- TTL range: 5 minutes (active data) to 24 hours (static exports)
- Invalidation: Event-based + scheduled
- Warming: Proactive + on-demand

**Expected Performance:**

- 90% reduction in database queries
- 85% faster API response times
- 99.9% cache availability (with Sentinel/Cluster)
