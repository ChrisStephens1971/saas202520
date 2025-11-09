/**
 * PWA Utilities
 *
 * Helper functions for PWA features and capabilities.
 */

import type {
  PWAFeatures,
  NetworkState,
  NetworkInformation,
  StorageEstimate,
  InstallState,
  NotificationPermission,
  ShareData,
  ShareResult,
} from './types';

// =============================================================================
// FEATURE DETECTION
// =============================================================================

/**
 * Detect all PWA features
 */
export function detectPWAFeatures(): PWAFeatures {
  if (typeof window === 'undefined') {
    return {
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
    };
  }

  return {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    pushNotifications: 'PushManager' in window,
    backgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
    periodicSync: 'periodicSync' in ServiceWorkerRegistration.prototype,
    webShare: 'share' in navigator,
    installPrompt: true, // Will be detected via event
    standalone: isStandalone(),
    cacheStorage: 'caches' in window,
    indexedDB: 'indexedDB' in window,
    networkInformation: 'connection' in navigator,
    storageEstimate: 'storage' in navigator && 'estimate' in navigator.storage,
  };
}

/**
 * Check if app is running in standalone mode
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if running in standalone mode
  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://');

  return isStandalonePWA;
}

/**
 * Check if running on mobile device
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android/i.test(navigator.userAgent);
}

// =============================================================================
// SERVICE WORKER
// =============================================================================

/**
 * Register service worker
 */
export async function registerServiceWorker(
  scriptURL: string = '/sw.js'
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptURL, {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[PWA] Service Worker update found');

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New Service Worker installed');
            // Notify user of update
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service Worker unregistered:', success);
      return success;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToSW(message: unknown): Promise<unknown> {
  if (!navigator.serviceWorker.controller) {
    throw new Error('No active service worker');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// =============================================================================
// NETWORK
// =============================================================================

/**
 * Get network state
 */
export function getNetworkState(): NetworkState {
  const online = navigator.onLine;

  if (!online) {
    return {
      status: 'offline',
    };
  }

  // Get network information if available
  const connection = (navigator as any).connection as NetworkInformation | undefined;

  if (connection) {
    const isSlow =
      connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';

    return {
      status: isSlow ? 'slow' : 'online',
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }

  return {
    status: 'online',
  };
}

/**
 * Listen for network changes
 */
export function addNetworkListener(callback: (state: NetworkState) => void): () => void {
  const handleChange = () => {
    callback(getNetworkState());
  };

  window.addEventListener('online', handleChange);
  window.addEventListener('offline', handleChange);

  const connection = (navigator as any).connection as NetworkInformation | undefined;
  if (connection) {
    connection.addEventListener('change', handleChange);
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleChange);
    window.removeEventListener('offline', handleChange);

    if (connection) {
      connection.removeEventListener('change', handleChange);
    }
  };
}

// =============================================================================
// STORAGE
// =============================================================================

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
    return {};
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate;
  } catch (error) {
    console.error('[PWA] Failed to get storage estimate:', error);
    return {};
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator) || !('persist' in navigator.storage)) {
    return false;
  }

  try {
    const granted = await navigator.storage.persist();
    console.log('[PWA] Persistent storage:', granted ? 'granted' : 'denied');
    return granted;
  } catch (error) {
    console.error('[PWA] Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if (!('storage' in navigator) || !('persisted' in navigator.storage)) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('[PWA] Failed to check storage persistence:', error);
    return false;
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * Get notification permission state
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return {
      state: 'denied',
      canPrompt: false,
    };
  }

  return {
    state: Notification.permission,
    canPrompt: Notification.permission === 'default',
  };
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[PWA] Failed to request notification permission:', error);
    return 'denied';
  }
}

// =============================================================================
// INSTALLATION
// =============================================================================

// BeforeInstallPromptEvent is not in standard TypeScript lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Setup install prompt listener
 */
export function setupInstallPrompt(): () => void {
  const handler = (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Store the event so it can be triggered later
    deferredPrompt = e;

    console.log('[PWA] Install prompt ready');

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  };

  window.addEventListener('beforeinstallprompt', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
  };
}

/**
 * Get install state
 */
export function getInstallState(): InstallState {
  return {
    canInstall: !!deferredPrompt,
    isInstalled: isStandalone(),
    promptEvent: deferredPrompt,
  };
}

/**
 * Show install prompt
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt not available');
    return false;
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    console.log('[PWA] Install prompt outcome:', outcome);

    // Clear the deferred prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return false;
  }
}

// =============================================================================
// SHARING
// =============================================================================

/**
 * Check if Web Share is supported
 */
export function canShare(data?: ShareData): boolean {
  if (!('share' in navigator)) {
    return false;
  }

  if (data) {
    return (navigator as any).canShare?.(data) ?? true;
  }

  return true;
}

/**
 * Share data using Web Share API
 */
export async function share(data: ShareData): Promise<ShareResult> {
  if (!canShare(data)) {
    return {
      success: false,
      error: 'Web Share not supported',
    };
  }

  try {
    await navigator.share(data);
    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Share cancelled',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share failed',
    };
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get app version from service worker
 */
export async function getAppVersion(): Promise<string | null> {
  try {
    const response = await sendMessageToSW({ type: 'GET_VERSION' });
    return response.version || null;
  } catch {
    return null;
  }
}

/**
 * Clear all app data (caches, storage, etc.)
 */
export async function clearAllAppData(): Promise<void> {
  console.log('[PWA] Clearing all app data...');

  // Clear caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  // Clear IndexedDB
  if ('indexedDB' in window) {
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((db) => indexedDB.deleteDatabase(db.name!)));
  }

  // Clear localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();

  console.log('[PWA] All app data cleared');
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize PWA utilities
 */
export function initPWAUtils(): void {
  console.log('[PWA] Initializing utilities...');

  // Setup install prompt
  setupInstallPrompt();

  // Log PWA features
  const features = detectPWAFeatures();
  console.log('[PWA] Features:', features);

  // Log network state
  const networkState = getNetworkState();
  console.log('[PWA] Network:', networkState);

  console.log('[PWA] Utilities initialized');
}

// Auto-initialize when module loads (if in browser)
if (typeof window !== 'undefined') {
  initPWAUtils();
}
