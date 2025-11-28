# Analytics Background Job System

**Sprint 10 Week 1 Day 1** - Background aggregation job system for analytics data processing.

## Overview

This system provides automated background processing for analytics data aggregation using BullMQ (job queue) and node-cron (scheduled tasks). It computes and stores pre-aggregated metrics in dedicated database tables for fast dashboard queries.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cron Schedulers                         │
│  (Hourly, Daily, Weekly, Monthly aggregation triggers)     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     BullMQ Queue                            │
│           (Redis-backed job queue)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Workers                                 │
│  (Process jobs concurrently with retries)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Aggregation Service                          │
│  (Compute metrics from raw data)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (Aggregate Tables)                    │
│  - revenue_aggregates                                       │
│  - user_cohorts                                             │
│  - tournament_aggregates                                    │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
apps/web/lib/analytics/
├── jobs/
│   ├── queue.ts              # BullMQ queue infrastructure
│   ├── aggregation-job.ts    # Job processor for aggregations
│   ├── scheduler.ts          # Cron-based job schedulers
│   └── start-workers.ts      # Worker entry point
├── services/
│   └── aggregation-service.ts # Aggregation logic
└── README.md                 # This file
```

## Components

### 1. Queue Infrastructure (`jobs/queue.ts`)

**Responsibilities:**

- Initialize and manage BullMQ queue
- Create workers for processing jobs
- Handle job lifecycle (retry, failure, completion)
- Provide queue metrics and health checks

**Key Functions:**

- `initializeQueue()` - Set up BullMQ queue with Redis
- `createWorker()` - Create worker instances
- `addJob()` - Queue new jobs
- `getQueueMetrics()` - Get queue statistics
- `healthCheck()` - Verify queue system health

**Job Types:**

- `aggregation` - Compute analytics aggregates
- `export` - Generate data exports (future)
- `scheduled-report` - Send automated reports (future)

### 2. Aggregation Service (`services/aggregation-service.ts`)

**Responsibilities:**

- Query raw data from database
- Compute aggregated metrics
- Upsert results into aggregate tables

**Functions:**

#### `aggregateRevenue(tenantId, periodStart, periodEnd, periodType)`

Computes revenue metrics:

- Total revenue (successful payments)
- Payment counts and success rates
- Refund amounts
- MRR and ARR estimates

Writes to: `revenue_aggregates` table

#### `aggregateCohorts(tenantId, cohortMonth)`

Computes user retention:

- Cohort size (users signed up in month)
- Retained users per month
- Retention rate percentages

Writes to: `user_cohorts` table

#### `aggregateTournaments(tenantId, periodStart, periodEnd, periodType)`

Computes tournament metrics:

- Tournament counts (total, completed)
- Completion rates
- Player statistics (total, average)
- Average tournament duration
- Most popular format
- Revenue per tournament

Writes to: `tournament_aggregates` table

#### `aggregateAll(tenantId, periodStart, periodEnd, periodType)`

Runs all aggregation types for a period.

#### `getActiveTenants()`

Returns list of all organization IDs for batch processing.

### 3. Aggregation Job (`jobs/aggregation-job.ts`)

**Responsibilities:**

- Process BullMQ job payloads
- Call appropriate aggregation service functions
- Handle errors and retries
- Report job progress

**Job Payload:**

```typescript
interface AggregationJobData {
  tenantId?: string; // Optional - if undefined, process all tenants
  type: 'revenue' | 'cohorts' | 'tournaments' | 'all';
  periodStart?: string; // ISO date string
  periodEnd?: string; // ISO date string
  periodType?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}
