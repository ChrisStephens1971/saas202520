# Analytics Beta Deployment Checklist

**Sprint 10 Week 1 Day 5**
**Target Deployment:** 2025-11-07
**Environment:** Beta (Pre-Production)

---

## Pre-Deployment Checklist

### 1. Code Review & Quality

- [ ] All TypeScript files compile without errors
- [ ] All tests pass (`npm run test:run`)
- [ ] Test coverage > 80% (`npm run test:coverage`)
- [ ] ESLint checks pass (`npm run lint`)
- [ ] No console.log or debugging code in production files
- [ ] All TODOs addressed or documented
- [ ] Code reviewed by at least one team member

### 2. Environment Configuration

- [ ] Environment variables configured (see `.env.example`)
- [ ] Redis connection tested
- [ ] Database connection tested
- [ ] SMTP credentials verified for report emails
- [ ] S3 bucket created and accessible (for exports)
- [ ] API keys rotated (if applicable)
- [ ] Secrets properly stored (AWS Secrets Manager / Vault)

### 3. Database Preparation

- [ ] Database migrations applied
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Database indexes created (see PERFORMANCE-OPTIMIZATION.md)
  ```sql
  -- Run all index creation scripts
  ```
- [ ] Database backup created before migration
- [ ] Connection pool configured in Prisma
- [ ] Query performance tested on production data volume

### 4. Redis Setup

- [ ] Redis instance provisioned (2 GB recommended)
- [ ] Redis password configured
- [ ] Redis persistence enabled (RDB + AOF)
- [ ] Redis connection from application server tested
- [ ] Eviction policy set to `allkeys-lru`
- [ ] Max memory configured (`maxmemory 2gb`)
- [ ] Redis monitoring enabled

### 5. Background Workers

- [ ] BullMQ workers configured
- [ ] Export queue worker running
  ```bash
  npm run workers
  ```
- [ ] Scheduled reports worker running
- [ ] Worker logs accessible
- [ ] Worker health checks configured
- [ ] Dead letter queue configured for failed jobs

### 6. Email Service

- [ ] SMTP configuration tested
- [ ] Email templates rendered correctly
- [ ] Test email sent successfully
- [ ] Unsubscribe link functional
- [ ] Email delivery rate monitored
- [ ] Bounce handling configured

### 7. File Storage (S3)

- [ ] S3 bucket created: `analytics-exports-beta`
- [ ] Bucket permissions configured (private)
- [ ] Lifecycle policy set (delete after 7 days)
- [ ] CORS configured for signed URLs
- [ ] IAM role for application access
- [ ] Test file upload/download successful
- [ ] Signed URL generation working

### 8. Rate Limiting

- [ ] Upstash Redis rate limiter configured
- [ ] Rate limits tested:
  - Revenue API: 100 requests/10 min per user
  - Export API: 10 exports/hour per user
  - Prediction API: 50 requests/hour per user
- [ ] Rate limit headers returned correctly
- [ ] Error messages for rate-limited requests

### 9. Security

- [ ] API endpoints require authentication
- [ ] Tenant isolation verified (no cross-tenant data leaks)
- [ ] SQL injection prevention tested
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] HTTPS enforced
- [ ] Sensitive data not logged
- [ ] API keys not exposed in client code

### 10. Monitoring & Logging

- [ ] Error tracking configured (Sentry)
- [ ] Application logs aggregated (CloudWatch / Datadog)
- [ ] Performance monitoring active (New Relic / Datadog)
- [ ] Custom metrics instrumented
- [ ] Log levels configured (INFO in production)
- [ ] Sensitive data redacted from logs

---

## Deployment Steps

### Phase 1: Infrastructure Setup

1. **Provision Redis Instance**

   ```bash
   # AWS ElastiCache
   aws elasticache create-cache-cluster \
     --cache-cluster-id analytics-beta-redis \
     --engine redis \
     --cache-node-type cache.t3.medium \
     --num-cache-nodes 1 \
     --engine-version 7.0
   ```

2. **Create S3 Bucket**

   ```bash
   aws s3 mb s3://analytics-exports-beta
   aws s3api put-bucket-lifecycle-configuration \
     --bucket analytics-exports-beta \
     --lifecycle-configuration file://lifecycle-policy.json
   ```

3. **Apply Database Migrations**
   ```bash
   npx prisma migrate deploy
   # Run index creation scripts
   psql $DATABASE_URL -f scripts/create-indexes.sql
   ```

### Phase 2: Application Deployment

4. **Build Application**

   ```bash
   npm run build
   npm run test:run
   ```

