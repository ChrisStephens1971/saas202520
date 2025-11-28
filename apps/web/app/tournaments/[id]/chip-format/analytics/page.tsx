/**
 * Tournament Analytics Dashboard
 * Sprint 8 - ANALYTICS-002
 *
 * Comprehensive analytics view with:
 * - Chip progression charts (recharts)
 * - Tournament statistics
 * - Match activity timeline
 * - Player performance leaderboard
 * - Export to CSV/JSON
 */

'use client';

import { use } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Types
interface ChipProgressionData {
  playerId: string;
  playerName: string;
  data: Array<{
    timestamp: string;
    chips: number;
    matchNumber: number;
  }>;
}

interface TournamentStatistics {
  totalPlayers: number;
  totalMatches: number;
  totalChipsAwarded: number;
  averageChips: number;
  maxChips: number;
}

interface AnalyticsResponse {
  success: boolean;
  data?: ChipProgressionData[];
  totalMatches?: number;
}

interface StatisticsResponse {
  success: boolean;
  statistics?: TournamentStatistics;
}

// Fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });

// Color palette for charts
const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

export default function AnalyticsDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = use(params);

  // Fetch data
  const { data: progressionData, error: progressionError } = useSWR<AnalyticsResponse>(
    `/api/tournaments/${tournamentId}/analytics/chip-progression`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30s
  );

  const { data: statsData, error: statsError } = useSWR<StatisticsResponse>(
    `/api/tournaments/${tournamentId}/analytics/statistics`,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Loading state
  if (!progressionData || !statsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-200 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (progressionError || statsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Analytics</h2>
            <p className="text-red-600">
              {progressionError?.message || statsError?.message || 'Failed to load analytics data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!statsData.statistics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-yellow-800 font-semibold mb-2">No Statistics Available</h2>
            <p className="text-yellow-600">Statistics data is not available for this tournament.</p>
          </div>
        </div>
      </div>
    );
  }

  const statistics = statsData.statistics;
  const progression = progressionData.data || [];

  // Prepare chart data
  const chipProgressionChartData = prepareChipProgressionData(progression);
  const playerPerformanceData = preparePlayerPerformanceData(progression);
  const chipDistributionData = prepareChipDistributionData(progression);

  // Export functions
  const exportToCSV = () => {
    const csvData = progression.flatMap((player) =>
      player.data.map((point) => ({
        Player: player.playerName,
        'Match Number': point.matchNumber,
        Chips: point.chips,
        Timestamp: point.timestamp,
      }))
    );

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => headers.map((h) => row[h as keyof typeof row]).join(',')),
    ].join('\n');

    downloadFile(csvContent, `tournament-${tournamentId}-analytics.csv`, 'text/csv');
  };

  const exportToJSON = () => {
    const jsonData = {
      tournamentId: tournamentId,
      exportedAt: new Date().toISOString(),
      statistics,
      chipProgression: progression,
    };

    downloadFile(
      JSON.stringify(jsonData, null, 2),
      `tournament-${tournamentId}-analytics.json`,
      'application/json'
    );
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Tournament Analytics</h1>
            <p className="text-slate-600">Comprehensive insights and performance metrics</p>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
            <button
              onClick={exportToJSON}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export JSON
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard title="Total Players" value={statistics.totalPlayers} icon="👥" color="blue" />
          <StatCard title="Total Matches" value={statistics.totalMatches} icon="🎯" color="green" />
          <StatCard
            title="Chips Awarded"
            value={statistics.totalChipsAwarded}
            icon="💎"
            color="purple"
          />
          <StatCard
            title="Average Chips"
            value={Math.round(statistics.averageChips)}
            icon="📊"
            color="orange"
          />
          <StatCard title="Max Chips" value={statistics.maxChips} icon="🏆" color="yellow" />
        </div>

        {/* Chip Progression Line Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Chip Progression Over Time</h2>
          <p className="text-slate-600 mb-6">
            Track how chip counts changed throughout the tournament
          </p>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chipProgressionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="matchNumber"
                label={{ value: 'Match Number', position: 'insideBottom', offset: -5 }}
                stroke="#64748b"
              />
              <YAxis
                label={{ value: 'Chips', angle: -90, position: 'insideLeft' }}
                stroke="#64748b"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => `Match ${value}`}
              />
              <Legend />
              {progression.slice(0, 8).map((player, index) => (
                <Line
                  key={player.playerId}
                  type="monotone"
                  dataKey={player.playerName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {progression.length > 8 && (
            <p className="text-sm text-slate-500 mt-4 text-center">
              Showing top 8 players. Export data to see all players.
            </p>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Player Performance Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Player Performance</h2>
            <p className="text-slate-600 mb-6">Final chip counts by player</p>

            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={playerPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="chips" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chip Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Chip Distribution</h2>
            <p className="text-slate-600 mb-6">Share of total chips by player</p>

            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chipDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel as any}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chipDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value} chips`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Player Leaderboard</h2>
          <p className="text-slate-600 mb-6">Rankings by final chip count</p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Rank</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Player</th>
                  <th className="text-right py-3 px-4 text-slate-700 font-semibold">Final Chips</th>
                  <th className="text-right py-3 px-4 text-slate-700 font-semibold">
                    Matches Played
                  </th>
                  <th className="text-right py-3 px-4 text-slate-700 font-semibold">
                    Avg per Match
                  </th>
                  <th className="text-right py-3 px-4 text-slate-700 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {playerPerformanceData.map((player, index) => {
                  const avgPerMatch =
                    player.matches > 0 ? Math.round(player.chips / player.matches) : 0;
                  const maxChips = statistics.maxChips;
                  const progressPercent =
                    maxChips > 0 ? Math.round((player.chips / maxChips) * 100) : 0;

                  return (
                    <tr
                      key={player.name}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <span className="text-2xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900">{player.name}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-blue-600">{player.chips}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-600">{player.matches}</td>
                      <td className="py-4 px-4 text-right text-slate-600">{avgPerMatch}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 w-12 text-right">
                            {progressPercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Match Activity Timeline */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Match Activity Timeline</h2>
          <p className="text-slate-600 mb-6">Cumulative chip awards over the tournament</p>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={prepareMatchActivityData(progression)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="matchNumber"
                label={{ value: 'Match Number', position: 'insideBottom', offset: -5 }}
                stroke="#64748b"
              />
              <YAxis
                label={{ value: 'Cumulative Chips', angle: -90, position: 'insideLeft' }}
                stroke="#64748b"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => `After Match ${value}`}
              />
              <Area
                type="monotone"
                dataKey="totalChips"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Total Chips"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'yellow';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <div className="text-4xl font-bold">{value.toLocaleString()}</div>
      </div>
      <div className="text-sm opacity-90">{title}</div>
    </div>
  );
}

