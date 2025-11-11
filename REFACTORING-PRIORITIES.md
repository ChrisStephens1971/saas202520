# Refactoring Priorities

**Created:** 2025-11-11
**Status:** Active
**Total TODOs:** 30+
**Console.log instances:** 991 across 100 files

---

## 🔴 HIGH PRIORITY (Security & Critical)

### 1. Socket Authentication - JWT Verification
**File:** `lib/socket/middleware.ts:48`
**Current:** Simple string split (`userId:username:role`)
**Required:** Proper JWT verification with next-auth
**Risk:** Security vulnerability - unauthorized socket access
**Effort:** 2-3 hours

```typescript
// TODO: Verify JWT token with next-auth or your auth provider
// For now, we'll parse a simple format: "userId:username:role"
// In production, you should verify JWT tokens properly
```

**Action:**
- Integrate with next-auth session validation
- Use JWT verify with secret
- Add token expiration checks
- Add refresh token logic

---

### 2. Rate Limiting Implementation
**File:** `lib/socket/middleware.ts:88`
**Current:** No rate limiting (all connections allowed)
**Required:** Connection and event rate limiting
**Risk:** DoS attacks, spam, abuse
**Effort:** 3-4 hours

```typescript
// TODO: Implement rate limiting
// For now, just allow all connections
next();
```

**Action:**
- Use existing rate-limiter.ts infrastructure
- Add per-user connection limits
- Add per-event rate limits
- Add IP-based limits for anonymous users

---

### 3. Audit Log Database Storage
**Files:** `lib/audit/logger.ts:78, 293`
**Current:** Console.log only
**Required:** Persistent storage in AuditLog table
**Risk:** No audit trail for compliance
**Effort:** 4-5 hours

```typescript
// TODO: Store in dedicated AuditLog table when available
// For now, we'll create a simple logging mechanism
console.log('[AUDIT]', JSON.stringify(logData));
```

**Action:**
- Create AuditLog Prisma model
- Run migration
- Implement database write
- Add query/export endpoints

---

## 🟡 MEDIUM PRIORITY (Database Schema)

### 4. Add updatedAt to Tournament Schema
**Files:** Multiple route files
**Current:** Manual `updatedAt: new Date().toISOString()`
**Required:** Prisma auto-managed updatedAt field
**Risk:** Inconsistent timestamps
**Effort:** 1 hour

**Locations:**
- `app/api/tournaments/[id]/route.ts:111, 339`
- `app/api/tournaments/route.ts:133, 295`

**Action:**
```prisma
model Tournament {
  // ... existing fields
  updatedAt DateTime @updatedAt // Add this
}
```

---

### 5. Add suspendedUntil to User Schema
**File:** `app/api/admin/users/[id]/suspend/route.ts:94`
**Current:** Cannot track suspension expiration
**Required:** Suspension expiration tracking
**Effort:** 1 hour

**Action:**
```prisma
model User {
  // ... existing fields
  suspendedUntil DateTime? // Add this
}
```

---

### 6. Implement Tenant Extraction
**Files:** Multiple API routes
**Current:** Hardcoded or missing tenant checks
**Required:** Proper multi-tenant isolation
**Risk:** Cross-tenant data leaks
**Effort:** 5-6 hours

**Locations:**
- `app/api/players/[id]/statistics/route.ts:44`
- `app/api/players/[id]/matches/route.ts:57`
- `app/api/players/search/route.ts:58`
- `app/api/tournaments/[id]/eta/route.ts:162`

**Action:**
- Create centralized tenant extraction utility
- Use session orgId consistently
- Add tenant validation middleware
- Update all affected routes

---

## 🟡 MEDIUM PRIORITY (Features)

### 7. Finals Cutoff Bracket Generation
**File:** `lib/finals-cutoff.ts:339`
**Current:** Stub implementation
**Required:** Auto-generate bracket after cutoff
**Effort:** 2-3 hours

