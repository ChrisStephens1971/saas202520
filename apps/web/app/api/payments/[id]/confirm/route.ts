/**
 * POST /api/payments/[id]/confirm
 * Confirm payment and generate receipt (PAY-003)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, getReceiptUrl } from '@/lib/stripe';
import type { ConfirmPaymentRequest, ConfirmPaymentResponse } from '@repo/shared/types/payment';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentId = params.id;
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
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify payment intent matches
    if (payment.stripePaymentIntent !== stripePaymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent mismatch' },
        { status: 400 }
      );
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      stripePaymentIntentId,
      {
        stripeAccount: payment.stripeAccount.stripeAccountId,
      }
    );

    // Update payment status based on Stripe status
    let status: string;
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
    if (paymentIntent.status === 'succeeded' && paymentIntent.charges.data[0]) {
      const chargeId = paymentIntent.charges.data[0].id;
      receiptUrl = paymentIntent.charges.data[0].receipt_url || getReceiptUrl(chargeId);
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
      payment: updatedPayment as any,
      receiptUrl,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
