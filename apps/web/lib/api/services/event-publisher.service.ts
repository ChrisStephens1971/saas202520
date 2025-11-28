/**
 * Event Publisher Service
 * Publishes webhook events to subscribed webhooks
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { PrismaClient } from '@prisma/client';
import { webhookQueue } from '../queues/webhook.queue';
import {
  WebhookEvent,
  WebhookPayload,
  WebhookJobData,
  WebhookEventData,
} from '../types/webhook-events.types';
import { getWebhooksForEvent } from './webhook.service';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Generate unique event ID
 * Format: evt_<timestamp>_<random>
 *
 * @example
 * generateEventId() // Returns: "evt_1699293600000_abc123"
 */
function generateEventId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `evt_${timestamp}_${random}`;
}

/**
 * Publish an event to all subscribed webhooks
 * Creates delivery jobs in the Bull queue for each webhook
 *
 * @param event - Event type (tournament.started, match.completed, etc.)
 * @param data - Event-specific data
 * @param tenantId - Tenant/organization ID
 * @returns Number of webhooks notified
 *
 * @example
 * await publishEvent(WebhookEvent.TOURNAMENT_STARTED, {
 *   tournamentId: 'tour_123',
 *   name: 'Weekly 8-Ball',
 *   startedAt: new Date().toISOString(),
 *   playerCount: 16
 * }, 'org_456');
 */
export async function publishEvent(
  event: WebhookEvent,
  data: WebhookEventData,
  tenantId: string
): Promise<number> {
  try {
    // Generate unique event ID
    const eventId = generateEventId();

    // Create webhook payload
    const payload: WebhookPayload = {
      id: eventId,
      event: event,
      timestamp: new Date().toISOString(),
      tenantId: tenantId,
      data: data,
    };

    // Find all active webhooks subscribed to this event
    const webhooks = await getWebhooksForEvent(tenantId, event);

    if (webhooks.length === 0) {
      console.log(`[Event Publisher] No webhooks subscribed to ${event} for tenant ${tenantId}`);
      return 0;
    }

    console.log(`[Event Publisher] Publishing ${event} to ${webhooks.length} webhook(s)`);

    // Create delivery log and queue job for each webhook
    for (const webhook of webhooks) {
      // Create delivery log entry
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventId: eventId,
          eventType: event,
          url: webhook.url,
          payload: payload as any,
          signature: '', // Will be generated during delivery
          attemptNumber: 1,
        },
      });

      // Queue delivery job
      await publishWebhookJob({
        webhookId: webhook.id,
        deliveryId: delivery.id,
        event: event,
        payload: payload,
      });
    }

    return webhooks.length;
  } catch (error) {
    console.error('[Event Publisher] Error publishing event:', error);
    throw error;
  }
}

/**
 * Publish a webhook delivery job to the queue
 * Internal function used by publishEvent and retryDelivery
 *
 * @param jobData - Webhook job data
 */
export async function publishWebhookJob(jobData: WebhookJobData): Promise<void> {
  await webhookQueue.add(jobData, {
    jobId: jobData.deliveryId, // Use delivery ID as job ID for idempotency
  });

  console.log(
    `[Event Publisher] Queued delivery job ${jobData.deliveryId} for webhook ${jobData.webhookId}`
  );
}

/**
 * Publish Tournament Created event
 */
export async function publishTournamentCreated(
  tournamentId: string,
  tenantId: string
): Promise<number> {
  // Fetch tournament details
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      organization: true,
    },
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  return publishEvent(
    WebhookEvent.TOURNAMENT_CREATED,
    {
      tournamentId: tournament.id,
      name: tournament.name,
      format: tournament.format,
      status: tournament.status,
      createdAt: tournament.createdAt.toISOString(),
      createdBy: tournament.createdBy,
    },
    tenantId
  );
}

/**
 * Publish Tournament Started event
 */
export async function publishTournamentStarted(
  tournamentId: string,
  tenantId: string
): Promise<number> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: true,
    },
  });

  if (!tournament || !tournament.startedAt) {
    throw new Error('Tournament not found or not started');
  }

  return publishEvent(
    WebhookEvent.TOURNAMENT_STARTED,
    {
      tournamentId: tournament.id,
      name: tournament.name,
      format: tournament.format,
      status: tournament.status,
      startedAt: tournament.startedAt.toISOString(),
      playerCount: tournament.players.length,
      totalRounds: 0, // Calculate based on format
    },
    tenantId
  );
}

/**
 * Publish Tournament Completed event
 */
export async function publishTournamentCompleted(
  tournamentId: string,
  tenantId: string
): Promise<number> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: true,
    },
  });

  if (!tournament || !tournament.completedAt) {
    throw new Error('Tournament not found or not completed');
  }

  const duration =
    tournament.startedAt && tournament.completedAt
      ? Math.floor((tournament.completedAt.getTime() - tournament.startedAt.getTime()) / 60000)
      : 0;

  return publishEvent(
    WebhookEvent.TOURNAMENT_COMPLETED,
    {
      tournamentId: tournament.id,
      name: tournament.name,
      format: tournament.format,
      status: tournament.status,
      completedAt: tournament.completedAt.toISOString(),
      playerCount: tournament.players.length,
      duration,
    },
    tenantId
  );
}

