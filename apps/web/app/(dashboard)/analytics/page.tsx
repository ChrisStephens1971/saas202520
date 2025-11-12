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

// TypeScript interfaces for API responses
interface RevenueData {
  mrr: number;
  mrrTrend: number;
  arr: number;
  arrTrend: number;
  totalRevenue: number;
  growth: number;
}

interface UserData {
  activeUsers: number;
  retentionRate: number;
  totalUsers: number;
  newUsers: number;
  churnRate: number;
}

interface TournamentData {
  activeTournaments: number;
  completionRateTrend: number;
  totalTournaments: number;
  completionRate: number;
  avgDuration: number;
}

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

  const { data: revenueData } = useSWR<RevenueData>(
    `/api/analytics/revenue${buildQueryString(params)}`,
    fetcher
  );

  const { data: userData } = useSWR<UserData>(
    `/api/analytics/users${buildQueryString(params)}`,
    fetcher
  );

  const { data: tournamentData } = useSWR<TournamentData>(
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 text-gray-900 dark:text-white">
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8">Analytics Dashboard</h1>

        {/* Date Range Picker */}
        <div className="mb-8 flex justify-end">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* KPI Cards */}
        <KPICards metrics={kpiMetrics} />

        {/* Tab Navigation */}
        <div className="mt-8 mb-4 flex space-x-4 border-b border-gray-300 dark:border-white/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-4 transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RevenueAnalytics dateRange={dateRange} />
              <UserAnalytics dateRange={dateRange} />
              <div className="lg:col-span-2">
                <TournamentAnalytics dateRange={dateRange} />
              </div>
            </div>
          )}

          {activeTab === 'revenue' && <RevenueAnalytics dateRange={dateRange} />}

          {activeTab === 'users' && <UserAnalytics dateRange={dateRange} />}

          {activeTab === 'tournaments' && <TournamentAnalytics dateRange={dateRange} />}
        </div>
      </div>
    </div>
  );
}