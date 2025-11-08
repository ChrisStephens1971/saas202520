/**
 * Test Helpers and Utilities for API Endpoint Tests
 *
 * Provides common mocking, test data factories, and utilities
 */

import { vi } from 'vitest';
import type { Session } from 'next-auth';

/**
 * Mock NextAuth Session
 */
export function createMockSession(overrides?: Partial<Session>): Session {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      ...overrides?.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Mock Prisma Client with common methods
 */
export function createMockPrisma() {
  return {
    match: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    organizationMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    scoreUpdate: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tournamentEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    stripeAccount: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payout: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      match: { update: vi.fn(), findUnique: vi.fn() },
      scoreUpdate: { create: vi.fn(), update: vi.fn() },
      tournamentEvent: { create: vi.fn() },
      organization: { create: vi.fn() },
      organizationMember: { create: vi.fn() },
      payment: { create: vi.fn(), update: vi.fn() },
      payout: { create: vi.fn(), createMany: vi.fn() },
    })),
  };
}

/**
 * Mock Stripe Client
 */
export function createMockStripe() {
  return {
    accounts: {
      create: vi.fn().mockResolvedValue({
        id: 'acct_test123',
        type: 'express',
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'acct_test123',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    },
    accountLinks: {
      create: vi.fn().mockResolvedValue({
        url: 'https://connect.stripe.com/setup/e/acct_test123/abc123',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    },
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret_abc',
        status: 'requires_payment_method',
        amount: 5000,
        currency: 'usd',
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
        amount: 5000,
      }),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: 'ref_test123',
        status: 'succeeded',
        amount: 5000,
      }),
    },
  };
}

/**
 * Test Data Factories
 */
export const factories = {
  match: (overrides?: any) => ({
    id: 'match-123',
    tournamentId: 'tournament-123',
    playerAId: 'player-a',
    playerBId: 'player-b',
    state: 'active',
    score: {
      playerA: 0,
      playerB: 0,
      raceTo: 9,
      games: [],
    },
    rev: 1,
    winnerId: null,
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tournament: {
      id: 'tournament-123',
      name: 'Test Tournament',
      orgId: 'org-123',
    },
    playerA: {
      id: 'player-a',
      name: 'Player A',
    },
    playerB: {
      id: 'player-b',
      name: 'Player B',
    },
    ...overrides,
  }),

  tournament: (overrides?: any) => ({
    id: 'tournament-123',
    name: 'Test Tournament',
    orgId: 'org-123',
    state: 'active',
    entryFee: 5000,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      members: [
        {
          userId: 'user-123',
          role: 'owner',
        },
      ],
    },
    ...overrides,
  }),

  organization: (overrides?: any) => ({
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  organizationMember: (overrides?: any) => ({
    id: 'member-123',
    userId: 'user-123',
    orgId: 'org-123',
    role: 'owner',
    createdAt: new Date('2024-01-01'),
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
    ...overrides,
  }),

  scoreUpdate: (overrides?: any) => ({
    id: 'score-update-123',
    matchId: 'match-123',
    tournamentId: 'tournament-123',
    actor: 'user-123',
    device: 'test-device',
    action: 'increment_a',
    previousScore: { playerA: 0, playerB: 0, raceTo: 9, games: [] },
    newScore: { playerA: 1, playerB: 0, raceTo: 9, games: [{ gameNumber: 1, winner: 'playerA', score: { playerA: 1, playerB: 0 }, timestamp: new Date() }] },
    undone: false,
    timestamp: new Date('2024-01-01'),
    ...overrides,
  }),

  payment: (overrides?: any) => ({
    id: 'payment-123',
    tournamentId: 'tournament-123',
    playerId: 'player-123',
    stripeAccountId: 'stripe-account-123',
    stripePaymentIntent: 'pi_test123',
    amount: 5000,
    currency: 'usd',
    status: 'pending',
    purpose: 'entry_fee',
    description: 'Entry fee for Test Tournament',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  stripeAccount: (overrides?: any) => ({
    id: 'stripe-account-123',
    orgId: 'org-123',
    stripeAccountId: 'acct_test123',
    onboardingComplete: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    country: 'US',
    currency: 'usd',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  payout: (overrides?: any) => ({
    id: 'payout-123',
    tournamentId: 'tournament-123',
    playerId: 'player-123',
    position: 1,
    amount: 50000,
    percentage: 50.0,
    status: 'pending',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    player: {
      id: 'player-123',
      name: 'Player 1',
    },
    ...overrides,
  }),
};

/**
 * Assert Response Error Structure
 */
export function expectErrorResponse(data: any, expectedCode?: string) {
  expect(data).toHaveProperty('error');
  if (expectedCode) {
    expect(data.error).toBe(expectedCode);
  }
}

/**
 * Mock NextRequest with custom body
 */
export function createMockRequest(url: string, options?: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}) {
  const { method = 'GET', body, headers = {} } = options || {};

  return {
    url,
    method,
    json: vi.fn().mockResolvedValue(body),
    headers: new Map(Object.entries(headers)),
  } as any;
}
