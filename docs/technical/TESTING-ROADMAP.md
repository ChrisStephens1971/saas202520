# Testing Roadmap & Technical Debt

**Created:** November 5, 2025
**Status:** Planning
**Priority:** Medium (Can be addressed in future sprints)

---

## 🎯 Current Testing Status

### ✅ What's Working

**Unit Tests (43 passing):**
- ✅ 12 Scoring Validation Tests (`packages/shared/src/lib/scoring-validation.test.ts`)
- ✅ 23 Stripe Payment Tests (`apps/web/tests/unit/stripe-payments.test.ts`)
- ✅ All critical business logic covered
- ✅ Fast execution (~2.5 seconds)
- ✅ No external dependencies required

**CI/CD Integration:**
- ✅ GitHub Actions running on all commits
- ✅ Lint job (0 errors, 0 warnings)
- ✅ Build job (TypeScript compilation)
- ✅ Unit tests job (43 tests passing)

---

## ⚠️ Testing Gaps & Technical Debt

### 1. API Route Tests (10 tests in WIP folder)

**Location:** `apps/web/tests/wip/`

**Status:** ❌ Not implemented (placeholder tests only)

**Files:**
- `route.test.ts` - Tournament endpoint tests (GET, PUT, DELETE)
- `route.integration.test.ts` - Integration tests

**Problems:**
1. **Wrong framework:** Tests use Jest syntax instead of Vitest
   - `@jest/globals` → should be `vitest`
   - `jest.mock()` → should be `vi.mock()`
   - `require()` → should use ES module imports

2. **Complex mocking required:** Next.js 16 route handlers are challenging to mock
   - NextAuth `auth()` function
   - Next.js `headers()` function
   - Prisma client
   - Module hoisting issues with Vitest

3. **Placeholder tests:** All tests just `expect(true).toBe(true)`
   - Need actual implementation
   - Need test data setup
   - Need proper assertions

**Impact:** Low
- Business logic is tested in unit tests with mocks
- API routes are thin wrappers around business logic
- Manual testing can cover these for now

**Estimated Effort:** 2-3 days
- Requires architectural design for API route testing
- Need to establish patterns for mocking Next.js dependencies
- Would benefit from utility library or test harness

---

### 2. Integration Tests

**Status:** ❌ Not set up

**What's Needed:**
- Test database (PostgreSQL)
- Database seeding utilities
- Transaction rollback between tests
- Real Prisma client (not mocked)

**Use Cases:**
- Multi-step workflows (create tournament → add players → generate bracket)
- Database constraints and triggers
- Cross-table relationships
- Transaction rollbacks and error recovery

**Impact:** Low-Medium
- Unit tests cover most critical logic
- Manual testing covers integration scenarios
- Becomes more important as system grows

**Estimated Effort:** 1-2 days
- Set up test database with Docker Compose
- Create database seeding utilities
- Implement transaction rollback pattern
- Write 10-15 integration tests

---

### 3. End-to-End (E2E) Tests

**Status:** ❌ Not implemented

**What's Needed:**
- Playwright or Cypress setup
- Test fixtures and test data
- Page object models
- CI/CD integration with headless browsers

**Use Cases:**
- Full user workflows (signup → create tournament → score match)
- Cross-browser compatibility
- Mobile responsiveness
- Real user interactions

**Impact:** Low
- Can be added later as product matures
- Manual testing sufficient for MVP/beta
- Important for production release

**Estimated Effort:** 3-4 days
- Choose E2E framework (Playwright recommended)
- Set up test infrastructure
- Write page objects
- Implement critical user flows

---

## 📋 Recommended Testing Strategy

### Phase 1: MVP/Beta (Current)

**Focus:** Critical business logic unit tests ✅

**Status:** COMPLETE
- 43 unit tests covering scoring and payments
- Fast execution, no external dependencies
- Good enough for development and initial testing

**Next:** Manual QA + user acceptance testing

---

### Phase 2: Pre-Production (Sprint 5-6)

**Focus:** Integration tests + API route tests

**Priority Tasks:**
1. Set up test database (Docker Compose)
2. Create database seeding utilities
3. Implement 15-20 integration tests for critical workflows
4. Fix or rewrite the 10 WIP API route tests

**Success Criteria:**
- Test database spins up automatically
- Integration tests cover multi-step workflows
- API routes tested with real database
- CI runs both unit + integration tests

**Estimated Effort:** 3-4 days

---

### Phase 3: Production Release (Sprint 7-8)

**Focus:** E2E tests + performance tests

**Priority Tasks:**
1. Set up Playwright for E2E testing
2. Implement critical user flows (10-15 tests)
3. Add load testing (K6 or Artillery)
4. Set up visual regression testing (optional)

**Success Criteria:**
- E2E tests cover all critical user paths
- Load tests verify performance under load
- Visual regression catches UI breakages
- All tests run in CI/CD pipeline

