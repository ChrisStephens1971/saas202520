/**
 * Tournament Analytics Page
 * Sprint 9 Phase 2 - Admin Analytics Dashboard
 *
 * Tournament-specific analytics including:
 * - Completion rates
 * - Average duration
 * - Popular formats
 * - Match statistics
 * - Player participation
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MetricsCard, MetricsCardGroup } from '@/components/admin/MetricsCard';
import { DateRangePicker, useDateRange } from '@/components/admin/DateRangePicker';
import {
  TournamentActivityChart,
  FormatDistributionChart,
  MatchesPerDayChart,
  MatchCompletionChart,
} from '@/components/admin/AnalyticsCharts';
import { ExportButton } from '@/components/admin/ExportButton';

interface TournamentAnalytics {
  metrics: {
    totalTournaments: number;
    previousTotalTournaments: number;
    completedTournaments: number;
    activeTournaments: number;
    avgDuration: number;
    avgPlayers: number;
    completionRate: number;
    previousCompletionRate: number;
    totalMatches: number;
    completedMatches: number;
    avgMatchesPerTournament: number;
  };
  charts: {
    activity: Array<{ date: string; created: number; completed: number; active: number }>;
    formatDistribution: Array<{ format: string; count: number }>;
    matchesPerDay: Array<{ date: string; matches: number; completed: number }>;
    statusDistribution: Array<{ name: string; value: number }>;
  };
  topTournaments: Array<{
    id: string;
    name: string;
    format: string;
    players: number;
    matches: number;
    completed: boolean;
    duration: number;
  }>;
}

export default function TournamentAnalyticsPage() {
  const [dateRange, setDateRange] = useDateRange('last30days');
  const [analytics, setAnalytics] = useState<TournamentAnalytics | null>(null);
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
      const response = await fetch(`/api/admin/analytics/tournaments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tournament analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching tournament analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tournament analytics');
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
              {[1, 2, 3, 4].map((i) => (
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
            <h1 className="text-4xl font-bold text-white mb-2">Tournament Analytics</h1>
            <p className="text-gray-300">Completion rates, formats, and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {analytics && (
              <ExportButton
                data={Object.entries(analytics.metrics).map(([key, value]) => ({
                  Metric: key,
                  Value: value,
                }))}
                filename={`tournament-analytics-${new Date().toISOString().split('T')[0]}`}
                formats={['csv', 'xlsx', 'pdf']}
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/analytics"
            className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/admin/analytics/users"
            className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            Users
          </Link>
          <Link
            href="/admin/analytics/tournaments"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium"
          >
            Tournaments
          </Link>
          <Link
            href="/admin/analytics/performance"
            className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            Performance
          </Link>
        </div>

        <DateRangePicker value={dateRange} onChange={setDateRange} allowComparison={false} />

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error Loading Tournament Analytics</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analytics && (
          <>
            <MetricsCardGroup columns={4}>
              <MetricsCard
                title="Total Tournaments"
                value={analytics.metrics.totalTournaments}
                currentValue={analytics.metrics.totalTournaments}
                previousValue={analytics.metrics.previousTotalTournaments}
                format="number"
              />
              <MetricsCard
                title="Completed"
                value={analytics.metrics.completedTournaments}
                format="number"
                variant="success"
              />
              <MetricsCard
                title="Active Now"
                value={analytics.metrics.activeTournaments}
                format="number"
                variant="warning"
              />
              <MetricsCard
                title="Completion Rate"
                value={analytics.metrics.completionRate}
                currentValue={analytics.metrics.completionRate}
                previousValue={analytics.metrics.previousCompletionRate}
                format="percentage"
                variant="success"
              />
            </MetricsCardGroup>

            <MetricsCardGroup columns={4}>
              <MetricsCard
                title="Avg Duration"
                value={analytics.metrics.avgDuration}
                format="duration"
              />
              <MetricsCard
                title="Avg Players"
                value={analytics.metrics.avgPlayers}
                format="number"
              />
              <MetricsCard
                title="Total Matches"
                value={analytics.metrics.totalMatches}
                format="number"
              />
              <MetricsCard
                title="Avg Matches/Tournament"
                value={analytics.metrics.avgMatchesPerTournament}
                format="number"
              />
            </MetricsCardGroup>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TournamentActivityChart
                data={analytics.charts.activity}
                title="Tournament Activity"
              />
              <FormatDistributionChart
                data={analytics.charts.formatDistribution}
                title="Tournament Formats"
              />
              <MatchesPerDayChart data={analytics.charts.matchesPerDay} title="Matches Per Day" />
              <MatchCompletionChart
                data={analytics.charts.statusDistribution}
                title="Tournament Status"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Top Tournaments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Format</th>
                      <th className="text-center p-2">Players</th>
                      <th className="text-center p-2">Matches</th>
                      <th className="text-center p-2">Duration</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topTournaments.map((tournament) => (
                      <tr
                        key={tournament.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-2">{tournament.name}</td>
                        <td className="p-2 capitalize">{tournament.format.replace(/_/g, ' ')}</td>
                        <td className="text-center p-2">{tournament.players}</td>
                        <td className="text-center p-2">{tournament.matches}</td>
                        <td className="text-center p-2">
                          {tournament.duration >= 1440
                            ? `${(tournament.duration / 1440).toFixed(1)}d`
                            : tournament.duration >= 60
                              ? `${(tournament.duration / 60).toFixed(1)}h`
                              : `${tournament.duration}m`}
                        </td>
                        <td className="text-center p-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${tournament.completed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                          >
                            {tournament.completed ? 'Completed' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Most Popular Format</p>
                  <p className="text-white text-lg font-semibold capitalize">
                    {analytics.charts.formatDistribution.length > 0
                      ? analytics.charts.formatDistribution[0].format.replace(/_/g, ' ')
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Match Completion Rate</p>
                  <p className="text-white text-lg font-semibold">
                    {analytics.metrics.totalMatches > 0
                      ? (
                          (analytics.metrics.completedMatches / analytics.metrics.totalMatches) *
                          100
                        ).toFixed(1)
                      : '0'}
                    %
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Avg Tournament Size</p>
                  <p className="text-white text-lg font-semibold">
                    {analytics.metrics.avgPlayers.toFixed(0)} players
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Tournament Growth</p>
                  <p className="text-white text-lg font-semibold">
                    {analytics.metrics.previousTotalTournaments > 0
                      ? (
                          ((analytics.metrics.totalTournaments -
                            analytics.metrics.previousTotalTournaments) /
                            analytics.metrics.previousTotalTournaments) *
                          100
                        ).toFixed(1)
                      : '0'}
                    % vs previous
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