```

**Retry Configuration:**

- Max attempts: 3
- Backoff: Exponential (5s, 10s, 20s)
- Failed jobs kept for 7 days

### 4. Job Scheduler (`jobs/scheduler.ts`)

**Responsibilities:**

- Define cron schedules for recurring jobs
- Queue jobs at scheduled times
- Manage scheduler lifecycle (start/stop/destroy)

**Scheduled Tasks:**

| Task               | Schedule                | Cron Expression | Description                       |
| ------------------ | ----------------------- | --------------- | --------------------------------- |
| Hourly Aggregation | Every hour at :00       | `0 * * * *`     | Run all aggregations              |
| Daily Revenue      | Daily at midnight       | `0 0 * * *`     | Aggregate yesterday's revenue     |
| Monthly Cohorts    | 1st of month at 1:00 AM | `0 1 1 * *`     | Analyze user cohorts              |
| Weekly Tournaments | Monday at 2:00 AM       | `0 2 * * 1`     | Aggregate last week's tournaments |

**Functions:**

- `initializeScheduler()` - Create all scheduled tasks
- `startScheduler()` - Begin executing schedules
- `stopScheduler()` - Pause all schedules
- `destroyScheduler()` - Remove all schedules
- `getSchedulerStatus()` - Get status of all tasks
- `triggerTask(taskName)` - Manually trigger a task

### 5. Worker Starter (`jobs/start-workers.ts`)

**Responsibilities:**

- Entry point for starting workers
- Initialize workers and schedulers
- Handle graceful shutdown
- Monitor health

**Usage:**

```bash
# Start all (workers + schedulers)
pnpm workers

# Start only workers (no cron)
pnpm workers --no-cron

# Start only schedulers (no workers)
pnpm workers --cron-only

# Show help
pnpm workers --help
```

**Features:**

- Graceful shutdown on SIGTERM/SIGINT
- Uncaught error handling
- Periodic health checks (every 60s)
- Startup health validation

## Database Tables

### `revenue_aggregates`

Stores pre-computed revenue metrics by time period.

**Key Fields:**

- `tenantId` - Organization ID
- `periodStart`, `periodEnd` - Time period boundaries
- `periodType` - day, week, month, quarter, year
- `mrr`, `arr` - Monthly/Annual Recurring Revenue
- `totalRevenue` - Net revenue (after refunds)
- `paymentCount`, `paymentSuccessCount` - Payment statistics
- `refundCount`, `refundAmount` - Refund statistics

**Unique Constraint:** `(tenantId, periodType, periodStart)`

### `user_cohorts`

Stores user retention analysis by signup cohort.

**Key Fields:**

- `tenantId` - Organization ID
- `cohortMonth` - First day of signup month (YYYY-MM-01)
- `monthNumber` - Months since signup (0 = signup month, 1 = month 1, etc.)
- `cohortSize` - Total users in cohort
- `retainedUsers` - Users still active in this month
- `retentionRate` - Percentage retained

**Unique Constraint:** `(tenantId, cohortMonth, monthNumber)`

### `tournament_aggregates`

Stores tournament performance metrics by time period.

**Key Fields:**

- `tenantId` - Organization ID
- `periodStart`, `periodEnd` - Time period boundaries
- `periodType` - day, week, month, quarter, year
- `tournamentCount` - Total tournaments created
- `completedCount` - Tournaments completed
- `completionRate` - Percentage completed
- `totalPlayers`, `avgPlayers` - Player statistics
- `avgDurationMinutes` - Average tournament length
- `mostPopularFormat` - Most used format
- `revenue` - Revenue from tournaments

**Unique Constraint:** `(tenantId, periodType, periodStart)`

## Running the System

### Prerequisites

1. **Redis** must be running:

   ```bash
   # Check if Redis is running
   redis-cli ping
   # Should return: PONG
   ```

2. **Environment Variables** (optional, defaults provided):
   ```bash
   REDIS_HOST=localhost      # Redis server host
   REDIS_PORT=6379           # Redis server port
   REDIS_PASSWORD=           # Redis password (if required)
   REDIS_DB=0                # Redis database number
   TZ=America/New_York       # Timezone for cron jobs
   ```

### Starting Workers

```bash
# Navigate to web app directory
cd apps/web

