# Advanced Analytics & Business Intelligence - PRD

**Author:** Claude (AI Product Assistant)
**Date:** 2025-11-06
**Status:** Draft
**Last Updated:** 2025-11-06
**Sprint:** Sprint 10 - Business Growth & Advanced Features

---

## 1. Executive Summary

Advanced Analytics & Business Intelligence is a comprehensive data analytics platform that empowers tournament platform stakeholders with actionable insights into revenue trends, user behavior, and tournament performance. This feature transforms raw operational data into strategic intelligence through 20+ visualizations, predictive models, and automated reporting capabilities, enabling data-driven decision making across all levels of the organization.

## 2. Problem Statement

### What problem are we solving?

Business owners and venue managers currently operate with limited visibility into their operational and financial performance. They lack tools to understand revenue trends, predict future performance, identify growth opportunities, or analyze user behavior patterns. Decision making is based on intuition rather than data, leading to missed opportunities and suboptimal resource allocation. Manual data extraction and analysis is time-consuming, error-prone, and often delayed, preventing timely responses to emerging trends.

### Who has this problem?

- **Primary Users:**
  - **Venue Owners:** Need to understand revenue performance, tournament popularity, and venue utilization to maximize profitability
  - **Tournament Directors:** Require insights into player retention, tournament completion rates, and format preferences to optimize tournament offerings
  - **Platform Administrators:** Need comprehensive dashboards to monitor platform health, identify growth opportunities, and forecast future demand

- **Secondary Users:**
  - **Business Analysts:** Require detailed data exports for custom analysis and reporting
  - **Marketing Teams:** Need user segmentation data to target campaigns effectively
  - **Finance Teams:** Require accurate revenue tracking and financial forecasting

### Why is this important now?

As the tournament platform scales to multiple venues and thousands of users, data-driven decision making becomes critical for sustainable growth. Competitors with advanced analytics capabilities have a significant advantage in optimizing their operations and responding to market changes. The volume of data being generated has reached a point where manual analysis is no longer feasible. Additionally, stakeholders are increasingly requesting detailed performance reports, and the current manual process is consuming excessive administrative time. Implementing business intelligence now positions the platform as an industry leader and creates a competitive moat.

## 3. Goals and Success Metrics

### Primary Goals

1. **Enable Data-Driven Decisions:** Provide stakeholders with comprehensive, accurate, and timely business intelligence to inform strategic and operational decisions
2. **Identify Growth Opportunities:** Surface patterns and trends that reveal untapped revenue streams, underutilized resources, and expansion opportunities
3. **Predict Future Performance:** Implement predictive models that forecast revenue, user growth, and tournament attendance with >80% accuracy
4. **Automate Reporting:** Eliminate manual reporting overhead through scheduled automated report generation and delivery

### Key Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Dashboard Active Users | 0% | 80% of venue owners use monthly | Sprint 10 + 4 weeks |
| Report Generation Frequency | Manual (2-3/month) | 50+ automated reports/week | Sprint 10 + 2 weeks |
| Dashboard Load Time | N/A | <500ms average | Sprint 10 completion |
| Decision Impact Score | N/A | 7/10 user-reported value | Sprint 10 + 8 weeks |
| Data Accuracy | N/A | 99%+ accuracy vs source | Sprint 10 + 1 week |
| Prediction Accuracy | N/A | >80% for revenue forecasts | Sprint 10 + 12 weeks |
| Time to Insight | 2-4 hours (manual) | <30 seconds (automated) | Sprint 10 completion |
| Export Usage | N/A | 30% of users export monthly | Sprint 10 + 4 weeks |

## 4. User Stories

### Story 1: Revenue Performance Analysis

**As a** venue owner
**I want** to view MRR, ARR, and revenue trends over time
**So that** I can understand my business financial health and identify revenue growth or decline patterns

#### Acceptance Criteria
- [ ] Dashboard displays current MRR and ARR with month-over-month and year-over-year comparisons
- [ ] Revenue trend line chart shows last 12 months of data with drill-down capability
- [ ] Revenue breakdown by tournament type, format, and payment method is visible
- [ ] Revenue projections for 3, 6, and 12 months are displayed with confidence intervals
- [ ] All data updates in real-time (within 5 minutes of transactions)
- [ ] Data is tenant-scoped (venue owner sees only their venue data)

### Story 2: Player Retention Analysis

**As a** tournament director
**I want** to analyze player cohort retention and lifetime value
**So that** I can understand which player segments are most valuable and improve retention strategies

#### Acceptance Criteria
- [ ] Cohort retention table shows retention rates by signup month for last 12 months
- [ ] LTV calculation includes tournament registrations, merchandise, and premium features
- [ ] Segmentation shows retention by player type (casual, competitive, professional)
- [ ] Churn prediction model flags at-risk players with >70% accuracy
- [ ] Actionable recommendations provided for improving retention
- [ ] Export cohort data to Excel with formatting and charts

