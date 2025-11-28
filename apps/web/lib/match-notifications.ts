/**
 * Match Notification Triggers
 * Automatically send notifications on match state changes
 * Sprint 4 - NOTIFY-004, NOTIFY-005, NOTIFY-008
 */

import { prisma } from '@/lib/prisma';
import { sendNotificationWithTemplate, createInAppNotification } from '@/lib/notification-service';

// ============================================================================
// MATCH STATE CHANGE TRIGGERS
// ============================================================================

/**
 * Notify players when match is ready (both players assigned to a table)
 */
export async function notifyMatchReady(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: { include: { organization: true } },
      playerA: true,
      playerB: true,
      table: true,
    },
  });

  if (!match || !match.playerA || !match.playerB || !match.table) {
    console.log(`Match ${matchId} not ready for notification (missing players or table)`);
    return;
  }

  const orgId = match.tournament.orgId;
  const tableName = match.table.label;

  // Simple in-app notifications for both players (not using template system for match ready)
  // In-app notification for Player A
  await createInAppNotification(
    orgId,
    match.playerA.id,
    `Your match is ready at ${tableName}. Opponent: ${match.playerB.name}`,
    match.tournamentId
  );

  // In-app notification for Player B
  await createInAppNotification(
    orgId,
    match.playerB.id,
    `Your match is ready at ${tableName}. Opponent: ${match.playerA.name}`,
    match.tournamentId
  );

  console.log(`Match ready notifications sent for match ${matchId}`);
}

/**
 * Notify players when match is completed (using new template system)
 */
export async function notifyMatchCompleted(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: { include: { organization: true } },
      playerA: true,
      playerB: true,
    },
  });

  if (!match || !match.playerA || !match.playerB || !match.winnerId) {
    console.log(`Match ${matchId} not completed or missing data`);
    return;
  }

  const orgId = match.tournament.orgId;
  const tournamentName = match.tournament.name;
  const score = match.score as { playerA: number; playerB: number };
  const scoreText = `${score.playerA}-${score.playerB}`;

  const loserName = match.winnerId === match.playerA.id ? match.playerB.name : match.playerA.name;

  // Notify winner
  const winner = match.winnerId === match.playerA.id ? match.playerA : match.playerB;
  await sendNotificationWithTemplate(
    orgId,
    winner.id,
    'match_completed',
    {
      playerName: winner.name,
      tournamentName,
      matchOpponent: loserName,
      score: scoreText,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${match.tournamentId}/matches/${matchId}`,
    },
    ['email', 'sms', 'in_app'],
    match.tournamentId
  ).catch((err) => console.error('Failed to send match completed notification to winner:', err));

  // Notify loser
  const loser = match.winnerId === match.playerA.id ? match.playerB : match.playerA;
  const winnerName = match.winnerId === match.playerA.id ? match.playerA.name : match.playerB.name;

  await sendNotificationWithTemplate(
    orgId,
    loser.id,
    'match_completed',
    {
      playerName: loser.name,
      tournamentName,
      matchOpponent: winnerName,
      score: scoreText,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${match.tournamentId}/matches/${matchId}`,
    },
    ['email', 'sms', 'in_app'],
    match.tournamentId
  ).catch((err) => console.error('Failed to send match completed notification to loser:', err));

  console.log(`Match completed notifications sent for match ${matchId}`);
}

// ============================================================================
// CHECK-IN REMINDERS (NOTIFY-005)
// ============================================================================

/**
 * Send check-in reminder to a player
 */
export async function sendCheckInReminder(playerId: string, tournamentId: string): Promise<void> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      tournament: { include: { organization: true } },
    },
  });

  if (!player) {
    console.log(`Player ${playerId} not found`);
    return;
  }

  // Only send to registered players (not already checked in)
  if (player.status !== 'registered') {
    console.log(`Player ${playerId} status is ${player.status}, skipping reminder`);
    return;
  }

  const orgId = player.tournament.orgId;
  const tournamentName = player.tournament.name;
  const message = `Reminder: Please check in for ${tournamentName}. Tournament starts soon!`;

  // In-app notification
  await createInAppNotification(orgId, playerId, message, tournamentId);

  // Use template system for email/SMS
  await sendNotificationWithTemplate(
    orgId,
    playerId,
    'tournament_reminder',
    {
      playerName: player.name,
      tournamentName,
      customMessage: 'Please check in. Tournament starts soon!',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}`,
    },
    ['email', 'sms'],
    tournamentId
  ).catch((err) => console.error('Failed to send check-in reminder:', err));

  console.log(`Check-in reminder sent to player ${playerId}`);
}

/**
 * Send check-in reminders to all registered players in a tournament
 */
export async function sendBulkCheckInReminders(tournamentId: string): Promise<void> {
  const players = await prisma.player.findMany({
    where: {
      tournamentId,
      status: 'registered', // Only players who haven't checked in
    },
  });

  console.log(
    `Sending check-in reminders to ${players.length} players in tournament ${tournamentId}`
  );

  // Send reminders in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((player) => sendCheckInReminder(player.id, tournamentId)));

    // Wait 1 second between batches to respect rate limits
    if (i + BATCH_SIZE < players.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`Check-in reminders sent to all registered players in tournament ${tournamentId}`);
}

/**
 * Send tournament starting notification to all checked-in players
 */
export async function notifyTournamentStarting(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      organization: true,
      players: {
        where: {
          status: { in: ['checked_in', 'active'] },
        },
      },
    },
  });

  if (!tournament) {
    console.log(`Tournament ${tournamentId} not found`);
    return;
  }

  const orgId = tournament.orgId;
  const message = `${tournament.name} is starting! Please proceed to your assigned table.`;

  console.log(`Sending tournament starting notifications to ${tournament.players.length} players`);

  // Send notifications in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < tournament.players.length; i += BATCH_SIZE) {
    const batch = tournament.players.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (player) => {
        // In-app notification
        await createInAppNotification(orgId, player.id, message, tournamentId);

        // Use template system for email/SMS
        await sendNotificationWithTemplate(
          orgId,
          player.id,
          'tournament_reminder',
          {
            playerName: player.name,
            tournamentName: tournament.name,
            customMessage: 'The tournament is starting! Please proceed to your assigned table.',
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}`,
          },
          ['email', 'sms'],
          tournamentId
        ).catch((err) => console.error('Failed to send tournament starting notification:', err));
      })
    );

    // Wait between batches
    if (i + BATCH_SIZE < tournament.players.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`Tournament starting notifications sent`);
}
