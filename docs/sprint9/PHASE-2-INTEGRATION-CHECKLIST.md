# Phase 2 Integration Checklist

**Sprint 9 Phase 2: User Management Interface**

Use this checklist to complete the backend integration of the user management system.

---

## 1. Database Migration

### Step 1: Review Schema Changes
- [ ] Review updated `prisma/schema.prisma`
- [ ] Verify all fields are correct
- [ ] Check index definitions

### Step 2: Create Migration
```bash
cd /c/devop/saas202520
pnpm prisma migrate dev --name add_user_management_fields
```

### Step 3: Generate Prisma Client
```bash
pnpm prisma generate
```

### Step 4: Seed Initial Data (Optional)
```bash
# Create script: prisma/seeds/user-management.ts
# Add sample users with different roles and statuses
pnpm prisma db seed
```

---

## 2. API Route Implementation

Create the following API routes in `apps/web/app/api/admin/`:

### Users Routes
- [ ] `GET /api/admin/users/route.ts` - List users with filtering
- [ ] `GET /api/admin/users/[id]/route.ts` - Get user details
- [ ] `PATCH /api/admin/users/[id]/route.ts` - Update user
- [ ] `DELETE /api/admin/users/[id]/route.ts` - Delete user
- [ ] `POST /api/admin/users/[id]/moderate/route.ts` - Moderation actions
- [ ] `POST /api/admin/users/bulk/route.ts` - Bulk operations
- [ ] `GET /api/admin/users/[id]/activity/route.ts` - Activity log

### Role & Permission Routes
- [ ] `GET /api/admin/roles/route.ts` - List roles
- [ ] `GET /api/admin/permissions/route.ts` - List permissions

### Statistics Routes
- [ ] `GET /api/admin/stats/users/route.ts` - User statistics

---

## 3. Middleware & Authentication

### Create Middleware
- [ ] `lib/middleware/auth.ts` - Authentication check
- [ ] `lib/middleware/admin.ts` - Admin role check
- [ ] `lib/middleware/permissions.ts` - Permission checking

### Example Implementation
```typescript
// lib/middleware/admin.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 }
    );
  }

  return null; // No error
}
```

---

## 4. Service Layer Implementation

Create service files in `apps/web/lib/services/`:

### User Service
- [ ] `lib/services/user.service.ts`
  - getUserList()
  - getUserDetails()
  - updateUser()
  - deleteUser()
  - searchUsers()
  - filterUsers()

### Moderation Service
- [ ] `lib/services/moderation.service.ts`
  - warnUser()
  - suspendUser()
  - banUser()
  - unbanUser()
  - unsuspendUser()
  - getModerationHistory()
  - logModerationAction()

### Activity Service
- [ ] `lib/services/activity.service.ts`
  - logActivity()
  - getActivityLog()
  - getUserActivity()

### Permission Service
- [ ] `lib/services/permission.service.ts`
  - checkPermission()
  - getRolePermissions()
  - getAllRoles()
  - getAllPermissions()

---

## 5. Notification System

### Email Notifications
- [ ] Create email templates for moderation actions
  - `emails/user-warned.tsx`
  - `emails/user-suspended.tsx`
  - `emails/user-banned.tsx`
  - `emails/user-unbanned.tsx`

### In-App Notifications
- [ ] Integrate with existing notification system
- [ ] Create notification entries for moderation actions
- [ ] Add notification preferences for admin actions

---

## 6. Validation & Error Handling

### Input Validation
- [ ] Create Zod schemas for:
  - UserUpdateRequest
  - ModerationRequest
  - BulkOperationRequest
  - UserSearchFilters

### Error Handling
- [ ] Create error response utilities
- [ ] Implement try-catch blocks in all routes
- [ ] Log errors with context
- [ ] Return user-friendly error messages

---

## 7. Rate Limiting

### Implement Rate Limits
- [ ] User list endpoint: 100 requests/minute
- [ ] User detail endpoint: 200 requests/minute
- [ ] Moderation actions: 20 requests/minute
- [ ] Bulk operations: 5 requests/minute