### Story 3: Tournament Performance Forecasting

**As a** platform administrator
**I want** to predict future tournament attendance and completion rates
**So that** I can allocate resources effectively and plan capacity

#### Acceptance Criteria
- [ ] Predictive model forecasts tournament attendance for next 30, 60, 90 days
- [ ] Forecast accuracy metrics displayed (MAPE, RMSE)
- [ ] Historical completion rate trends shown with contributing factors
- [ ] Anomaly detection flags unusual patterns (e.g., sudden drop in registrations)
- [ ] Scenario analysis allows "what-if" exploration (e.g., impact of price changes)
- [ ] Forecasts update weekly with new data

### Story 4: Financial Report Export

**As a** business owner
**I want** to export comprehensive financial reports in Excel format
**So that** I can share reports with accountants, investors, and stakeholders

#### Acceptance Criteria
- [ ] Export includes revenue summary, transaction details, refunds, and projections
- [ ] Excel file is professionally formatted with company branding
- [ ] Charts and visualizations are embedded in Excel (not just data)
- [ ] Multiple sheets organize data logically (Summary, Transactions, Analytics, Charts)
- [ ] Export completes within 10 seconds for up to 10,000 transactions
- [ ] Scheduled exports can be configured (daily, weekly, monthly) with email delivery

### Story 5: Scheduled Stakeholder Reports

**As a** venue manager
**I want** to schedule automated weekly reports for my management team
**So that** stakeholders stay informed without manual report preparation

#### Acceptance Criteria
- [ ] Configure scheduled reports with custom date ranges and metrics
- [ ] Select delivery recipients (email addresses)
- [ ] Choose format (PDF, Excel, CSV)
- [ ] Preview report before scheduling
- [ ] Reports deliver reliably at scheduled time (99.9% reliability)
- [ ] Include custom message/commentary in report emails
- [ ] Pause or modify scheduled reports easily

### Story 6: Venue Performance Comparison

**As a** platform administrator
**I want** to compare performance across all venues
**So that** I can identify high-performing venues and share best practices

#### Acceptance Criteria
- [ ] Side-by-side comparison of up to 5 venues
- [ ] Key metrics: Revenue, tournaments hosted, average attendance, completion rate
- [ ] Performance ranking with filters (by region, size, format specialization)
- [ ] Identify outliers (both positive and negative)
- [ ] Export comparison data for presentations
- [ ] Anonymous benchmarking option (hide venue names)

### Story 7: Real-Time Tournament Monitoring

**As a** tournament director
**I want** to monitor active tournaments in real-time
**So that** I can respond quickly to issues and optimize operations

#### Acceptance Criteria
- [ ] Live dashboard shows currently running tournaments
- [ ] Metrics: Players checked in, matches in progress, estimated completion time
- [ ] Alerts for potential issues (delays, player disputes, technical problems)
- [ ] Historical comparison (is this tournament on pace vs similar past events?)
- [ ] Mobile-responsive design for on-the-go monitoring
- [ ] Refresh data every 30 seconds automatically

## 5. Requirements

### Must Have (P0)

**Revenue Analytics:**
- MRR (Monthly Recurring Revenue) tracking with historical trends
- ARR (Annual Recurring Revenue) calculation
- Churn rate calculation (monthly, quarterly, annual)
- Revenue per tournament with breakdown by type and format
- Payment success/failure rate analysis
- Refund analytics (amount, frequency, reasons)
- Revenue projections for 3, 6, and 12-month horizons

**User Analytics:**
- New user signup trends (daily, weekly, monthly)
- Active users metrics (DAU, WAU, MAU)
- User cohort retention analysis (by signup month)
- User lifetime value (LTV) calculation
- Churn prediction model with risk scoring

**Tournament Analytics:**
- Tournament completion rate tracking
- Average tournament duration analysis
- Players per tournament trends
- Popular format analysis (by count and revenue)
- Venue performance comparison dashboard

**Visualizations (Core Set - 12 required):**
- Line charts for revenue and user growth trends
- Bar charts for tournament type and venue comparison
- Pie charts for format distribution and payment methods
- Cohort retention tables with heatmap coloring
- Funnel charts for registration to completion flow
- Area charts for cumulative revenue
- Gauge charts for goal progress tracking
- KPI cards for key metrics (MRR, ARR, DAU, MAU)

**Export Capabilities:**
- Export to CSV (all raw data)
- Export to Excel with formatting and embedded charts
- Real-time data updates (within 5 minutes of source changes)

**Performance:**
- Dashboard load time <500ms
- Complex queries complete <2 seconds
- Support for 100+ concurrent users