5. **Deploy to Beta Environment**

   ```bash
   # Deploy to your hosting platform (Vercel, AWS, etc.)
   vercel deploy --prod --env-file .env.beta
   # OR
   aws deploy create-deployment \
     --application-name analytics-app \
     --deployment-group-name beta
   ```

6. **Start Background Workers**
   ```bash
   # On worker server
   npm run workers
   # OR via PM2
   pm2 start ecosystem.config.js --env beta
   ```

### Phase 3: Verification

7. **Smoke Tests**

   ```bash
   # Test critical endpoints
   curl https://beta.yourdomain.com/api/analytics/revenue?month=2024-11 \
     -H "Authorization: Bearer $BETA_TOKEN"

   curl https://beta.yourdomain.com/api/analytics/cohorts?startDate=2024-01-01 \
     -H "Authorization: Bearer $BETA_TOKEN"

   curl -X POST https://beta.yourdomain.com/api/analytics/export \
     -H "Authorization: Bearer $BETA_TOKEN" \
     -d '{"type":"revenue","format":"csv","month":"2024-11"}'
   ```

8. **Database Connection Test**

   ```sql
   SELECT COUNT(*) FROM revenue_metrics;
   SELECT COUNT(*) FROM subscriptions WHERE status = 'active';
   ```

9. **Redis Connection Test**

   ```bash
   redis-cli -h <redis-host> -p 6379 -a $REDIS_PASSWORD
   > PING
   > INFO memory
   > DBSIZE
   ```

10. **Cache Warming**
    ```bash
    # Run cache warming script
    node scripts/warm-analytics-cache.js --tenants=top100
    ```

### Phase 4: Monitoring Setup

11. **Configure Alerts**
    - API response time > 500ms (P95)
    - Error rate > 1%
    - Cache hit rate < 60%
    - Redis memory > 85%
    - Worker queue backlog > 100 jobs

12. **Create Monitoring Dashboard**
    - Revenue API metrics
    - Cohort analysis performance
    - Export job success rate
    - Cache statistics
    - Database query performance

---

## Post-Deployment Verification

### Functional Tests

- [ ] Revenue dashboard loads < 2 seconds
- [ ] MRR calculation displays correctly
- [ ] Cohort retention chart renders
- [ ] Predictions generate within 500ms
- [ ] CSV export completes successfully
- [ ] Excel export downloads correctly
- [ ] PDF report generates properly
- [ ] Scheduled reports send emails
- [ ] Real-time metrics update
- [ ] Filters and date ranges work
- [ ] Pagination functions correctly
- [ ] Tenant isolation verified

### Performance Tests

- [ ] Revenue API: < 200ms response time (P95)
- [ ] Cohort API: < 300ms response time (P95)
- [ ] Prediction API: < 500ms response time (P95)
- [ ] Cache hit rate > 80%
- [ ] Database query time < 100ms average
- [ ] Export queue processing < 30 seconds per job

### Load Tests

```bash
# Run Artillery load test
artillery run tests/load/analytics-load-test.yml

# Expected results:
# - 250+ requests/sec
# - P95 latency < 300ms
# - Error rate < 0.5%
```

### Security Tests

- [ ] Authentication required for all endpoints
- [ ] Unauthorized access blocked (403)
- [ ] Cross-tenant data access prevented
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Rate limits enforced
- [ ] HTTPS enforced (no HTTP)

---

## Beta User Access

### Grant Access

1. **Create Beta User Accounts**

   ```sql
   INSERT INTO users (email, role, beta_access)
   VALUES ('beta1@example.com', 'admin', true);
   ```

2. **Send Beta Invitations**

   ```bash
   node scripts/send-beta-invitations.js \
     --users=beta-users.csv
   ```

3. **Provide Documentation**
   - Beta testing guide
   - Known issues list
   - Feedback form link
   - Support contact information

### Beta User List (10-20 users recommended)

- [ ] User 1: Internal QA team member
- [ ] User 2: Product manager
- [ ] User 3: Customer success rep (power user)
- [ ] User 4: External beta tester (customer)
- [ ] User 5: External beta tester (customer)
- [ ] (Add more as needed)

---

## Rollback Plan

### Rollback Triggers

Rollback if:

- Error rate > 5% for 5 minutes
- Critical functionality broken
- Data integrity issue detected
- Security vulnerability discovered
- Performance degradation > 50%

### Rollback Procedure

1. **Revert Application Code**

   ```bash
   git revert HEAD
   vercel rollback
   # OR
   aws deploy stop-deployment --deployment-id <id>
   ```

