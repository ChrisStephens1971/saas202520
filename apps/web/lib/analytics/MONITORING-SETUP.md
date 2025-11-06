# Analytics Monitoring Setup Guide

**Sprint 10 Week 1 Day 5**
**Last Updated:** 2025-11-06

---

## Overview

Comprehensive monitoring strategy for analytics infrastructure including metrics collection, dashboards, alerts, and incident response procedures.

---

## 1. Key Metrics to Monitor

### A. Application Performance Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| API Response Time (P50) | Median response time | < 100ms | > 200ms |
| API Response Time (P95) | 95th percentile | < 300ms | > 500ms |
| API Response Time (P99) | 99th percentile | < 500ms | > 1000ms |
| Request Rate | Requests per second | - | > 500 req/s |
| Error Rate | Failed requests % | < 0.1% | > 1% |
| Throughput | Successful req/min | - | Drop > 50% |

### B. Cache Performance Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Cache Hit Rate | % of requests served from cache | > 80% | < 60% |
| Cache Miss Rate | % of cache misses | < 20% | > 40% |
| Cache Memory Usage | Redis memory used | < 80% | > 90% |
| Cache Eviction Rate | Keys evicted/min | < 10/min | > 100/min |
| Cache Latency | Redis operation time | < 5ms | > 20ms |

### C. Database Performance Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Query Time (avg) | Average query duration | < 100ms | > 500ms |
| Query Time (P95) | 95th percentile | < 200ms | > 1000ms |
| Connection Pool Usage | % of connections used | < 70% | > 90% |
| Slow Queries | Queries > 1s | 0 | > 5/min |
| Database CPU | CPU utilization | < 70% | > 85% |
| Database Memory | Memory utilization | < 80% | > 90% |

### D. Background Job Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Queue Length | Jobs waiting | < 10 | > 100 |
| Job Success Rate | % successful jobs | > 99% | < 95% |
| Job Processing Time | Avg time per job | < 30s | > 120s |
| Failed Jobs | Failed jobs/hour | 0 | > 5 |
| Worker Health | Active workers | All | Any down |

### E. Business Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| Active Users | Users in last hour | - | Drop > 30% |
| Revenue Calculations | Successful calcs/day | - | < expected |
| Export Success Rate | % successful exports | > 99% | < 95% |
| Report Delivery Rate | % reports sent | > 99% | < 98% |

---

## 2. Monitoring Tools Setup

### Option A: Datadog (Recommended)

#### Installation

```bash
# Install Datadog agent
DD_API_KEY=<your-api-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure APM
cat > /etc/datadog-agent/conf.d/apm.yaml <<EOF
apm_config:
  enabled: true
  env: production
  service: analytics
EOF

# Restart agent
sudo systemctl restart datadog-agent
```

#### Application Instrumentation

```typescript
// apps/web/lib/monitoring/datadog.ts
import tracer from 'dd-trace';

tracer.init({
  service: 'analytics-api',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
  analytics: true,
  runtimeMetrics: true,
});

export { tracer };

// Track custom metrics
import { StatsD } from 'node-statsd';

const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'analytics.',
});

// Usage in code
export function trackMetric(name: string, value: number, tags?: string[]) {
  statsd.gauge(name, value, tags);
}

export function trackTiming(name: string, duration: number, tags?: string[]) {
  statsd.timing(name, duration, tags);
}

export function trackIncrement(name: string, tags?: string[]) {
  statsd.increment(name, tags);
}
```

#### Custom Metrics Examples

```typescript
// Track revenue calculation time
const start = Date.now();
const revenue = await RevenueCalculator.calculateMRR(tenantId, date);
trackTiming('revenue.calculation_time', Date.now() - start, [
  `tenant:${tenantId}`,
]);

// Track cache hit/miss
if (cachedData) {
  trackIncrement('cache.hit', ['type:revenue']);
} else {
  trackIncrement('cache.miss', ['type:revenue']);
}

// Track export queue
trackMetric('export.queue_length', queueLength, ['type:csv']);
```

### Option B: CloudWatch (AWS)

#### Metrics Collection

```typescript
// apps/web/lib/monitoring/cloudwatch.ts
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

export async function putMetric(
  name: string,
  value: number,
  unit: string = 'None',
  dimensions: { Name: string; Value: string }[] = []
) {
  await cloudwatch
    .putMetricData({
      Namespace: 'Analytics',
      MetricData: [
        {
          MetricName: name,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: dimensions,
        },
      ],
    })
    .promise();
}

// Usage
await putMetric('APIResponseTime', responseTime, 'Milliseconds', [
  { Name: 'Endpoint', Value: '/api/analytics/revenue' },
]);
```

### Option C: Prometheus + Grafana

#### Prometheus Metrics