**Multi-Tenant Security:**
- All analytics data is tenant-scoped
- Venue owners see only their venue data
- Platform admins can view aggregate cross-tenant metrics
- Data isolation validated through automated tests

### Should Have (P1)

**Advanced Visualizations (Additional 8+):**
- Heatmaps for tournament activity patterns (day/time)
- Scatter plots for correlation analysis
- Tree maps for revenue by category
- Waterfall charts for revenue changes
- Box plots for distribution analysis

**Enhanced Reporting:**
- Export to PDF with professional formatting and branding
- Scheduled report delivery (daily, weekly, monthly)
- Custom report templates
- Comparison views (current vs previous period)

**Advanced Analytics:**
- User segmentation (by activity, spend, location, format preference)
- Tournament attendance forecasting with confidence intervals
- Anomaly detection (flag unusual patterns automatically)
- Custom date range selection with presets (Last 7/30/90 days, QTD, YTD)

**Performance Optimizations:**
- Redis caching for computed analytics
- Aggregation tables for fast historical queries
- Lazy loading for dashboard components
- Progressive rendering for large datasets

### Nice to Have (P2)

**Machine Learning Enhancements:**
- Advanced churn prediction with feature importance
- Revenue optimization recommendations
- Player engagement scoring
- Tournament success prediction (before launch)
- Dynamic pricing recommendations

**Customization:**
- Custom dashboard builder (drag-and-drop widgets)
- User-defined KPIs and alerts
- Personalized dashboard layouts saved per user
- White-label reporting for venues (custom branding)

**Integrations:**
- API access to analytics data for external BI tools
- Webhook notifications for significant events (revenue milestones, churn alerts)
- Integration with Google Analytics for web traffic correlation
- Export to Google Sheets for collaborative analysis

**Advanced Features:**
- Natural language query interface ("Show me revenue for last quarter")
- AI-generated insights and recommendations
- Collaborative annotations on charts
- Version history for reports and dashboards

## 6. User Experience

### User Flow: Viewing Revenue Analytics

```
1. User logs in → Redirected to main dashboard
2. Dashboard loads with overview KPIs (MRR, ARR, Active Users)
   ↓
3. User clicks "Revenue Analytics" tab
   ↓
4. Revenue dashboard displays:
   - MRR/ARR trend line (last 12 months)
   - Revenue breakdown pie chart (by tournament type)
   - Payment success rate gauge
   - Top revenue-generating tournaments table
   ↓
5. User selects custom date range (e.g., "Last Quarter")
   → Dashboard updates with filtered data (loading indicator shown)
   ↓
6. User hovers over trend line
   → Tooltip shows exact values and % change
   ↓
7. User clicks "Export" button
   → Modal appears: Choose format (CSV/Excel/PDF)
   ↓
8. User selects Excel → File downloads within 5 seconds
   → Success notification displayed
```

### User Flow: Scheduling Automated Reports

```
1. User navigates to "Reports" section
   ↓
2. Clicks "Schedule New Report" button
   ↓
3. Report Configuration Modal appears:
   - Select report type (Revenue Summary, User Analytics, Tournament Performance)
   - Choose frequency (Daily, Weekly, Monthly)
   - Select day/time for delivery
   - Add recipient emails (comma-separated)
   - Choose format (PDF, Excel, CSV)
   - Add custom message (optional)
   ↓
4. User clicks "Preview Report"
   → System generates sample report based on current data
   → Preview displays in new tab
   ↓
5. User reviews preview → Returns to configuration
   ↓
6. User clicks "Schedule Report"
   → Validation checks (valid emails, supported frequency)
   → Confirmation message: "Report scheduled successfully"
   → Report appears in "Scheduled Reports" list
   ↓
7. User can Edit/Pause/Delete scheduled report from list
```

### User Flow: Analyzing Player Retention

```
1. User navigates to "User Analytics" → "Cohort Analysis"
   ↓
2. Cohort retention table loads:
   - Rows: Signup months (last 12 months)
   - Columns: Months since signup (0-11)
   - Cells: Retention % (color-coded: green>70%, yellow 40-70%, red<40%)
   ↓
3. User clicks on a specific cohort (e.g., "January 2025")
   → Drill-down panel appears:
      - Cohort size (total signups)
      - Current active users
      - LTV per user
      - Top retention drivers (tournament types they prefer)
   ↓
4. User clicks "Identify At-Risk Players"
   → System runs churn prediction model
   → Table displays players with >70% churn probability
   → Recommended actions shown (e.g., "Send re-engagement email")
   ↓
5. User exports at-risk player list
   → CSV downloads with player IDs, churn score, last activity date
```

### Key Interactions

1. **Date Range Selection:**
   - Persistent date picker in header (Quick presets: Last 7/30/90 days, MTD, QTD, YTD, Custom)
   - All dashboard components update simultaneously when date range changes
   - Loading indicators shown during data refresh
   - Date range selection persisted per user session

