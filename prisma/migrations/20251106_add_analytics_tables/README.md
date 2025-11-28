# Migration: Add Analytics Tables

**Date:** 2025-11-06
**Sprint:** Sprint 10 Week 1 Day 1
**Feature:** Advanced Analytics & Business Intelligence
**Migration Name:** `20251106_add_analytics_tables`

---

## Overview

This migration adds 5 new database tables to support the Advanced Analytics feature:

1. **analytics_events** - Raw event tracking
2. **revenue_aggregates** - Pre-computed revenue metrics
3. **user_cohorts** - User retention analysis
4. **tournament_aggregates** - Tournament performance metrics
5. **scheduled_reports** - Automated report configuration

---

## Tables Created

### 1. analytics_events

**Purpose:** Raw event stream for all analytics-relevant activities

**Columns:**

- `id` (TEXT, PK) - Unique event identifier
- `tenant_id` (TEXT, FK) - Organization identifier (multi-tenant)
- `event_type` (VARCHAR(100)) - Event type (payment_completed, user_signup, tournament_completed)
- `event_data` (JSONB) - Flexible event-specific data
- `user_id` (TEXT, FK, nullable) - User who triggered the event
- `session_id` (VARCHAR(255), nullable) - Session identifier
- `timestamp` (TIMESTAMP) - When the event occurred
- `created_at` (TIMESTAMP) - When the record was created

**Indexes:**

- `(tenant_id, event_type)` - Fast filtering by tenant and event type
- `(tenant_id, timestamp DESC)` - Fast tenant-scoped time-series queries
- `(user_id, timestamp DESC)` - Fast user activity lookups

**Foreign Keys:**

- `tenant_id` → `organizations(id)` ON DELETE CASCADE
- `user_id` → `users(id)` ON DELETE SET NULL

**Data Retention:** 13 months (rolling deletion)

---

### 2. revenue_aggregates

**Purpose:** Pre-computed revenue metrics for fast dashboard queries

**Columns:**

- `id` (TEXT, PK) - Unique aggregate identifier
- `tenant_id` (TEXT, FK) - Organization identifier
- `period_start` (DATE) - Start of aggregation period
- `period_end` (DATE) - End of aggregation period
- `period_type` (VARCHAR(20)) - Period type: day, week, month, quarter, year
- `mrr` (DECIMAL(10,2)) - Monthly Recurring Revenue
- `arr` (DECIMAL(10,2)) - Annual Recurring Revenue (MRR \* 12)
- `new_revenue` (DECIMAL(10,2)) - Revenue from new customers
- `churned_revenue` (DECIMAL(10,2)) - Revenue lost from churned customers
- `expansion_revenue` (DECIMAL(10,2)) - Revenue growth from existing customers
- `total_revenue` (DECIMAL(10,2)) - Total revenue for period
- `payment_count` (INTEGER) - Total payment attempts
- `payment_success_count` (INTEGER) - Successful payments
- `refund_count` (INTEGER) - Number of refunds
- `refund_amount` (DECIMAL(10,2)) - Total refund amount
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**

- `UNIQUE (tenant_id, period_type, period_start)` - Prevent duplicate aggregates
- `(tenant_id, period_start DESC)` - Fast time-series queries

**Foreign Keys:**

- `tenant_id` → `organizations(id)` ON DELETE CASCADE

**Update Strategy:** Hourly cron job aggregates new events (upsert for idempotency)

---

### 3. user_cohorts

**Purpose:** User retention analysis by signup cohort

**Columns:**

- `id` (TEXT, PK) - Unique cohort record identifier
- `tenant_id` (TEXT, FK) - Organization identifier
- `cohort_month` (DATE) - First day of signup month (YYYY-MM-01)
- `cohort_size` (INTEGER) - Total users who signed up in this month
- `month_number` (INTEGER) - Months since signup (0 = signup month, 1 = month 1, etc.)
- `retained_users` (INTEGER) - Users still active in this month
- `retention_rate` (DECIMAL(5,2)) - Retention percentage (retained_users / cohort_size \* 100)
- `revenue` (DECIMAL(10,2)) - Total revenue from cohort in this month
- `ltv` (DECIMAL(10,2)) - Cumulative lifetime value per user
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**

- `UNIQUE (tenant_id, cohort_month, month_number)` - Prevent duplicate cohort records
- `(tenant_id, cohort_month DESC)` - Fast cohort lookups

**Foreign Keys:**

- `tenant_id` → `organizations(id)` ON DELETE CASCADE

**Update Strategy:** Daily cron job recalculates retention for recent cohorts (last 3 months)

---

### 4. tournament_aggregates

**Purpose:** Tournament performance metrics aggregated by time period

**Columns:**

- `id` (TEXT, PK) - Unique aggregate identifier
- `tenant_id` (TEXT, FK) - Organization identifier
- `period_start` (DATE) - Start of aggregation period
- `period_end` (DATE) - End of aggregation period
- `period_type` (VARCHAR(20)) - Period type: day, week, month, quarter, year
- `tournament_count` (INTEGER) - Total tournaments in period
- `completed_count` (INTEGER) - Completed tournaments
- `completion_rate` (DECIMAL(5,2)) - Completion percentage
- `total_players` (INTEGER) - Total player registrations
- `avg_players` (DECIMAL(10,2)) - Average players per tournament
- `avg_duration_minutes` (DECIMAL(10,2)) - Average tournament duration
- `most_popular_format` (VARCHAR(100)) - Most popular tournament format
- `revenue` (DECIMAL(10,2)) - Total revenue from tournaments
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**

