/**
 * GET/PUT /api/players/[id]/preferences
 * Manage player notification preferences with compliance validation
 * Sprint 4 - NOTIFY-007
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  updateNotificationPreferences,
  getNotificationPreferences,
} from '@/lib/notification-service';
import { validateNotificationDelivery } from '@/lib/rate-limiter';

/**
 * Get player notification preferences
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playerId } = await params;

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tournamentId: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // TODO: Check if user has permission to view this player's preferences

    // Get preferences (will return default if none exist)
    const preferences = await getNotificationPreferences(playerId);

    // Check compliance status
    const [emailValidation, smsValidation] = await Promise.all([
      validateNotificationDelivery(playerId, 'email'),
      validateNotificationDelivery(playerId, 'sms'),
    ]);

    return NextResponse.json(
      {
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          phone: player.phone,
        },
        preferences: preferences || {
          playerId,
          smsEnabled: true,
          emailEnabled: true,
          smsOptedOut: false,
          quietHoursStart: null,
          quietHoursEnd: null,
          timezone: null,
        },
        compliance: {
          email: {
            canSend: emailValidation.allowed,
            reason: emailValidation.reason,
          },
          sms: {
            canSend: smsValidation.allowed,
            reason: smsValidation.reason,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching player preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update player notification preferences
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playerId } = await params;
    const body = await request.json();

    const { smsEnabled, emailEnabled, quietHoursStart, quietHoursEnd, timezone } = body;

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // TODO: Check if user has permission to update this player's preferences

    // Validate quiet hours format if provided
    if (quietHoursStart && !/^\d{2}:\d{2}$/.test(quietHoursStart)) {
      return NextResponse.json(
        { error: 'Invalid quietHoursStart format. Use HH:MM (e.g., "22:00")' },
        { status: 400 }
      );
    }

    if (quietHoursEnd && !/^\d{2}:\d{2}$/.test(quietHoursEnd)) {
      return NextResponse.json(
        { error: 'Invalid quietHoursEnd format. Use HH:MM (e.g., "08:00")' },
        { status: 400 }
      );
    }

    // Update preferences
    const preferences = await updateNotificationPreferences(playerId, {
      smsEnabled,
      emailEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
    });

    // Log preference change in tournament events
    await prisma.tournamentEvent.create({
      data: {
        tournamentId: player.tournamentId,
        kind: 'player.preferences_updated',
        actor: session.user.id,
        device: 'web',
        payload: {
          playerId,
          smsEnabled,
          emailEnabled,
          quietHoursStart,
          quietHoursEnd,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        preferences,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating player preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
