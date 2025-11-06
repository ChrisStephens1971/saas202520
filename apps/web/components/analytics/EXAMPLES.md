# Analytics Components - Usage Examples

Complete examples for using all analytics dashboard components.

## Basic Setup

### 1. Import Components

```typescript
import {
  KPICards,
  DateRangePicker,
  RevenueAnalytics,
  UserAnalytics,
  TournamentAnalytics,
  ChartContainer,
} from '@/components/analytics';
```

### 2. Set Up Date Range

```typescript
'use client';

import { useState } from 'react';
import { DateRange } from '@/components/analytics/types';

function getDefaultDateRange(): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  return { startDate, endDate, preset: 'last30days' };
}

export function MyDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  return (
    <div>
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      {/* Other components */}
    </div>
  );
}
```

## KPI Cards Example

```typescript
'use client';

import { KPICards } from '@/components/analytics';
import { KPIMetric } from '@/components/analytics/types';

export function DashboardKPIs() {
  const metrics: KPIMetric[] = [
    {
      label: 'Monthly Recurring Revenue',
      value: 45000,
      trend: 12.5,
      previousValue: 40000,
      format: 'currency',
      icon: 'dollar',
    },
    {
      label: 'Annual Recurring Revenue',
      value: 540000,
      trend: 15.2,
      previousValue: 468000,
      format: 'currency',
      icon: 'chart',
    },
    {
      label: 'Active Tournaments',
      value: 24,
      trend: 8.5,
      previousValue: 22,
      format: 'number',
      icon: 'trophy',
    },
    {
      label: 'Active Players',
      value: 1247,
      trend: -2.1,
      previousValue: 1274,
      format: 'number',
      icon: 'users',
    },
  ];

  return <KPICards metrics={metrics} />;
}
```

## Custom Chart with Chart Container

```typescript
'use client';

import useSWR from 'swr';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/analytics';
import { fetcher } from '@/components/analytics/fetcher';

export function CustomRevenueChart() {
  const { data, error, isLoading, mutate } = useSWR('/api/custom/revenue', fetcher);

  return (
    <ChartContainer
      title="Custom Revenue Chart"
      description="Revenue by custom metric"
      isLoading={isLoading}
      error={error}
      onRefresh={() => mutate()}
      onExport={() => console.log('Export data', data)}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data?.results || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="amount" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
```

## Complete Dashboard Page

```typescript
'use client';

import { useState } from 'react';
import {
  KPICards,
  DateRangePicker,
  RevenueAnalytics,
  UserAnalytics,
  TournamentAnalytics,
} from '@/components/analytics';
import { DateRange, KPIMetric } from '@/components/analytics/types';

function getDefaultDateRange(): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  return { startDate, endDate, preset: 'last30days' };
}

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const kpiMetrics: KPIMetric[] = [
    {
      label: 'MRR',
      value: 45000,
      trend: 12.5,
      previousValue: 40000,
      format: 'currency',
      icon: 'dollar',
    },
    // ... more metrics
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your platform performance</p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* KPIs */}
        <KPICards metrics={kpiMetrics} />

        {/* Revenue Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Revenue Analysis</h2>
          <RevenueAnalytics dateRange={dateRange} />
        </section>

        {/* Users Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">User Growth</h2>
          <UserAnalytics dateRange={dateRange} />
        </section>

        {/* Tournaments Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Tournament Performance</h2>
          <TournamentAnalytics dateRange={dateRange} />
        </section>
      </div>
    </div>
  );
}
```

## Tab-Based Dashboard

```typescript
'use client';

import { useState } from 'react';
import {
  KPICards,
  DateRangePicker,
  RevenueAnalytics,
  UserAnalytics,
  TournamentAnalytics,
} from '@/components/analytics';

type TabType = 'overview' | 'revenue' | 'users' | 'tournaments';

export default function TabbedDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'revenue' as const, label: 'Revenue' },
    { id: 'users' as const, label: 'Users' },
    { id: 'tournaments' as const, label: 'Tournaments' },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <RevenueAnalytics dateRange={dateRange} />
            <UserAnalytics dateRange={dateRange} />
            <TournamentAnalytics dateRange={dateRange} />
          </div>
        )}

        {activeTab === 'revenue' && <RevenueAnalytics dateRange={dateRange} />}
        {activeTab === 'users' && <UserAnalytics dateRange={dateRange} />}
        {activeTab === 'tournaments' && <TournamentAnalytics dateRange={dateRange} />}
      </div>
    </div>
  );
}
```

## Custom Heatmap Example

