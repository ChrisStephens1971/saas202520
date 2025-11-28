# API Tests - Quick Reference

## Running Tests

### All Tests

```bash
# From project root
pnpm test

# From web app only
cd apps/web && pnpm test
```

### Specific Test Suites

```bash
# Scoring tests
pnpm test score

# Payment tests
pnpm test payment

# Permission tests
pnpm test scorekeeper
```

### Watch Mode

```bash
pnpm test --watch
```

### Coverage Report

```bash
pnpm test:coverage
```

### UI Mode

```bash
pnpm test:ui
```

## Test Files

### Test Utilities

- `__tests__/utils/test-helpers.ts` - Shared mocking utilities and factories

### Scoring API Tests

- `matches/[id]/score/increment/route.test.ts` (28 tests)
- `matches/[id]/score/undo/route.test.ts` (26 tests)
- `matches/[id]/score/history/route.test.ts` (13 tests)

### Payment API Tests

- `payments/stripe/onboarding/route.test.ts` (15 tests)
- `payments/create-intent/route.test.ts` (14 tests)

### Permission API Tests

- `organizations/[id]/scorekeepers/route.test.ts` (22 tests)

## Documentation

- **Full Summary:** `__tests__/SPRINT-3-TEST-SUMMARY.md`
- **Test Strategy:** `../TESTING-STRATEGY.md`
- **Coding Standards:** `C:\devop\coding_standards.md`

## Quick Debugging

### Failed Test?

1. Check the test output for specific assertion failure
2. Review the mock setup in `beforeEach()`
3. Verify mock return values match expected structure
4. Check that all mocks are cleared between tests

### Mock Not Working?

1. Ensure mock is defined before imports
2. Check `jest.mock()` path matches actual import path
3. Verify mock is reset in `beforeEach()`
4. Use `mockFn.mockClear()` vs `jest.clearAllMocks()`

### Need to Add Tests?

1. Use existing test files as templates
2. Reuse test helpers from `test-helpers.ts`
3. Follow AAA pattern (Arrange, Act, Assert)
4. Group tests by concern (auth, validation, business logic)

## Common Patterns

### Mock Session

```typescript
import { createMockSession } from '../__tests__/utils/test-helpers';

mockGetServerSession.mockResolvedValue(createMockSession());
```

### Mock Prisma

```typescript
import { createMockPrisma, factories } from '../__tests__/utils/test-helpers';

const mockPrisma = createMockPrisma();
mockPrisma.match.findUnique.mockResolvedValue(factories.match());
```

### Mock Stripe

```typescript
import { createMockStripe } from '../__tests__/utils/test-helpers';

const mockStripe = createMockStripe();
```

### Test Factory

```typescript
import { factories } from '../__tests__/utils/test-helpers';

const match = factories.match({ score: { playerA: 5, playerB: 3 } });
const tournament = factories.tournament();
const payment = factories.payment({ amount: 5000 });
```

## Status

✅ **Implemented:** 118 tests across 6 test files
⏳ **Pending:** Payment endpoints (confirm, refund, dispute-evidence, account)
⏳ **Pending:** Payout endpoints (calculate, list, mark-paid)

**Last Updated:** 2025-11-05