2. **Restore Database**

   ```bash
   # Restore from backup taken pre-deployment
   pg_restore -d analytics_db backup-pre-deployment.sql
   ```

3. **Clear Redis Cache**

   ```bash
   redis-cli -h <redis-host> FLUSHDB
   ```

4. **Stop Workers**

   ```bash
   pm2 stop all
   ```

5. **Notify Stakeholders**
   - Send rollback notification
   - Document issue in incident log
   - Schedule post-mortem

---

## Monitoring & Alerts Configuration

### CloudWatch Alarms (AWS Example)

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
  --evaluation-periods 2

# High response time alarm
aws cloudwatch put-metric-alarm \
  --alarm-name analytics-slow-response \
  --metric-name ResponseTime \
  --statistic p95 \
  --period 300 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold
```

### Datadog Monitors (Alternative)

```yaml
# monitors/analytics-performance.yml
monitors:
  - name: 'Analytics API Response Time'
    type: metric alert
    query: 'avg(last_5m):avg:analytics.api.response_time{env:beta} > 500'
    message: 'Analytics API response time is too high!'
    tags:
      - team:analytics
      - severity:high

  - name: 'Cache Hit Rate Low'
    type: metric alert
    query: 'avg(last_10m):avg:analytics.cache.hit_rate{env:beta} < 0.6'
    message: 'Cache hit rate below 60%!'
```

---

## Documentation Updates

- [ ] API documentation updated (OpenAPI/Swagger)
- [ ] User guide published
- [ ] Admin documentation created
- [ ] Troubleshooting guide written
- [ ] Beta testing FAQ created
- [ ] Release notes published
- [ ] Changelog updated

---

## Communication Plan

### Pre-Deployment

- [ ] Announce deployment window to team
- [ ] Notify beta users of upcoming release
- [ ] Prepare support team with known issues

### During Deployment

- [ ] Status page updated
- [ ] Team notified of deployment start
- [ ] Monitoring dashboard active

### Post-Deployment

- [ ] Deployment success announcement
- [ ] Beta users notified of go-live
- [ ] Support team briefed on new features
- [ ] Stakeholder summary sent

---

## Beta Testing Schedule

**Week 1 (Nov 7-13):**

- Internal testing by team
- Fix critical bugs
- Monitor performance metrics

**Week 2 (Nov 14-20):**

- Open to external beta users
- Collect feedback
- Implement minor improvements

**Week 3 (Nov 21-27):**

- Address feedback
- Performance optimization
- Final testing

**Week 4 (Nov 28-Dec 4):**

- Prepare for production release
- Documentation finalization
- Production deployment planning

---

## Success Criteria

Beta deployment is successful if:

- [ ] Zero critical bugs in first 48 hours
- [ ] Error rate < 0.5%
- [ ] API response time targets met
- [ ] Cache hit rate > 80%
- [ ] No data integrity issues
- [ ] Positive beta user feedback (>80% satisfaction)
- [ ] All monitoring operational
- [ ] Zero security incidents

---

## Next Steps After Beta

1. **Analyze Beta Results**
   - Review metrics and logs
   - Compile user feedback
   - Identify improvement areas

2. **Implement Feedback**
   - Fix reported bugs
   - Enhance UX based on feedback
   - Optimize performance bottlenecks

3. **Production Preparation**
   - Scale infrastructure for full load
   - Finalize documentation
   - Train support team
   - Plan gradual rollout (10% → 50% → 100%)

4. **Production Deployment**
   - Follow deployment checklist
   - Monitor closely for first week
   - Celebrate launch!

---

## Emergency Contacts

**On-Call Rotation:**

- Primary: [Name] - [Phone] - [Email]
- Secondary: [Name] - [Phone] - [Email]
- Escalation: [Manager] - [Phone] - [Email]

**External Contacts:**

- AWS Support: [Case ID]
- Redis Support: [Contact]
- Database Admin: [Contact]

---

## Sign-Off

**Deployment Approved By:**

- [ ] Engineering Lead: ********\_******** Date: **\_\_\_**
- [ ] Product Manager: ********\_******** Date: **\_\_\_**
- [ ] QA Lead: ********\_******** Date: **\_\_\_**
- [ ] DevOps Lead: ********\_******** Date: **\_\_\_**

**Deployment Completed By:**

- [ ] Deployment Engineer: ********\_******** Date: **\_\_\_** Time: **\_\_\_**

**Post-Deployment Verified By:**

- [ ] QA Engineer: ********\_******** Date: **\_\_\_** Time: **\_\_\_**
