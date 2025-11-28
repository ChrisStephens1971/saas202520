/**
 * GET /api/notifications/preferences/[playerId] - Get notification preferences
 * Sprint 4 - NOTIFY-008
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNotificationPreferences } from '@/lib/notification-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId } = await params;

    // TODO: Check if user has permission to view preferences for this player

    // Get preferences
    const preferences = await getNotificationPreferences(playerId);

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json(
        {
          preferences: {
            playerId,
            smsEnabled: true,
            emailEnabled: true,
            smsOptedOut: false,
            quietHoursStart: null,
            quietHoursEnd: null,
            timezone: null,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
