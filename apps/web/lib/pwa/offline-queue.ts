/**
 * Offline Queue System
 *
 * Manages queuing of actions when offline and syncing when connection returns.
 * Uses IndexedDB for persistent storage across sessions.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// =============================================================================
// TYPES
// =============================================================================

export interface QueuedAction {
  id: string;
  type: 'score_update' | 'tournament_registration' | 'tournament_checkin' | 'player_update';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
  tenantId?: string;
}

export interface SyncResult {
  success: boolean;
  actionId: string;
  error?: string;
}

interface OfflineQueueDB extends DBSchema {
  actions: {
    key: string;
    value: QueuedAction;
    indexes: {
      'by-status': string;
      'by-type': string;
      'by-timestamp': number;
    };
  };
}

// =============================================================================
// DATABASE SETUP
// =============================================================================

const DB_NAME = 'offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

let dbInstance: IDBPDatabase<OfflineQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create actions store
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
      });

      // Create indexes
      store.createIndex('by-status', 'status');
      store.createIndex('by-type', 'type');
      store.createIndex('by-timestamp', 'timestamp');
    },
  });

  return dbInstance;
}

// =============================================================================
// QUEUE OPERATIONS
// =============================================================================

/**
 * Add an action to the offline queue
 */
export async function queueAction(
  type: QueuedAction['type'],
  endpoint: string,
  method: QueuedAction['method'],
  data: any,
  tenantId?: string
): Promise<string> {
  const db = await getDB();

  const action: QueuedAction = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    endpoint,
    method,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: 'pending',
    tenantId,
  };

  await db.add(STORE_NAME, action);

  console.log('[OfflineQueue] Action queued:', action.id, type);

  // Notify listeners
  notifyListeners();

  return action.id;
}

/**
 * Get all queued actions
 */
export async function getQueuedActions(
  status?: QueuedAction['status']
): Promise<QueuedAction[]> {
  const db = await getDB();

  if (status) {
    return db.getAllFromIndex(STORE_NAME, 'by-status', status);
  }

  return db.getAll(STORE_NAME);
}

/**
 * Get queued actions by type
 */
export async function getQueuedActionsByType(
  type: QueuedAction['type']
): Promise<QueuedAction[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-type', type);
}

/**
 * Get a single action by ID
 */
export async function getAction(id: string): Promise<QueuedAction | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * Update an action's status
 */
export async function updateAction(
  id: string,
  updates: Partial<QueuedAction>
): Promise<void> {
  const db = await getDB();
  const action = await db.get(STORE_NAME, id);

  if (!action) {
    throw new Error(`Action not found: ${id}`);
  }

  const updatedAction = { ...action, ...updates };
  await db.put(STORE_NAME, updatedAction);

  console.log('[OfflineQueue] Action updated:', id, updates);

  // Notify listeners
  notifyListeners();
}

/**
 * Remove an action from the queue
 */
export async function removeAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);

  console.log('[OfflineQueue] Action removed:', id);

  // Notify listeners
  notifyListeners();
}

/**
 * Clear all completed actions
 */
export async function clearCompletedActions(): Promise<number> {
  const db = await getDB();
  const completed = await db.getAllFromIndex(STORE_NAME, 'by-status', 'completed');

  for (const action of completed) {
    await db.delete(STORE_NAME, action.id);
  }

  console.log('[OfflineQueue] Cleared completed actions:', completed.length);

  // Notify listeners
  notifyListeners();

  return completed.length;
}

/**
 * Clear all actions (use with caution)
 */
export async function clearAllActions(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);

  console.log('[OfflineQueue] All actions cleared');

  // Notify listeners
  notifyListeners();
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Sync all pending actions
 */
export async function syncAllActions(): Promise<SyncResult[]> {
  const pendingActions = await getQueuedActions('pending');

  console.log('[OfflineQueue] Syncing actions:', pendingActions.length);

  const results: SyncResult[] = [];

  for (const action of pendingActions) {
    const result = await syncAction(action.id);
    results.push(result);
  }

  return results;
}

/**
 * Sync a single action
 */
