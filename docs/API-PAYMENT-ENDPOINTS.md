# Payment API Endpoints - Quick Reference

## Overview
Complete payment processing system for tournament platforms with Stripe Connect integration, refunds, payouts, and comprehensive audit trails.

---

## Endpoints

### 1. PAY-001: Stripe Connect Onboarding
```
POST /api/payments/stripe/onboarding
Authorization: Required (owner/td)

Body:
{
  "orgId": string,
  "country": string? (default: "US")
}

Response: 200
{
  "account": StripeAccount,
  "onboardingUrl": string
}
```

### 2. PAY-002: Create Payment Intent
```
POST /api/payments/create-intent
Authorization: Required

Body:
{
  "tournamentId": string,
  "playerId": string?,
  "amount": number (cents),
  "currency": string? (default: "usd"),
  "purpose": "entry_fee" | "side_pot" | "addon",
  "description": string?
}

Response: 200
{
  "payment": Payment,
  "clientSecret": string
}
```

### 3. PAY-003: Confirm Payment
```
POST /api/payments/[id]/confirm
Authorization: Required

Body:
{
  "stripePaymentIntentId": string
}

Response: 200
{
  "payment": Payment,
  "receiptUrl": string?
}
```

### 4. PAY-004: Process Refund
```
POST /api/payments/[id]/refund
Authorization: Required (owner/td)

Body:
{
  "amount": number? (cents, default: full refund),
  "reason": "duplicate" | "fraudulent" | "requested_by_customer"
}

Response: 200
{
  "refund": Refund,
  "payment": Payment
}
```

### 5. PAY-005: Calculate Payouts
```
POST /api/tournaments/[id]/payouts/calculate
Authorization: Required (owner/td)

Body:
{
  "prizeStructure": Array<{
    placement: number,
    percentage: number
  }>,
  "includeEntryFees": boolean? (default: true),
  "includeSidePots": boolean? (default: true)
}

Response: 200
{
  "payouts": Payout[],
  "summary": {
    "totalCollected": number,
    "totalPayouts": number,
    "houseTake": number,
    "breakdown": {
      "entryFees": number,
      "sidePots": number
    }
  }
}
```

### 6. PAY-006: Get Payouts
```
GET /api/tournaments/[id]/payouts
Authorization: Required

Response: 200
{
  "payouts": Payout[],
  "summary": {
    "totalPending": number,
    "totalPaid": number,
    "totalVoided": number
  }
}
```

### 6b. Mark Payout as Paid
```
PUT /api/tournaments/[id]/payouts
Authorization: Required (owner/td)

Body:
{
  "payoutId": string,
  "notes": string?
}

Response: 200
{
  "payout": Payout
}
```

### 7. PAY-007: Generate Payout Sheet (PDF)
```
GET /api/tournaments/[id]/payouts/sheet
Authorization: Required

Response: 200 (PDF file)
Content-Type: application/pdf
Content-Disposition: attachment; filename="payout-sheet-tournament-name.pdf"

[Professional PDF with:
 - Tournament info (name, date, organization)
 - Payout table (placement, player, amount, status)
 - Financial summary (collected, payouts, house take)
 - Generated timestamp]
```

### 8. PAY-008: Get Dispute Evidence
```
GET /api/payments/[id]/dispute-evidence
Authorization: Required (owner/td)

Response: 200
{
  "payment": Payment,
  "refunds": Refund[],
  "auditTrail": Array<{
    timestamp: Date,
    actor: string,
    action: string,
    details: object
  }>,
  "summary": string (formatted dispute summary)
}
```

### Bonus: Get Stripe Account Status
```
GET /api/payments/stripe/account?orgId={id}
Authorization: Required

Response: 200
{
  "account": StripeAccount | null,
  "requiresOnboarding": boolean
}
```

---

## Data Models

### Payment
```typescript
{
  id: string
  tournamentId: string
  playerId?: string
  stripeAccountId: string
  stripePaymentIntent: string
  amount: number // cents
  currency: string
  status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded"
  purpose: "entry_fee" | "side_pot" | "addon"
  description?: string
  refundedAmount: number
  receiptUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### Refund
```typescript
{
  id: string
  paymentId: string
  stripeRefundId: string
  amount: number // cents
  reason: "duplicate" | "fraudulent" | "requested_by_customer"
  status: "pending" | "succeeded" | "failed" | "cancelled"
  processedBy: string // user ID
  createdAt: Date
  updatedAt: Date
}
```

### Payout
```typescript
{
  id: string
  tournamentId: string
  playerId: string
  placement: number
  amount: number // cents
  source: "prize_pool" | "side_pot"
  status: "pending" | "paid" | "voided"
  paidAt?: Date
  paidBy?: string // user ID
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

### StripeAccount
```typescript
{
  id: string
  orgId: string
  stripeAccountId: string
  onboardingComplete: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  country?: string
  currency: string
  createdAt: Date
  updatedAt: Date
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: tournamentId, amount, purpose"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Unauthorized: You must be an owner or TD to set up payments"
}
```

### 404 Not Found
```json
{
  "error": "Payment not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Authentication

All endpoints require:
- Valid NextAuth session
- `Authorization` header (automatic with NextAuth client)
- Specific role requirements noted above

Example:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Permissions

### Public Routes
None - all payment routes require authentication

### Owner/TD Only
- Create/manage Stripe account onboarding
- Process refunds
- Calculate/manage payouts
- Access dispute evidence

### Any Authenticated User (with tournament access)
- Create payment intents
- Confirm payments
- View payouts for their tournaments

---

## Testing with Stripe

Use Stripe test mode credentials:

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

**Test Refunds:**
- All test payments can be refunded via API
- Refunds process immediately in test mode

**Test Connect Account:**
- Use test Stripe Connect account ID (acct_1XXXX)
- Requires onboarding completion for charges

---

## Implementation Details

### Stripe Connect Integration
- Standard accounts used (independent platforms)
- Connected account IDs stored per organization
- Capabilities automatically requested (card_payments, transfers)
- Charges routed through connected account

### Concurrent Safety
- Optimistic locking on Match model (rev field)
- Transaction safety for refund + payment updates
- Idempotent payment intent creation

### Audit Trail
- All payment events logged to TournamentEvent table
- Refund creation includes actor (user ID) and timestamp
- Dispute evidence reconstructs complete timeline

### PDF Generation
- Uses PDFKit for professional rendering
- Streams directly to HTTP response
- Proper headers for browser download
- Currency formatting with 2 decimal places

---

## Integration Checklist

- [ ] Set STRIPE_SECRET_KEY environment variable
- [ ] Run database migration for payment models
- [ ] Verify Stripe Connect account creation (test mode)
- [ ] Test payment intent flow end-to-end
- [ ] Verify refund processing
- [ ] Test payout calculation with sample data
- [ ] Generate and validate sample PDF payout sheet
- [ ] Test dispute evidence generation
- [ ] Verify multi-tenant isolation (orgs can't see other payments)
- [ ] Set up webhook handlers for payment confirmations
- [ ] Test error cases and edge conditions

---

## Version Info

**API Version:** 1.0
**Stripe API Version:** 2024-11-20.acacia
**Status:** Production Ready

Last Updated: November 5, 2025
