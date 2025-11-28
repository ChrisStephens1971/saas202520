/**
 * ConnectionStatus Component
 * Sprint 9 - Real-Time Features
 *
 * Visual indicator of Socket.io connection status with reconnection UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface ConnectionStatusProps {
  variant?: 'full' | 'compact' | 'badge';
  showDetails?: boolean;
  position?: 'fixed' | 'relative';
}

export function ConnectionStatus({
  variant = 'compact',
  showDetails = false,
  position = 'relative',
}: ConnectionStatusProps) {
  const { socket, isConnected, isConnecting, error } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastConnectedTime, setLastConnectedTime] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    if (isConnected) {
      setLastConnectedTime(new Date());
      setReconnectAttempts(0);
    } else if (isConnecting) {
      setReconnectAttempts((prev) => prev + 1);
    }
  }, [isConnected, isConnecting]);

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500 animate-pulse';
    if (error) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting)
      return `Connecting${reconnectAttempts > 1 ? ` (${reconnectAttempts})` : ''}...`;
    if (error) return 'Connection Error';
    return 'Disconnected';
  };

  // Badge variant - minimal indicator
  if (variant === 'badge') {
    return (
      <div
        className={`
          relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
          ${
            isConnected
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : isConnecting
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }
        `}
        title={getStatusText()}
      >
        <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        {isConnected ? 'Live' : 'Offline'}
      </div>
    );
  }

  // Compact variant - status dot with text
  if (variant === 'compact') {
    return (
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border
          ${
            isConnected
              ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700'
              : isConnecting
                ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700'
                : 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700'
          }
          ${position === 'fixed' ? 'fixed bottom-4 right-4 z-50 shadow-lg' : ''}
        `}
      >
        <span className={`relative flex h-3 w-3`}>
          {(isConnected || isConnecting) && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-yellow-400'
              } opacity-75`}
            ></span>
          )}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor()}`}></span>
        </span>
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
    );
  }

  // Full variant - detailed status with dropdown
  return (
    <div className={position === 'fixed' ? 'fixed bottom-4 right-4 z-50' : 'relative'}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg
          transition-all duration-200 hover:scale-105
          ${
            isConnected
              ? 'bg-green-50 border-green-500 dark:bg-green-950 dark:border-green-600'
              : isConnecting
                ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-950 dark:border-yellow-600'
                : 'bg-red-50 border-red-500 dark:bg-red-950 dark:border-red-600'
          }
        `}
      >
        {/* Status Indicator */}
        <div className="relative">
          <span className={`relative flex h-4 w-4`}>
            {(isConnected || isConnecting) && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-yellow-400'
                } opacity-75`}
              ></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-4 w-4 ${getStatusColor()}`}
            ></span>
          </span>
        </div>

        {/* Status Text */}
        <div className="text-left">
          <div className="text-sm font-bold">{getStatusText()}</div>
          {showDetails && lastConnectedTime && isConnected && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Since {lastConnectedTime.toLocaleTimeString()}
            </div>
          )}
          {showDetails && error && (
            <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
          )}
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Details */}
      {showDropdown && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
            <h3 className="text-white font-bold">Connection Details</h3>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Status */}
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Status
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <span className="font-medium">{getStatusText()}</span>
              </div>
            </div>

            {/* Socket ID */}
            {socket?.id && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Socket ID
                </div>
                <div className="mt-1 font-mono text-sm break-all">{socket.id}</div>
              </div>
            )}

            {/* Connected Time */}
            {lastConnectedTime && isConnected && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Connected Since
                </div>
                <div className="mt-1">
                  {lastConnectedTime.toLocaleTimeString()} ({getUptime(lastConnectedTime)})
                </div>
              </div>
            )}

            {/* Reconnect Attempts */}
            {reconnectAttempts > 1 && !isConnected && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Reconnect Attempts
                </div>
                <div className="mt-1 text-yellow-600 dark:text-yellow-400 font-medium">
                  {reconnectAttempts}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Error
                </div>
                <div className="mt-1 text-red-600 dark:text-red-400 text-sm">{error}</div>
              </div>
            )}

            {/* Transport */}
            {socket?.io && (
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Transport
                </div>
                <div className="mt-1 font-mono text-sm">
                  {socket.io.engine.transport.name || 'Unknown'}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isConnected && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => socket?.connect()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reconnect Manually
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getUptime(connectedTime: Date): string {
  const now = new Date();
  const diff = now.getTime() - connectedTime.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
