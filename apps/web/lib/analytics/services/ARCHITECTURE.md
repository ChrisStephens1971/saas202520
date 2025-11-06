# Analytics Services Architecture

Visual guide to the analytics infrastructure and data flow.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT / API                              │
│  (Dashboard, Reports, API Routes)                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  ANALYTICS     │
                    │  SERVICE       │
                    │  (Orchestrator)│
                    └───────┬────────┘
                            │
        ┏━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━┓
        ┃                                        ┃
   ┌────▼────────┐                     ┌────────▼─────┐
   │  REVENUE    │                     │   COHORT     │
   │  CALCULATOR │                     │   ANALYZER   │
   └────┬────────┘                     └────────┬─────┘
        │                                       │
        └───────────────┬───────────────────────┘
                        │
                  ┌─────▼──────┐
                  │   CACHE    │
                  │  MANAGER   │
                  │  (Redis)   │
                  └─────┬──────┘
                        │
            ┏━━━━━━━━━━━┻━━━━━━━━━━━┓
            ┃                        ┃
      ┌─────▼─────┐           ┌──────▼──────┐
      │ REDIS     │           │ PRISMA      │
      │ CACHE     │           │ DATABASE    │
      └───────────┘           └─────────────┘
```

## Data Flow

### 1. Initial Data Aggregation (Day 1)

```
Raw Events → Aggregation Service → Database Tables
   │              │                      │
   │              │                      ├─ revenue_aggregates
   │              │                      ├─ user_cohorts
   │              │                      └─ tournament_aggregates
   │              │
   ├─ Payments    │
   ├─ Users       │
   └─ Tournaments │
```

### 2. Analytics Computation (Day 2)

```
Database Tables → Calculator Services → Cached Results → Client
      │                   │                    │
      │                   ├─ MRR/ARR          │
      │                   ├─ Churn Rate       │
      │                   ├─ Retention        │
      │                   ├─ Projections      │
      │                   └─ Benchmarks       │
      │                                       │
      └─ Aggregates                          Redis
```

### 3. Request Flow with Caching

```
Client Request
      ↓
Analytics Service
      ↓
Check Cache? ──Yes──→ Return Cached Data
      │                      ↑
     No                      │
      ↓                      │
Revenue/Cohort Calculator    │
      ↓                      │
Query Database               │
      ↓                      │
Compute Metrics              │
      ↓                      │
Cache Result ────────────────┘
      ↓
Return to Client
```

## Service Relationships

### Revenue Calculator

**Depends On:**
- Prisma (Database access)
- `revenue_aggregates` table
- `user_cohorts` table (for LTV)

**Used By:**
- Analytics Service
- API Routes
- Dashboard Components

**Key Operations:**
```
calculateMRR() ──┐
calculateARR() ──┼──→ Revenue Analytics
calculateChurn() ┤
projections()  ──┘
```

### Cohort Analyzer

**Depends On:**
- Prisma (Database access)
- `user_cohorts` table

**Used By:**
- Analytics Service
- Retention Reports
- User Analytics Dashboard

**Key Operations:**
```
analyzeCohort() ──┐
retentionCurve() ─┼──→ Cohort Analytics
compareCohorts() ─┤
benchmarks()    ──┘
```

### Cache Manager

**Depends On:**
- Redis (ioredis)

**Used By:**
- All Calculator Services
- Analytics Service
- Background Jobs

**Key Operations:**
```
get() ──────┐
set() ──────┼──→ Cache Operations
invalidate()┤
warmCache() ┘
```

## Cache Strategy

### Cache Key Structure

```
analytics:{type}:{tenantId}:{params}

Examples:
├─ analytics:revenue:org_123:2024-01
├─ analytics:cohorts:org_123
├─ analytics:tournaments:org_123:2024-01
└─ analytics:dashboard:org_123
```

### TTL Hierarchy

```
Data Type          TTL        Reason
──────────────────────────────────────
Real-time         60s        Live data changes frequently
Revenue metrics   300s       Updated every 5 min
Dashboard KPIs    300s       Quick refresh for users
Cohort analysis   3600s      Historical, stable data
Projections       3600s      Computed once per hour
Benchmarks        86400s     Rarely changes
```

### Cache Warming Flow

```
warmCache(tenantId)
      │
      ├─→ getRevenueAnalytics() ──→ Cache
      ├─→ getCohortAnalytics()  ──→ Cache
      ├─→ getTournamentAnalytics() ─→ Cache
      └─→ getDashboardSummary() ──→ Cache
```

## Database Schema Integration

### Tables Used

```
revenue_aggregates
├─ tenantId (FK)
├─ periodStart
├─ periodEnd
├─ periodType (day/week/month/quarter/year)
├─ mrr
├─ arr
├─ totalRevenue
├─ churnedRevenue
└─ ... (15 fields)

user_cohorts
├─ tenantId (FK)
├─ cohortMonth
├─ cohortSize
├─ monthNumber
├─ retainedUsers
├─ retentionRate
├─ revenue
└─ ltv

