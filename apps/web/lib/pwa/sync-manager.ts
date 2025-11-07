/**
 * Sync Manager
 *
 * Coordinates syncing between offline queue, cache, and server.
 * Handles conflict resolution and sync strategies.
 */

import {
  syncAllActions,
  syncAction,
  getQueueStats,
  addQueueListener,
  QueueStats,
  SyncResult,
} from './offline-queue';
import { invalidateApiCache, invalidateTournamentCache } from './cache-manager';

// =============================================================================
// TYPES
// =============================================================================

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: number;
  nextSyncTime?: number;
  pendingCount: number;
  failedCount: number;
  connectionStatus: 'online' | 'offline';
}

export interface SyncConflict {
  id: string;
  type: 'version' | 'deleted' | 'modified';
  localData: any;
  serverData: any;
  timestamp: number;
}

export interface SyncStrategy {
  immediate: boolean; // Sync immediately on connection
  interval?: number; // Auto-sync interval in ms
  retryDelay?: number; // Delay between retries
  batchSize?: number; // Number of actions to sync at once
}

// =============================================================================
// STATE
// =============================================================================

let syncStatus: SyncStatus = {
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  connectionStatus: navigator.onLine ? 'online' : 'offline',
};

let syncStrategy: SyncStrategy = {
  immediate: true,
  interval: 5 * 60 * 1000, // 5 minutes
  retryDelay: 30 * 1000, // 30 seconds
  batchSize: 10,
};

let syncIntervalId: NodeJS.Timeout | null = null;
let retryTimeoutId: NodeJS.Timeout | null = null;

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Start a sync operation
 */
export async function startSync(): Promise<SyncResult[]> {
  if (syncStatus.isSyncing) {
    console.log('[SyncManager] Sync already in progress');
    return [];
  }

  if (!navigator.onLine) {
    console.log('[SyncManager] Offline, cannot sync');
    return [];
  }

  console.log('[SyncManager] Starting sync...');

  syncStatus.isSyncing = true;
  notifySyncStatusChange();

  try {
    // Sync all pending actions
    const results = await syncAllActions();

    // Update sync status
    syncStatus.lastSyncTime = Date.now();
    syncStatus.isSyncing = false;

    // Schedule next sync
    if (syncStrategy.interval) {
      syncStatus.nextSyncTime = Date.now() + syncStrategy.interval;
    }

    notifySyncStatusChange();

    // Invalidate caches for synced data
    await invalidateApiCache();
    await invalidateTournamentCache();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    console.log(`[SyncManager] Sync complete: ${successCount} success, ${failCount} failed`);

    // Retry failed actions after delay
    if (failCount > 0 && syncStrategy.retryDelay) {
      scheduleRetry();
    }

    return results;
  } catch (error) {
    console.error('[SyncManager] Sync error:', error);

    syncStatus.isSyncing = false;
    notifySyncStatusChange();

    // Retry after delay
    if (syncStrategy.retryDelay) {
      scheduleRetry();
    }

    throw error;
  }
}

/**
 * Schedule a retry after failure
 */
function scheduleRetry(): void {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
  }

  console.log(`[SyncManager] Scheduling retry in ${syncStrategy.retryDelay}ms`);

  retryTimeoutId = setTimeout(() => {
    retryTimeoutId = null;
    startSync().catch((error) => {
      console.error('[SyncManager] Retry failed:', error);
    });
  }, syncStrategy.retryDelay);
}

/**
 * Cancel scheduled sync
 */
export function cancelSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }

  syncStatus.nextSyncTime = undefined;
  notifySyncStatusChange();

  console.log('[SyncManager] Sync cancelled');
}

/**
 * Force immediate sync (bypass throttling)
 */
export async function forceSync(): Promise<SyncResult[]> {
  console.log('[SyncManager] Force sync requested');

  // Cancel any scheduled syncs
  cancelSync();

  // Start immediate sync
  return startSync();
}

// =============================================================================
// SYNC STRATEGY
// =============================================================================

/**
 * Update sync strategy
 */
