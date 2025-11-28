# Webhook Integration Examples

This document shows how to integrate webhook event publishing at key points in your application.

## Tournament Events

### Tournament Created

```typescript
// In tournament creation API route or service
import { publishTournamentCreated } from '@/lib/api/services/event-publisher.service';

export async function createTournament(data: TournamentData) {
  // Create tournament in database
  const tournament = await prisma.tournament.create({
    data: {
      ...data,
      orgId: tenantId,
      status: 'draft',
    },
  });

  // Publish webhook event
  try {
    await publishTournamentCreated(tournament.id, tenantId);
  } catch (error) {
    console.error('Failed to publish tournament.created event:', error);
    // Don't fail the request if webhook publishing fails
  }

  return tournament;
}
```

### Tournament Started

```typescript
// In tournament start API route or service
import { publishTournamentStarted } from '@/lib/api/services/event-publisher.service';

export async function startTournament(tournamentId: string, tenantId: string) {
  // Update tournament status
  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'active',
      startedAt: new Date(),
    },
  });

  // Publish webhook event
  try {
    await publishTournamentStarted(tournamentId, tenantId);
  } catch (error) {
    console.error('Failed to publish tournament.started event:', error);
  }

  return tournament;
}
```

### Tournament Completed

```typescript
// In tournament completion API route or service
import { publishTournamentCompleted } from '@/lib/api/services/event-publisher.service';

export async function completeTournament(tournamentId: string, tenantId: string) {
  // Update tournament status
  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // Publish webhook event
  try {
    await publishTournamentCompleted(tournamentId, tenantId);
  } catch (error) {
    console.error('Failed to publish tournament.completed event:', error);
  }

  return tournament;
}
```

## Match Events

### Match Started

```typescript
// In match start API route or service
import { publishMatchStarted } from '@/lib/api/services/event-publisher.service';

export async function startMatch(matchId: string, tenantId: string) {
  // Update match status
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      state: 'active',
      startedAt: new Date(),
    },
  });

  // Publish webhook event
  try {
    await publishMatchStarted(matchId, tenantId);
  } catch (error) {
    console.error('Failed to publish match.started event:', error);
  }

  return match;
}
```

### Match Completed

```typescript
// In match completion/score update API route or service
import { publishMatchCompleted } from '@/lib/api/services/event-publisher.service';

export async function completeMatch(
  matchId: string,
  winnerId: string,
  score: { playerA: number; playerB: number },
  tenantId: string
) {
  // Update match with winner and score
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      state: 'completed',
      winnerId: winnerId,
      score: score,
      completedAt: new Date(),
    },
  });

  // Publish webhook event
  try {
    await publishMatchCompleted(matchId, tenantId);
  } catch (error) {
    console.error('Failed to publish match.completed event:', error);
  }

  return match;
}
```

## Player Events

### Player Registered

```typescript
// In player registration API route or service
import { publishPlayerRegistered } from '@/lib/api/services/event-publisher.service';

export async function registerPlayer(tournamentId: string, playerData: any, tenantId: string) {
  // Create player registration
  const player = await prisma.player.create({
    data: {
      tournamentId,
      name: playerData.name,
      email: playerData.email,
      phone: playerData.phone,
      status: 'registered',
    },
  });

  // Publish webhook event
  try {
    await publishPlayerRegistered(player.id, tenantId);
  } catch (error) {
    console.error('Failed to publish player.registered event:', error);
  }

  return player;
}
```

### Player Checked In

```typescript
// In player check-in API route or service
import { publishPlayerCheckedIn } from '@/lib/api/services/event-publisher.service';

export async function checkInPlayer(playerId: string, tenantId: string) {
  // Update player status
  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      status: 'checked_in',
      checkedInAt: new Date(),
    },
  });

  // Publish webhook event
  try {
    await publishPlayerCheckedIn(playerId, tenantId);
  } catch (error) {
    console.error('Failed to publish player.checked_in event:', error);
  }

  return player;
}
```

### Player Eliminated

```typescript
// In tournament bracket/elimination logic
import { publishPlayerEliminated } from '@/lib/api/services/event-publisher.service';

export async function eliminatePlayer(playerId: string, placement: number, tenantId: string) {
  // Update player status
  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      status: 'eliminated',
    },
  });

  // Publish webhook event
  try {
    await publishPlayerEliminated(playerId, placement, tenantId);
  } catch (error) {
    console.error('Failed to publish player.eliminated event:', error);
  }

  return player;
}
```

## Custom Event Publishing

For custom events or more control:

```typescript
import { publishEvent } from '@/lib/api/services/event-publisher.service';
import { WebhookEvent } from '@/lib/api/types/webhook-events.types';

// Publish a custom tournament event
await publishEvent(
  WebhookEvent.TOURNAMENT_STARTED,
  {
    tournamentId: 'tour_123',
    name: 'Weekly 8-Ball',
    format: 'single_elimination',
    status: 'active',
    startedAt: new Date().toISOString(),
    playerCount: 16,
    totalRounds: 4,
  },
  tenantId
);
```

## Error Handling Best Practices

1. **Always wrap webhook publishing in try-catch**
   - Don't let webhook failures break your main API flow
   - Log errors for monitoring

2. **Publish webhooks after database commits**
   - Ensure data is persisted before notifying
   - Use transactions if needed

3. **Consider async/background publishing**
   - Don't block API responses waiting for webhook delivery
   - Bull queue handles this automatically

```typescript
// Good: Non-blocking webhook publish
export async function createTournament(data: TournamentData) {
  const tournament = await prisma.tournament.create({ data });

  // Fire and forget (queued automatically)
  publishTournamentCreated(tournament.id, tenantId).catch((err) =>
    console.error('Webhook publish failed:', err)
  );

  return tournament; // Don't wait for webhooks
}
```

## Testing Integration

Use the test endpoint to verify webhooks work:

```bash
POST /api/v1/webhooks/{webhookId}/test
Authorization: Bearer sk_live_...

# Response
{
  "success": true,
  "statusCode": 200,
  "duration": "234ms",
  "responseBody": "..."
}
```

## Monitoring

Monitor webhook delivery:

```typescript
import { getQueueStats } from '@/lib/api/queues/webhook.queue';

const stats = await getQueueStats();
console.log('Webhook queue:', stats);
// { waiting: 5, active: 2, completed: 1234, failed: 12, delayed: 0 }
```
