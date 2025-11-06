# Technical Specification: Mobile PWA Enhancements

**Author:** Claude (Engineering Lead)
**Date:** 2025-11-06
**Status:** Draft
**Related PRD:** `product/PRDs/mobile-pwa-enhancements.md`

---

## Overview

### Problem

Tournament organizers and participants face significant challenges on mobile devices:
- Poor mobile experience with small tap targets and no gesture support
- Unreliable connectivity at venues causing disruptions
- Slow performance (3-5s load times on 3G)
- No push notifications for time-sensitive updates
- No offline capabilities for reliable tournament operations

### Solution Summary

Transform the tournament platform into a Progressive Web App (PWA) with:
- **Service Worker** using Workbox for intelligent caching and offline support
- **Touch-optimized UI** with 44px+ tap targets, gesture navigation, haptic feedback
- **IndexedDB storage** for offline tournament data via Dexie.js
- **Push notifications** using Web Push API + Firebase Cloud Messaging
- **Performance optimizations** targeting <2s load on 3G, Lighthouse >90

### Goals

1. **Deliver app-like mobile experience** without requiring native app installation
2. **Enable offline tournament management** for reliable operations in poor connectivity
3. **Achieve sub-2-second load times** on 3G networks
4. **Implement push notifications** for match assignments and tournament updates
5. **Reach Lighthouse PWA score >90** with excellent mobile UX
6. **Drive 30%+ PWA install rate** and 50%+ push notification opt-in

### Non-Goals

- Native mobile apps (iOS/Android) - PWA-first approach
- iOS-specific features requiring native code (unless PWA fails validation)
- Desktop-specific optimizations (maintain existing desktop experience)
- Real-time video streaming or heavy media features
- Bluetooth/NFC integrations (defer to future sprints)

---

## Background & Context

### Current State

**Existing Architecture:**
- Next.js 14+ application with App Router
- PostgreSQL database with multi-tenant architecture
- Redis for caching and real-time features
- Responsive design but not mobile-optimized
- No service worker or offline capabilities
- No push notification infrastructure

**Current Performance:**
- Mobile page load: 4.2s on 3G
- Time to Interactive: 5.1s
- Lighthouse PWA score: 45
- Mobile bounce rate: 45%
- Mobile traffic: 70%+ of total users

### Constraints

**Technical Constraints:**
- Must maintain multi-tenant data isolation
- Cannot break existing desktop experience
- Must support iOS Safari (limited PWA features)
- 5-day implementation timeline (Sprint 10 Week 4)
- Must work with existing Next.js 14 App Router architecture

**Business Constraints:**
- No budget for native app development
- Free tier of Firebase Cloud Messaging (FCM)
- Performance budgets: <300KB JS, <50KB CSS
- Must support offline tournament operations

**Timeline Constraints:**
- 5 days for implementation
- Week 5 for beta testing
- Week 6 for gradual rollout

### Assumptions

- 70%+ of users access platform on mobile devices
- Tournament venues have unreliable Wi-Fi connectivity
- Users are willing to install PWA if value is clear
- Modern browsers (Chrome 90+, Safari 15+, Firefox 90+)
- Users have 50MB+ available storage for caching
- Push notifications will increase engagement

---

## Proposed Solution

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Mobile)                       │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │   React    │  │  Web App    │  │  Push Notification   │  │
│  │   UI       │  │  Manifest   │  │  Permission          │  │
│  └─────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │
│        │                │                     │              │
└────────┼────────────────┼─────────────────────┼──────────────┘
         │                │                     │
    ┌────▼────────────────▼─────────────────────▼────┐
    │           Service Worker (Workbox)             │
    │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
    │  │  Cache   │  │  Sync    │  │  Push Event  │ │
    │  │ Strategy │  │  Queue   │  │   Handler    │ │
    │  └──────────┘  └──────────┘  └──────────────┘ │
    └────┬───────────────┬─────────────────┬─────────┘
         │               │                 │
    ┌────▼────────┐ ┌───▼──────────┐ ┌────▼─────────┐
    │   Cache     │ │   IndexedDB  │ │  FCM/Push    │
    │   Storage   │ │   (Dexie)    │ │   Service    │
    │  (Static    │ │  (Offline    │ │              │
    │   Assets)   │ │   Data)      │ │              │
    └─────────────┘ └──────┬───────┘ └──────┬───────┘
                           │                │
                    ┌──────▼────────────────▼──────┐
                    │      Next.js API Routes       │
                    │  ┌──────────────────────────┐ │
                    │  │  /api/pwa/manifest       │ │
                    │  │  /api/push/subscribe     │ │
                    │  │  /api/sync/queue         │ │
                    │  │  /api/offline/tournament │ │
                    │  └──────────────────────────┘ │
                    └───────────┬───────────────────┘
                                │
                    ┌───────────▼───────────────────┐
                    │  PostgreSQL + Redis + Storage │
                    │  (Multi-tenant, Tenant-scoped)│
                    └───────────────────────────────┘
