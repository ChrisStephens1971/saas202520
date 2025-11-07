/**
 * Unsubscribe from Push Notifications API Route
 * Sprint 10 Week 4 - PWA Push Notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Remove subscription from database
    await prisma.pushSubscription.delete({
      where: {
        endpoint: subscription.endpoint,
      },
    });

    console.log('Push subscription removed:', {
      userId: session.user.id,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from notifications' },
      { status: 500 }
    );
  }
}
