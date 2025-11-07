# PWA Setup Checklist
**Sprint 10 Week 4 - PWA Install & Push Notifications**

## Quick Setup (5 minutes)

### 1. Generate VAPID Keys ⚡
```bash
npx web-push generate-vapid-keys
```

### 2. Configure Environment Variables 📝
Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa...
VAPID_PRIVATE_KEY=yC5Z8w6LRnX3B4kQ7mP2jH9vN1xF...
VAPID_SUBJECT=mailto:admin@tournamentplatform.com
```

### 3. Install Dependencies 📦
```bash
pnpm add web-push
pnpm add -D @types/web-push
```

### 4. Run Database Migration 🗄️
```bash
pnpm prisma migrate dev --name add_push_subscriptions
# Or
pnpm prisma db push
```

### 5. Update Root Layout 🎨
```tsx
// app/layout.tsx
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

### 6. Test Installation ✅
1. Run app: `pnpm dev`
2. Visit 3 times
3. See install banner
4. Click "Install Now"
5. Verify app installed

### 7. Test Push Notifications 🔔
1. Go to Settings → Notifications
2. Toggle "Push Notifications" on
3. Click "Send Test"
4. Verify notification received

## Files Created

### Core Files
- ✅ `public/manifest.json` (updated)
- ✅ `public/sw.js` (enhanced)
- ✅ `lib/pwa/install-prompt.ts`
- ✅ `lib/pwa/push-notifications.ts`
- ✅ `lib/pwa/vapid-keys.ts`

### Components
- ✅ `components/mobile/InstallPrompt.tsx`
- ✅ `components/mobile/PWAProvider.tsx`
- ✅ `components/settings/NotificationSettings.tsx`

### API Routes
- ✅ `app/api/notifications/subscribe/route.ts`
- ✅ `app/api/notifications/unsubscribe/route.ts`
- ✅ `app/api/notifications/send/route.ts`
- ✅ `app/api/notifications/preferences/route.ts` (updated)

### Database
- ✅ `prisma/schema.prisma` (PushSubscription model added)

### Documentation
- ✅ `docs/PWA-IMPLEMENTATION-GUIDE.md`
- ✅ `docs/PWA-SETUP-CHECKLIST.md`

## Features Implemented

### 1. PWA Manifest ✅
- App name, icons, shortcuts
- 4 app shortcuts (New Tournament, Record Score, View Bracket, Leaderboards)
- Standalone display mode
- Theme colors

### 2. Install Prompt System ✅
- Smart timing (after 3 visits)
- Platform detection (iOS/Android/Desktop)
- Custom UI with benefits list
- Defer and "never show" options
- Analytics tracking

### 3. Push Notifications ✅
- 5 notification types (match, tournament, achievement, announcement, reminder)
- VAPID authentication
- Subscription management
- Preferences per type

### 4. Notification Settings ✅
- Enable/disable toggle
- Per-type preferences
- Quiet hours with custom time
- Sound and vibration controls
- Test notification button

### 5. Service Worker ✅
- Push event handling
- Notification click handling
- Notification close tracking
- Background sync support
- Cache management

## Testing Checklist

### Install Prompt
- [ ] Visit 3 times → Banner appears
- [ ] Click "Install Now" → App installs
- [ ] Click "Maybe Later" → Banner dismissed
- [ ] Click "Never Show" → Never shows again
- [ ] Open installed app → Standalone mode

### Push Notifications
- [ ] Subscribe → Permission granted
- [ ] Send test → Notification appears
- [ ] Click notification → Opens app
- [ ] Dismiss notification → Tracked
- [ ] Check database → Subscription saved

### Notification Preferences
- [ ] Toggle types → Saved correctly
- [ ] Set quiet hours → Respected
- [ ] Disable sound → Silent notification
- [ ] Disable vibration → No vibration
- [ ] Test each type → All work

### Offline Support
- [ ] Go offline → Offline page shows
- [ ] Cached pages → Load from cache
- [ ] Submit offline → Queued for sync
- [ ] Go online → Syncs automatically

### App Shortcuts
- [ ] Long-press icon → 4 shortcuts appear
- [ ] Tap each shortcut → Opens correct page

## Next Steps

1. **Generate Production VAPID Keys**
   - Generate new keys for production
   - Add to production environment variables
   - Never commit keys to repository

2. **Configure Production Service Worker**
   - Update cache names for production
   - Adjust cache strategies
   - Enable service worker in production

3. **Set Up Notification Triggers**
   - Integrate with match system
   - Schedule tournament reminders
   - Send achievement notifications
   - Broadcast announcements

4. **Monitor and Optimize**
   - Track install conversion rate
   - Monitor notification click-through
   - Analyze notification preferences
   - Optimize timing and content

## Troubleshooting

### Issue: Install prompt not showing
**Solution:** Reset state and check visits
```typescript
import { getInstallPromptManager } from '@/lib/pwa/install-prompt';
getInstallPromptManager().reset();
```

### Issue: Push notifications not working
**Solution:** Check VAPID keys and service worker
```typescript
// Check service worker
navigator.serviceWorker.ready.then(reg => console.log(reg));

// Check subscription
import { getPushNotificationManager } from '@/lib/pwa/push-notifications';
getPushNotificationManager().getSubscription().then(sub => console.log(sub));
```

### Issue: Notifications during quiet hours
**Solution:** Verify quiet hours logic
```typescript
const manager = getPushNotificationManager();
console.log(manager.shouldShowNotification('match'));
```

## Support

For detailed implementation guide, see:
📖 `docs/PWA-IMPLEMENTATION-GUIDE.md`

For questions or issues:
- Check service worker console logs
- Verify VAPID configuration
- Test in incognito mode
- Check browser compatibility
