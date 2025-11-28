# Load Testing Documentation

Comprehensive load testing infrastructure for the Tournament Platform using k6.

## Overview

This directory contains load testing scenarios designed to test the performance, scalability, and reliability of the tournament platform under various load conditions.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [Understanding Results](#understanding-results)
- [Performance Benchmarks](#performance-benchmarks)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Prerequisites

### Required

- **Node.js**: v20.0.0 or higher
- **pnpm**: v9.0.0 or higher
- **k6**: Installed as dev dependency

### Optional

- **InfluxDB**: For storing test metrics (time-series database)
- **Grafana**: For visualizing test results
- **Docker**: For running InfluxDB and Grafana locally

## Quick Start

### 1. Install Dependencies

```bash
# From project root
pnpm install
```

### 2. Start Your Application

```bash
# Terminal 1 - Start backend API
cd apps/api
pnpm dev

# Terminal 2 - Start web app (if testing full stack)
cd apps/web
pnpm dev
```

### 3. Run Your First Load Test

```bash
# From project root
pnpm load-test
```

This will run the tournament load test scenario against your local environment.

## Test Scenarios

### 1. Tournament Load Test (`tournament-load.js`)

**Purpose**: Tests tournament management features under various load conditions.

**What it tests**:

- List tournaments
- View tournament details
- Create tournaments
- Update tournaments
- Register players
- View tournament brackets

**Test profiles**:

| Profile     | Users | Duration | Req/sec  | Purpose              |
| ----------- | ----- | -------- | -------- | -------------------- |
| Normal Load | 100   | 5 min    | 10       | Baseline performance |
| Peak Load   | 500   | 10 min   | 50       | High traffic periods |
| Stress Test | 1000  | 20 min   | Variable | Find breaking points |

**Run**:

```bash
pnpm load-test
# or
k6 run load-tests/scenarios/tournament-load.js
```

### 2. API Load Test (`api-load.js`)

**Purpose**: Comprehensive testing of all API endpoints.

**What it tests**:

- Authentication flows (login, register, token refresh)
- CRUD operations (Create, Read, Update, Delete)
- List and filter operations
- Pagination
- Error handling
- Multi-tenant isolation

**Test profiles**:

| Profile | Users | Duration | Purpose                   |
| ------- | ----- | -------- | ------------------------- |
| Smoke   | 1     | 1 min    | Basic functionality check |
| Load    | 100   | 9 min    | Normal API usage          |
| Stress  | 500   | 24 min   | API limits                |

**Run**:

```bash
pnpm load-test:api
# or
k6 run load-tests/scenarios/api-load.js
```

### 3. WebSocket Load Test (`websocket-load.js`)

**Purpose**: Tests real-time features and WebSocket connections.

**What it tests**:

- Connection stability
- Message throughput
- Message latency
- Concurrent connections
- Real-time tournament updates
- Connection recovery

**Test profiles**:

| Profile | Connections | Duration | Purpose                 |
| ------- | ----------- | -------- | ----------------------- |
| Normal  | 100         | 7 min    | Regular WebSocket usage |
| Peak    | 500         | 9 min    | High concurrency        |
| Stress  | 1000        | 11 min   | Connection limits       |

**Run**:

```bash
pnpm load-test:ws
# or
k6 run load-tests/scenarios/websocket-load.js
```

## Running Tests

### Basic Usage

```bash
# Run specific test scenario
pnpm load-test              # Tournament load test
pnpm load-test:api          # API load test
pnpm load-test:ws           # WebSocket load test
```

### Advanced Usage

#### Custom Environment

```bash
# Test against staging
k6 run --env API_URL=https://api-staging.example.com \
       --env WS_URL=wss://api-staging.example.com \
       load-tests/scenarios/tournament-load.js

# Test against production (use with caution!)
k6 run --env API_URL=https://api.example.com \
       --env WS_URL=wss://api.example.com \
       load-tests/scenarios/tournament-load.js
```

#### Custom Test Duration

```bash
# Override test duration
k6 run --duration 10m --vus 50 load-tests/scenarios/api-load.js
```

#### Output to File

```bash
# Save results to JSON
k6 run --out json=test-results.json load-tests/scenarios/tournament-load.js

# Save results to CSV
k6 run --out csv=test-results.csv load-tests/scenarios/api-load.js
```

#### Run with InfluxDB + Grafana

```bash
# Start monitoring stack
docker-compose up -d influxdb grafana

# Run test with output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 load-tests/scenarios/tournament-load.js

# View results in Grafana at http://localhost:3000
```

#### Run Specific Scenario Only

```bash
# Run only the smoke test from api-load.js
k6 run --scenario smoke_test load-tests/scenarios/api-load.js

# Run only normal load from tournament-load.js
k6 run --scenario normal_load load-tests/scenarios/tournament-load.js
```

## Understanding Results

### Key Metrics

#### Response Time Metrics

- **http_req_duration**: Total request duration (time from start to finish)
  - **avg**: Average response time
  - **p(95)**: 95th percentile (95% of requests faster than this)
  - **p(99)**: 99th percentile (99% of requests faster than this)
  - **Target**: p(95) < 500ms for most operations

#### Request Metrics

- **http_reqs**: Total number of HTTP requests made
- **http_req_failed**: Percentage of failed requests
  - **Target**: < 1% failure rate

#### Custom Metrics

**Tournament Load Test**:

- `tournament_creation_time`: Time to create a tournament
- `tournament_list_time`: Time to list tournaments
- `tournament_details_time`: Time to fetch tournament details
- `player_registration_time`: Time to register a player
- `bracket_view_time`: Time to view tournament bracket

**API Load Test**:

- `auth_time`: Authentication duration
- `create_time`: Resource creation time
- `read_time`: Resource read time
- `update_time`: Resource update time
- `delete_time`: Resource deletion time
- `list_time`: List operation time
- `filter_time`: Filtered list operation time

**WebSocket Load Test**:

- `ws_connection_time`: WebSocket connection establishment time
- `ws_message_latency`: Message round-trip time
- `ws_connection_success`: Connection success rate
- `ws_messages_received`: Total messages received
- `ws_messages_sent`: Total messages sent

### Interpreting Results

#### Good Performance

```
✓ http_req_duration............: avg=245ms p(95)=450ms p(99)=750ms
✓ http_req_failed..............: 0.05%
✓ tournament_creation_time.....: avg=350ms p(95)=650ms
```

- Average response time under 250ms
- P95 under 500ms
- Error rate under 1%
- All thresholds passing (✓)

#### Warning Signs

```
✗ http_req_duration............: avg=850ms p(95)=1500ms p(99)=3000ms
✗ http_req_failed..............: 2.5%
✗ tournament_creation_time.....: avg=1200ms p(95)=2500ms
```

- Average response time over 500ms
- P95 over 1000ms
- Error rate over 1%
- Thresholds failing (✗)

**Actions to take**:

1. Check database query performance
2. Review application logs for errors
3. Check resource utilization (CPU, memory, database connections)
4. Consider adding caching
5. Optimize slow endpoints

#### System Under Stress

```
✗ http_req_duration............: avg=2500ms p(95)=5000ms p(99)=8000ms
✗ http_req_failed..............: 15%
✗ errors.......................: 10%
```

- Very high response times
- High error rates
- Many failed requests

**Actions to take**:

1. Reduce load immediately
2. Check for resource exhaustion (memory, CPU, connections)
3. Review error logs
4. Consider horizontal scaling
5. Implement rate limiting
6. Add circuit breakers

### Sample Output

```
scenarios: (100.00%) 1 scenario, 100 max VUs, 7m30s max duration
✓ Normal Load - Tournament Operations

     ✓ browse tournaments - status 200
     ✓ view tournament - status 200
     ✓ create tournament - status 201
     ✓ register player - status 201

     checks.........................: 98.50% ✓ 9850    ✗ 150
     data_received..................: 12 MB  40 kB/s
     data_sent......................: 8.5 MB 28 kB/s
     http_req_duration..............: avg=245ms min=45ms med=210ms max=1500ms p(95)=450ms p(99)=750ms
     http_reqs......................: 10000  33/s
     http_req_failed................: 0.05%  ✓ 5      ✗ 9995
     tournament_creations...........: 150    0.5/s
     tournament_creation_time.......: avg=350ms p(95)=650ms p(99)=950ms
     tournament_list_time...........: avg=150ms p(95)=280ms p(99)=400ms
     player_registrations...........: 75     0.25/s
     vus............................: 1      min=1    max=100
     vus_max........................: 100    min=100  max=100
```

## Performance Benchmarks

### Target Performance (Production Ready)

| Metric                  | Target      | Critical Threshold |
| ----------------------- | ----------- | ------------------ |
| **Response Time (P95)** | < 500ms     | < 1000ms           |
| **Response Time (P99)** | < 1000ms    | < 2000ms           |
| **Error Rate**          | < 1%        | < 5%               |
| **Throughput**          | > 100 req/s | > 50 req/s         |
| **WS Connection Time**  | < 500ms     | < 1000ms           |
| **WS Message Latency**  | < 100ms     | < 200ms            |

### Expected Load Profiles

| Profile    | Concurrent Users | Requests/sec | Use Case                             |
| ---------- | ---------------- | ------------ | ------------------------------------ |
| **Low**    | 1-50             | 1-10         | Off-peak hours                       |
| **Normal** | 50-200           | 10-50        | Regular business hours               |
| **Peak**   | 200-500          | 50-100       | Tournament registration, live events |
| **Stress** | 500-1000+        | 100+         | Finding system limits                |

### Database Considerations

| Operation         | Expected Time | Optimization                       |
| ----------------- | ------------- | ---------------------------------- |
| **Simple Read**   | < 50ms        | Add indexes, use caching           |
| **Complex Query** | < 200ms       | Optimize joins, add indexes        |
| **Write**         | < 100ms       | Batch operations, use transactions |
| **Transaction**   | < 150ms       | Keep transactions short            |

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Symptom**: `Connection refused` errors

**Solution**:

```bash
# Check if API is running
curl http://localhost:3001/api/health

# Check environment variables
k6 run --env API_URL=http://localhost:3001 load-tests/scenarios/api-load.js
```

#### 2. Authentication Failures

**Symptom**: 401 Unauthorized errors

**Solution**:

- Verify test user credentials in helpers.js
- Check authentication endpoint
- Ensure database has test users

```bash
# Create test user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"loadtest@example.com","password":"loadtest123"}'
```

#### 3. High Error Rates

**Symptom**: > 5% error rate during tests

**Solution**:

- Check application logs for errors
- Verify database connections
- Check resource limits (file descriptors, connections)
- Reduce load to find stable threshold

```bash
# Check application logs
docker-compose logs -f api

# Check database connections
docker exec -it postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 4. Timeout Errors

**Symptom**: Request timeout errors

**Solution**:

- Increase timeout in test scenario
- Check for slow database queries
- Verify network connectivity
- Consider increasing server resources

#### 5. WebSocket Connection Failures

**Symptom**: WebSocket connections fail or drop

**Solution**:

- Check WebSocket server is running
- Verify WebSocket URL (ws:// or wss://)
- Check for connection limits
- Review WebSocket logs

```bash
# Test WebSocket manually
wscat -c ws://localhost:3001

# Check WebSocket connections
netstat -an | grep :3001 | grep ESTABLISHED
```

### Debugging Tips

1. **Run with verbose logging**:

   ```bash
   k6 run --http-debug load-tests/scenarios/api-load.js
   ```

2. **Run smoke test first**:

   ```bash
   k6 run --scenario smoke_test load-tests/scenarios/api-load.js
   ```

3. **Start with low load**:

   ```bash
   k6 run --vus 1 --duration 1m load-tests/scenarios/api-load.js
   ```

4. **Check individual endpoints**:

   ```bash
   curl -i http://localhost:3001/api/tournaments
   ```

5. **Monitor system resources**:

   ```bash
   # CPU and memory
   docker stats

   # Database
   docker exec -it postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
   ```

## Best Practices

### Before Running Tests

1. **Test on non-production environments first**
2. **Ensure clean test data**
3. **Check system resources are adequate**
4. **Set realistic load targets**
5. **Prepare monitoring and logging**

### During Tests

1. **Monitor system resources**
2. **Watch for errors and warnings**
3. **Track response times**
4. **Check database performance**
5. **Be ready to stop if issues occur**

### After Tests

1. **Analyze results thoroughly**
2. **Document findings**
3. **Clean up test data**
4. **Address performance issues**
5. **Set up continuous load testing**

### Load Testing Checklist

- [ ] Application is running and healthy
- [ ] Database is properly indexed
- [ ] Test users exist in database
- [ ] Monitoring tools are active
- [ ] Baseline metrics are recorded
- [ ] Load targets are realistic
- [ ] Team is aware of testing
- [ ] Results will be documented

### Continuous Load Testing

Consider adding load tests to CI/CD:

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run load tests
        run: |
          pnpm install
          k6 run load-tests/scenarios/api-load.js
```

## Environment Variables

| Variable  | Default                 | Description   |
| --------- | ----------------------- | ------------- |
| `API_URL` | `http://localhost:3001` | API base URL  |
| `WS_URL`  | `ws://localhost:3001`   | WebSocket URL |

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
- [Grafana k6 Cloud](https://k6.io/cloud/)

## Support

For issues or questions:

1. Check this documentation
2. Review k6 documentation
3. Check application logs
4. Contact the development team

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
