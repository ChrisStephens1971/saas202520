/**
 * POST /api/payments/[id]/confirm
 * Confirm payment and generate receipt (PAY-003)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, getReceiptUrl } from '@/lib/stripe';
import type {
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from '@tournament/shared/types/payment';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paymentId } = await params;
    const body: ConfirmPaymentRequest = await request.json();
    const { stripePaymentIntentId } = body;

    if (!stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required field: stripePaymentIntentId' },
        { status: 400 }
      );
    }

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        stripeAccount: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (!payment.stripeAccount) {
      return NextResponse.json({ error: 'Stripe account not configured' }, { status: 400 });
    }

    // Verify payment intent matches
    if (payment.stripePaymentIntent !== stripePaymentIntentId) {
      return NextResponse.json({ error: 'Payment intent mismatch' }, { status: 400 });
    }

    // Retrieve payment intent from Stripe (expand charges to get receipt URL)
    const paymentIntent = await stripe.paymentIntents.retrieve(
      stripePaymentIntentId,
      {
        expand: ['latest_charge'],
      },
      {
        stripeAccount: payment.stripeAccount.stripeAccountId,
      }
    );

    // Update payment status based on Stripe status
    let status: 'succeeded' | 'failed' | 'pending' | 'refunded' | 'partially_refunded';
    if (paymentIntent.status === 'succeeded') {
      status = 'succeeded';
    } else if (paymentIntent.status === 'canceled') {
      status = 'failed';
    } else if (paymentIntent.status === 'processing') {
      status = 'pending';
    } else {
      status = 'pending';
    }

    // Get receipt URL if payment succeeded
    let receiptUrl: string | undefined;
    if (paymentIntent.status === 'succeeded' && paymentIntent.latest_charge) {
      // latest_charge is expanded, so it's a full Charge object
      const charge =
        typeof paymentIntent.latest_charge === 'string'
          ? await stripe.charges.retrieve(paymentIntent.latest_charge, {
              stripeAccount: payment.stripeAccount.stripeAccountId,
            })
          : paymentIntent.latest_charge;

      receiptUrl = charge.receipt_url || getReceiptUrl(charge.id);
    }

    // Update payment in database
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        receiptUrl,
      },
    });

    const response: ConfirmPaymentResponse = {
      payment: {
        id: updatedPayment.id,
        tournamentId: updatedPayment.tournamentId || '',
        playerId: updatedPayment.playerId ?? undefined,
        stripeAccountId: updatedPayment.stripeAccountId || '',
        stripePaymentIntent: updatedPayment.stripePaymentIntent || '',
        amount: updatedPayment.amount.toNumber(),
        currency: updatedPayment.currency,
        status: updatedPayment.status as
          | 'succeeded'
          | 'failed'
          | 'pending'
          | 'refunded'
          | 'partially_refunded',
        purpose: updatedPayment.purpose as 'entry_fee' | 'side_pot' | 'addon',
        description: updatedPayment.description ?? undefined,
        refundedAmount: updatedPayment.refundedAmount?.toNumber() || 0,
        receiptUrl: updatedPayment.receiptUrl ?? undefined,
        createdAt: updatedPayment.createdAt,
        updatedAt: updatedPayment.updatedAt,
      },
      receiptUrl,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error confirming payment:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
