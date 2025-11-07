# Webhook System Quick Start Guide

Get your webhook system up and running in 5 steps.

---

## Step 1: Database Migration (2 minutes)

```bash
# Run migration to add webhook tables
npx prisma migrate dev --name add_webhooks

# Generate Prisma client
npx prisma generate
```

**Verify:**
```bash
# Check tables were created
npx prisma studio
# Look for: api_keys, webhooks, webhook_deliveries
```

---

## Step 2: Configure Environment (1 minute)

Add to `.env`:

```env
# Redis Configuration (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

**If you don't have Redis:**
```bash
# Install Redis locally
# macOS:
brew install redis
brew services start redis

# Windows (with WSL):
sudo apt-get install redis-server
sudo service redis-server start

# Or use Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

---

## Step 3: Start Webhook Worker (1 minute)

**Option A: Separate Process (Recommended for Production)**

```bash
# Create worker startup script
node -r tsx apps/web/lib/api/workers/webhook-delivery.worker.ts
```

Or add to `package.json`:
```json
{
  "scripts": {
    "worker:webhooks": "tsx apps/web/lib/api/workers/webhook-delivery.worker.ts"
  }
}
```

Then run:
```bash
npm run worker:webhooks
```

**Option B: Integrated with Next.js Server (Development)**

In your `apps/web/server.ts` or similar:

```typescript
import { startWebhookWorker } from '@/lib/api/workers/webhook-delivery.worker';

// Start worker when server starts
if (process.env.NODE_ENV === 'production') {
  startWebhookWorker();
  console.log('Webhook worker started');
}
```

---

## Step 4: Test the System (2 minutes)

### Create Test Webhook

```typescript
// apps/web/scripts/test-webhook.ts
import { createWebhook } from '@/lib/api/services/webhook.service';
import { WebhookEvent } from '@/lib/api/types/webhook-events.types';

async function testWebhook() {
  // Create webhook pointing to webhook.site for testing
  const webhook = await createWebhook({
    tenantId: 'your_tenant_id',
    apiKeyId: 'your_api_key_id',
    url: 'https://webhook.site/your-unique-url', // Get from webhook.site
    events: [WebhookEvent.TOURNAMENT_STARTED],
  });

  console.log('Webhook created:', webhook.id);
  console.log('Secret:', webhook.secret); // Save this!
}

testWebhook();
```

### Test Delivery

```typescript
// Publish a test event
import { publishEvent } from '@/lib/api/services/event-publisher.service';

await publishEvent(
  WebhookEvent.TOURNAMENT_STARTED,
  {
    tournamentId: 'test_123',
    name: 'Test Tournament',
    format: 'single_elimination',
    status: 'active',
    startedAt: new Date().toISOString(),
    playerCount: 8,
    totalRounds: 3,
  },
  'your_tenant_id'
);

console.log('Event published! Check webhook.site for delivery.');
```

**Expected Result:**
- Event appears in Bull queue
- Worker processes it within seconds
- Request appears on webhook.site
- Includes signature in headers

---

## Step 5: Integrate into Your App (5 minutes)

### Add Event Publishers

**When tournament starts:**

```typescript
// apps/web/app/api/tournaments/[id]/start/route.ts
import { publishTournamentStarted } from '@/lib/api/services/event-publisher.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ... your existing tournament start logic ...

  // Add this after tournament is started:
  try {
    await publishTournamentStarted(params.id, tenantId);
  } catch (error) {
    console.error('Failed to publish webhook event:', error);
    // Don't fail the request
  }

  return NextResponse.json({ success: true });
}
```

**When match completes:**

```typescript
// apps/web/app/api/matches/[id]/complete/route.ts
import { publishMatchCompleted } from '@/lib/api/services/event-publisher.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ... your existing match completion logic ...

  // Add this after match is completed:
  try {
    await publishMatchCompleted(params.id, tenantId);
  } catch (error) {
    console.error('Failed to publish webhook event:', error);
  }

  return NextResponse.json({ success: true });
}
```

**See `lib/api/integration-examples.md` for all 8 event types.**

---

## Monitoring

### Check Queue Status

```typescript
import { getQueueStats } from '@/lib/api/queues/webhook.queue';

const stats = await getQueueStats();
console.log('Queue stats:', stats);
// { waiting: 5, active: 2, completed: 1234, failed: 12, delayed: 0 }
```

### View Delivery Logs

```typescript
import { getDeliveryLogs } from '@/lib/api/services/webhook.service';

const logs = await getDeliveryLogs(webhookId, tenantId, 20);
logs.forEach(log => {
  console.log(`${log.eventType}: ${log.statusCode || 'pending'}`);
});
```

---

## Troubleshooting

### "Queue connection failed"

**Problem:** Can't connect to Redis

**Solution:**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Check .env has correct Redis config
echo $REDIS_HOST
echo $REDIS_PORT
```

### "No webhooks are being delivered"

**Problem:** Worker not running

**Solution:**
```bash
# Check worker is running
ps aux | grep webhook-delivery

# Check worker logs
# Look for: "[Webhook Worker] Worker started and ready to process jobs"

# Restart worker
npm run worker:webhooks
```

### "Webhook deliveries are failing"

**Problem:** Webhook URL is unreachable

**Solution:**
```typescript
// Use test endpoint to debug
POST /api/v1/webhooks/{id}/test

// Check response:
{
  "success": false,
  "error": "Network error: ECONNREFUSED"
}

// Fix webhook URL and update:
await updateWebhook(webhookId, tenantId, {
  url: 'https://correct-url.com/webhook'
});
```

---

## Next Steps

1. Create webhook management UI
2. Add API authentication middleware
3. Create REST endpoints for webhook CRUD
4. Set up monitoring/alerting
5. Add rate limiting
6. Implement webhook signature verification examples for clients

---

## Useful Commands

```bash
# View Bull queue in Redis
redis-cli
> KEYS bull:webhook-delivery:*
> LLEN bull:webhook-delivery:wait

# Clear failed jobs
redis-cli DEL bull:webhook-delivery:failed

# Monitor queue in real-time
redis-cli MONITOR | grep webhook-delivery
```

---

## Resources

- **Full Documentation:** `WEBHOOK-SYSTEM-IMPLEMENTATION-SUMMARY.md`
- **Integration Examples:** `lib/api/integration-examples.md`
- **Webhook Types:** `lib/api/types/webhook-events.types.ts`
- **Technical Spec:** `technical/specs/public-api-webhooks-technical-spec.md`

---

**Questions?** Check the full implementation summary or integration examples.

**Ready to go!** Your webhook system is now operational.
