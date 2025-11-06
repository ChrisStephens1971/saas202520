# Admin API Documentation

Sprint 9 Phase 2 - Admin Dashboard APIs

## Overview

This document describes the admin-only API endpoints for managing tournaments, users, and viewing analytics across all organizations. All endpoints require admin authentication.

## Authentication

### Admin Role Requirements

All admin endpoints require the user to have an **admin** or **owner** role in at least one organization.

### Authentication Flow

1. User must be authenticated via NextAuth.js
2. User's role is verified by the `requireAdmin` middleware
3. Rate limiting is applied (100 requests/minute for standard operations)
4. All actions are logged to the audit trail

### Using Admin Endpoints

Include the user's session token in requests:

```typescript
const response = await fetch('/api/admin/tournaments', {
  headers: {
    'Content-Type': 'application/json',
    // NextAuth automatically includes session cookie
  },
});
```

---

## Tournament Management APIs

### List Tournaments

**GET** `/api/admin/tournaments`

List all tournaments with pagination, search, and filters.

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Results per page
- `search` (string, optional) - Search by name or description
- `status` (enum, optional) - Filter by status: `draft`, `registration`, `active`, `paused`, `completed`, `cancelled`
- `format` (enum, optional) - Filter by format: `single_elimination`, `double_elimination`, `round_robin`, `modified_single`, `chip_format`
- `orgId` (string, optional) - Filter by organization
- `startDate` (datetime, optional) - Filter by creation date (from)
- `endDate` (datetime, optional) - Filter by creation date (to)
- `sortBy` (enum, default: `createdAt`) - Sort by: `createdAt`, `name`, `status`, `playerCount`
- `sortOrder` (enum, default: `desc`) - Sort order: `asc`, `desc`

**Response:**

