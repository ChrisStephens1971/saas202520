/**
 * PresenceIndicator Component
 * Sprint 9 - Real-Time Features
 *
 * Displays online users in a tournament with real-time presence updates
 */

'use client';

import { useState, useCallback } from 'react';
import { useSocketEvent, useTournamentRoom } from '@/hooks/useSocket';
import { SocketEvent } from '@/lib/socket/events';
import type { UserPresencePayload } from '@/lib/socket/events';

export interface OnlineUser {
  userId: string;
  username: string;
  status: 'online' | 'offline';
  connectedAt?: string;
}

interface PresenceIndicatorProps {
  tournamentId: string;
  currentUserId?: string;
  variant?: 'full' | 'compact' | 'count';
  maxDisplay?: number;
}

export function PresenceIndicator({
  tournamentId,
  currentUserId,
  variant = 'full',
  maxDisplay = 10,
}: PresenceIndicatorProps) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [showDropdown, setShowDropdown] = useState(false);

  // Join tournament room to receive presence updates
  const { isInRoom } = useTournamentRoom(tournamentId, currentUserId);

  // Listen for user online events
  useSocketEvent(
    SocketEvent.USER_ONLINE,
    useCallback((payload: UserPresencePayload) => {
      if (payload.userId) {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.set(payload.userId, {
            userId: payload.userId,
            username: payload.username,
            status: 'online',
            connectedAt: payload.timestamp,
          });
          return next;
        });
      }
    }, [])
  );

  // Listen for user offline events
  useSocketEvent(
    SocketEvent.USER_OFFLINE,
    useCallback((payload: UserPresencePayload) => {
      if (payload.userId) {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          next.delete(payload.userId);
          return next;
        });
      }
    }, [])
  );

  // Listen for users in tournament response
  useSocketEvent(
    SocketEvent.USERS_IN_TOURNAMENT,
    useCallback(
      (payload) => {
        if (payload.tournamentId === tournamentId) {
          const userMap = new Map<string, OnlineUser>();
          payload.users.forEach((user) => {
            userMap.set(user.userId, {
              userId: user.userId,
              username: user.username,
              status: 'online',
            });
          });
          setOnlineUsers(userMap);
        }
      },
      [tournamentId]
    )
  );

  const userList = Array.from(onlineUsers.values());
  const onlineCount = userList.length;
  const displayUsers = userList.slice(0, maxDisplay);
  const remainingCount = Math.max(0, onlineCount - maxDisplay);

  // Count only variant
  if (variant === 'count') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-gray-700 dark:text-gray-300">{onlineCount} online</span>
      </div>
    );
  }

  // Compact variant - just avatars
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <div
              key={user.userId}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold relative"
              title={user.username}
            >
              {user.username[0].toUpperCase()}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-bold">
              +{remainingCount}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{onlineCount} online</span>
      </div>
    );
  }

  // Full variant - detailed list with dropdown
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        {/* Online Indicator */}
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </div>

        {/* Count */}
        <div className="text-left">
          <div className="text-sm font-bold">{onlineCount} Online</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">in this tournament</div>
        </div>

        {/* Avatar Stack */}
        <div className="flex -space-x-2 ml-2">
          {displayUsers.slice(0, 3).map((user) => (
            <div
              key={user.userId}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold"
              title={user.username}
            >
              {user.username[0].toUpperCase()}
            </div>
          ))}
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 transition-transform ml-auto ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3">
            <h3 className="text-white font-bold">Online Players</h3>
            <p className="text-green-100 text-sm">
              {onlineCount} {onlineCount === 1 ? 'player' : 'players'} connected
            </p>
          </div>

          {/* User List */}
          <div className="max-h-96 overflow-y-auto">
            {onlineCount === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <p>No players online</p>
                <p className="text-sm mt-1">Be the first to join the tournament!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {userList.map((user) => (
                  <div
                    key={user.userId}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="font-medium">
                          {user.username}
                          {user.userId === currentUserId && (
                            <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                              (you)
                            </span>
                          )}
                        </div>
                        {user.connectedAt && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Connected {getRelativeTime(user.connectedAt)}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900">
                        Online
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isInRoom && (
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-950 border-t border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Not connected to tournament room
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to get relative time string
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
}
