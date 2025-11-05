/**
 * GET /api/tournaments/[id]/payouts
 * Get tournament payouts
 *
 * PUT /api/tournaments/[id]/payouts
 * Mark payout as paid
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { GetPayoutsResponse, MarkPayoutPaidRequest, MarkPayoutPaidResponse } from '@repo/shared/types/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tournamentId = params.id;

    // Verify tournament exists and user has access
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

    // Get payouts
    const payouts = await prisma.payout.findMany({
      where: { tournamentId },
      orderBy: { placement: 'asc' },
    });

    // Calculate summary
    const summary = {
      totalPending: payouts
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0),
      totalPaid: payouts
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0),
      totalVoided: payouts
        .filter(p => p.status === 'voided')
        .reduce((sum, p) => sum + p.amount, 0),
    };

    const response: GetPayoutsResponse = {
      payouts: payouts as any,
      summary,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tournamentId = params.id;
    const body: MarkPayoutPaidRequest & { payoutId: string } = await request.json();
    const { payoutId, notes } = body;

    if (!payoutId) {
      return NextResponse.json(
        { error: 'Missing required field: payoutId' },
        { status: 400 }
      );
    }

    // Verify payout exists and belongs to this tournament
    const payout = await prisma.payout.findFirst({
      where: {
        id: payoutId,
        tournamentId,
      },
      include: {
        tournament: {
          include: {
            organization: {
              include: {
                members: {
                  where: {
                    userId: session.user.id,
                    role: { in: ['owner', 'td'] },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    if (payout.tournament.organization.members.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an owner or TD to mark payouts as paid' },
        { status: 403 }
      );
    }

    // Update payout
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidBy: session.user.id,
        notes,
      },
    });

    const response: MarkPayoutPaidResponse = {
      payout: updatedPayout as any,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error marking payout as paid:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
