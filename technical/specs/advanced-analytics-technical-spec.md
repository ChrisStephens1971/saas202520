# Technical Specification: Advanced Analytics & Business Intelligence

**Author:** Claude (AI Technical Assistant)
**Date:** 2025-11-06
**Status:** Draft
**Related PRD:** `product/PRDs/advanced-analytics-business-intelligence.md`
**Sprint:** Sprint 10 - Business Growth & Advanced Features

---

## Overview

### Problem

Tournament platform stakeholders need performant, comprehensive analytics to make data-driven decisions, but lack:
- Fast access to revenue metrics (MRR, ARR, churn) without manual calculation
- Visual representation of user cohort retention and LTV
- Tournament performance insights and forecasting capabilities
- Efficient export mechanisms for external analysis and reporting
- Automated reporting to reduce manual overhead

Current state: Manual data extraction from PostgreSQL, Excel-based analysis taking 2-4 hours, no predictive capabilities, no automated reporting.

**Technical challenges:**
- Dashboard must load <500ms with 20+ visualizations
- Support 100+ concurrent users without performance degradation
- Handle 10K+ analytics events per hour
- Generate exports (CSV/Excel/PDF) within 5-10 seconds
- Maintain strict multi-tenant data isolation
- Real-time data updates (within 5 minutes)

### Solution Summary

Build a high-performance analytics platform using:
- **Frontend:** React + Recharts (12 charts) + D3.js (8 advanced visualizations)
- **Backend:** Next.js tRPC API + PostgreSQL aggregation tables + Redis caching
- **Data Pipeline:** Event tracking → Hourly aggregation jobs → 5-minute cache TTL
- **Export Engine:** Background jobs for CSV/Excel/PDF generation
- **Predictive Models:** Simple linear regression for revenue/user forecasting (>80% accuracy target)

**Architecture strategy:**
- Pre-compute metrics in aggregation tables (updated hourly via cron jobs)
- Cache computed results in Redis (5-min TTL for real-time, 1-hour for historical)
- Progressive dashboard loading (KPIs first, then charts)
- Background job processing for exports and scheduled reports

### Goals

- **Performance:** Dashboard loads <500ms (p95), API responses <100ms (p95)
- **Accuracy:** >99% data accuracy, >80% prediction accuracy for revenue forecasts
- **Adoption:** 80% of venue owners use analytics monthly within 4 weeks
- **Scale:** Support 100+ concurrent users, 10K+ events/hour
- **Reliability:** >99.5% uptime, zero data leakage incidents
- **Efficiency:** Automated reporting reduces manual overhead by 50%

### Non-Goals

- Real-time streaming analytics (<5 second latency) - Current 5-minute cache is sufficient
- Custom dashboard builder (drag-and-drop widgets) - Defer to v2/P2
- Natural language query interface - Defer to future AI enhancements
- Third-party BI tool integrations (Tableau, Power BI) - API access is P2
- Advanced ML models (Random Forest, Neural Networks) - Start with simple regression
- White-label customization for exports - Minimal branding only (P1)

---

## Background & Context

### Current State

**Existing Infrastructure:**
- PostgreSQL database with transactional data (payments, users, tournaments, registrations)
- Redis cache for session management and application state
- Next.js 14+ application with tRPC API layer
- Multi-tenant architecture with `tenant_id` on all tables

**Current Analytics Approach:**
- Ad-hoc SQL queries run manually by admins
- Excel-based analysis taking 2-4 hours per report
- No automated reporting or scheduled delivery
- No visualization layer or interactive dashboards
- No predictive capabilities or forecasting

**Pain Points:**
- Time-consuming manual data extraction
- No self-service analytics for venue owners
- Delayed insights (reports generated weekly at best)
- Error-prone manual calculations
- No ability to identify trends or predict future performance

### Constraints

**Technical Constraints:**
- Must maintain existing PostgreSQL schema (no breaking changes)
- Redis instance shared with application cache (budget for memory limits)
- Next.js API routes must remain stateless (no in-memory aggregation)
- Must support existing multi-tenant RLS policies
- Frontend bundle size: analytics code should be code-split (<500KB chunk)

**Business Constraints:**
- 5-day development timeline (Sprint 10 Week 1)
- Must work with existing tech stack (no new databases or services)
- Export file storage in existing S3 bucket (no new cloud services)
- Must not impact existing application performance

**Timeline Constraints:**
- Day 1: Database schema + API structure
- Day 2: Core analytics calculations + frontend shell
- Day 3: Visualizations (20 charts)
- Day 4: Export functionality + scheduled reports
- Day 5: Testing, optimization, beta deployment

### Assumptions

- Existing database contains sufficient historical data (3+ months) for meaningful analytics
- Users have modern browsers supporting React 18+ and ES2020 features
- Redis has sufficient memory for analytics caching (~100MB per 1000 active users)
- PostgreSQL can handle additional read load from analytics queries (estimate: +20% queries)
- Event tracking will be implemented incrementally (start with revenue, users, tournaments)
- Venue owners are comfortable with 5-minute data delay (not real-time requirement)
- Export files <50MB are acceptable (larger files split into multiple exports)
- Simple linear regression provides sufficient forecast accuracy (80%+ target)
- Beta testing with 5-10 venues provides adequate feedback before full launch

---

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  React       │  │  Recharts    │  │  D3.js              │  │
│  │  Dashboard   │  │  (12 charts) │  │  (8 advanced charts) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │     Next.js API (tRPC Routes)      │
          │  ┌──────────────────────────────┐  │
          │  │  - /revenue                  │  │
          │  │  - /users (cohorts)          │  │
          │  │  - /tournaments              │  │
          │  │  - /forecast (predictions)   │  │
          │  │  - /export (CSV/Excel/PDF)   │  │
          │  │  - /reports (scheduled)      │  │
          │  └──────────────────────────────┘  │
          └──────────┬────────────────┬─────────┘
                     │                │
          ┌──────────▼───────┐  ┌────▼──────────────────┐
          │  Redis Cache     │  │  Background Jobs      │
          │  (5-min TTL)     │  │  (BullMQ)             │
          │                  │  │  - Aggregation        │
          │  Cache Keys:     │  │  - Export Generation  │
          │  - revenue:*     │  │  - Report Delivery    │
          │  - cohorts:*     │  │                       │
          │  - tournaments:* │  └────┬──────────────────┘
          └──────────┬───────┘       │
                     │                │
          ┌──────────▼────────────────▼──────────────────┐
          │           PostgreSQL Database                │
          │  ┌────────────────────────────────────────┐  │
          │  │  Aggregation Tables (Pre-computed):    │  │
          │  │  - revenue_aggregates                  │  │
          │  │  - user_cohorts                        │  │
          │  │  - tournament_aggregates               │  │
          │  │  - analytics_events (raw stream)       │  │
          │  │  - scheduled_reports                   │  │
          │  └────────────────────────────────────────┘  │
          │  ┌────────────────────────────────────────┐  │
          │  │  Existing Tables (Source Data):        │  │
          │  │  - transactions                        │  │
          │  │  - users                               │  │
          │  │  - tournaments                         │  │
          │  │  - registrations                       │  │
          │  └────────────────────────────────────────┘  │
          └───────────────────────────────────────────────┘
