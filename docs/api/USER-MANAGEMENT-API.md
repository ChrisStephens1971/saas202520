# User Management API Endpoints

**Sprint 9 Phase 2 - Admin Dashboard**

This document outlines all API endpoints required for the user management interface.

## Base URL

All endpoints are relative to: `/api/admin`

## Authentication

All endpoints require:

- Valid session with authenticated user
- User must have `admin` role
- Organization context must be set

---

## User Endpoints

### GET /api/admin/users

List all users with filtering, sorting, and pagination.

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)
- `query` (string, optional): Search by name or email
- `role` (string, optional): Filter by role (admin, organizer, player)
- `status` (string, optional): Filter by status (active, suspended, banned, pending)
- `organizationId` (string, optional): Filter by organization
- `sortBy` (string, optional): Sort field (name, email, createdAt, lastLoginAt)
- `sortOrder` (string, optional): Sort direction (asc, desc)

**Response:**

```json
{
  "users": [
    {
      "id": "usr_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "organizer",
      "status": "active",
      "image": "https://...",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T00:00:00Z",
      "lastLoginAt": "2025-01-10T10:00:00Z",
      "lastActivityAt": "2025-01-10T11:00:00Z",
      "totalTournaments": 5,
      "totalMatches": 23,
      "totalWins": 15,
      "organizationCount": 2
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

**Status Codes:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

### GET /api/admin/users/:id

Get detailed information about a specific user.

**Response:**

```json
{
  "user": {
    "id": "usr_123",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": "2025-01-01T00:00:00Z",
    "image": "https://...",
    "role": "organizer",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-10T00:00:00Z",
    "lastLoginAt": "2025-01-10T10:00:00Z",
    "lastActivityAt": "2025-01-10T11:00:00Z",
    "bannedAt": null,
    "bannedBy": null,
    "banReason": null,
    "suspendedUntil": null,
    "suspensionReason": null,
    "totalTournaments": 5,
    "totalMatches": 23,
    "totalWins": 15,
    "organizationCount": 2
  },
  "organizations": [
    {
      "id": "org_456",
      "name": "Pool League",
      "role": "owner",
      "joinedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "recentActivity": [
    {
      "id": "act_789",
      "userId": "usr_123",
      "action": "tournament.created",
      "resource": "tournament",
      "resourceId": "trn_abc",
      "metadata": {},
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2025-01-10T11:00:00Z"
    }
  ],
  "moderationHistory": [
    {
      "id": "mod_101",
      "userId": "usr_123",
      "actionType": "warn",
      "reason": "Inappropriate behavior",
      "performedBy": "usr_admin",
      "performedAt": "2025-01-05T00:00:00Z",
      "expiresAt": null,
      "metadata": {}
    }
  ],
  "tournaments": [
    {
      "id": "trn_abc",
      "name": "Weekly Pool Tournament",
      "status": "completed",
      "createdAt": "2025-01-01T00:00:00Z",
      "completedAt": "2025-01-01T18:00:00Z"
    }
  ]
}
```

**Status Codes:**

- `200 OK`: Success
- `404 Not Found`: User not found
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

### PATCH /api/admin/users/:id

Update user information.

**Request Body:**

```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "role": "admin",
  "status": "active",
  "image": "https://..."
}
```

**Response:**

```json
{
  "user": {
    "id": "usr_123",
    "name": "John Doe Updated",
    "email": "newemail@example.com",
    "role": "admin",
    "status": "active",
    "updatedAt": "2025-01-10T12:00:00Z"
  }
}
```

**Status Codes:**

- `200 OK`: Success
- `400 Bad Request`: Validation error
- `404 Not Found`: User not found
- `409 Conflict`: Email already in use
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

### DELETE /api/admin/users/:id

Permanently delete a user account.

**Warning:** This is a destructive action that cannot be undone.

**Response:**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Status Codes:**

- `200 OK`: Success
- `404 Not Found`: User not found
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin or attempting to delete self

---

### POST /api/admin/users/:id/moderate

Perform moderation actions on a user.

**Request Body:**

```json
{
  "action": "warn|suspend|ban|unban|unsuspend",
  "reason": "Reason for moderation action",
  "duration": 7,
  "notifyUser": true
}
```

**Fields:**

- `action` (required): Type of moderation action
- `reason` (required): Explanation for the action
- `duration` (optional): Days for suspension (only for suspend action)
- `notifyUser` (optional): Whether to send notification (default: true)

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "usr_123",
    "status": "suspended",
    "suspendedUntil": "2025-01-17T00:00:00Z",
    "suspensionReason": "Reason for moderation action"
  },
  "moderationAction": {
    "id": "mod_102",
    "userId": "usr_123",
    "actionType": "suspend",
    "reason": "Reason for moderation action",
    "performedBy": "usr_admin",
    "performedAt": "2025-01-10T12:00:00Z",
    "expiresAt": "2025-01-17T00:00:00Z"
  }
}
```

**Status Codes:**

- `200 OK`: Success
- `400 Bad Request`: Invalid action or missing required fields
- `404 Not Found`: User not found
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

### POST /api/admin/users/bulk

Perform bulk operations on multiple users.

**Request Body:**

```json
{
  "userIds": ["usr_123", "usr_456"],
  "operation": "delete|suspend|activate|change_role",
  "operationData": {
    "role": "organizer",
    "suspensionDuration": 7,
    "reason": "Bulk operation reason"
  }
}
```

**Response:**

```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    {
      "userId": "usr_123",
      "success": true
    },
    {
      "userId": "usr_456",
      "success": true
    }
  ]
}
```

**Status Codes:**

