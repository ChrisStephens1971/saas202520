# PWA Quick Reference Card

**Sprint 10 Week 4 - Developer Reference**

## Quick Imports

```typescript
// Install Prompt
import { useInstallPrompt, getInstallPromptManager } from '@/lib/pwa/install-prompt';

// Push Notifications
import { getPushNotificationManager } from '@/lib/pwa/push-notifications';

// Components
import { InstallPrompt, InstallButton } from '@/components/mobile/InstallPrompt';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import {
  PushPermissionDialog,
  usePushPermissionDialog,
} from '@/components/mobile/PushPermissionDialog';
import { PWAProvider } from '@/components/mobile/PWAProvider';
```

## Install Prompt Usage

### Check Install Status

```typescript
const { state, showPrompt, deferPrompt, neverShowAgain } = useInstallPrompt();

// Check states
state.canInstall; // Can show native prompt
state.isInstalled; // App is installed
state.shouldShow; // Should show banner
state.platform; // 'ios' | 'android' | 'desktop'
state.visitCount; // Number of visits
```

### Show Install Prompt

```typescript
// Programmatically show prompt
const outcome = await showPrompt(); // 'accepted' | 'dismissed' | 'not-available'

// Defer for later
deferPrompt();

// Never show again
neverShowAgain();
```

### Get Platform Instructions

```typescript
const manager = getInstallPromptManager();
const instructions = manager.getInstallInstructions();
// Returns array of step-by-step instructions
```

## Push Notifications Usage

### Subscribe to Push

```typescript
const manager = getPushNotificationManager();
const subscription = await manager.subscribe();

if (subscription) {
  console.log('Subscribed:', subscription);
}
```

### Unsubscribe

```typescript
await manager.unsubscribe();
```

### Check Subscription

```typescript
const subscription = await manager.getSubscription();
const isSubscribed = !!subscription;
```

### Update Preferences

```typescript
await manager.updatePreferences({
  enabled: true,
  types: {
    match: true,
    tournament: true,
    achievement: false,
    announcement: true,
    reminder: true,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
  sound: true,
  vibration: true,
});
```

### Send Test Notification

```typescript
await manager.testNotification();
```

### Check Permission

```typescript
const permission = manager.getPermissionStatus();
// 'granted' | 'denied' | 'default'

const isSupported = manager.isSupported();
```

## Sending Notifications (Server-Side)

### Send to Single User

```typescript
// API Route or Server Component
import webpush from 'web-push';
import { VAPID_CONFIG } from '@/lib/pwa/vapid-keys';

webpush.setVapidDetails(VAPID_CONFIG.subject, VAPID_CONFIG.publicKey, VAPID_CONFIG.privateKey);

const payload = JSON.stringify({
  title: 'Match Starting Soon',
  body: 'Your match starts in 15 minutes',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  tag: 'match-123',
  data: {
    url: '/matches/123',
    type: 'match',
  },
});

await webpush.sendNotification(subscription, payload);
```

### Send to All Users (Broadcast)

```typescript
import { prisma } from '@/lib/prisma';

const subscriptions = await prisma.pushSubscription.findMany();

const results = await Promise.allSettled(
  subscriptions.map((sub) => {
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

// Handle failed subscriptions
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error('Failed to send to:', subscriptions[index].endpoint);
    // Optionally remove invalid subscription
  }
});
```

### Send to Specific Users

```typescript
const userIds = ['user1', 'user2', 'user3'];

const subscriptions = await prisma.pushSubscription.findMany({
  where: {
    userId: { in: userIds },
  },
});

// Send to each subscription...
```

## Notification Types

### Match Notification

```typescript
const notification = {
  title: 'Match Starting Soon',
  body: 'Your match starts in 15 minutes',
  data: { url: '/matches/123', type: 'match' },
  actions: [
    { action: 'view', title: 'View Match' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
};
```

### Tournament Update

```typescript
const notification = {
  title: 'Tournament Update',
  body: 'Bracket has been updated',
  data: { url: '/tournaments/456', type: 'tournament' },
};
```

### Achievement

```typescript
const notification = {
  title: 'Achievement Unlocked!',
  body: 'You earned "Champion" badge',
  data: { url: '/profile/achievements', type: 'achievement' },
};
```

### Announcement

```typescript
const notification = {
  title: 'System Maintenance',
  body: 'Scheduled downtime tonight',
  data: { url: '/', type: 'announcement' },
};
```

### Reminder

```typescript
const notification = {
  title: 'Tournament Tomorrow',
  body: "Don't forget your tournament",
  data: { url: '/tournaments/789', type: 'reminder' },
};
```

## Component Examples

### Install Button in Header

```tsx
import { InstallButton } from '@/components/mobile/InstallPrompt';

function Header() {
  return (
    <header>
      <InstallButton className="ml-auto" />
    </header>
  );
}
```

### Notification Settings Page

```tsx
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default function SettingsPage() {
  return (
    <div>
      <NotificationSettings />
    </div>
  );
}
```

### Push Permission Dialog

```tsx
import {
  PushPermissionDialog,
  usePushPermissionDialog,
} from '@/components/mobile/PushPermissionDialog';

function MyComponent() {
  const { isOpen, open, close } = usePushPermissionDialog();

  return (
    <>
      <button onClick={open}>Enable Notifications</button>
      <PushPermissionDialog
        isOpen={isOpen}
        onClose={close}
        onSuccess={() => console.log('Subscribed!')}
      />
    </>
  );
}
```

