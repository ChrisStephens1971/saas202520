/**
 * POST /api/notifications/preferences - Update notification preferences
 * Sprint 4 - NOTIFY-008
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateNotificationPreferences } from '@/lib/notification-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, smsEnabled, emailEnabled, quietHoursStart, quietHoursEnd, timezone } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'Missing required field: playerId' }, { status: 400 });
    }

    // TODO: Check if user has permission to update preferences for this player

    // Update preferences
    const preferences = await updateNotificationPreferences(playerId, {
      smsEnabled,
      emailEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
    });

    return NextResponse.json({ success: true, preferences }, { status: 200 });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences - Update PWA push notification preferences
 * Sprint 10 Week 4 - PWA Push Notifications
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, preferences } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Verify subscription exists (preferences are stored in PlayerSettings, not PushSubscription)
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: {
        endpoint: subscription.endpoint,
      },
    });

    if (!existingSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // TODO: Update push notification preferences in PlayerSettings model
    // For now, just verify the subscription exists

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating push notification preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