# Start workers and schedulers
pnpm workers
```

**Expected Output:**

```
============================================================
Analytics Workers - Background Job Processing
Sprint 10 Week 1 - Advanced Analytics
============================================================
[Workers] Running initial health check...
[Workers] Health check passed: { waiting: 0, active: 0, ... }
[Workers] Mode: Workers + Cron schedulers
[Queue] Creating analytics worker...
[Workers] BullMQ workers started successfully
[Scheduler] Initializing scheduled tasks...
[Scheduler] 4 tasks initialized
[Scheduler] Starting all scheduled tasks...
[Scheduler] 4 tasks started
============================================================
[Workers] All systems started successfully
[Workers] Press CTRL+C to shutdown gracefully
============================================================
```

### Stopping Workers

Press `CTRL+C` to trigger graceful shutdown:

- Stops accepting new jobs
- Waits for active jobs to complete
- Closes all connections
- Exits cleanly

### Running in Production

Use a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start workers with PM2
pm2 start "pnpm workers" --name analytics-workers

# View logs
pm2 logs analytics-workers

# Monitor status
pm2 status

# Stop workers
pm2 stop analytics-workers

# Restart workers
pm2 restart analytics-workers
```

## Manual Job Triggering

You can manually queue jobs for testing or one-off aggregations:

```typescript
import { addJob } from './lib/analytics/jobs/queue';

// Aggregate revenue for specific tenant
await addJob('aggregation', {
  tenantId: 'org_123',
  type: 'revenue',
  periodStart: '2025-11-01',
  periodEnd: '2025-11-06',
  periodType: 'day',
});

// Aggregate all metrics for all tenants
await addJob('aggregation', {
  type: 'all',
});

// Trigger cohort analysis for October 2025
await addJob('aggregation', {
  tenantId: 'org_123',
  type: 'cohorts',
  periodStart: '2025-10-01',
});
```

Or manually trigger a scheduled task:

```typescript
import { triggerTask } from './lib/analytics/jobs/scheduler';

// Manually trigger hourly aggregation
await triggerTask('hourly-aggregation');

// Manually trigger daily revenue
await triggerTask('daily-revenue');
```

## Monitoring

### Queue Metrics

Get real-time queue status:

```typescript
import { getQueueMetrics } from './lib/analytics/jobs/queue';

const metrics = await getQueueMetrics();
console.log(metrics);
// {
//   waiting: 5,     // Jobs waiting to be processed
//   active: 2,      // Jobs currently processing
//   completed: 150, // Total completed jobs
//   failed: 3,      // Total failed jobs
//   delayed: 0,     // Jobs scheduled for later
//   paused: false   // Queue paused status
// }
```

### Health Check

Verify system health:

```typescript
import { healthCheck } from './lib/analytics/jobs/queue';

const health = await healthCheck();
console.log(health);
// {
//   healthy: true,
//   metrics: { waiting: 0, active: 1, ... }
// }
```

### Scheduler Status

Check scheduled task status:

```typescript
import { getSchedulerStatus } from './lib/analytics/jobs/scheduler';

const status = getSchedulerStatus();
console.log(status);
// [
//   { name: 'hourly-aggregation', schedule: '0 * * * *', enabled: true },
//   { name: 'daily-revenue', schedule: '0 0 * * *', enabled: true },
//   ...
// ]
```

## Error Handling

### Job Failures

Jobs that fail are automatically retried up to 3 times with exponential backoff:

- Attempt 1 fails → Wait 5 seconds → Retry
- Attempt 2 fails → Wait 10 seconds → Retry
- Attempt 3 fails → Job marked as failed

Failed jobs are kept in Redis for 7 days for debugging.

### Tenant Isolation

If one tenant's aggregation fails, other tenants continue processing. Errors are logged and reported in the job result.

### Worker Crashes

If a worker crashes:

- BullMQ automatically marks jobs as "stalled"
- Jobs are automatically reassigned to other workers
- Workers log stalled jobs for investigation

## Performance Considerations

