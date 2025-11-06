/**
 * Analytics Dashboard Page
 * Main analytics dashboard with KPIs and visualizations
 */

'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { KPICards } from '@/components/analytics/KPICards';
import { RevenueAnalytics } from '@/components/analytics/RevenueAnalytics';
import { UserAnalytics } from '@/components/analytics/UserAnalytics';
import { TournamentAnalytics } from '@/components/analytics/TournamentAnalytics';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { fetcher, buildQueryString } from '@/components/analytics/fetcher';
import { DateRange, KPIMetric } from '@/components/analytics/types';

type TabType = 'overview' | 'revenue' | 'users' | 'tournaments';

function getDefaultDateRange(): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  return {
    startDate,
    endDate,
    preset: 'last30days',
  };
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  // Fetch KPI data
  const params = useMemo(
    () => ({
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    }),
    [dateRange]
  );

  const { data: revenueData } = useSWR(
    `/api/analytics/revenue${buildQueryString(params)}`,
    fetcher
  );

  const { data: userData } = useSWR(
    `/api/analytics/users${buildQueryString(params)}`,
    fetcher
  );

  const { data: tournamentData } = useSWR(
    `/api/analytics/tournaments${buildQueryString(params)}`,
    fetcher
  );

  const kpiMetrics: KPIMetric[] = useMemo(
    () => [
      {
        label: 'Monthly Recurring Revenue',
        value: revenueData?.mrr || 0,
        trend: revenueData?.mrrTrend || 0,
        previousValue: 0,
        format: 'currency',
        icon: 'dollar',
      },
      {
        label: 'Annual Recurring Revenue',
        value: revenueData?.arr || 0,
        trend: revenueData?.arrTrend || 0,
        previousValue: 0,
        format: 'currency',
        icon: 'chart',
      },
      {
        label: 'Active Tournaments',
        value: tournamentData?.activeTournaments || 0,
        trend: tournamentData?.completionRateTrend || 0,
        previousValue: 0,
        format: 'number',
        icon: 'trophy',
      },
      {
        label: 'Active Players',
        value: userData?.activeUsers || 0,
        trend: userData?.retentionRate || 0,
        previousValue: 0,
        format: 'number',
        icon: 'users',
      },
    ],
    [revenueData, userData, tournamentData]
  );

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'revenue' as const, label: 'Revenue', icon: '💰' },
    { id: 'users' as const, label: 'Users', icon: '👥' },
    { id: 'tournaments' as const, label: 'Tournaments', icon: '🏆' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Analytics Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track your tournament platform performance
              </p>
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards - Show on all tabs */}
        <div className="mb-8">
          <KPICards metrics={kpiMetrics} />
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Revenue Overview
              </h2>
              <RevenueAnalytics dateRange={dateRange} />
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                User Overview
              </h2>
              <UserAnalytics dateRange={dateRange} />
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Tournament Overview
              </h2>
              <TournamentAnalytics dateRange={dateRange} />
            </section>
          </div>
        )}

        {activeTab === 'revenue' && <RevenueAnalytics dateRange={dateRange} />}

        {activeTab === 'users' && <UserAnalytics dateRange={dateRange} />}

        {activeTab === 'tournaments' && (
          <TournamentAnalytics dateRange={dateRange} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Data is updated in real-time. Last updated:{' '}
            {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
