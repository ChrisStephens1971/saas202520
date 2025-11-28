'use client';

/**
 * usePWA Hook
 *
 * React hook for accessing PWA features and state.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSyncStatus,
  addSyncStatusListener,
  forceSync,
  getQueueStats,
  addQueueListener,
  getNetworkState,
  addNetworkListener,
  detectPWAFeatures,
  getInstallState,
  showInstallPrompt,
  setupInstallPrompt,
} from '@/lib/pwa';

import type { SyncStatus, QueueStats, NetworkState, PWAFeatures, InstallState } from '@/lib/pwa';

// =============================================================================
// TYPES
// =============================================================================

export interface PWAState {
  // Connection
  networkState: NetworkState;
  isOnline: boolean;
  isOffline: boolean;

  // Sync
  syncStatus: SyncStatus;
  isSyncing: boolean;
  hasPendingActions: boolean;
  hasFailedActions: boolean;

  // Queue
  queueStats: QueueStats;

  // Features
  features: PWAFeatures;

  // Installation
  installState: InstallState;
  canInstall: boolean;
  isInstalled: boolean;
}

export interface PWAActions {
  // Sync
  sync: () => Promise<void>;
  forceSync: () => Promise<void>;

  // Installation
  promptInstall: () => Promise<boolean>;

  // Refresh
  refresh: () => void;
}

export interface UsePWAResult {
  state: PWAState;
  actions: PWAActions;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for accessing PWA features and state
 */
export function usePWA(): UsePWAResult {
  // Network state
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    typeof window !== 'undefined' ? getNetworkState() : { status: 'offline' }
  );

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    typeof window !== 'undefined'
      ? getSyncStatus()
      : {
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
          connectionStatus: 'offline',
        }
  );

  // Queue state
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    byType: {
      score_update: 0,
      tournament_registration: 0,
      tournament_checkin: 0,
      player_update: 0,
    },
  });

  // Features
  const [features, _setFeatures] = useState<PWAFeatures>(() =>
    typeof window !== 'undefined'
      ? detectPWAFeatures()
      : {
          serviceWorker: false,
          notifications: false,
          pushNotifications: false,
          backgroundSync: false,
          periodicSync: false,
          webShare: false,
          installPrompt: false,
          standalone: false,
          cacheStorage: false,
          indexedDB: false,
          networkInformation: false,
          storageEstimate: false,
        }
  );

  // Installation state
  const [installState, setInstallState] = useState<InstallState>(() =>
    typeof window !== 'undefined'
      ? getInstallState()
      : {
          canInstall: false,
          isInstalled: false,
        }
  );

  // Setup listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Network listener
    const unsubscribeNetwork = addNetworkListener(setNetworkState);

    // Sync status listener
    const unsubscribeSync = addSyncStatusListener(setSyncStatus);

    // Queue listener
    const unsubscribeQueue = addQueueListener(setQueueStats);

    // Install prompt listener
    const unsubscribeInstall = setupInstallPrompt();

    // Listen for install ready event
    const handleInstallReady = () => {
      setInstallState(getInstallState());
    };
    window.addEventListener('pwa-install-ready', handleInstallReady);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstallState(getInstallState());
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Load initial queue stats
    getQueueStats().then(setQueueStats);

    // Cleanup
    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
      unsubscribeQueue();
      unsubscribeInstall();
      window.removeEventListener('pwa-install-ready', handleInstallReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Actions
  const sync = useCallback(async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('[usePWA] Sync failed:', error);
      throw error;
    }
  }, []);

  const promptInstall = useCallback(async () => {
    try {
      const accepted = await showInstallPrompt();
      setInstallState(getInstallState());
      return accepted;
    } catch (error) {
      console.error('[usePWA] Install prompt failed:', error);
      return false;
    }
  }, []);

  const refresh = useCallback(() => {
    setNetworkState(getNetworkState());
    setSyncStatus(getSyncStatus());
    getQueueStats().then(setQueueStats);
    setInstallState(getInstallState());
  }, []);

  // Build state object
  const state: PWAState = {
    // Connection
    networkState,
    isOnline: networkState.status === 'online',
    isOffline: networkState.status === 'offline',

    // Sync
    syncStatus,
    isSyncing: syncStatus.isSyncing,
    hasPendingActions: syncStatus.pendingCount > 0,
    hasFailedActions: syncStatus.failedCount > 0,

    // Queue
    queueStats,

    // Features
    features,

    // Installation
    installState,
    canInstall: installState.canInstall,
    isInstalled: installState.isInstalled,
  };

  // Build actions object
  const actions: PWAActions = {
    sync,
    forceSync: sync,
    promptInstall,
    refresh,
  };

  return {
    state,
    actions,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for monitoring network state only
 */
export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>(() =>
    typeof window !== 'undefined' ? getNetworkState() : { status: 'offline' }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = addNetworkListener(setNetworkState);
    return unsubscribe;
  }, []);

  return networkState;
}

/**
 * Hook for monitoring online/offline status
 */
export function useOnlineStatus(): boolean {
  const networkState = useNetworkState();
  return networkState.status === 'online';
}

/**
 * Hook for monitoring sync status
 */
export function useSyncStatus(): SyncStatus {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    typeof window !== 'undefined'
      ? getSyncStatus()
      : {
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
          connectionStatus: 'offline',
        }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = addSyncStatusListener(setSyncStatus);
    return unsubscribe;
  }, []);

  return syncStatus;
}

/**
 * Hook for monitoring queue stats
 */
export function useQueueStats(): QueueStats {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    byType: {
      score_update: 0,
      tournament_registration: 0,
      tournament_checkin: 0,
      player_update: 0,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = addQueueListener(setQueueStats);

    // Load initial stats
    getQueueStats().then(setQueueStats);

    return unsubscribe;
  }, []);

  return queueStats;
}

/**
 * Hook for PWA installation
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
} {
  const [installState, setInstallState] = useState<InstallState>(() =>
    typeof window !== 'undefined'
      ? getInstallState()
      : {
          canInstall: false,
          isInstalled: false,
        }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = setupInstallPrompt();

    const handleInstallReady = () => {
      setInstallState(getInstallState());
    };
    window.addEventListener('pwa-install-ready', handleInstallReady);

    const handleAppInstalled = () => {
      setInstallState(getInstallState());
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('pwa-install-ready', handleInstallReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    try {
      const accepted = await showInstallPrompt();
      setInstallState(getInstallState());
      return accepted;
    } catch (error) {
      console.error('[useInstallPrompt] Failed:', error);
      return false;
    }
  }, []);

  return {
    canInstall: installState.canInstall,
    isInstalled: installState.isInstalled,
    promptInstall,
  };
}
