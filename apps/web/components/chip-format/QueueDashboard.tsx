/**
 * Queue Dashboard Component
 * Epic: UI-003 - Queue Management
 * Displays queue status and available players
 */

'use client';

import useSWR from 'swr';

interface QueueStats {
  availableCount: number;
  activeMatchesCount: number;
  pendingMatchesCount: number;
  completedMatchesCount: number;
  availablePlayers: Array<{
    playerId: string;
    playerName: string;
    chipCount: number;
    matchesPlayed: number;
  }>;
}

interface Props {
  tournamentId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function QueueDashboard({ tournamentId }: Props) {
  const { data, error, isLoading, mutate } = useSWR<QueueStats>(
    `/api/tournaments/${tournamentId}/queue-stats`,
    fetcher,
    {
      refreshInterval: 3000, // Refresh every 3 seconds for queue
      revalidateOnFocus: true,
    }
  );

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
        <p>Error loading queue data.</p>
        <button
          onClick={() => mutate()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const queueHealth =
    data.availableCount >= 4
      ? 'healthy'
      : data.availableCount >= 2
      ? 'warning'
      : 'critical';

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Queue Status</h2>
          <p className="text-sm text-gray-600">Live match queue monitoring</p>
        </div>
        <div
          className={`px-4 py-2 rounded-full font-semibold ${
            queueHealth === 'healthy'
              ? 'bg-green-100 text-green-800'
              : queueHealth === 'warning'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {queueHealth === 'healthy'
            ? '✓ Healthy'
            : queueHealth === 'warning'
            ? '⚠ Warning'
            : '⚠ Critical'}
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{data.availableCount}</div>
          <div className="text-sm text-gray-600 mt-1">Available Players</div>
          <div className="text-xs text-gray-500 mt-1">Ready for pairing</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-3xl font-bold text-yellow-600">
            {data.activeMatchesCount}
          </div>
          <div className="text-sm text-gray-600 mt-1">Active Matches</div>
          <div className="text-xs text-gray-500 mt-1">In progress</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-3xl font-bold text-purple-600">
            {data.pendingMatchesCount}
          </div>
          <div className="text-sm text-gray-600 mt-1">Pending Matches</div>
          <div className="text-xs text-gray-500 mt-1">Assigned, not started</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-3xl font-bold text-green-600">
            {data.completedMatchesCount}
          </div>
          <div className="text-sm text-gray-600 mt-1">Completed</div>
          <div className="text-xs text-gray-500 mt-1">Finished matches</div>
        </div>
      </div>

      {/* Available Players List */}
      <div className="p-6 border-t">
        <h3 className="text-lg font-semibold mb-4">
          Available Players ({data.availableCount})
        </h3>

        {data.availablePlayers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No players currently available</p>
            <p className="text-sm mt-2">Players will appear here when they&apos;re ready for matches</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.availablePlayers.map((player) => (
              <div
                key={player.playerId}
                className="border rounded-lg p-3 hover:shadow-md transition bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{player.playerName}</div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-bold">
                    🔷 {player.chipCount}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {player.matchesPlayed} matches played
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-600 text-right">
        Auto-refreshing every 3 seconds
      </div>
    </div>
  );
}