```json
{
  "tournaments": [
    {
      "id": "clxxx",
      "name": "Friday Night Pool",
      "description": "Weekly tournament",
      "status": "active",
      "format": "double_elimination",
      "organization": {
        "id": "clyyy",
        "name": "Main Pool Hall",
        "slug": "main-pool-hall"
      },
      "playerCount": 32,
      "matchCount": 45,
      "createdAt": "2025-01-01T00:00:00Z",
      "startedAt": "2025-01-01T19:00:00Z",
      "completedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### Get Tournament Details

**GET** `/api/admin/tournaments/:id`

Get detailed tournament information with recent players and matches.

**Response:**

```json
{
  "tournament": {
    "id": "clxxx",
    "name": "Friday Night Pool",
    "description": "Weekly tournament",
    "status": "active",
    "format": "double_elimination",
    "organization": {
      "id": "clyyy",
      "name": "Main Pool Hall",
      "slug": "main-pool-hall"
    },
    "sportConfigId": "clzzz",
    "sportConfigVersion": "1.0.0",
    "createdBy": "claaa",
    "createdAt": "2025-01-01T00:00:00Z",
    "startedAt": "2025-01-01T19:00:00Z",
    "completedAt": null,
    "counts": {
      "players": 32,
      "matches": 45,
      "tables": 8,
      "events": 120
    },
    "recentPlayers": [
      {
        "id": "clbbb",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "active",
        "chipCount": 15,
        "createdAt": "2025-01-01T18:30:00Z"
      }
    ],
    "recentMatches": [
      {
        "id": "clccc",
        "state": "completed",
        "completedAt": "2025-01-01T20:15:00Z"
      }
    ]
  }
}
```

---

### Create Tournament

**POST** `/api/admin/tournaments`

Create a new tournament (admin creation).

**Request Body:**

```json
{
  "orgId": "clyyy",
  "name": "Friday Night Pool",
  "description": "Weekly tournament",
  "format": "double_elimination",
  "sportConfigId": "clzzz",
  "sportConfigVersion": "1.0.0",
  "status": "draft"
}
```

**Response:** 201 Created

```json
{
  "tournament": {
    "id": "clxxx",
    "name": "Friday Night Pool",
    "description": "Weekly tournament",
    "status": "draft",
    "format": "double_elimination",
    "organization": {
      "id": "clyyy",
      "name": "Main Pool Hall",
      "slug": "main-pool-hall"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "createdBy": "adminUserId"
  }
}
```

---

### Update Tournament

**PATCH** `/api/admin/tournaments/:id`

Update tournament details (admin override).

**Request Body:**

```json
{
  "name": "Updated Tournament Name",
  "description": "Updated description",
  "status": "active"
}
```

**Response:** 200 OK

---

### Delete Tournament

**DELETE** `/api/admin/tournaments/:id`

Soft delete tournament (sets status to cancelled).

**Response:** 204 No Content

---

### Bulk Tournament Operations

**POST** `/api/admin/tournaments/bulk`

Perform bulk operations on multiple tournaments.

**Request Body:**

```json
{
  "operation": "delete",
  "tournamentIds": ["clxxx", "clyyy", "clzzz"]
}
```

**Operations:**

- `delete` - Soft delete (set status to cancelled)
- `archive` - Archive (set status to completed)
- `changeStatus` - Change status (requires `newStatus` field)

**Response:**

```json
{
  "success": true,
  "operation": "delete",
  "result": {
    "processed": 3,
    "successful": 3,
    "failed": 0
  }
}
```

---

## User Management APIs

### List Users

**GET** `/api/admin/users`

List all users with pagination, search, and filters.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `search` (string, optional) - Search by name or email
- `role` (enum, optional) - Filter by role: `owner`, `admin`, `td`, `scorekeeper`, `streamer`
- `orgId` (string, optional) - Filter by organization
- `startDate` (datetime, optional) - Filter by creation date (from)
- `endDate` (datetime, optional) - Filter by creation date (to)
- `sortBy` (enum, default: `createdAt`) - Sort by: `createdAt`, `name`, `email`
- `sortOrder` (enum, default: `desc`)

**Response:**

```json
{
  "users": [
    {
      "id": "claaa",
      "name": "John Doe",
      "email": "john@example.com",
      "image": null,
      "emailVerified": "2025-01-01T00:00:00Z",
      "organizations": [
        {
          "id": "clyyy",
          "name": "Main Pool Hall",
          "slug": "main-pool-hall",
          "role": "owner",
          "joinedAt": "2025-01-01T00:00:00Z"
        }
      ],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

---

### Get User Details

**GET** `/api/admin/users/:id`

Get detailed user information with full history.

**Response:**

```json
{
  "user": {
    "id": "claaa",
    "name": "John Doe",
    "email": "john@example.com",
    "image": null,
    "emailVerified": "2025-01-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "organizations": [
      {
        "id": "clyyy",
        "name": "Main Pool Hall",
        "slug": "main-pool-hall",
        "role": "owner",
        "joinedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "accounts": [
      {
        "provider": "credentials",
        "type": "credentials"
      }
    ],
    "recentSessions": [
      {
        "id": "clsss",
        "expires": "2025-01-15T00:00:00Z"
      }
    ],
    "statistics": {
      "tournamentsCreated": 12
    }
  }
}
```

---

### Create User

**POST** `/api/admin/users`

Create a new user (admin creation).

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "orgId": "clyyy",
  "role": "td"
}
```

**Response:** 201 Created

---

### Update User

**PATCH** `/api/admin/users/:id`

Update user details (admin override).

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "role": "admin",
  "orgId": "clyyy"
}
```

**Response:** 200 OK

---

### Delete User

**DELETE** `/api/admin/users/:id`

Soft delete user account (anonymizes data and removes org memberships).

**Response:** 204 No Content

---

### Ban User

**POST** `/api/admin/users/:id/ban`

Ban user permanently.

**Request Body:**

```json
{
  "reason": "Violating terms of service"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User has been banned",
  "userId": "claaa"
}
```

---

### Suspend User

**POST** `/api/admin/users/:id/suspend`

Suspend user temporarily.

**Request Body:**

```json
{
  "reason": "Inappropriate behavior",
  "durationDays": 7
}
```

**Response:**

```json
{
  "success": true,
  "message": "User has been suspended",
  "userId": "claaa",
  "suspensionEndsAt": "2025-01-08T00:00:00Z",
  "durationDays": 7
}
```

---

## Analytics APIs

### Analytics Overview

**GET** `/api/admin/analytics/overview`

Get system-wide metrics for admin dashboard.

**Response:**

```json
{
  "overview": {
    "users": {
      "total": 500,
      "newLast30Days": 45,
      "newLast7Days": 12,
      "growthRate": 9.0
    },
    "organizations": {
      "total": 50
    },
    "tournaments": {
      "total": 150,
      "active": 25,
      "completed": 100,
      "newLast30Days": 20,
      "growthRate": 13.33
    },
    "matches": {
      "total": 5000,
      "completed": 4500,
      "completionRate": 90.0
    },
    "players": {
      "total": 3000,
      "averagePerTournament": 20.0
    },
    "revenue": {
      "total": 50000,
      "succeeded": 48000,
      "pending": 1500,
      "failed": 500,
      "refunded": 2000,
      "totalPayments": 500,
      "averagePayment": 100.0
    }
  },
  "generatedAt": "2025-01-01T00:00:00Z"
}
```

---

### User Analytics

**GET** `/api/admin/analytics/users`

Get user growth, activity, and engagement metrics.

**Query Parameters:**

- `startDate` (datetime, optional)
- `endDate` (datetime, optional)
- `granularity` (enum, default: `day`) - `day`, `week`, `month`

**Response:**

```json
{
  "analytics": {
    "growth": [
      {
        "date": "2025-01-01",
        "newUsers": 15
      }
    ],
    "roleDistribution": [
      {
        "role": "owner",
        "count": 50,
        "percentage": 10.0
      }
    ],
    "activity": {
      "totalUsers": 500,
      "activeUsersLast7Days": 250,
      "activityRate": 50.0
    },
    "engagement": {
      "singleOrganization": 400,
      "multipleOrganizations": 100
    }
  },
  "period": {
    "start": "2024-12-01T00:00:00Z",
    "end": "2025-01-01T00:00:00Z",
    "granularity": "day"
  }
}
```

---

### Tournament Analytics

**GET** `/api/admin/analytics/tournaments`

Get tournament statistics and completion metrics.

**Query Parameters:**

- `startDate` (datetime, optional)
- `endDate` (datetime, optional)
- `granularity` (enum, default: `day`)

**Response:**

```json
{
  "analytics": {
    "creation": [
      {
        "date": "2025-01-01",
        "tournamentsCreated": 5
      }
    ],
    "statusDistribution": [
      {
        "status": "active",
        "count": 25,
        "percentage": 16.67
      }
    ],
    "formatDistribution": [
      {
        "format": "double_elimination",
        "count": 75,
        "percentage": 50.0
      }
    ],
    "completion": {
      "totalTournaments": 150,
      "completedTournaments": 100,
      "completionRate": 66.67,
      "averageDurationHours": 4.5
    },
    "participation": {
      "totalPlayers": 3000,
      "totalMatches": 5000,
      "averagePlayersPerTournament": 20.0,
      "averageMatchesPerTournament": 33.33
    }
  },
  "period": {
    "start": "2024-12-01T00:00:00Z",
    "end": "2025-01-01T00:00:00Z",
    "granularity": "day"
  }
}
```

---

## Audit Logs API

### Get Audit Logs

**GET** `/api/admin/audit-logs`

Fetch audit logs with filters.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 50, max: 100)
- `userId` (string, optional) - Filter by admin user
- `action` (enum, optional) - Filter by action type
- `resource` (enum, optional) - Filter by resource type
- `startDate` (datetime, optional)
- `endDate` (datetime, optional)

**Action Types:**

`CREATE`, `UPDATE`, `DELETE`, `BAN`, `SUSPEND`, `RESTORE`, `BULK_DELETE`, `BULK_UPDATE`, `EXPORT`, `VIEW`

**Resource Types:**

`TOURNAMENT`, `USER`, `ORGANIZATION`, `PLAYER`, `MATCH`, `PAYMENT`, `NOTIFICATION`, `SETTINGS`

**Response:**

```json
{
  "logs": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0
  },
  "notice": "Audit logs are currently logged to console and monitoring systems. Database storage will be implemented in a future update."
}
```

---

## Security Features

### Rate Limiting

**Standard Operations:**

- 100 requests per minute per admin user

**Sensitive Operations (ban, delete, bulk):**

- 10 requests per minute per admin user

**Data Exports:**

- 5 exports per hour per admin user

### Audit Logging

All admin actions are logged with:

- User ID and email
- Action type and resource
- Timestamp
- IP address and user agent
- Changes made (before/after values)

### Input Validation

- All endpoints use Zod schemas for validation
- SQL injection prevention via Prisma
- XSS protection via Next.js built-in sanitization

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Common Error Codes:**

- `UNAUTHORIZED` (401) - Not authenticated
- `FORBIDDEN` (403) - Not an admin user
- `NOT_FOUND` (404) - Resource not found
- `INVALID_REQUEST` (400) - Invalid request body or query
- `RATE_LIMIT_EXCEEDED` (429) - Rate limit exceeded
- `INTERNAL_ERROR` (500) - Server error

---

## Database Schema Changes Needed

To fully support the admin features, the following schema changes are recommended:

### 1. Add User Status Fields

```prisma
model User {
  // ... existing fields
  suspendedUntil  DateTime? @map("suspended_until")
  isBanned        Boolean   @default(false) @map("is_banned")
  banReason       String?   @map("ban_reason")
}
```

### 2. Add AuditLog Table

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String   @map("user_id") // Admin who performed action
  userEmail   String   @map("user_email")
  action      String   // CREATE, UPDATE, DELETE, etc.
  resource    String   // TOURNAMENT, USER, etc.
  resourceId  String?  @map("resource_id")
  changes     Json?    // Old/new values
  metadata    Json?    // Additional context
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([timestamp])
  @@map("audit_logs")
}
```

### 3. Update OrganizationMember Role Enum

Ensure the `role` field supports `admin`:

```prisma
model OrganizationMember {
  // ... existing fields
  role   String // owner, admin, td, scorekeeper, streamer
}
```

---

## Testing Recommendations

### Unit Tests

Test each API endpoint with:

1. **Authentication Tests**
   - Unauthorized access (no session)
   - Non-admin access (regular user)
   - Admin access (success)

2. **Validation Tests**
   - Invalid request bodies
   - Invalid query parameters
   - Edge cases (empty strings, null values)

3. **Business Logic Tests**
   - Tournament status transitions
   - User ban/suspend logic
   - Bulk operations

### Integration Tests

1. **End-to-End Workflows**
   - Create → Update → Delete tournament
   - Create user → Assign role → Ban user
   - Fetch analytics with various filters

2. **Rate Limiting Tests**
   - Verify 100 req/min limit
   - Verify 10 req/min for sensitive operations
   - Verify 5 exports/hour limit

3. **Audit Log Tests**
   - Verify all mutations are logged
   - Verify log format and content
   - Verify retrieval with filters

### Security Tests

1. **Permission Tests**
   - Non-admin cannot access admin endpoints
   - Admin can only modify allowed resources
   - System admin (owner) has unrestricted access

2. **SQL Injection Tests**
   - Test all search/filter parameters
   - Verify Prisma prevents SQL injection

3. **XSS Tests**
   - Test HTML/script injection in text fields
   - Verify Next.js sanitization

### Example Test Cases

```typescript
// Authentication test
describe('GET /api/admin/tournaments', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await fetch('/api/admin/tournaments');
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin', async () => {
    const response = await authenticatedFetch('/api/admin/tournaments', {
      role: 'td',
    });
    expect(response.status).toBe(403);
  });

  it('returns tournaments when user is admin', async () => {
    const response = await authenticatedFetch('/api/admin/tournaments', {
      role: 'admin',
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tournaments');
    expect(data).toHaveProperty('pagination');
  });
});

