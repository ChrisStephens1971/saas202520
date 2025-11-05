/**
 * POST /api/tournaments/[id]/payouts/calculate
 * Calculate payouts based on prize structure (PAY-005)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { CalculatePayoutsRequest, CalculatePayoutsResponse } from '@repo/shared/types/payment';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tournamentId = params.id;
    const body: CalculatePayoutsRequest = await request.json();
    const { prizeStructure, includeEntryFees, includeSidePots } = body;

    if (!prizeStructure || prizeStructure.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: prizeStructure' },
        { status: 400 }
      );
    }

    // Verify tournament exists and user has access
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
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
        players: {
          where: {
            status: { in: ['active', 'eliminated', 'checked_in'] },
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
        { error: 'Unauthorized: You must be an owner or TD to calculate payouts' },
        { status: 403 }
      );
    }

    // Calculate total collected fees
    const payments = await prisma.payment.findMany({
      where: {
        tournamentId,
        status: 'succeeded',
      },
    });

    let entryFeesTotal = 0;
    let sidePotsTotal = 0;

    payments.forEach(payment => {
      if (payment.purpose === 'entry_fee' && includeEntryFees) {
        entryFeesTotal += payment.amount;
      }
      if (payment.purpose === 'side_pot' && includeSidePots) {
        sidePotsTotal += payment.amount;
      }
    });

    const totalCollected = entryFeesTotal + sidePotsTotal;

    // Validate prize structure (must total 100%)
    const totalPercentage = prizeStructure.reduce((sum, p) => sum + p.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: `Prize structure must total 100% (currently ${totalPercentage}%)` },
        { status: 400 }
      );
    }

    // TODO: Get actual tournament rankings/placements
    // For now, we'll create a placeholder structure
    // In a real implementation, this would come from tournament results

    // Calculate payout amounts
    const payouts = prizeStructure.map(prize => {
      const amount = Math.floor((totalCollected * prize.percentage) / 100);

      return {
        placement: prize.placement,
        amount,
        percentage: prize.percentage,
      };
    });

    // Create or update payout records in database
    const createdPayouts = await Promise.all(
      payouts.map(async (payout) => {
        // Find existing payout or create new one
        const existingPayout = await prisma.payout.findFirst({
          where: {
            tournamentId,
            placement: payout.placement,
            source: 'prize_pool',
          },
        });

        if (existingPayout) {
          return await prisma.payout.update({
            where: { id: existingPayout.id },
            data: {
              amount: payout.amount,
              status: 'pending',
            },
          });
        } else {
          // TODO: Link to actual player based on tournament results
          // For now, we'll leave playerId null until rankings are finalized
          return await prisma.payout.create({
            data: {
              tournamentId,
              playerId: '', // Will be updated when tournament completes
              placement: payout.placement,
              amount: payout.amount,
              source: 'prize_pool',
              status: 'pending',
            },
          });
        }
      })
    );

    const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
    const houseTake = totalCollected - totalPayouts;

    const response: CalculatePayoutsResponse = {
      payouts: createdPayouts.map(p => ({
        ...p,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      summary: {
        totalCollected,
        totalPayouts,
        houseTake,
        breakdown: {
          entryFees: entryFeesTotal,
          sidePots: sidePotsTotal,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error calculating payouts:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
