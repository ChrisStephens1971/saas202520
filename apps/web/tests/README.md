# Stripe Payment Integration Tests

Comprehensive integration tests for Stripe payment workflows in the tournament platform.

## Overview

This test suite covers complete payment workflows including:

- Stripe Connect account onboarding
- Payment intent creation and confirmation
- Full and partial refunds
- Payout calculations with multiple prize structures
- Account status verification
- Error handling scenarios

## Test Structure

```
tests/
├── integration/
│   └── stripe-payments.test.ts      # Main integration test suite
├── fixtures/
│   ├── stripe-mocks.ts              # Stripe SDK mock factories
│   └── test-data.ts                 # Database test fixtures
├── setup.ts                         # Global test setup
└── README.md                        # This file
```

## Prerequisites

### 1. Install Dependencies

```bash
cd apps/web
pnpm install
```

Required packages:

- `vitest` - Test runner
- `@vitest/ui` - UI dashboard for tests
- `@vitest/coverage-v8` - Code coverage reporting
- `@prisma/client` - Database ORM

### 2. Database Setup

Tests require a PostgreSQL database. Set up a test database:

```bash
# Create test database
createdb tournament_test

# Set environment variable (or add to .env.test)
export DATABASE_URL="postgresql://user:password@localhost:5432/tournament_test"

# Run migrations
cd ../..
pnpm db:migrate
```

### 3. Environment Variables

Create `.env.test` in `apps/web/`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/tournament_test"
STRIPE_SECRET_KEY="sk_test_mock_key_for_testing"
NEXTAUTH_SECRET="test-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Running Tests

### Run All Tests

```bash
cd apps/web
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test
```

### Run Tests Once (CI Mode)

```bash
pnpm test:run
```

### Run with UI Dashboard

```bash
pnpm test:ui
```

Open browser to `http://localhost:51204` to view interactive test dashboard.

### Run with Coverage

```bash
pnpm test:coverage
```

Coverage report will be generated in `coverage/` directory.

### Run Specific Test File

```bash
pnpm test stripe-payments
```

### Run Specific Test Suite

```bash
pnpm test -t "Complete Payment Flow"
```

### Run Specific Test Case

```bash
pnpm test -t "should create payment intent for entry fee"
```

## Test Scenarios

### 1. Complete Payment Flow (4 tests)

Tests the full end-to-end payment workflow:

- **Create Stripe account and complete onboarding**
  - Creates Connect account
  - Generates onboarding link
  - Stores account in database

- **Create payment intent for entry fee**
  - Creates payment intent with metadata
  - Stores payment in database with `pending` status

- **Confirm payment and generate receipt**
  - Simulates payment confirmation
  - Retrieves receipt URL from Stripe
  - Updates payment status to `succeeded`

- **Verify database records**
  - Validates all relationships
  - Confirms tenant isolation

### 2. Refund Flow (5 tests)

Tests refund scenarios:

- **Process full refund**
  - Creates 100% refund
  - Updates payment status to `refunded`

- **Process partial refund**
  - Creates 50% refund
  - Updates status to `partially_refunded`

- **Prevent refund exceeding payment amount**
  - Validates refund limits
  - Tests Stripe error handling

- **Handle multiple partial refunds**
  - Creates two partial refunds totaling 100%
  - Verifies cumulative refund amount

- **Verify refund status updates**
  - Tests pending → succeeded transitions

### 3. Payout Calculation (4 tests)

Tests prize pool distribution:

- **Calculate payouts with 50/30/20 structure**
  - 8 players × $50 = $400 pool
  - 1st: $200, 2nd: $120, 3rd: $80

- **Handle house take calculation**
  - 10% house take from prize pool
  - Distributes remaining 90%

- **Include side pots in calculation**
  - Separate tracking for entry fees vs. side pots
  - Multiple payout sources

- **Verify amounts match collected fees**
  - Validates total payouts = total collected

### 4. Stripe Account Status (4 tests)

Tests account state management:

- **Detect onboarding incomplete state**
  - Checks `details_submitted`, `charges_enabled`, `payouts_enabled`

- **Verify charges_enabled flag**
  - Tests payment creation with disabled charges

- **Verify payouts_enabled flag**
  - Tests payout restrictions

- **Refresh account status from Stripe**
  - Simulates webhook updates
  - Syncs database with Stripe state

### 5. Error Handling (6 tests)

Tests error scenarios:

- **Handle Stripe API errors**
  - Tests 500 errors from Stripe

- **Prevent duplicate payment intents**
  - Tests unique constraint on `stripePaymentIntent`

- **Handle refund failures**
  - Tests failed refund scenarios

- **Handle missing Stripe account**
  - Tests 404 errors

- **Handle card declined errors**
  - Tests payment failures

- **Handle payment intent not found**
  - Tests invalid payment intent IDs

## Test Data

### Mock Factories

Located in `tests/fixtures/stripe-mocks.ts`:

- `createMockStripeAccount()` - Stripe Connect account
- `createMockAccountLink()` - Onboarding link
- `createMockPaymentIntent()` - Payment intent
- `createMockCharge()` - Charge object (for receipts)
- `createMockRefund()` - Refund object
- `stripeErrors.*` - Common error scenarios

### Database Fixtures