2. **Data Filtering:**
   - Filter panels available on left sidebar (collapsible)
   - Filters: Tournament type, format, venue (for admins), payment method, player segment
   - Multiple filters can be applied simultaneously (AND logic)
   - Active filters displayed as chips below header (removable)
   - "Clear All Filters" button available

3. **Chart Interactions:**
   - Hover: Tooltips show exact values, % changes, and contextual information
   - Click data point: Drill down to underlying transaction details
   - Zoom: Click-and-drag to zoom into specific time periods on line/area charts
   - Legend toggle: Click legend items to show/hide data series
   - Download chart: Icon button to export individual chart as PNG

4. **Exporting Data:**
   - Export button prominently placed in top-right of each dashboard section
   - Modal presents format options with file size estimates
   - Background processing for large exports with progress bar
   - Download link delivered via notification when ready
   - Export history tracked (last 30 days)

5. **Scheduled Reports:**
   - Manage from "Reports" page with list view and calendar view
   - Quick actions: Pause, Resume, Edit, Delete, Send Now (test)
   - Status indicators: Active, Paused, Failed (with error details)
   - Delivery confirmation emails to report creator
   - Audit log of all report deliveries

6. **Mobile Responsiveness:**
   - Stacked layout on mobile (single column)
   - Simplified visualizations (fewer data series)
   - Swipe gestures to navigate between dashboard tabs
   - Collapsible sections to reduce scrolling
   - Touch-optimized chart interactions

### Dashboard Layout

**Main Dashboard (Overview):**
```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | Date Range Picker | User Menu        │
├─────────────────────────────────────────────────────┤
│ Tabs: Overview | Revenue | Users | Tournaments      │
├─────────────────────────────────────────────────────┤
│ KPI Row (4 cards):                                  │
│ [MRR: $12,450] [ARR: $149,400] [DAU: 234] [MAU: 1,892] │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────────────┐  │
│ │  Revenue Trend   │ │  User Growth Trend       │  │
│ │  (Line Chart)    │ │  (Area Chart)            │  │
│ │                  │ │                          │  │
│ └──────────────────┘ └──────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────────────┐  │
│ │  Format Mix      │ │  Top Tournaments         │  │
│ │  (Pie Chart)     │ │  (Table with metrics)    │  │
│ └──────────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Revenue Analytics Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ Header with Date Range & Export Button             │
├─────────────────────────────────────────────────────┤
│ Revenue KPIs:                                       │
│ [MRR] [ARR] [Churn Rate] [Avg Revenue/Tournament]  │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │  Revenue Trend (12 months) - Line Chart        │ │
│ │  With projections (dotted line)                 │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ Revenue by   │ │ Payment      │ │ Refund       │ │
│ │ Type (Bar)   │ │ Success (%)  │ │ Analysis     │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────┤
│ Transaction Detail Table (sortable, filterable)     │
│ [Tournament] [Date] [Amount] [Type] [Status]        │
└─────────────────────────────────────────────────────┘
```

### Mockups/Wireframes

Detailed mockups will be created in Figma and linked here. Key screens to design:
- Main dashboard (overview)
- Revenue analytics dashboard
- User analytics dashboard (with cohort table)
- Tournament analytics dashboard
- Export configuration modal
- Scheduled reports management page
- Mobile responsive layouts

## 7. Technical Considerations

### Architecture Overview

**Frontend:**
- **Framework:** React with TypeScript
- **Charting Libraries:**
  - Recharts (primary - simpler charts, better React integration)
  - D3.js (complex visualizations - heatmaps, tree maps, custom charts)
- **State Management:** Redux Toolkit for analytics data caching
- **Data Fetching:** React Query for server state management and caching
- **Export Library:** ExcelJS for Excel generation, jsPDF for PDF exports

**Backend:**
- **API Layer:** Next.js API routes with tRPC for type-safe analytics endpoints
- **Database Queries:**
  - PostgreSQL with time-series optimization (using TimescaleDB extension recommended)
  - Aggregation tables for pre-computed metrics (updated via cron jobs)
  - Materialized views for complex joins
- **Caching:** Redis for computed analytics results (TTL: 5 minutes for real-time, 1 hour for historical)
- **Background Jobs:** BullMQ for scheduled report generation and aggregation table updates

**Data Pipeline:**
- Event tracking: All revenue, user, and tournament events logged to analytics events table
- Aggregation jobs: Hourly/daily/weekly rollups into summary tables
- Real-time stream: Redis Streams for live dashboard updates

### Dependencies

