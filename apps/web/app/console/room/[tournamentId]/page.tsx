/**
 * TD Console Room View Page
 * Sprint 2 - Tournament Director Console
 *
 * Main tournament room management interface for Tournament Directors
 * Features:
 * - Real-time tournament overview
 * - Table status grid
 * - Match queue with ETAs
 * - Quick actions for match management
 * - Search and filtering
 * - Mobile-optimized PWA layout
 */

'use client';

import { use, useState, useEffect } from 'react';
import { TournamentOverviewComponent } from '@/components/console/TournamentOverview';
import { TableStatusGrid } from '@/components/console/TableStatusGrid';
import { MatchQueue } from '@/components/console/MatchQueue';
import { QuickActions, FloatingActionButton } from '@/components/console/QuickActions';
import { RoomViewFiltersComponent } from '@/components/console/RoomViewFilters';
import { useRoomView } from '@/hooks/useRoomView';
import { QuickActionType } from '@/types/room-view';
import type { QuickAction, TableWithMatch, QueuedMatch } from '@/types/room-view';

interface RoomViewPageProps {
  params: Promise<{
    tournamentId: string;
  }>;
}

export default function RoomViewPage({ params }: RoomViewPageProps) {
  const { tournamentId } = use(params);
  const [showFilters, setShowFilters] = useState(false);

  const {
    data,
    loading,
    error,
    filters,
    filteredMatches,
    filteredTables,
    setFilters,
    refresh,
    assignMatch,
    startMatch,
    completeMatch,
  } = useRoomView({
    tournamentId,
    pollInterval: 5000,
    enablePolling: true,
  });

  // Generate quick actions based on current state
  const quickActions: QuickAction[] = data
    ? [
        {
          type: QuickActionType.ASSIGN_TO_TABLE,
          matchId: filteredMatches[0]?.match.id || '',
          label: 'Assign Next',
          icon: '🎯',
          disabled: filteredMatches.length === 0 || data.overview.availableTables === 0,
          disabledReason:
            filteredMatches.length === 0 ? 'No matches in queue' : 'No tables available',
        },
        {
          type: QuickActionType.START_MATCH,
          matchId: '',
          label: 'Start Match',
          icon: '▶️',
          disabled: data.overview.activeMatches >= data.overview.totalTables,
          disabledReason: 'All tables in use',
        },
        {
          type: QuickActionType.COMPLETE_MATCH,
          matchId: '',
          label: 'Complete Match',
          icon: '✅',
          disabled: data.overview.activeMatches === 0,
          disabledReason: 'No active matches',
        },
        {
          type: QuickActionType.UPDATE_SCORE,
          matchId: '',
          label: 'Update Score',
          icon: '📊',
          disabled: data.overview.activeMatches === 0,
          disabledReason: 'No active matches',
        },
      ]
    : [];

  const handleQuickAction = async (action: QuickAction) => {
    try {
      switch (action.type) {
        case QuickActionType.ASSIGN_TO_TABLE:
          if (action.matchId) {
            await assignMatch(action.matchId, action.tableId);
          }
          break;
        case QuickActionType.START_MATCH:
          if (action.matchId) {
            await startMatch(action.matchId);
          }
          break;
        case QuickActionType.COMPLETE_MATCH:
          if (action.matchId) {
            await completeMatch(action.matchId);
          }
          break;
        default:
          // Action not yet implemented
          break;
      }
    } catch (err) {
      console.error('Error performing action:', err);
    }
  };

  const handleTableClick = (_table: TableWithMatch) => {
    // TODO: Open table details modal
  };

  const handleMatchClick = (_match: QueuedMatch) => {
    // TODO: Open match details modal
  };

  const handleAssignMatch = async (matchId: string) => {
    try {
      await assignMatch(matchId);
    } catch (err) {
      console.error('Error assigning match:', err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-lg bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Room View</h2>
            <p className="text-gray-300 mb-4">{error.message}</p>
            <button
              onClick={refresh}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {data?.tournamentName || 'Tournament Room'}
            </h1>
            <p className="text-gray-400">
              {data?.format} • {data?.status}
            </p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <svg
              className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Tournament Overview Stats */}
        {data && <TournamentOverviewComponent data={data.overview} loading={loading} />}

        {/* Quick Actions */}
        {data && (
          <QuickActions actions={quickActions} onAction={handleQuickAction} loading={loading} />
        )}

        {/* Filters */}
        <RoomViewFiltersComponent filters={filters} onFiltersChange={setFilters} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables Grid - 2/3 width on large screens */}
          <div className="lg:col-span-2">
            {data && (
              <TableStatusGrid
                tables={filteredTables}
                onTableClick={handleTableClick}
                loading={loading}
              />
            )}
          </div>

          {/* Match Queue - 1/3 width on large screens */}
          <div className="lg:col-span-1">
            {data && (
              <MatchQueue
                matches={filteredMatches}
                onAssignMatch={handleAssignMatch}
                onMatchClick={handleMatchClick}
                loading={loading}
              />
            )}
          </div>
        </div>

        {/* Last Updated Timestamp */}
        {data && (
          <div className="text-center text-sm text-gray-400">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
        )}
      </div>

      {/* Floating Action Button - Mobile Only */}
      <FloatingActionButton
        icon="➕"
        label="Quick Action"
        onClick={() => setShowFilters(!showFilters)}
        variant="primary"
        className="lg:hidden"
      />

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

/**
 * PWA Install Prompt Component
 */
function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show prompt if dismissed within last 7 days
      }
    }

    // Listen for beforeinstallprompt event (PWA installable)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();

      // Stash the event so it can be triggered later
      setDeferredPrompt(e);

      // Show our custom install prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Wait 3 seconds before showing prompt
    };

    // Listen for successful app installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return;
    }

    // Show the native install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');

      // Store dismissal timestamp
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    }

    // Clear the deferred prompt since it can only be used once
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal timestamp
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40">
      <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Install TD Console</h3>
            <p className="text-sm text-gray-300 mb-3">
              Install this app for quick access and offline support
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-sm font-semibold transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