Located in `tests/fixtures/test-data.ts`:

- `createTestOrganization()` - Test organization
- `createTestTournament()` - Test tournament
- `createTestPlayer()` - Test player
- `createTestStripeAccount()` - Database Stripe account
- `createTestPayment()` - Database payment
- `createTestRefund()` - Database refund
- `createTestPayout()` - Database payout
- `prizeStructures.*` - Prize distribution templates

## Mocking Strategy

### Stripe SDK Mocking

The Stripe SDK is fully mocked using Vitest's `vi.mock()`:

```typescript
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      accounts: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      refunds: {
        create: vi.fn(),
      },
    })),
  };
});
```

**Benefits:**

- No real Stripe API calls during tests
- Fast test execution
- Deterministic test results
- No API rate limits

### Database Mocking

Tests use a real PostgreSQL database with:

- **Clean slate before each test** - All tables cleared
- **Transaction rollback** - Tests are isolated
- **Sequential execution** - Prevents race conditions

## Multi-Tenant Testing

All tests verify tenant isolation:

```typescript
// Verify tenant isolation
const orgPayments = await prisma.payment.findMany({
  where: {
    stripeAccount: {
      orgId: testOrgId,
    },
  },
});
```

**Ensures:**

- Payments scoped to organization
- No cross-tenant data leakage
- Proper relationship constraints

## Code Coverage

Current coverage targets:

- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

View coverage report:

```bash
pnpm test:coverage
open coverage/index.html
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: tournament_test
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm db:migrate
      - run: pnpm test:run
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/tournament_test
          STRIPE_SECRET_KEY: sk_test_mock
```

## Debugging Tests

### Enable Debug Logging

```bash
DEBUG=* pnpm test
```

### Use Vitest UI for Debugging

```bash
pnpm test:ui
```

Features:

- Inspect test state
- View mock call history
- Step through test execution
- View console logs per test

### VSCode Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test:run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Writing New Tests

### Test Template

```typescript
test('should do something', async () => {
  // 1. Setup: Create test data
  const dbAccount = await prisma.stripeAccount.create({
    data: createTestStripeAccount(testOrgId),
  });

  // 2. Mock: Configure Stripe responses
  const mockPayment = createMockPaymentIntent({ amount: 5000 });
  mockStripe.paymentIntents.create.mockResolvedValue(mockPayment);

  // 3. Execute: Call function under test
  const result = await stripeLib.createPaymentIntent({
    amount: 5000,
    connectedAccountId: dbAccount.stripeAccountId,
  });

  // 4. Assert: Verify expectations
  expect(result.id).toBeDefined();
  expect(result.amount).toBe(5000);

  // 5. Verify: Check database state
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntent: result.id },
  });
  expect(payment).toBeDefined();
});
```

### Best Practices

1. **Use descriptive test names** - Clearly state what's being tested
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **One assertion per test** - Keep tests focused
4. **Clean up after tests** - Use `afterEach()` hooks
5. **Mock external dependencies** - Don't make real API calls
6. **Test error cases** - Don't only test happy paths
7. **Use fixtures** - Reuse test data factories
8. **Verify database state** - Check side effects

## Troubleshooting

### Database Connection Errors

```
Error: Can't reach database server at `localhost:5432`
```

**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct.

### Migration Errors

```
Error: Database schema is not in sync
```

**Solution:** Run migrations:

```bash
pnpm db:migrate
```

### Mock Not Working

```
Error: mockStripe.paymentIntents.create is not a function
```

**Solution:** Ensure mock is defined in `beforeAll()` before tests run.

### Test Timeout

```
Error: Test timed out after 5000ms
```

**Solution:** Increase timeout or optimize test:

```typescript
test(
  'slow test',
  async () => {
    // test code
  },
  { timeout: 10000 }
); // 10 second timeout
```

## Performance

### Test Execution Time

Target: < 30 seconds for full suite

Current performance:

- Complete Payment Flow: ~2s
- Refund Flow: ~3s
- Payout Calculation: ~2s
- Account Status: ~1s
- Error Handling: ~2s

**Total:** ~10 seconds (23 tests)

### Optimization Tips

1. **Use database transactions** - Faster than manual cleanup
2. **Parallel test execution** - When safe (disabled for DB tests)
3. **Minimize database queries** - Batch operations
4. **Reuse test data** - Share fixtures across tests
5. **Mock external services** - Avoid network calls

## Support

For questions or issues:

- Review test output and error messages
- Check `tests/fixtures/` for available mocks
- Consult Vitest documentation: https://vitest.dev
- Check Stripe API docs: https://stripe.com/docs/api

## Summary

**Total Tests:** 23

- Complete Payment Flow: 4 tests
- Refund Flow: 5 tests
- Payout Calculation: 4 tests
- Stripe Account Status: 4 tests
- Error Handling: 6 tests

**Test Coverage:**

- Stripe Connect onboarding ✓
- Payment creation and confirmation ✓
- Full and partial refunds ✓
- Payout calculations ✓
- Account status management ✓
- Error scenarios ✓
- Multi-tenant isolation ✓

**Ready for CI/CD:** Yes
**Mock Strategy:** Fully mocked Stripe SDK
**Database:** Real PostgreSQL with cleanup
**Execution Time:** ~10 seconds
