/**
 * GET /api/tournaments/[id]/payouts
 * Get tournament payouts
 *
 * PUT /api/tournaments/[id]/payouts
 * Mark payout as paid
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { GetPayoutsResponse, MarkPayoutPaidRequest, MarkPayoutPaidResponse } from '@tournament/shared/types/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;

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
      payouts: payouts.map(p => ({
        id: p.id,
        tournamentId: p.tournamentId,
        playerId: p.playerId,
        placement: p.placement,
        amount: p.amount,
        source: p.source as 'prize_pool' | 'side_pot',
        status: p.status as 'pending' | 'paid' | 'voided',
        paidAt: p.paidAt ?? undefined,
        paidBy: p.paidBy ?? undefined,
        notes: p.notes ?? undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      summary,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching payouts:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;
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
    });

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    // Get tournament to verify permissions
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { orgId: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Verify user has permission (must be owner or TD of the organization)
    const membership = await prisma.organizationMember.findFirst({
      where: {
        orgId: tournament.orgId,
        userId: session.user.id,
        role: { in: ['owner', 'td'] },
      },
    });

    if (!membership) {
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
      payout: {
        id: updatedPayout.id,
        tournamentId: updatedPayout.tournamentId,
        playerId: updatedPayout.playerId,
        placement: updatedPayout.placement,
        amount: updatedPayout.amount,
        source: updatedPayout.source as 'prize_pool' | 'side_pot',
        status: updatedPayout.status as 'pending' | 'paid' | 'voided',
        paidAt: updatedPayout.paidAt ?? undefined,
        paidBy: updatedPayout.paidBy ?? undefined,
        notes: updatedPayout.notes ?? undefined,
        createdAt: updatedPayout.createdAt,
        updatedAt: updatedPayout.updatedAt,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error marking payout as paid:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