## Testing Commands

### Check Service Worker

```javascript
// Browser console
navigator.serviceWorker.getRegistration().then((reg) => {
  console.log('Registered:', !!reg);
  console.log('Active:', !!reg?.active);
});
```

### Check Push Subscription

```javascript
navigator.serviceWorker.ready
  .then((reg) => {
    return reg.pushManager.getSubscription();
  })
  .then((sub) => {
    console.log('Subscribed:', !!sub);
    console.log('Endpoint:', sub?.endpoint);
  });
```

### Check Notification Permission

```javascript
console.log('Permission:', Notification.permission);
```

### Request Notification Permission

```javascript
Notification.requestPermission().then((permission) => {
  console.log('Permission:', permission);
});
```

### Test Local Notification

```javascript
new Notification('Test', {
  body: 'This is a test notification',
  icon: '/icons/icon-192x192.png',
});
```

### Check Install Prompt State

```javascript
import { getInstallPromptManager } from '@/lib/pwa/install-prompt';

const manager = getInstallPromptManager();
console.log(manager.getState());
```

### Reset Install Prompt

```javascript
const manager = getInstallPromptManager();
manager.reset();
```

## Database Queries

### Get User Subscriptions

```typescript
const subscriptions = await prisma.pushSubscription.findMany({
  where: { userId: 'user_123' },
});
```

### Get All Active Subscriptions

```typescript
const subscriptions = await prisma.pushSubscription.findMany();
```

### Delete Old Subscriptions

```typescript
await prisma.pushSubscription.deleteMany({
  where: {
    updatedAt: {
      lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days old
    },
  },
});
```

## Environment Variables

```env
# Required for push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69y...
VAPID_PRIVATE_KEY=yC5Z8w6LRnX3B4k...
VAPID_SUBJECT=mailto:admin@example.com

# Optional
PWA_ENABLE_INSTALL_PROMPT=true
PWA_MIN_VISITS=3
PWA_PROMPT_DELAY_DAYS=7
```

## Common Patterns

### Check if PWA

```typescript
function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}
```

### Detect Platform

```typescript
function getPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'desktop';
}
```

### Check if Installed

```typescript
function isInstalled() {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = (window.navigator as any).standalone === true;
  return isPWA || isIOS;
}
```

## Troubleshooting

### Service Worker Not Registering

```typescript
// Check HTTPS
console.log('HTTPS:', location.protocol === 'https:');

// Check support
console.log('SW Support:', 'serviceWorker' in navigator);

// Register manually
navigator.serviceWorker
  .register('/sw.js')
  .then((reg) => console.log('Registered:', reg))
  .catch((err) => console.error('Failed:', err));
```

### Notifications Not Working

```typescript
// Check support
console.log('Notification support:', 'Notification' in window);
console.log('Push support:', 'PushManager' in window);

// Check permission
console.log('Permission:', Notification.permission);

// Check subscription
const manager = getPushNotificationManager();
const sub = await manager.getSubscription();
console.log('Subscribed:', !!sub);

// Check VAPID keys
console.log('Public key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
```

### Install Prompt Not Showing

```typescript
// Check state
const manager = getInstallPromptManager();
const state = manager.getState();
console.log('State:', state);

// Check visits
console.log('Visit count:', state.visitCount);

// Check if already installed
console.log('Installed:', state.isInstalled);

// Check if user said never
console.log('Never show:', state.neverShow);

// Reset if needed
manager.reset();
```

## Performance Tips

1. **Lazy Load PWA Features**

   ```typescript
   // Only load when needed
   const { getPushNotificationManager } = await import('@/lib/pwa/push-notifications');
   ```

2. **Defer Service Worker Registration**

   ```typescript
   // Wait until page is loaded
   window.addEventListener('load', () => {
     navigator.serviceWorker.register('/sw.js');
   });
   ```

3. **Batch Notifications**

   ```typescript
   // Don't send immediately, batch them
   const queue = [];
   queue.push(notification1, notification2);

   // Send batch every 5 minutes
   setInterval(
     () => {
       if (queue.length > 0) {
         sendBatch(queue);
         queue.length = 0;
       }
     },
     5 * 60 * 1000
   );
   ```

## Security Best Practices

1. **Never Expose Private Key**

   ```typescript
   // ❌ Never do this
   const privateKey = 'exposed-key';

   // ✅ Always use environment variables
   const privateKey = process.env.VAPID_PRIVATE_KEY;
   ```

2. **Validate Subscriptions**

   ```typescript
   // Check subscription belongs to user
   const sub = await prisma.pushSubscription.findUnique({
     where: { endpoint, userId: session.user.id },
   });
   ```

3. **Sanitize Notification Content**

   ```typescript
   // Escape user input
   import DOMPurify from 'isomorphic-dompurify';

   const cleanTitle = DOMPurify.sanitize(userInput);
   ```

---

**Need more help?**

- 📖 Full Guide: `docs/PWA-IMPLEMENTATION-GUIDE.md`
- 📋 Setup: `docs/PWA-SETUP-CHECKLIST.md`
- 📝 Summary: `SPRINT-10-WEEK-4-AGENT-3-SUMMARY.md`
