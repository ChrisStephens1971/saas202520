# Analytics Dashboard Components

Comprehensive analytics visualization components for Sprint 10 Week 1 Day 3.

## Overview

This module provides 20+ chart visualizations using Recharts and D3.js, organized into modular, reusable components for revenue, user, and tournament analytics.

## Architecture

```
components/analytics/
├── types.ts                    # TypeScript interfaces
├── fetcher.ts                  # SWR fetcher utility
├── index.ts                    # Central exports
├── LoadingStates.tsx           # Skeleton loaders & error states
├── ChartContainer.tsx          # Reusable chart wrapper
├── DateRangePicker.tsx         # Date range selector
├── KPICards.tsx                # KPI metric cards
├── RevenueAnalytics.tsx        # Revenue visualizations (4 charts)
├── UserAnalytics.tsx           # User & cohort analysis (3 charts)
├── TournamentAnalytics.tsx     # Tournament metrics (3 charts)
├── CohortHeatmap.tsx           # D3 cohort retention heatmap
└── ActivityHeatmap.tsx         # D3 activity heatmap
```

## Components

### 1. KPI Cards (`KPICards.tsx`)

**Purpose:** Display key performance indicators with trend indicators

**Features:**

- 4 metric cards: MRR, ARR, Active Tournaments, Active Players
- Color-coded trend indicators (green/red)
- Percentage change from previous period
- Icon for each metric type
- Responsive grid layout
- Loading skeleton states

**Props:**

```typescript
interface KPICardsProps {
  metrics: KPIMetric[];
  isLoading?: boolean;
}

interface KPIMetric {
  label: string;
  value: number;
  trend: number;
  previousValue: number;
  format: 'currency' | 'number' | 'percentage';
  icon: 'dollar' | 'users' | 'trophy' | 'chart';
}
```

**Usage:**

```tsx
import { KPICards } from '@/components/analytics';

<KPICards
  metrics={[
    {
      label: 'Monthly Recurring Revenue',
      value: 45000,
      trend: 12.5,
      previousValue: 40000,
      format: 'currency',
      icon: 'dollar',
    },
  ]}
/>;
```

### 2. Date Range Picker (`DateRangePicker.tsx`)

**Purpose:** Allow users to select date ranges for filtering analytics

**Features:**

- Predefined ranges (Last 7/30/90 days)
- Custom date picker
- Dropdown interface
- URL param persistence (future)

**Props:**

```typescript
interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'last7days' | 'last30days' | 'last90days' | 'custom';
}
```

**Usage:**

```tsx
import { DateRangePicker } from '@/components/analytics';

const [dateRange, setDateRange] = useState(getDefaultDateRange());

<DateRangePicker value={dateRange} onChange={setDateRange} />;
```

### 3. Chart Container (`ChartContainer.tsx`)

**Purpose:** Reusable wrapper for all charts with consistent styling

**Features:**

- Title and description
- Loading states
- Error handling
- Refresh button
- Export button (placeholder)
- Responsive design

**Props:**

```typescript
interface ChartContainerProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  onExport?: () => void;
  children: React.ReactNode;
}
```

**Usage:**

```tsx
import { ChartContainer } from '@/components/analytics';

<ChartContainer
  title="Revenue Trend"
  description="Daily revenue over time"
  isLoading={isLoading}
  error={error}
  onRefresh={() => mutate()}
>
  <ResponsiveContainer>{/* Chart component */}</ResponsiveContainer>
</ChartContainer>;
```

### 4. Revenue Analytics (`RevenueAnalytics.tsx`)

**Purpose:** Display revenue metrics and visualizations

**Visualizations:**

1. **Line Chart** - Revenue trend over time
2. **Bar Chart** - Revenue by payment type
3. **Pie Chart** - Revenue by tournament format
4. **Gauge Chart** - Payment success rate (custom SVG)

**Data Source:** `/api/analytics/revenue`

**Features:**

- Responsive Recharts visualizations
- Interactive tooltips
- Legend toggles
- Currency formatting
- Real-time data with SWR

**Props:**

```typescript
interface RevenueAnalyticsProps {
  dateRange: DateRange;
}
```

**Usage:**

```tsx
import { RevenueAnalytics } from '@/components/analytics';

<RevenueAnalytics dateRange={dateRange} />;
```

### 5. User Analytics (`UserAnalytics.tsx`)

**Purpose:** Display user growth and cohort retention analysis

**Visualizations:**

