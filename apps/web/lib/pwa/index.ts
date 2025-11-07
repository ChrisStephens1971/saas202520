/**
 * PWA Module Index
 *
 * Central export point for all PWA functionality.
 */

// Offline Queue
export {
  queueAction,
  getQueuedActions,
  getQueuedActionsByType,
  getAction,
  updateAction,
  removeAction,
  clearCompletedActions,
  clearAllActions,
  syncAllActions,
  syncAction,
  retryFailedActions,
  getQueueStats,
  addQueueListener,
  enableAutoSync,
  disableAutoSync,
  initOfflineQueue,
} from './offline-queue';

export type { QueuedAction, SyncResult, QueueStats } from './offline-queue';

// Cache Manager
export {
  isCacheSupported,
  addToCache,
  getFromCache,
  removeFromCache,
  clearCache,
  clearAllCaches,
  clearOldCaches,
  getCacheStats,
  isCacheSizeExceeded,
  preloadCriticalResources,
  prefetchTournamentData,
  prefetchPlayerData,
  warmCache,
  invalidateTournamentCache,
  invalidateApiCache,
  formatBytes,
  getCacheUsagePercentage,
  isCached,
  initCacheManager,
  CACHE_NAMES,
} from './cache-manager';

export type { CacheStats, CacheOptions } from './cache-manager';

// Sync Manager
export {
  startSync,
  cancelSync,
  forceSync,
  setSyncStrategy,
  getSyncStrategy,
  startAutoSync,
  stopAutoSync,
  addConflict,
  getConflicts,
  resolveConflict,
  clearConflicts,
  getSyncStatus,
  addSyncStatusListener,
  requestPeriodicSync,
  unregisterPeriodicSync,
  isSyncing,
  hasPendingActions,
  hasFailedActions,
  hasConflicts,
  getTimeUntilNextSync,
  initSyncManager,
  cleanupSyncManager,
} from './sync-manager';

export type { SyncStatus, SyncConflict, SyncStrategy } from './sync-manager';

// Utilities
export {
  detectPWAFeatures,
  isStandalone,
  isMobile,
  isIOS,
  isAndroid,
  registerServiceWorker,
  unregisterServiceWorker,
  sendMessageToSW,
  getNetworkState,
  addNetworkListener,
  getStorageEstimate,
  requestPersistentStorage,
  isStoragePersistent,
  getNotificationPermission,
  requestNotificationPermission,
  setupInstallPrompt,
  getInstallState,
  showInstallPrompt,
  canShare,
  share,
  getAppVersion,
  clearAllAppData,
  initPWAUtils,
} from './utils';

export type {
  PWAFeatures,
  NetworkState,
  NetworkStatus,
  NetworkInformation,
  StorageEstimate,
  InstallState,
  NotificationPermission,
  ShareData,
  ShareResult,
  ServiceWorkerMessage,
  ServiceWorkerState,
  PushNotificationPayload,
  InstallPromptEvent,
  WebAppManifest,
} from './types';
