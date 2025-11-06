/**
 * Notification Preferences Component
 * Sprint 8 - Advanced Features
 *
 * UI for managing browser push notification preferences
 */

'use client';

import { useState, useEffect } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscriptionStatus,
  sendTestNotification,
  saveNotificationPreferences,
  loadNotificationPreferences,
  type NotificationPreferences as NotificationPreferencesType,
} from '@/lib/notifications';

interface NotificationPreferencesProps {
  tournamentId?: string;
}

export function NotificationPreferences({ tournamentId }: NotificationPreferencesProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState({ granted: false, denied: false, default: true });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferencesType>({
    matchStart: true,
    matchEnd: true,
    tournamentUpdates: true,
    chipAwards: true,
    systemAlerts: true,
  });

  useEffect(() => {
    // Check browser support
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      // Load permission status
      const permissionStatus = getNotificationPermissionStatus();
      setPermission(permissionStatus);

      // Load subscription status
      getPushSubscriptionStatus().then(status => {
        setIsSubscribed(status.isSubscribed);
        setIsLoading(false);
      });

      // Load preferences
      const savedPreferences = loadNotificationPreferences();
      setPreferences(savedPreferences);
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission.granted) {
        // Subscribe to push notifications
        await subscribeToPushNotifications(tournamentId);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsLoading(true);
    try {
      await unsubscribeFromPushNotifications(tournamentId);
      setIsSubscribed(false);
    } catch (error) {
      console.error('Error disabling notifications:', error);
      alert('Failed to disable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification(
        'Tournament Update',
        'This is a test notification. You will receive updates like this during tournaments.'
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification. Make sure notifications are enabled.');
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferencesType) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
          Notifications Not Supported
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300">
          Your browser does not support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          🔔 Notification Settings
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Stay updated with real-time tournament notifications
        </p>
      </div>

      {/* Permission Status */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              Notification Status
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {permission.granted && isSubscribed ? 'Enabled' : permission.denied ? 'Blocked' : 'Disabled'}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            permission.granted && isSubscribed
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : permission.denied
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            {permission.granted && isSubscribed ? '✓ Active' : permission.denied ? '✕ Blocked' : '○ Inactive'}
          </div>
        </div>
      </div>

      {/* Enable/Disable Controls */}
      {permission.denied ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            Notifications are blocked. Please enable them in your browser settings to receive updates.
          </p>
        </div>
      ) : !isSubscribed ? (
        <button
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? 'Enabling...' : 'Enable Notifications'}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Notification Preferences */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              Notification Types
            </h4>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Match Start</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">When a match begins</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.matchStart}
                onChange={() => handlePreferenceChange('matchStart')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Match End</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">When a match concludes</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.matchEnd}
                onChange={() => handlePreferenceChange('matchEnd')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Tournament Updates</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Status changes and announcements</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.tournamentUpdates}
                onChange={() => handlePreferenceChange('tournamentUpdates')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Chip Awards</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">When chips are awarded</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.chipAwards}
                onChange={() => handlePreferenceChange('chipAwards')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">System Alerts</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Important system messages</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.systemAlerts}
                onChange={() => handlePreferenceChange('systemAlerts')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleTestNotification}
              className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium rounded-lg transition-colors"
            >
              Test Notification
            </button>
            <button
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Disabling...' : 'Disable Notifications'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
