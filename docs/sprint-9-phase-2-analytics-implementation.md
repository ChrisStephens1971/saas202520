# Sprint 9 Phase 2 - Analytics Dashboard Implementation

## Overview

Comprehensive admin analytics dashboard system built for the SaaS202520 tournament management platform. Provides system-wide metrics, user analytics, tournament insights, and performance monitoring.

**Implementation Date:** November 6, 2025
**Sprint:** Sprint 9 Phase 2
**Tech Stack:** Next.js 14, TypeScript, Recharts v3.3.0

---

## Files Created

### Components (3 files - 753 lines)

#### 1. MetricsCard.tsx (194 lines)

**Location:** `apps/web/components/admin/MetricsCard.tsx`

**Purpose:** Display single metrics with trend indicators

**Features:**

- Current value with previous period comparison
- Automatic trend calculation (up/down/neutral)
- Percentage change display
- Multiple format support (number, currency, percentage, duration)
- Visual variants (default, success, warning, danger)
- Loading state with skeleton
- Grouped layout support

**Props:**

```typescript
interface MetricsCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  description?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}
```

**Example Usage:**

```tsx
<MetricsCard
  title="Total Users"
  value={1234}
  currentValue={1234}
  previousValue={1100}
  format="number"
  variant="success"
/>
```

---

#### 2. DateRangePicker.tsx (274 lines)

**Location:** `apps/web/components/admin/DateRangePicker.tsx`

**Purpose:** Date range selection for filtering analytics

**Features:**

- Quick preset ranges (Today, Last 7 days, Last 30 days, etc.)
- Custom date range selection
- Comparison with previous period toggle
- Responsive design
- Built with date-fns for date manipulation

**Presets:**

- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- This Week
- Last Week
- This Month
- Last Month
- Last 3 Months
- Custom Range

**Props:**

```typescript
interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  allowComparison?: boolean;
  className?: string;
}

interface DateRange {
  start: Date;
  end: Date;
  preset?: DateRangePreset;
  compareWithPrevious?: boolean;
}
```

**Hook:**

```tsx
const [dateRange, setDateRange] = useDateRange('last30days');
```

---

#### 3. AnalyticsCharts.tsx (485 lines)

**Location:** `apps/web/components/admin/AnalyticsCharts.tsx`

**Purpose:** Comprehensive chart components using Recharts

**Chart Types:**

1. **UserGrowthChart** - Line chart for user growth trends
2. **TournamentActivityChart** - Bar chart for tournament activity
3. **MatchCompletionChart** - Pie chart for match status distribution
4. **RevenueTrendsChart** - Area chart for revenue over time
5. **EngagementChart** - Multi-line chart for DAU/WAU/MAU
6. **FormatDistributionChart** - Pie chart for tournament formats
7. **PerformanceChart** - Line chart for system metrics
8. **RoleDistributionChart** - Pie chart for user roles
9. **MatchesPerDayChart** - Bar chart for daily match volume

**Chart Configuration:**

```typescript
const CHART_COLORS = {
  primary: '#9333ea', // purple-600
  secondary: '#3b82f6', // blue-500
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
};
```

**Example Usage:**

```tsx
<UserGrowthChart
  data={[
    { date: '2025-11-01', users: 100, activeUsers: 75 },
    { date: '2025-11-02', users: 105, activeUsers: 80 },
  ]}
  title="User Growth Over Time"
  showActiveUsers={true}
/>
```

---

#### 4. ExportButton.tsx (326 lines)

**Location:** `apps/web/components/admin/ExportButton.tsx`

**Purpose:** Export analytics data in multiple formats

**Supported Formats:**

- CSV: Simple data export
- Excel (XLSX): Formatted workbook
- PNG: Chart image export
- PDF: Full report with tables

**Props:**

```typescript
interface ExportButtonProps {
  data: any[];
  filename: string;
  formats?: ExportFormat[];
  onExport?: (format: ExportFormat) => void;
  disabled?: boolean;
  className?: string;
}
```

