# PWA Implementation Guide
**Sprint 10 Week 4 - Agent 3: PWA Install & Push Notifications**

## Overview

This guide covers the complete PWA (Progressive Web App) implementation including install prompts and push notification system.

## Architecture

### Components

1. **PWA Manifest** (`public/manifest.json`)
   - App metadata and icons
   - App shortcuts (4 shortcuts)
   - Display mode: standalone
   - Theme colors

2. **Service Worker** (`public/sw.js`)
   - Offline-first caching with Workbox
   - Push notification handling
   - Background sync
   - Cache management

3. **Install Prompt System** (`lib/pwa/install-prompt.ts`)
   - Smart timing (after 3 visits)
   - Platform detection (iOS/Android/Desktop)
   - User preference tracking
   - Analytics integration

4. **Push Notification System** (`lib/pwa/push-notifications.ts`)
   - Subscription management
   - Notification preferences
   - Quiet hours support
   - 5 notification types

5. **UI Components**
   - `InstallPrompt.tsx` - Install banner
   - `NotificationSettings.tsx` - Preference management
   - `PWAProvider.tsx` - App wrapper

6. **API Routes**
   - `/api/notifications/subscribe` - Subscribe to push
   - `/api/notifications/unsubscribe` - Unsubscribe
   - `/api/notifications/preferences` - Update preferences
   - `/api/notifications/send` - Send notification

## Setup Instructions

### 1. Generate VAPID Keys

VAPID keys are required for push notifications:

```bash
# Install web-push globally (if not installed)
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys
```

### 2. Configure Environment Variables

Add to `.env.local`:

```env
# Public key (exposed to client)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here

# Private key (server-only)
VAPID_PRIVATE_KEY=your_private_key_here

# Subject (your email or website URL)
VAPID_SUBJECT=mailto:admin@tournamentplatform.com
```

### 3. Run Database Migration

```bash
# Generate migration
pnpm prisma migrate dev --name add_push_subscriptions

# Or push schema changes
pnpm prisma db push
```

### 4. Install Dependencies

```bash
# Install web-push for server-side notifications
pnpm add web-push

# Install types
pnpm add -D @types/web-push
```

### 5. Integrate PWA Provider

Update your root layout (`app/layout.tsx`):

```tsx
import { PWAProvider } from '@/components/mobile/PWAProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
```

## Features

### 1. PWA Installation

**Smart Timing:**
- Shows after 3 visits
- Waits 7 days between prompts
- Respects "never show" preference

**Platform Support:**
- **Android/Chrome**: Native install prompt
- **iOS/Safari**: Manual instructions
- **Desktop**: Browser-specific install

**User Actions:**
- Install Now
- Maybe Later
- Never Show Again

### 2. Push Notifications

**5 Notification Types:**

1. **Match Notifications** (15 min before)
   ```typescript
   {
     type: 'match',
     title: 'Match Starting Soon',
     body: 'Your match starts in 15 minutes',
     url: '/matches/123'
   }
   ```

2. **Tournament Updates** (bracket changes)
   ```typescript
   {
     type: 'tournament',
     title: 'Tournament Update',
     body: 'Bracket has been updated',
     url: '/tournaments/123'
   }
   ```

3. **Achievement Unlocks** (immediate)
   ```typescript
   {
     type: 'achievement',
     title: 'Achievement Unlocked!',
     body: 'You earned "Winner" badge',
     url: '/profile/achievements'
   }
   ```

4. **System Announcements** (important)
   ```typescript
   {
     type: 'announcement',
     title: 'System Maintenance',
     body: 'Scheduled downtime tonight',
     url: '/'
   }
   ```

5. **Reminders** (day before tournament)
   ```typescript
   {
     type: 'reminder',
     title: 'Tournament Tomorrow',
     body: 'Don\'t forget your tournament',
     url: '/tournaments/123'
   }
   ```

**Notification Preferences:**
- Enable/disable per type
- Quiet hours (custom time range)
- Sound on/off
- Vibration on/off

### 3. App Shortcuts

4 shortcuts available from home screen:

1. **New Tournament** → `/tournaments/new`
2. **Record Score** → `/scoring`
3. **View Bracket** → `/tournaments`
4. **Leaderboards** → `/leaderboards`

## Testing Guide

### Test 1: PWA Installation

#### Android/Chrome
1. Open app in Chrome
2. Visit 3 times (or more)
3. Wait 2 seconds for banner
4. Click "Install Now"
5. Verify app installed on home screen
6. Open app from home screen
7. Verify standalone mode (no browser UI)

#### iOS/Safari
1. Open app in Safari
2. Visit 3 times
3. Banner shows with instructions
4. Tap "Install Now"
5. Follow iOS-specific steps
6. Verify app on home screen

#### Desktop/Chrome
1. Open in Chrome/Edge
2. Visit multiple times
3. Click install prompt
4. Verify app window opens
5. Check app in taskbar/dock

### Test 2: Install Prompt Timing

```typescript
// Reset state for testing
import { getInstallPromptManager } from '@/lib/pwa/install-prompt';

const manager = getInstallPromptManager();
manager.reset(); // Reset visit count

// Test scenarios:
// 1. Visit 1-2 times → No prompt
// 2. Visit 3+ times → Prompt shows
// 3. Click "Maybe Later" → Shows again after 7 days
// 4. Click "Never Show" → Never shows again
```