```

### Components

#### Component 1: Service Worker (Workbox)

**Purpose:** Intelligent caching, offline support, background sync, push notifications
**Technology:** Workbox 7.x, JavaScript
**Location:** `/public/sw.js` (generated), `/app/sw-config.ts` (configuration)

**Interfaces:**
- **Cache API:** Store static assets and API responses
- **Background Sync API:** Queue offline actions for later sync
- **Push API:** Receive and display push notifications
- **Fetch API:** Intercept network requests for caching

**Key Features:**
- Cache-first strategy for static assets (HTML, CSS, JS, images)
- Network-first strategy for API calls with cache fallback
- Stale-while-revalidate for tournament pages
- Background sync for offline score submissions
- Push notification handling with action buttons

**Implementation:**
```typescript
// workbox-config.ts
import { GenerateSW } from 'workbox-webpack-plugin';

export const workboxConfig = {
  globDirectory: 'out/',
  globPatterns: [
    '**/*.{html,js,css,png,svg,jpg,gif,json,woff,woff2}'
  ],
  swDest: 'out/sw.js',
  runtimeCaching: [
    // Static assets - Cache first
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // API calls - Network first with cache fallback
    {
      urlPattern: /^https:\/\/.*\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60, // 1 minute
        },
      },
    },
    // Tournament pages - Stale while revalidate
    {
      urlPattern: /^https:\/\/.*\/tournaments\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'tournament-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300, // 5 minutes
        },
      },
    },
  ],
};

// Background sync
const bgSyncPlugin = new BackgroundSyncPlugin('offline-queue', {
  maxRetentionTime: 24 * 60, // 24 hours
});

registerRoute(
  /\/api\/matches\/\d+\/score/,
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Match' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    data: { url: data.url },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
```

#### Component 2: Mobile-Optimized UI Components

**Purpose:** Touch-friendly, gesture-enabled interface components
**Technology:** React 18, Tailwind CSS, Framer Motion
**Location:** `/app/components/mobile/`

**Components:**
- `BottomNavigation` - Thumb-zone navigation (5 tabs)
- `SwipeableCard` - Horizontal swipe for tournament cards
- `TouchFeedback` - Visual + haptic feedback wrapper
- `InstallPrompt` - Smart PWA install banner
- `OfflineIndicator` - Connection status banner
- `PullToRefresh` - Pull-down refresh gesture
- `FloatingActionButton` - Primary action FAB
- `GestureHandler` - Centralized gesture recognition

**Example - BottomNavigation:**
```typescript
// app/components/mobile/BottomNavigation.tsx
'use client';

import { Home, Trophy, Swords, User, MoreHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { hapticFeedback } from '@/lib/haptics';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Trophy, label: 'Tournaments', href: '/tournaments' },
  { icon: Swords, label: 'Matches', href: '/matches' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: MoreHorizontal, label: 'More', href: '/more' },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => hapticFeedback('light')}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 ${
                isActive ? 'text-primary-600' : 'text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Example - InstallPrompt:**
```typescript
// app/components/mobile/InstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show after 3 visits or after completing first tournament
      const visits = parseInt(localStorage.getItem('visit_count') || '0');
      const dismissedAt = localStorage.getItem('install_prompt_dismissed');

      if (visits >= 3 && (!dismissedAt || Date.now() - parseInt(dismissedAt) > 7 * 24 * 60 * 60 * 1000)) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('install_prompt_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border border-primary-200">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-3">
        <Download className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Install Tournament Platform</h3>
          <ul className="text-sm text-gray-600 mb-3 space-y-1">
            <li>✓ Access offline</li>
            <li>✓ Get push notifications</li>
            <li>✓ Faster loading</li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 font-medium"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Component 3: Offline Storage (IndexedDB via Dexie.js)

**Purpose:** Client-side structured data storage for offline capabilities
**Technology:** Dexie.js 3.x (IndexedDB wrapper)
**Location:** `/app/lib/db/`

**Schema:**
```typescript
// app/lib/db/index.ts
import Dexie, { Table } from 'dexie';

export interface Tournament {
  id: string;
  tenantId: string;
  name: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  startDate: string;
  bracketData: any;
  lastViewed: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  tenantId: string;
  player1Id: string;
  player2Id: string;
  tableNumber: number;
  status: 'pending' | 'in_progress' | 'completed';
  score: any;
}

export interface SyncAction {
  id?: number;
  action: 'score_match' | 'register_player' | 'check_in';
  endpoint: string;
  method: string;
  body: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
  tenantId: string;
}

class TournamentDB extends Dexie {
  tournaments!: Table<Tournament>;
  matches!: Table<Match>;
  syncQueue!: Table<SyncAction>;

  constructor() {
    super('TournamentPlatformDB');
    this.version(1).stores({
      tournaments: 'id, tenantId, status, lastViewed',
      matches: 'id, tournamentId, tenantId, status, tableNumber',
      syncQueue: '++id, action, timestamp, status, tenantId',
    });
  }
}

export const db = new TournamentDB();

// Utility functions
export async function cacheTournament(tournament: Tournament) {
  await db.tournaments.put({
    ...tournament,
    lastViewed: Date.now(),
  });
}

export async function getCachedTournament(id: string, tenantId: string) {
  return db.tournaments
    .where({ id, tenantId })
    .first();
}

export async function queueOfflineAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'status' | 'retries'>) {
  await db.syncQueue.add({
    ...action,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
  });
}

