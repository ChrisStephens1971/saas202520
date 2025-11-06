/**
 * Queue Statistics Dashboard Component
 * Epic: UI-007 - Queue Statistics Dashboard
 * Visual statistics and progress indicators
 */

'use client';

import useSWR from 'swr';

interface Stats {
  totalPlayers: number;
  averageChips: number;
  maxChips: number;
  minChips: number;
  averageMatches: number;
}

interface QueueStats {
  availableCount: number;
  activeMatchesCount: number;
  completedMatchesCount: number;
}

interface Props {
  tournamentId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function QueueStatsDashboard({ tournamentId }: Props) {
  const { data: standingsData } = useSWR(
    `/api/tournaments/${tournamentId}/chip-standings?includeStats=true`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: queueData } = useSWR<QueueStats>(
    `/api/tournaments/${tournamentId}/queue-stats`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const stats: Stats | undefined = standingsData?.stats;

  if (!stats || !queueData) {
    return null; // Loading handled by parent
  }

  const totalMatches =
    queueData.availableCount + queueData.activeMatchesCount + queueData.completedMatchesCount;
  const completionPercentage =
    totalMatches > 0 ? (queueData.completedMatchesCount / totalMatches) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Tournament Statistics</h2>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Match Completion</span>
          <span className="text-sm font-bold text-gray-900">
            {queueData.completedMatchesCount} / {totalMatches} ({completionPercentage.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Players */}
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalPlayers}</div>
          <div className="text-xs text-gray-600 mt-1">Total Players</div>
        </div>

        {/* Average Chips */}
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {stats.averageChips.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Avg Chips</div>
        </div>

        {/* Chip Range */}
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {stats.minChips}-{stats.maxChips}
          </div>
          <div className="text-xs text-gray-600 mt-1">Chip Range</div>
        </div>

        {/* Average Matches */}
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {stats.averageMatches.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600 mt-1">Avg Matches</div>
        </div>

        {/* Active Now */}
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {queueData.activeMatchesCount}
          </div>
          <div className="text-xs text-gray-600 mt-1">Active Now</div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          {queueData.availableCount} available
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
          {queueData.activeMatchesCount} active
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
          <div className="w-2 h-2 bg-green-600 rounded-full" />
          {queueData.completedMatchesCount} completed
        </div>
      </div>
    </div>
  );
}
