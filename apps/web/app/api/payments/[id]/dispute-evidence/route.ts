/**
 * GET /api/payments/[id]/dispute-evidence
 * Get comprehensive dispute evidence (PAY-008)
 * Includes payment details, refunds, and audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { GetDisputeEvidenceResponse } from '@repo/shared/types/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentId = params.id;

    // Get payment with related data
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        refunds: true,
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

    // Verify user has permission
    if (!payment.stripeAccount.OrganizationMember || payment.stripeAccount.OrganizationMember.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an owner or TD to access dispute evidence' },
        { status: 403 }
      );
    }

    // Get tournament events related to this payment
    const tournamentEvents = await prisma.tournamentEvent.findMany({
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
    });

    // Build audit trail
    const auditTrail: {
      timestamp: Date;
      actor: string;
      action: string;
      details: any;
    }[] = [];

    // Add tournament events
    tournamentEvents.forEach(event => {
      auditTrail.push({
        timestamp: event.timestamp,
        actor: event.actor,
        action: event.kind,
        details: event.payload,
      });
    });

    // Add refund events
    payment.refunds.forEach(refund => {
      auditTrail.push({
        timestamp: refund.createdAt,
        actor: refund.processedBy,
        action: 'refund.created',
        details: {
          refundId: refund.id,
          amount: refund.amount,
          reason: refund.reason,
          status: refund.status,
        },
      });
    });

    // Sort audit trail by timestamp
    auditTrail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Generate summary text
    const summary = generateDisputeSummary(payment as any, payment.refunds as any[], auditTrail);

    const response: GetDisputeEvidenceResponse = {
      payment: payment as any,
      refunds: payment.refunds as any,
      auditTrail,
      summary,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching dispute evidence:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateDisputeSummary(
  payment: any,
  refunds: any[],
  auditTrail: any[]
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
    refunds.forEach((refund, i) => {
      lines.push(`Refund ${i + 1}:`);
      lines.push(`  ID: ${refund.id}`);
      lines.push(`  Amount: $${(refund.amount / 100).toFixed(2)}`);
      lines.push(`  Reason: ${refund.reason}`);
      lines.push(`  Status: ${refund.status}`);
      lines.push(`  Processed: ${refund.createdAt.toLocaleString()}`);
      lines.push('');
    });
    lines.push(`Total Refunded: $${(payment.refundedAmount / 100).toFixed(2)}`);
    lines.push('');
  }

  lines.push('=== AUDIT TRAIL ===');
  auditTrail.forEach(event => {
    lines.push(`[${event.timestamp.toLocaleString()}] ${event.action}`);
    lines.push(`  Actor: ${event.actor}`);
    if (event.details) {
      lines.push(`  Details: ${JSON.stringify(event.details, null, 2)}`);
    }
    lines.push('');
  });

  lines.push('=== END OF EVIDENCE ===');

  return lines.join('\n');
}
