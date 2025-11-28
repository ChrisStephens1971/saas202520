# JWT Token Format - Sync Service Authentication

## Overview

The sync service uses two types of JWT tokens for authentication and authorization:

1. **Session Token (User JWT)** - Issued by NextAuth.js, proves user identity
2. **Room Access Token** - Issued by `/api/sync/room-token`, grants access to specific tournament

Both tokens MUST be provided for WebSocket connections.

## 1. Session Token (User JWT)

### Issued By

NextAuth.js authentication service (automatically handled by `/api/auth` endpoints)

### Location

- HTTP Header: `Authorization: Bearer <token>`
- Query Parameter: `?token=<token>` (for WebSocket connections)

### Claims Structure

```typescript
interface SessionToken {
  // Standard JWT claims
  sub: string; // Subject (user ID)
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)

  // Custom claims (from NextAuth)
  userId: string; // User ID (same as sub)
  email: string; // User email
  name?: string; // User display name
  orgId: string; // Organization ID (CRITICAL for tenant isolation)
  orgSlug: string; // Organization slug (human-readable)
  role: string; // User role: 'owner' | 'admin' | 'member'
}
```

### Example Token (Decoded)

```json
{
  "sub": "user_clk7x8y9z0000",
  "iat": 1699000000,
  "exp": 1699086400,
  "userId": "user_clk7x8y9z0000",
  "email": "mike@phoenixpool.com",
  "name": "Mike Johnson",
  "orgId": "org_clk7x8y9z0001",
  "orgSlug": "phoenix-pool",
  "role": "owner"
}
```

### Validation Rules

1. **Signature**: Must be signed with `AUTH_SECRET` environment variable
2. **Expiration**: Token must not be expired (`exp > Date.now() / 1000`)
3. **Required Claims**: Must contain `userId`, `orgId`, `orgSlug`, `role`
4. **Issuer**: Issued by NextAuth.js (implicit via shared secret)

### How to Obtain

**Client-side (Browser):**

```typescript
import { getSession } from 'next-auth/react';

const session = await getSession();
const sessionToken = session?.accessToken; // or session?.id_token
```

**Server-side (API Route):**

```typescript
import { auth } from '@/auth';

const session = await auth();
// Session object contains user info, but token is in cookie
```

## 2. Room Access Token

### Issued By

Web app API endpoint: `POST /api/sync/room-token`

### Purpose

Grants time-limited access to a specific tournament's Y.js document room.

### Claims Structure

```typescript
interface RoomAccessToken {
  tournamentId: string; // Tournament UUID
  orgId: string; // Organization ID (must match session token)
  userId: string; // User ID (must match session token)
  permissions: Permission[]; // Array of permissions
  exp: number; // Expiration (Unix timestamp)
}

type Permission = 'read' | 'write' | 'admin';
```

### Example Token (Decoded)

```json
{
  "tournamentId": "tournament_clk7x8y9z0002",
  "orgId": "org_clk7x8y9z0001",
  "userId": "user_clk7x8y9z0000",
  "permissions": ["read", "write"],
  "exp": 1699086400
}
```

### Validation Rules

1. **Signature**: Must be signed with `AUTH_SECRET` environment variable
2. **Expiration**: Token must not be expired (`exp > Date.now() / 1000`)
3. **Org Match**: `orgId` must match user's org from session token
4. **User Match**: `userId` must match user ID from session token
5. **Tournament Access**: Tournament must exist and belong to the organization

### Permission Levels

| Permission | Description                   | Can Read | Can Write | Can Admin |
| ---------- | ----------------------------- | -------- | --------- | --------- |
| `read`     | View-only access              | ✅       | ❌        | ❌        |
| `write`    | Read + modify document        | ✅       | ✅        | ❌        |
| `admin`    | Full access + room management | ✅       | ✅        | ✅        |

### How to Obtain

**Client-side Request:**

```typescript
// Must be authenticated (session exists)
const response = await fetch('/api/sync/room-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tournamentId: 'tournament_clk7x8y9z0002',
    permissions: ['read', 'write'], // Optional, defaults to role-based
  }),
});

const { roomToken, expiresAt } = await response.json();
```

**Response:**

```json
{
  "roomToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tournamentId": "tournament_clk7x8y9z0002",
  "permissions": ["read", "write"],
  "expiresAt": "2025-11-04T12:00:00.000Z"
}
```

### Token Lifetime

- **Default**: 24 hours
- **Maximum**: 7 days (configurable in API)
- **Renewal**: Must request new token after expiration

## WebSocket Connection Flow

### Complete Authentication Flow

