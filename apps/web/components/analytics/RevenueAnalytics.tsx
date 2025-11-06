/**
 * Revenue Analytics Component
 * Displays revenue visualizations using Recharts
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
import { DateRange, RevenueMetrics } from './types';

interface RevenueAnalyticsProps {
  dateRange: DateRange;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatShortCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function RevenueAnalytics({ dateRange }: RevenueAnalyticsProps) {
  const params = {
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
    periodType: 'day',
  };

  const { data, error, isLoading, mutate } = useSWR<RevenueMetrics>(
    `/api/analytics/revenue${buildQueryString(params)}`,
    fetcher
  );

  return (
    <div className="space-y-6">
      {/* Revenue Trend Over Time */}
      <ChartContainer
        title="Revenue Trend"
        description="Daily revenue over the selected period"
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data?.revenueOverTime || []}>
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
            <YAxis tickFormatter={formatShortCurrency} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Revenue by Payment Type */}
      <ChartContainer
        title="Revenue by Payment Type"
        description="Breakdown of revenue by payment method"
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.revenueByType || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis tickFormatter={formatShortCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="amount" fill="#8884d8" name="Revenue">
              {(data?.revenueByType || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Tournament Format */}
        <ChartContainer
          title="Revenue by Format"
          description="Revenue distribution across tournament formats"
          isLoading={isLoading}
          error={error}
          onRefresh={() => mutate()}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.revenueByFormat || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ format, percent }) =>
                  `${format}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
                nameKey="format"
              >
                {(data?.revenueByFormat || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Payment Success Rate Gauge */}
        <ChartContainer
          title="Payment Success Rate"
          description="Percentage of successful payments"
          isLoading={isLoading}
          error={error}
          onRefresh={() => mutate()}
        >
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-48 h-48">
                  <circle
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="96"
                    cy="96"
                  />
                  <circle
                    className="text-green-600"
                    strokeWidth="12"
                    strokeDasharray={440}
                    strokeDashoffset={
                      440 - (440 * (data?.paymentSuccessRate || 0)) / 100
                    }
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="96"
                    cy="96"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dashoffset 0.5s ease',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    {data?.paymentSuccessRate.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Success Rate
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                {data?.paymentSuccessRate >= 95
                  ? 'Excellent payment reliability'
                  : data?.paymentSuccessRate >= 85
                  ? 'Good payment reliability'
                  : 'Review payment failures'}
              </p>
            </div>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}
