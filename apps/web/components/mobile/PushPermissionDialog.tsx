'use client';

/**
 * Push Permission Dialog
 *
 * Modal dialog to request push notification permission
 * with clear explanation of benefits.
 */

import * as React from 'react';
import { X, Bell, Calendar, Trophy, Megaphone, Clock } from 'lucide-react';
import { getPushNotificationManager } from '@/lib/pwa/push-notifications';

interface PushPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PushPermissionDialog({ isOpen, onClose, onSuccess }: PushPermissionDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnable = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const manager = getPushNotificationManager();
      const subscription = await manager.subscribe();

      if (subscription) {
        onSuccess?.();
        onClose();
      } else {
        setError('Failed to subscribe. Please check browser permissions.');
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setError('Failed to enable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const notificationTypes = [
    {
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      title: 'Match Reminders',
      description: 'Get notified 15 minutes before your matches',
    },
    {
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
      title: 'Tournament Updates',
      description: 'Stay informed about bracket changes and results',
    },
    {
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      title: 'Achievements',
      description: 'Celebrate when you unlock new achievements',
    },
    {
      icon: Megaphone,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      title: 'Announcements',
      description: 'Important platform updates and news',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enable Notifications
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stay updated with real-time alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Get notified about important updates:
          </p>

          {/* Notification Types */}
          <div className="space-y-3">
            {notificationTypes.map((type) => (
              <div
                key={type.title}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${type.bgColor}`}
                >
                  <type.icon className={`h-5 w-5 ${type.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {type.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{type.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Note */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Privacy:</strong> You can customize notification preferences at any time in
              Settings. We'll never spam you.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Maybe Later
          </button>
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage push permission dialog
 */
export function usePushPermissionDialog() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
  };
}
