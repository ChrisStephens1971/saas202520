/**
 * User Analytics Component
 * Displays user growth and cohort analysis
 */

'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useSWR from 'swr';
import { fetcher, buildQueryString } from './fetcher';
import { ChartContainer } from './ChartContainer';
import { CohortHeatmap } from './CohortHeatmap';
import { DateRange, UserMetrics } from './types';

interface UserAnalyticsProps {
  dateRange: DateRange;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
}

export function UserAnalytics({ dateRange }: UserAnalyticsProps) {
  const params = {
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  };

  const { data, error, isLoading, mutate } = useSWR<UserMetrics>(
    `/api/analytics/users${buildQueryString(params)}`,
    fetcher
  );

  const {
    data: cohortData,
    error: cohortError,
    isLoading: cohortLoading,
    mutate: mutateCohort,
  } = useSWR(`/api/analytics/cohorts${buildQueryString(params)}`, fetcher);

  return (
    <div className="space-y-6">
      {/* User Growth Over Time */}
      <ChartContainer
        title="User Growth"
        description="Total and active users over time"
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data?.userGrowth || []}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <YAxis tickFormatter={formatNumber} />
            <Tooltip
              formatter={(value: number) => formatNumber(value)}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              }
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#8884d8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUsers)"
              name="Total Users"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Cohort Retention Heatmap */}
      <ChartContainer
        title="Cohort Retention Analysis"
        description="User retention by cohort month"
        isLoading={cohortLoading}
        error={cohortError}
        onRefresh={() => mutateCohort()}
      >
        {(cohortData as any)?.cohorts && (cohortData as any).cohorts.length > 0 ? (
          <CohortHeatmap data={(cohortData as any).cohorts} />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No cohort data available
          </div>
        )}
      </ChartContainer>

      {/* LTV by Cohort */}
      <ChartContainer
        title="Lifetime Value by Cohort"
        description="Average LTV for each user cohort"
        isLoading={cohortLoading}
        error={cohortError}
        onRefresh={() => mutateCohort()}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={(cohortData as any)?.cohorts || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cohortMonth" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Cohort: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ltv"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
              name="Average LTV"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* User Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Users</h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(data?.totalUsers || 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">All time registrations</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Active Users
          </h4>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatNumber(data?.activeUsers || 0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Active in selected period</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Retention Rate
          </h4>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {(data?.retentionRate || 0).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">30-day retention</p>
        </div>
      </div>
    </div>
  );
}
