/**
 * LiveMatchCard Component
 * Sprint 9 - Real-Time Features
 *
 * Displays match information with real-time updates via Socket.io
 */

'use client';

import { useState, useEffect } from 'react';
import { useSocketEvent } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket/events';
import type { MatchCompletedPayload, MatchStartedPayload } from '@/lib/socket/events';

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1?: {
    id: string;
    name: string;
    score?: number;
    isWinner?: boolean;
  };
  player2?: {
    id: string;
    name: string;
    score?: number;
    isWinner?: boolean;
  };
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  tableNumber?: number;
}

interface LiveMatchCardProps {
  match: Match;
  showTable?: boolean;
  compact?: boolean;
  onMatchUpdate?: (match: Match) => void;
}

export function LiveMatchCard({
  match: initialMatch,
  showTable = true,
  compact = false,
  onMatchUpdate,
}: LiveMatchCardProps) {
  const [match, setMatch] = useState<Match>(initialMatch);
  const [justUpdated, setJustUpdated] = useState(false);

  // Listen for match started events
  useSocketEvent(SocketEvent.MATCH_STARTED, (payload: MatchStartedPayload) => {
    if (payload.matchId === match.id) {
      const updatedMatch: Match = {
        ...match,
        status: 'in_progress',
        startedAt: payload.startedAt,
        tableNumber: payload.tableNumber,
      };
      setMatch(updatedMatch);
      setJustUpdated(true);
      onMatchUpdate?.(updatedMatch);

      // Flash animation
      setTimeout(() => setJustUpdated(false), 1000);
    }
  });

  // Listen for match completed events
  useSocketEvent(SocketEvent.MATCH_COMPLETED, (payload: MatchCompletedPayload) => {
    if (payload.matchId === match.id) {
      const updatedMatch: Match = {
        ...match,
        status: 'completed',
        completedAt: payload.completedAt,
        player1: payload.player1
          ? {
              id: payload.player1.playerId,
              name: payload.player1.playerName,
              score: payload.player1.score,
              isWinner: payload.player1.isWinner,
            }
          : match.player1,
        player2: payload.player2
          ? {
              id: payload.player2.playerId,
              name: payload.player2.playerName,
              score: payload.player2.score,
              isWinner: payload.player2.isWinner,
            }
          : match.player2,
      };
      setMatch(updatedMatch);
      setJustUpdated(true);
      onMatchUpdate?.(updatedMatch);

      // Flash animation
      setTimeout(() => setJustUpdated(false), 1000);
    }
  });

  // Update state when prop changes
  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  const getStatusColor = () => {
    switch (match.status) {
      case 'in_progress':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'completed':
        return 'border-gray-300 bg-gray-50 dark:bg-gray-900';
      case 'pending':
      default:
        return 'border-gray-200 bg-white dark:bg-gray-800';
    }
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            LIVE
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full dark:text-gray-300 dark:bg-gray-800">
            FINAL
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full dark:text-blue-300 dark:bg-blue-900">
            UPCOMING
          </span>
        );
    }
  };

  if (compact) {
    return (
      <div
        className={`
          border-2 rounded-lg p-2 transition-all duration-300
          ${getStatusColor()}
          ${justUpdated ? 'ring-2 ring-blue-400' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Round {match.round} • Match {match.matchNumber}
            </div>
            <div className="text-sm font-medium truncate">
              {match.player1?.name || 'TBD'} vs {match.player2?.name || 'TBD'}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border-2 rounded-xl p-4 transition-all duration-300
        ${getStatusColor()}
        ${justUpdated ? 'ring-4 ring-blue-400 scale-[1.02]' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Round {match.round} • Match {match.matchNumber}
          </div>
          {showTable && match.tableNumber && (
            <div className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded dark:text-purple-300 dark:bg-purple-900">
              Table {match.tableNumber}
            </div>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Players */}
      <div className="space-y-3">
        {/* Player 1 */}
        <div
          className={`
            flex items-center justify-between p-3 rounded-lg
            ${
              match.player1?.isWinner
                ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-gray-800'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {match.player1?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-medium">
                {match.player1?.name || 'TBD'}
                {match.player1?.isWinner && (
                  <span className="ml-2 text-green-600 dark:text-green-400">👑</span>
                )}
              </div>
            </div>
          </div>
          {match.player1?.score !== undefined && (
            <div className="text-2xl font-bold">{match.player1.score}</div>
          )}
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <div className="px-4 py-1 text-xs font-bold text-gray-500 bg-gray-200 rounded-full dark:text-gray-400 dark:bg-gray-700">
            VS
          </div>
        </div>

        {/* Player 2 */}
        <div
          className={`
            flex items-center justify-between p-3 rounded-lg
            ${
              match.player2?.isWinner
                ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-gray-800'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
              {match.player2?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-medium">
                {match.player2?.name || 'TBD'}
                {match.player2?.isWinner && (
                  <span className="ml-2 text-green-600 dark:text-green-400">👑</span>
                )}
              </div>
            </div>
          </div>
          {match.player2?.score !== undefined && (
            <div className="text-2xl font-bold">{match.player2.score}</div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      {(match.startedAt || match.completedAt) && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {match.status === 'in_progress' && match.startedAt && (
              <span>Started {new Date(match.startedAt).toLocaleTimeString()}</span>
            )}
            {match.status === 'completed' && match.completedAt && (
              <span>Completed {new Date(match.completedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
