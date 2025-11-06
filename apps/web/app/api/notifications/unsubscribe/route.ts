/**
 * Unsubscribe from Push Notifications API Route
 * Sprint 8 - Advanced Features
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, tournamentId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // TODO: Remove subscription from database
    // For now, we'll just return success
    // In production, you would:
    // 1. Get user ID from session/auth
    // 2. Find and delete subscription from database
    // 3. Clean up any associated notification preferences

    console.log('Unsubscribed from push notifications:', {
      endpoint: subscription.endpoint,
      tournamentId,
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