1. **Area Chart** - User growth over time
2. **Cohort Heatmap** - Retention matrix (D3.js)
3. **Line Chart** - LTV by cohort
4. **Summary Cards** - Total/Active users, Retention rate

**Data Sources:**

- `/api/analytics/users`
- `/api/analytics/cohorts`

**Features:**

- D3.js heatmap for cohort retention
- Interactive tooltips with retention percentages
- Cohort comparison
- Real-time updates

**Props:**

```typescript
interface UserAnalyticsProps {
  dateRange: DateRange;
}
```

**Usage:**

```tsx
import { UserAnalytics } from '@/components/analytics';

<UserAnalytics dateRange={dateRange} />;
```

### 6. Tournament Analytics (`TournamentAnalytics.tsx`)

**Purpose:** Display tournament performance and activity patterns

**Visualizations:**

1. **Bar Chart** - Attendance by format
2. **Line Chart** - Completion rate trend
3. **Activity Heatmap** - Day/time activity matrix (D3.js)
4. **Summary Cards** - Active/Completed tournaments, Avg attendance

**Data Source:** `/api/analytics/tournaments`

**Features:**

- D3.js heatmap for activity patterns
- Format comparison
- Day of week analysis
- Time of day patterns

**Props:**

```typescript
interface TournamentAnalyticsProps {
  dateRange: DateRange;
}
```

**Usage:**

```tsx
import { TournamentAnalytics } from '@/components/analytics';

<TournamentAnalytics dateRange={dateRange} />;
```

### 7. Cohort Heatmap (`CohortHeatmap.tsx`)

**Purpose:** D3.js-based heatmap for cohort retention visualization

**Features:**

- Color-coded retention percentages
- Interactive tooltips
- Cohort size display
- Axis labels
- Responsive design

**Props:**

```typescript
interface CohortHeatmapProps {
  data: CohortData[];
  width?: number;
  height?: number;
}

interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionByMonth: number[];
  ltv: number;
}
```

**Usage:**

```tsx
import { CohortHeatmap } from '@/components/analytics';

<CohortHeatmap data={cohortData} width={800} height={400} />;
```

### 8. Activity Heatmap (`ActivityHeatmap.tsx`)

**Purpose:** D3.js-based heatmap for tournament activity by day/time

**Features:**

- 7 days x 24 hours grid
- Color scale based on activity
- Interactive tooltips
- Legend with gradient
- Responsive design

**Props:**

```typescript
interface ActivityHeatmapProps {
  data: HeatmapCell[];
  width?: number;
  height?: number;
}

interface HeatmapCell {
  row: number; // Day of week (0-6)
  col: number; // Hour of day (0-23)
  value: number; // Activity count
  label?: string;
}
```

**Usage:**

```tsx
import { ActivityHeatmap } from '@/components/analytics';

<ActivityHeatmap data={activityData} width={900} height={300} />;
```

### 9. Loading States (`LoadingStates.tsx`)

**Purpose:** Skeleton loaders and error states

**Components:**

- `ChartSkeleton` - Animated placeholder for charts
- `KPISkeleton` - Skeleton for KPI cards
- `GridSkeleton` - Grid of skeleton cards
- `ErrorState` - Error display with retry
- `EmptyState` - No data placeholder

**Usage:**

```tsx
import { ChartSkeleton, ErrorState, EmptyState } from '@/components/analytics';

{
  isLoading && <ChartSkeleton />;
}
{
  error && <ErrorState error={error} onRetry={mutate} />;
}
{
  !data && <EmptyState title="No data available" />;
}
```

## Data Fetching Pattern

All components use SWR for data fetching:

```tsx
'use client';

import useSWR from 'swr';
import { fetcher, buildQueryString } from '@/components/analytics/fetcher';

export function MyAnalyticsComponent({ dateRange }: Props) {
  const params = {
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  };

  const { data, error, isLoading, mutate } = useSWR(
    `/api/analytics/revenue${buildQueryString(params)}`,
    fetcher
  );

  if (isLoading) return <ChartSkeleton />;
  if (error) return <ErrorState error={error} />;

  return <Chart data={data} />;
}
```

## Responsive Design

### Breakpoints

- **Mobile** (< 768px): Single column, stacked charts
- **Tablet** (768px - 1024px): 2-column grid
- **Desktop** (> 1024px): 3-4 column grid

### Grid Layouts

```tsx
// KPI Cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Charts
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```

### Chart Heights

