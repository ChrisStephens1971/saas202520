/**
 * Match Notification Triggers
 * Automatically send notifications on match state changes
 * Sprint 4 - NOTIFY-004, NOTIFY-005
 */

import { prisma } from '@/lib/prisma';
import {
  sendEmailWithTemplate,
  sendSMSToPlayer,
  createInAppNotification,
} from '@/lib/notification-service';

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
  const tournamentName = match.tournament.name;
  const tableName = match.table.label;

  // Notify Player A
  if (match.playerA.email || match.playerA.phone) {
    const templateData = {
      playerName: match.playerA.name,
      tournamentName,
      tableName,
      opponentName: match.playerB.name,
    };

    // In-app notification
    await createInAppNotification(
      orgId,
      match.playerA.id,
      `Your match is ready at ${tableName}. Opponent: ${match.playerB.name}`,
      match.tournamentId
    );

    // Email notification (if email provided)
    if (match.playerA.email) {
      await sendEmailWithTemplate(
        orgId,
        match.playerA.email,
        'match-ready',
        templateData,
        match.tournamentId,
        match.playerA.id
      ).catch((err) => console.error('Failed to send email to Player A:', err));
    }

    // SMS notification (if phone provided)
    if (match.playerA.phone) {
      await sendSMSToPlayer(
        orgId,
        match.playerA.id,
        `Your match is ready at ${tableName}. Opponent: ${match.playerB.name}`,
        match.tournamentId
      ).catch((err) => console.error('Failed to send SMS to Player A:', err));
    }
  }

  // Notify Player B
  if (match.playerB.email || match.playerB.phone) {
    const templateData = {
      playerName: match.playerB.name,
      tournamentName,
      tableName,
      opponentName: match.playerA.name,
    };

    // In-app notification
    await createInAppNotification(
      orgId,
      match.playerB.id,
      `Your match is ready at ${tableName}. Opponent: ${match.playerA.name}`,
      match.tournamentId
    );

    // Email notification (if email provided)
    if (match.playerB.email) {
      await sendEmailWithTemplate(
        orgId,
        match.playerB.email,
        'match-ready',
        templateData,
        match.tournamentId,
        match.playerB.id
      ).catch((err) => console.error('Failed to send email to Player B:', err));
    }

    // SMS notification (if phone provided)
    if (match.playerB.phone) {
      await sendSMSToPlayer(
        orgId,
        match.playerB.id,
        `Your match is ready at ${tableName}. Opponent: ${match.playerA.name}`,
        match.tournamentId
      ).catch((err) => console.error('Failed to send SMS to Player B:', err));
    }
  }

  console.log(`Match ready notifications sent for match ${matchId}`);
}

/**
 * Notify players when match is completed
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

  const winnerName =
    match.winnerId === match.playerA.id ? match.playerA.name : match.playerB.name;
  const loserName =
    match.winnerId === match.playerA.id ? match.playerB.name : match.playerA.name;

  // Notify winner
  const winner = match.winnerId === match.playerA.id ? match.playerA : match.playerB;
  if (winner.email || winner.phone) {
    const templateData = {
      playerName: winner.name,
      tournamentName,
      result: 'You won!',
      score: scoreText,
    };

    // In-app notification
    await createInAppNotification(
      orgId,
      winner.id,
      `Match completed! You won ${scoreText} against ${loserName}`,
      match.tournamentId
    );

    // Email notification
    if (winner.email) {
      await sendEmailWithTemplate(
        orgId,
        winner.email,
        'match-completed',
        templateData,
        match.tournamentId,
        winner.id
      ).catch((err) => console.error('Failed to send email to winner:', err));
    }

    // SMS notification
    if (winner.phone) {
      await sendSMSToPlayer(
        orgId,
        winner.id,
        `Match completed! You won ${scoreText} against ${loserName}`,
        match.tournamentId
      ).catch((err) => console.error('Failed to send SMS to winner:', err));
    }
  }

  // Notify loser
  const loser = match.winnerId === match.playerA.id ? match.playerB : match.playerA;
  if (loser.email || loser.phone) {
    const templateData = {
      playerName: loser.name,
      tournamentName,
      result: 'Match complete',
      score: scoreText,
    };

    // In-app notification
    await createInAppNotification(
      orgId,
      loser.id,
      `Match completed. Final score: ${scoreText} vs ${winnerName}`,
      match.tournamentId
    );

    // Email notification
    if (loser.email) {
      await sendEmailWithTemplate(
        orgId,
        loser.email,
        'match-completed',
        templateData,
        match.tournamentId,
        loser.id
      ).catch((err) => console.error('Failed to send email to loser:', err));
    }

    // SMS notification
    if (loser.phone) {
      await sendSMSToPlayer(
        orgId,
        loser.id,
        `Match completed. Final score: ${scoreText} vs ${winnerName}`,
        match.tournamentId
      ).catch((err) => console.error('Failed to send SMS to loser:', err));
    }
  }

  console.log(`Match completed notifications sent for match ${matchId}`);
}

// ============================================================================
// CHECK-IN REMINDERS (NOTIFY-005)
// ============================================================================

/**
 * Send check-in reminder to a player
 */
export async function sendCheckInReminder(
  playerId: string,
  tournamentId: string
): Promise<void> {
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

  // Email reminder
  if (player.email) {
    await sendEmailWithTemplate(
      orgId,
      player.email,
      'tournament-starting',
      {
        playerName: player.name,
        tournamentName,
      },
      tournamentId,
      playerId
    ).catch((err) => console.error('Failed to send check-in email:', err));
  }

  // SMS reminder
  if (player.phone) {
    await sendSMSToPlayer(orgId, playerId, message, tournamentId).catch((err) =>
      console.error('Failed to send check-in SMS:', err)
    );
  }

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

  console.log(`Sending check-in reminders to ${players.length} players in tournament ${tournamentId}`);

  // Send reminders in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((player) => sendCheckInReminder(player.id, tournamentId))
    );

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

        // Email notification
        if (player.email) {
          await sendEmailWithTemplate(
            orgId,
            player.email,
            'tournament-starting',
            {
              playerName: player.name,
              tournamentName: tournament.name,
            },
            tournamentId,
            player.id
          ).catch((err) => console.error('Failed to send email:', err));
        }

        // SMS notification
        if (player.phone) {
          await sendSMSToPlayer(orgId, player.id, message, tournamentId).catch(
            (err) => console.error('Failed to send SMS:', err)
          );
        }
      })
    );

    // Wait between batches
    if (i + BATCH_SIZE < tournament.players.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`Tournament starting notifications sent`);
}