export async function syncAction(actionId: string): Promise<SyncResult> {
  const action = await getAction(actionId);

  if (!action) {
    return {
      success: false,
      actionId,
      error: 'Action not found',
    };
  }

  // Mark as syncing
  await updateAction(actionId, { status: 'syncing' });

  try {
    // Build request headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add tenant header if available
    if (action.tenantId) {
      headers['X-Tenant-ID'] = action.tenantId;
    }

    // Make the request
    const response = await fetch(action.endpoint, {
      method: action.method,
      headers,
      body: JSON.stringify(action.data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Mark as completed
    await updateAction(actionId, {
      status: 'completed',
    });

    console.log('[OfflineQueue] Action synced successfully:', actionId);

    return {
      success: true,
      actionId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('[OfflineQueue] Sync failed:', actionId, errorMessage);

    // Increment retry count
    const newRetryCount = action.retryCount + 1;

    if (newRetryCount >= action.maxRetries) {
      // Max retries reached, mark as failed
      await updateAction(actionId, {
        status: 'failed',
        retryCount: newRetryCount,
        error: errorMessage,
      });

      return {
        success: false,
        actionId,
        error: `Max retries reached: ${errorMessage}`,
      };
    } else {
      // Retry later
      await updateAction(actionId, {
        status: 'pending',
        retryCount: newRetryCount,
        error: errorMessage,
      });

      return {
        success: false,
        actionId,
        error: `Retry ${newRetryCount}/${action.maxRetries}: ${errorMessage}`,
      };
    }
  }
}

/**
 * Retry all failed actions
 */
export async function retryFailedActions(): Promise<SyncResult[]> {
  const failedActions = await getQueuedActions('failed');

  console.log('[OfflineQueue] Retrying failed actions:', failedActions.length);

  // Reset failed actions to pending with increased max retries
  for (const action of failedActions) {
    await updateAction(action.id, {
      status: 'pending',
      maxRetries: action.maxRetries + 3, // Give them 3 more tries
      retryCount: 0,
      error: undefined,
    });
  }

  // Sync them
  return syncAllActions();
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface QueueStats {
  total: number;
  pending: number;
  syncing: number;
  completed: number;
  failed: number;
  byType: Record<QueuedAction['type'], number>;
  oldestPending?: number; // timestamp
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const allActions = await getQueuedActions();

  const stats: QueueStats = {
    total: allActions.length,
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
  };

  let oldestPendingTimestamp: number | undefined;

  for (const action of allActions) {
    // Count by status
    stats[action.status]++;

    // Count by type
    stats.byType[action.type]++;

    // Track oldest pending
    if (action.status === 'pending') {
      if (!oldestPendingTimestamp || action.timestamp < oldestPendingTimestamp) {
        oldestPendingTimestamp = action.timestamp;
      }
    }
  }

  stats.oldestPending = oldestPendingTimestamp;

  return stats;
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

type QueueListener = (stats: QueueStats) => void;

const listeners = new Set<QueueListener>();

/**
 * Add a listener for queue changes
 */
export function addQueueListener(listener: QueueListener): () => void {
  listeners.add(listener);

  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all listeners of queue changes
 */
async function notifyListeners(): Promise<void> {
  if (listeners.size === 0) return;

  const stats = await getQueueStats();

  for (const listener of listeners) {
    try {
      listener(stats);
    } catch (error) {
      console.error('[OfflineQueue] Listener error:', error);
    }
  }
}

// =============================================================================
// AUTO-SYNC ON CONNECTION
// =============================================================================

let autoSyncEnabled = false;

/**
 * Enable automatic syncing when connection is restored
 */
export function enableAutoSync(): void {
  if (autoSyncEnabled) return;

  autoSyncEnabled = true;

  // Listen for online event
  window.addEventListener('online', handleOnline);

  console.log('[OfflineQueue] Auto-sync enabled');
}

/**
 * Disable automatic syncing
 */
export function disableAutoSync(): void {
  if (!autoSyncEnabled) return;

  autoSyncEnabled = false;

  window.removeEventListener('online', handleOnline);

  console.log('[OfflineQueue] Auto-sync disabled');
}

/**
 * Handle connection restoration
 */
async function handleOnline(): Promise<void> {
  console.log('[OfflineQueue] Connection restored, syncing...');

  try {
    const results = await syncAllActions();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    console.log(
      `[OfflineQueue] Sync complete: ${successCount} success, ${failCount} failed`
    );

    // Clear completed actions after successful sync
    if (successCount > 0) {
      await clearCompletedActions();
    }
  } catch (error) {
    console.error('[OfflineQueue] Auto-sync error:', error);
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the offline queue system
 */
export async function initOfflineQueue(): Promise<void> {
  console.log('[OfflineQueue] Initializing...');

  // Initialize database
  await getDB();

  // Enable auto-sync
  enableAutoSync();

  // Clean up old completed actions (older than 7 days)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const allActions = await getQueuedActions();

  for (const action of allActions) {
    if (action.status === 'completed' && action.timestamp < weekAgo) {
      await removeAction(action.id);
    }
  }

  console.log('[OfflineQueue] Initialized successfully');
}

// Auto-initialize when module loads (if in browser)
if (typeof window !== 'undefined') {
  initOfflineQueue().catch((error) => {
    console.error('[OfflineQueue] Initialization failed:', error);
  });
}
