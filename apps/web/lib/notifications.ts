/**
 * Browser Push Notifications Service
 * Sprint 8 - Advanced Features
 *
 * Handles browser push notification subscription and management
 */

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return { granted: false, denied: true, default: false };
  }

  const permission = Notification.permission;
  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default',
  };
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default',
  };
}

/**
 * Convert subscription to JSON for API
 */
function subscriptionToJSON(subscription: PushSubscription): PushSubscriptionData {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    },
  };
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(
  tournamentId?: string
): Promise<PushSubscriptionData | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications not supported');
  }

  // Register service worker
  const registration = await navigator.serviceWorker.ready;

  // Subscribe to push manager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    ),
  });

  const subscriptionData = subscriptionToJSON(subscription);

  // Send subscription to backend
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription: subscriptionData,
      tournamentId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }

  return subscriptionData;
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPushNotifications(
  tournamentId?: string
): Promise<void> {
  if (!isPushNotificationSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  // Unsubscribe from push manager
  await subscription.unsubscribe();

  // Remove subscription from backend
  await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription: subscriptionToJSON(subscription),
      tournamentId,
    }),
  });
}

/**
 * Get current push subscription status
 */
export async function getPushSubscriptionStatus(): Promise<{
  isSubscribed: boolean;
  subscription: PushSubscriptionData | null;
}> {
  if (!isPushNotificationSupported()) {
    return { isSubscribed: false, subscription: null };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return { isSubscribed: false, subscription: null };
    }

    return {
      isSubscribed: true,
      subscription: subscriptionToJSON(subscription),
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { isSubscribed: false, subscription: null };
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(
  title: string = 'Test Notification',
  body: string = 'This is a test notification from Tournament Management System'
): Promise<void> {
  const permission = getNotificationPermissionStatus();

  if (!permission.granted) {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'test-notification',
    requireInteraction: false,
  });
}

/**
 * Utility: Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Notification preferences type
 */
export interface NotificationPreferences {
  matchStart: boolean;
  matchEnd: boolean;
  tournamentUpdates: boolean;
  chipAwards: boolean;
  systemAlerts: boolean;
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(
  preferences: NotificationPreferences
): void {
  localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
}

/**
 * Load notification preferences from localStorage
 */
export function loadNotificationPreferences(): NotificationPreferences {
  const stored = localStorage.getItem('notificationPreferences');

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing notification preferences:', error);
    }
  }

  // Default preferences
  return {
    matchStart: true,
    matchEnd: true,
    tournamentUpdates: true,
    chipAwards: true,
    systemAlerts: true,
  };
}
