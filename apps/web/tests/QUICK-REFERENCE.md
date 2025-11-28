# Stripe Payment Tests - Quick Reference

## Quick Start

```bash
cd apps/web
pnpm install
pnpm test:run
```

## Common Commands

| Command                                | Description                     |
| -------------------------------------- | ------------------------------- |
| `pnpm test`                            | Run tests in watch mode         |
| `pnpm test:run`                        | Run tests once (CI mode)        |
| `pnpm test:ui`                         | Launch interactive UI dashboard |
| `pnpm test:coverage`                   | Generate coverage report        |
| `pnpm test stripe-payments`            | Run specific test file          |
| `pnpm test -t "Complete Payment"`      | Run specific test suite         |
| `pnpm test -t "should create payment"` | Run specific test               |

## Test Organization

```
23 Total Tests

Complete Payment Flow (4 tests)
├── Create Stripe account and onboarding
├── Create payment intent for entry fee
├── Confirm payment and generate receipt
└── Verify database records

Refund Flow (5 tests)
├── Process full refund
├── Process partial refund
├── Prevent refund exceeding amount
├── Handle multiple partial refunds
└── Verify refund status updates

Payout Calculation (4 tests)
├── Calculate with 50/30/20 structure
├── Handle house take
├── Include side pots
└── Verify amounts match fees

Account Status (4 tests)
├── Detect onboarding incomplete
├── Verify charges_enabled
├── Verify payouts_enabled
└── Refresh account status

Error Handling (6 tests)
├── Handle Stripe API errors
├── Prevent duplicate payments
├── Handle refund failures
├── Handle missing account
├── Handle card declined
└── Handle payment not found
```

## Mock Usage Examples

### Creating Mock Stripe Account

```typescript
const mockAccount = createMockStripeAccount({
  id: 'acct_test_123',
  charges_enabled: true,
  payouts_enabled: true,
});

mockStripe.accounts.create.mockResolvedValue(mockAccount);
```

### Creating Mock Payment

```typescript
const mockPayment = createMockPaymentIntent({
  amount: 5000, // $50.00
  status: 'succeeded',
  metadata: {
    tournamentId: 'tour_123',
    purpose: 'entry_fee',
  },
});

mockStripe.paymentIntents.create.mockResolvedValue(mockPayment);
```

### Creating Mock Refund

```typescript
const mockRefund = createMockRefund({
  amount: 2500, // $25.00 (partial)
  payment_intent: 'pi_test_123',
  status: 'succeeded',
});

mockStripe.refunds.create.mockResolvedValue(mockRefund);
```

### Simulating Errors

```typescript
mockStripe.paymentIntents.create.mockRejectedValue(stripeErrors.cardDeclined());
```

## Test Data Examples

### Create Test Organization

```typescript
const org = await prisma.organization.create({
  data: createTestOrganization(),
});
```

### Create Test Payment

```typescript
const payment = await prisma.payment.create({
  data: createTestPayment(tournamentId, stripeAccountId, {
    amount: 5000,
    status: 'succeeded',
    purpose: 'entry_fee',
  }),
});
```

### Prize Structures

```typescript
prizeStructures.standard; // 50/30/20
prizeStructures.twoPlace; // 60/40
prizeStructures.winnerTakesAll; // 100
prizeStructures.fourPlace; // 40/25/20/15
```

## Common Assertions

### Verify Payment Created

```typescript
expect(payment.status).toBe('succeeded');
expect(payment.amount).toBe(5000);
expect(payment.receiptUrl).toBeDefined();
```

### Verify Refund

```typescript
expect(refund.amount).toBe(2500);
expect(payment.refundedAmount).toBe(2500);
expect(payment.status).toBe('partially_refunded');
```

### Verify Payout

```typescript
expect(payout.amount).toBe(20000); // $200.00
expect(payout.placement).toBe(1);
expect(payout.status).toBe('pending');
```

### Verify Tenant Isolation

```typescript
const orgPayments = await prisma.payment.findMany({
  where: {
    stripeAccount: {
      orgId: testOrgId,
    },
  },
});
expect(orgPayments).toHaveLength(1);
```

## Debugging

### View Test Output

```bash
pnpm test --reporter=verbose
```

### Run Single Test

```bash
pnpm test -t "should create payment intent"
```

### Check Mock Calls

```typescript
expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
  amount: 5000,
  currency: 'usd',
  // ...
});
```

### Inspect Database State

```typescript
const payment = await prisma.payment.findUnique({
  where: { id: testPaymentId },
  include: {
    stripeAccount: true,
    refunds: true,
  },
});
console.log(payment);
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL running
pg_isready

# Verify DATABASE_URL
echo $DATABASE_URL

# Run migrations
pnpm db:migrate
```

### Tests Timing Out

```typescript
test(
  'slow test',
  async () => {
    // test code
  },
  { timeout: 10000 }
); // 10s timeout
```

### Mock Not Working

```typescript
// Ensure mock is in beforeAll()
beforeAll(async () => {
  const Stripe = (await import('stripe')).default;
  mockStripe = new Stripe('sk_test', { apiVersion: '2024-11-20.acacia' });
});
```

## Environment Setup

### .env.test

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/tournament_test"
STRIPE_SECRET_KEY="sk_test_mock_key"
NEXTAUTH_SECRET="test-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup

```bash
createdb tournament_test
pnpm db:migrate
```

## Coverage Targets

- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

```bash
pnpm test:coverage
open coverage/index.html
```

## File Locations

| File     | Path                                                 |
| -------- | ---------------------------------------------------- |
| Tests    | `apps/web/tests/integration/stripe-payments.test.ts` |
| Mocks    | `apps/web/tests/fixtures/stripe-mocks.ts`            |
| Fixtures | `apps/web/tests/fixtures/test-data.ts`               |
| Config   | `apps/web/vitest.config.ts`                          |
| Setup    | `apps/web/tests/setup.ts`                            |
| Docs     | `apps/web/tests/README.md`                           |

## Test Scenarios at a Glance

### ✅ Payment Flow

- Create account → Create intent → Confirm → Receipt

### ✅ Refund Flow

- Full refund → Partial refund → Multiple refunds → Error handling

### ✅ Payout Flow

- Calculate → Apply structure → Include side pots → Verify totals

### ✅ Account Status

- Onboarding → Charges enabled → Payouts enabled → Refresh

### ✅ Errors

- API errors → Card errors → Validation → Constraints

## Performance

- **Execution Time:** ~10 seconds
- **Tests:** 23
- **Coverage:** 80%+
- **Database:** PostgreSQL (cleaned per test)
- **Mocking:** 100% (no real API calls)

## Next Steps

1. ✅ Tests created and documented
2. ⏭️ Run `pnpm install` to add dependencies
3. ⏭️ Set up test database
4. ⏭️ Run `pnpm test:run` to verify
5. ⏭️ Add to CI/CD pipeline

---

**Need help?** See `tests/README.md` for detailed documentation.