// Validation test
describe('POST /api/admin/tournaments', () => {
  it('returns 400 when orgId is missing', async () => {
    const response = await adminFetch('/api/admin/tournaments', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Tournament',
        format: 'double_elimination',
      }),
    });
    expect(response.status).toBe(400);
  });
});

// Rate limiting test
describe('Rate limiting', () => {
  it('returns 429 after 100 requests in 1 minute', async () => {
    for (let i = 0; i < 101; i++) {
      const response = await adminFetch('/api/admin/tournaments');
      if (i < 100) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });
});
```

---

## Implementation Checklist

- [x] Admin authentication middleware
- [x] Tournament management APIs (list, create, update, delete, bulk)
- [x] User management APIs (list, create, update, delete, ban, suspend)
- [x] Analytics APIs (overview, users, tournaments)
- [x] Audit logging system
- [x] Rate limiting configuration
- [ ] Database schema updates (User status, AuditLog table)
- [ ] Frontend admin dashboard components
- [ ] E2E tests for all endpoints
- [ ] Performance optimization (caching, query optimization)
- [ ] Monitoring and alerting setup

---

## Next Steps

1. **Update Database Schema**
   - Add `suspendedUntil`, `isBanned` fields to User model
   - Create AuditLog table
   - Run migrations

2. **Build Frontend Dashboard**
   - Admin dashboard home page
   - Tournament management interface
   - User management interface
   - Analytics visualizations

3. **Add E2E Tests**
   - Test all admin workflows
   - Test rate limiting
   - Test audit logging

4. **Deploy and Monitor**
   - Deploy to staging environment
   - Set up monitoring alerts
   - Test in production-like environment

---

**Document Version:** 1.0
**Last Updated:** 2025-01-06
**Author:** Claude Code Assistant
