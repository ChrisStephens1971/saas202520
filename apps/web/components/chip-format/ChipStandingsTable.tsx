/**
 * Chip Standings Table Component
 * Epic: UI-002 - Live Chip Standings
 * Sprint 6 - WebSocket real-time updates
 * Displays real-time chip standings with rankings
 */

'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket/events';

interface ChipStanding {
  playerId: string;
  playerName: string;
  chipCount: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  status: string;
  rank: number;
}

interface ChipStats {
  totalPlayers: number;
  averageChips: number;
  medianChips: number;
  maxChips: number;
  minChips: number;
  averageMatches: number;
}

interface Props {
  tournamentId: string;
  finalsCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ChipStandingsTable({ tournamentId, finalsCount }: Props) {
  const [sortBy, setSortBy] = useState<'rank' | 'wins' | 'matches'>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // WebSocket connection for real-time updates
  const { socket, isConnected } = useSocket();

  // Fetch standings (no polling, WebSocket-triggered updates only)
  const { data, error, isLoading, mutate } = useSWR(
    `/api/tournaments/${tournamentId}/chip-standings?includeStats=true`,
    fetcher,
    {
      refreshInterval: 0, // Disabled: using WebSocket instead
      revalidateOnFocus: true,
    }
  );

  // Listen for WebSocket events and trigger SWR revalidation
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStandingsUpdate = () => {
      mutate();
    };

    const handleFinalsApplied = () => {
      mutate();
    };

    const handleChipsAdjusted = () => {
      mutate();
    };

    socket.on(SocketEvent.STANDINGS_UPDATED, handleStandingsUpdate);
    socket.on(SocketEvent.FINALS_APPLIED, handleFinalsApplied);
    socket.on(SocketEvent.CHIPS_ADJUSTED, handleChipsAdjusted);

    return () => {
      socket.off(SocketEvent.STANDINGS_UPDATED, handleStandingsUpdate);
      socket.off(SocketEvent.FINALS_APPLIED, handleFinalsApplied);
      socket.off(SocketEvent.CHIPS_ADJUSTED, handleChipsAdjusted);
    };
  }, [socket, isConnected, mutate]);

  const standings: ChipStanding[] = data?.standings || [];
  const stats: ChipStats = data?.stats;

  const sortedStandings = [...standings].sort((a, b) => {
    const multiplier = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'rank') return (a.rank - b.rank) * multiplier;
    if (sortBy === 'wins') return (a.wins - b.wins) * multiplier;
    if (sortBy === 'matches') return (a.matchesPlayed - b.matchesPlayed) * multiplier;
    return 0;
  });

  const handleSort = (column: 'rank' | 'wins' | 'matches') => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error loading standings. Please try again.</p>
        <button
          onClick={() => mutate()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b bg-gray-50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalPlayers}</div>
            <div className="text-sm text-gray-600">Total Players</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.averageChips.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg Chips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.maxChips}</div>
            <div className="text-sm text-gray-600">Max Chips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.averageMatches.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg Matches</div>
          </div>
        </div>
      )}

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th
                className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('rank')}
              >
                <div className="flex items-center gap-1">
                  Rank
                  {sortBy === 'rank' && (
                    <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Chips</th>
              <th
                className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('matches')}
              >
                <div className="flex items-center justify-center gap-1">
                  Matches
                  {sortBy === 'matches' && (
                    <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="px-4 py-3 text-center text-sm font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('wins')}
              >
                <div className="flex items-center justify-center gap-1">
                  W/L
                  {sortBy === 'wins' && (
                    <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((player) => {
              const isFinalist = player.rank <= finalsCount;
              const rowClass = isFinalist ? 'bg-green-50 border-l-4 border-green-500' : '';

              return (
                <tr key={player.playerId} className={`border-b hover:bg-gray-50 ${rowClass}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-700">#{player.rank}</span>
                      {isFinalist && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                          FINALIST
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{player.playerName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                      🔷 {player.chipCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">{player.matchesPlayed}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-600 font-semibold">{player.wins}</span>
                    <span className="mx-1 text-gray-400">/</span>
                    <span className="text-red-600 font-semibold">{player.losses}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        player.status === 'active'
                          ? 'bg-yellow-100 text-yellow-800'
                          : player.status === 'finalist'
                            ? 'bg-green-100 text-green-800'
                            : player.status === 'eliminated'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {player.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {standings.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg">No standings data yet.</p>
          <p className="text-sm mt-2">Players will appear here once matches are completed.</p>
        </div>
      )}

      {/* WebSocket connection status */}
      <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
          />
          <span>{isConnected ? 'Live updates active' : 'Connecting...'}</span>
        </div>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