/**
 * Publish Match Started event
 */
export async function publishMatchStarted(matchId: string, tenantId: string): Promise<number> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      playerA: true,
      playerB: true,
      table: true,
    },
  });

  if (!match || !match.startedAt) {
    throw new Error('Match not found or not started');
  }

  return publishEvent(
    WebhookEvent.MATCH_STARTED,
    {
      matchId: match.id,
      tournamentId: match.tournamentId,
      tournamentName: match.tournament.name,
      round: match.round,
      bracket: match.bracket || undefined,
      playerA: {
        id: match.playerA?.id || '',
        name: match.playerA?.name || 'TBD',
        seed: match.playerA?.seed || undefined,
      },
      playerB: {
        id: match.playerB?.id || '',
        name: match.playerB?.name || 'TBD',
        seed: match.playerB?.seed || undefined,
      },
      tableNumber: match.table?.label ? parseInt(match.table.label) : undefined,
      startedAt: match.startedAt.toISOString(),
    },
    tenantId
  );
}

/**
 * Publish Match Completed event
 */
export async function publishMatchCompleted(matchId: string, tenantId: string): Promise<number> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      playerA: true,
      playerB: true,
    },
  });

  if (!match || !match.completedAt || !match.winnerId) {
    throw new Error('Match not found, not completed, or no winner');
  }

  const score = match.score as any;
  const duration =
    match.startedAt && match.completedAt
      ? Math.floor((match.completedAt.getTime() - match.startedAt.getTime()) / 60000)
      : undefined;

  const winner = match.winnerId === match.playerAId ? match.playerA : match.playerB;

  return publishEvent(
    WebhookEvent.MATCH_COMPLETED,
    {
      matchId: match.id,
      tournamentId: match.tournamentId,
      tournamentName: match.tournament.name,
      round: match.round,
      bracket: match.bracket || undefined,
      playerA: {
        id: match.playerA?.id || '',
        name: match.playerA?.name || 'TBD',
        seed: match.playerA?.seed || undefined,
      },
      playerB: {
        id: match.playerB?.id || '',
        name: match.playerB?.name || 'TBD',
        seed: match.playerB?.seed || undefined,
      },
      winner: {
        id: winner?.id || '',
        name: winner?.name || '',
      },
      score: {
        playerA: score?.playerA || 0,
        playerB: score?.playerB || 0,
      },
      duration,
      completedAt: match.completedAt.toISOString(),
    },
    tenantId
  );
}

/**
 * Publish Player Registered event
 */
export async function publishPlayerRegistered(playerId: string, tenantId: string): Promise<number> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      tournament: true,
    },
  });

  if (!player) {
    throw new Error('Player not found');
  }

  return publishEvent(
    WebhookEvent.PLAYER_REGISTERED,
    {
      playerId: player.id,
      playerName: player.name,
      playerEmail: player.email || undefined,
      tournamentId: player.tournamentId,
      tournamentName: player.tournament.name,
      registeredAt: player.createdAt.toISOString(),
      seed: player.seed || undefined,
      rating: player.rating ? (player.rating as any) : undefined,
    },
    tenantId
  );
}

/**
 * Publish Player Checked In event
 */
export async function publishPlayerCheckedIn(playerId: string, tenantId: string): Promise<number> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      tournament: {
        include: {
          players: true,
        },
      },
    },
  });

  if (!player || !player.checkedInAt) {
    throw new Error('Player not found or not checked in');
  }

  const checkedInCount = player.tournament.players.filter((p) => p.status === 'checked_in').length;

  return publishEvent(
    WebhookEvent.PLAYER_CHECKED_IN,
    {
      playerId: player.id,
      playerName: player.name,
      tournamentId: player.tournamentId,
      tournamentName: player.tournament.name,
      checkedInAt: player.checkedInAt.toISOString(),
      totalCheckedIn: checkedInCount,
      totalRegistered: player.tournament.players.length,
    },
    tenantId
  );
}

/**
 * Publish Player Eliminated event
 */
export async function publishPlayerEliminated(
  playerId: string,
  placement: number,
  tenantId: string
): Promise<number> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      tournament: true,
      matchesAsPlayerA: { where: { state: 'completed' } },
      matchesAsPlayerB: { where: { state: 'completed' } },
    },
  });

  if (!player) {
    throw new Error('Player not found');
  }

  const totalMatches = player.matchesAsPlayerA.length + player.matchesAsPlayerB.length;
  const wins =
    player.matchesAsPlayerA.filter((m) => m.winnerId === player.id).length +
    player.matchesAsPlayerB.filter((m) => m.winnerId === player.id).length;

  return publishEvent(
    WebhookEvent.PLAYER_ELIMINATED,
    {
      playerId: player.id,
      playerName: player.name,
      tournamentId: player.tournamentId,
      tournamentName: player.tournament.name,
      eliminatedAt: new Date().toISOString(),
      placement,
      totalMatches,
      wins,
      losses: totalMatches - wins,
    },
    tenantId
  );
}