- `UNIQUE (tenant_id, period_type, period_start)` - Prevent duplicate aggregates
- `(tenant_id, period_start DESC)` - Fast time-series queries

**Foreign Keys:**

- `tenant_id` → `organizations(id)` ON DELETE CASCADE

**Update Strategy:** Hourly cron job aggregates completed tournaments

---

### 5. scheduled_reports

**Purpose:** Configuration for automated report generation and delivery

**Columns:**

- `id` (TEXT, PK) - Unique report configuration identifier
- `tenant_id` (TEXT, FK) - Organization identifier
- `name` (VARCHAR(255)) - Human-readable report name
- `report_type` (VARCHAR(50)) - Report type: revenue_summary, user_analytics, tournament_performance, comprehensive
- `frequency` (VARCHAR(20)) - Delivery frequency: daily, weekly, monthly
- `recipients` (TEXT[]) - Array of email addresses
- `parameters` (JSONB, nullable) - Report configuration (filters, date ranges)
- `last_run_at` (TIMESTAMP, nullable) - Last successful delivery
- `next_run_at` (TIMESTAMP) - Next scheduled delivery
- `is_active` (BOOLEAN) - Report enabled/disabled
- `created_at` (TIMESTAMP) - When report was created
- `updated_at` (TIMESTAMP) - Last update timestamp

**Indexes:**

- `(tenant_id)` - Fast tenant-scoped queries
- `(next_run_at)` - Fast scheduling queries for active reports

**Foreign Keys:**

- `tenant_id` → `organizations(id)` ON DELETE CASCADE

**Scheduling Logic:** Cron job runs every 15 minutes, queries for `is_active = true AND next_run_at <= NOW()`

---

## Multi-Tenant Considerations

All tables include `tenant_id` column with foreign key to `organizations(id)`:

- **ON DELETE CASCADE** - When an organization is deleted, all analytics data is deleted
- **Indexes** - All queries are scoped by `tenant_id` for performance and isolation
- **Row-Level Security (RLS)** - Should be enabled in production to prevent cross-tenant data access

---

## Performance Optimizations

1. **Composite Indexes:**
   - `(tenant_id, event_type)` - Fast event filtering
   - `(tenant_id, period_start DESC)` - Fast time-series queries
   - `(tenant_id, cohort_month DESC)` - Fast cohort lookups

2. **Unique Constraints:**
   - Prevent duplicate aggregates for same period
   - Enable efficient upsert operations (INSERT ... ON CONFLICT UPDATE)

3. **Descending Indexes:**
   - Optimize queries for most recent data (common pattern in analytics)

4. **JSONB Columns:**
   - `event_data` and `parameters` use JSONB for flexible schema
   - Can add GIN indexes if specific JSON queries become common

---

## Data Flow

```
Application Events
       ↓
analytics_events (raw stream)
       ↓
Hourly Aggregation Job
       ↓
revenue_aggregates, user_cohorts, tournament_aggregates
       ↓
Dashboard API (with Redis caching)
       ↓
Frontend Visualizations
```

---

## Migration Commands

### Apply Migration (when database is running):

```bash
npx prisma migrate deploy
```

### Generate Prisma Client:

```bash
npx prisma generate
```

### Rollback (if needed):

```sql
-- Drop foreign keys first
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_tenant_id_fkey";
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_user_id_fkey";
ALTER TABLE "revenue_aggregates" DROP CONSTRAINT "revenue_aggregates_tenant_id_fkey";
ALTER TABLE "user_cohorts" DROP CONSTRAINT "user_cohorts_tenant_id_fkey";
ALTER TABLE "tournament_aggregates" DROP CONSTRAINT "tournament_aggregates_tenant_id_fkey";
ALTER TABLE "scheduled_reports" DROP CONSTRAINT "scheduled_reports_tenant_id_fkey";

-- Drop tables
DROP TABLE IF EXISTS "analytics_events" CASCADE;
DROP TABLE IF EXISTS "revenue_aggregates" CASCADE;
DROP TABLE IF EXISTS "user_cohorts" CASCADE;
DROP TABLE IF EXISTS "tournament_aggregates" CASCADE;
DROP TABLE IF EXISTS "scheduled_reports" CASCADE;
```

---

## Testing Checklist

- [ ] Migration runs successfully on local database
- [ ] All foreign key constraints are valid
- [ ] All indexes are created
- [ ] Prisma Client generates correct TypeScript types
- [ ] No data leakage between tenants (test with RLS policies)
- [ ] Aggregation queries perform within <100ms target
- [ ] Upsert operations work correctly (no duplicate key violations)

---

## Related Documentation

- **Technical Spec:** `technical/specs/advanced-analytics-technical-spec.md`
- **PRD:** `product/PRDs/advanced-analytics-business-intelligence.md`
- **Sprint Plan:** `sprints/current/sprint-10-business-growth-advanced-features.md`

---

## Author

Claude (AI Technical Assistant)
Date: 2025-11-06
Sprint: Sprint 10 Week 1 Day 1