export function setSyncStrategy(strategy: Partial<SyncStrategy>): void {
  syncStrategy = { ...syncStrategy, ...strategy };

  console.log('[SyncManager] Sync strategy updated:', syncStrategy);

  // Restart auto-sync with new strategy
  if (syncStrategy.interval) {
    startAutoSync();
  } else {
    stopAutoSync();
  }
}

/**
 * Get current sync strategy
 */
export function getSyncStrategy(): SyncStrategy {
  return { ...syncStrategy };
}

// =============================================================================
// AUTO-SYNC
// =============================================================================

/**
 * Start automatic syncing
 */
export function startAutoSync(): void {
  // Stop existing auto-sync
  stopAutoSync();

  if (!syncStrategy.interval) {
    console.log('[SyncManager] Auto-sync disabled (no interval)');
    return;
  }

  console.log(`[SyncManager] Starting auto-sync (interval: ${syncStrategy.interval}ms)`);

  syncIntervalId = setInterval(() => {
    if (navigator.onLine && !syncStatus.isSyncing) {
      startSync().catch((error) => {
        console.error('[SyncManager] Auto-sync error:', error);
      });
    }
  }, syncStrategy.interval);

  // Set next sync time
  syncStatus.nextSyncTime = Date.now() + syncStrategy.interval;
  notifySyncStatusChange();
}

/**
 * Stop automatic syncing
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    syncStatus.nextSyncTime = undefined;
    notifySyncStatusChange();

    console.log('[SyncManager] Auto-sync stopped');
  }
}

// =============================================================================
// CONFLICT RESOLUTION
// =============================================================================

const conflicts: SyncConflict[] = [];

/**
 * Add a sync conflict
 */
export function addConflict(conflict: SyncConflict): void {
  conflicts.push(conflict);
  console.warn('[SyncManager] Sync conflict detected:', conflict);
  notifySyncStatusChange();
}

/**
 * Get all unresolved conflicts
 */
export function getConflicts(): SyncConflict[] {
  return [...conflicts];
}

/**
 * Resolve a conflict (manual resolution by user)
 */
export function resolveConflict(
  conflictId: string,
  resolution: 'use-local' | 'use-server' | 'merge'
): void {
  const index = conflicts.findIndex((c) => c.id === conflictId);

  if (index === -1) {
    console.error('[SyncManager] Conflict not found:', conflictId);
    return;
  }

  const conflict = conflicts[index];

  console.log('[SyncManager] Resolving conflict:', conflictId, resolution);

  // Remove from conflicts list
  conflicts.splice(index, 1);

  // Handle resolution based on strategy
  switch (resolution) {
    case 'use-local':
      // Re-queue the local data to overwrite server
      console.log('[SyncManager] Using local data');
      break;

    case 'use-server':
      // Discard local data, use server data
      console.log('[SyncManager] Using server data');
      // Would need to update local state here
      break;

    case 'merge':
      // Attempt to merge changes
      console.log('[SyncManager] Merging changes');
      // Would need custom merge logic here
      break;
  }

  notifySyncStatusChange();
}

/**
 * Clear all conflicts (use with caution)
 */
export function clearConflicts(): void {
  conflicts.length = 0;
  notifySyncStatusChange();
  console.log('[SyncManager] All conflicts cleared');
}

// =============================================================================
// CONNECTION MONITORING
// =============================================================================

/**
 * Handle online event
 */
function handleOnline(): void {
  console.log('[SyncManager] Connection restored');

  syncStatus.connectionStatus = 'online';
  notifySyncStatusChange();

  // Start immediate sync if enabled
  if (syncStrategy.immediate) {
    startSync().catch((error) => {
      console.error('[SyncManager] Auto-sync on reconnect failed:', error);
    });
  }

  // Resume auto-sync
  if (syncStrategy.interval) {
    startAutoSync();
  }
}

/**
 * Handle offline event
 */