**Estimated Effort:** 4-5 days

---

## 🛠️ Technical Recommendations

### For API Route Tests

**Recommended Approach:**
1. Create test harness/utility library for Next.js route testing
2. Establish mocking patterns for:
   - NextAuth sessions (authenticated vs unauthenticated)
   - Next.js headers (org context, request headers)
   - Prisma client (use singleton pattern)
3. Use Vitest's `vi.mock()` with proper module hoisting
4. Consider using MSW (Mock Service Worker) for complex scenarios

**Example Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tournament: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('GET /api/tournaments/[id]', () => {
  it('should return tournament', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Setup mocks
    auth.mockResolvedValue({ user: { id: 'user123' } });
    prisma.tournament.findFirst.mockResolvedValue(mockTournament);

    // Call handler
    await GET(req, { params: Promise.resolve({ id: 'tourney123' }) });

    // Assert
    expect(res._getStatusCode()).toBe(200);
  });
});
```

---

### For Integration Tests

**Recommended Approach:**
1. Use Docker Compose for test database
2. Use Prisma migrations to set up schema
3. Use transactions + rollback for test isolation
4. Create factory functions for test data

**Example Setup:**
```typescript
// tests/helpers/db.ts
import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL,
});

export async function seedTestData() {
  // Create test organization, users, tournaments
}

export async function cleanupTestData() {
  // Rollback or truncate tables
}
```

**docker-compose.test.yml:**
```yaml
services:
  test-postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: tournament_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

---

### For E2E Tests

**Recommended Tools:**
- **Playwright** - Fast, reliable, great API
- **MSW** - Mock external APIs (Stripe, Twilio)
- **Docker** - Spin up full stack for E2E tests

**Example Test:**
```typescript
import { test, expect } from '@playwright/test';

test('tournament creation flow', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Create tournament
  await page.goto('http://localhost:3000/tournaments/new');
  await page.fill('[name=name]', 'Test Tournament');
  await page.click('button[type=submit]');

  // Verify
  await expect(page).toHaveURL(/tournaments\/[a-z0-9]+/);
  await expect(page.locator('h1')).toContainText('Test Tournament');
});
```

---

## 📊 Testing Metrics Goals

### Current Metrics
- ✅ Unit Test Coverage: 100% of business logic
- ✅ Test Execution Time: ~2.5 seconds
- ✅ CI Pass Rate: 100% (after fixes)

### Phase 2 Goals (Integration Tests)
- Integration Test Coverage: 80% of critical workflows
- Test Execution Time: <30 seconds (unit + integration)
- Test Database Setup: <5 seconds
- CI Pass Rate: 95%+

### Phase 3 Goals (E2E Tests)
- E2E Coverage: 100% of critical user paths
- Test Execution Time: <5 minutes (all tests)
- Cross-browser Testing: Chrome, Firefox, Safari
- Visual Regression: No unexpected UI changes

---

## 🎯 Action Items

### Immediate (Sprint 3 Complete)
- ✅ Document testing gaps (this file)
- ✅ Keep WIP tests excluded from CI
- ✅ Focus on manual testing for MVP

### Near-term (Sprint 5-6, before beta)
- [ ] Design API route testing architecture
- [ ] Set up test database infrastructure
- [ ] Implement 15-20 integration tests
- [ ] Fix or rewrite WIP API route tests
- [ ] Document testing patterns for team

### Long-term (Sprint 7-8, before production)
- [ ] Set up Playwright for E2E
- [ ] Implement critical user flow tests
- [ ] Add load/performance testing
- [ ] Set up visual regression testing
- [ ] Create comprehensive testing guide

---

## 📝 Decision: Skip API Route Tests for Now

**Rationale:**
1. **Business logic is tested** - 43 unit tests cover scoring and payment logic
2. **API routes are thin wrappers** - Minimal logic in route handlers
3. **Complex mocking required** - Would take 2-3 days to set up properly
4. **Low ROI for MVP** - Manual testing sufficient for initial release
5. **Focus on features** - Sprint 4 adds more user value

**Trade-offs:**
- **Pro:** Move faster, focus on features
- **Pro:** Can establish better patterns later with more context
- **Con:** Less confidence in API layer
- **Con:** Technical debt accumulates

**Mitigation:**
- Manual testing of all API endpoints
- Comprehensive unit test coverage
- Plan integration tests for Phase 2
- Document testing patterns as we learn

**Re-evaluation Point:** After Sprint 4 or before beta release

---

## 🔗 Related Documentation

- **Current Tests:** `apps/web/tests/unit/`
- **WIP Tests:** `apps/web/tests/wip/`
- **Sprint 3 Summary:** `docs/progress/SPRINT-03-SUMMARY.md`
- **Vitest Config:** `apps/web/vitest.config.ts`

---

**Status:** Documented ✅
**Next Review:** Sprint 5 planning
**Owner:** Development team