```typescript
// apps/web/lib/monitoring/prometheus.ts
import promClient from 'prom-client';

const register = new promClient.Registry();

// HTTP request duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Cache hit rate
const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['type'],
  registers: [register],
});

const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['type'],
  registers: [register],
});

// Export metrics endpoint
export async function getMetrics() {
  return register.metrics();
}
```

---

## 3. Dashboard Configuration

### Datadog Dashboard (JSON)

```json
{
  "title": "Analytics Performance Dashboard",
  "description": "Real-time analytics monitoring",
  "widgets": [
    {
      "definition": {
        "title": "API Response Time (P95)",
        "type": "timeseries",
        "requests": [
          {
            "q": "avg:analytics.api.response_time{$env} by {endpoint}.as_count()",
            "display_type": "line"
          }
        ]
      }
    },
    {
      "definition": {
        "title": "Cache Hit Rate",
        "type": "query_value",
        "requests": [
          {
            "q": "avg:analytics.cache.hit_rate{$env}",
            "aggregator": "avg"
          }
        ],
        "custom_unit": "%",
        "precision": 2
      }
    },
    {
      "definition": {
        "title": "Error Rate",
        "type": "timeseries",
        "requests": [
          {
            "q": "sum:analytics.errors{$env}.as_rate()",
            "display_type": "bars"
          }
        ]
      }
    },
    {
      "definition": {
        "title": "Database Query Time",
        "type": "timeseries",
        "requests": [
          {
            "q": "avg:analytics.db.query_time{$env} by {query_type}",
            "display_type": "area"
          }
        ]
      }
    },
    {
      "definition": {
        "title": "Export Queue Length",
        "type": "query_value",
        "requests": [
          {
            "q": "avg:analytics.export.queue_length{$env}"
          }
        ]
      }
    }
  ],
  "template_variables": [
    {
      "name": "env",
      "default": "production",
      "prefix": "env"
    }
  ]
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Analytics Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='analytics'}[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Cache Performance",
        "targets": [
          {
            "expr": "cache_hits_total / (cache_hits_total + cache_misses_total) * 100",
            "legendFormat": "Hit Rate %"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname='analytics'}",
            "legendFormat": "Active Connections"
          }
        ],
        "type": "gauge"
      }
    ]
  }
}
```

---

## 4. Alert Configuration

### Datadog Monitors

```yaml
# Critical: High Error Rate
- name: "Analytics - High Error Rate"
  type: metric alert
  query: "avg(last_5m):sum:analytics.errors{env:production}.as_rate() > 0.01"
  message: |
    ⚠️ CRITICAL: Analytics error rate > 1%

    Current rate: {{value}}%

    Check logs: https://app.datadoghq.com/logs

    @pagerduty-analytics @slack-alerts
  tags:
    - team:analytics
    - severity:critical
  priority: 1

# Warning: Slow API Response
- name: "Analytics - Slow API Response"
  type: metric alert
  query: "avg(last_5m):avg:analytics.api.response_time{env:production} > 500"
  message: |
    ⚠️ WARNING: API response time > 500ms

    P95: {{value}}ms
    Target: < 300ms

    @slack-alerts
  tags:
    - team:analytics
    - severity:warning
  priority: 2

# Warning: Low Cache Hit Rate
- name: "Analytics - Low Cache Hit Rate"
  type: metric alert
  query: "avg(last_10m):avg:analytics.cache.hit_rate{env:production} < 0.6"
  message: |
    ⚠️ WARNING: Cache hit rate < 60%

    Current: {{value}}%
    Target: > 80%

    Action: Check cache warming strategy

    @slack-alerts
  tags:
    - team:analytics
    - severity:warning

# Critical: Database Connection Pool Exhausted
- name: "Analytics - DB Connection Pool"
  type: metric alert
  query: "avg(last_5m):avg:analytics.db.pool_usage{env:production} > 0.9"
  message: |
    🚨 CRITICAL: Database connection pool > 90%

    Usage: {{value}}%

    Action: Scale database or increase pool size

    @pagerduty-analytics
  tags:
    - team:analytics
    - severity:critical
  priority: 1

# Warning: Export Queue Backlog
- name: "Analytics - Export Queue Backlog"
  type: metric alert
  query: "avg(last_5m):avg:analytics.export.queue_length{env:production} > 100"
  message: |
    ⚠️ WARNING: Export queue backlog > 100 jobs

    Queue length: {{value}}

    Action: Check worker health

    @slack-alerts
  tags:
    - team:analytics
    - severity:warning
```

### CloudWatch Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name analytics-high-error-rate \
  --alarm-description "Error rate > 1%" \
  --metric-name ErrorRate \
  --namespace Analytics \
  --statistic Average \
  --period 300 \
  --threshold 1.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:analytics-alerts

