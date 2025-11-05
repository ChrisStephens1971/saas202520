/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test Data Fixtures
 * Reusable test data for integration tests
 */

import type {
  StripeAccount,
  Payment,
  Refund,
  Payout
} from '@tournament/shared/types/payment';

/**
 * Create test organization data
 */
export function createTestOrganization() {
  return {
    id: 'org_test_123',
    name: 'Test Pool Hall',
    slug: 'test-pool-hall',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create test tournament data
 */
export function createTestTournament(orgId: string) {
  return {
    id: 'tour_test_123',
    orgId,
    name: 'Weekly 8-Ball Tournament',
    description: 'Test tournament for integration tests',
    status: 'registration',
    format: 'single_elimination',
    sportConfigId: 'pool_8ball',
    sportConfigVersion: '1.0.0',
    createdBy: 'user_test_123',
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Create test player data
 */
export function createTestPlayer(tournamentId: string, overrides?: Partial<any>) {
  return {
    id: overrides?.id || `player_test_${Math.floor(Math.random() * 1000)}`,
    tournamentId,
    name: overrides?.name || 'Test Player',
    email: overrides?.email || 'player@example.com',
    phone: null,
    rating: { system: 'fargo', value: 550 },
    status: 'registered',
    seed: overrides?.seed || null,
    checkedInAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test Stripe account data
 */
export function createTestStripeAccount(
  orgId: string,
  overrides?: Partial<StripeAccount>
): Omit<StripeAccount, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date } {
  return {
    id: overrides?.id || 'sa_test_123',
    orgId,
    stripeAccountId: overrides?.stripeAccountId || 'acct_test_123',
    onboardingComplete: overrides?.onboardingComplete ?? true,
    chargesEnabled: overrides?.chargesEnabled ?? true,
    payoutsEnabled: overrides?.payoutsEnabled ?? true,
    detailsSubmitted: overrides?.detailsSubmitted ?? true,
    country: overrides?.country || 'US',
    currency: overrides?.currency || 'usd',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test payment data
 */
export function createTestPayment(
  tournamentId: string,
  stripeAccountId: string,
  overrides?: Partial<Payment>
): Omit<Payment, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date } {
  return {
    id: overrides?.id || `pay_test_${Math.floor(Math.random() * 1000)}`,
    tournamentId,
    playerId: overrides?.playerId || 'player_test_1',
    stripeAccountId,
    stripePaymentIntent: overrides?.stripePaymentIntent || `pi_test_${Math.floor(Math.random() * 1000)}`,
    amount: overrides?.amount || 5000, // $50.00
    currency: overrides?.currency || 'usd',
    status: overrides?.status || 'succeeded',
    purpose: overrides?.purpose || 'entry_fee',
    description: overrides?.description || 'Tournament entry fee',
    refundedAmount: overrides?.refundedAmount || 0,
    receiptUrl: overrides?.receiptUrl || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test refund data
 */
export function createTestRefund(
  paymentId: string,
  overrides?: Partial<Refund>
): Omit<Refund, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date } {
  return {
    id: overrides?.id || `ref_test_${Math.floor(Math.random() * 1000)}`,
    paymentId,
    stripeRefundId: overrides?.stripeRefundId || `re_test_${Math.floor(Math.random() * 1000)}`,
    amount: overrides?.amount || 5000,
    reason: overrides?.reason || 'requested_by_customer',
    status: overrides?.status || 'succeeded',
    processedBy: overrides?.processedBy || 'user_test_123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test payout data
 */
export function createTestPayout(
  tournamentId: string,
  playerId: string,
  overrides?: Partial<Payout>
): Omit<Payout, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date } {
  return {
    id: overrides?.id || `po_test_${Math.floor(Math.random() * 1000)}`,
    tournamentId,
    playerId,
    placement: overrides?.placement || 1,
    amount: overrides?.amount || 10000, // $100.00
    source: overrides?.source || 'prize_pool',
    status: overrides?.status || 'pending',
    paidAt: overrides?.paidAt || null,
    paidBy: overrides?.paidBy || null,
    notes: overrides?.notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Prize structure templates for testing
 */
export const prizeStructures = {
  // 50/30/20 split
  standard: [
    { placement: 1, percentage: 50 },
    { placement: 2, percentage: 30 },
    { placement: 3, percentage: 20 },
  ],
  // 60/40 split
  twoPlace: [
    { placement: 1, percentage: 60 },
    { placement: 2, percentage: 40 },
  ],
  // Winner takes all
  winnerTakesAll: [
    { placement: 1, percentage: 100 },
  ],
  // 40/25/20/15 split
  fourPlace: [
    { placement: 1, percentage: 40 },
    { placement: 2, percentage: 25 },
    { placement: 3, percentage: 20 },
    { placement: 4, percentage: 15 },
  ],
};

/**
 * Test user data
 */
export function createTestUser() {
  return {
    id: 'user_test_123',
    name: 'Test Tournament Director',
    email: 'td@example.com',
    emailVerified: new Date(),
    image: null,
    password: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