```

**Data Flow:**

1. **Event Ingestion:**
   - Application events (payment, signup, tournament complete) → `analytics_events` table
   - Hourly cron job aggregates events → `revenue_aggregates`, `user_cohorts`, `tournament_aggregates`

2. **Dashboard Request:**
   - User requests analytics → tRPC API checks Redis cache
   - Cache hit: Return cached data (5-min TTL)
   - Cache miss: Query aggregation tables → Cache result → Return to client
   - Client renders visualizations using Recharts/D3.js

3. **Export Request:**
   - User requests export → Background job queued (BullMQ)
   - Job fetches data from aggregation tables
   - Generates CSV/Excel/PDF file → Upload to S3
   - Notification sent to user with download link

4. **Scheduled Reports:**
   - Cron job checks `scheduled_reports` table for due reports
   - Background job generates report → Email delivery via Nodemailer
   - Update `last_run_at` and `next_run_at` timestamps

### Components

#### Component 1: AnalyticsDashboard (Frontend)

**Purpose:** Main dashboard container with routing, date range selection, and layout management
**Technology:** React 18 + TypeScript, React Router, React Query
**Location:** `apps/web/components/analytics/AnalyticsDashboard.tsx`

**Key Features:**
- Tab navigation (Overview, Revenue, Users, Tournaments, Reports)
- Global date range picker (Last 7/30/90 days, MTD, QTD, YTD, Custom)
- Export button (CSV/Excel/PDF)
- Loading states and error boundaries
- Responsive layout (desktop/tablet/mobile)

**Interfaces:**
- Consumes: tRPC analytics router
- Emits: Date range changes (context provider)
- Props: `tenantId: string`, `initialTab?: string`

#### Component 2: RevenueAnalytics (Frontend)

**Purpose:** Revenue metrics dashboard with MRR, ARR, churn, and projections
**Technology:** React + Recharts (line, bar, pie charts)
**Location:** `apps/web/components/analytics/RevenueAnalytics.tsx`

**Key Features:**
- KPI cards (MRR, ARR, Churn Rate, Avg Revenue/Tournament)
- Revenue trend line chart (12 months) with projections
- Revenue breakdown by type (bar chart) and payment method (pie chart)
- Payment success rate gauge
- Transaction detail table (sortable, filterable, paginated)

**Interfaces:**
- Consumes: `analytics.getRevenue` tRPC endpoint
- Props: `dateRange: { start: Date, end: Date }`, `tenantId: string`

#### Component 3: UserAnalytics (Frontend)

**Purpose:** User cohort retention, LTV, and churn analysis
**Technology:** React + Recharts (area, line) + D3.js (heatmap)
**Location:** `apps/web/components/analytics/UserAnalytics.tsx`

**Key Features:**
- Cohort retention table with heatmap coloring (D3.js)
- User growth area chart (DAU, WAU, MAU)
- LTV trend line by cohort
- Churn prediction table (at-risk users)
- Retention funnel visualization

**Interfaces:**
- Consumes: `analytics.getCohorts`, `analytics.getUserGrowth` tRPC endpoints
- Props: `dateRange: { start: Date, end: Date }`, `tenantId: string`

#### Component 4: TournamentAnalytics (Frontend)

**Purpose:** Tournament performance metrics and venue comparison
**Technology:** React + Recharts (bar, line) + D3.js (heatmap for time patterns)
**Location:** `apps/web/components/analytics/TournamentAnalytics.tsx`

**Key Features:**
- Tournament completion rate trend
- Average attendance bar chart by format
- Tournament duration analysis
- Venue performance comparison table
- Tournament activity heatmap (day/time patterns) using D3.js

**Interfaces:**
- Consumes: `analytics.getTournaments` tRPC endpoint
- Props: `dateRange: { start: Date, end: Date }`, `tenantId: string`, `venueId?: string`

#### Component 5: PredictiveModels (Frontend)

**Purpose:** Forecasting and prediction visualizations
**Technology:** React + Recharts (line charts with confidence intervals)
**Location:** `apps/web/components/analytics/PredictiveModels.tsx`

**Key Features:**
- Revenue forecast line chart (3, 6, 12 months)
- User growth forecast with confidence bands
- Tournament attendance prediction
- Forecast accuracy metrics display (MAPE, RMSE)

**Interfaces:**
- Consumes: `analytics.forecast` tRPC endpoint
- Props: `metric: 'revenue' | 'users' | 'tournaments'`, `months: number`, `tenantId: string`

#### Component 6: ExportControls (Frontend)

**Purpose:** Export configuration modal and progress tracking
**Technology:** React + Headless UI (modal)
**Location:** `apps/web/components/analytics/ExportControls.tsx`

**Key Features:**
- Format selection (CSV, Excel, PDF)
- Date range override
- Progress indicator for background exports
- Download link notification
- Export history list

**Interfaces:**
- Consumes: `analytics.export` tRPC mutation
- Props: `reportType: string`, `defaultDateRange: { start: Date, end: Date }`, `tenantId: string`

#### Component 7: ScheduledReports (Frontend)

**Purpose:** Manage scheduled report configurations
**Technology:** React + React Hook Form
**Location:** `apps/web/components/analytics/ScheduledReports.tsx`

**Key Features:**
- Report configuration form (type, frequency, recipients, format)
- Scheduled reports list with status indicators
- Preview report functionality
- Edit/Pause/Delete actions
- Delivery history log

**Interfaces:**
- Consumes: `analytics.scheduleReport`, `analytics.getScheduledReports` tRPC endpoints
- Props: `tenantId: string`

#### Component 8: AnalyticsService (Backend)

**Purpose:** Core analytics calculations and aggregation orchestration
**Technology:** TypeScript, Node.js
**Location:** `apps/web/lib/analytics/AnalyticsService.ts`

**Key Features:**
- Aggregate data from source tables
- Calculate derived metrics (MRR, ARR, LTV)
- Cache management (Redis get/set/invalidate)
- Query optimization and batching
- Multi-tenant query scoping

**Interfaces:**
- Used by: tRPC analytics router
- Depends on: Prisma client, Redis client
- Methods: `getRevenue()`, `getCohorts()`, `getTournaments()`, `forecast()`

#### Component 9: RevenueCalculator (Backend)

**Purpose:** Revenue-specific calculations (MRR, ARR, churn)
**Technology:** TypeScript
**Location:** `apps/web/lib/analytics/calculators/RevenueCalculator.ts`

**Key Features:**
- MRR calculation (sum of recurring revenue for the month)
- ARR calculation (MRR * 12)
- Churn rate calculation (churned revenue / total revenue)
- Revenue projections using linear regression
- Payment success rate analysis

**Interfaces:**
- Used by: AnalyticsService
- Methods: `calculateMRR()`, `calculateARR()`, `calculateChurnRate()`, `projectRevenue()`

#### Component 10: CohortAnalyzer (Backend)

**Purpose:** User cohort retention and LTV analysis
**Technology:** TypeScript
**Location:** `apps/web/lib/analytics/calculators/CohortAnalyzer.ts`

**Key Features:**
- Build cohort retention tables
- Calculate LTV by cohort
- Churn prediction (simple model based on activity decay)
- Cohort comparison (retention rates across cohorts)

**Interfaces:**
- Used by: AnalyticsService
- Methods: `buildCohortTable()`, `calculateLTV()`, `predictChurn()`

#### Component 11: PredictiveEngine (Backend)

**Purpose:** Forecasting models for revenue, users, tournaments
**Technology:** TypeScript, simple-statistics library (linear regression)
**Location:** `apps/web/lib/analytics/PredictiveEngine.ts`

**Key Features:**
- Linear regression for trend forecasting
- Confidence interval calculation (95%)
- Forecast accuracy metrics (MAPE, RMSE)
- Seasonality adjustment (simple moving average)

**Interfaces:**
- Used by: AnalyticsService
- Methods: `forecastRevenue()`, `forecastUsers()`, `forecastTournaments()`, `calculateAccuracy()`

#### Component 12: ExportService (Backend)

**Purpose:** Generate CSV, Excel, and PDF exports
**Technology:** Node.js, ExcelJS, jsPDF
**Location:** `apps/web/lib/analytics/ExportService.ts`

**Key Features:**
- CSV generation (streaming for large datasets)
- Excel generation with formatting and embedded charts (ExcelJS)
- PDF generation with professional layout (jsPDF + jspdf-autotable)
- S3 upload with tenant-specific paths
- Signed URL generation for secure downloads

**Interfaces:**
- Used by: tRPC export endpoint, background jobs
- Methods: `generateCSV()`, `generateExcel()`, `generatePDF()`, `uploadToS3()`

#### Component 13: CacheManager (Backend)

**Purpose:** Redis caching layer for analytics data
**Technology:** TypeScript, ioredis
**Location:** `apps/web/lib/analytics/CacheManager.ts`

**Key Features:**
- Cache key generation (namespaced by tenant + query params)
- TTL management (5 min for real-time, 1 hour for historical)
- Cache invalidation on data updates
- Cache hit rate monitoring
- Memory limit enforcement (eviction policies)

**Interfaces:**
- Used by: AnalyticsService
- Methods: `get()`, `set()`, `invalidate()`, `getHitRate()`

#### Component 14: AggregationJob (Backend)

**Purpose:** Background job to update aggregation tables
**Technology:** Node.js, node-cron, BullMQ
**Location:** `apps/web/lib/analytics/jobs/AggregationJob.ts`

**Key Features:**
- Hourly aggregation from `analytics_events` table
- Update `revenue_aggregates`, `user_cohorts`, `tournament_aggregates`
- Incremental updates (process only new events since last run)
- Error handling and retry logic
- Job status monitoring and alerting

**Interfaces:**
- Triggered by: Cron schedule (every hour)
- Updates: Aggregation tables
- Logging: Job execution time, rows processed, errors

#### Component 15: ScheduledReportJob (Backend)

**Purpose:** Generate and deliver scheduled reports
**Technology:** Node.js, BullMQ, Nodemailer
**Location:** `apps/web/lib/analytics/jobs/ScheduledReportJob.ts`

**Key Features:**
- Check `scheduled_reports` table for due reports
- Generate report using ExportService
- Email delivery with attachment
- Delivery confirmation tracking
- Retry logic for failed deliveries (3 attempts)

**Interfaces:**
- Triggered by: Cron schedule (every 15 minutes check)
- Uses: ExportService, Nodemailer
- Updates: `scheduled_reports.last_run_at`, `scheduled_reports.next_run_at`

---

## Data Model

### New/Modified Tables

#### Table: `analytics_events`

**Purpose:** Raw event stream for all analytics-relevant activities

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'payment_completed', 'user_signup', 'tournament_completed', etc.
  event_data JSONB NOT NULL, -- Flexible event-specific data
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_events_tenant_type ON analytics_events(tenant_id, event_type);
CREATE INDEX idx_analytics_events_tenant_timestamp ON analytics_events(tenant_id, timestamp DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, timestamp DESC);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);

-- Partitioning (optional, for scale)
-- Partition by month for efficient historical queries and deletion
```

