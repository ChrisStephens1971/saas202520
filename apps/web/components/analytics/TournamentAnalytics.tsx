/**
 * Tournament Analytics Component
 * Displays tournament performance metrics and activity patterns
 */

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import useSWR from 'swr';
import { fetcher, buildQueryString } from './fetcher';
import { ChartContainer } from './ChartContainer';
import { ActivityHeatmap } from './ActivityHeatmap';
import { DateRange, TournamentMetrics } from './types';

interface TournamentAnalyticsProps {
  dateRange: DateRange;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function TournamentAnalytics({ dateRange }: TournamentAnalyticsProps) {
  const params = {
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
  };

  const { data, error, isLoading, mutate } = useSWR<TournamentMetrics>(
    `/api/analytics/tournaments${buildQueryString(params)}`,
    fetcher
  );

  return (
    <div className="space-y-6">
      {/* Tournament Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Active Tournaments
          </h4>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {data?.activeTournaments || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Currently in progress
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Completed
          </h4>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {data?.completedTournaments || 0}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            In selected period
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Avg Attendance
          </h4>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {(data?.averageAttendance || 0).toFixed(1)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Players per tournament
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Completion Rate
          </h4>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {(data?.completionRate || 0).toFixed(1)}%
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-sm font-medium ${
                (data?.completionRateTrend || 0) >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {(data?.completionRateTrend || 0) >= 0 ? '+' : ''}
              {(data?.completionRateTrend || 0).toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              vs previous
            </span>
          </div>
        </div>
      </div>

      {/* Attendance by Format */}
      <ChartContainer
        title="Attendance by Tournament Format"
        description="Average attendance across different tournament formats"
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data?.attendanceByFormat || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="format" />
            <YAxis tickFormatter={formatNumber} />
            <Tooltip formatter={(value: number) => formatNumber(value)} />
            <Legend />
            <Bar dataKey="attendance" name="Average Attendance">
              {(data?.attendanceByFormat || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Completion Rate Trend */}
      <ChartContainer
        title="Completion Rate Trend"
        description="Tournament completion rate over time"
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={[
              { date: '2024-01', rate: 85 },
              { date: '2024-02', rate: 88 },
              { date: '2024-03', rate: 90 },
              { date: '2024-04', rate: 87 },
              { date: '2024-05', rate: 92 },
              { date: '2024-06', rate: 94 },
            ]}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#ff8042"
              strokeWidth={2}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
              name="Completion Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Tournament Activity Heatmap */}
      <ChartContainer
        title="Tournament Activity Heatmap"
        description="Tournament activity patterns by day of week and time of day"
        isLoading={isLoading}
        error={error}
        onRefresh={() => mutate()}
      >
        {data?.activityHeatmap && data.activityHeatmap.length > 0 ? (
          <ActivityHeatmap data={data.activityHeatmap} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            No activity data available
          </div>
        )}
      </ChartContainer>

      {/* Format Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Format Performance
          </h3>
          <div className="space-y-4">
            {(data?.attendanceByFormat || []).map((format, index) => (
              <div key={format.format}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {format.format}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {format.attendance} players
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (format.attendance /
                          Math.max(
                            ...(data?.attendanceByFormat || []).map(
                              (f) => f.attendance
                            )
                          )) *
                        100
                      }%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Key Insights
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {(data?.completionRate || 0) >= 90
                  ? 'Excellent completion rate - tournaments are running smoothly'
                  : 'Completion rate could be improved - review abandoned tournaments'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Most popular format:{' '}
                <strong>
                  {
                    (data?.attendanceByFormat || []).sort(
                      (a, b) => b.attendance - a.attendance
                    )[0]?.format
                  }
                </strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Average {(data?.averageAttendance || 0).toFixed(0)} players per
                tournament
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