function handleOffline(): void {
  console.log('[SyncManager] Connection lost');

  syncStatus.connectionStatus = 'offline';
  syncStatus.isSyncing = false;
  notifySyncStatusChange();

  // Stop auto-sync
  stopAutoSync();
}

// =============================================================================
// STATUS & EVENTS
// =============================================================================

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

type SyncStatusListener = (status: SyncStatus) => void;

const statusListeners = new Set<SyncStatusListener>();

/**
 * Add a sync status listener
 */
export function addSyncStatusListener(listener: SyncStatusListener): () => void {
  statusListeners.add(listener);

  // Return unsubscribe function
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Notify all listeners of status change
 */
function notifySyncStatusChange(): void {
  for (const listener of statusListeners) {
    try {
      listener(syncStatus);
    } catch (error) {
      console.error('[SyncManager] Status listener error:', error);
    }
  }
}

/**
 * Update status from queue stats
 */
function updateStatusFromQueue(stats: QueueStats): void {
  syncStatus.pendingCount = stats.pending;
  syncStatus.failedCount = stats.failed;
  notifySyncStatusChange();
}

// =============================================================================
// PERIODIC SYNC
// =============================================================================

/**
 * Request periodic background sync (if supported)
 */
export async function requestPeriodicSync(tag: string = 'tournament-sync'): Promise<boolean> {
  if (!('periodicSync' in self.registration)) {
    console.log('[SyncManager] Periodic Sync not supported');
    return false;
  }

  try {
    // @ts-ignore - periodicSync is not yet in TypeScript types
    await self.registration.periodicSync.register(tag, {
      minInterval: 24 * 60 * 60 * 1000, // 1 day
    });

    console.log('[SyncManager] Periodic sync registered:', tag);
    return true;
  } catch (error) {
    console.error('[SyncManager] Periodic sync registration failed:', error);
    return false;
  }
}

/**
 * Unregister periodic sync
 */
export async function unregisterPeriodicSync(tag: string = 'tournament-sync'): Promise<void> {
  if (!('periodicSync' in self.registration)) {
    return;
  }

  try {
    // @ts-ignore
    await self.registration.periodicSync.unregister(tag);
    console.log('[SyncManager] Periodic sync unregistered:', tag);
  } catch (error) {
    console.error('[SyncManager] Periodic sync unregistration failed:', error);
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if syncing is in progress
 */
export function isSyncing(): boolean {
  return syncStatus.isSyncing;
}

/**
 * Check if there are pending actions
 */
export function hasPendingActions(): boolean {
  return syncStatus.pendingCount > 0;
}

/**
 * Check if there are failed actions
 */
export function hasFailedActions(): boolean {
  return syncStatus.failedCount > 0;
}

/**
 * Check if conflicts exist
 */
export function hasConflicts(): boolean {
  return conflicts.length > 0;
}

/**
 * Get time until next sync
 */
export function getTimeUntilNextSync(): number | null {
  if (!syncStatus.nextSyncTime) {
    return null;
  }

  return Math.max(0, syncStatus.nextSyncTime - Date.now());
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize sync manager
 */
export function initSyncManager(): void {
  console.log('[SyncManager] Initializing...');

  // Listen for connection changes
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Listen for queue changes
  addQueueListener(updateStatusFromQueue);

  // Update initial status
  getQueueStats().then(updateStatusFromQueue);

  // Start auto-sync if enabled
  if (syncStrategy.interval) {
    startAutoSync();
  }

  // Request periodic sync (if supported)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    requestPeriodicSync().catch((error) => {
      console.error('[SyncManager] Failed to request periodic sync:', error);
    });
  }

  console.log('[SyncManager] Initialized successfully');
}

/**
 * Cleanup sync manager
 */
export function cleanupSyncManager(): void {
  console.log('[SyncManager] Cleaning up...');

  // Remove event listeners
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  // Stop auto-sync
  stopAutoSync();

  // Cancel any pending operations
  cancelSync();

  console.log('[SyncManager] Cleanup complete');
}

// Auto-initialize when module loads (if in browser)
if (typeof window !== 'undefined') {
  initSyncManager();
}