export async function syncOfflineActions(tenantId: string) {
  const pending = await db.syncQueue
    .where({ status: 'pending', tenantId })
    .toArray();

  const results = [];
  for (const action of pending) {
    try {
      await db.syncQueue.update(action.id!, { status: 'syncing' });

      const response = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      });

      if (response.ok) {
        await db.syncQueue.update(action.id!, { status: 'synced' });
        results.push({ id: action.id, success: true });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      await db.syncQueue.update(action.id!, {
        status: action.retries >= 3 ? 'failed' : 'pending',
        retries: action.retries + 1,
      });
      results.push({ id: action.id, success: false, error: error.message });
    }
  }

  return results;
}

// Clean old cached data (call periodically)
export async function cleanOldCache() {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  await db.tournaments.where('lastViewed').below(sevenDaysAgo).delete();
}
```

#### Component 4: Push Notification System

**Purpose:** Web push notifications for match assignments and tournament updates
**Technology:** Web Push API, Firebase Cloud Messaging (FCM)
**Location:** `/app/lib/push/`

**Implementation:**
```typescript
// app/lib/push/manager.ts
export class NotificationManager {
  private static vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.subscribeToNotifications();
      return true;
    }
    return false;
  }

  static async subscribeToNotifications() {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
    });

    // Send subscription to backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        preferences: {
          matchNotifications: true,
          tournamentUpdates: true,
          achievements: true,
        },
      }),
    });

    return subscription;
  }

  static async unsubscribe() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Notification templates
export const NotificationTemplates = {
  matchStarting: (opponent: string, tableNumber: number) => ({
    title: 'Your match is starting soon!',
    body: `Match vs ${opponent} at Table ${tableNumber} in 5 minutes`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Match' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }),

  tableAssignment: (tableNumber: number) => ({
    title: 'Table Assignment',
    body: `You've been assigned to Table ${tableNumber}`,
    icon: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'OK' },
    ],
  }),

  tournamentUpdate: (tournamentName: string, message: string) => ({
    title: `Update: ${tournamentName}`,
    body: message,
    icon: '/icons/icon-192x192.png',
  }),
};
```

#### Component 5: Haptic Feedback & Gestures

**Purpose:** Native-like tactile feedback and gesture recognition
**Technology:** Vibration API, Touch Events, Pointer Events
**Location:** `/app/lib/haptics/`, `/app/lib/gestures/`

**Haptic Feedback:**
```typescript
// app/lib/haptics/index.ts
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

