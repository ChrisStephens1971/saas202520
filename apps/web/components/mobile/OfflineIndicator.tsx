'use client';

/**
 * Offline Indicator Component
 *
 * Displays offline status, queued actions, and sync progress.
 * Shows a banner when offline and provides sync controls.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  getSyncStatus,
  addSyncStatusListener,
  forceSync,
  getTimeUntilNextSync,
  SyncStatus,
} from '@/lib/pwa/sync-manager';
import { getQueueStats, QueueStats } from '@/lib/pwa/offline-queue';
import { getCacheStats, formatBytes, CacheStats } from '@/lib/pwa/cache-manager';

// =============================================================================
// TYPES
// =============================================================================

interface OfflineIndicatorProps {
  showCacheStats?: boolean;
  autoHide?: boolean; // Auto-hide when online with no pending actions
  position?: 'top' | 'bottom';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function OfflineIndicator({
  showCacheStats = false,
  autoHide = false,
  position = 'top',
}: OfflineIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [timeUntilSync, setTimeUntilSync] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    // Load sync status
    setSyncStatus(getSyncStatus());

    // Load queue stats
    getQueueStats().then(setQueueStats);

    // Load cache stats if enabled
    if (showCacheStats) {
      getCacheStats().then(setCacheStats);
    }

    // Listen for status changes
    const unsubscribe = addSyncStatusListener((status) => {
      setSyncStatus(status);

      // Also update queue stats when sync status changes
      getQueueStats().then(setQueueStats);
    });

    return unsubscribe;
  }, [showCacheStats]);

  // Update time until next sync
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilSync(getTimeUntilNextSync());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle sync button click
  const handleSync = useCallback(async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, []);

  // Don't render if auto-hide is enabled and conditions are met
  if (
    autoHide &&
    syncStatus?.connectionStatus === 'online' &&
    !syncStatus?.isSyncing &&
    queueStats?.pending === 0 &&
    queueStats?.failed === 0
  ) {
    return null;
  }

  // Determine banner color based on status
  const getBannerColor = () => {
    if (syncStatus?.connectionStatus === 'offline') {
      return 'bg-yellow-500 text-yellow-900';
    }
    if (syncStatus?.isSyncing) {
      return 'bg-blue-500 text-white';
    }
    if (queueStats && queueStats.failed > 0) {
      return 'bg-red-500 text-white';
    }
    if (queueStats && queueStats.pending > 0) {
      return 'bg-orange-500 text-white';
    }
    return 'bg-green-500 text-white';
  };

  // Get status message
  const getStatusMessage = () => {
    if (syncStatus?.isSyncing) {
      return 'Syncing...';
    }
    if (syncStatus?.connectionStatus === 'offline') {
      if (queueStats && queueStats.pending > 0) {
        return `Offline • ${queueStats.pending} action${queueStats.pending !== 1 ? 's' : ''} queued`;
      }
      return 'Offline';
    }
    if (queueStats && queueStats.failed > 0) {
      return `${queueStats.failed} action${queueStats.failed !== 1 ? 's' : ''} failed`;
    }
    if (queueStats && queueStats.pending > 0) {
      return `${queueStats.pending} action${queueStats.pending !== 1 ? 's' : ''} pending`;
    }
    return 'Online';
  };

  // Format time until next sync
  const formatTimeUntilSync = (ms: number | null): string => {
    if (ms === null) return 'N/A';
    if (ms === 0) return 'Now';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div
      className={`fixed ${
        position === 'top' ? 'top-0' : 'bottom-0'
      } left-0 right-0 z-50 shadow-lg`}
    >
      {/* Main Banner */}
      <div
        className={`${getBannerColor()} px-4 py-2 flex items-center justify-between cursor-pointer transition-colors`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />

          {/* Status Message */}
          <span className="text-sm font-medium">{getStatusMessage()}</span>

          {/* Syncing Spinner */}
          {syncStatus?.isSyncing && (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sync Button */}
          {syncStatus?.connectionStatus === 'online' &&
            !syncStatus?.isSyncing &&
            queueStats &&
            queueStats.pending > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSync();
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
              >
                Sync Now
              </button>
            )}

          {/* Expand Icon */}
          <svg
            className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="bg-white border-t border-gray-200">
          <div className="px-4 py-3 space-y-3">
            {/* Connection Status */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Connection:</span>
              <span
                className={`font-medium ${
                  syncStatus?.connectionStatus === 'online'
                    ? 'text-green-600'
                    : 'text-yellow-600'
                }`}
              >
                {syncStatus?.connectionStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Queue Stats */}
            {queueStats && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Pending Actions:</span>
                  <span className="font-medium text-gray-900">{queueStats.pending}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Failed Actions:</span>
                  <span className="font-medium text-red-600">{queueStats.failed}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">{queueStats.completed}</span>
                </div>

                {/* Action Types Breakdown */}
                {queueStats.total > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-2">Queued Actions:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {queueStats.byType.score_update > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Score Updates:</span>
                          <span className="font-medium">{queueStats.byType.score_update}</span>
                        </div>
                      )}
                      {queueStats.byType.tournament_registration > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Registrations:</span>
                          <span className="font-medium">
                            {queueStats.byType.tournament_registration}
                          </span>
                        </div>
                      )}
                      {queueStats.byType.tournament_checkin > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Check-ins:</span>
                          <span className="font-medium">
                            {queueStats.byType.tournament_checkin}
                          </span>
                        </div>
                      )}
                      {queueStats.byType.player_update > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Player Updates:</span>
                          <span className="font-medium">{queueStats.byType.player_update}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Last Sync Time */}
            {syncStatus?.lastSyncTime && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Last Sync:</span>
                <span className="font-medium text-gray-900">
                  {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Next Sync Time */}
            {timeUntilSync !== null && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Next Sync:</span>
                <span className="font-medium text-gray-900">
                  {formatTimeUntilSync(timeUntilSync)}
                </span>
              </div>
            )}

            {/* Cache Stats */}
            {showCacheStats && cacheStats && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Cache Size:</span>
                  <span className="font-medium text-gray-900">
                    {formatBytes(cacheStats.totalSize)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Cache Count:</span>
                  <span className="font-medium text-gray-900">{cacheStats.cacheCount}</span>
                </div>
              </div>
            )}

            {/* Sync Button (if offline or has pending/failed) */}
            {syncStatus?.connectionStatus === 'online' &&
              !syncStatus?.isSyncing &&
              queueStats &&
              (queueStats.pending > 0 || queueStats.failed > 0) && (
                <button
                  onClick={handleSync}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
                >
                  Sync All Actions
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