**Features:**

- Single or multiple format selection
- Dropdown menu for multiple formats
- Automatic file naming with date
- Custom export handlers
- Loading states

**Example Usage:**

```tsx
<ExportButton data={metricsArray} filename="analytics-report" formats={['csv', 'xlsx', 'pdf']} />
```

---

### Pages (4 files - 871 lines)

#### 1. Overview Page (170 lines)

**Location:** `apps/web/app/admin/analytics/page.tsx`

**Purpose:** Main analytics dashboard with system-wide metrics

**Metrics Displayed:**

- Total Users (with trend)
- Active Users (DAU)
- Total Tournaments (with trend)
- Matches Played (with trend)
- Revenue (with trend)
- System Uptime
- Error Rate

**Charts:**

- User Growth Over Time (line chart)
- Tournament Activity (bar chart)
- Match Status Distribution (pie chart)
- Revenue Trends (area chart)

**Features:**

- Real-time data updates
- Manual refresh button
- Date range filtering
- Export functionality
- Navigation to detailed analytics
- Quick links to other sections

---

#### 2. User Analytics Page (258 lines)

**Location:** `apps/web/app/admin/analytics/users/page.tsx`

**Purpose:** Detailed user metrics and engagement analysis

**Metrics Displayed:**

- Total Users
- New Users (with trend)
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- Retention Rate
- Average Session Duration
- Churn Rate

**Charts:**

- User Registrations (line chart)
- User Engagement DAU/WAU/MAU (multi-line chart)
- User Role Distribution (pie chart)
- Cohort Retention Analysis (table)

**Key Insights:**

- User Growth Rate
- DAU/MAU Ratio (engagement indicator)
- Average Retention
- Active User Percentage

**API Endpoint:** `/api/admin/analytics/users`

---

#### 3. Tournament Analytics Page (230 lines)

**Location:** `apps/web/app/admin/analytics/tournaments/page.tsx`

**Purpose:** Tournament-specific analytics and insights

**Metrics Displayed:**

- Total Tournaments (with trend)
- Completed Tournaments
- Active Tournaments
- Completion Rate (with trend)
- Average Duration
- Average Players
- Total Matches
- Average Matches per Tournament

**Charts:**

- Tournament Activity (bar chart)
- Tournament Formats (pie chart)
- Matches Per Day (bar chart)
- Tournament Status (pie chart)

**Data Tables:**

- Top Tournaments (name, format, players, matches, duration, status)

**Key Insights:**

- Most Popular Format
- Match Completion Rate
- Average Tournament Size
- Tournament Growth Rate

**API Endpoint:** `/api/admin/analytics/tournaments`

---

#### 4. Performance Analytics Page (213 lines)

**Location:** `apps/web/app/admin/analytics/performance/page.tsx`

**Purpose:** System performance and health monitoring

**Metrics Displayed:**

- Average Response Time (with trend)
- P95 Response Time
- Error Rate (with trend)
- System Uptime
- Active Connections
- Average Query Time
- Cache Hit Rate
- Requests Per Minute

**Charts:**

- API Response Time (line chart)
- Error Rate Over Time (line chart)
- Request Throughput (line chart)

**Real-Time Features:**

- Auto-refresh every 60 seconds
- Recent Errors list (with timestamp, endpoint, status code, message)
- Slow Queries list (with duration, count)

**Health Summary:**

- API Health (Healthy/Degraded/Critical)
- Database Health (Optimal/Acceptable/Slow)
- Cache Efficiency (Excellent/Good/Poor)

**API Endpoint:** `/api/admin/analytics/performance`

---

## Data Aggregation Requirements

### API Endpoints to Implement

#### 1. Overview Endpoint

**Route:** `GET /api/admin/analytics/overview`

**Query Parameters:**

- `startDate`: ISO date string
- `endDate`: ISO date string
- `compareWithPrevious`: boolean