# Slow response time alarm
aws cloudwatch put-metric-alarm \
  --alarm-name analytics-slow-response \
  --metric-name APIResponseTime \
  --namespace Analytics \
  --statistic p95 \
  --period 300 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:analytics-alerts
```

---

## 5. Log Aggregation

### Structured Logging

```typescript
// apps/web/lib/monitoring/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'analytics',
    env: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Production: Send to CloudWatch/Datadog
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export { logger };

// Usage
logger.info('Revenue calculated', {
  tenantId,
  mrr: result.mrr,
  duration: Date.now() - start,
});

logger.error('Revenue calculation failed', {
  tenantId,
  error: err.message,
  stack: err.stack,
});
```

### Log Patterns to Monitor

```
# Critical Errors
ERROR: Revenue calculation failed
ERROR: Database connection failed
ERROR: Redis connection lost

# Performance Issues
WARN: Query took > 1s
WARN: Cache miss rate > 40%
WARN: Export took > 60s

# Security Events
WARN: Unauthorized access attempt
ERROR: Cross-tenant data access blocked
WARN: Rate limit exceeded
```

---

## 6. Incident Response

### Severity Levels

| Level | Response Time | Examples |
|-------|--------------|----------|
| P1 (Critical) | < 15 min | Service down, data loss |
| P2 (High) | < 1 hour | Degraded performance, high error rate |
| P3 (Medium) | < 4 hours | Partial feature outage |
| P4 (Low) | Next business day | Minor bugs, UX issues |

### Incident Response Procedure

**1. Detection**
- Alert triggered
- User report
- Monitoring dashboard anomaly

**2. Assessment**
- Determine severity
- Identify affected users
- Estimate impact

**3. Communication**
- Update status page
- Notify stakeholders
- Post in incident channel

**4. Mitigation**
- Implement fix or workaround
- Scale resources if needed
- Rollback if necessary

**5. Resolution**
- Verify fix works
- Monitor for recurrence
- Update status page

**6. Post-Mortem**
- Document incident
- Identify root cause
- Create action items
- Share learnings

---

## 7. Health Checks

### API Health Endpoint

```typescript
// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL);

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      workers: await checkWorkers(),
    },
  };

  const allHealthy = Object.values(checks.checks).every((c) => c.healthy);

  return NextResponse.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, responseTime: 5 };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkRedis() {
  try {
    const start = Date.now();
    await redis.ping();
    return { healthy: true, responseTime: Date.now() - start };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkWorkers() {
  // Check if workers are processing jobs
  try {
    const queueHealth = await getQueueHealth();
    return { healthy: true, activeWorkers: queueHealth.active };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

---

## 8. Performance Tracking

### Apdex Score

```typescript
// Track user satisfaction (Apdex)
const satisfiedThreshold = 300; // ms
const toleratingThreshold = 1000; // ms

function calculateApdex(responseTimes: number[]) {
  const satisfied = responseTimes.filter((t) => t <= satisfiedThreshold).length;
  const tolerating = responseTimes.filter(
    (t) => t > satisfiedThreshold && t <= toleratingThreshold
  ).length;
  const frustrated = responseTimes.filter((t) => t > toleratingThreshold).length;

  const apdex = (satisfied + tolerating / 2) / responseTimes.length;

  return {
    apdex,
    satisfied,
    tolerating,
    frustrated,
    rating:
      apdex >= 0.94
        ? 'Excellent'
        : apdex >= 0.85
        ? 'Good'
        : apdex >= 0.7
        ? 'Fair'
        : 'Poor',
  };
}
```

---

## 9. Monitoring Checklist

- [ ] Application metrics instrumented
- [ ] Custom metrics for critical paths
- [ ] Database performance monitored
- [ ] Cache metrics tracked
- [ ] Background job monitoring active
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation working
- [ ] Dashboards created
- [ ] Alerts configured
- [ ] PagerDuty/on-call rotation set
- [ ] Health check endpoints active
- [ ] Incident response procedures documented
- [ ] Post-mortem template ready

---

## Summary

**Monitoring Stack:**
- Metrics: Datadog / CloudWatch / Prometheus
- Logs: CloudWatch Logs / Datadog / ELK
- Errors: Sentry
- Dashboards: Datadog / Grafana
- Alerts: PagerDuty + Slack

**Key Metrics:**
- API Response Time (P95 < 300ms)
- Cache Hit Rate (> 80%)
- Error Rate (< 0.1%)
- Database Query Time (< 100ms avg)
- Export Success Rate (> 99%)

**Next Steps:**
1. Complete dashboard setup
2. Configure all alerts
3. Test incident response
4. Schedule first monitoring review