**Relationships:**
- Foreign key to `organizations(id)` (tenant)
- Foreign key to `users(id)` (nullable - some events not user-specific)

**Data Retention:**
- Raw events retained for 13 months (rolling deletion)
- Partition by month for efficient deletion

**Example event_data formats:**
```json
// payment_completed
{
  "amount": 49.99,
  "currency": "USD",
  "payment_method": "stripe",
  "tournament_id": "uuid",
  "transaction_id": "uuid"
}

// user_signup
{
  "email": "user@example.com",
  "signup_source": "organic",
  "plan": "free"
}

// tournament_completed
{
  "tournament_id": "uuid",
  "venue_id": "uuid",
  "format": "single_elimination",
  "player_count": 32,
  "duration_minutes": 180
}
```

#### Table: `revenue_aggregates`

**Purpose:** Pre-computed revenue metrics for fast dashboard queries

```sql
CREATE TABLE revenue_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'quarter', 'year')),

  -- Revenue metrics
  mrr DECIMAL(10,2), -- Monthly Recurring Revenue (for monthly periods)
  arr DECIMAL(10,2), -- Annual Recurring Revenue (MRR * 12)
  new_revenue DECIMAL(10,2), -- Revenue from new customers
  churned_revenue DECIMAL(10,2), -- Revenue lost from churned customers
  expansion_revenue DECIMAL(10,2), -- Revenue growth from existing customers
  total_revenue DECIMAL(10,2) NOT NULL,

  -- Transaction metrics
  payment_count INTEGER DEFAULT 0,
  payment_success_count INTEGER DEFAULT 0,
  payment_failure_count INTEGER DEFAULT 0,
  payment_success_rate DECIMAL(5,2), -- Calculated: (success / total) * 100

  -- Refund metrics
  refund_count INTEGER DEFAULT 0,
  refund_amount DECIMAL(10,2) DEFAULT 0,

  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_tenant_period UNIQUE (tenant_id, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_revenue_agg_tenant_period ON revenue_aggregates(tenant_id, period_type, period_start DESC);
CREATE INDEX idx_revenue_agg_tenant_date ON revenue_aggregates(tenant_id, period_start DESC);
```

**Relationships:**
- Foreign key to `organizations(id)` (tenant)

**Update Strategy:**
- Hourly cron job aggregates new `analytics_events` data
- Upsert (INSERT ... ON CONFLICT UPDATE) for idempotency
- Historical periods locked after month-end close

#### Table: `user_cohorts`

**Purpose:** User retention analysis by signup cohort

```sql
CREATE TABLE user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cohort_month DATE NOT NULL, -- First day of signup month (YYYY-MM-01)
  cohort_size INTEGER NOT NULL, -- Total users who signed up in this month
  month_number INTEGER NOT NULL CHECK (month_number BETWEEN 0 AND 23), -- 0 = signup month, 1 = month 1, ..., 23 = 2 years

  -- Retention metrics
  retained_users INTEGER NOT NULL, -- Users still active in this month
  retention_rate DECIMAL(5,2) NOT NULL, -- (retained_users / cohort_size) * 100

  -- Revenue metrics
  revenue DECIMAL(10,2), -- Total revenue from this cohort in this month
  ltv DECIMAL(10,2), -- Cumulative lifetime value per user in this cohort

  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_cohort_month UNIQUE (tenant_id, cohort_month, month_number)
);

-- Indexes
CREATE INDEX idx_cohorts_tenant_month ON user_cohorts(tenant_id, cohort_month DESC, month_number);
CREATE INDEX idx_cohorts_tenant_cohort ON user_cohorts(tenant_id, cohort_month DESC);
```

**Relationships:**
- Foreign key to `organizations(id)` (tenant)

**Update Strategy:**
- Daily cron job recalculates retention for recent cohorts (last 3 months)
- Historical cohorts updated monthly
- Active user defined as: login or tournament participation in the month

**Retention Calculation Logic:**
```typescript
// Pseudocode
for each cohort_month:
  cohort_users = users WHERE signup_month = cohort_month
  cohort_size = cohort_users.length

  for month_number from 0 to 23:
    target_month = cohort_month + month_number months
    retained_users = cohort_users WHERE last_active >= target_month AND last_active < (target_month + 1 month)
    retention_rate = (retained_users.length / cohort_size) * 100

    revenue = SUM(payments WHERE user IN cohort_users AND payment_date IN target_month)
    ltv = SUM(payments WHERE user IN cohort_users AND payment_date <= (target_month + 1 month)) / cohort_size
```

#### Table: `tournament_aggregates`

**Purpose:** Tournament performance metrics by time period

```sql
CREATE TABLE tournament_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'quarter', 'year')),

  -- Tournament metrics
  tournament_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2), -- (completed_count / tournament_count) * 100

  -- Player metrics
  total_players INTEGER DEFAULT 0,
  avg_players DECIMAL(10,2), -- Average players per tournament

  -- Duration metrics
  avg_duration_minutes DECIMAL(10,2),

  -- Popular formats
  most_popular_format VARCHAR(100), -- Format with most tournaments

  -- Revenue
  revenue DECIMAL(10,2),

  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_tournament_period UNIQUE (tenant_id, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_tournament_agg_tenant_period ON tournament_aggregates(tenant_id, period_type, period_start DESC);
CREATE INDEX idx_tournament_agg_tenant_date ON tournament_aggregates(tenant_id, period_start DESC);
```

**Relationships:**
- Foreign key to `organizations(id)` (tenant)

**Update Strategy:**
- Hourly cron job aggregates completed tournaments
- Calculate most_popular_format using window function (RANK)

#### Table: `scheduled_reports`

**Purpose:** Configuration for automated report delivery

```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('revenue_summary', 'user_analytics', 'tournament_performance', 'comprehensive')),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),

  -- Recipients
  recipients TEXT[] NOT NULL, -- Array of email addresses

  -- Report parameters
  parameters JSONB, -- Filters, date range override, etc.
  -- Example: {"dateRange": "last_30_days", "includeProjections": true}

  -- Format
  format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'excel', 'pdf')),

  -- Schedule
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_reports_tenant_active ON scheduled_reports(tenant_id, is_active);
```

**Relationships:**
- Foreign key to `organizations(id)` (tenant)
- Foreign key to `users(id)` (creator)

**Scheduling Logic:**
- Cron job runs every 15 minutes
- Query: `WHERE is_active = true AND next_run_at <= NOW()`
- After successful delivery, calculate next_run_at based on frequency:
  - Daily: next_run_at + 1 day
  - Weekly: next_run_at + 7 days
  - Monthly: next_run_at + 1 month (same day of month)

---

## API Design

### tRPC Analytics Router

**Location:** `apps/web/server/api/routers/analytics.ts`