### Example with Upstash
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
});
```

---

## 8. Testing

### Unit Tests
- [ ] Permission checking functions
- [ ] Role validation
- [ ] Moderation action logic
- [ ] Activity logging

### Integration Tests
- [ ] User CRUD operations
- [ ] Moderation workflows
- [ ] Activity tracking
- [ ] Bulk operations
- [ ] Permission enforcement

### E2E Tests (Playwright)
- [ ] Admin login
- [ ] User list navigation
- [ ] Search and filter
- [ ] User details view
- [ ] Moderation actions
- [ ] Role management view

---

## 9. Performance Optimization

### Database
- [ ] Verify indexes are created
- [ ] Test query performance with large datasets
- [ ] Add database query logging
- [ ] Optimize N+1 queries

### Caching
- [ ] Cache role permissions (Redis)
- [ ] Cache user statistics (5 minutes TTL)
- [ ] Implement SWR revalidation strategy

### Monitoring
- [ ] Add performance metrics
- [ ] Track API response times
- [ ] Monitor database query times

---

## 10. Security Audit

### Authentication & Authorization
- [ ] Verify session validation
- [ ] Test role-based access control
- [ ] Prevent privilege escalation
- [ ] Test admin-only endpoint protection

### Input Security
- [ ] Test SQL injection prevention
- [ ] Validate all input data
- [ ] Sanitize user-provided text
- [ ] Test XSS prevention

### Audit Logging
- [ ] Verify all moderation actions logged
- [ ] Test audit log immutability
- [ ] Capture actor information
- [ ] Log IP addresses and user agents

---

## 11. Documentation

### Update Documentation
- [ ] Add API route examples to docs
- [ ] Document error codes
- [ ] Create admin user guide
- [ ] Update system architecture diagrams

### Code Documentation
- [ ] Add JSDoc comments to services
- [ ] Document complex business logic
- [ ] Add inline comments for security-critical code

---

## 12. Deployment Checklist

### Pre-Deployment
- [ ] Run all tests
- [ ] Run database migration in staging
- [ ] Test with production-like data volume
- [ ] Review security audit

### Deployment
- [ ] Deploy database migration
- [ ] Deploy application code
- [ ] Verify all endpoints accessible
- [ ] Test critical paths in production

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify audit logs working
- [ ] Test notification delivery

---

## 13. Training & Rollout

### Admin Training
- [ ] Create admin training documentation
- [ ] Record demo video
- [ ] Schedule training session
- [ ] Provide support contact info

### Gradual Rollout
- [ ] Enable for super admins first
- [ ] Monitor for issues
- [ ] Enable for all admins
- [ ] Gather feedback

---

## Example Implementation Snippets

### User List Endpoint
```typescript
// apps/web/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin';
import { getUserList } from '@/lib/services/user.service';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const filters = {
    query: searchParams.get('query') || undefined,
    role: searchParams.get('role') || undefined,
    status: searchParams.get('status') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
  };

  const result = await getUserList(filters);
  return NextResponse.json(result);
}
```

### Moderation Action Endpoint
```typescript
// apps/web/app/api/admin/users/[id]/moderate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin';
import { moderateUser } from '@/lib/services/moderation.service';
import { moderationRequestSchema } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const validation = moderationRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' } },
      { status: 400 }
    );
  }

  const session = await auth();
  const result = await moderateUser(
    params.id,
    validation.data,
    session.user.id
  );

  return NextResponse.json(result);
}
```

---

## Priority Order

### Phase 1: Core Functionality (Week 1)
1. Database migration
2. Basic user list endpoint
3. User details endpoint
4. Authentication middleware

### Phase 2: Moderation (Week 1-2)
1. Moderation service
2. Moderation endpoints
3. Activity logging
4. Basic notifications

### Phase 3: Polish & Testing (Week 2)
1. Rate limiting
2. Comprehensive tests
3. Performance optimization
4. Security audit

### Phase 4: Deployment (Week 2-3)
1. Staging deployment
2. Production deployment
3. Admin training
4. Monitoring setup

---

## Support & Resources

- API Documentation: `docs/api/USER-MANAGEMENT-API.md`
- Type Definitions: `packages/shared/src/types/user.ts`
- Schema: `prisma/schema.prisma`
- Frontend Components: `apps/web/components/admin/`

---

**Last Updated:** November 6, 2025
**Status:** Ready for backend integration
