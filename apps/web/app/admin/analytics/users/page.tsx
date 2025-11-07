/**
 * User Analytics Page
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * User-specific analytics including:
 * - Registration trends
 * - Active users (DAU/WAU/MAU)
 * - User engagement metrics
 * - Role distribution
 * - Retention rates
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MetricsCard, MetricsCardGroup } from '@/components/admin/MetricsCard';
import { DateRangePicker, useDateRange } from '@/components/admin/DateRangePicker';
import {
  UserGrowthChart,
  EngagementChart,
  RoleDistributionChart,
} from '@/components/admin/AnalyticsCharts';
import { ExportButton } from '@/components/admin/ExportButton';

interface UserAnalytics {
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
  };
  charts: {
    registrations: Array<{ date: string; users: number }>;
    engagement: Array<{ date: string; dau: number; wau: number; mau: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    cohortRetention: Array<{ cohort: string; week1: number; week2: number; week3: number; week4: number }>;
  };
}

export default function UserAnalyticsPage() {
  const [dateRange, setDateRange] = useDateRange('last30days');
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
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
      });
      // eslint-disable-next-line no-undef
      const response = await fetch(`/api/admin/analytics/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch user analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching user analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange.start, dateRange.end]);

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
            <h1 className="text-4xl font-bold text-white mb-2">User Analytics</h1>
            <p className="text-gray-300">Registration, engagement, and retention metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50">
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {analytics && <ExportButton data={Object.entries(analytics.metrics).map(([key, value]) => ({ Metric: key, Value: value }))} filename={`user-analytics-${new Date().toISOString().split('T')[0]}`} formats={['csv', 'xlsx', 'pdf']} />}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/analytics" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Overview</Link>
          <Link href="/admin/analytics/users" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">Users</Link>
          <Link href="/admin/analytics/tournaments" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Tournaments</Link>
          <Link href="/admin/analytics/performance" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Performance</Link>
        </div>

        <DateRangePicker value={dateRange} onChange={setDateRange} allowComparison={false} />

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error Loading User Analytics</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analytics && (
          <>
            <MetricsCardGroup columns={4}>
              <MetricsCard title="Total Users" value={analytics.metrics.totalUsers} currentValue={analytics.metrics.totalUsers} previousValue={analytics.metrics.previousTotalUsers} format="number" />
              <MetricsCard title="New Users" value={analytics.metrics.newUsers} currentValue={analytics.metrics.newUsers} previousValue={analytics.metrics.previousNewUsers} format="number" variant="success" />
              <MetricsCard title="Daily Active Users" value={analytics.metrics.dailyActiveUsers} currentValue={analytics.metrics.dailyActiveUsers} previousValue={analytics.metrics.previousDailyActiveUsers} format="number" />
              <MetricsCard title="Weekly Active Users" value={analytics.metrics.weeklyActiveUsers} format="number" description="Last 7 days" />
            </MetricsCardGroup>

            <MetricsCardGroup columns={4}>
              <MetricsCard title="Monthly Active Users" value={analytics.metrics.monthlyActiveUsers} format="number" description="Last 30 days" />
              <MetricsCard title="Retention Rate" value={analytics.metrics.retentionRate} currentValue={analytics.metrics.retentionRate} previousValue={analytics.metrics.previousRetentionRate} format="percentage" variant="success" />
              <MetricsCard title="Avg Session Duration" value={analytics.metrics.avgSessionDuration} format="duration" />
              <MetricsCard title="Churn Rate" value={analytics.metrics.churnRate} format="percentage" variant={analytics.metrics.churnRate < 5 ? 'success' : 'warning'} />
            </MetricsCardGroup>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UserGrowthChart data={analytics.charts.registrations.map(r => ({ date: r.date, users: r.users, activeUsers: 0 }))} title="User Registrations" showActiveUsers={false} />
              <EngagementChart data={analytics.charts.engagement} title="User Engagement (DAU/WAU/MAU)" />
              <RoleDistributionChart data={analytics.charts.roleDistribution} title="User Role Distribution" />
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Cohort Retention Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-white">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left p-2">Cohort</th>
                        <th className="text-center p-2">Week 1</th>
                        <th className="text-center p-2">Week 2</th>
                        <th className="text-center p-2">Week 3</th>
                        <th className="text-center p-2">Week 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.charts.cohortRetention.map((cohort, i) => (
                        <tr key={i} className="border-b border-white/10">
                          <td className="p-2">{cohort.cohort}</td>
                          <td className="text-center p-2">{cohort.week1.toFixed(1)}%</td>
                          <td className="text-center p-2">{cohort.week2.toFixed(1)}%</td>
                          <td className="text-center p-2">{cohort.week3.toFixed(1)}%</td>
                          <td className="text-center p-2">{cohort.week4.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">User Growth Rate</p>
                  <p className="text-white text-lg font-semibold">{analytics.metrics.newUsers > 0 && analytics.metrics.previousNewUsers > 0 ? ((analytics.metrics.newUsers - analytics.metrics.previousNewUsers) / analytics.metrics.previousNewUsers * 100).toFixed(1) : '0'}% vs previous period</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">DAU/MAU Ratio</p>
                  <p className="text-white text-lg font-semibold">{analytics.metrics.monthlyActiveUsers > 0 ? ((analytics.metrics.dailyActiveUsers / analytics.metrics.monthlyActiveUsers) * 100).toFixed(1) : '0'}% engagement</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Average Retention</p>
                  <p className="text-white text-lg font-semibold">{analytics.metrics.retentionRate.toFixed(1)}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">User Status</p>
                  <p className="text-white text-lg font-semibold">{((analytics.metrics.dailyActiveUsers / analytics.metrics.totalUsers) * 100).toFixed(1)}% active today</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
