/**
 * POST /api/payments/create-intent
 * Create payment intent for entry fees (PAY-002)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createPaymentIntent } from '@/lib/stripe';
import type { CreatePaymentIntentRequest, CreatePaymentIntentResponse } from '@tournament/shared/types/payment';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePaymentIntentRequest = await request.json();
    const { tournamentId, playerId, amount, currency, purpose, description } = body;

    if (!tournamentId || !amount || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields: tournamentId, amount, purpose' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get tournament and verify organization
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.organization.members.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this tournament' },
        { status: 403 }
      );
    }

    // Get organization's Stripe account
    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { orgId: tournament.orgId },
    });

    if (!stripeAccount || !stripeAccount.chargesEnabled) {
      return NextResponse.json(
        { error: 'Payment processing is not enabled for this organization' },
        { status: 400 }
      );
    }

    // Create payment intent on Stripe
    const paymentIntent = await createPaymentIntent({
      amount,
      currency: currency || 'usd',
      connectedAccountId: stripeAccount.stripeAccountId,
      metadata: {
        tournamentId,
        playerId: playerId || '',
        purpose,
        description: description || '',
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        tournamentId,
        playerId: playerId || null,
        stripeAccountId: stripeAccount.id,
        stripePaymentIntent: paymentIntent.id,
        amount,
        currency: currency || 'usd',
        status: 'pending',
        purpose,
        description,
      },
    });

    const response: CreatePaymentIntentResponse = {
      payment: {
        ...payment,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      clientSecret: paymentIntent.client_secret!,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error creating payment intent:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