**Response Structure:**

```typescript
{
  metrics: {
    totalUsers: number;
    previousTotalUsers: number;
    activeUsers: number;
    previousActiveUsers: number;
    totalTournaments: number;
    previousTotalTournaments: number;
    activeTournaments: number;
    matchesPlayed: number;
    previousMatchesPlayed: number;
    revenue: number;
    previousRevenue: number;
    systemUptime: number;
    errorRate: number;
  }
  charts: {
    userGrowth: Array<{ date: string; users: number; activeUsers: number }>;
    tournamentActivity: Array<{ date: string; created: number; completed: number }>;
    matchStatus: Array<{ name: string; value: number }>;
    revenue: Array<{ date: string; revenue: number }>;
  }
}
```

**Data Sources:**

- Users table (total count, active count)
- Tournaments table (count by status)
- Matches table (total, completed)
- Payments/subscriptions table (revenue)
- Application logs (uptime, errors)

**Aggregation Queries:**

```sql
-- Total users
SELECT COUNT(*) FROM users WHERE created_at BETWEEN ? AND ?;

-- Active users (logged in within date range)
SELECT COUNT(DISTINCT user_id) FROM sessions WHERE last_active BETWEEN ? AND ?;

-- Tournaments by status
SELECT status, COUNT(*) FROM tournaments WHERE created_at BETWEEN ? AND ? GROUP BY status;

-- Revenue
SELECT SUM(amount) FROM payments WHERE created_at BETWEEN ? AND ? AND status = 'completed';
```

---

#### 2. User Analytics Endpoint

**Route:** `GET /api/admin/analytics/users`

**Response Structure:**

```typescript
{
  metrics: {
    totalUsers: number;
    previousTotalUsers: number;
    newUsers: number;
    previousNewUsers: number;
    dailyActiveUsers: number;
    previousDailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    retentionRate: number;
    previousRetentionRate: number;
    avgSessionDuration: number;
    churnRate: number;
  }
  charts: {
    registrations: Array<{ date: string; users: number }>;
    engagement: Array<{ date: string; dau: number; wau: number; mau: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    cohortRetention: Array<{
      cohort: string;
      week1: number;
      week2: number;
      week3: number;
      week4: number;
    }>;
  }
}
```

**Aggregation Queries:**

```sql
-- Daily registrations
SELECT DATE(created_at) as date, COUNT(*) as users
FROM users
WHERE created_at BETWEEN ? AND ?
GROUP BY DATE(created_at)
ORDER BY date;

-- Daily Active Users (DAU)
SELECT DATE(last_active) as date, COUNT(DISTINCT user_id) as dau
FROM sessions
WHERE last_active BETWEEN ? AND ?
GROUP BY DATE(last_active);

-- Role distribution
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;

-- Retention rate (users who returned after signup)
SELECT
  COUNT(DISTINCT CASE WHEN days_since_signup <= 7 AND activity_count > 1 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as retention_rate
FROM user_activity_summary;
```

---

#### 3. Tournament Analytics Endpoint

**Route:** `GET /api/admin/analytics/tournaments`

**Response Structure:**

```typescript
{
  metrics: {
    totalTournaments: number;
    previousTotalTournaments: number;
    completedTournaments: number;
    activeTournaments: number;
    avgDuration: number;
    avgPlayers: number;
    completionRate: number;
    previousCompletionRate: number;
    totalMatches: number;
    completedMatches: number;
    avgMatchesPerTournament: number;
  }
  charts: {
    activity: Array<{ date: string; created: number; completed: number; active: number }>;
    formatDistribution: Array<{ format: string; count: number }>;
    matchesPerDay: Array<{ date: string; matches: number; completed: number }>;
    statusDistribution: Array<{ name: string; value: number }>;
  }
  topTournaments: Array<{
    id: string;
    name: string;
    format: string;
    players: number;
    matches: number;
    completed: boolean;
    duration: number;
  }>;
}
```