### Concurrency

Workers process up to **5 jobs concurrently** by default. Adjust in `queue.ts`:

```typescript
const workerOptions: WorkerOptions = {
  concurrency: 10, // Increase for more parallelism
  // ...
};
```

### Rate Limiting

Workers are rate-limited to **10 jobs per second** to prevent database overload. Adjust in `queue.ts`:

```typescript
limiter: {
  max: 20,      // Max jobs
  duration: 1000, // per second
}
```

### Memory Management

Completed jobs are automatically removed:

- Completed jobs: Kept for 24 hours (max 1000 jobs)
- Failed jobs: Kept for 7 days (max 5000 jobs)

Run manual cleanup:

```typescript
import { cleanQueue } from './lib/analytics/jobs/queue';

// Remove jobs older than 24 hours
await cleanQueue(86400000);
```

## Troubleshooting

### Workers won't start

**Problem:** Health check fails on startup

**Solutions:**

1. Check Redis is running: `redis-cli ping`
2. Verify Redis connection settings in environment
3. Check Redis logs: `redis-cli INFO`
4. Test Redis connection manually

### Jobs stuck in "waiting" state

**Problem:** Jobs queued but not processing

**Solutions:**

1. Check if workers are running: `getQueueMetrics()`
2. Verify worker count and concurrency settings
3. Check for stalled jobs: Look for "stalled" logs
4. Restart workers

### Aggregation errors

**Problem:** Jobs fail with aggregation errors

**Solutions:**

1. Check database connectivity
2. Verify Prisma schema matches database
3. Check for missing tenant data
4. Review job logs for specific errors
5. Test aggregation functions directly

### Scheduler not triggering

**Problem:** Cron jobs not executing

**Solutions:**

1. Verify scheduler is started: `getSchedulerStatus()`
2. Check timezone settings (`TZ` environment variable)
3. Validate cron expressions: `validateCronExpression()`
4. Manually trigger task: `triggerTask('task-name')`
5. Check system clock is correct

## Development

### Running Tests

```bash
# Test aggregation service
pnpm test services/aggregation-service.test.ts

# Test job processing
pnpm test jobs/aggregation-job.test.ts
```

### Adding New Aggregations

1. Add aggregation function to `services/aggregation-service.ts`
2. Update job processor in `jobs/aggregation-job.ts`
3. Add scheduler if needed in `jobs/scheduler.ts`
4. Update job types in `jobs/queue.ts`

### Debugging

Enable detailed logging:

```bash
# Set environment variable
export DEBUG=bullmq:*

# Start workers
pnpm workers
```

## Future Enhancements

### Planned Features

1. **Export Jobs** - Generate CSV/Excel/PDF exports
2. **Scheduled Reports** - Automated email reports
3. **Real-time Dashboards** - WebSocket updates from workers
4. **Advanced Retry Logic** - Custom retry strategies per job type
5. **Job Prioritization** - Priority queues for urgent aggregations
6. **Distributed Workers** - Multi-server worker deployment
7. **Dead Letter Queue** - Special handling for repeatedly failing jobs

### Optimization Opportunities

1. **Incremental Aggregation** - Only process new data since last run
2. **Parallel Tenant Processing** - Process tenants in parallel
3. **Caching** - Cache frequently accessed aggregates
4. **Batch Processing** - Group similar jobs together
5. **Compression** - Compress job payloads for large datasets

## References

- **BullMQ Documentation:** https://docs.bullmq.io/
- **node-cron Documentation:** https://github.com/node-cron/node-cron
- **Redis Documentation:** https://redis.io/docs/
- **Prisma Documentation:** https://www.prisma.io/docs/

## Support

For issues or questions:

1. Check logs: `pm2 logs analytics-workers`
2. Review queue metrics: `getQueueMetrics()`
3. Check Redis status: `redis-cli INFO`
4. Consult troubleshooting section above

---

**Sprint 10 Week 1 Day 1** - Background Aggregation Job System ✅
