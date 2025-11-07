/**
 * PWA Type Definitions
 *
 * Shared types for PWA functionality.
 */

// =============================================================================
// SERVICE WORKER TYPES
// =============================================================================

export interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isActivated: boolean;
  updateAvailable: boolean;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface NotificationPermission {
  state: 'granted' | 'denied' | 'default';
  canPrompt: boolean;
}

// =============================================================================
// INSTALLATION TYPES
// =============================================================================

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export interface InstallState {
  canInstall: boolean;
  isInstalled: boolean;
  promptEvent?: InstallPromptEvent;
}

// =============================================================================
// NETWORK TYPES
// =============================================================================

export type NetworkStatus = 'online' | 'offline' | 'slow';

export interface NetworkInformation extends EventTarget {
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: EventListener;
}

export interface NetworkState {
  status: NetworkStatus;
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

// =============================================================================
// STORAGE TYPES
// =============================================================================

export interface StorageEstimate {
  usage?: number;
  quota?: number;
  usageDetails?: {
    indexedDB?: number;
    caches?: number;
    serviceWorkerRegistrations?: number;
  };
}

// =============================================================================
// SYNC TYPES
// =============================================================================

export interface BackgroundSyncTag {
  tag: string;
  lastChance?: boolean;
}

export interface PeriodicSyncTag {
  tag: string;
  minInterval: number;
}

// =============================================================================
// SHARE TYPES
// =============================================================================

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// FEATURE DETECTION
// =============================================================================

export interface PWAFeatures {
  serviceWorker: boolean;
  notifications: boolean;
  pushNotifications: boolean;
  backgroundSync: boolean;
  periodicSync: boolean;
  webShare: boolean;
  installPrompt: boolean;
  standalone: boolean;
  cacheStorage: boolean;
  indexedDB: boolean;
  networkInformation: boolean;
  storageEstimate: boolean;
}

// =============================================================================
// MANIFEST TYPES
// =============================================================================

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'maskable' | 'any' | 'maskable any';
}

export interface ManifestScreenshot {
  src: string;
  sizes: string;
  type: string;
  form_factor?: 'wide' | 'narrow';
}

export interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: ManifestIcon[];
}

export interface WebAppManifest {
  name: string;
  short_name?: string;
  description?: string;
  start_url: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  background_color: string;
  theme_color: string;
  orientation?: 'portrait' | 'portrait-primary' | 'landscape' | 'landscape-primary' | 'any';
  categories?: string[];
  icons?: ManifestIcon[];
  screenshots?: ManifestScreenshot[];
  shortcuts?: ManifestShortcut[];
}
