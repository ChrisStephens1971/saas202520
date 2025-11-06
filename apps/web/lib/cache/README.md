# Redis Cache Service

Comprehensive Redis caching layer for Sprint 9 Phase 3 - Scale & Performance

## Overview

This module provides a production-ready Redis caching layer with:

- **Multi-tenant support** - Tenant-prefixed cache keys for complete isolation
- **Connection pooling** - Efficient Redis connection management
- **Error handling** - Graceful fallback to database when Redis unavailable
- **Type-safe operations** - Full TypeScript support
- **Performance tracking** - Integration with performance middleware
- **Smart invalidation** - Event-based and pattern-based cache invalidation

## Architecture

```
cache/
├── redis.ts           # Core cache service (connection, CRUD operations)
├── strategies.ts      # Caching strategies for different data types
├── invalidation.ts    # Cache invalidation logic (events, patterns)
├── index.ts           # Main exports and utility functions
└── README.md          # Documentation
```

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

### 2. Install Dependencies

Redis client is already installed (`ioredis` in package.json).

### 3. Start Redis

**Local Development:**
```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Or use Docker Compose (if configured)
docker-compose up redis
```

**Production:**
- AWS ElastiCache
- Redis Cloud
- Upstash Redis
- Azure Cache for Redis

## Usage

### Basic Operations

```typescript
import { cacheService } from '@/lib/cache';

// Get from cache
const data = await cacheService.get<Tournament>(tenantId, 'tournament:123');

// Set in cache (with 5-minute TTL)
await cacheService.set(tenantId, 'tournament:123', tournamentData, 300);

// Delete from cache
await cacheService.delete(tenantId, 'tournament:123');

// Invalidate pattern
await cacheService.invalidate(tenantId, 'tournament:*');

// Clear all cache for tenant
await cacheService.clear(tenantId);
```

### Using Cache Strategies

```typescript
import { TournamentCache, UserCache, CacheTTL } from '@/lib/cache';

// Cache tournament
await TournamentCache.setTournament(tenantId, tournamentId, data);
const tournament = await TournamentCache.getTournament(tenantId, tournamentId);

// Cache leaderboard
await TournamentCache.setLeaderboard(tenantId, tournamentId, leaderboard);

// Cache user session
await UserCache.setSession(tenantId, userId, sessionData);

// Invalidate tournament
await TournamentCache.invalidateTournament(tenantId, tournamentId);
```

### Cache-Aside Pattern (Lazy Loading)

```typescript
import { cacheAside, CacheTTL } from '@/lib/cache';

const tournament = await cacheAside(
  tenantId,
  `tournament:${id}`,
  async () => {
    // Fetch from database if cache miss
    return await prisma.tournament.findUnique({ where: { id } });
  },
  CacheTTL.TOURNAMENT,
  requestId // Optional for performance tracking
);
```

### Write-Through Pattern

```typescript
import { writeThrough, CacheTTL } from '@/lib/cache';

await writeThrough(
  tenantId,
  `tournament:${id}`,
  updatedData,
  async () => {
    // Update database
    await prisma.tournament.update({
      where: { id },
      data: updatedData,
    });
  },
  CacheTTL.TOURNAMENT
);
```

### Event-Based Invalidation

```typescript
import { emitCacheEvent, CacheEvent } from '@/lib/cache';

// When tournament is updated
await emitCacheEvent(
  CacheEvent.TOURNAMENT_UPDATED,
  tenantId,
  tournamentId
);

// When match is completed
await emitCacheEvent(
  CacheEvent.MATCH_COMPLETED,
  tenantId,
  matchId,
  [tournamentId] // Related IDs
);

// When user logs out
await emitCacheEvent(
  CacheEvent.USER_LOGGED_OUT,
  tenantId,
  userId
);
```

### Bulk Operations

