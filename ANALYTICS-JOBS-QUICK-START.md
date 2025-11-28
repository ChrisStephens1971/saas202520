# Analytics Background Jobs - Quick Start Guide

**Sprint 10 Week 1 Day 1** - Quick reference for the analytics aggregation job system.

## What Was Built

A complete background job system for aggregating analytics data:

- ✅ BullMQ job queue infrastructure
- ✅ node-cron scheduled task system
- ✅ Revenue aggregation service
- ✅ User cohort analysis service
- ✅ Tournament metrics aggregation service
- ✅ Worker process with graceful shutdown
- ✅ Automated hourly/daily/weekly/monthly schedules

## Quick Commands

```bash
# Start workers and schedulers
cd apps/web
pnpm workers

# Start only workers (no cron)
pnpm workers --no-cron

# Start only schedulers (no workers)
pnpm workers --cron-only

# Show help
pnpm workers --help
```

## Files Created

```
apps/web/
├── lib/analytics/
│   ├── jobs/
│   │   ├── queue.ts              # BullMQ queue setup
│   │   ├── aggregation-job.ts    # Job processor
│   │   ├── scheduler.ts          # Cron schedulers
│   │   └── start-workers.ts      # Worker entry point
│   ├── services/
│   │   └── aggregation-service.ts # Aggregation logic
│   └── README.md                 # Full documentation
└── package.json                  # Added "workers" script
```

## Dependencies Added

- **bullmq** (v5.63.0) - Job queue and worker management
- **node-cron** (v3.0.3) - Scheduled task execution

## Scheduled Tasks

| Task               | Frequency            | Description                 |
| ------------------ | -------------------- | --------------------------- |
| Hourly Aggregation | Every hour           | All metrics for all tenants |
| Daily Revenue      | Daily at midnight    | Revenue aggregation         |
| Monthly Cohorts    | 1st of month at 1 AM | User retention analysis     |
| Weekly Tournaments | Monday at 2 AM       | Tournament metrics          |

## Database Tables Populated

### `revenue_aggregates`

- Total revenue, MRR, ARR
- Payment counts and success rates
- Refund statistics

### `user_cohorts`

- Cohort size and retention
- Monthly retention rates
- User activity tracking

### `tournament_aggregates`

- Tournament counts and completion rates
- Player statistics
- Average duration and popular formats
- Revenue per tournament

## Environment Variables

All optional (defaults provided):

```bash
REDIS_HOST=localhost        # Redis server
REDIS_PORT=6379             # Redis port
REDIS_PASSWORD=             # Redis password (if needed)
REDIS_DB=0                  # Redis database number
TZ=America/New_York         # Timezone for cron jobs
```

## Testing the System

### 1. Start Redis

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
redis-server
```

### 2. Start Workers

```bash
cd apps/web
pnpm workers
```

### 3. Verify Health

```typescript
// In Node REPL or test file
import { healthCheck } from './lib/analytics/jobs/queue';

const health = await healthCheck();
console.log(health);
// Should show: { healthy: true, metrics: {...} }
```

### 4. Manually Trigger a Job

```typescript
import { addJob } from './lib/analytics/jobs/queue';

// Queue an aggregation job
const job = await addJob('aggregation', {
  type: 'all', // Run all aggregations
});

console.log(`Job queued: ${job.id}`);
```

### 5. Check Queue Status

```typescript
import { getQueueMetrics } from './lib/analytics/jobs/queue';

const metrics = await getQueueMetrics();
console.log(metrics);
// { waiting: 0, active: 1, completed: 5, failed: 0, ... }
```

## Key Features

### Multi-Tenant Support

- Process all tenants or specific tenant
- Tenant-isolated data aggregation
- Error isolation (one tenant failure doesn't affect others)

### Automatic Retries

- Failed jobs retry 3 times
- Exponential backoff (5s → 10s → 20s)
- Failed jobs kept for 7 days for debugging

### Graceful Shutdown

- Press CTRL+C to shutdown
- Waits for active jobs to complete
- Closes all connections cleanly

### Health Monitoring

- Periodic health checks (every 60s)
- Queue metrics (waiting, active, completed, failed)
- Scheduler status (enabled/disabled tasks)

### Performance

- 5 concurrent workers
- 10 jobs per second rate limit
- Automatic job cleanup (24 hours for completed, 7 days for failed)

## Common Operations

### Check Scheduler Status

```typescript
import { getSchedulerStatus } from './lib/analytics/jobs/scheduler';

