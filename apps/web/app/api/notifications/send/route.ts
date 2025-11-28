/**
 * Send Push Notification API Route
 * Sprint 10 Week 4 - PWA Push Notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import webpush from 'web-push';
import { VAPID_CONFIG } from '@/lib/pwa/vapid-keys';

let vapidConfigured = false;

// Configure web-push on first request
function ensureVapidConfigured() {
  if (!vapidConfigured) {
    webpush.setVapidDetails(VAPID_CONFIG.subject, VAPID_CONFIG.publicKey, VAPID_CONFIG.privateKey);
    vapidConfigured = true;
  }
}

export async function POST(request: NextRequest) {
  ensureVapidConfigured();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, notification } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    if (!notification || !notification.title) {
      return NextResponse.json({ error: 'Invalid notification data' }, { status: 400 });
    }

    // Prepare push subscription
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    // Send push notification
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/badge-72x72.png',
      tag: notification.tag || 'default',
      data: notification.data || {},
      actions: notification.actions || [],
    });

    await webpush.sendNotification(pushSubscription, payload);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