```typescript
import { BulkInvalidation, batchGet, batchSet } from '@/lib/cache';

// Batch get
const results = await batchGet<Tournament>(
  tenantId,
  ['tournament:1', 'tournament:2', 'tournament:3']
);

// Batch set
const entries = new Map([
  ['tournament:1', data1],
  ['tournament:2', data2],
]);
await batchSet(tenantId, entries, CacheTTL.TOURNAMENT);

// Bulk invalidate
await BulkInvalidation.invalidateTournaments(tenantId, [id1, id2, id3]);
await BulkInvalidation.invalidateAllForTenant(tenantId);
```

## Cache Key Format

All cache keys are prefixed with tenant ID for multi-tenant isolation:

```
{tenant_id}:tournament:{id}
{tenant_id}:tournament:{id}:matches
{tenant_id}:tournament:{id}:leaderboard
{tenant_id}:tournament:list:{hash}
{tenant_id}:user:{id}:session
{tenant_id}:user:{id}:profile
{tenant_id}:user:{id}:permissions
{tenant_id}:analytics:system
{tenant_id}:analytics:tournament:{id}
{tenant_id}:api:{endpoint}:{hash}
{tenant_id}:static:config:{key}
{tenant_id}:static:org:settings
```

## Cache TTL Guidelines

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Tournament data | 5 minutes | Moderate changes |
| Tournament list | 3 minutes | Frequently updated |
| Tournament matches | 1 minute | Real-time updates |
| Leaderboards | 1 minute | Real-time scores |
| User session | 24 hours | Long-lived |
| User profile | 1 hour | Infrequent changes |
| Analytics | 15 minutes | Computed data |
| API responses | 5 minutes | Default caching |
| Static config | 1 hour | Rarely changes |

## Invalidation Strategies

### 1. Event-Based Invalidation

Automatically invalidate cache when data changes:

```typescript
// In your update handler
async function updateTournament(tenantId: string, id: string, data: any) {
  // Update database
  await prisma.tournament.update({ where: { id }, data });

  // Invalidate cache
  await emitCacheEvent(CacheEvent.TOURNAMENT_UPDATED, tenantId, id);
}
```

### 2. Pattern-Based Invalidation

Invalidate multiple related keys:

```typescript
// Invalidate all tournament-related cache
await cacheService.invalidate(tenantId, 'tournament:*');

// Invalidate specific tournament
await cacheService.invalidate(tenantId, `tournament:${id}*`);
```

### 3. Time-Based Invalidation

Cache entries automatically expire based on TTL.

## Performance Tracking

The cache service integrates with performance monitoring:

```typescript
import { startRequestTracking, endRequestTracking } from '@/lib/monitoring/performance-middleware';

// In API route
export async function GET(req: Request) {
  const requestId = startRequestTracking(req);

  // Cache operations are automatically tracked
  const data = await TournamentCache.getTournament(tenantId, id, requestId);

  endRequestTracking(requestId, 200);
  return Response.json(data);
}
```

Cache hits/misses are logged and tracked in Sentry.

## Health Monitoring

```typescript
import { getCacheHealth } from '@/lib/cache';

const health = await getCacheHealth();
console.log(health);
// {
//   connected: true,
//   responseTime: 2.5,
//   memoryUsage: "1.2M",
//   keyCount: 1234
// }
```

## Best Practices

### 1. Always Use Tenant ID

```typescript
// ✅ Good
await cacheService.get(tenantId, 'tournament:123');

// ❌ Bad (no tenant isolation)
await cacheService.get('global', 'tournament:123');
```

### 2. Choose Appropriate TTL

```typescript
// ✅ Good - short TTL for real-time data
await cacheService.set(tenantId, key, data, CacheTTL.LEADERBOARD);

// ❌ Bad - long TTL for frequently changing data
await cacheService.set(tenantId, key, data, CacheTTL.USER_SESSION);
```

### 3. Invalidate on Updates

```typescript
// ✅ Good - invalidate after update
await updateTournament(id, data);
await emitCacheEvent(CacheEvent.TOURNAMENT_UPDATED, tenantId, id);

// ❌ Bad - stale cache
await updateTournament(id, data);
// No cache invalidation!
```

