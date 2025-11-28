# PWA Integration Examples

**Sprint 10 Week 4 - Real-World Usage Examples**

## Example 1: Basic App Setup

### Root Layout Integration

```tsx
// app/layout.tsx
import { PWAProvider } from '@/components/mobile/PWAProvider';
import { Toaster } from '@/components/ui/toaster';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />

        {/* iOS Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tournament App" />

        {/* Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <PWAProvider>
          {children}
          <Toaster />
        </PWAProvider>
      </body>
    </html>
  );
}
```

---

## Example 2: Navigation with Install Button

### Header Component

```tsx
// components/Header.tsx
'use client';

import { InstallButton } from '@/components/mobile/InstallPrompt';
import { Bell } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/">
          <h1 className="text-xl font-bold">Tournament Platform</h1>
        </Link>

        <div className="flex items-center gap-4">
          {/* Install Button (only shows when installable) */}
          <InstallButton />

          {/* Notifications Link */}
          <Link href="/settings/notifications" className="rounded-lg p-2 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
```

---

## Example 3: Settings Page with Notifications

### Settings Page

```tsx
// app/settings/notifications/page.tsx
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <NotificationSettings />
    </div>
  );
}
```

---

## Example 4: Onboarding with Permission Request

### Onboarding Flow

```tsx
// app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PushPermissionDialog } from '@/components/mobile/PushPermissionDialog';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const router = useRouter();

  const handleComplete = () => {
    router.push('/dashboard');
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {step === 1 && (
        <div>
          <h2>Welcome to Tournament Platform</h2>
          <p>Let's get you set up...</p>
          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Stay Updated</h2>
          <p>Enable notifications to never miss a match or tournament update.</p>
          <button onClick={() => setShowPushDialog(true)}>Enable Notifications</button>
          <button onClick={handleComplete}>Skip</button>
        </div>
      )}

      <PushPermissionDialog
        isOpen={showPushDialog}
        onClose={() => setShowPushDialog(false)}
        onSuccess={handleComplete}
      />
    </div>
  );
}
```

---

## Example 5: Tournament Notifications

### Send Match Start Notification

```typescript
// lib/notifications/match-notifications.ts
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';
import { VAPID_CONFIG } from '@/lib/pwa/vapid-keys';

webpush.setVapidDetails(VAPID_CONFIG.subject, VAPID_CONFIG.publicKey, VAPID_CONFIG.privateKey);

export async function sendMatchStartNotification(
  matchId: string,
  playerId: string,
  minutesBefore: number = 15
) {
  // Get player's push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: {
        player: { id: playerId },
      },
    },
  });

  // Get match details
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      player1: true,
      player2: true,
    },
  });

  if (!match) return;

  const opponent = match.player1.id === playerId ? match.player2 : match.player1;

  const payload = JSON.stringify({
    title: 'Match Starting Soon',
    body: `Your match vs ${opponent.name} starts in ${minutesBefore} minutes`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `match-${matchId}`,
    data: {
      url: `/matches/${matchId}`,
      type: 'match',
    },
    actions: [
      { action: 'view', title: 'View Match', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });

  // Send to all user's devices
  const results = await Promise.allSettled(
    subscriptions.map((sub) => {
      // Check user preferences
      const prefs = sub.preferences as any;
      if (!prefs.enabled || !prefs.types?.match) {
        return Promise.resolve(); // Skip if disabled
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey,
        },
      };

      return webpush.sendNotification(pushSubscription, payload);
    })
  );

  // Clean up failed subscriptions
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('Failed to send notification:', result.reason);
      // Optionally remove invalid subscription
      prisma.pushSubscription
        .delete({
          where: { id: subscriptions[index].id },
        })
        .catch(console.error);
    }
  });

  console.log(`Sent ${results.length} match notifications for match ${matchId}`);
}
```

### Schedule Match Notifications

