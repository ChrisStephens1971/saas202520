# Sync Service (Offline Features)

**Status:** 🚧 **Deferred to V2** - Designed but not enabled for initial release

---

## Overview

This is the WebSocket sync service for offline-first, real-time CRDT synchronization using Yjs. It enables:

- **Offline Support:** Tournament Directors can work without internet connection
- **Real-Time Collaboration:** Multiple users can update scores simultaneously
- **Conflict Resolution:** Automatic CRDT-based conflict resolution
- **Live Sync:** Changes sync instantly when connection is restored

---

## Current Status

**V1 (Initial Release): DISABLED**

The offline/sync features are **designed and scaffolded** but **not enabled** for the initial release. The tournament platform ships as an **online-only** application.

**Why deferred?**

- Faster time to market for V1
- Focus on core TD workflow without additional complexity
- Allows for proper security testing and optimization before enabling
- Reduces infrastructure requirements for initial deployment

**When will it be enabled?**

- Planned for V2 or later release
- Will be enabled via feature flag: `OFFLINE_SYNC_ENABLED=true`
- Full documentation and testing will be completed before enabling

---

## Architecture (When Enabled)

### Technology Stack

- **Fastify:** High-performance Node.js web framework
- **WebSocket:** Real-time bidirectional communication
- **Yjs:** CRDT framework for conflict-free synchronization
- **Redis:** Connection state and room management
- **JWT:** Secure authentication for WebSocket connections

### How It Works

1. **Client Connects:** Web app connects to sync-service via WebSocket
2. **Authentication:** JWT token validates user and organization
3. **Room Join:** Client joins tournament-specific room
4. **CRDT Sync:** Changes are synchronized using Yjs CRDT protocol
5. **Offline Queue:** Changes are queued when offline, synced when reconnected
6. **Conflict Resolution:** Yjs automatically merges concurrent changes

### Security

- **JWT Authentication:** All WebSocket connections require valid JWT
- **Room Isolation:** Multi-tenant isolation via room tokens
- **Rate Limiting:** Connection and message rate limits enforced
- **Tenant Validation:** Server validates organization membership

---

## Files in This Directory

```
apps/sync-service/
├── src/
│   ├── index.ts              # Original (insecure) version
│   ├── index-secure.ts       # JWT-secured version
│   ├── index-v2-secure.ts    # Alternative secure version
│   ├── auth.ts               # JWT authentication logic
│   ├── rate-limiter.ts       # Rate limiting
│   ├── y-websocket-server.ts        # Basic Yjs WebSocket server
│   └── y-websocket-server-secure.ts # Secure Yjs WebSocket server
├── test-client.html          # Test client (basic)
├── test-client-offline.html  # Test client (offline features)
├── TEST-SYNC.md             # Testing documentation
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

---

## Current Build Status

**Build:** ⏸️ Skipped (deferred to V2)
**Lint:** ⏸️ Skipped (deferred to V2)
**Tests:** ✅ Pass (no tests yet)

The build and lint scripts are intentionally disabled with informational messages. This ensures:

- Main project build (`pnpm build`) succeeds without sync-service
- CI/CD pipelines don't fail due to sync-service type errors
- Clear communication that offline features are deferred

---

## For Future Development

When ready to enable offline features:

### 1. Fix Type Errors

```bash
cd apps/sync-service
pnpm install
npx tsc --noEmit
# Fix all type errors
```

### 2. Enable Build Scripts

Update `package.json`:

```json
{
  "scripts": {
    "build": "tsc -b",
    "lint": "eslint src/**/*.ts"
  }
}
```

### 3. Choose Secure Entrypoint

Use `index-secure.ts` or `index-v2-secure.ts` as the main entrypoint:

```json
{
  "scripts": {
    "dev": "tsx watch src/index-secure.ts",
    "start": "node dist/index-secure.js"
  }
}
```

### 4. Environment Variables

Add to `.env.local`:

```bash
OFFLINE_SYNC_ENABLED="true"
SYNC_SERVICE_URL="http://localhost:4000"
SYNC_SERVICE_PORT="4000"
SYNC_SERVICE_JWT_SECRET="your-secret-here"
```

### 5. Update Web App

Enable sync connections in `apps/web`:

```typescript
// Example: hooks/useTournamentSync.ts
const syncEnabled = process.env.NEXT_PUBLIC_OFFLINE_SYNC_ENABLED === 'true';

if (syncEnabled) {
  // Initialize Yjs provider
  // Connect to sync-service
}
```

### 6. Infrastructure

Deploy sync-service:

- WebSocket server (Node.js)
- Redis for state management
- Load balancer for multiple instances
- Health checks and monitoring

### 7. Testing

- Test offline scenarios
- Test conflict resolution
- Load test with multiple concurrent users
- Security audit of WebSocket connections

---

## API Endpoints (When Enabled)

### WebSocket

**URL:** `ws://localhost:4000`

**Authentication:**

```typescript
// Client sends JWT in first message
socket.send(
  JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token',
  })
);
```

**Room Join:**

```typescript
socket.send(
  JSON.stringify({
    type: 'join',
    room: 'tournament-123',
  })
);
```

### HTTP (Health Check)

**GET** `/health`

```json
{
  "status": "ok",
  "uptime": 12345,
  "connections": 42
}
```

---

## Security Considerations (Future)

When enabling, ensure:

1. **JWT Validation:** All tokens verified with proper secret
2. **Room Authorization:** Users can only join rooms for their organization
3. **Rate Limiting:** Prevent abuse with connection and message limits
4. **HTTPS/WSS:** Use secure connections in production
5. **CORS:** Properly configured allowed origins
6. **Input Validation:** Sanitize all client messages
7. **Monitoring:** Log suspicious activity

---

## Dependencies

All dependencies are installed but not actively used in V1:

- `fastify` - Web framework
- `@fastify/websocket` - WebSocket support
- `@fastify/cors` - CORS handling
- `yjs` - CRDT framework
- `y-protocols` - Yjs synchronization protocols
- `y-websocket` - Yjs WebSocket provider
- `lib0` - Utility library for Yjs
- `jsonwebtoken` - JWT authentication
- `redis` - State management
- `rate-limiter-flexible` - Rate limiting
- `ws` - WebSocket library

---

## Testing Offline Features (Future)

Use the test clients:

```bash
# Start sync-service
cd apps/sync-service
pnpm dev

# Open test-client.html in browser
open test-client.html

# Test offline mode
open test-client-offline.html
```

See `TEST-SYNC.md` for detailed testing instructions.

---

## Support

For questions about offline/sync features:

- See main project documentation: `docs/`
- See architecture docs: `docs/ARCHITECTURE.md` (when available)
- Contact development team

---

**Last Updated:** 2025-11-15
**Status:** Deferred to V2
**Next Steps:** Fix type errors, security audit, load testing before enabling
