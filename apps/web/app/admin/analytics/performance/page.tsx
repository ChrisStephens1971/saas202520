/**
 * Performance Analytics Page
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * System performance metrics including:
 * - API response times
 * - Error rates
 * - Socket.io connection stats
 * - Database query performance
 * - System uptime
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MetricsCard, MetricsCardGroup } from '@/components/admin/MetricsCard';
import { DateRangePicker, useDateRange } from '@/components/admin/DateRangePicker';
import { PerformanceChart } from '@/components/admin/AnalyticsCharts';
import { ExportButton } from '@/components/admin/ExportButton';

interface PerformanceAnalytics {
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
  };
  charts: {
    responseTime: Array<{ timestamp: string; responseTime: number; errorRate: number; throughput: number }>;
    errors: Array<{ timestamp: string; count: number; type: string }>;
    connections: Array<{ timestamp: string; active: number; idle: number }>;
  };
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

export default function PerformanceAnalyticsPage() {
  const [dateRange, setDateRange] = useDateRange('last7days');
  const [analytics, setAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'responseTime' | 'errorRate' | 'throughput'>('responseTime');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      const response = await fetch(`/api/admin/analytics/performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch performance analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching performance analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000);
    return () => clearInterval(interval);
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
            <h1 className="text-4xl font-bold text-white mb-2">Performance Analytics</h1>
            <p className="text-gray-300">System health and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50">
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {analytics && <ExportButton data={Object.entries(analytics.metrics).map(([key, value]) => ({ Metric: key, Value: value }))} filename={`performance-analytics-${new Date().toISOString().split('T')[0]}`} formats={['csv', 'xlsx', 'pdf']} />}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/analytics" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Overview</Link>
          <Link href="/admin/analytics/users" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Users</Link>
          <Link href="/admin/analytics/tournaments" className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors">Tournaments</Link>
          <Link href="/admin/analytics/performance" className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">Performance</Link>
        </div>

        <DateRangePicker value={dateRange} onChange={setDateRange} allowComparison={false} />

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error Loading Performance Analytics</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analytics && (
          <>
            <MetricsCardGroup columns={4}>
              <MetricsCard title="Avg Response Time" value={analytics.metrics.avgResponseTime} currentValue={analytics.metrics.avgResponseTime} previousValue={analytics.metrics.previousAvgResponseTime} format="duration" variant={analytics.metrics.avgResponseTime < 100 ? 'success' : 'warning'} />
              <MetricsCard title="P95 Response Time" value={analytics.metrics.p95ResponseTime} format="duration" description="95th percentile" variant={analytics.metrics.p95ResponseTime < 200 ? 'success' : 'warning'} />
              <MetricsCard title="Error Rate" value={analytics.metrics.errorRate} currentValue={analytics.metrics.errorRate} previousValue={analytics.metrics.previousErrorRate} format="percentage" variant={analytics.metrics.errorRate < 1 ? 'success' : 'danger'} />
              <MetricsCard title="System Uptime" value={analytics.metrics.uptime} format="percentage" variant={analytics.metrics.uptime >= 99.9 ? 'success' : 'warning'} />
            </MetricsCardGroup>

            <MetricsCardGroup columns={4}>
              <MetricsCard title="Active Connections" value={analytics.metrics.activeConnections} format="number" />
              <MetricsCard title="Avg Query Time" value={analytics.metrics.avgQueryTime} format="duration" variant={analytics.metrics.avgQueryTime < 50 ? 'success' : 'warning'} />
              <MetricsCard title="Cache Hit Rate" value={analytics.metrics.cacheHitRate} format="percentage" variant={analytics.metrics.cacheHitRate >= 80 ? 'success' : 'warning'} />
              <MetricsCard title="Requests/Min" value={analytics.metrics.requestsPerMinute} currentValue={analytics.metrics.requestsPerMinute} previousValue={analytics.metrics.previousRequestsPerMinute} format="number" />
            </MetricsCardGroup>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setSelectedMetric('responseTime')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedMetric === 'responseTime' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                  Response Time
                </button>
                <button onClick={() => setSelectedMetric('errorRate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedMetric === 'errorRate' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                  Error Rate
                </button>
                <button onClick={() => setSelectedMetric('throughput')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedMetric === 'throughput' ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                  Throughput
                </button>
              </div>
              <PerformanceChart data={analytics.charts.responseTime} title={selectedMetric === 'responseTime' ? 'API Response Time' : selectedMetric === 'errorRate' ? 'Error Rate Over Time' : 'Request Throughput'} metric={selectedMetric} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Errors</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analytics.recentErrors.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No errors detected</p>
                  ) : (
                    analytics.recentErrors.map((error, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${error.statusCode >= 500 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {error.statusCode}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(error.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-white text-sm font-medium">{error.method} {error.endpoint}</p>
                        <p className="text-gray-400 text-xs mt-1">{error.message}</p>
                        <p className="text-gray-400 text-xs mt-1">Count: {error.count}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Slow Queries</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analytics.slowQueries.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No slow queries detected</p>
                  ) : (
                    analytics.slowQueries.map((query, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${query.avgDuration > 1000 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {query.avgDuration.toFixed(0)}ms
                          </span>
                          <span className="text-xs text-gray-400">Executed {query.count}x</span>
                        </div>
                        <p className="text-white text-xs font-mono">{query.query.substring(0, 100)}{query.query.length > 100 ? '...' : ''}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">System Health Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">API Health</p>
                    <div className={`w-3 h-3 rounded-full ${analytics.metrics.errorRate < 1 && analytics.metrics.avgResponseTime < 200 ? 'bg-green-500' : analytics.metrics.errorRate < 5 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  </div>
                  <p className="text-white text-lg font-semibold">{analytics.metrics.errorRate < 1 && analytics.metrics.avgResponseTime < 200 ? 'Healthy' : analytics.metrics.errorRate < 5 ? 'Degraded' : 'Critical'}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Database Health</p>
                    <div className={`w-3 h-3 rounded-full ${analytics.metrics.avgQueryTime < 50 ? 'bg-green-500' : analytics.metrics.avgQueryTime < 100 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  </div>
                  <p className="text-white text-lg font-semibold">{analytics.metrics.avgQueryTime < 50 ? 'Optimal' : analytics.metrics.avgQueryTime < 100 ? 'Acceptable' : 'Slow'}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Cache Efficiency</p>
                    <div className={`w-3 h-3 rounded-full ${analytics.metrics.cacheHitRate >= 80 ? 'bg-green-500' : analytics.metrics.cacheHitRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  </div>
                  <p className="text-white text-lg font-semibold">{analytics.metrics.cacheHitRate >= 80 ? 'Excellent' : analytics.metrics.cacheHitRate >= 60 ? 'Good' : 'Poor'}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
