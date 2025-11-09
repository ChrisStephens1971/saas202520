/**
 * MatchQueue Component
 * Sprint 2 - TD Console Room View
 *
 * Displays queue of pending matches waiting for table assignment:
 * - Priority sorting
 * - ETA display for each match
 * - Player names
 * - Wait duration
 * - Quick assign actions
 */

'use client';

import { useMemo } from 'react';
import type { QueuedMatch } from '@/types/room-view';

interface MatchQueueProps {
  matches: QueuedMatch[];
  onAssignMatch?: (matchId: string) => void;
  onMatchClick?: (match: QueuedMatch) => void;
  loading?: boolean;
  className?: string;
}

export function MatchQueue({
  matches,
  onAssignMatch,
  onMatchClick,
  loading = false,
  className = '',
}: MatchQueueProps) {
  // Sort by priority (highest first) then by waiting duration
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.waitingDuration - a.waitingDuration;
    });
  }, [matches]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-white/20 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (sortedMatches.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 text-lg mb-2">Queue Empty</div>
        <div className="text-gray-500 text-sm">No matches waiting for table assignment</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Match Queue
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({sortedMatches.length} waiting)
          </span>
        </h3>
      </div>

      <div className="space-y-2">
        {sortedMatches.map((queuedMatch, index) => (
          <QueuedMatchCard
            key={queuedMatch.match.id}
            queuedMatch={queuedMatch}
            position={index + 1}
            onAssign={() => onAssignMatch?.(queuedMatch.match.id)}
            onClick={() => onMatchClick?.(queuedMatch)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Queued Match Card
 */
interface QueuedMatchCardProps {
  queuedMatch: QueuedMatch;
  position: number;
  onAssign?: () => void;
  onClick?: () => void;
}

function QueuedMatchCard({ queuedMatch, position, onAssign, onClick }: QueuedMatchCardProps) {
  const { match, priority, estimatedStartTime, waitingDuration, playerNames } = queuedMatch;

  // Priority badge color
  const priorityColor = useMemo(() => {
    if (priority >= 80) return 'bg-red-500 text-white';
    if (priority >= 50) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  }, [priority]);

  // Format ETA
  const formattedETA = useMemo(() => {
    if (!estimatedStartTime) return 'Calculating...';
    const now = new Date();
    const eta = new Date(estimatedStartTime);
    const diff = eta.getTime() - now.getTime();

    if (diff < 0) return 'Soon';

    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [estimatedStartTime]);

  // Format waiting duration
  const formattedWaitTime = useMemo(() => {
    if (waitingDuration < 1) return 'Just now';
    if (waitingDuration < 60) return `${Math.floor(waitingDuration)}m`;

    const hours = Math.floor(waitingDuration / 60);
    const mins = Math.floor(waitingDuration % 60);
    return `${hours}h ${mins}m`;
  }, [waitingDuration]);

  return (
    <div
      className={`
        backdrop-blur-lg bg-white/10 rounded-lg border border-white/20
        p-4 hover:bg-white/20 transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Position Badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm">
          {position}
        </div>

        {/* Match Info */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white">
                  Match #{match.position}
                </span>
                <span className="text-xs text-gray-400">Round {match.round}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColor}`}>
                  Priority {priority}
                </span>
              </div>

              {/* Players */}
              <div className="text-sm text-gray-300 space-y-0.5">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{playerNames.playerA || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs ml-5">vs</div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{playerNames.playerB || 'TBD'}</span>
                </div>
              </div>
            </div>

            {/* Quick Assign Button */}
            {onAssign && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign();
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
              >
                Assign
              </button>
            )}
          </div>

          {/* Footer Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 pt-2 border-t border-white/10">
            {/* Wait Time */}
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Waiting: {formattedWaitTime}</span>
            </div>

            {/* ETA */}
            {estimatedStartTime && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>ETA: {formattedETA}</span>
              </div>
            )}

            {/* Match State */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                match.state === 'ready' ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="capitalize">{match.state}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
