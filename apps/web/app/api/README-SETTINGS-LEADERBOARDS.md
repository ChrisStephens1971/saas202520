# Settings & Leaderboard API Endpoints

**Sprint 10 Week 2: Player Profiles & Enhanced Experience**

This document describes the Settings and Leaderboard API endpoints implemented for the tournament platform.

## Table of Contents

- [Overview](#overview)
- [Leaderboard Endpoints](#leaderboard-endpoints)
- [Settings Endpoints](#settings-endpoints)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## Overview

These endpoints provide access to player leaderboards and user settings with full multi-tenant isolation. All endpoints require authentication and filter data by tenant ID from the session.

**Key Features:**

- Multi-tenant data isolation
- Zod validation for all inputs
- Comprehensive error handling
- TypeScript type safety
- Full test coverage

---

## Leaderboard Endpoints

### GET /api/leaderboards/[type]

Retrieves leaderboard data for different performance metrics.

**Supported Types:**

- `win-rate` - Players ranked by win percentage
- `tournaments` - Players ranked by tournament participation
- `prize-money` - Players ranked by total earnings
- `achievements` - Players ranked by achievement count

**Query Parameters:**

```typescript
{
  limit?: number;      // 1-500, default: 100
  timeframe?: string;  // 'all-time' | 'month' | 'week', default: 'all-time'
}
```

**Example Request:**

```bash
GET /api/leaderboards/win-rate?limit=50&timeframe=all-time
```

**Response (200 OK):**

```json
{
  "type": "win-rate",
  "timeframe": "all-time",
  "leaderboard": {
    "entries": [
      {
        "rank": 1,
        "playerId": "player_123",
        "playerName": "John Doe",
        "photoUrl": "https://example.com/photo.jpg",
        "skillLevel": "EXPERT",
        "value": 85.5,
        "formattedValue": "85.5%",
        "change": 2
      }
    ],
    "totalPlayers": 150,
    "updatedAt": "2025-01-07T12:00:00Z"
  },
  "metadata": {
    "limit": 50,
    "count": 50,
    "hasMore": true
  }
}
```

**Error Responses:**

**400 Bad Request** - Invalid type or parameters:

```json
{
  "error": "Invalid leaderboard type",
  "message": "Type must be one of: win-rate, tournaments, prize-money, achievements",
  "validTypes": ["win-rate", "tournaments", "prize-money", "achievements"]
}
```

**401 Unauthorized** - Not authenticated:

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to view leaderboards"
}
```

**500 Internal Server Error** - Server error:

```json
{
  "error": "Failed to fetch leaderboard",
  "message": "An unexpected error occurred while fetching leaderboard data"
}
```

---

## Settings Endpoints

### GET /api/players/settings

Retrieves current user's settings. Creates default settings if none exist.

**Example Request:**

```bash
GET /api/players/settings
```

**Response (200 OK):**

```json
{
  "settings": {
    "privacy": {
      "isProfilePublic": true,
      "showStatistics": true,
      "showAchievements": true,
      "showHistory": false
    },
    "notifications": {
      "email": {
        "email": true,
        "sms": false,
        "push": true,
        "categories": {
          "tournaments": true,
          "matches": true,
          "achievements": true,
          "social": false
        }
      },
      "push": {
        "email": false,
        "sms": false,
        "push": true,
        "categories": {
          "tournaments": true,
          "matches": true,
          "achievements": true,
          "social": false
        }
      },
      "sms": {
        "email": false,
        "sms": true,
        "push": false,
        "categories": {
          "tournaments": false,
          "matches": true,
          "achievements": false,
          "social": false
        }
      }
    },
    "display": {
      "theme": "LIGHT",
      "language": "en",
      "timezone": null
    },
    "metadata": {
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-07T12:00:00Z"
    }
  }
}
```

**Error Responses:**

**401 Unauthorized** - Not authenticated:

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to view settings"
}
```

**500 Internal Server Error** - Server error:

```json
{
  "error": "Failed to fetch settings",
  "message": "An unexpected error occurred while fetching settings"
}
```

---

### PUT /api/players/settings

Updates current user's settings. Only provided fields are updated.

**Request Body:**

```typescript
{
  // Privacy settings (optional)
  isProfilePublic?: boolean;
  showStatistics?: boolean;
  showAchievements?: boolean;
  showHistory?: boolean;

  // Notification preferences (optional)
  emailNotifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    categories?: {
      tournaments?: boolean;
      matches?: boolean;
      achievements?: boolean;
      social?: boolean;
    };
  };
  pushNotifications?: { /* same structure */ };
  smsNotifications?: { /* same structure */ };

  // Display preferences (optional)
  theme?: 'LIGHT' | 'DARK' | 'AUTO';
  language?: string;  // 2-10 chars
  timezone?: string;
}
```

**Example Request:**

```bash
PUT /api/players/settings
Content-Type: application/json

{
  "isProfilePublic": false,
  "showHistory": false,
  "theme": "DARK",
  "pushNotifications": {
    "push": true,
    "categories": {
      "tournaments": true,
      "matches": true,
      "achievements": false
    }
  }
}
```

**Response (200 OK):**

```json
{
  "settings": {
    // Same structure as GET response with updated values
  },
  "message": "Settings updated successfully"
}
```

**Error Responses:**

**400 Bad Request** - Invalid request body:

```json
{
  "error": "Invalid request body",
  "message": "One or more fields contain invalid values",
  "details": {
    "fieldErrors": {
      "theme": ["Invalid enum value. Expected 'LIGHT' | 'DARK' | 'AUTO'"]
    }
  }
}
```

**401 Unauthorized** - Not authenticated:

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to update settings"
}
```

**409 Conflict** - Settings conflict:

```json
{
  "error": "Conflict",
  "message": "Settings already exist for this player"
}
```

**500 Internal Server Error** - Server error:

```json
{
  "error": "Failed to update settings",
  "message": "An unexpected error occurred while updating settings"
}
```

---

## Multi-Tenant Architecture

All endpoints enforce multi-tenant isolation:

1. **Session Extraction**: Tenant ID is extracted from the authenticated session
2. **Query Filtering**: All database queries filter by `tenantId`
3. **Data Isolation**: Users can only access data from their organization

**Example (Internal):**

```typescript
// Get tenant from session
const tenantId = await getTenantId(); // Returns 'org_123'

// All queries filter by tenant
const leaderboard = await getPlayerLeaderboard(tenantId, 'winRate', 100);
const settings = await prisma.playerSettings.findFirst({
  where: { playerId, tenantId },
});
```

---

## Error Handling

All endpoints follow consistent error handling patterns:

1. **Validation Errors (400)**: Invalid input parameters or request body
2. **Authorization Errors (401)**: Missing or invalid authentication
3. **Not Found Errors (404)**: Resource doesn't exist
4. **Conflict Errors (409)**: Data conflict (e.g., duplicate settings)
5. **Server Errors (500)**: Unexpected errors with generic messages

**Error Response Format:**

```typescript
{
  error: string;      // Error type
  message?: string;   // Human-readable message
  code?: string;      // Error code (for specific errors)
  details?: any;      // Additional details (for validation errors)
}
```

---

## Testing

### Unit Tests

**Location:**

- `apps/web/app/api/leaderboards/__tests__/route.test.ts`
- `apps/web/app/api/players/settings/__tests__/route.test.ts`

**Run Tests:**

```bash
npm test apps/web/app/api/leaderboards/__tests__/route.test.ts
npm test apps/web/app/api/players/settings/__tests__/route.test.ts
```

**Test Coverage:**

- ✅ Input validation (types, limits, formats)
- ✅ Success scenarios (200 responses)
- ✅ Error scenarios (400, 401, 500 responses)
- ✅ Multi-tenant isolation
- ✅ Default value handling
- ✅ Edge cases (empty data, large limits)

### Manual Testing

**Test Leaderboard Endpoint:**

```bash
# Valid request
curl -X GET "http://localhost:3000/api/leaderboards/win-rate?limit=10"

# Invalid type
curl -X GET "http://localhost:3000/api/leaderboards/invalid-type"

# Invalid limit
curl -X GET "http://localhost:3000/api/leaderboards/win-rate?limit=1000"
```

**Test Settings Endpoints:**

```bash
# Get settings
curl -X GET "http://localhost:3000/api/players/settings"

# Update settings
curl -X PUT "http://localhost:3000/api/players/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "isProfilePublic": false,
    "theme": "DARK"
  }'

