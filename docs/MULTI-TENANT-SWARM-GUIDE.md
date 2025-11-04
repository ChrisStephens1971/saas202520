# Multi-Tenant Swarm Guide

## Overview

This swarm system is configured for **subdomain-based multi-tenant** architecture. Every agent operation must respect tenant isolation.

## Key Principles

### 1. Tenant Isolation is Non-Negotiable

Every database query, API endpoint, and file operation MUST include tenant_id scoping.

**Correct:**
```typescript
// Good - includes tenant_id
const tournaments = await prisma.tournament.findMany({
  where: { tenant_id: tenantId }
});
```

**Incorrect:**
```typescript
// BAD - no tenant scoping!
const tournaments = await prisma.tournament.findMany();
```

### 2. Subdomain Routing

Users access the application via their tenant subdomain:
- `https://tenant-a.tournament.com`
- `https://tenant-b.tournament.com`

The middleware extracts tenant_id from the subdomain on every request.

### 3. API Headers

All API requests must include:
```
X-Tenant-ID: <uuid>
```

The backend validates this header matches the authenticated user's tenant.

## Agent Responsibilities

### Contract Worker

When creating/modifying API endpoints:

**Checklist:**
- [ ] Schema includes `tenant_id: string (uuid)` field
- [ ] Endpoint requires `X-Tenant-ID` header
- [ ] Response filters by tenant_id
- [ ] Contract tests validate tenant scoping
- [ ] Examples show tenant_id usage

### Backend Worker

When implementing features:

**Checklist:**
- [ ] All database queries include `{ tenant_id: tenantId }`
- [ ] Middleware validates tenant_id
- [ ] No cross-tenant data leakage
- [ ] Unit tests create data per tenant
- [ ] Integration tests validate isolation

**Required patterns:**

```typescript
// Prisma queries
const result = await prisma.model.findMany({
  where: {
    tenant_id: ctx.tenantId,  // ALWAYS include
    // ... other filters
  }
});

// Creating records
const record = await prisma.model.create({
  data: {
    tenant_id: ctx.tenantId,  // ALWAYS include
    // ... other fields
  }
});
```

### Frontend Worker

When building UI:

**Checklist:**
- [ ] Subdomain displayed in header
- [ ] API client includes X-Tenant-ID header
- [ ] No hardcoded tenant references
- [ ] Test multi-tenant scenarios
- [ ] Handle tenant-not-found errors

**Required patterns:**

```typescript
// API calls
const response = await fetch('/api/tournaments', {
  headers: {
    'X-Tenant-ID': getTenantId(),
    'Authorization': `Bearer ${token}`
  }
});
```

### Test Worker

When writing tests:

**Checklist:**
- [ ] Create separate data for each tenant
- [ ] Test cross-tenant access is denied
- [ ] Validate subdomain routing
- [ ] Check tenant_id in all API responses
- [ ] Test tenant context in authentication

**Required tests:**

```typescript
// Tenant isolation test
test('Tenant A cannot access Tenant B data', async () => {
  const tenantA = createTenant('tenant-a');
  const tenantB = createTenant('tenant-b');

  const tournamentA = createTournament({ tenant_id: tenantA.id });

  // Try to access with Tenant B context
  const result = await api
    .get(`/tournaments/${tournamentA.id}`)
    .set('X-Tenant-ID', tenantB.id);

  expect(result.status).toBe(404);
});
```

## Automated Checks

### Contract Tests

Every PR is automatically checked for:
- tenant_id in schema definitions
- X-Tenant-ID header requirement
- No cross-tenant path patterns

### Backend Tests

Every PR runs:
- Query analysis for missing tenant_id
- Prisma query validation
- Integration tests with multi-tenant data

### E2E Tests

Playwright tests validate:
- Subdomain routing
- Cross-tenant access denial
- API header inclusion

## Security Implications

### Automatic Human Review Triggers

The reviewer automatically requires human approval for:

- `**/tenant/**` - Tenant isolation logic
- `**/middleware/tenant/**` - Tenant context middleware
- `**/tenant-isolation/**` - Isolation utilities
- `**/tenant-context/**` - Context management
- `**/cross-tenant/**` - Any cross-tenant features

### Common Vulnerabilities

1. **Query without tenant_id**
   ```typescript
   // Vulnerable!
   const users = await prisma.user.findMany();
   ```

2. **Path traversal**
   ```typescript
   // Vulnerable!
   const file = fs.readFileSync(`/uploads/${req.params.filename}`);
   // Should include tenant: /uploads/${tenantId}/${filename}
   ```

3. **Cached data leak**
   ```typescript
   // Vulnerable!
   const cache = redis.get('tournaments');
   // Should include tenant: redis.get(`${tenantId}:tournaments`)
   ```

4. **Subdomain bypass**
   ```typescript
   // Vulnerable!
   if (req.header('host').startsWith('admin')) {
     // Allow access
   }
   // Should check: req.tenantId === 'system-tenant'
   ```

## Rollout Strategy

### Phase 1: Single Tenant Validation (Week 1)

1. Create one test tenant
2. Manually verify all features work
3. Check for any hardcoded values

### Phase 2: Multi-Tenant Testing (Week 2)

1. Create 2-3 test tenants
2. Verify data isolation
3. Test subdomain routing
4. Run full test suite

### Phase 3: Production (Week 3+)

1. Enable swarm in automated mode
2. Monitor for tenant isolation issues
3. Review security alerts carefully
4. Validate each deployment

## Monitoring

### Key Metrics

- **Cross-tenant queries**: Should be ZERO
- **Missing tenant_id**: Should be ZERO
- **Subdomain errors**: Should be <1%
- **Tenant context failures**: Should be ZERO

### Alerts to Configure

1. **Query without tenant_id detected**
   - Severity: CRITICAL
   - Action: Immediate rollback

2. **Cross-tenant access attempt**
   - Severity: CRITICAL
   - Action: Security review

3. **Subdomain routing failure**
   - Severity: HIGH
   - Action: Investigate immediately

## Best Practices

1. **Always test with multiple tenants**
2. **Never trust client-provided tenant_id**
3. **Validate tenant_id in middleware**
4. **Use tenant-scoped caching**
5. **Include tenant in all logs**
6. **Test subdomain routing in preview**
7. **Document tenant-specific behavior**

## Troubleshooting

### User Can See Other Tenant's Data

**Check:**
1. Database queries include tenant_id?
2. API endpoints validate X-Tenant-ID?
3. Cache keys include tenant_id?

**Fix:**
```bash
# Search for queries without tenant_id
grep -r "findMany\|findFirst" apps/ packages/ | grep -v "tenant_id"

# Review and fix each occurrence
```

### Subdomain Not Routing Correctly

**Check:**
1. DNS configuration
2. Middleware tenant extraction
3. Environment subdomain setting

**Fix:**
```typescript
// Verify middleware
const subdomain = req.hostname.split('.')[0];
const tenant = await getTenantBySubdomain(subdomain);
req.tenantId = tenant.id;
```

### Agent Bypassing Tenant Checks

**Check:**
1. Review CODEOWNERS - security paths configured?
2. Check workflow - security-scan job passing?
3. Verify config.json - security paths listed?

**Fix:**
```bash
# Force human review for tenant code
gh pr edit 123 --add-label "security-review"
```

---

*For operational procedures, see SWARM-RUNBOOK.md*