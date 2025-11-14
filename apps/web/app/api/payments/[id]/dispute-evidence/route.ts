/**
 * GET /api/payments/[id]/dispute-evidence
 * Get comprehensive dispute evidence (PAY-008)
 * Includes payment details, refunds, and audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { GetDisputeEvidenceResponse } from '@tournament/shared/types/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paymentId } = await params;

    // Get payment with related data
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        refunds: true,
        stripeAccount: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (!payment.stripeAccount) {
      return NextResponse.json(
        { error: 'Stripe account not configured' },
        { status: 400 }
      );
    }

    // Verify user has permission (must be owner or TD of the organization)
    const membership = await prisma.organizationMember.findFirst({
      where: {
        orgId: payment.stripeAccount.orgId,
        userId: session.user.id,
        role: { in: ['owner', 'td'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an owner or TD to access dispute evidence' },
        { status: 403 }
      );
    }

    // Get tournament events related to this payment
    const tournamentEvents = payment.tournamentId ? await prisma.tournamentEvent.findMany({
      where: {
        tournamentId: payment.tournamentId,
        OR: [
          { kind: 'payment.created' },
          { kind: 'payment.succeeded' },
          { kind: 'payment.failed' },
          { kind: 'payment.refunded' },
          { kind: 'payment.disputed' },
        ],
      },
      orderBy: { timestamp: 'asc' },
    }) : [];

    // Build audit trail
    const auditTrail: {
      timestamp: Date;
      actor: string;
      action: string;
      details: Record<string, unknown>;
    }[] = [];

    // Add tournament events
    tournamentEvents.forEach(event => {
      auditTrail.push({
        timestamp: event.timestamp,
        actor: event.actor,
        action: event.kind,
        details: (event.payload as Record<string, unknown>) ?? {},
      });
    });

    // Add refund events
    payment.refunds.forEach(refund => {
      auditTrail.push({
        timestamp: refund.createdAt,
        actor: refund.processedBy || 'system',
        action: 'refund.created',
        details: {
          refundId: refund.id,
          amount: refund.amount.toNumber(),
          reason: refund.reason,
          status: refund.status,
        },
      });
    });

    // Sort audit trail by timestamp
    auditTrail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Generate summary text (convert types for helper function)
    const summary = generateDisputeSummary(
      {
        id: payment.id,
        stripePaymentIntent: payment.stripePaymentIntent || '',
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        status: payment.status,
        purpose: payment.purpose || '',
        description: payment.description,
        createdAt: payment.createdAt,
      },
      payment.refunds.map(r => ({
        id: r.id,
        amount: r.amount.toNumber(),
        reason: r.reason || 'requested_by_customer',
        status: r.status,
        stripeRefundId: r.stripeRefundId,
        createdAt: r.createdAt,
      })),
      auditTrail
    );

    const response: GetDisputeEvidenceResponse = {
      payment: {
        id: payment.id,
        tournamentId: payment.tournamentId || '',
        playerId: payment.playerId ?? undefined,
        stripeAccountId: payment.stripeAccountId || '',
        stripePaymentIntent: payment.stripePaymentIntent || '',
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        status: payment.status as 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded',
        purpose: payment.purpose as 'entry_fee' | 'side_pot' | 'addon',
        description: payment.description ?? undefined,
        refundedAmount: payment.refundedAmount?.toNumber() || 0,
        receiptUrl: payment.receiptUrl ?? undefined,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      refunds: payment.refunds.map((r) => ({
        id: r.id,
        paymentId: r.paymentId,
        stripeRefundId: r.stripeRefundId,
        amount: r.amount.toNumber(),
        reason: r.reason as 'duplicate' | 'fraudulent' | 'requested_by_customer',
        status: r.status as 'pending' | 'succeeded' | 'failed' | 'cancelled',
        processedBy: r.processedBy || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      auditTrail,
      summary,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching dispute evidence:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

function generateDisputeSummary(
  payment: { id: string; stripePaymentIntent: string; amount: number; currency: string; status: string; purpose: string; description?: string | null; createdAt: Date },
  refunds: Array<{ id: string; amount: number; reason: string; status: string; stripeRefundId: string; createdAt: Date }>,
  auditTrail: Array<{ timestamp: Date; actor: string; action: string; details: Record<string, unknown> }>
): string {
  const lines: string[] = [];

  lines.push('=== PAYMENT DISPUTE EVIDENCE ===');
  lines.push('');
  lines.push(`Payment ID: ${payment.id}`);
  lines.push(`Stripe Payment Intent: ${payment.stripePaymentIntent}`);
  lines.push(`Amount: $${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
  lines.push(`Status: ${payment.status.toUpperCase()}`);
  lines.push(`Purpose: ${payment.purpose}`);
  lines.push(`Description: ${payment.description || 'N/A'}`);
  lines.push(`Created: ${payment.createdAt.toLocaleString()}`);
  lines.push('');

  if (refunds.length > 0) {
    lines.push('=== REFUNDS ===');
    const totalRefunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);
    refunds.forEach((refund, i) => {
      lines.push(`Refund ${i + 1}:`);
      lines.push(`  ID: ${refund.id}`);
      lines.push(`  Amount: $${(refund.amount / 100).toFixed(2)}`);
      lines.push(`  Reason: ${refund.reason}`);
      lines.push(`  Status: ${refund.status}`);
      lines.push(`  Processed: ${refund.createdAt.toLocaleString()}`);
      lines.push('');
    });
    lines.push(`Total Refunded: $${(totalRefunded / 100).toFixed(2)}`);
    lines.push('');
  }

  lines.push('=== AUDIT TRAIL ===');
  auditTrail.forEach(event => {
    lines.push(`[${event.timestamp.toLocaleString()}] ${event.action}`);
    lines.push(`  Actor: ${event.actor}`);
    if (Object.keys(event.details).length > 0) {
      lines.push(`  Details: ${JSON.stringify(event.details, null, 2)}`);
    }
    lines.push('');
  });

  lines.push('=== END OF EVIDENCE ===');

  return lines.join('\n');
}
