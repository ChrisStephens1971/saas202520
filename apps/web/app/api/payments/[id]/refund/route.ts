/**
 * POST /api/payments/[id]/refund
 * Process refund (PAY-004)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createRefund } from '@/lib/stripe';
import type { CreateRefundRequest, CreateRefundResponse } from '@repo/shared/types/payment';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paymentId } = await params;
    const body: CreateRefundRequest = await request.json();
    const { amount, reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Missing required field: reason' },
        { status: 400 }
      );
    }

    // Get payment with tournament
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        stripeAccount: {
          include: {
            OrganizationMember: {
              where: {
                userId: session.user.id,
                role: { in: ['owner', 'td'] },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify user has permission (must be owner or TD)
    if (!payment.stripeAccount.OrganizationMember || payment.stripeAccount.OrganizationMember.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an owner or TD to process refunds' },
        { status: 403 }
      );
    }

    // Verify payment is in refundable state
    if (payment.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment must be succeeded to refund' },
        { status: 400 }
      );
    }

    // Check refund amount
    const refundAmount = amount || payment.amount;
    const totalRefunded = payment.refundedAmount + refundAmount;

    if (totalRefunded > payment.amount) {
      return NextResponse.json(
        { error: `Refund amount exceeds payment amount (${payment.amount} cents)` },
        { status: 400 }
      );
    }

    // Create refund on Stripe
    const stripeRefund = await createRefund({
      paymentIntentId: payment.stripePaymentIntent,
      amount: refundAmount,
      reason,
      connectedAccountId: payment.stripeAccount.stripeAccountId,
    });

    // Create refund record and update payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId,
          stripeRefundId: stripeRefund.id,
          amount: refundAmount,
          reason,
          status: stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending',
          processedBy: session.user.id,
        },
      });

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: totalRefunded,
          status: totalRefunded >= payment.amount ? 'refunded' : 'partially_refunded',
        },
      });

      return { refund, updatedPayment };
    });

    const response: CreateRefundResponse = {
      refund: {
        ...result.refund,
        createdAt: result.refund.createdAt,
        updatedAt: result.refund.updatedAt,
      },
      payment: {
        ...result.updatedPayment,
        createdAt: result.updatedPayment.createdAt,
        updatedAt: result.updatedPayment.updatedAt,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error creating refund:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