tournament_aggregates
├─ tenantId (FK)
├─ periodStart
├─ periodEnd
├─ tournamentCount
├─ completedCount
├─ totalPlayers
└─ ... (10 fields)
```

### Index Strategy

```
revenue_aggregates:
  ├─ UNIQUE [tenantId, periodType, periodStart]
  └─ INDEX [tenantId, periodStart DESC]

user_cohorts:
  ├─ UNIQUE [tenantId, cohortMonth, monthNumber]
  └─ INDEX [tenantId, cohortMonth DESC]

tournament_aggregates:
  ├─ UNIQUE [tenantId, periodType, periodStart]
  └─ INDEX [tenantId, periodStart DESC]
```

## API Integration Pattern

### Express Route Example

```typescript
// Dashboard endpoint
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Get cached or computed dashboard
    const dashboard = await getDashboardSummary(tenantId);

    res.json({
      success: true,
      data: dashboard,
      cached: dashboard.cached,
      generatedAt: dashboard.generatedAt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### React Component Example

```typescript
// Dashboard component
function AnalyticsDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(result => setData(result.data));
  }, []);

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <KPICard mrr={data?.kpis.mrr} />
      <RetentionChart rate={data?.kpis.retentionRate} />
      <TrendIndicator trends={data?.trends} />
    </div>
  );
}
```

## Background Job Integration

### Aggregation Schedule

```
Cron Schedule: Every hour
      ↓
Background Job
      ↓
getActiveTenants()
      ↓
For each tenant:
  ├─ aggregateRevenue()
  ├─ aggregateCohorts()
  └─ aggregateTournaments()
      ↓
invalidateCache(tenant)
      ↓
warmCache(tenant)
```

## Performance Optimization

### Query Optimization

```
Bad: Sequential queries
  query1 → wait → query2 → wait → query3

Good: Parallel queries
  Promise.all([query1, query2, query3])
```

### Caching Layers

```
Level 1: Redis Cache (ms latency)
   ↓ (miss)
Level 2: Database (10-50ms latency)
   ↓ (compute)
Level 3: Calculator Logic (50-200ms)
```

## Error Handling Flow

```
Client Request
      ↓
Try: Get from Cache
      ↓
Catch: Cache unavailable
      ↓
Try: Calculate from Database
      ↓
Catch: Data missing
      ↓
Return: Error response
   or Default values
```

## Monitoring Points

### Health Checks

```
1. Cache Health
   └─ isHealthy() → PONG?

2. Data Freshness
   └─ getAnalyticsHealth() → Last update time

3. Cache Performance
   └─ getCacheStats() → Hit rate, miss rate

4. Data Quality
   └─ Check completeness percentages
```

### Metrics to Track

```
Performance Metrics:
├─ Cache hit rate (target: >80%)
├─ Query latency (target: <100ms)
├─ Computation time (target: <500ms)
└─ API response time (target: <1s)

Data Metrics:
├─ Data freshness (target: <1h)
├─ Data completeness (target: >95%)
├─ Aggregation success rate (target: >99%)
└─ Cache memory usage (target: <1GB)

Business Metrics:
├─ MRR growth rate
├─ Retention rate trends
├─ Churn rate changes
└─ Revenue projections accuracy
```

## Scalability Considerations

### Horizontal Scaling

```
Load Balancer
      ↓
   ┌──┴──┐
   ▼     ▼
App1  App2  (Multiple instances)
   │     │
   └──┬──┘
      ▼
Shared Redis Cache
      ▼
Shared Database
```

### Cache Partitioning

```
Tenant Sharding:
├─ Shard 1: tenants 0-999
├─ Shard 2: tenants 1000-1999
└─ Shard N: tenants N*1000-(N+1)*1000
```

## Development Workflow

### Test Data Generation

```
1. Clear existing data
   └─ clearTestData(tenantId)

2. Generate test data
   └─ seedAnalyticsData(tenantId, 12)

3. Run aggregations
   └─ aggregateAll(...)

4. Warm cache
   └─ warmCache(tenantId)

5. Test APIs
   └─ Call analytics endpoints
```

### Integration Testing

```
1. Seed test data
2. Test revenue calculator
3. Test cohort analyzer
4. Test analytics service
5. Test caching behavior
6. Test error handling
7. Clean up test data
```

## Security Considerations

### Multi-tenant Isolation

```
All queries include tenantId:
├─ WHERE tenantId = ?
├─ Cache keys include tenantId
└─ No cross-tenant data leakage
```

### Rate Limiting

```
By Endpoint:
├─ Dashboard: 60 req/min
├─ Revenue: 30 req/min
├─ Cohorts: 30 req/min
└─ Health: 120 req/min
```

## Future Architecture

### Planned Enhancements

```
Current:
  Client → API → Cache → Database

Future:
  Client → API → Cache → Event Stream
                          ↓
                    Real-time Processing
                          ↓
                    ML Predictions
                          ↓
                    Advanced Analytics
```

---

**Architecture designed for:**
- High performance
- Easy scalability
- Multi-tenant safety
- Developer experience
- Production reliability

**Sprint 10 Week 1 Day 2 - Complete**
