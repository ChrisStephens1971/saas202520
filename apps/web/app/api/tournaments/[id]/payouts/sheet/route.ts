/**
 * GET /api/tournaments/[id]/payouts/sheet
 * Generate and download payout sheet PDF (PAY-007)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generatePayoutSheet } from '@/lib/pdf-generator';

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

    // Get tournament with payouts
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

    // Get players for payout names
    const playerIds = payouts.map(p => p.playerId).filter(Boolean);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
    });

    const playerMap = new Map(players.map(p => [p.id, p]));

    // Calculate summary
    const totalCollected = payouts.reduce((sum, p) => sum + p.amount, 0);
    const totalPayouts = payouts
      .filter(p => p.status !== 'voided')
      .reduce((sum, p) => sum + p.amount, 0);
    const houseTake = totalCollected - totalPayouts;

    // Prepare data for PDF
    const pdfData = {
      tournamentName: tournament.name,
      tournamentDate: tournament.startedAt
        ? tournament.startedAt.toLocaleDateString()
        : tournament.createdAt.toLocaleDateString(),
      organizationName: tournament.organization.name,
      payouts: payouts.map(p => ({
        placement: p.placement,
        playerName: p.playerId ? playerMap.get(p.playerId)?.name || 'Unknown' : 'TBD',
        amount: p.amount,
        status: p.status,
      })),
      summary: {
        totalCollected,
        totalPayouts,
        houseTake,
      },
    };

    // Generate PDF
    const pdfBuffer = await generatePayoutSheet(pdfData);

    // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payout-sheet-${tournament.name.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error generating payout sheet:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
