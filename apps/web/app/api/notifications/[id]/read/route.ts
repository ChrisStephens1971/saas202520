/**
 * PATCH /api/notifications/[id]/read
 * Mark an in-app notification as read/delivered
 * Sprint 4 - NOTIFY-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: notificationId } = await params;

    // Find notification
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // TODO: Check if user has permission to mark this notification as read

    // Update notification status
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, notification: updatedNotification }, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