All charts use fixed height of 300px within ResponsiveContainer:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>{/* Chart config */}</LineChart>
</ResponsiveContainer>
```

## Styling

### Tailwind Classes

- **Dark mode support**: All components use `dark:` variants
- **Color scheme**: Blue primary, Green success, Red error
- **Shadows**: `shadow` and `hover:shadow-lg`
- **Borders**: `border border-gray-200 dark:border-gray-700`

### Chart Colors

```typescript
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
```

## Main Dashboard Page

**File:** `app/(dashboard)/analytics/page.tsx`

**Features:**

- Tab navigation (Overview, Revenue, Users, Tournaments)
- KPI cards visible on all tabs
- Date range picker in header
- Sticky header
- Responsive layout
- Real-time updates

**Usage:**

```tsx
// Navigate to /analytics
// Select date range
// Switch between tabs
```

## API Integration

### Expected API Endpoints

```
GET /api/analytics/revenue?startDate=...&endDate=...&periodType=day
GET /api/analytics/users?startDate=...&endDate=...
GET /api/analytics/cohorts?startDate=...&endDate=...
GET /api/analytics/tournaments?startDate=...&endDate=...
```

### Expected Response Formats

**Revenue API:**

```typescript
{
  mrr: number;
  arr: number;
  mrrTrend: number;
  arrTrend: number;
  paymentSuccessRate: number;
  revenueByType: {
    type: string;
    amount: number;
  }
  [];
  revenueByFormat: {
    format: string;
    amount: number;
  }
  [];
  revenueOverTime: {
    date: string;
    revenue: number;
    transactions: number;
  }
  [];
}
```

**Users API:**

```typescript
{
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  userGrowth: {
    date: string;
    count: number;
  }
  [];
}
```

**Cohorts API:**

```typescript
{
  cohorts: {
    cohortMonth: string;
    cohortSize: number;
    retentionByMonth: number[];
    ltv: number;
  }[];
}
```

**Tournaments API:**

```typescript
{
  activeTournaments: number;
  completedTournaments: number;
  averageAttendance: number;
  completionRate: number;
  completionRateTrend: number;
  attendanceByFormat: {
    format: string;
    attendance: number;
  }
  [];
  activityHeatmap: {
    row: number;
    col: number;
    value: number;
  }
  [];
}
```

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
// Import types
import type {
  KPIMetric,
  DateRange,
  RevenueMetrics,
  UserMetrics,
  TournamentMetrics,
  CohortData,
  HeatmapCell,
} from '@/components/analytics/types';
```

## Testing

### Unit Tests (Future)

```typescript
// Example test
describe('KPICards', () => {
  it('renders metrics correctly', () => {
    render(<KPICards metrics={mockMetrics} />);
    expect(screen.getByText('Monthly Recurring Revenue')).toBeInTheDocument();
  });

  it('shows trend indicators', () => {
    render(<KPICards metrics={mockMetrics} />);
    expect(screen.getByText(/12.5%/)).toBeInTheDocument();
  });
});
```

### Integration Tests (Future)

Test data fetching and error states with SWR.

## Performance Optimization

### SWR Caching

```typescript
// SWR automatically caches data and revalidates
const { data } = useSWR('/api/analytics/revenue', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 minute
});
```

### D3 Cleanup

```typescript
useEffect(() => {
  // Render D3 chart

  return () => {
    // Cleanup tooltips
    d3.selectAll('.tooltip').remove();
  };
}, [data]);
```

### Responsive Container

Recharts ResponsiveContainer automatically handles resizing.

## Accessibility

- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast ratios meet WCAG AA
- Tooltips for context

## Future Enhancements

1. **Export functionality** - CSV/PDF export
2. **URL state persistence** - Store date range in URL
3. **Comparison mode** - Compare two date ranges
4. **Alerts** - Set thresholds and alerts
5. **Annotations** - Mark important events on charts
6. **Custom metrics** - User-defined KPIs
7. **Real-time updates** - WebSocket integration
8. **Advanced filtering** - Filter by format, region, etc.

## Dependencies

```json
{
  "dependencies": {
    "recharts": "^3.3.0",
    "d3": "^7.9.0",
    "d3-scale": "^4.0.2",
    "d3-scale-chromatic": "^3.1.0",
    "swr": "^2.3.6"
  },
  "devDependencies": {
    "@types/d3": "^7.4.3",
    "@types/d3-scale": "^4.0.9",
    "@types/d3-scale-chromatic": "^3.1.0"
  }
}
```

## License

Internal use only - Tournament Platform Analytics Dashboard