#### Endpoint 1: `analytics.getRevenue`

**Purpose:** Retrieve revenue metrics (MRR, ARR, trends, projections)

**Input:**
```typescript
{
  startDate: Date,
  endDate: Date,
  period: 'day' | 'week' | 'month',
  includeProjections?: boolean
}
```

**Response (200 OK):**
```typescript
{
  current: {
    mrr: number,
    arr: number,
    churnRate: number,
    avgRevenuePerTournament: number
  },
  comparison: {
    mrrChange: number, // % change from previous period
    arrChange: number
  },
  trend: Array<{
    date: Date,
    revenue: number,
    mrr: number,
    paymentCount: number,
    successRate: number
  }>,
  breakdown: {
    byType: Record<string, number>, // e.g., { "single_elimination": 1234.56 }
    byPaymentMethod: Record<string, number>
  },
  projections?: Array<{
    month: Date,
    projected: number,
    confidenceInterval: { low: number, high: number }
  }>
}
```

**Caching:**
- Cache key: `analytics:revenue:${tenantId}:${startDate}:${endDate}:${period}`
- TTL: 5 minutes (real-time), 1 hour (historical)

**Error Responses:**
- `400 Bad Request`: Invalid date range (start > end)
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to this tenant

#### Endpoint 2: `analytics.getCohorts`

**Purpose:** Retrieve user cohort retention data

**Input:**
```typescript
{
  startMonth: Date, // YYYY-MM-01
  endMonth: Date,   // YYYY-MM-01
  includeChurnPrediction?: boolean
}
```

**Response (200 OK):**
```typescript
{
  cohorts: Array<{
    cohortMonth: Date,
    cohortSize: number,
    retentionByMonth: Record<number, {
      retained: number,
      rate: number, // Percentage
      revenue: number
    }>,
    ltv: number // Average LTV per user
  }>,
  summary: {
    avgRetentionMonth1: number,
    avgRetentionMonth3: number,
    avgRetentionMonth6: number,
    avgLTV: number
  },
  churnPrediction?: Array<{
    userId: string,
    churnProbability: number,
    lastActivity: Date,
    recommendedAction: string
  }>
}
```

**Caching:**
- Cache key: `analytics:cohorts:${tenantId}:${startMonth}:${endMonth}`
- TTL: 1 hour (cohort data changes slowly)

**Error Responses:**
- `400 Bad Request`: Invalid month range
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to this tenant

#### Endpoint 3: `analytics.getTournaments`

**Purpose:** Retrieve tournament performance metrics

**Input:**
```typescript
{
  startDate: Date,
  endDate: Date,
  period: 'day' | 'week' | 'month',
  venueId?: string // Optional filter for specific venue
}
```

**Response (200 OK):**
```typescript
{
  summary: {
    totalTournaments: number,
    completedTournaments: number,
    completionRate: number,
    totalPlayers: number,
    avgPlayers: number,
    avgDuration: number // minutes
  },
  trend: Array<{
    date: Date,
    tournamentCount: number,
    completionRate: number,
    avgPlayers: number
  }>,
  byFormat: Record<string, {
    count: number,
    avgPlayers: number,
    completionRate: number,
    revenue: number
  }>,
  topTournaments: Array<{
    id: string,
    name: string,
    date: Date,
    players: number,
    revenue: number,
    completionTime: number // minutes
  }>
}
```

**Caching:**
- Cache key: `analytics:tournaments:${tenantId}:${startDate}:${endDate}:${period}:${venueId || 'all'}`
- TTL: 5 minutes

**Error Responses:**
- `400 Bad Request`: Invalid date range
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to this tenant/venue

#### Endpoint 4: `analytics.forecast`

**Purpose:** Generate predictive forecasts

**Input:**
```typescript
{
  metric: 'revenue' | 'users' | 'tournaments',
  months: number, // How many months to forecast (1-12)
  historical?: number // How many months of historical data to use (default: 12)
}
```

**Response (200 OK):**
```typescript
{
  forecast: Array<{
    month: Date,
    predicted: number,
    confidenceInterval: {
      low: number,
      high: number
    }
  }>,
  accuracy: {
    mape: number, // Mean Absolute Percentage Error
    rmse: number  // Root Mean Square Error
  },
  methodology: string // "Linear Regression" or other model name
}
```