### Test 3: Push Notifications

#### Subscribe Flow
1. Go to Settings → Notifications
2. Toggle "Push Notifications" on
3. Grant permission in browser
4. Verify subscription saved
5. Check database for subscription record

#### Send Test Notification
1. In Notification Settings
2. Click "Send Test"
3. Verify notification appears
4. Click notification → Opens app
5. Check analytics tracked

#### Notification Types
Test each type:

```typescript
// Use browser console or API endpoint
fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscription: { /* your subscription */ },
    notification: {
      title: 'Test Match',
      body: 'Your match starts in 15 minutes',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'match-123',
      data: {
        url: '/matches/123',
        type: 'match'
      }
    }
  })
});
```

### Test 4: Notification Preferences

1. **Enable/Disable Types**
   - Toggle each notification type
   - Send test for disabled type
   - Verify not received

2. **Quiet Hours**
   - Set quiet hours (e.g., 22:00-08:00)
   - Send notification during quiet hours
   - Verify not shown
   - Send outside quiet hours
   - Verify shown

3. **Sound/Vibration**
   - Toggle sound off
   - Send notification
   - Verify silent
   - Toggle vibration off
   - Send notification
   - Verify no vibration

### Test 5: Offline Functionality

1. **Offline Install**
   - Install PWA
   - Disconnect network
   - Open app
   - Verify offline page shows

2. **Service Worker Caching**
   - Visit pages while online
   - Disconnect network
   - Visit cached pages
   - Verify content loads from cache

3. **Background Sync**
   - Go offline
   - Submit score
   - Goes to sync queue
   - Go online
   - Verify score synced

### Test 6: App Shortcuts

#### Android
1. Long-press app icon
2. Verify 4 shortcuts appear
3. Tap each shortcut
4. Verify correct page opens

#### iOS
1. 3D Touch app icon
2. Verify shortcuts appear
3. Tap each shortcut
4. Verify navigation works

## Troubleshooting

### Issue: Install prompt not showing

**Possible causes:**
- Not visited 3 times yet
- Shown recently (within 7 days)
- User clicked "Never show"
- Not HTTPS (PWA requires HTTPS)

**Solutions:**
```typescript
// Reset state
const manager = getInstallPromptManager();
manager.reset();

// Check state
console.log(manager.getState());
```

### Issue: Push notifications not working

**Possible causes:**
- VAPID keys not configured
- Service worker not registered
- Notification permission denied
- Subscription not saved

**Solutions:**
```typescript
// Check service worker
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', !!reg);
});

// Check notification permission
console.log('Permission:', Notification.permission);

// Check subscription
const manager = getPushNotificationManager();
manager.getSubscription().then(sub => {
  console.log('Subscribed:', !!sub);
});
```

### Issue: Notifications during quiet hours

**Check preference logic:**
```typescript
const manager = getPushNotificationManager();
const prefs = manager.getPreferences();
console.log('Quiet hours:', prefs.quietHours);

// Test shouldShow
console.log('Should show match:', manager.shouldShowNotification('match'));
```

### Issue: Service worker not updating

**Force update:**
```typescript
// Unregister and re-register
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister().then(() => {
    navigator.serviceWorker.register('/sw.js');
  });
});
```

## Performance Considerations

### Cache Size
- Max cache: 50MB
- Automatic cleanup with Workbox
- Monitor with dev tools

### Notification Frequency
- Rate limit notifications
- Batch updates when possible
- Respect user preferences

### Battery Impact
- Use `requireInteraction: false` for most notifications
- Only use `true` for critical (match start)
- Vibration pattern: short and efficient

## Security

### VAPID Keys
- Keep private key secret (server-only)
- Rotate keys periodically
- Never commit to version control

### Subscription Data
- Encrypt in database
- Associate with user ID
- Clean up old subscriptions

### Content Security
- Validate notification payloads
- Sanitize user input
- Use HTTPS only

## Analytics

Track these events:

```typescript
// Install events
gtag('event', 'pwa_install', {
  event_category: 'PWA',
  event_label: 'accepted',
  platform: 'android'
});

// Notification events
gtag('event', 'notification_received', {
  event_category: 'Notifications',
  event_label: 'match',
});

gtag('event', 'notification_clicked', {
  event_category: 'Notifications',
  event_label: 'match',
});

gtag('event', 'notification_dismissed', {
  event_category: 'Notifications',
  event_label: 'match',
});
```

## Best Practices

1. **Install Prompts**
   - Don't show on first visit
   - Wait for user engagement
   - Provide clear value proposition
   - Respect user choice

2. **Push Notifications**
   - Only send valuable content
   - Respect quiet hours
   - Allow granular control
   - Test before sending to all

3. **Offline Experience**
   - Cache critical resources
   - Show helpful offline page
   - Queue actions for sync
   - Inform user of offline status

4. **Performance**
   - Lazy load service worker code
   - Minimize notification payload
   - Clean up old subscriptions
   - Monitor cache size

## References

- [Web App Manifest Spec](https://w3c.github.io/manifest/)
- [Push API Spec](https://w3c.github.io/push-api/)
- [Service Worker API](https://w3c.github.io/ServiceWorker/)
- [Notification API](https://notifications.spec.whatwg.org/)
- [VAPID Protocol](https://datatracker.ietf.org/doc/html/rfc8292)
