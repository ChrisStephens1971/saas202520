/**
 * Push Notification System
 *
 * Handles service worker registration, push subscriptions,
 * and notification delivery for PWA.
 */

import { getPublicVapidKey, urlBase64ToUint8Array } from './vapid-keys';

export type NotificationType =
  | 'match'
  | 'tournament'
  | 'achievement'
  | 'announcement'
  | 'reminder';

export interface NotificationPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data: {
    url: string;
    type: NotificationType;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    match: boolean;
    tournament: boolean;
    achievement: boolean;
    announcement: boolean;
    reminder: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  sound: boolean;
  vibration: boolean;
}

const STORAGE_KEY = 'push_notification_preferences';
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  types: {
    match: true,
    tournament: true,
    achievement: true,
    announcement: true,
    reminder: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  sound: true,
  vibration: true,
};

class PushNotificationManager {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private preferences: NotificationPreferences;

  constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): NotificationPreferences {
    if (typeof window === 'undefined') {
      return DEFAULT_PREFERENCES;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }

    return DEFAULT_PREFERENCES;
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.serviceWorkerRegistration = registration;

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        this.preferences.enabled = true;
        this.savePreferences();
      }

      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      const registration = await this.registerServiceWorker();
      if (!registration) return null;
      this.serviceWorkerRegistration = registration;
    }

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return null;
      }

      const publicKey = getPublicVapidKey();
      const convertedKey = urlBase64ToUint8Array(publicKey);

      const subscription =
        await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

      this.subscription = subscription;

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return false;
    }

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer();

      this.subscription = null;
      this.preferences.enabled = false;
      this.savePreferences();

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      await this.registerServiceWorker();
    }

    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      const subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(
    subscription: PushSubscription
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          preferences: this.preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription?.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    this.preferences = { ...this.preferences, ...preferences };
    this.savePreferences();

    // Update server if subscribed
    if (this.subscription) {
      try {
        await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: this.subscription.toJSON(),
            preferences: this.preferences,
          }),
        });
      } catch (error) {
        console.error('Failed to update preferences on server:', error);
      }
    }
  }

  /**
   * Get preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if notification should be shown (quiet hours, preferences)
   */
  shouldShowNotification(type: NotificationType): boolean {
    if (!this.preferences.enabled) {
      return false;
    }

    if (!this.preferences.types[type]) {
      return false;
    }

    if (this.preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = this.preferences.quietHours;

      // Handle quiet hours that span midnight
      if (start > end) {
        if (currentTime >= start || currentTime <= end) {
          return false;
        }
      } else {
        if (currentTime >= start && currentTime <= end) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Test notification
   */
  async testNotification(): Promise<void> {
    if (!this.subscription) {
      throw new Error('Not subscribed to push notifications');
    }

    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON(),
          notification: {
            title: 'Test Notification',
            body: 'This is a test notification from Tournament Platform',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'test',
            data: {
              url: '/',
              type: 'announcement',
            },
          },
        }),
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    return Notification.permission;
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }
}

// Singleton instance
let pushNotificationManager: PushNotificationManager | null = null;

/**
 * Get push notification manager instance
 */
export function getPushNotificationManager(): PushNotificationManager {
  if (!pushNotificationManager) {
    pushNotificationManager = new PushNotificationManager();
  }
  return pushNotificationManager;
}

export type { NotificationPreferences };