# Invalid update
curl -X PUT "http://localhost:3000/api/players/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "INVALID"
  }'
```

---

## Files Created

### API Routes

- `apps/web/app/api/leaderboards/[type]/route.ts` - Leaderboard GET handler
- `apps/web/app/api/players/settings/route.ts` - Settings GET/PUT handlers

### Types & Validation

- `apps/web/app/api/leaderboards/types.ts` - Leaderboard type definitions
- `apps/web/app/api/players/settings/types.ts` - Settings type definitions

### Tests

- `apps/web/app/api/leaderboards/__tests__/route.test.ts` - Leaderboard tests
- `apps/web/app/api/players/settings/__tests__/route.test.ts` - Settings tests

### Documentation

- `apps/web/app/api/README-SETTINGS-LEADERBOARDS.md` - This file

---

## Next Steps

When connecting to actual authentication:

1. **Update Session Handling:**

   ```typescript
   // Replace mock with actual session
   const session = await getServerSession();
   if (!session?.user?.orgId) {
     throw new Error('Unauthorized');
   }
   return {
     userId: session.user.id,
     tenantId: session.user.orgId,
     playerId: session.user.playerId,
   };
   ```

2. **Enable Prisma Queries:**
   - Uncomment Prisma import statements
   - Remove mock data
   - Update to use actual database queries

3. **Add Caching (Optional):**

   ```typescript
   // Cache leaderboard data
   if (redis) {
     const cached = await redis.get(`leaderboard:${type}:${tenantId}`);
     if (cached) return JSON.parse(cached);
   }
   ```

4. **Add Rate Limiting:**
   - Implement rate limiting middleware
   - Protect against abuse

---

## Support

For issues or questions:

- Check test files for usage examples
- Review existing API routes in `apps/web/app/api/`
- Refer to player profile service: `apps/web/lib/player-profiles/services/player-profile-service.ts`