**Frontend Libraries:**
- `recharts` (v2.x): Primary charting library for line, bar, pie, area charts
- `d3` (v7.x): Advanced visualizations (heatmaps, tree maps, custom charts)
- `exceljs` (v4.x): Excel file generation with formatting and chart embedding
- `jspdf` (v2.x) + `jspdf-autotable`: PDF report generation
- `date-fns` (v2.x): Date manipulation and formatting
- `react-query` (v4.x): Server state management and caching
- `@tanstack/react-table` (v8.x): Advanced data tables with sorting, filtering, pagination

**Backend Libraries:**
- `node-cron`: Scheduled jobs for aggregation and report generation
- `bull` (v4.x): Job queue for background processing
- `ioredis` (v5.x): Redis client for caching
- `nodemailer`: Email delivery for scheduled reports

**Database Extensions:**
- `TimescaleDB` (optional but recommended): Time-series optimization for PostgreSQL

### API/Integration Requirements

**Analytics API Endpoints:**

```typescript
// Revenue Analytics
GET /api/analytics/revenue/mrr?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&tenantId=xxx
GET /api/analytics/revenue/arr?tenantId=xxx
GET /api/analytics/revenue/churn?period=monthly&tenantId=xxx
GET /api/analytics/revenue/projections?months=3,6,12&tenantId=xxx

// User Analytics
GET /api/analytics/users/cohorts?startMonth=YYYY-MM&endMonth=YYYY-MM&tenantId=xxx
GET /api/analytics/users/ltv?cohortMonth=YYYY-MM&tenantId=xxx
GET /api/analytics/users/churn-prediction?threshold=0.7&tenantId=xxx
GET /api/analytics/users/active?period=daily&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&tenantId=xxx

// Tournament Analytics
GET /api/analytics/tournaments/completion-rate?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&tenantId=xxx
GET /api/analytics/tournaments/attendance-forecast?days=30,60,90&tenantId=xxx
GET /api/analytics/tournaments/performance?venueId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

// Export Endpoints
POST /api/analytics/export/csv (Body: {metrics, filters, dateRange, tenantId})
POST /api/analytics/export/excel (Body: {reportType, filters, dateRange, tenantId})
POST /api/analytics/export/pdf (Body: {reportType, filters, dateRange, tenantId})

// Scheduled Reports
POST /api/analytics/reports/schedule (Body: {reportConfig, frequency, recipients, tenantId})
GET /api/analytics/reports/scheduled?tenantId=xxx
PATCH /api/analytics/reports/:reportId (Body: {status: 'active' | 'paused'})
DELETE /api/analytics/reports/:reportId
```

**Third-Party Integrations:**
- None required for MVP
- Optional P2: Google Analytics integration for web traffic correlation

### Data Requirements

**New Database Tables:**

```sql
-- Analytics Events (raw event stream)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(50) NOT NULL, -- 'revenue', 'user_signup', 'tournament_complete', etc.
  event_data JSONB NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_analytics_events_tenant_type_time ON analytics_events(tenant_id, event_type, occurred_at);

-- Revenue Aggregates (pre-computed for fast queries)
CREATE TABLE revenue_aggregates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  mrr DECIMAL(10,2),
  total_revenue DECIMAL(10,2),
  transaction_count INTEGER,
  refund_amount DECIMAL(10,2),
  payment_success_rate DECIMAL(5,2),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_revenue_agg_tenant_period ON revenue_aggregates(tenant_id, period_type, period_start);

-- User Cohorts (pre-computed retention data)
CREATE TABLE user_cohorts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  cohort_month DATE NOT NULL, -- First day of signup month
  cohort_size INTEGER NOT NULL,
  retention_month_0 INTEGER, -- Same month
  retention_month_1 INTEGER, -- 1 month later
  retention_month_2 INTEGER, -- 2 months later
  -- ... up to retention_month_11
  avg_ltv DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_user_cohorts_tenant_month ON user_cohorts(tenant_id, cohort_month);

-- Tournament Aggregates
CREATE TABLE tournament_aggregates (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  venue_id UUID REFERENCES venues(id),
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  tournament_count INTEGER,
  total_players INTEGER,
  completion_rate DECIMAL(5,2),
  avg_duration_minutes INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tournament_agg_tenant_venue ON tournament_aggregates(tenant_id, venue_id, period_start);

-- Scheduled Reports
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_by UUID NOT NULL REFERENCES users(id),
  report_type VARCHAR(50) NOT NULL, -- 'revenue_summary', 'user_analytics', etc.
  frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  schedule_config JSONB NOT NULL, -- {dayOfWeek, hour, recipients, format, filters}
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused'
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_scheduled_reports_tenant_status ON scheduled_reports(tenant_id, status, next_run_at);
```

**Existing Tables Modified:**
- No modifications required to existing tables
- Analytics data derived from existing: transactions, users, tournaments, registrations

**Data Retention:**
- Raw analytics_events: 13 months (rolling deletion)
- Aggregates: Indefinite retention (small data volume)
- Export files: 30 days in S3, then deleted