```typescript
// lib/notifications/scheduler.ts
import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { sendMatchStartNotification } from './match-notifications';

// Run every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

  // Find matches starting in 15 minutes
  const upcomingMatches = await prisma.match.findMany({
    where: {
      scheduledStartTime: {
        gte: now,
        lte: in15Minutes,
      },
      status: 'scheduled',
    },
    include: {
      player1: true,
      player2: true,
    },
  });

  // Send notifications for each match
  for (const match of upcomingMatches) {
    await sendMatchStartNotification(match.id, match.player1.id, 15);
    await sendMatchStartNotification(match.id, match.player2.id, 15);
  }
});
```

---

## Example 6: Tournament Bracket Updates

### Send Bracket Update

```typescript
// lib/notifications/tournament-notifications.ts
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';
import { VAPID_CONFIG } from '@/lib/pwa/vapid-keys';

export async function sendBracketUpdateNotification(tournamentId: string) {
  // Get tournament details
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: {
        include: { player: { include: { user: true } } },
      },
    },
  });

  if (!tournament) return;

  // Get all participant subscriptions
  const userIds = tournament.participants.map((p) => p.player.userId);
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: userIds },
    },
  });

  const payload = JSON.stringify({
    title: 'Tournament Update',
    body: `${tournament.name} bracket has been updated`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `tournament-${tournamentId}`,
    data: {
      url: `/tournaments/${tournamentId}`,
      type: 'tournament',
    },
  });

  // Send to all participants
  await Promise.allSettled(
    subscriptions.map((sub) => {
      const prefs = sub.preferences as any;
      if (!prefs.enabled || !prefs.types?.tournament) {
        return Promise.resolve();
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey,
        },
      };

      return webpush.sendNotification(pushSubscription, payload);
    })
  );
}
```

---

## Example 7: Achievement Notifications

### Send Achievement

```typescript
// lib/notifications/achievement-notifications.ts
export async function sendAchievementNotification(
  userId: string,
  achievementName: string,
  achievementDescription: string
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({
    title: 'Achievement Unlocked!',
    body: `You earned "${achievementName}" - ${achievementDescription}`,
    icon: '/icons/trophy.png',
    badge: '/icons/badge-72x72.png',
    tag: `achievement-${achievementName}`,
    data: {
      url: '/profile/achievements',
      type: 'achievement',
    },
    actions: [
      { action: 'view', title: 'View Achievements' },
      { action: 'share', title: 'Share' },
    ],
  });

  await Promise.allSettled(
    subscriptions.map((sub) => {
      const prefs = sub.preferences as any;
      if (!prefs.enabled || !prefs.types?.achievement) {
        return Promise.resolve();
      }

      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey,
        },
      };

      return webpush.sendNotification(pushSubscription, payload);
    })
  );
}
```

---

## Example 8: System Announcements

### Broadcast Announcement

```typescript
// lib/notifications/announcement-notifications.ts
export async function broadcastAnnouncement(title: string, message: string, url: string = '/') {
  // Get all active subscriptions
  const subscriptions = await prisma.pushSubscription.findMany();

  const payload = JSON.stringify({
    title,
    body: message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'announcement',
    data: {
      url,
      type: 'announcement',
    },
  });

  // Send to all users (in batches to avoid rate limits)
  const batchSize = 100;
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map((sub) => {
        const prefs = sub.preferences as any;
        if (!prefs.enabled || !prefs.types?.announcement) {
          return Promise.resolve();
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        };

        return webpush.sendNotification(pushSubscription, payload);
      })
    );

    // Wait 1 second between batches
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`Broadcast sent to ${subscriptions.length} devices`);
}
```

---

## Example 9: Tournament Reminders

### Schedule Reminder

