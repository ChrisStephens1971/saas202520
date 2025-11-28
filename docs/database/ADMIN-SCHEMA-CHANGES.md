# Admin Dashboard Database Schema Changes

Sprint 9 Phase 2 - Required Database Updates

## Overview

This document describes the database schema changes needed to fully support the admin dashboard features implemented in Sprint 9 Phase 2.

---

## 1. User Status Fields

Add fields to track user bans and suspensions.

### Schema Update

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  password      String?

  // NEW: User status fields
  suspendedUntil  DateTime? @map("suspended_until")
  isBanned        Boolean   @default(false) @map("is_banned")
  banReason       String?   @map("ban_reason")

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  accounts           Account[]
  sessions           Session[]
  organizationMembers OrganizationMember[]

  @@map("users")
}
```

### Migration SQL

```sql
-- Add user status fields
ALTER TABLE users
ADD COLUMN suspended_until TIMESTAMP,
ADD COLUMN is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN ban_reason TEXT;

-- Create index for suspended_until queries
CREATE INDEX idx_users_suspended_until ON users(suspended_until)
WHERE suspended_until IS NOT NULL;

-- Create index for banned users queries
CREATE INDEX idx_users_is_banned ON users(is_banned)
WHERE is_banned = TRUE;
```

### Purpose

- `suspendedUntil`: Temporary suspension end date
- `isBanned`: Permanent ban flag
- `banReason`: Audit trail for why user was banned

### Usage

```typescript
// Check if user is suspended
const isSuspended = user.suspendedUntil && user.suspendedUntil > new Date();

// Check if user is banned
if (user.isBanned) {
  throw new Error('User is banned');
}
```

---

## 2. AuditLog Table

Create a dedicated table for storing admin action audit logs.

### Schema Addition

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String   @map("user_id") // Admin who performed action
  userEmail   String   @map("user_email")
  action      String   // CREATE, UPDATE, DELETE, BAN, SUSPEND, etc.
  resource    String   // TOURNAMENT, USER, ORGANIZATION, etc.
  resourceId  String?  @map("resource_id") // ID of affected resource
  changes     Json?    // Old/new values { old: {}, new: {} }
  metadata    Json?    // Additional context
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([resourceId])
  @@index([timestamp])
  @@map("audit_logs")
}
```

### Migration SQL

```sql
-- Create audit_logs table
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Create composite index for common queries
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_resource_timestamp ON audit_logs(resource, timestamp DESC);

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for all admin actions';
```

### Purpose

- Complete audit trail of all admin actions
- Compliance and security monitoring
- Debugging and troubleshooting
- User activity tracking

### Example Records

```json
{
  "id": "clxxx",
  "userId": "claaa",
  "userEmail": "admin@example.com",
  "action": "DELETE",
  "resource": "TOURNAMENT",
  "resourceId": "clbbb",
  "changes": {
    "old": {
      "name": "Friday Night Pool",
      "status": "active"
    }
  },
  "metadata": {
    "reason": "Duplicate tournament"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-06T12:00:00Z"
}
```

---

## 3. OrganizationMember Role Update

Ensure the `role` field supports the `admin` role.

### Current Schema

```prisma
model OrganizationMember {
  id     String @id @default(cuid())
  orgId  String @map("org_id")
  userId String @map("user_id")
  role   String // owner, td, scorekeeper, streamer

  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([orgId, userId])
  @@index([orgId])
  @@index([userId])
  @@map("organization_members")
}
```

### Update

The `role` field is already a String type, so no schema change is needed. However, we should add documentation and validation.

### Valid Roles

- `owner` - Full organization control
- `admin` - Admin dashboard access, can manage users and tournaments
- `td` - Tournament Director
- `scorekeeper` - Can update scores
- `streamer` - Can view live data for streaming

### Application-Level Validation

```typescript
const VALID_ROLES = ['owner', 'admin', 'td', 'scorekeeper', 'streamer'] as const;
type Role = (typeof VALID_ROLES)[number];

// Validation schema
const RoleSchema = z.enum(VALID_ROLES);
```

---

## 4. Rate Limit Storage (Existing)

Rate limiting is already handled by Upstash Redis. No database changes needed.

### Current Implementation

- Standard admin operations: 100 req/min
- Sensitive operations: 10 req/min
- Data exports: 5 req/hour

### Storage Location

