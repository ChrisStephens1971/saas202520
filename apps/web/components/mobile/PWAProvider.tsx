'use client';

/**
 * PWA Provider Component
 *
 * Wraps the app and handles PWA functionality including:
 * - Service worker registration
 * - Install prompt management
 * - Push notification setup
 */

import * as React from 'react';
import { InstallPrompt } from './InstallPrompt';
import { getPushNotificationManager } from '@/lib/pwa/push-notifications';

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isReady, setIsReady] = React.useState(false);

  // eslint-disable-next-line react-compiler/react-compiler
  React.useEffect(() => {
    // Register service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    // Initialize push notification manager
    const pushManager = getPushNotificationManager();

    // Check if already subscribed
    pushManager.getSubscription().then((subscription) => {
      if (subscription) {
        console.log('[PWA] Already subscribed to push notifications');
      }
    });

    setIsReady(true);
  }, []);

  if (!isReady) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}