### 4. Handle Cache Failures Gracefully

```typescript
// ✅ Good - fallback to database
const cached = await cacheService.get(tenantId, key);
if (cached) {
  return cached;
}
// Fetch from database if cache miss
const data = await fetchFromDatabase();

// ❌ Bad - fail if cache unavailable
const data = await cacheService.get(tenantId, key);
return data; // Could be null!
```

### 5. Use Batch Operations

```typescript
// ✅ Good - single call
const results = await batchGet(tenantId, keys);

// ❌ Bad - multiple calls
const results = [];
for (const key of keys) {
  results.push(await cacheService.get(tenantId, key));
}
```

## Error Handling

The cache service handles errors gracefully:

- **Connection failures**: Automatic reconnection with exponential backoff
- **Operation failures**: Return null/false instead of throwing errors
- **Redis unavailable**: All operations fail silently, fallback to database

```typescript
// Cache operations never throw errors
const data = await cacheService.get(tenantId, key);
if (data === null) {
  // Cache miss or error - fetch from database
  return await fetchFromDatabase();
}
```

## Testing

```typescript
import { cacheService } from '@/lib/cache';

describe('Tournament Cache', () => {
  it('should cache tournament data', async () => {
    const tenantId = 'test-tenant';
    const data = { id: '1', name: 'Test' };

    await cacheService.set(tenantId, 'tournament:1', data, 60);
    const cached = await cacheService.get(tenantId, 'tournament:1');

    expect(cached).toEqual(data);
  });

  it('should invalidate tournament cache', async () => {
    const tenantId = 'test-tenant';

    await cacheService.set(tenantId, 'tournament:1', data, 60);
    await cacheService.delete(tenantId, 'tournament:1');

    const cached = await cacheService.get(tenantId, 'tournament:1');
    expect(cached).toBeNull();
  });
});
```

## Migration from Database-Only

1. **Start with read-heavy endpoints** (tournaments list, leaderboards)
2. **Use cache-aside pattern** (lazy loading)
3. **Add cache warming** for commonly accessed data
4. **Implement invalidation** as you add caching
5. **Monitor cache hit rates** and adjust TTLs

Example migration:

```typescript
// Before (database only)
export async function getTournament(id: string) {
  return await prisma.tournament.findUnique({ where: { id } });
}

// After (with caching)
import { cacheAside, CacheTTL } from '@/lib/cache';

export async function getTournament(tenantId: string, id: string) {
  return await cacheAside(
    tenantId,
    `tournament:${id}`,
    async () => await prisma.tournament.findUnique({ where: { id } }),
    CacheTTL.TOURNAMENT
  );
}
```

## Troubleshooting

### Cache not working?

1. Check Redis is running: `redis-cli ping`
2. Check environment variables are set
3. Check logs for connection errors
4. Verify tenant ID is correct

### Cache hit rate too low?

1. Increase TTL for stable data
2. Implement cache warming
3. Review invalidation logic (over-invalidating?)
4. Check query patterns (unique queries?)

### Memory usage too high?

1. Reduce TTL values
2. Implement cache size limits
3. Use pattern-based cleanup
4. Review what's being cached (large objects?)

## Production Considerations

1. **Use managed Redis** (AWS ElastiCache, Redis Cloud)
2. **Enable persistence** (RDB + AOF)
3. **Set maxmemory policy** (`allkeys-lru`)
4. **Monitor memory usage**
5. **Set up replication** for high availability
6. **Use Redis Cluster** for horizontal scaling
7. **Implement cache warming** on application start

## Related Documentation

- [Performance Middleware](../monitoring/README.md)
- [Multi-Tenant Architecture](../../../../../technical/multi-tenant-architecture.md)
- [Sprint 9 Phase 3 Plan](../../../../../sprints/current/sprint-09-phase-3-scale-performance.md)