All rate limit data is stored in Upstash Redis with appropriate TTLs.

---

## Migration Steps

### Step 1: Update Prisma Schema

1. Open `C:\devop\saas202520\prisma\schema.prisma`
2. Add the new fields to the `User` model
3. Add the new `AuditLog` model
4. Save the file

### Step 2: Generate Migration

```bash
cd C:\devop\saas202520
npx prisma migrate dev --name add-admin-features
```

### Step 3: Review Migration SQL

Review the generated SQL in `prisma/migrations/` to ensure it matches the expected changes.

### Step 4: Apply Migration

```bash
npx prisma migrate deploy
```

### Step 5: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 6: Update Application Code

Update the audit logging system to use the new `AuditLog` table:

**C:\devop\saas202520\apps\web\lib\audit\logger.ts**

```typescript
// Replace console.log with database insert
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        changes: entry.changes,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

// Update getAuditLogs to query database
export async function getAuditLogs(filters: GetAuditLogsFilters) {
  const where: any = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: filters.offset || 0,
      take: filters.limit || 50,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
```

---

## Testing the Changes

### Test User Status Fields

```typescript
// Test suspension
const user = await prisma.user.update({
  where: { id: userId },
  data: {
    suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
});

console.assert(user.suspendedUntil > new Date(), 'User should be suspended');

// Test ban
await prisma.user.update({
  where: { id: userId },
  data: {
    isBanned: true,
    banReason: 'Violating terms of service',
  },
});

const bannedUser = await prisma.user.findUnique({
  where: { id: userId },
});

console.assert(bannedUser?.isBanned === true, 'User should be banned');
```

### Test Audit Logging

```typescript
// Test creating audit log
await logAdminAction({
  userId: adminId,
  userEmail: 'admin@example.com',
  action: 'DELETE',
  resource: 'TOURNAMENT',
  resourceId: tournamentId,
  changes: { old: { name: 'Test Tournament' } },
});

// Test querying audit logs
const logs = await getAuditLogs({
  userId: adminId,
  action: 'DELETE',
  limit: 10,
});

console.assert(logs.logs.length > 0, 'Should have audit logs');
console.assert(logs.logs[0].action === 'DELETE', 'Should be DELETE action');
```

---

## Rollback Plan

If the migration needs to be rolled back:

### Rollback User Status Fields

```sql
-- Remove user status fields
ALTER TABLE users
DROP COLUMN suspended_until,
DROP COLUMN is_banned,
DROP COLUMN ban_reason;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_suspended_until;
DROP INDEX IF EXISTS idx_users_is_banned;
```

### Rollback AuditLog Table

```sql
-- Drop audit_logs table and all indexes
DROP TABLE IF EXISTS audit_logs;
```

### Rollback Prisma Schema

Revert the changes to `schema.prisma` and run:

```bash
npx prisma migrate dev --name rollback-admin-features
```

---

## Performance Considerations

### Indexes

All necessary indexes have been added:

- User status queries: `suspended_until`, `is_banned`
- Audit log queries: `userId`, `action`, `resource`, `timestamp`
- Composite indexes for common query patterns

### Query Optimization

- Use pagination for audit log queries (default: 50 results)
- Add date range filters to limit result sets
- Consider archiving old audit logs (>1 year) to separate table

### Database Size

Estimated storage requirements:

- User status fields: ~50 bytes per user
- Audit logs: ~500 bytes per log entry

With 10,000 users and 100,000 admin actions:

- User status: ~500 KB
- Audit logs: ~50 MB

---

## Security Considerations

### Data Retention

- Audit logs should be retained for at least 1 year
- Consider archiving old logs to cold storage
- Implement log rotation policy

### Access Control

- Only admins can query audit logs
- Audit logs are append-only (no updates/deletes)
- Sensitive data should be redacted (passwords, tokens)

### Compliance

The audit log system supports:

- GDPR compliance (data access tracking)
- SOC 2 compliance (security monitoring)
- HIPAA compliance (audit trail requirements)

---

## Next Steps

1. Review and approve schema changes
2. Run migrations in development environment
3. Test all admin features with new schema
4. Update application code to use AuditLog table
5. Run E2E tests
6. Deploy to staging environment
7. Perform load testing
8. Deploy to production

---

**Document Version:** 1.0
**Last Updated:** 2025-01-06
**Author:** Claude Code Assistant