- `200 OK`: Success (even if some operations failed)
- `400 Bad Request`: Invalid operation or data
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

## Activity Endpoints

### GET /api/admin/users/:id/activity

Get detailed activity log for a user.

**Query Parameters:**

- `limit` (number, optional): Number of activities to return (default: 50)
- `offset` (number, optional): Pagination offset (default: 0)
- `action` (string, optional): Filter by action type
- `resource` (string, optional): Filter by resource type

**Response:**

```json
{
  "activities": [
    {
      "id": "act_789",
      "userId": "usr_123",
      "action": "tournament.created",
      "resource": "tournament",
      "resourceId": "trn_abc",
      "metadata": {
        "tournamentName": "Weekly Pool",
        "format": "single_elimination"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2025-01-10T11:00:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

**Status Codes:**

- `200 OK`: Success
- `404 Not Found`: User not found
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

## Role & Permission Endpoints

### GET /api/admin/roles

Get list of all available roles and their permissions.

**Response:**

```json
{
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system access",
      "permissions": ["admin:*"]
    },
    {
      "id": "organizer",
      "name": "Organizer",
      "description": "Can create and manage tournaments",
      "permissions": [
        "tournaments:view:all",
        "tournaments:create",
        "tournaments:edit:own",
        "tournaments:delete:own"
      ]
    },
    {
      "id": "player",
      "name": "Player",
      "description": "Basic user access",
      "permissions": ["tournaments:view:own", "profile:view:own", "profile:edit:own"]
    }
  ]
}
```

**Status Codes:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

### GET /api/admin/permissions

Get list of all available permissions.

**Response:**

```json
{
  "permissions": [
    {
      "id": "admin:*",
      "name": "Full Access",
      "description": "Unrestricted system access",
      "category": "admin"
    },
    {
      "id": "users:view",
      "name": "View Users",
      "description": "Can view user list and details",
      "category": "users"
    }
  ]
}
```

**Status Codes:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

## Statistics Endpoints

### GET /api/admin/stats/users

Get aggregate statistics about users.

**Response:**

```json
{
  "totalUsers": 150,
  "activeUsers": 142,
  "suspendedUsers": 5,
  "bannedUsers": 3,
  "usersByRole": {
    "admin": 2,
    "organizer": 25,
    "player": 123
  },
  "newUsersThisMonth": 12,
  "newUsersLastMonth": 18,
  "activeUsersLast7Days": 85,
  "activeUsersLast30Days": 130
}
```

**Status Codes:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin

---

## Implementation Notes

### Database Queries

All user list endpoints should:

1. Include organization membership information
2. Calculate aggregate statistics (tournaments, matches, wins)
3. Use efficient joins and indexing
4. Implement cursor-based pagination for large datasets

### Audit Logging

All moderation actions must:

1. Create an entry in `UserModerationAction` table
2. Create an entry in `AuditLog` table
3. Include actor information (who performed the action)
4. Store before/after state for updates

### Notifications

When moderation actions are performed:

1. Send in-app notification to affected user
2. Send email notification if enabled
3. Log notification delivery status

### Performance Considerations

1. Cache user role/permission checks
2. Use database indexes on:
   - `users.role`
   - `users.status`
   - `users.lastLoginAt`
   - `user_activities.userId`
   - `user_moderation_actions.userId`
3. Implement rate limiting on bulk operations
4. Use background jobs for large bulk operations

### Security Considerations

1. Validate all input data
2. Prevent admins from modifying their own role/status
3. Require confirmation for destructive actions
4. Log all admin actions in audit log
5. Implement CSRF protection
6. Rate limit moderation actions

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request data validation failed
- `CONFLICT`: Operation conflicts with current state
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Testing

### Required Test Coverage

1. **Unit Tests:**
   - Permission checking logic
   - Role validation
   - Input sanitization

2. **Integration Tests:**
   - Full user CRUD operations
   - Moderation workflows
   - Bulk operations
   - Activity tracking

3. **E2E Tests:**
   - Admin user management flow
   - Moderation scenarios
   - Permission enforcement

### Test Data

Seed database with:

- 3 admin users
- 20 organizer users
- 100 player users
- Various user statuses (active, suspended, banned)
- Sample activity logs
- Sample moderation history

---

## Migration Guide

### Database Migration

```sql
-- Add new columns to users table
ALTER TABLE users
ADD COLUMN role VARCHAR(50) DEFAULT 'player',
ADD COLUMN status VARCHAR(50) DEFAULT 'active',
ADD COLUMN last_login_at TIMESTAMP,
ADD COLUMN banned_at TIMESTAMP,
ADD COLUMN banned_by VARCHAR(255),
ADD COLUMN ban_reason TEXT,
ADD COLUMN suspended_until TIMESTAMP,
ADD COLUMN suspension_reason TEXT;

-- Add indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- Create user activity table
-- (See schema.prisma for full definition)

-- Create user moderation actions table
-- (See schema.prisma for full definition)
```

### Data Migration

1. Set default role for existing users:
   - Users with organization owner role → `organizer`
   - All others → `player`
2. Set all existing users to `active` status
3. Backfill activity logs from existing audit logs (optional)

---

## Future Enhancements

- **Custom Roles:** Allow admins to create custom roles with specific permission sets
- **Permission Groups:** Group permissions into logical sets
- **Two-Factor Authentication:** Require 2FA for admin actions
- **Session Management:** View and revoke user sessions
- **Export Data:** Export user lists and activity logs to CSV/JSON
- **Advanced Filtering:** More complex filter combinations
- **User Impersonation:** Allow admins to view as another user (with audit logging)