```typescript
// 1. Get session (automatically managed by NextAuth)
const session = await getSession();
if (!session) {
  // Redirect to login
  router.push('/login');
  return;
}

// 2. Request room access token for specific tournament
const roomResponse = await fetch('/api/sync/room-token', {
  method: 'POST',
  body: JSON.stringify({ tournamentId: 'tournament_123' }),
});
const { roomToken } = await roomResponse.json();

// 3. Connect to WebSocket with BOTH tokens
const wsUrl = new URL(`${process.env.NEXT_PUBLIC_SYNC_SERVICE_URL}`);
wsUrl.searchParams.set('token', session.accessToken); // Session JWT
wsUrl.searchParams.set('room', roomToken); // Room access JWT

const ws = new WebSocket(wsUrl.toString());

ws.onopen = () => {
  console.log('Connected to sync service');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Likely authentication failure, check token validity
};
```

### Server-side Validation Sequence

1. **Origin Check** (during WebSocket upgrade)
   - Verify `Origin` header is in `ALLOWED_ORIGINS` whitelist
   - Reject if origin is not allowed

2. **Session Token Validation** (preValidation hook)
   - Extract token from query parameter or Authorization header
   - Verify JWT signature with `AUTH_SECRET`
   - Check expiration
   - Extract `userId`, `orgId`, `role`

3. **Room Token Validation** (preValidation hook)
   - Verify JWT signature with `AUTH_SECRET`
   - Check expiration
   - Extract `tournamentId`, `orgId`, `userId`, `permissions`

4. **Cross-Token Validation**
   - Verify `roomToken.orgId === sessionToken.orgId`
   - Verify `roomToken.userId === sessionToken.userId`
   - Normalize IDs (case-insensitive comparison)

5. **Room Access Check**
   - Verify tournament exists (optional: database lookup)
   - Verify tournament belongs to organization
   - Check room quota not exceeded (100 rooms per org)

6. **Connection Established**
   - Add connection to room with metadata
   - Begin message handling with rate limiting

## Security Best Practices

### Token Storage

**✅ DO:**

- Store session token in httpOnly cookie (handled by NextAuth)
- Store room token in memory (component state)
- Request new room token on page refresh

**❌ DON'T:**

- Store tokens in localStorage (XSS vulnerable)
- Log tokens to console (visible in browser dev tools)
- Share tokens between users or organizations

### Token Rotation

**Session Token:**

- Automatically rotated by NextAuth on activity
- Expires after inactivity (configured in NextAuth)

**Room Token:**

- Request new token when approaching expiration
- Implement automatic renewal before WebSocket disconnect
- Handle 401/403 errors by requesting new token

### Error Handling

**Common WebSocket Close Codes:**

| Code | Reason                              | Action                         |
| ---- | ----------------------------------- | ------------------------------ |
| 1008 | Authentication/Authorization Failed | Request new tokens, reconnect  |
| 1009 | Message Too Large                   | Reduce payload size            |
| 1011 | Internal Server Error               | Retry with exponential backoff |
| 4001 | Rate Limit Exceeded                 | Wait before reconnecting       |

## Testing

### Generate Test Tokens (Development)

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_SECRET!;

// Generate session token
const sessionToken = jwt.sign(
  {
    sub: 'test-user-123',
    userId: 'test-user-123',
    email: 'test@example.com',
    orgId: 'test-org-123',
    orgSlug: 'test-org',
    role: 'owner',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  },
  JWT_SECRET
);

// Generate room access token
const roomToken = jwt.sign(
  {
    tournamentId: 'test-tournament-123',
    orgId: 'test-org-123',
    userId: 'test-user-123',
    permissions: ['read', 'write', 'admin'],
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  },
  JWT_SECRET
);

console.log('Session Token:', sessionToken);
console.log('Room Token:', roomToken);
```

### Validate Tokens (CLI)

```bash
# Decode JWT (without verification)
echo "eyJhbGc..." | base64 -d | jq

# Verify JWT with secret
node -e "console.log(require('jsonwebtoken').verify('eyJhbGc...', 'your-secret'))"
```

## Troubleshooting

### "Authentication required" (401)

**Causes:**

- Missing session token
- Invalid signature
- Expired token
- Wrong `AUTH_SECRET` environment variable

**Solution:**

- Check token is being sent in request
- Verify `AUTH_SECRET` matches between services
- Request new session token (re-login)

### "Invalid room access token" (400/1008)

**Causes:**

- Missing room token
- Invalid signature
- Expired room token
- Token format invalid

**Solution:**

- Request new room token from `/api/sync/room-token`
- Check token format (3 parts separated by dots)

### "Organization mismatch" (1008)

**Causes:**

- Room token `orgId` doesn't match session token `orgId`
- User switched organizations without refreshing
- Stale room token

**Solution:**

- Request new room token after org switch
- Ensure both tokens are for same organization

### "Room quota exceeded" (1008)

**Causes:**

- Organization has >100 active rooms
- Too many concurrent tournaments

**Solution:**

- Wait for inactive rooms to be cleaned up (5 minute interval)
- Close unused tournament connections
- Contact admin to increase quota

## References

- JWT Specification: https://tools.ietf.org/html/rfc7519
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- NextAuth.js Documentation: https://next-auth.js.org/
- WebSocket Close Codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent

---

**Last Updated:** 2025-11-03
**Version:** 2.0