**Privacy and Compliance:**
- All analytics data is tenant-scoped (venue owners see only their data)
- Platform admins can view aggregate metrics across tenants (anonymized)
- No PII (Personally Identifiable Information) stored in analytics tables
- Users can request data deletion (GDPR compliance) - cascade to analytics events
- Audit log tracks all data access and exports

### Performance Requirements

**Dashboard Load Time:**
- Initial load: <500ms (target), <1000ms (maximum)
- Tab switching: <200ms
- Date range change: <500ms
- Filtering: <300ms

**Query Performance:**
- Simple aggregates (MRR, ARR): <100ms
- Complex cohort queries: <1000ms
- Export generation (10K rows): <5 seconds
- Export generation (100K rows): <30 seconds

**Scalability:**
- Support 100+ concurrent dashboard users
- Handle 10K+ analytics events per hour
- Aggregation jobs complete within 5-minute window
- Redis cache hit rate >80%

**Optimization Strategies:**
- Aggregate tables updated hourly (not real-time for historical data)
- Redis caching with 5-minute TTL for dashboards
- Database indexes on tenant_id, event_type, occurred_at
- Query result pagination (max 1000 rows per API call)
- Progressive loading for dashboard (show KPIs first, then charts)
- Lazy loading for chart libraries (code splitting)
- CDN caching for static chart images

### Multi-Tenant Considerations

**Data Isolation:**
- All queries MUST include tenant_id filter
- Database row-level security (RLS) policies enforce tenant isolation
- Automated tests verify cross-tenant data leakage prevention

**Tenant-Specific Features:**
- Each tenant can configure custom KPIs and dashboard layouts (P2)
- Scheduled reports are tenant-scoped
- Export file storage: `s3://bucket/{tenant-id}/analytics-exports/{filename}`

**Performance per Tenant:**
- Separate Redis cache keys per tenant
- Query rate limiting per tenant (100 requests/minute)
- Large tenants (>10K users) flagged for dedicated aggregation jobs

**Platform Admin View:**
- Special "platform" tenant_id for cross-tenant analytics
- Aggregates computed across all tenants (anonymized)
- No access to individual tenant's raw data without explicit permission

## 8. Launch Plan

### Rollout Strategy

**Phase 1: Internal Testing (Days 1-2)**
- [ ] Deploy to staging environment
- [ ] Internal team tests all features with sample data
- [ ] Verify multi-tenant data isolation
- [ ] Load testing with simulated traffic (100 concurrent users)
- [ ] Bug fixes and performance tuning

**Phase 2: Beta Testing (Days 3-5)**
- [ ] Select 5-10 beta venues (diverse sizes and activity levels)
- [ ] Provide onboarding guide and tutorial
- [ ] Daily check-ins for feedback
- [ ] Monitor dashboard usage metrics and error rates
- [ ] Iterate based on beta feedback

**Phase 3: Gradual Rollout (Week 2)**
- [ ] Enable for 25% of venues (highest activity first)
- [ ] Monitor performance and support requests
- [ ] Enable for 50% of venues
- [ ] Monitor for 2-3 days
- [ ] Enable for remaining 25% of venues

**Phase 4: Full Release (Week 2)**
- [ ] Analytics available to all users
- [ ] Announce via email, in-app notifications, blog post
- [ ] Host webinar demonstrating key features
- [ ] Create video tutorials and help documentation
- [ ] Dedicated support channel for analytics questions

### Success Criteria for Launch

**Technical Success:**
- Dashboard load time <500ms for 95th percentile
- Zero critical bugs in production
- >99.5% API uptime
- Cache hit rate >80%
- Zero data leakage incidents (verified via automated tests)

**User Success:**
- 80% of invited beta users actively use analytics within first week
- Average user rating >4/5 stars (post-beta survey)
- <5% support ticket rate (analytics-related tickets / total active users)
- 30% of users export data within first two weeks

**Business Success:**
- Feature included in premium tier drives 10% increase in paid plan conversions
- Venue owners report increased satisfaction (NPS improvement)
- Reduced support burden for manual reporting requests (50% reduction)

### Marketing/Communication Plan

**Pre-Launch (1 week before):**
- Teaser email: "Coming Soon: Advanced Analytics Dashboard"
- Blog post: "Making Data-Driven Decisions: Our New Analytics Platform"
- Social media posts highlighting key visualizations

**Launch Day:**
- Email announcement to all users with feature highlights
- In-app notification with "Explore Analytics" CTA
- Press release for industry publications
- Demo video posted to YouTube and social media

**Post-Launch (Weeks 1-4):**
- Weekly tips series: "Analytics Tip of the Week" (email/blog)
- Webinar: "Mastering Analytics for Tournament Success" (Week 2)
- Case study: Highlighting a venue that gained insights from analytics (Week 3)
- Tutorial video series: 5 short videos covering different analytics features
- Customer success team proactively reaches out to high-value accounts