**Aggregation Queries:**

```sql
-- Tournament activity by day
SELECT
  DATE(created_at) as date,
  COUNT(*) as created,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
FROM tournaments
WHERE created_at BETWEEN ? AND ?
GROUP BY DATE(created_at);

-- Format distribution
SELECT format, COUNT(*) as count
FROM tournaments
WHERE created_at BETWEEN ? AND ?
GROUP BY format;

-- Average tournament duration (in minutes)
SELECT AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_duration
FROM tournaments
WHERE status = 'completed' AND end_time IS NOT NULL;

-- Top tournaments by various metrics
SELECT id, name, format, player_count, match_count, status,
       TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW())) as duration
FROM tournaments
WHERE created_at BETWEEN ? AND ?
ORDER BY player_count DESC
LIMIT 10;
```

---

#### 4. Performance Analytics Endpoint

**Route:** `GET /api/admin/analytics/performance`

**Response Structure:**

```typescript
{
  metrics: {
    avgResponseTime: number;
    previousAvgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    previousErrorRate: number;
    uptime: number;
    activeConnections: number;
    avgQueryTime: number;
    cacheHitRate: number;
    requestsPerMinute: number;
    previousRequestsPerMinute: number;
    bandwidthUsage: number;
  }
  charts: {
    responseTime: Array<{
      timestamp: string;
      responseTime: number;
      errorRate: number;
      throughput: number;
    }>;
    errors: Array<{ timestamp: string; count: number; type: string }>;
    connections: Array<{ timestamp: string; active: number; idle: number }>;
  }
  recentErrors: Array<{
    timestamp: string;
    endpoint: string;
    method: string;
    statusCode: number;
    message: string;
    count: number;
  }>;
  slowQueries: Array<{
    query: string;
    avgDuration: number;
    count: number;
  }>;
}
```

**Data Sources:**

- Application logs (response times, errors)
- Database performance logs (query times)
- Redis/cache metrics (hit rate)
- System monitoring (uptime, connections)

**Aggregation:**

- Use application middleware to log request/response times
- Store in time-series database or aggregated logs table
- Calculate percentiles (P95, P99)
- Track error rates by endpoint and status code
- Monitor database slow query log

---

## Performance Considerations

### Real-Time vs Cached Data

**Real-Time Data (< 5 min cache):**

- Active users count
- Active connections
- Current error rate
- System health status

**Short Cache (15-30 min):**

- Daily active users
- Recent errors
- Performance metrics

**Long Cache (1-24 hours):**

- Historical trends
- User growth charts
- Tournament statistics
- Revenue data

### Caching Strategy

```typescript
// Redis cache keys
const CACHE_KEYS = {
  overview: 'analytics:overview:{startDate}:{endDate}',
  users: 'analytics:users:{startDate}:{endDate}',
  tournaments: 'analytics:tournaments:{startDate}:{endDate}',
  performance: 'analytics:performance:{timestamp}',
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  overview: 1800, // 30 minutes
  users: 3600, // 1 hour
  tournaments: 3600, // 1 hour
  performance: 300, // 5 minutes
};
```

### Database Optimization

**Indexes Required:**

```sql
-- Users table
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_active ON users(last_active);

-- Tournaments table
CREATE INDEX idx_tournaments_created_at ON tournaments(created_at);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_format ON tournaments(format);

-- Matches table
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- Sessions table
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_last_active ON sessions(last_active);

-- Performance logs table (if separate)
CREATE INDEX idx_perf_logs_timestamp ON performance_logs(timestamp);
CREATE INDEX idx_perf_logs_endpoint ON performance_logs(endpoint);
```

### Query Optimization

1. **Use aggregation tables** for frequently accessed metrics
2. **Pre-calculate** daily/weekly/monthly summaries
3. **Paginate** large result sets
4. **Limit date ranges** to prevent expensive queries
5. **Use database views** for complex joins

