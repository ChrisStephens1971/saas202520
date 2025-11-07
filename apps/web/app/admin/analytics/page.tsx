/**
 * Admin Analytics Overview Page
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MetricsCard, MetricsCardGroup } from '@/components/admin/MetricsCard';
import { DateRangePicker, useDateRange } from '@/components/admin/DateRangePicker';
import {
  UserGrowthChart,
  TournamentActivityChart,
  MatchCompletionChart,
  RevenueTrendsChart,
} from '@/components/admin/AnalyticsCharts';
import { ExportButton } from '@/components/admin/ExportButton';

interface AnalyticsOverview {
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
  };
  charts: {
    userGrowth: Array<{ date: string; users: number; activeUsers: number }>;
    tournamentActivity: Array<{ date: string; created: number; completed: number }>;
    matchStatus: Array<{ name: string; value: number }>;
    revenue: Array<{ date: string; revenue: number }>;
  };
}

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useDateRange('last30days');
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        compareWithPrevious: dateRange.compareWithPrevious?.toString() || 'false',
      });
      // eslint-disable-next-line no-undef
      const response = await fetch(`/api/admin/analytics/overview?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics data');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange.start, dateRange.end, dateRange.compareWithPrevious]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white/20 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-white/10 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-gray-300">System-wide metrics and insights</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {analytics && (
              <ExportButton
                data={Object.entries(analytics.metrics).map(([key, value]) => ({ Metric: key, Value: value }))}
                filename={`analytics-overview-${new Date().toISOString().split('T')[0]}`}
                formats={['csv', 'xlsx', 'pdf']}
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/analytics" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">Overview</Link>
          <Link href="/admin/analytics/users" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Users</Link>
          <Link href="/admin/analytics/tournaments" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Tournaments</Link>
          <Link href="/admin/analytics/performance" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Performance</Link>
        </div>

        <DateRangePicker value={dateRange} onChange={setDateRange} allowComparison={true} />

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error Loading Analytics</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analytics && (
          <>
            <MetricsCardGroup columns={4}>
              <MetricsCard title="Total Users" value={analytics.metrics.totalUsers} currentValue={analytics.metrics.totalUsers} previousValue={analytics.metrics.previousTotalUsers} format="number" />
              <MetricsCard title="Active Users (DAU)" value={analytics.metrics.activeUsers} currentValue={analytics.metrics.activeUsers} previousValue={analytics.metrics.previousActiveUsers} format="number" variant="success" />
              <MetricsCard title="Total Tournaments" value={analytics.metrics.totalTournaments} currentValue={analytics.metrics.totalTournaments} previousValue={analytics.metrics.previousTotalTournaments} format="number" description={`${analytics.metrics.activeTournaments} active`} />
              <MetricsCard title="Matches Played" value={analytics.metrics.matchesPlayed} currentValue={analytics.metrics.matchesPlayed} previousValue={analytics.metrics.previousMatchesPlayed} format="number" />
            </MetricsCardGroup>

            <MetricsCardGroup columns={3}>
              <MetricsCard title="Revenue" value={analytics.metrics.revenue} currentValue={analytics.metrics.revenue} previousValue={analytics.metrics.previousRevenue} format="currency" variant="success" />
              <MetricsCard title="System Uptime" value={analytics.metrics.systemUptime} format="percentage" variant={analytics.metrics.systemUptime >= 99.9 ? 'success' : 'warning'} />
              <MetricsCard title="Error Rate" value={analytics.metrics.errorRate} format="percentage" variant={analytics.metrics.errorRate < 1 ? 'success' : 'danger'} />
            </MetricsCardGroup>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UserGrowthChart data={analytics.charts.userGrowth} title="User Growth Over Time" showActiveUsers={true} />
              <TournamentActivityChart data={analytics.charts.tournamentActivity} title="Tournament Activity" />
              <MatchCompletionChart data={analytics.charts.matchStatus} title="Match Status Distribution" />
              <RevenueTrendsChart data={analytics.charts.revenue} title="Revenue Trends" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
