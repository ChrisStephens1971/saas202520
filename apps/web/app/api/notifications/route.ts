/**
 * POST /api/notifications - Send a notification
 * GET /api/notifications - Get notifications (filtered by org/tournament/player)
 * Sprint 4 - NOTIFY-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notification-service';
import type { NotificationInput } from '@/lib/notification-service';

/**
 * Send a notification
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: NotificationInput = await request.json();

    // Validate required fields
    if (!body.orgId || !body.type || !body.channel || !body.recipient || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, type, channel, recipient, message' },
        { status: 400 }
      );
    }

    // TODO: Check if user has permission to send notifications for this org

    // Send notification
    const result = await sendNotification(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, rateLimited: result.rateLimited },
        { status: result.rateLimited ? 429 : 500 }
      );
    }

    return NextResponse.json(
      { success: true, notificationId: result.notificationId },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get notifications (filtered by query params)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const tournamentId = searchParams.get('tournamentId');
    const playerId = searchParams.get('playerId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: orgId' },
        { status: 400 }
      );
    }

    // TODO: Check if user has permission to view notifications for this org

    // Build filter
    const where: {
      orgId: string;
      tournamentId?: string;
      playerId?: string;
      type?: string;
      status?: string;
    } = { orgId };

    if (tournamentId) where.tournamentId = tournamentId;
    if (playerId) where.playerId = playerId;
    if (type) where.type = type;
    if (status) where.status = status;

    // Fetch notifications
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json(
      {
        notifications,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