---

## Chart Configurations

### Recharts Settings

**Global Config:**

```typescript
// Responsive container - always use
<ResponsiveContainer width="100%" height={300}>

// Custom tooltip style
const customTooltipStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  padding: '12px',
};

// Grid settings
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

// Axis colors
<XAxis stroke="#9ca3af" />
<YAxis stroke="#9ca3af" />
```

**Performance Tips:**

- Limit data points to 50-100 for smooth rendering
- Use `isAnimationActive={false}` for large datasets
- Debounce data updates
- Memoize chart data transformations

---

## Testing Requirements

### Unit Tests

**Components:**

```typescript
// MetricsCard.test.tsx
- renders with correct value
- calculates trend automatically
- formats currency/percentage/duration correctly
- shows loading state
- applies correct variant styles

// DateRangePicker.test.tsx
- presets change date range correctly
- custom range validation works
- comparison toggle updates state

// AnalyticsCharts.test.tsx
- charts render with data
- handles empty data gracefully
- tooltips show correct information
```

### Integration Tests

**Pages:**

```typescript
// analytics/page.test.tsx
- fetches data on mount
- displays metrics correctly
- handles API errors
- refresh button works
- export functionality triggers

// analytics/users/page.test.tsx
- user metrics calculated correctly
- cohort table renders
- role distribution displayed

// analytics/tournaments/page.test.tsx
- tournament stats accurate
- top tournaments list populated

// analytics/performance/page.test.tsx
- auto-refreshes every 60 seconds
- recent errors displayed
- slow queries listed
```

### E2E Tests

```typescript
// analytics.spec.ts
test('admin can view analytics dashboard', async ({ page }) => {
  await page.goto('/admin/analytics');
  await expect(page.locator('h1')).toHaveText('Analytics Dashboard');
  await expect(page.locator('[data-testid="metrics-card"]')).toHaveCount(4);
});

test('date range filtering works', async ({ page }) => {
  await page.goto('/admin/analytics');
  await page.click('button:has-text("Last 7 Days")');
  await expect(page.locator('[data-testid="date-display"]')).toContainText('Last 7 Days');
});

test('export to CSV works', async ({ page }) => {
  await page.goto('/admin/analytics');
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Export Data")');
  await page.click('button:has-text("Export as CSV")');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.csv');
});
```

---

## Future Enhancements

### Phase 3 Additions

1. **Custom Dashboards**
   - Drag-and-drop widget arrangement
   - Save custom views
   - Share dashboards with team

2. **Advanced Filters**
   - Multi-select filters
   - Saved filter presets
   - Cross-page filter persistence

3. **Alerts & Notifications**
   - Threshold alerts (error rate > 5%)
   - Performance degradation warnings
   - Daily/weekly email reports

4. **Comparison Views**
   - Compare multiple time periods
   - Year-over-year comparisons
   - A/B test results

5. **Predictive Analytics**
   - User growth forecasting
   - Revenue projections
   - Churn prediction

6. **Real-Time Streaming**
   - Live metrics updates via WebSocket
   - Real-time event stream
   - Live tournament activity feed

---

## Summary

**Total Implementation:**

- 4 reusable components (753 lines)
- 4 analytics pages (871 lines)
- 8 chart types
- 30+ metrics tracked
- 4 API endpoints to implement

**Key Features:**

- Comprehensive system-wide analytics
- User engagement and retention tracking
- Tournament performance insights
- System health monitoring
- Date range filtering
- Multi-format export (CSV, Excel, PDF, PNG)
- Responsive design
- Real-time updates
- Caching strategy

**Next Steps:**

1. Implement API endpoints with proper data aggregation
2. Set up caching layer (Redis)
3. Create database indexes
4. Add unit and integration tests
5. Deploy and monitor performance

---

**Documentation Version:** 1.0
**Last Updated:** November 6, 2025
**Author:** Sprint 9 Phase 2 Implementation Team
