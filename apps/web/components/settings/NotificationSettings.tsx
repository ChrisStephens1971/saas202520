'use client';

/**
 * Notification Settings Component
 *
 * Allows users to manage push notification preferences including
 * notification types, quiet hours, sound, and vibration.
 */

import * as React from 'react';
import { Bell, BellOff, Volume2, VolumeX, Vibrate, Clock, Send } from 'lucide-react';
import {
  getPushNotificationManager,
  type NotificationPreferences,
} from '@/lib/pwa/push-notifications';

export function NotificationSettings() {
  const manager = getPushNotificationManager();
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    manager.getPreferences()
  );
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Check subscription status on mount
  React.useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const subscription = await manager.getSubscription();
    setIsSubscribed(!!subscription);
  };

  const handleToggleNotifications = async () => {
    setIsLoading(true);

    try {
      if (isSubscribed) {
        await manager.unsubscribe();
        setIsSubscribed(false);
        setPreferences((prev) => ({ ...prev, enabled: false }));
      } else {
        const subscription = await manager.subscribe();
        if (subscription) {
          setIsSubscribed(true);
          setPreferences((prev) => ({ ...prev, enabled: true }));
        }
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async (
    updates: Partial<NotificationPreferences>
  ) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    await manager.updatePreferences(newPreferences);
  };

  const handleToggleNotificationType = (
    type: keyof NotificationPreferences['types']
  ) => {
    handleUpdatePreferences({
      types: {
        ...preferences.types,
        [type]: !preferences.types[type],
      },
    });
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) return;

    setTestStatus('sending');

    try {
      await manager.testNotification();
      setTestStatus('sent');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const notificationTypes = [
    {
      key: 'match' as const,
      label: 'Match Updates',
      description: 'Get notified 15 minutes before your match starts',
    },
    {
      key: 'tournament' as const,
      label: 'Tournament Updates',
      description: 'Bracket changes and tournament announcements',
    },
    {
      key: 'achievement' as const,
      label: 'Achievements',
      description: 'Unlock notifications for new achievements',
    },
    {
      key: 'announcement' as const,
      label: 'System Announcements',
      description: 'Important platform updates and news',
    },
    {
      key: 'reminder' as const,
      label: 'Reminders',
      description: 'Tournament reminders one day before',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notification Settings
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your push notification preferences
        </p>
      </div>

      {/* Not Supported Warning */}
      {!manager.isSupported() && (
        <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <Bell className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Push Notifications Not Supported
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Your browser doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enable/Disable Notifications */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-6 w-6 text-blue-600" />
            ) : (
              <BellOff className="h-6 w-6 text-gray-400" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isSubscribed
                  ? 'Notifications are enabled'
                  : 'Enable notifications to stay updated'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleNotifications}
            disabled={isLoading || !manager.isSupported()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSubscribed ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSubscribed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Types */}
      {isSubscribed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            Notification Types
          </h3>

          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div
                key={type.key}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {type.label}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleNotificationType(type.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    preferences.types[type.key]
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.types[type.key]
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sound and Vibration */}
      {isSubscribed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            Sound & Vibration
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {preferences.sound ? (
                  <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Sound
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Play sound with notifications
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  handleUpdatePreferences({ sound: !preferences.sound })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.sound
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.sound ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Vibration
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vibrate device with notifications
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  handleUpdatePreferences({
                    vibration: !preferences.vibration,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.vibration
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.vibration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Hours */}
      {isSubscribed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Quiet Hours
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pause notifications during specific hours
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                handleUpdatePreferences({
                  quietHours: {
                    ...preferences.quietHours,
                    enabled: !preferences.quietHours.enabled,
                  },
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.quietHours.enabled
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.quietHours.enabled
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {preferences.quietHours.enabled && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) =>
                    handleUpdatePreferences({
                      quietHours: {
                        ...preferences.quietHours,
                        start: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) =>
                    handleUpdatePreferences({
                      quietHours: {
                        ...preferences.quietHours,
                        end: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Notification */}
      {isSubscribed && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Test Notification
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send a test notification to verify your settings
              </p>
            </div>

            <button
              onClick={handleTestNotification}
              disabled={testStatus === 'sending'}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {testStatus === 'sending'
                ? 'Sending...'
                : testStatus === 'sent'
                  ? 'Sent!'
                  : testStatus === 'error'
                    ? 'Error'
                    : 'Send Test'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
