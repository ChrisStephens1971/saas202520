/**
 * LiveLeaderboard Component
 * Sprint 9 - Real-Time Features
 *
 * Real-time leaderboard with live rank updates and animations
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSocketEvent } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket/events';
import type {
  ChipsAwardedPayload,
  PlayerEliminatedPayload,
  MatchCompletedPayload,
} from '@/lib/socket/events';

export interface LeaderboardPlayer {
  id: string;
  name: string;
  totalChips: number;
  rank: number;
  matchesPlayed: number;
  matchesWon: number;
  isEliminated?: boolean;
  isOnline?: boolean;
  lastUpdate?: string;
}

interface LiveLeaderboardProps {
  tournamentId: string;
  initialPlayers: LeaderboardPlayer[];
  showOnlineStatus?: boolean;
  compact?: boolean;
  maxPlayers?: number;
}

export function LiveLeaderboard({
  tournamentId,
  initialPlayers,
  showOnlineStatus = true,
  compact = false,
  maxPlayers,
}: LiveLeaderboardProps) {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>(initialPlayers);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [rankChanges, setRankChanges] = useState<Map<string, number>>(new Map());

  // Sort players by total chips (descending) and update ranks
  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      // Eliminated players go to bottom
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;

      // Sort by chips (descending)
      return b.totalChips - a.totalChips;
    });

    // Update ranks (side effects moved to useEffect below)
    sorted.forEach((player, index) => {
      player.rank = index + 1;
    });

    return maxPlayers ? sorted.slice(0, maxPlayers) : sorted;
  }, [players, maxPlayers]);

  // Detect rank changes and trigger animations (moved from useMemo to avoid setState in render)
  useEffect(() => {
    const newRankChanges = new Map<string, number>();
    sortedPlayers.forEach((player) => {
      // Compare with original player rank from state
      const originalPlayer = players.find((p) => p.id === player.id);
      if (originalPlayer && originalPlayer.rank !== player.rank) {
        newRankChanges.set(player.id, originalPlayer.rank - player.rank); // Positive = moved up
      }
    });

    if (newRankChanges.size > 0) {
      setRankChanges(newRankChanges);
      const timer = setTimeout(() => setRankChanges(new Map()), 2000); // Clear after animation
      return () => clearTimeout(timer);
    }
  }, [sortedPlayers, players]);

  // Listen for chips awarded
  useSocketEvent(SocketEvent.CHIPS_AWARDED, (payload: ChipsAwardedPayload) => {
    if (payload.tournamentId === tournamentId) {
      setPlayers((prev) =>
        prev.map((player) => {
          // Find award for this player in the awards array
          const award = payload.awards.find((a) => a.playerId === player.id);
          if (award) {
            setRecentlyUpdated((set) => new Set(set).add(player.id));
            setTimeout(() => {
              setRecentlyUpdated((set) => {
                const newSet = new Set(set);
                newSet.delete(player.id);
                return newSet;
              });
            }, 1500);

            return {
              ...player,
              totalChips: award.totalChips,
              lastUpdate: new Date().toISOString(),
            };
          }
          return player;
        })
      );
    }
  });

  // Listen for match completed (update win count)
  useSocketEvent(SocketEvent.MATCH_COMPLETED, (payload: MatchCompletedPayload) => {
    if (payload.tournamentId === tournamentId) {
      setPlayers((prev) =>
        prev.map((player) => {
          // Update winner
          if (player.id === payload.winner.id) {
            return {
              ...player,
              matchesPlayed: player.matchesPlayed + 1,
              matchesWon: player.matchesWon + 1,
              lastUpdate: new Date().toISOString(),
            };
          }
          // Update loser
          if (player.id === payload.loser.id) {
            return {
              ...player,
              matchesPlayed: player.matchesPlayed + 1,
              lastUpdate: new Date().toISOString(),
            };
          }
          return player;
        })
      );
    }
  });

  // Listen for player eliminated
  useSocketEvent(SocketEvent.PLAYER_ELIMINATED, (payload: PlayerEliminatedPayload) => {
    if (payload.tournamentId === tournamentId) {
      setPlayers((prev) =>
        prev.map((player) =>
          player.id === payload.player.id
            ? {
                ...player,
                isEliminated: true,
                lastUpdate: new Date().toISOString(),
              }
            : player
        )
      );
    }
  });

  // Update when initial data changes
  useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  const getRankChangeIndicator = (playerId: string) => {
    const change = rankChanges.get(playerId);
    if (!change) return null;

    if (change > 0) {
      return (
        <span className="text-green-600 dark:text-green-400 text-sm font-bold animate-bounce">
          ↑{change}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-red-600 dark:text-red-400 text-sm font-bold animate-bounce">
          ↓{Math.abs(change)}
        </span>
      );
    }

    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold shadow-lg">
          🥇
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold shadow-lg">
          🥈
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
          🥉
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold">
          {rank}
        </div>
      );
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedPlayers.map((player) => (
          <div
            key={player.id}
            className={`
              flex items-center justify-between p-2 rounded-lg border
              transition-all duration-300
              ${
                recentlyUpdated.has(player.id)
                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700'
                  : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }
              ${player.isEliminated ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                #{player.rank}
              </span>
              <div>
                <div className="font-medium text-sm">{player.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {player.totalChips.toLocaleString()} chips
                </div>
              </div>
            </div>
            {getRankChangeIndicator(player.id)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Live Leaderboard</h2>
        <p className="text-blue-100 text-sm">
          {players.filter((p) => !p.isEliminated).length} active players
        </p>
      </div>

      {/* Leaderboard */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`
              p-4 transition-all duration-300
              ${
                recentlyUpdated.has(player.id)
                  ? 'bg-blue-50 dark:bg-blue-950 scale-[1.01]'
                  : index % 2 === 0
                    ? 'bg-gray-50 dark:bg-gray-900'
                    : 'bg-white dark:bg-gray-800'
              }
              ${player.isEliminated ? 'opacity-50' : ''}
              hover:bg-gray-100 dark:hover:bg-gray-750
            `}
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div className="flex items-center gap-2">
                {getRankBadge(player.rank)}
                {getRankChangeIndicator(player.id)}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{player.name}</h3>
                  {showOnlineStatus && player.isOnline && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                  {player.isEliminated && (
                    <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:text-red-300 dark:bg-red-900">
                      ELIMINATED
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {player.matchesWon}W - {player.matchesPlayed - player.matchesWon}L •{' '}
                  {player.matchesPlayed > 0
                    ? ((player.matchesWon / player.matchesPlayed) * 100).toFixed(0)
                    : 0}
                  % Win Rate
                </div>
              </div>

              {/* Chips */}
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {player.totalChips.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">chips</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {maxPlayers && players.length > maxPlayers && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-center text-sm text-gray-600 dark:text-gray-400">
          Showing top {maxPlayers} of {players.length} players
        </div>
      )}
    </div>
  );
}