**Caching:**
- Cache key: `analytics:forecast:${tenantId}:${metric}:${months}`
- TTL: 1 day (forecasts don't change frequently)

**Error Responses:**
- `400 Bad Request`: Invalid parameters (months < 1 or > 12)
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to this tenant
- `409 Conflict`: Insufficient historical data (need 3+ months minimum)

#### Endpoint 5: `analytics.export`

**Purpose:** Generate and download analytics export

**Input:**
```typescript
{
  reportType: 'revenue' | 'users' | 'tournaments' | 'comprehensive',
  format: 'csv' | 'excel' | 'pdf',
  startDate: Date,
  endDate: Date,
  filters?: Record<string, any> // Optional filters (venue, format, etc.)
}
```

**Response (200 OK):**
```typescript
{
  jobId: string, // Background job ID for tracking
  status: 'queued' | 'processing' | 'completed',
  estimatedTime: number, // seconds
  downloadUrl?: string // Present when status = 'completed' (signed S3 URL)
}
```

**Background Processing:**
- Export queued immediately (BullMQ)
- Client polls `/analytics/export/status/${jobId}` for updates
- When completed, downloadUrl provided (expires in 24 hours)

**Error Responses:**
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to this tenant
- `429 Too Many Requests`: Rate limit exceeded (5 exports per hour per user)

#### Endpoint 6: `analytics.scheduleReport`

**Purpose:** Create a scheduled report

**Input:**
```typescript
{
  name: string,
  reportType: 'revenue_summary' | 'user_analytics' | 'tournament_performance' | 'comprehensive',
  frequency: 'daily' | 'weekly' | 'monthly',
  recipients: string[], // Email addresses
  format: 'csv' | 'excel' | 'pdf',
  parameters?: {
    dateRange?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'mtd' | 'qtd',
    includeProjections?: boolean
  }
}
```

**Response (200 OK):**
```typescript
{
  id: string,
  name: string,
  status: 'active',
  nextRunAt: Date,
  message: 'Report scheduled successfully'
}
```

**Error Responses:**
- `400 Bad Request`: Invalid recipients or parameters
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have permission to schedule reports
- `409 Conflict`: Report with same name already exists

#### Endpoint 7: `analytics.getScheduledReports`

**Purpose:** List all scheduled reports for a tenant

**Input:**
```typescript
{
  // No input - uses tenant from auth context
}
```

**Response (200 OK):**
```typescript
{
  reports: Array<{
    id: string,
    name: string,
    reportType: string,
    frequency: string,
    recipients: string[],
    format: string,
    isActive: boolean,
    lastRunAt: Date | null,
    nextRunAt: Date,
    createdBy: { id: string, name: string }
  }>
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to this tenant

---

## Implementation Plan

### Phase 1: Foundation (Day 1)

**Goal:** Database schema, aggregation tables, API structure

**Tasks:**
- [x] Create database migration for 4 new tables (analytics_events, revenue_aggregates, user_cohorts, tournament_aggregates, scheduled_reports)
- [x] Add indexes and constraints
- [x] Implement Row-Level Security (RLS) policies for tenant isolation
- [x] Create tRPC analytics router with endpoint stubs
- [x] Set up Redis cache connection and key namespace
- [x] Initialize BullMQ job queue
- [x] Create aggregation job skeleton (scheduled but not yet implemented)
- [x] Write initial event tracking utility (track revenue events only)

**Estimated Effort:** 1 day

**Validation:**
- Migration runs successfully on local and staging databases
- RLS policies prevent cross-tenant data access (automated test)
- tRPC router endpoints return 501 Not Implemented (structure in place)

### Phase 2: Revenue & User Analytics (Day 2)

**Goal:** Implement core analytics calculations and APIs

**Tasks:**
- [x] Implement RevenueCalculator service (MRR, ARR, churn)
- [x] Implement CohortAnalyzer service (retention tables, LTV)
- [x] Implement AnalyticsService (orchestrates calculators, caching)
- [x] Complete revenue API endpoints (getRevenue)
- [x] Complete user analytics API endpoints (getCohorts)
- [x] Implement Redis caching layer (CacheManager)
- [x] Write aggregation job logic (hourly updates to aggregation tables)
- [x] Seed test data for 12 months of historical analytics events
- [x] Unit tests for calculators (>80% coverage)

**Estimated Effort:** 1 day

**Validation:**
- Revenue calculations match manual Excel calculations (spot check)
- Cohort retention table displays correct percentages
- Redis cache hit rate >50% after 10 minutes of usage
- Aggregation job completes in <2 minutes for 10K events

### Phase 3: Tournament Analytics & Visualizations (Day 3)

**Goal:** Tournament metrics and all 20 dashboard visualizations

**Tasks:**
- [x] Implement tournament analytics calculations
- [x] Complete tournament API endpoints (getTournaments)
- [x] Create frontend dashboard shell (AnalyticsDashboard component)
- [x] Implement date range picker and global state
- [x] Build RevenueAnalytics component with Recharts:
  - Line chart (revenue trend)
  - Bar chart (revenue by type)
  - Pie chart (payment methods)
  - Gauge chart (payment success rate)
- [x] Build UserAnalytics component with D3.js heatmap:
  - Cohort retention heatmap (D3.js)
  - Area chart (user growth)
  - Line chart (LTV by cohort)
- [x] Build TournamentAnalytics component:
  - Bar chart (attendance by format)
  - Line chart (completion rate trend)
  - Heatmap (tournament activity by day/time) using D3.js
- [x] Implement KPI cards (MRR, ARR, DAU, MAU)
- [x] Add loading states, error boundaries, skeleton screens
- [x] Responsive design (mobile, tablet, desktop)

**Estimated Effort:** 1 day

**Validation:**
- All 20 visualizations render without errors
- Dashboard loads in <500ms (measure with Chrome DevTools)
- Charts are responsive and interactive (hover tooltips, legend toggle)
- Mobile layout is usable (test on iPhone/Android simulators)

### Phase 4: Export & Predictive Models (Day 4)

**Goal:** Export functionality and forecasting

**Tasks:**
- [x] Implement ExportService (CSV, Excel, PDF generation)
- [x] Integrate ExcelJS for formatted Excel exports with embedded charts
- [x] Integrate jsPDF for PDF reports
- [x] Set up S3 upload with tenant-specific paths
- [x] Implement export API endpoint with background job processing
- [x] Build ExportControls component (modal, progress tracking)
- [x] Implement PredictiveEngine (linear regression forecasting)
- [x] Complete forecast API endpoint
- [x] Build PredictiveModels component (forecast visualizations)
- [x] Implement scheduled reports backend job
- [x] Build ScheduledReports component (configuration form, list view)
- [x] Set up Nodemailer for email delivery
- [x] Write integration tests for export pipeline

**Estimated Effort:** 1 day

**Validation:**
- CSV export completes in <5 seconds for 10K rows
- Excel export includes formatting and charts (verify manually)
- PDF export renders professional layout (verify manually)
- Forecast accuracy MAPE <20% on historical test data
- Scheduled report delivers successfully via email

### Phase 5: Testing, Optimization & Beta Deployment (Day 5)

**Goal:** Comprehensive testing, performance tuning, deploy to beta

**Tasks:**
- [x] Unit tests for all calculators (>80% coverage target)
- [x] Integration tests for full analytics pipeline (event → aggregation → API → cache)
- [x] Performance testing with 100K events and 100 concurrent users (Artillery or k6)
- [x] Multi-tenant isolation tests (verify no data leakage)
- [x] Cache invalidation tests
- [x] Query optimization (analyze slow queries, add missing indexes)
- [x] Redis cache tuning (adjust TTLs based on hit rates)
- [x] Frontend bundle size optimization (code splitting, lazy loading)
- [x] Security audit (check RLS policies, API authorization, export access)
- [x] Deploy to staging environment
- [x] Smoke tests on staging
- [x] Create beta user list (5-10 venues)
- [x] Deploy to production with beta feature flag
- [x] Enable for beta users
- [x] Set up monitoring dashboards (Grafana/Prometheus or similar)

**Estimated Effort:** 1 day

**Validation:**
- Test suite passes with >80% coverage
- Dashboard loads <500ms (p95) under 100 concurrent users
- No data leakage in multi-tenant tests
- API response times <100ms (p95)
- Beta deployment successful, no critical errors

---

## Testing Strategy

### Unit Tests

**Coverage Target:** >80% for all calculators and services

**Key Test Cases:**

**RevenueCalculator:**
- `calculateMRR()` returns correct monthly recurring revenue
- `calculateARR()` returns MRR * 12
- `calculateChurnRate()` handles zero revenue edge case
- `projectRevenue()` generates forecasts within confidence interval

**CohortAnalyzer:**
- `buildCohortTable()` correctly calculates retention percentages
- `calculateLTV()` sums all revenue from cohort users
- `predictChurn()` identifies users with declining activity

**PredictiveEngine:**
- `forecastRevenue()` uses linear regression correctly
- `calculateAccuracy()` computes MAPE and RMSE
- Handles insufficient data gracefully (< 3 months)

**CacheManager:**
- `get()` returns cached value if present
- `set()` stores value with correct TTL
- `invalidate()` removes cached value
- Cache keys are tenant-scoped (no leakage)

**Tools:** Jest, ts-jest

### Integration Tests

**Test Scenarios:**

**Full Analytics Pipeline:**
1. Insert analytics_events into database
2. Run aggregation job
3. Query API endpoint
4. Verify data in response matches expected calculations
5. Verify result is cached (second request faster)
6. Invalidate cache
7. Verify third request re-queries database

**Multi-Tenant Isolation:**
1. Create events for Tenant A and Tenant B
2. Query as Tenant A user
3. Verify only Tenant A data returned
4. Query as Tenant B user
5. Verify only Tenant B data returned
6. Query as platform admin
7. Verify aggregate data (anonymized) returned

**Export Pipeline:**
1. Request CSV export
2. Verify job queued in BullMQ
3. Wait for job completion (or mock)
4. Verify file uploaded to S3 in correct tenant path
5. Verify signed URL is valid and downloadable

**Scheduled Reports:**
1. Create scheduled report with "daily" frequency
2. Manually trigger scheduled report job
3. Verify report generated and emailed
4. Verify `last_run_at` and `next_run_at` updated correctly

**Tools:** Jest, Supertest (API testing), Prisma Test Environment

### Performance Tests

**Load Testing Scenarios:**

**Dashboard Concurrent Load:**
- Simulate 100 concurrent users loading dashboard
- Measure: Average response time, p95, p99
- Target: p95 <500ms, p99 <1000ms
- Tool: Artillery or k6

**High Event Volume:**
- Insert 10K analytics events per hour (simulated)
- Run aggregation job
- Measure: Job completion time
- Target: <2 minutes

**Cache Performance:**
- 1000 requests over 5 minutes (same queries)
- Measure: Cache hit rate
- Target: >80%

**Export Stress Test:**
- Generate 10 concurrent export requests (10K rows each)
- Measure: Time to completion
- Target: All complete within 1 minute

**Tools:** Artillery, k6, Apache JMeter

### Security Considerations

**Authentication:**
- All API endpoints require valid JWT token
- Token includes tenantId claim
- Expired tokens rejected with 401

**Authorization:**
- User must belong to tenant to access tenant data
- Platform admins have special role for cross-tenant access
- Venue owners cannot access other venues' data (unless multi-venue org)

**Data Validation:**
- Input validation using Zod schemas (date ranges, email formats)
- SQL injection prevented by Prisma parameterized queries
- JSONB event_data sanitized (no code execution)

**Rate Limiting:**
- Export endpoints: 5 requests per hour per user (using Redis counter)
- API endpoints: 100 requests per minute per user (general limit)
- Scheduled reports: Maximum 50 active reports per tenant

**Tenant Isolation:**
- Row-Level Security (RLS) policies enforce tenantId filtering
- Automated tests verify cross-tenant queries return empty results
- Cache keys include tenantId to prevent leakage

**Export Security:**
- Export files stored in tenant-specific S3 paths: `s3://bucket/{tenantId}/analytics-exports/`
- Signed URLs expire after 24 hours
- Files deleted from S3 after 30 days (automated cleanup job)

**Audit Logging:**
- All export requests logged (who, what, when)
- Scheduled report deliveries logged
- Failed authentication attempts logged

---

## Deployment & Operations

### Deployment Strategy

**Phase 1: Staging Deployment**
- [x] Deploy database migrations to staging
- [x] Deploy backend code (analytics services, API routes, background jobs)
- [x] Deploy frontend code (dashboard components)
- [x] Run smoke tests (health check endpoints, sample queries)
- [x] Manual QA testing (all features)

**Phase 2: Beta Deployment (10% rollout)**
- [x] Deploy to production with feature flag disabled
- [x] Enable feature flag for beta users (5-10 venues)
- [x] Monitor error rates, performance metrics
- [x] Collect user feedback via in-app survey
- [x] Bug fixes and iteration (1-2 days)

**Phase 3: Gradual Rollout**
- [ ] Enable for 25% of users (highest activity venues first)
- [ ] Monitor for 24 hours (no critical issues)
- [ ] Enable for 50% of users
- [ ] Monitor for 24 hours
- [ ] Enable for 100% of users (full launch)

**Phase 4: Post-Launch Monitoring (Weeks 2-4)**
- [ ] Track adoption metrics (dashboard usage, export requests)
- [ ] Monitor performance (dashboard load time, API response time)
- [ ] Collect user feedback (NPS survey)
- [ ] Plan P1/P2 feature enhancements based on feedback

### Monitoring & Alerts

**Metrics to Track:**

**Performance Metrics:**
- Dashboard load time (p50, p95, p99)
- API response time by endpoint (p50, p95, p99)
- Redis cache hit rate
- Aggregation job duration
- Export generation time

**Business Metrics:**
- Dashboard active users (daily, weekly, monthly)
- Export requests per day
- Scheduled reports sent per day
- User engagement (time spent on analytics pages)

**System Health Metrics:**
- API error rate (5xx errors)
- Background job failure rate
- Database query duration (slow query log)
- Redis memory usage
- S3 storage usage (export files)

**Monitoring Tools:**
- Next.js built-in analytics (Vercel Analytics or similar)
- Custom metrics endpoint (`/api/metrics`) exposing Prometheus format
- Grafana dashboards for visualization
- Sentry for error tracking

**Alerts:**

| Condition | Threshold | Action | Priority |
|-----------|-----------|--------|----------|
| Dashboard load time p95 >1s | Sustained for 5 min | Alert engineering team | High |
| API error rate >5% | Any 5-minute window | Page on-call engineer | Critical |
| Background job failures >10% | Over 1 hour | Alert engineering team | High |
| Redis cache hit rate <50% | Sustained for 15 min | Alert engineering team | Medium |
| Export queue depth >50 | Any time | Alert engineering team | Medium |
| Scheduled report delivery failures >20% | Over 1 day | Alert engineering team | High |

### Rollback Plan

**Scenario 1: Critical Bug Found**
1. Disable feature flag immediately (all users)
2. Investigate and fix bug
3. Deploy fix to staging and test
4. Re-enable feature flag gradually

**Scenario 2: Performance Degradation**
1. Disable feature flag for 75% of users (keep 25% active)
2. Analyze slow queries and bottlenecks
3. Optimize and deploy fix
4. Gradually re-enable for all users

**Scenario 3: Data Corruption or Leakage**
1. Disable feature flag immediately (all users)
2. Audit affected data and users
3. Restore from backup if necessary
4. Fix bug and add regression tests
5. Communicate with affected users
6. Re-enable only after thorough security audit

**Database Rollback:**
- Database migrations are reversible (DOWN migrations included)
- Aggregation tables can be dropped without affecting source data
- Analytics events have 13-month retention (safe to delete if needed)

**Code Rollback:**
- Git revert to previous working commit
- Redeploy previous version
- Feature flag ensures frontend doesn't call non-existent endpoints

---

## Dependencies

### External Dependencies

**Frontend Libraries:**
- **recharts** (v2.10.0+): Primary charting library
  - Why: React-friendly, declarative API, covers 60% of chart types
  - Risk: Limited customization for complex charts (mitigated by D3.js)
- **d3** (v7.8.0+): Advanced visualizations (heatmaps, tree maps)
  - Why: Maximum flexibility, industry standard
  - Risk: Steeper learning curve (mitigated by limiting usage)
- **exceljs** (v4.4.0+): Excel file generation
  - Why: Comprehensive formatting, chart embedding, active maintenance
  - Risk: Large bundle size (mitigated by code splitting)
- **jspdf** (v2.5.0+) + **jspdf-autotable** (v3.8.0+): PDF generation
  - Why: Client-side PDF generation, good table support
  - Risk: Limited layout control (acceptable for reports)
- **date-fns** (v2.30.0+): Date manipulation
  - Why: Lightweight, tree-shakeable, good TypeScript support
  - Risk: None (well-established library)
- **@tanstack/react-query** (v4.36.0+): Server state management
  - Why: Automatic caching, refetching, devtools
  - Risk: None (already used in project)
- **@tanstack/react-table** (v8.10.0+): Data tables
  - Why: Headless UI, flexible, TypeScript support
  - Risk: Requires custom styling (acceptable)

**Backend Libraries:**
- **simple-statistics** (v7.8.0+): Statistical calculations (linear regression)
  - Why: Lightweight, pure JavaScript, no dependencies
  - Risk: Limited ML capabilities (acceptable for MVP)
- **node-cron** (v3.0.0+): Cron job scheduling
  - Why: Simple, reliable, good documentation
  - Risk: None (well-established)
- **bullmq** (v5.0.0+): Job queue for background processing
  - Why: Robust, Redis-based, priority queues, retries
  - Risk: Requires Redis (already have)
- **ioredis** (v5.3.0+): Redis client
  - Why: Better TypeScript support than node-redis, cluster support
  - Risk: None (already used in project)
- **nodemailer** (v6.9.0+): Email delivery
  - Why: Industry standard, supports SMTP, AWS SES, etc.
  - Risk: Email deliverability depends on provider (use Mailgun or Postmark)

**Database Extensions:**
- **TimescaleDB** (optional, recommended for production):
  - Why: Optimizes time-series queries, automatic partitioning
  - Risk: Adds complexity, requires PostgreSQL extension installation
  - Decision: Optional for MVP, recommended for scale (>1M events)

### Internal Dependencies

**Must Be Completed First:**
- Multi-tenant authentication and authorization (existing)
- PostgreSQL database with existing tables (transactions, users, tournaments)
- Redis cache infrastructure (existing)
- S3 bucket for file storage (existing)
- Email service configuration (Nodemailer setup with SMTP credentials)

**Shared Services:**
- tRPC router configuration (existing)
- Prisma schema and client (existing)
- Authentication middleware (existing)
- Error logging service (Sentry or similar, existing)

**Blocking Issues:**
- If Redis memory limit reached, analytics caching will fail
  - Mitigation: Monitor memory usage, implement LRU eviction policy
- If S3 bucket quota exceeded, export files cannot be stored
  - Mitigation: Implement 30-day file deletion cron job

---

## Performance & Scale

### Expected Load

**Current State (Launch):**
- 50-100 active venues
- 5,000 total users
- 10-20 dashboard users concurrently (peak times)
- 10K analytics events per day (~400 per hour)
- 50 export requests per day
- 20 scheduled reports per day

**12-Month Projection:**
- 500 active venues
- 50,000 total users
- 100-200 dashboard users concurrently
- 100K analytics events per day (~4,000 per hour)
- 500 export requests per day
- 200 scheduled reports per day

**Storage Estimates:**
- analytics_events: ~1KB per event → 100K events/day = 100MB/day = 3.6GB/year (with 13-month retention: ~4GB)
- Aggregation tables: ~100 rows per tenant per table → 500 tenants = 50K rows total = ~10MB (negligible)
- Export files: ~5MB per file → 500 files/day = 2.5GB/day → 30-day retention = 75GB (S3 cost: ~$1.80/month)

### Performance Targets

**Dashboard Performance:**
- Initial load: <500ms (p95), <1000ms (p99)
- Tab switching: <200ms
- Date range change: <500ms
- Filter application: <300ms

**API Performance:**
- Simple aggregates (MRR, ARR): <100ms (p95)
- Complex cohort queries: <1000ms (p95)
- Tournament analytics: <500ms (p95)
- Forecast generation: <2000ms (p95)

**Background Job Performance:**
- Aggregation job (hourly): <5 minutes for 10K events
- Export generation:
  - CSV (10K rows): <5 seconds
  - Excel (10K rows): <10 seconds
  - PDF (10 pages): <15 seconds
- Scheduled report delivery: <30 seconds (generation + email)

**Cache Performance:**
- Cache hit rate: >80% (target)
- Cache lookup time: <10ms (p95)
- Redis memory usage: <500MB for 1000 active users

### Scalability Considerations

**Database Scalability:**
- **Aggregation tables:** Pre-computed metrics reduce query complexity from O(n) to O(1)
- **Indexing:** Compound indexes on (tenant_id, period_type, period_start) enable fast lookups
- **Partitioning:** analytics_events table partitioned by month (optional, for >1M events/day)
- **Read replicas:** Analytics queries use read replica to offload primary database (production)

**Cache Scalability:**
- **TTL strategy:** Short TTL (5 min) for recent data, long TTL (1 hour) for historical (reduce cache churn)
- **Eviction policy:** LRU (Least Recently Used) ensures most-accessed data stays cached
- **Cache warming:** Pre-populate cache for common queries (e.g., "Last 30 Days" revenue)
- **Sharding:** If Redis memory exceeds limits, shard by tenant_id (large tenants get dedicated Redis instance)

**API Scalability:**
- **Horizontal scaling:** Stateless Next.js API routes scale horizontally (add more instances)
- **Rate limiting:** Prevent individual users from overwhelming API (100 req/min per user)
- **Query pagination:** Limit result size to 1000 rows per request (use offset/limit)
- **Background processing:** Offload expensive operations (exports, forecasts) to job queue

**Frontend Scalability:**
- **Code splitting:** Lazy load analytics dashboard (reduces initial bundle)
- **Virtual scrolling:** For long tables (e.g., cohort retention with 24+ months)
- **Debouncing:** Debounce filter changes (300ms) to reduce API calls
- **Progressive loading:** Load KPIs first, then charts (perceived performance)

**Storage Scalability:**
- **S3 lifecycle policies:** Auto-delete export files after 30 days
- **Event retention:** Auto-delete analytics_events older than 13 months (cron job)
- **Compression:** Gzip compress export files before S3 upload (reduce storage costs)

**Cost Projections (12-month):**
- PostgreSQL: ~$200/month (existing, shared)
- Redis: ~$100/month (existing, shared)
- S3 storage: ~$5/month (export files)
- Compute (Next.js): ~$300/month (existing, shared)
- **Total incremental cost:** ~$100/month (mostly S3 and incremental compute)

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Slow query performance on large datasets** | High - Poor UX, user frustration, dashboard timeouts | Medium | Pre-compute metrics in aggregation tables (hourly cron job), add composite indexes on (tenant_id, date, type), use Redis caching with 5-min TTL, implement query pagination (max 1000 rows), load test with 1M+ events before launch |
| **Data privacy concerns or cross-tenant leakage** | Critical - Legal/compliance issues, loss of trust, GDPR violations | Low | Implement PostgreSQL Row-Level Security (RLS) policies on all analytics tables, automated integration tests verify tenant isolation (run on every deploy), third-party security audit before full launch, code review checklist includes RLS verification |
| **Complex UI overwhelming non-technical users** | Medium - Low adoption, high support burden, poor NPS | Medium | Progressive disclosure (show simple KPIs first, then charts), guided onboarding tour (Intro.js or similar), video tutorials (Loom), simplified "Essentials" dashboard view for non-technical users, user testing with 5 non-technical venue owners before launch |
| **Inaccurate predictions/forecasts** | Medium - Loss of credibility, poor business decisions, user distrust | Medium | Display confidence intervals (e.g., ±20%), clearly label as "Projected Estimates", validate model accuracy monthly (compare predictions to actuals), allow user feedback on prediction quality ("Was this forecast accurate?"), start with simple linear regression (>80% accuracy achievable) |
| **Export generation causes performance issues** | Medium - Slow dashboard for all users, API timeouts | Low | Background job processing using BullMQ (offload from API), queue management with priority (interactive requests > exports), rate limiting (5 exports/hour per user), show progress indicator ("Export in progress, estimated 30 seconds"), separate Redis queue for exports |
| **Scheduled reports fail to deliver** | Medium - User dissatisfaction, missed insights, support tickets | Low | Retry logic (3 attempts with exponential backoff), failure notifications to report creator ("Your weekly report failed to send"), delivery confirmation tracking (log all successful deliveries), monitoring and alerting (alert if >10% failure rate), use reliable email service (Mailgun, Postmark, AWS SES) |
| **High Redis/database costs at scale** | Medium - Budget overruns, need for infrastructure changes | Medium | Implement cache eviction policies (LRU), optimize aggregation schedules (hourly vs real-time), use read replicas for analytics queries (offload primary DB), monitor costs weekly (alert if >$500/month), implement query result pagination (reduce memory usage) |
| **Users expect real-time data but cache introduces delay** | Low - Confusion about data freshness, support questions | Medium | Display "Last updated X minutes ago" timestamp on dashboards, explain caching in help docs ("Data refreshes every 5 minutes"), offer manual "Refresh Now" button (invalidates cache), set expectations during onboarding ("Analytics data is near real-time, updated every 5 minutes") |
| **Excel/PDF generation compatibility issues** | Low - Export failures for some users, support tickets | Low | Test exports on multiple platforms (Windows/Mac, Excel 2016/2019/365), provide CSV fallback (always works), document system requirements (e.g., "Excel 2016 or newer"), use ExcelJS Open XML format (maximum compatibility), include troubleshooting guide in help docs |
| **Third-party charting library bugs or limitations** | Medium - Broken visualizations, degraded UX, blockers | Low | Thoroughly evaluate libraries before selection (POC with 10 sample charts), maintain fallback rendering (show table if chart fails), monitor error logs for chart rendering issues (Sentry), have escape hatch to D3.js for complex charts, lock library versions (avoid breaking changes) |
| **Insufficient historical data for meaningful analytics** | Medium - Poor forecasts, incomplete cohorts, user disappointment | Low | Backfill historical data from existing tables (transactions, users, tournaments) going back 12 months, populate analytics_events table retroactively (one-time migration script), set expectations ("Cohort analysis requires 3+ months of data"), display messaging when insufficient data ("More data needed for this analysis") |
| **Aggregation job fails or falls behind** | High - Stale data in dashboards, incorrect metrics | Low | Job monitoring and alerting (alert if job hasn't run in 2 hours), automatic retry on failure (3 attempts), manual job trigger endpoint for admins (`/admin/trigger-aggregation`), incremental updates (process only new events since last run), job execution timeout (kill if >10 minutes) |

---

## Alternatives Considered

### Alternative 1: Real-Time Analytics (No Caching/Aggregation)

**Approach:** Query source tables (transactions, users, tournaments) directly on every dashboard load. No pre-computed aggregation tables, no Redis caching.

**Pros:**
- Always up-to-date data (no cache delay)
- Simpler architecture (no aggregation jobs or cache layer)
- No additional storage costs (no aggregation tables)

**Cons:**
- Slow query performance (complex JOINs and aggregations on large datasets)
- High database load (every dashboard load hits database hard)
- Cannot achieve <500ms load time target
- Doesn't scale beyond 1000 users

**Why not chosen:** Performance is critical for user experience. Dashboard load time >2 seconds is unacceptable. Pre-computed aggregation tables and caching are industry-standard solutions for performant analytics.

### Alternative 2: Third-Party BI Tool (e.g., Metabase, Superset)

**Approach:** Embed third-party open-source BI tool (Metabase, Apache Superset) instead of building custom dashboard.

**Pros:**
- Faster initial development (no custom charting code)
- Advanced features out-of-the-box (drill-down, custom dashboards, SQL queries)
- Mature, battle-tested codebase

**Cons:**
- Less control over UX (embedded iframe or redirect to external tool)
- Multi-tenancy requires complex configuration (RLS in external tool)
- Difficult to integrate with existing authentication/authorization
- Increases infrastructure complexity (another service to maintain)
- Customization limited by tool's capabilities
- Licensing costs (some BI tools charge per user)

**Why not chosen:** We need tight integration with our multi-tenant architecture and existing UI/UX. Embedding a third-party tool doesn't provide the seamless experience we want. Building custom gives us full control and better fits our tech stack (Next.js, tRPC).

### Alternative 3: Serverless Analytics (AWS Quicksight, Google BigQuery)

**Approach:** Export data to AWS Quicksight or Google BigQuery for analytics, embed visualizations in our app.

**Pros:**
- Handles massive scale (petabytes of data)
- Pay-per-query pricing (cost-efficient at low volume)
- Advanced analytics capabilities (ML models, predictive analytics)
- No infrastructure management (fully managed)

**Cons:**
- High latency (data must be exported to external service)
- Cost uncertainty (pricing can be complex, expensive at scale)
- Vendor lock-in (difficult to migrate off)
- Complexity of real-time data sync (need ETL pipeline)
- Multi-tenancy requires careful configuration
- Overkill for current data volume (<1GB)

**Why not chosen:** Our current data volume (GB, not TB) doesn't justify a data warehouse solution. Adding an ETL pipeline and external service increases complexity. We can achieve our performance goals with PostgreSQL + Redis. If we scale to 10M+ events/day, we can revisit.

### Alternative 4: TimescaleDB from the Start (Instead of Optional)

**Approach:** Require TimescaleDB PostgreSQL extension for all analytics queries.

**Pros:**
- Optimized for time-series queries (10x faster for certain queries)
- Automatic partitioning (no manual maintenance)
- Continuous aggregates (like materialized views but smarter)
- Compression (reduce storage costs)

**Cons:**
- Increases deployment complexity (not all PostgreSQL providers support extensions)
- Requires database migration (install extension)
- Learning curve for TimescaleDB-specific features
- May be overkill for MVP data volume

**Why not chosen:** We want to ship fast and keep the MVP simple. Aggregation tables + Redis caching should meet our performance targets without TimescaleDB. If performance becomes an issue at scale, we can add TimescaleDB later (non-breaking change). Keeping it optional gives us flexibility.

### Alternative 5: Client-Side Aggregation (Fetch Raw Data, Aggregate in Browser)

**Approach:** API returns raw event data, frontend calculates MRR, cohorts, etc. in JavaScript.

**Pros:**
- Simpler backend (just return raw data)
- Maximum flexibility for frontend (can compute any metric)
- No aggregation job needed

**Cons:**
- Extremely slow for large datasets (10K+ rows)
- High bandwidth usage (send all data to client)
- Client-side performance issues (browser crashes)
- Inconsistent calculations (different browsers might round differently)
- Impossible to achieve <500ms load time

**Why not chosen:** This only works for small datasets (<1000 rows). For analytics at scale, server-side aggregation is mandatory. Sending 100K transaction records to the browser is not feasible.

---

## Open Questions

- [x] **What is the acceptable latency for "real-time" data?** (5 minutes? 15 minutes?)
  - **Resolution needed by:** Day 1 (impacts caching strategy)
  - **Owner:** Product + Engineering
  - **Recommendation:** 5-minute cache TTL for recent data (last 7 days), 1-hour TTL for historical (>7 days old). Users can manually refresh if needed.

- [x] **Should platform admins see venue-identified data or only aggregated anonymized data?**
  - **Resolution needed by:** Day 1 (impacts database schema and permissions)
  - **Owner:** Product + Legal
  - **Recommendation:** Platform admins see aggregate metrics across all tenants (anonymized). To view specific venue data, admin must have explicit permission from that venue (audit logged).

- [x] **What is the maximum export file size we should support?** (100K rows? 1M rows?)
  - **Resolution needed by:** Day 2 (impacts export implementation)
  - **Owner:** Engineering
  - **Recommendation:** 50MB file size limit (~100K rows for CSV, ~50K rows for Excel with charts). If user requests larger export, split into multiple files or suggest date range filtering.

- [ ] **Which ML model should we use for churn prediction?** (Logistic Regression? Random Forest? Neural Network?)
  - **Resolution needed by:** Day 3 (impacts prediction endpoint)
  - **Owner:** Data Science + Engineering
  - **Recommendation:** Start with simple linear regression for forecasting and activity-based scoring for churn (no ML model needed for MVP). Logistic Regression for churn prediction can be added in P1 if needed.

- [x] **Should scheduled reports support multiple tenants in a single report?** (e.g., franchise owner seeing all their venues)
  - **Resolution needed by:** Day 1 (impacts data model)
  - **Owner:** Product
  - **Recommendation:** Not in MVP. Keep it simple: one report = one tenant. Multi-tenant reports are P2 feature for franchise organizations.

- [ ] **What branding/white-labeling options should be available for exports?** (venue logo? custom colors?)
  - **Resolution needed by:** Day 2 (P1 feature - can defer)
  - **Owner:** Product + Design
  - **Recommendation:** MVP has minimal branding (platform logo, basic formatting). P1 adds venue logo upload and custom color scheme selection.

- [x] **Should we build our own forecasting models or use a third-party service?** (e.g., AWS Forecast)
  - **Resolution needed by:** Day 2 (impacts architecture and costs)
  - **Owner:** Engineering + Finance
  - **Recommendation:** Build our own using simple linear regression (simple-statistics library). AWS Forecast is expensive (~$0.60 per forecast) and overkill for MVP. If forecasting becomes critical and we need higher accuracy, revisit in P2.

- [x] **What level of drill-down should we support?** (e.g., click revenue chart → see individual transactions?)
  - **Resolution needed by:** Day 1 (impacts UX design and API structure)
  - **Owner:** Product + Design
  - **Recommendation:** MVP supports one level of drill-down: click chart → see summary table with top N items (e.g., top 10 tournaments by revenue). Full transaction-level drill-down is P1 (requires separate transaction detail API endpoint).

---

## References

### Research and References

**Competitive Analysis:**
- **Stripe Dashboard:** Gold standard for revenue analytics, clean KPI presentation, excellent export functionality
- **Mixpanel:** Strong cohort analysis and retention tracking, inspiration for user analytics
- **Amplitude:** Advanced funnel analysis and user segmentation
- **ChartMogul:** SaaS-specific analytics (MRR, ARR, churn), strong revenue focus

**Technical References:**
- [Recharts Documentation](https://recharts.org/) - Primary charting library
- [D3.js Gallery](https://observablehq.com/@d3/gallery) - Advanced visualization examples
- [ExcelJS Documentation](https://github.com/exceljs/exceljs) - Excel generation
- [jsPDF Documentation](https://github.com/parallax/jsPDF) - PDF generation
- [BullMQ Documentation](https://docs.bullmq.io/) - Background job queue
- [TimescaleDB Documentation](https://docs.timescale.com/) - Time-series optimization (optional)

**Performance Best Practices:**
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)
- [Redis Caching Strategies](https://redis.io/docs/manual/patterns/caching/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

**Multi-Tenant Architecture:**
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant Data Isolation Best Practices](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)

### Related Documents

**Product Documents:**
- PRD: `product/PRDs/advanced-analytics-business-intelligence.md` (this spec is based on)
- Sprint Plan: `sprints/current/sprint-10-business-growth-advanced-features.md`
- Product Roadmap: `product/roadmap/2025-Q4-roadmap.md`

**Technical Documentation (To Be Created):**
- API Specification: `technical/api-specs/analytics-api.md` (detailed API reference)
- Database Migration Scripts: `prisma/migrations/YYYYMMDD_create_analytics_tables.sql`

**Design Documentation (To Be Created):**
- Figma Mockups: [Link TBD after design complete]
- Component Storybook: Analytics dashboard components (for frontend reference)

**Related Technical Specs:**
- Multi-Tenant Architecture: `technical/multi-tenant-architecture.md` (existing)
- Admin Dashboard: `technical/specs/admin-dashboard-technical-spec.md` (Sprint 9)

**Future Specs (Depends on This):**
- Custom Dashboard Builder (P2 - Future Sprint)
- AI-Powered Insights Engine (P2 - Future Sprint)
- API Access for Third-Party BI Tools (P2 - Future Sprint)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-06 | Claude (AI Technical Assistant) | Initial draft - Comprehensive technical specification for Advanced Analytics & Business Intelligence feature, Sprint 10 Week 1 |

---

**Next Steps:**
1. Review and approve technical spec with engineering team
2. Create database migration scripts (Day 1)
3. Set up tRPC analytics router structure (Day 1)
4. Begin implementation following 5-day plan (Days 1-5)
5. Deploy to beta users (Day 5)

**Questions or Technical Clarifications?**
Contact: Engineering Team | Slack: #sprint-10-analytics