// Data Preparation Functions
function prepareChipProgressionData(progression: ChipProgressionData[]) {
  if (progression.length === 0) return [];

  // Find max match number
  const maxMatches = Math.max(...progression.flatMap((p) => p.data.map((d) => d.matchNumber)));

  // Create data points for each match
  const chartData: Array<Record<string, number>> = [];
  for (let i = 0; i <= maxMatches; i++) {
    const dataPoint: Record<string, number> = { matchNumber: i };

    progression.slice(0, 8).forEach((player) => {
      const matchData = player.data.find((d) => d.matchNumber === i);
      dataPoint[player.playerName] = matchData?.chips || 0;
    });

    chartData.push(dataPoint);
  }

  return chartData;
}

function preparePlayerPerformanceData(progression: ChipProgressionData[]) {
  return progression
    .map((player) => {
      const lastPoint = player.data[player.data.length - 1];
      return {
        name: player.playerName,
        chips: lastPoint?.chips || 0,
        matches: player.data.length - 1, // Subtract initial 0 point
      };
    })
    .sort((a, b) => b.chips - a.chips)
    .slice(0, 10); // Top 10 players
}

function prepareChipDistributionData(progression: ChipProgressionData[]) {
  return progression
    .map((player) => {
      const lastPoint = player.data[player.data.length - 1];
      return {
        name: player.playerName,
        value: lastPoint?.chips || 0,
      };
    })
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 for pie chart readability
}

function prepareMatchActivityData(progression: ChipProgressionData[]) {
  if (progression.length === 0) return [];

  const maxMatches = Math.max(...progression.flatMap((p) => p.data.map((d) => d.matchNumber)));

  const activityData: Array<{ matchNumber: number; totalChips: number }> = [];
  for (let i = 0; i <= maxMatches; i++) {
    let totalChips = 0;
    progression.forEach((player) => {
      const matchData = player.data.find((d) => d.matchNumber === i);
      if (matchData) {
        totalChips += matchData.chips;
      }
    });

    activityData.push({
      matchNumber: i,
      totalChips,
    });
  }

  return activityData;
}

// Pie chart label props interface
interface PieChartLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

// Custom label for pie chart
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieChartLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show labels for slices < 5%

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