```typescript
// TODO: Call bracket generation logic
```

**Action:**
- Import bracket-generator.ts
- Call generateSingleElimination() or generateDoubleElimination()
- Create matches for finalists
- Emit socket events

---

### 8. Production Webhook Queue
**File:** `lib/api/queues/webhook.queue.ts:9`
**Current:** In-memory queue
**Required:** Persistent queue (BullMQ, pg-boss, Vercel Queue)
**Risk:** Lost webhooks on restart
**Effort:** 6-8 hours

```typescript
// TODO: Replace with Vercel Queue, BullMQ, or pg-boss for production use.
```

**Action:**
- Choose queue provider (recommend BullMQ with Redis)
- Implement queue adapter
- Add retry logic
- Add monitoring/metrics

---

## 🟢 LOW PRIORITY (Nice-to-Have)

### 9. PWA Install Prompt
**File:** `app/console/room/[tournamentId]/page.tsx:268`
**Effort:** 2 hours

### 10. Export Job Processor
**File:** `lib/analytics/jobs/start-workers.ts:96`
**Effort:** 3-4 hours

### 11. Scheduled Report Processor
**File:** `lib/analytics/jobs/start-workers.ts:101`
**Effort:** 3-4 hours

### 12. Prize Money Tracking
**File:** `app/api/v1/leaderboards/route.ts:169`
**Effort:** 4-5 hours

### 13. Venue API Implementation
**Files:** `app/api/v1/venues/` (multiple routes)
**Effort:** 8-10 hours

---

## 🪵 Logging Refactoring

### Console.log Replacement
**Count:** 991 instances across 100 files
**Current:** Raw console.log/warn/error
**Required:** Structured logging with winston/pino
**Effort:** 10-15 hours

**Action Plan:**
1. Install winston or pino
2. Create logger utility with levels (debug, info, warn, error)
3. Add contextual metadata (userId, tournamentId, etc.)
4. Replace console.* with logger.*
5. Configure log aggregation (Datadog, LogRocket, etc.)

**Benefits:**
- Searchable logs
- Log levels for production
- Structured JSON output
- Integration with monitoring tools

---

## Recommended Implementation Order

### Week 1: Security & Critical
1. ✅ Socket JWT authentication (2-3 hrs)
2. ✅ Rate limiting (3-4 hrs)
3. ✅ Audit log database (4-5 hrs)

**Total: 9-12 hours**

### Week 2: Schema & Data Integrity
4. ✅ Add updatedAt to Tournament (1 hr)
5. ✅ Add suspendedUntil to User (1 hr)
6. ✅ Implement tenant extraction (5-6 hrs)

**Total: 7-8 hours**

### Week 3: Features & Production Readiness
7. ✅ Finals cutoff bracket generation (2-3 hrs)
8. ✅ Production webhook queue (6-8 hrs)

**Total: 8-11 hours**

### Week 4: Logging & Observability
9. ✅ Replace console.log with structured logging (10-15 hrs)

**Total: 10-15 hours**

---

## Progress Tracking

**HIGH PRIORITY:** ✅ 3/3 complete (100%)
- ✅ Socket JWT authentication
- ✅ Rate limiting
- ✅ Audit log database

**MEDIUM PRIORITY (Schema):** ✅ 3/3 complete (100%)
- ✅ Add updatedAt to Tournament
- ✅ Add suspendedUntil to User (already in schema)
- ✅ Tenant extraction

**MEDIUM PRIORITY (Features):** ✅ 1/2 complete (50%)
- ✅ Finals cutoff bracket generation
- ⏳ Production webhook queue

**LOW PRIORITY:** ⏳ 0/5 complete
- ⏳ PWA install prompt
- ⏳ Export job processor
- ⏳ Scheduled report processor
- ⏳ Prize money tracking
- ⏳ Venue API

**LOGGING:** ⏳ 0/1 complete
- ⏳ Console.log replacement

**Last Updated:** 2025-11-11