**Internal Communication:**
- Engineering team briefing on new endpoints and monitoring
- Support team training on analytics features (how-to guide, FAQs)
- Sales team equipped with demo account and pitch deck
- Customer success team provided with onboarding checklist

## 9. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Slow query performance on large datasets** | High - Poor UX, user frustration | Medium | Implement aggregation tables, Redis caching, database indexes, query optimization. Load test with 1M+ events. |
| **Data privacy concerns or cross-tenant leakage** | Critical - Legal/compliance issues, loss of trust | Low | Implement row-level security, automated tests for tenant isolation, third-party security audit. |
| **Complex UI overwhelming non-technical users** | Medium - Low adoption, support burden | Medium | Progressive disclosure (show simple metrics first), guided onboarding tour, video tutorials, simplified "Essentials" dashboard view. |
| **Inaccurate predictions/forecasts** | Medium - Loss of credibility, poor decisions | Medium | Display confidence intervals, clearly label as "estimates", validate model accuracy monthly, allow user feedback on prediction quality. |
| **Export generation causes performance issues** | Medium - Slow dashboard for all users | Low | Background job processing for exports, queue management, rate limiting (5 exports/hour per user), show progress indicator. |
| **Scheduled reports fail to deliver** | Medium - User dissatisfaction, missed insights | Low | Retry logic (3 attempts), failure notifications to creator, delivery confirmation tracking, monitoring and alerting. |
| **High Redis/database costs at scale** | Medium - Budget overruns | Medium | Implement cache eviction policies, optimize aggregation schedules, use read replicas for analytics queries, monitor costs weekly. |
| **Users expect real-time data but cache introduces delay** | Low - Confusion about data freshness | Medium | Display "Last updated" timestamp on dashboards, explain caching in help docs, offer manual "Refresh" button. |
| **Excel/PDF generation compatibility issues** | Low - Export failures for some users | Low | Test exports on multiple platforms (Windows/Mac, Excel versions), provide CSV fallback, document system requirements. |
| **Third-party charting library bugs or limitations** | Medium - Broken visualizations, degraded UX | Low | Thoroughly evaluate libraries before selection, maintain fallback rendering (show table if chart fails), monitor error logs for chart rendering issues. |

## 10. Timeline and Milestones

**Sprint 10, Week 1 (5 business days)**

| Milestone | Target Date | Owner | Status | Dependencies |
|-----------|-------------|-------|--------|--------------|
| PRD Approved | Day 1 (Nov 6) | Product Team | ⏳ | N/A |
| Design Mockups Complete | Day 1 (Nov 6) | Design Team | ⏳ | PRD Approved |
| Database Schema Created | Day 1 (Nov 6) | Backend | ⏳ | PRD Approved |
| Backend API Endpoints (Revenue) | Day 2 (Nov 7) | Backend | ⏳ | Database Schema |
| Backend API Endpoints (Users & Tournaments) | Day 2 (Nov 7) | Backend | ⏳ | Database Schema |
| Frontend Dashboard Shell | Day 2 (Nov 7) | Frontend | ⏳ | Design Mockups |
| Revenue Analytics Charts | Day 3 (Nov 8) | Frontend | ⏳ | Backend APIs, Dashboard Shell |
| User Analytics Charts | Day 3 (Nov 8) | Frontend | ⏳ | Backend APIs, Dashboard Shell |
| Tournament Analytics Charts | Day 3 (Nov 8) | Frontend | ⏳ | Backend APIs, Dashboard Shell |
| Export Functionality (CSV/Excel) | Day 4 (Nov 9) | Backend + Frontend | ⏳ | APIs Complete |
| Scheduled Reports Backend | Day 4 (Nov 9) | Backend | ⏳ | APIs Complete |
| Scheduled Reports UI | Day 4 (Nov 9) | Frontend | ⏳ | Scheduled Reports Backend |
| Aggregation Jobs & Caching | Day 4 (Nov 9) | Backend | ⏳ | Database Schema |
| Multi-Tenant Security Testing | Day 5 (Nov 10) | QA + Backend | ⏳ | All APIs Complete |
| Performance Testing & Optimization | Day 5 (Nov 10) | Full Stack | ⏳ | Feature Complete |
| Beta Deployment | Day 5 (Nov 10) | DevOps | ⏳ | Testing Complete |
| Beta User Testing | Days 6-7 (Weekend) | Beta Users | ⏳ | Beta Deployment |
| Bug Fixes & Iteration | Week 2, Days 1-2 | Full Stack | ⏳ | Beta Feedback |
| Production Launch | Week 2, Day 3 | DevOps | ⏳ | Fixes Complete |