const status = getSchedulerStatus();
console.log(status);
```

### Manually Trigger Scheduled Task

```typescript
import { triggerTask } from './lib/analytics/jobs/scheduler';

// Trigger hourly aggregation now
await triggerTask('hourly-aggregation');
```

### Pause/Resume Queue

```typescript
import { pauseQueue, resumeQueue } from './lib/analytics/jobs/queue';

// Pause processing
await pauseQueue();

// Resume processing
await resumeQueue();
```

### Clean Old Jobs

```typescript
import { cleanQueue } from './lib/analytics/jobs/queue';

// Remove jobs older than 24 hours
await cleanQueue(86400000);
```

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start workers
pm2 start "pnpm workers" --name analytics-workers

# View logs
pm2 logs analytics-workers

# Stop workers
pm2 stop analytics-workers

# Restart workers
pm2 restart analytics-workers

# Auto-start on system boot
pm2 startup
pm2 save
```

### Using Docker

```dockerfile
# Dockerfile for workers
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

CMD ["pnpm", "workers"]
```

### Using systemd

```ini
# /etc/systemd/system/analytics-workers.service
[Unit]
Description=Analytics Background Workers
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/apps/web
ExecStart=/usr/bin/pnpm workers
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Workers won't start

1. Check Redis: `redis-cli ping`
2. Check environment variables
3. Check logs for errors

### Jobs not processing

1. Verify workers are running
2. Check queue metrics: `getQueueMetrics()`
3. Look for stalled jobs in logs

### Aggregation errors

1. Check database connectivity
2. Verify Prisma schema
3. Check tenant data exists
4. Review error logs

### Scheduler not triggering

1. Check status: `getSchedulerStatus()`
2. Verify timezone: `TZ` environment variable
3. Check system clock
4. Manually trigger: `triggerTask()`

## Next Steps

After implementing this system:

1. **Monitor Performance**
   - Watch queue metrics
   - Review job completion times
   - Adjust concurrency if needed

2. **Test Aggregations**
   - Verify data in aggregate tables
   - Compare with raw data
   - Check for edge cases

3. **Optimize Schedules**
   - Adjust cron expressions based on usage
   - Add/remove scheduled tasks as needed
   - Consider time zones for multi-region deployments

4. **Add Monitoring**
   - Set up alerts for failed jobs
   - Track queue depth over time
   - Monitor Redis memory usage

5. **Build Dashboards**
   - Create UI to display aggregated data
   - Add real-time updates via WebSockets
   - Build admin panel for job management

## API Integration Examples

### Queue a Job from API Route

```typescript
// app/api/admin/analytics/aggregate/route.ts
import { addJob } from '@/lib/analytics/jobs/queue';

export async function POST(request: Request) {
  const { tenantId, type } = await request.json();

  const job = await addJob('aggregation', {
    tenantId,
    type,
  });

  return Response.json({
    success: true,
    jobId: job.id,
  });
}
```

### Get Queue Status from API

```typescript
// app/api/admin/analytics/queue-status/route.ts
import { getQueueMetrics } from '@/lib/analytics/jobs/queue';

export async function GET() {
  const metrics = await getQueueMetrics();

  return Response.json(metrics);
}
```

### Trigger Scheduled Task from API

```typescript
// app/api/admin/analytics/trigger/route.ts
import { triggerTask } from '@/lib/analytics/jobs/scheduler';

export async function POST(request: Request) {
  const { taskName } = await request.json();

  const success = await triggerTask(taskName);

  return Response.json({
    success,
    taskName,
  });
}
```

## Full Documentation

See `apps/web/lib/analytics/README.md` for complete documentation including:

- Architecture diagrams
- Detailed API reference
- Performance tuning
- Advanced configurations
- Development guidelines

---

**Sprint 10 Week 1 Day 1** - Background Aggregation Job System ✅

Ready to process analytics data automatically!