```typescript
// lib/notifications/reminder-notifications.ts
import cron from 'node-cron';

// Run daily at 10 AM
cron.schedule('0 10 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date(tomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  // Find tournaments starting tomorrow
  const upcomingTournaments = await prisma.tournament.findMany({
    where: {
      startDate: {
        gte: tomorrow,
        lte: endOfTomorrow,
      },
    },
    include: {
      participants: {
        include: { player: { include: { user: true } } },
      },
    },
  });

  // Send reminders
  for (const tournament of upcomingTournaments) {
    const userIds = tournament.participants.map((p) => p.player.userId);
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    const payload = JSON.stringify({
      title: 'Tournament Tomorrow',
      body: `${tournament.name} starts tomorrow at ${tournament.startTime}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `reminder-${tournament.id}`,
      data: {
        url: `/tournaments/${tournament.id}`,
        type: 'reminder',
      },
    });

    await Promise.allSettled(
      subscriptions.map((sub) => {
        const prefs = sub.preferences as any;
        if (!prefs.enabled || !prefs.types?.reminder) {
          return Promise.resolve();
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        };

        return webpush.sendNotification(pushSubscription, payload);
      })
    );
  }
});
```

---

## Example 10: Custom Hook for Notifications

### useNotifications Hook

```typescript
// hooks/useNotifications.ts
'use client';

import { useState, useEffect } from 'react';
import { getPushNotificationManager } from '@/lib/pwa/push-notifications';
import type { NotificationPreferences } from '@/lib/pwa/push-notifications';

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const manager = getPushNotificationManager();
    const subscription = await manager.getSubscription();
    setIsSubscribed(!!subscription);
    setPreferences(manager.getPreferences());
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const manager = getPushNotificationManager();
      const subscription = await manager.subscribe();
      setIsSubscribed(!!subscription);
      return !!subscription;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const manager = getPushNotificationManager();
      await manager.unsubscribe();
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    const manager = getPushNotificationManager();
    await manager.updatePreferences(prefs);
    setPreferences(manager.getPreferences());
  };

  const testNotification = async () => {
    const manager = getPushNotificationManager();
    await manager.testNotification();
  };

  return {
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    testNotification,
  };
}
```

### Usage in Component

```tsx
// components/NotificationToggle.tsx
'use client';

import { useNotifications } from '@/hooks/useNotifications';

export function NotificationToggle() {
  const { isSubscribed, isLoading, subscribe, unsubscribe } = useNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
    >
      {isLoading ? 'Loading...' : isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
    </button>
  );
}
```

---

## Example 11: Analytics Integration

### Track Notification Events

```typescript
// lib/analytics/notification-events.ts
export function trackInstallPromptShown(platform: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'pwa_install_prompt_shown', {
      event_category: 'PWA',
      event_label: platform,
    });
  }
}

export function trackInstallComplete(platform: string, outcome: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'pwa_install_complete', {
      event_category: 'PWA',
      event_label: outcome,
      platform,
    });
  }
}

export function trackNotificationPermission(granted: boolean) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'notification_permission', {
      event_category: 'Notifications',
      event_label: granted ? 'granted' : 'denied',
    });
  }
}

export function trackNotificationReceived(type: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'notification_received', {
      event_category: 'Notifications',
      event_label: type,
    });
  }
}

export function trackNotificationClicked(type: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'notification_clicked', {
      event_category: 'Notifications',
      event_label: type,
    });
  }
}
```

---

## Complete Integration Summary

### 1. Root Setup

- Add `PWAProvider` to root layout
- Include manifest link and meta tags
- Set up theme colors

### 2. Navigation

- Add `InstallButton` to header
- Link to notification settings

### 3. Onboarding

- Show `PushPermissionDialog` during onboarding
- Explain benefits clearly
- Track conversion

### 4. Settings

- Full `NotificationSettings` component
- Per-type preferences
- Quiet hours configuration

### 5. Backend Integration

- Send match notifications (15 min before)
- Send tournament updates (bracket changes)
- Send achievement notifications (immediate)
- Send system announcements (important only)
- Send tournament reminders (day before)

### 6. Analytics

- Track install conversions
- Track notification engagement
- Track permission grants
- Optimize based on data

---

**See also:**

- 📖 `docs/PWA-IMPLEMENTATION-GUIDE.md` - Complete technical guide
- 📋 `docs/PWA-SETUP-CHECKLIST.md` - Quick setup
- 📝 `docs/PWA-QUICK-REFERENCE.md` - Developer reference