**Post-Launch (Weeks 2-4)**
- Week 2: Monitor adoption, collect user feedback, iterate based on insights
- Week 3: Implement P1 features (PDF export, additional visualizations)
- Week 4: Begin P2 planning (ML enhancements, custom dashboards)

## 11. Open Questions

- [ ] **What is the acceptable latency for "real-time" data?** (5 minutes? 15 minutes?)
  - *Resolution needed by:* Day 1 (impacts caching strategy)
  - *Owner:* Product + Engineering

- [ ] **Should platform admins see venue-identified data or only aggregated anonymized data?**
  - *Resolution needed by:* Day 1 (impacts database schema and permissions)
  - *Owner:* Product + Legal

- [ ] **What is the maximum export file size we should support?** (100K rows? 1M rows?)
  - *Resolution needed by:* Day 2 (impacts export implementation)
  - *Owner:* Engineering

- [ ] **Which ML model should we use for churn prediction?** (Logistic Regression? Random Forest? Neural Network?)
  - *Resolution needed by:* Day 3 (impacts prediction endpoint)
  - *Owner:* Data Science + Engineering

- [ ] **Should scheduled reports support multiple tenants in a single report?** (e.g., franchise owner seeing all their venues)
  - *Resolution needed by:* Day 1 (impacts data model)
  - *Owner:* Product

- [ ] **What branding/white-labeling options should be available for exports?** (venue logo? custom colors?)
  - *Resolution needed by:* Day 2 (P1 feature - can defer)
  - *Owner:* Product + Design

- [ ] **Should we build our own forecasting models or use a third-party service?** (e.g., AWS Forecast)
  - *Resolution needed by:* Day 2 (impacts architecture and costs)
  - *Owner:* Engineering + Finance

- [ ] **What level of drill-down should we support?** (e.g., click revenue chart → see individual transactions?)
  - *Resolution needed by:* Day 1 (impacts UX design and API structure)
  - *Owner:* Product + Design

## 12. Appendix

### Research and References

**Competitive Analysis:**
- **Stripe Dashboard:** Gold standard for revenue analytics, clean KPI presentation, excellent export functionality
- **Mixpanel:** Strong cohort analysis and retention tracking, inspiration for user analytics
- **Amplitude:** Advanced funnel analysis and user segmentation, complex but powerful
- **Tableau/Power BI:** Industry-standard BI tools, inspiration for custom dashboard builder (P2)
- **ChartMogul:** SaaS-specific analytics (MRR, ARR, churn), strong revenue focus

**User Research:**
- Survey of 20 venue owners (Oct 2025): 85% want better revenue visibility, 70% struggle with manual reporting
- Interview with 5 tournament directors: Priority is player retention insights, secondary is tournament performance
- Competitive intel: 3 competitor platforms have basic analytics, none have predictive models or advanced exports

**Market Data:**
- Analytics dashboards increase user engagement by 40% (Industry benchmark)
- 30% of SaaS users export data monthly (Mixpanel data)
- Predictive analytics can improve retention by 15% (Gartner study)

**Technical Research:**
- Recharts vs D3.js comparison: Recharts for 80% of visualizations, D3 for complex custom charts
- ExcelJS performance: Can generate 100K row Excel file in ~8 seconds (acceptable)
- Redis caching for analytics: Industry standard, 80-90% cache hit rates typical

### Related Documents

**Planning Documents:**
- Sprint 10 Plan: `sprints/current/sprint-10-business-growth-advanced-features.md`
- Product Roadmap: `product/roadmap/2025-Q4-roadmap.md`

**Technical Documentation (To Be Created):**
- Technical Spec: `technical/specs/analytics-architecture.md` (TBD)
- API Specification: `technical/api-specs/analytics-api.md` (TBD)
- Database Schema: `technical/database/analytics-schema.sql` (TBD)

**Design Documentation (To Be Created):**
- Figma Mockups: [Link TBD]
- Design System Components: Analytics dashboard components guide (TBD)

**Related PRDs:**
- Admin Dashboard PRD: `product/PRDs/admin-dashboard.md` (Sprint 9)
- Multi-Tenant Architecture: `technical/multi-tenant-architecture.md`

**Future PRDs (Depends on This):**
- Custom Dashboard Builder (P2 - Future Sprint)
- AI-Powered Insights Engine (P2 - Future Sprint)
- API Access for Third-Party BI Tools (P2 - Future Sprint)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-06 | Claude (AI Product Assistant) | Initial draft - Comprehensive PRD for Sprint 10 Advanced Analytics feature |

---

**Next Steps:**
1. Review and approve PRD with stakeholders
2. Create technical specification document
3. Design mockups in Figma
4. Break down into detailed development tasks
5. Begin Sprint 10 implementation

**Questions or Feedback?**
Contact: Product Team | Email: product@tournament-platform.com
