# Testing Strategy for Next.js API Routes

## Overview

This document outlines the testing approach for API routes in the tournament platform, including unit tests, integration tests, and contract tests.

## Test Types

### 1. Unit Tests (`*.test.ts`)

**Purpose:** Test route handlers in isolation

**Characteristics:**

- Call handler functions directly (e.g., `GET()`, `POST()`)
- Mock dependencies (database, auth, external services)
- Fast execution (< 100ms per test)
- No middleware execution
- No HTTP server required

**Example:**

```typescript
// route.test.ts
import { GET } from './route';

it('should return 200 OK', async () => {
  const response = await GET();
  expect(response.status).toBe(200);
});
```

**Limitations:**

- ⚠️ Bypasses middleware (auth, tenant context, etc.)
- ⚠️ Doesn't test full request flow
- ⚠️ Can miss integration issues

### 2. Integration Tests (`*.integration.test.ts`)

**Purpose:** Test complete request flow through middleware

**Characteristics:**

- Make actual HTTP requests
- Test through full Next.js stack
- Include middleware execution
- Verify auth, tenant isolation, redirects
- Slower execution (100-500ms per test)

**Example:**

```typescript
// route.integration.test.ts
it('should redirect unauthenticated users', async () => {
  const response = await fetch('http://localhost:3000/api/tournaments', {
    redirect: 'manual',
  });
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe('/login');
});
```

**Requirements:**

- Next.js test server running
- Test database available
- Port isolation for parallel tests

### 3. Contract Tests (`*.contract.test.ts`)

**Purpose:** Verify API contracts match TypeScript definitions

**Characteristics:**

- Validate request/response schemas
- Ensure Zod validation works
- Test multi-tenant isolation
- Verify error responses

**Example:**

```typescript
// route.contract.test.ts
import { TournamentSchema } from '@tournament/api-contracts';

it('should return valid tournament schema', async () => {
  const response = await fetch('http://localhost:3000/api/tournaments/123');
  const data = await response.json();

  const result = TournamentSchema.safeParse(data.tournament);
  expect(result.success).toBe(true);
});
```

## Current Status (Week 1)

### ✅ Implemented

- Unit tests for health check endpoint
- Unit tests for middleware configuration
- Unit tests for landing page
- Unit tests for API contracts

### ⚠️ Placeholder Integration Tests

- Integration tests exist but use placeholders
- Will be enabled when test infrastructure is ready
- See TODO comments in `*.integration.test.ts` files

### ❌ Not Yet Implemented

- Full HTTP integration tests
- Contract validation tests
- End-to-end tests
- Performance tests
- Load tests

## Testing Best Practices

### Multi-Tenant Isolation

**Always test:**

1. Tenant_id is required for protected endpoints
2. Users cannot access other tenants' data
3. List endpoints filter by tenant context
4. Tenant context comes from auth headers

**Example:**

```typescript
it('should filter tournaments by tenant_id', async () => {
  // Create tournaments for tenant A
  await createTournament({ tenant_id: 'tenant-a', name: 'A1' });

  // Request as tenant B
  const response = await fetch('http://localhost:3000/api/tournaments', {
    headers: { 'X-Tenant-ID': 'tenant-b' },
  });
  const data = await response.json();

  // Should not see tenant A's tournaments
  expect(data.tournaments).toHaveLength(0);
});
```

### Public Endpoints

**Always test:**

1. No authentication required
2. No redirect to /login
3. Returns 200 OK (not 302)
4. Works without cookies/headers

**Example:**

```typescript
it('should allow public access', async () => {
  const response = await fetch('http://localhost:3000/api/health');
  expect(response.status).toBe(200); // Not 302
  expect(response.headers.get('location')).toBeNull();
});
```

### Error Handling

**Always test:**

1. Invalid input returns 400 Bad Request
2. Missing auth returns 401 Unauthorized
3. Insufficient permissions returns 403 Forbidden
4. Not found returns 404 Not Found
5. Server errors return 500 with error schema

**Example:**

```typescript
it('should return 400 for invalid input', async () => {
  const response = await fetch('http://localhost:3000/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({ name: '' }), // Invalid: empty name
  });
  expect(response.status).toBe(400);

  const error = await response.json();
  expect(error).toMatchObject({
    error: {
      code: expect.any(String),
      message: expect.any(String),
    },
  });
});
```

## Test Infrastructure (Future)

### Sprint 1 Setup

- [ ] Configure Next.js test server
- [ ] Set up test database (PostgreSQL)
- [ ] Configure authentication mocks
- [ ] Set up port isolation
- [ ] Add test helpers/utilities

### Sprint 2+ Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Set up CI test database
- [ ] Add performance benchmarks
- [ ] Configure code coverage reporting
- [ ] Add load testing (k6 or Artillery)

## Running Tests

### Current (Week 1)

```bash
# Run all tests
pnpm test

# Run tests for specific app
pnpm --filter=web test

# Run tests in watch mode
pnpm test --watch
```

### Future (When Integration Tests Ready)

```bash
# Run only unit tests (fast)
pnpm test:unit

# Run only integration tests (slower)
pnpm test:integration

# Run all tests
pnpm test:all

# Run tests with coverage
pnpm test:coverage
```

## Coverage Goals

| Type                  | Current | Sprint 1 Goal | Sprint 3 Goal |
| --------------------- | ------- | ------------- | ------------- |
| **Unit Tests**        | 5%      | 60%           | 80%           |
| **Integration Tests** | 0%      | 30%           | 60%           |
| **E2E Tests**         | 0%      | 10%           | 30%           |
| **Overall Coverage**  | 5%      | 50%           | 70%           |

## Critical Paths to Test

### Authentication Flow

1. Login with valid credentials → 200 OK
2. Login with invalid credentials → 401
3. Access protected route without auth → 302 /login
4. Access protected route with auth → 200 OK
5. Session expiry handling

### Multi-Tenant Isolation

1. List resources → Only tenant's data
2. Get resource by ID → 404 if wrong tenant
3. Create resource → tenant_id from auth
4. Update resource → 403 if wrong tenant
5. Delete resource → 403 if wrong tenant

### CRUD Operations

1. Create valid resource → 201 Created
2. Create invalid resource → 400 Bad Request
3. Get existing resource → 200 OK
4. Get non-existent resource → 404 Not Found
5. Update resource → 200 OK
6. Delete resource → 204 No Content

## Regression Prevention

### Critical Bugs to Prevent

1. **Middleware Public Routes** (PR #3)
   - Test: Public endpoints don't redirect
   - Integration test required

2. **Tenant Isolation**
   - Test: Cross-tenant access blocked
   - Contract test required

3. **Authentication Bypass**
   - Test: Protected routes require auth
   - Integration test required

## References

- [Next.js Testing Docs](https://nextjs.org/docs/testing)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Zod Validation](https://zod.dev/)

---

**Last Updated:** 2025-11-04 (Week 1)
**Next Review:** Sprint 1 Day 1 (when test infrastructure is ready)