```typescript
'use client';

import { CohortHeatmap, ActivityHeatmap } from '@/components/analytics';
import { CohortData, HeatmapCell } from '@/components/analytics/types';

export function CustomHeatmaps() {
  // Cohort data
  const cohortData: CohortData[] = [
    {
      cohortMonth: '2024-01',
      cohortSize: 120,
      retentionByMonth: [100, 85, 72, 65, 58, 52],
      ltv: 450,
    },
    {
      cohortMonth: '2024-02',
      cohortSize: 145,
      retentionByMonth: [100, 88, 75, 68, 62],
      ltv: 480,
    },
    // ... more cohorts
  ];

  // Activity data (7 days x 24 hours)
  const activityData: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      activityData.push({
        row: day,
        col: hour,
        value: Math.floor(Math.random() * 50), // Random activity
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Cohort Retention</h2>
        <CohortHeatmap data={cohortData} width={800} height={400} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Activity Patterns</h2>
        <ActivityHeatmap data={activityData} width={900} height={300} />
      </div>
    </div>
  );
}
```

## Loading and Error States

```typescript
'use client';

import useSWR from 'swr';
import { ChartContainer } from '@/components/analytics';
import { ErrorState, ChartSkeleton, EmptyState } from '@/components/analytics/LoadingStates';
import { fetcher } from '@/components/analytics/fetcher';

export function DataChart() {
  const { data, error, isLoading, mutate } = useSWR('/api/data', fetcher);

  // Using ChartContainer (handles loading/error automatically)
  return (
    <ChartContainer
      title="My Chart"
      isLoading={isLoading}
      error={error}
      onRefresh={() => mutate()}
    >
      {data?.items.length === 0 ? (
        <EmptyState title="No data available" description="Try a different date range" />
      ) : (
        // Your chart component
        <div>Chart here</div>
      )}
    </ChartContainer>
  );
}

// OR manual handling
export function ManualErrorHandling() {
  const { data, error, isLoading } = useSWR('/api/data', fetcher);

  if (isLoading) return <ChartSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data || data.length === 0) {
    return <EmptyState title="No data" />;
  }

  return <div>Chart with {data.length} items</div>;
}
```

## Formatting Utilities

```typescript
// Currency formatting
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
}

// Short currency (K/M)
function formatShortCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

// Number formatting
function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

// Percentage
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```

## Building Query Strings

```typescript
import { buildQueryString } from '@/components/analytics/fetcher';

// Example 1: Basic params
const params = {
  startDate: new Date('2024-01-01').toISOString(),
  endDate: new Date('2024-01-31').toISOString(),
};

const url = `/api/analytics/revenue${buildQueryString(params)}`;
// Result: /api/analytics/revenue?startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-31T23:59:59.999Z

// Example 2: With optional params
const params2 = {
  startDate: dateRange.startDate.toISOString(),
  endDate: dateRange.endDate.toISOString(),
  periodType: 'month',
  format: 'single-elimination',
  tenantId: undefined, // Will be omitted
};

const url2 = `/api/analytics/tournaments${buildQueryString(params2)}`;
// Result: /api/analytics/tournaments?startDate=...&endDate=...&periodType=month&format=single-elimination
```

## Custom Color Schemes

```typescript
// Define custom colors
const CUSTOM_COLORS = {
  primary: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'],
  success: ['#065f46', '#059669', '#10b981', '#34d399'],
  warning: ['#92400e', '#d97706', '#f59e0b', '#fbbf24'],
  danger: ['#991b1b', '#dc2626', '#ef4444', '#f87171'],
};

// Use in chart
<Bar dataKey="amount">
  {data.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={CUSTOM_COLORS.primary[index % 4]} />
  ))}
</Bar>
```

## Dark Mode Support

All components support dark mode automatically via Tailwind's `dark:` variants:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  {/* Content automatically adapts to theme */}
</div>
```

## Responsive Charts

```typescript
// Mobile: Stack vertically
// Tablet: 2 columns
// Desktop: 3 columns

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <ChartContainer title="Chart 1">...</ChartContainer>
  <ChartContainer title="Chart 2">...</ChartContainer>
  <ChartContainer title="Chart 3">...</ChartContainer>
</div>

// For specific mobile layouts
<div className="block md:hidden">
  {/* Mobile-only content */}
</div>

<div className="hidden md:block">
  {/* Desktop-only content */}
</div>
```

## Real-Time Updates with SWR

```typescript
'use client';

import useSWR from 'swr';
import { fetcher } from '@/components/analytics/fetcher';

export function RealtimeChart() {
  const { data, error, isLoading } = useSWR(
    '/api/analytics/realtime',
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Live</span>
      </div>
      {/* Chart */}
    </div>
  );
}
```

## Export Functionality (Future)

```typescript
function exportToCSV(data: any[], filename: string) {
  const csv = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// Use in ChartContainer
<ChartContainer
  title="Revenue"
  onExport={() => exportToCSV(data, 'revenue.csv')}
>
  {/* Chart */}
</ChartContainer>
```

These examples cover all major use cases for the analytics dashboard components.
