/**
 * POST /api/tournaments/[id]/reminders
 * Send check-in reminders to registered players
 * Sprint 4 - NOTIFY-005
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendBulkCheckInReminders, notifyTournamentStarting } from '@/lib/match-notifications';

interface SendRemindersRequest {
  type: 'check_in' | 'tournament_starting';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tournamentId } = await params;
    const body: SendRemindersRequest = await request.json();
    const { type } = body;

    if (!type) {
      return NextResponse.json({ error: 'Missing required field: type' }, { status: 400 });
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // TODO: Check if user has permission to send reminders for this tournament

    // Send reminders based on type
    if (type === 'check_in') {
      // Send check-in reminders to all registered players
      await sendBulkCheckInReminders(tournamentId);

      // Create tournament event
      await prisma.tournamentEvent.create({
        data: {
          tournamentId,
          kind: 'notifications.check_in_reminders_sent',
          actor: session.user.id,
          device: 'web',
          payload: {
            reminderType: 'check_in',
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Check-in reminders sent to all registered players',
        },
        { status: 200 }
      );
    } else if (type === 'tournament_starting') {
      // Notify all checked-in players that tournament is starting
      await notifyTournamentStarting(tournamentId);

      // Create tournament event
      await prisma.tournamentEvent.create({
        data: {
          tournamentId,
          kind: 'notifications.tournament_starting_sent',
          actor: session.user.id,
          device: 'web',
          payload: {
            reminderType: 'tournament_starting',
          },
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Tournament starting notifications sent to all checked-in players',
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: 'Invalid reminder type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