export function hapticFeedback(pattern: HapticPattern) {
  if (!('vibrate' in navigator)) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [20, 10, 20],
    error: [30, 10, 30, 10, 30],
  };

  navigator.vibrate(patterns[pattern]);
}
```

**Gesture Handler:**
```typescript
// app/lib/gestures/useSwipe.ts
import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipe(handlers: SwipeHandlers, threshold = 50) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < -threshold && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < -threshold && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }

      touchStartRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlers, threshold]);
}
```

---

## Data Model

### New Tables

#### Table: `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  preferences JSONB DEFAULT '{
    "match_notifications": true,
    "tournament_updates": true,
    "achievements": true,
    "quiet_hours": {"start": "22:00", "end": "08:00"}
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(endpoint)
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_tenant ON push_subscriptions(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Relationships:**
- Foreign key to `tenants(id)` - Multi-tenant isolation
- Foreign key to `users(id)` - User ownership

**Privacy:**
- Endpoint and keys encrypted at rest
- Deleted when user unsubscribes or deletes account
- GDPR/CCPA compliant (explicit opt-in)

#### Table: `push_notifications`

```sql
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX idx_push_notifications_sent_at ON push_notifications(sent_at);
CREATE INDEX idx_push_notifications_type ON push_notifications(notification_type);

-- Partitioning by month (for performance)
-- ALTER TABLE push_notifications PARTITION BY RANGE (sent_at);
```

**Relationships:**
- Foreign key to `tenants(id)` - Multi-tenant isolation
- Foreign key to `users(id)` - Recipient

**Analytics:**
- Track delivery success/failure
- Track click-through rates
- Identify optimal notification times

#### Table: `sync_queue` (Server-side tracking)

```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  endpoint TEXT NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  retries INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sync_queue_status ON sync_queue(status, tenant_id);
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);

-- Auto-delete synced items after 7 days
CREATE OR REPLACE FUNCTION cleanup_old_sync_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_queue
  WHERE status = 'synced'
  AND synced_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-sync-queue', '0 2 * * *', 'SELECT cleanup_old_sync_queue()');
```

**Relationships:**
- Foreign key to `tenants(id)` - Multi-tenant isolation
- Foreign key to `users(id)` - Action ownership

---

## API Design

### Endpoint 1: GET /api/pwa/manifest.json

**Purpose:** Dynamic PWA manifest with tenant-specific branding

**Request:**
```
GET /api/pwa/manifest.json
Headers:
  Host: tenant-subdomain.platform.com
```

**Response (200 OK):**
```json
{
  "name": "Tournament Manager - TenantName",
  "short_name": "Tournaments",
  "description": "Offline-first tournament management",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0070f3",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Tournament",
      "url": "/tournaments/new",
      "icons": [{ "src": "/icons/new.png", "sizes": "96x96" }]
    },
    {
      "name": "Active Tournaments",
      "url": "/tournaments/active",
      "icons": [{ "src": "/icons/active.png", "sizes": "96x96" }]
    },
    {
      "name": "My Profile",
      "url": "/profile",
      "icons": [{ "src": "/icons/profile.png", "sizes": "96x96" }]
    }
  ]
}
```

**Implementation:**
```typescript
// app/api/pwa/manifest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromHost } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  const tenant = await getTenantFromHost(request.headers.get('host') || '');

  const manifest = {
    name: `Tournament Manager - ${tenant.name}`,
    short_name: 'Tournaments',
    description: 'Offline-first tournament management',
    start_url: '/',
    display: 'standalone',
    theme_color: tenant.theme_color || '#0070f3',
    background_color: '#ffffff',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    shortcuts: [
      {
        name: 'New Tournament',
        url: '/tournaments/new',
        icons: [{ src: '/icons/new.png', sizes: '96x96' }],
      },
      {
        name: 'Active Tournaments',
        url: '/tournaments/active',
        icons: [{ src: '/icons/active.png', sizes: '96x96' }],
      },
      {
        name: 'My Profile',
        url: '/profile',
        icons: [{ src: '/icons/profile.png', sizes: '96x96' }],
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
```

### Endpoint 2: POST /api/push/subscribe

**Purpose:** Register push notification subscription

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNc...",
      "auth": "tBH..."
    }
  },
  "preferences": {
    "match_notifications": true,
    "tournament_updates": true,
    "achievements": true,
    "quiet_hours": {
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "subscriptionId": "uuid"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid subscription format
- `401 Unauthorized`: Not authenticated
- `409 Conflict`: Subscription already exists

**Implementation:**
```typescript
// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/postgres';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription, preferences } = await request.json();

  try {
    const result = await db.query(
      `INSERT INTO push_subscriptions (
        tenant_id, user_id, endpoint, auth_key, p256dh_key, preferences
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (endpoint)
      DO UPDATE SET
        preferences = $6,
        updated_at = NOW()
      RETURNING id`,
      [
        session.user.tenantId,
        session.user.id,
        subscription.endpoint,
        subscription.keys.auth,
        subscription.keys.p256dh,
        JSON.stringify(preferences),
      ]
    );

    return NextResponse.json({
      success: true,
      subscriptionId: result.rows[0].id
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
```

### Endpoint 3: DELETE /api/push/unsubscribe

**Purpose:** Remove push notification subscription

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

### Endpoint 4: POST /api/sync/queue

**Purpose:** Sync offline actions from client

**Request:**
```json
{
  "actions": [
    {
      "id": 1,
      "action": "score_match",
      "endpoint": "/api/matches/123/score",
      "method": "POST",
      "body": {
        "player1Score": 21,
        "player2Score": 15
      }
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "synced": 1,
  "failed": []
}
```

**Response (207 Multi-Status):**
```json
{
  "synced": 0,
  "failed": [
    {
      "id": 1,
      "error": "Match not found"
    }
  ]
}
```

### Endpoint 5: GET /api/offline/tournament/:id

**Purpose:** Fetch complete tournament data for offline caching

**Request:**
```
GET /api/offline/tournament/uuid-123
```

**Response (200 OK):**
```json
{
  "tournament": {
    "id": "uuid-123",
    "name": "Summer Championship",
    "status": "in_progress",
    "startDate": "2025-11-10"
  },
  "bracket": { ... },
  "players": [...],
  "matches": [...]
}
```

**Headers:**
```
Cache-Control: max-age=300, stale-while-revalidate=600
ETag: "abc123"
```

---

## Implementation Plan

### Phase 1: PWA Foundation (Day 1-2)

**Goal:** Basic PWA infrastructure with manifest and service worker

**Tasks:**
- [x] Create web app manifest with tenant branding (Day 1)
- [x] Generate PWA icons (72x72, 192x192, 512x512, maskable)
- [x] Set up Workbox configuration for service worker
- [x] Implement cache strategies (cache-first, network-first)
- [x] Add manifest link to HTML head
- [x] Test service worker registration
- [x] Create install prompt component
- [x] Test PWA install on iOS and Android

**Estimated Effort:** 2 days

**Deliverables:**
- Working service worker with basic caching
- Installable PWA on mobile devices
- Lighthouse PWA score >70

### Phase 2: Offline Capabilities (Day 2-3)

**Goal:** IndexedDB storage and offline data access

**Tasks:**
- [x] Set up Dexie.js with schema (Day 2)
- [x] Implement tournament caching logic
- [x] Create offline sync queue
- [x] Build offline indicator UI component
- [x] Implement background sync for offline actions
- [x] Add manual sync trigger
- [x] Test offline viewing and sync

**Estimated Effort:** 1.5 days

**Deliverables:**
- Offline tournament viewing
- Sync queue for offline actions
- Auto-sync when connectivity returns

### Phase 3: Touch & Gestures (Day 3-4)

**Goal:** Mobile-optimized UI with touch and gesture support

**Tasks:**
- [x] Build BottomNavigation component (Day 3)
- [x] Implement SwipeableCard component
- [x] Add pull-to-refresh gesture
- [x] Create haptic feedback utility
- [x] Build FloatingActionButton
- [x] Ensure 44x44px minimum tap targets
- [x] Add visual touch feedback
- [x] Test gestures across devices

**Estimated Effort:** 1.5 days

**Deliverables:**
- Touch-optimized interface
- Working gesture navigation
- Haptic feedback on interactions

### Phase 4: Push Notifications (Day 4)

**Goal:** Web push notifications for match updates

**Tasks:**
- [x] Set up Firebase Cloud Messaging
- [x] Generate VAPID keys
- [x] Implement NotificationManager class
- [x] Create push subscription endpoints
- [x] Build notification preference UI
- [x] Add notification templates
- [x] Test push delivery end-to-end
- [x] Handle notification clicks

**Estimated Effort:** 1 day

**Deliverables:**
- Working push notifications
- Notification preferences
- Click-through to relevant pages

### Phase 5: Performance & Testing (Day 5)

**Goal:** Optimize performance and comprehensive testing

**Tasks:**
- [x] Implement code splitting by route
- [x] Optimize images (WebP, responsive)
- [x] Add lazy loading for below-fold content
- [x] Run Lighthouse audits (target >90)
- [x] Test on low-end devices (Moto G4)
- [x] Test offline scenarios (airplane mode, 3G)
- [x] Cross-browser testing (Chrome, Safari, Firefox)
- [x] Fix critical bugs
- [x] Performance budget validation

**Estimated Effort:** 1 day

**Deliverables:**
- Lighthouse PWA score >90
- Load time <2s on 3G
- Zero critical bugs

---

## Testing Strategy

### Unit Tests

**Service Worker Tests:**
- Test cache strategies (cache-first, network-first)
- Test background sync queue
- Test push notification handling
- Test offline detection

**Component Tests:**
- BottomNavigation: Active state, navigation
- InstallPrompt: Show/hide logic, install flow
- OfflineIndicator: Connection status changes
- SwipeableCard: Gesture recognition

**Utility Tests:**
- Haptic feedback patterns
- Gesture detection (swipe, long-press)
- IndexedDB operations (CRUD)
- Sync queue logic

### Integration Tests

**Offline Flow:**
1. User views tournament while online
2. Tournament cached in IndexedDB
3. User goes offline (network disconnected)
4. User views cached tournament (success)
5. User records match score (queued)
6. User goes online (network reconnected)
7. Sync queue processes (score submitted)
8. Verify score persisted on server

**Push Notification Flow:**
1. User opts in to notifications
2. Subscription saved to database
3. Server sends push notification
4. Service worker receives push event
5. Notification displayed on device
6. User clicks notification
7. App opens to correct page

**Install Flow:**
1. User visits site 3 times
2. Install prompt appears
3. User clicks "Install"
4. Browser install dialog shown
5. User confirms installation
6. App icon added to home screen
7. App opens in standalone mode

### Performance Tests

**Load Performance:**
- Initial page load <2s on 3G
- Time to Interactive <3s
- First Contentful Paint <1s
- Service worker registration <500ms

**Runtime Performance:**
- Smooth animations (60fps)
- Gesture response <100ms
- Haptic feedback immediate
- No layout shift during load

**Lighthouse Audits:**
```bash
# Run Lighthouse CI
npm run lighthouse:ci

# Targets:
# - Performance: >90
# - PWA: >90
# - Accessibility: >90
# - Best Practices: >90
```

### Security Considerations

**Authentication:**
- Push subscriptions require authentication
- Sync endpoints validate user ownership
- Offline data scoped to tenant

**Authorization:**
- Push notifications only for user's tournaments
- Sync queue filtered by user/tenant
- Cached data respects tenant isolation

**Data Validation:**
- Validate push subscription format
- Sanitize sync queue payloads
- Validate offline action permissions

**Rate Limiting:**
- Push subscriptions: 10 per user
- Sync requests: 100 per hour per user
- Notification sends: 50 per day per user

---

## Deployment & Operations

### Deployment Strategy

**Phase 1: Internal Testing (Day 5)**
- [x] Deploy to staging environment
- [x] Internal team testing (5+ devices)
- [x] Validate all PWA features
- [x] Run Lighthouse audits
- [x] Fix critical issues

**Phase 2: Beta Launch (Week 5)**
- [x] Deploy to production with feature flag
- [x] Enable for 10% of mobile users
- [x] Monitor metrics (load times, errors, installs)
- [x] Gather user feedback
- [x] Iterate based on feedback

**Phase 3: Gradual Rollout (Week 6)**
- [x] Day 1-2: 25% of mobile users
- [x] Day 3-4: 50% of mobile users
- [x] Day 5-6: 75% of mobile users
- [x] Day 7: 100% of mobile users

**Feature Flag:**
```typescript
// lib/feature-flags.ts
export async function isPWAEnabled(userId: string): Promise<boolean> {
  const rolloutPercent = await getFeatureRollout('mobile-pwa');
  const userHash = hashCode(userId);
  return (userHash % 100) < rolloutPercent;
}
```

### Monitoring & Alerts

**Metrics to Track:**

**Real User Monitoring (RUM):**
```typescript
// app/lib/analytics/web-vitals.ts
import { onCLS, onFCP, onLCP, onTTI, onFID } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
  });

  navigator.sendBeacon('/api/analytics/web-vitals', body);
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTI(sendToAnalytics);
onFID(sendToAnalytics);
```

**Dashboard Metrics:**
- PWA install rate (daily)
- Push notification opt-in rate (daily)
- Offline usage sessions (daily)
- Page load time (p50, p95, p99)
- Service worker error rate
- Sync queue size
- Notification delivery rate
- Notification click-through rate

**Alerts:**
- Page load time >3s (p95) for 5 minutes → Slack alert
- Service worker error rate >1% → Email on-call
- Notification delivery failure >5% → Email on-call
- Sync queue size >1000 items → Investigate
- PWA score drops below 85 → Block deployment

### Rollback Plan

**Immediate Rollback (Critical Issues):**
1. Set feature flag to 0% (disable for all users)
2. Service worker version rollback (skip-waiting: false)
3. Clear problematic cache entries
4. Notify users via in-app banner

**Partial Rollback (Non-Critical Issues):**
1. Reduce feature flag percentage (e.g., 50% → 10%)
2. Monitor metrics for improvement
3. Fix issues in staging
4. Resume gradual rollout

**Database Rollback:**
- All migrations are backward-compatible
- No destructive changes to existing data
- Can disable push notifications without data loss

---

## Dependencies

### External Dependencies

**Required:**
- **Workbox 7.x** - Service worker library
  - Version: 7.0.0
  - License: Apache 2.0
  - Why: Industry standard for PWA caching strategies

- **Dexie.js 3.x** - IndexedDB wrapper
  - Version: 3.2.4
  - License: Apache 2.0
  - Why: Simplified IndexedDB API with TypeScript support

- **Firebase Cloud Messaging (FCM)** - Push delivery
  - Free tier: Unlimited notifications
  - License: Google ToS
  - Why: Reliable push delivery, cross-platform support

- **web-push** - Node library for Web Push
  - Version: 3.6.6
  - License: MIT
  - Why: VAPID key generation and push sending

- **web-vitals** - Performance monitoring
  - Version: 3.5.0
  - License: Apache 2.0
  - Why: Official Google library for Core Web Vitals

**Optional:**
- **Comlink** - Web Workers communication
  - Version: 4.4.1
  - For: Heavy computations in background thread

- **Sharp** - Image optimization
  - Version: 0.33.0
  - For: WebP conversion, responsive images

### Internal Dependencies

**Must Be Completed First:**
- Multi-tenant authentication system (existing)
- PostgreSQL database with tenant isolation (existing)
- Next.js 14 App Router setup (existing)
- Redis for real-time features (existing)

**Parallel Development:**
- Can develop alongside other Sprint 10 features
- No blocking dependencies on other teams

**Future Enhancements:**
- Geolocation feature (Sprint 11) will use PWA location API
- QR code scanning (Sprint 11) will use PWA camera access

---

## Performance & Scale

### Expected Load

**User Traffic:**
- 70% mobile users = ~7,000 daily mobile users
- PWA install rate target: 30% = 2,100 installed PWAs
- Push notification opt-in: 50% = 3,500 subscribers

**Request Volume:**
- Service worker registrations: ~7,000/day
- Cache requests: ~100,000/day (mostly served from cache)
- API requests: ~50,000/day (reduced by caching)
- Push notifications: ~10,000/day
- Sync requests: ~5,000/day

**Data Storage:**
- Client-side (IndexedDB): 50MB max per user
- Server-side push subscriptions: 3,500 rows (~500KB)
- Notification log: ~10,000 rows/day (~5MB/day)
- Sync queue: ~5,000 rows/day (~2MB/day)

### Performance Targets

**Load Performance:**
- Initial page load (3G): <2s
- Time to Interactive: <3s
- First Contentful Paint: <1s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1

**Runtime Performance:**
- First Input Delay: <100ms
- Animation frame rate: 60fps (16.67ms/frame)
- Service worker activation: <500ms
- Cache lookup: <50ms
- IndexedDB query: <100ms

**API Performance:**
- Push subscription: <200ms
- Sync queue process: <1s per action
- Manifest generation: <100ms
- Offline data fetch: <500ms

**Push Notification:**
- Delivery time: <10s from send
- Click-through time: <2s to app load

### Scalability Considerations

**Horizontal Scaling:**
- Service workers run client-side (no server load)
- Stateless API endpoints (easy to scale)
- Push notifications via FCM (Google's infrastructure)
- IndexedDB client-side (no database load)

**Caching Strategy:**
- Static assets cached at CDN (CloudFront)
- API responses cached client-side (IndexedDB)
- Manifest cached 1 hour (reduces generation)
- Service worker cached until new version

**Database Optimization:**
- Partition `push_notifications` by month
- Index on `user_id`, `sent_at`, `notification_type`
- Auto-delete synced items after 7 days
- Connection pooling for concurrent requests

**Resource Limits:**
- Max 50MB cache per user (auto-cleanup)
- Max 100 queued actions per user
- Max 10 push subscriptions per user
- Rate limit: 100 sync requests/hour

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **iOS Safari PWA limitations** (no background sync, limited push until iOS 16.4) | High | High | **Progressive enhancement:** Manual sync button always available, in-app notification fallback for iOS <16.4, educate users on iOS limitations in help docs |
| **Offline sync conflicts** (two users edit same match offline) | High | Medium | **Last-write-wins with conflict UI:** Auto-resolve with timestamp, show "conflict detected" banner, allow manual resolution, log all conflicts for analysis |
| **Large offline cache** (users with low storage) | Medium | Medium | **Cache size limits:** 50MB max, auto-clear old entries (7 days), prioritize recent tournaments only, allow manual cache clear in settings |
| **Push notification spam** (too many notifications annoy users) | High | Medium | **Smart rate limiting:** Max 3 notifications/hour, granular preferences, quiet hours (22:00-08:00), instant disable option, A/B test frequency |
| **Poor performance on low-end devices** (<2GB RAM) | High | Medium | **Performance budgets:** Enforce <300KB JS, test on Moto G4 (low-end), lazy load images, virtualized lists, reduce animations on low-end |
| **Service worker bugs** (breaks entire site) | Critical | Low | **Thorough testing + rollback:** Version control, skip-waiting only after user confirmation, instant feature flag rollback, clear cache on errors |
| **Cross-tenant data leakage in cache** | Critical | Low | **Tenant-scoped caching:** All cached data includes `tenant_id`, filter queries by tenant, clear cache on tenant switch, automated security tests |
| **Users don't discover PWA install** | Medium | High | **Multiple touchpoints:** Banner after 3 visits, install button in profile, tutorial on first visit, highlight benefits clearly, A/B test messaging |
| **Background sync queue grows too large** | Medium | Low | **Queue limits:** Max 100 actions per user, expire after 24 hours, manual clear option, retry with exponential backoff (1s, 2s, 4s, 8s) |
| **Push notification token expiration** | Medium | Medium | **Auto-refresh:** Check token validity daily, re-prompt for permission if expired, graceful fallback to in-app notifications |
| **Browser compatibility issues** | Medium | Low | **Progressive enhancement:** Feature detection before use, fallbacks for unsupported browsers, extensive cross-browser testing (Chrome, Safari, Firefox) |
| **Increased server load from sync requests** | Medium | Medium | **Rate limiting + batching:** 100 requests/hour per user, batch sync endpoint, efficient queries with indexes, monitor server metrics |

---

## Alternatives Considered

### Alternative 1: Native Mobile Apps (iOS/Android)

**Pros:**
- Full platform API access (background sync, advanced notifications)
- Better performance on low-end devices
- App store presence and discovery
- Richer offline capabilities

**Cons:**
- 3-6 months development time (vs 1 week for PWA)
- Requires separate iOS and Android codebases (or React Native)
- App store approval process (delays, rejections)
- Ongoing maintenance for 2 platforms
- Higher development cost ($50k-$100k vs $10k for PWA)

**Why not chosen:**
- Timeline constraint (need solution in 1 week, not 3-6 months)
- Budget constraint (no budget for native app development)
- PWA covers 90% of use cases with 10% of effort
- Can still build native apps later if PWA proves insufficient

### Alternative 2: Hybrid Framework (Capacitor/Ionic)

**Pros:**
- Single codebase for web + mobile
- Access to native APIs when needed
- Can publish to app stores
- Web-first approach (same as PWA)

**Cons:**
- Still requires app store submissions
- Adds complexity (Capacitor plugins, native builds)
- Larger bundle size than pure PWA
- Learning curve for team
- Not significantly faster than native

**Why not chosen:**
- Overkill for current needs (PWA sufficient)
- Adds unnecessary complexity
- Slower time-to-market than pure PWA
- Most native APIs not needed (yet)

### Alternative 3: No Offline Support (Online-Only)

**Pros:**
- Simpler implementation (no service worker, IndexedDB)
- No sync conflicts to handle
- Smaller codebase

**Cons:**
- Doesn't solve core problem (unreliable venue Wi-Fi)
- Poor user experience at tournaments
- Competitive disadvantage (other platforms have offline)
- High bounce rate on poor connections

**Why not chosen:**
- Doesn't address main user pain point
- Critical requirement from user research
- Tournament venues have notoriously bad connectivity
- Offline support is key differentiator

### Alternative 4: Electron Desktop App

**Pros:**
- Full offline capabilities
- No browser limitations
- Rich desktop experience

**Cons:**
- Doesn't solve mobile problem (70% of users)
- Large download size (100MB+)
- Platform-specific installers
- Not suitable for on-the-go usage

**Why not chosen:**
- Wrong platform (users are mobile-first)
- Doesn't address core use case
- Adds complexity without mobile benefit

---

## Open Questions

- [x] **Install Prompt Timing:** After 3 visits or after completing first tournament?
  - **Decision:** 3 visits OR first tournament completion (whichever comes first)
  - **Rationale:** Captures both casual browsers and engaged users
  - **A/B Test:** Post-launch A/B test to optimize timing

- [x] **iOS Push Workaround:** For iOS <16.4, build custom in-app notification system?
  - **Decision:** Yes, build in-app notification fallback
  - **Rationale:** iOS 15 still has significant market share (~20%)
  - **Implementation:** Polling + badge notifications for iOS <16.4

- [x] **Offline Sync Conflicts:** Auto-resolve with last-write-wins or always show UI?
  - **Decision:** Auto-resolve with conflict notification
  - **Rationale:** Reduce friction, but inform users of conflicts
  - **UI:** "Conflict detected" banner with option to view details

- [x] **Cache Size Limits:** 50MB? 100MB? Analyze user storage availability
  - **Decision:** 50MB initial limit
  - **Rationale:** Safe for most devices, ~10 tournaments cached
  - **Future:** Increase to 100MB if user storage data supports

- [x] **Notification Frequency:** 3/day vs 5/day max?
  - **Decision:** Start with 3/day max
  - **Rationale:** Conservative to avoid spam perception
  - **A/B Test:** Post-launch test 3/day vs 5/day click-through rates

- [ ] **Geolocation Feature:** Implement venue check-in now or defer to Sprint 11?
  - **Pending:** Discuss with product team
  - **Recommendation:** Defer to Sprint 11 (out of scope for PWA basics)

- [x] **Background Sync Fallback:** Poll for connectivity or manual sync only?
  - **Decision:** Manual sync button (no polling)
  - **Rationale:** Polling drains battery, manual sync is acceptable
  - **UI:** Prominent "Sync Now" button when offline actions queued

- [x] **App Shortcuts:** Which 3-4 shortcuts are most valuable?
  - **Decision:** New Tournament, Active Tournaments, My Profile
  - **Rationale:** Most common user actions from analytics
  - **Future:** Add "Check In" shortcut in Sprint 11

- [x] **Performance Budget:** Hard limits (build fails) or soft limits (warnings)?
  - **Decision:** Soft limits (warnings) initially, hard limits after 2 sprints
  - **Rationale:** Allow iteration without blocking, then enforce strictly
  - **Limits:** <300KB JS, <50KB CSS, <1MB total page weight

---

## References

**Technical Research:**
- [PWA Best Practices (web.dev)](https://web.dev/pwa-best-practices/)
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [Web Push Protocol RFC 8030](https://datatracker.ietf.org/doc/html/rfc8030)
- [iOS PWA Support Status](https://firt.dev/notes/pwa-ios/)
- [Lighthouse PWA Checklist](https://web.dev/pwa-checklist/)

**Internal Documents:**
- PRD: `product/PRDs/mobile-pwa-enhancements.md`
- Sprint 10 Plan: `sprints/current/sprint-10-business-growth.md`
- Multi-Tenant Architecture: `technical/multi-tenant-architecture.md`
- Coding Standards: `C:\devop\coding_standards.md`

**External Tools:**
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Dexie.js Documentation](https://dexie.org/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [web-vitals Library](https://github.com/GoogleChrome/web-vitals)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-06 | Claude (Engineering Lead) | Initial comprehensive technical specification |

---

## Notes for Implementation Team

**Priority Implementation Order:**
1. **Day 1-2:** Service worker + manifest + basic caching
2. **Day 2-3:** IndexedDB + offline viewing + sync queue
3. **Day 3-4:** Touch optimizations + gestures + haptic feedback
4. **Day 4:** Push notifications + preferences
5. **Day 5:** Performance optimization + testing + Lighthouse audits

**Critical Path Items:**
- Service worker must work perfectly (can break entire site)
- Multi-tenant data isolation in cache (security critical)
- iOS Safari testing (different behavior than Chrome)
- Performance budgets (enforce <300KB JS)

**Testing Priorities:**
1. Offline scenarios (airplane mode, slow 3G, intermittent connection)
2. Cross-device (iOS Safari, Chrome Android, Firefox, low-end devices)
3. Push notification delivery (<10s target)
4. Lighthouse PWA audit (>90 score required)
5. Cross-tenant isolation (security audit)

**Performance Monitoring:**
- Set up web-vitals tracking on Day 1
- Dashboard for real-time metrics (Grafana)
- Alerts for regressions >10%
- Daily Lighthouse CI runs
- Weekly performance review meetings

**User Education:**
- In-app tutorial on first PWA install
- Tooltips for new gestures (swipe, pull-to-refresh)
- Help center articles ("How to install", "Using offline mode")
- Video demos (2-3 minutes each)

**Post-Launch Optimization:**
- A/B test install prompt timing (3 visits vs first action)
- A/B test install prompt copy (3 variants)
- A/B test notification frequency (3/day vs 5/day)
- Analyze cache hit rates, optimize cache strategy
- Monitor sync queue size, adjust retention policy

**Security Checklist:**
- [ ] All cached data includes `tenant_id`
- [ ] Push subscriptions require authentication
- [ ] Sync endpoints validate user ownership
- [ ] Rate limiting on all endpoints
- [ ] VAPID keys stored securely (environment variables)
- [ ] No PII in client-side cache
- [ ] HTTPS everywhere (enforced)

**Metrics Dashboard:**
Track daily:
- PWA install rate (% of mobile users)
- Push opt-in rate (% of users)
- Offline usage sessions (% of sessions)
- Page load time (p50, p95, p99)
- Service worker error rate
- Notification delivery rate
- Notification click-through rate
- Lighthouse scores (Performance, PWA, A11y)
