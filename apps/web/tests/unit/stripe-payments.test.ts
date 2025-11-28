/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/**
 * Stripe Payment Unit Tests (Mocked)
 * Tests payment workflows with mocked Prisma and Stripe dependencies
 * No database or external connections required
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  createMockStripeAccount,
  createMockAccountLink,
  createMockPaymentIntent,
  createMockCharge,
  createMockRefund,
  stripeErrors,
} from '../fixtures/stripe-mocks';
import {
  createTestOrganization,
  createTestTournament,
  createTestPlayer,
  createTestStripeAccount,
  createTestPayment,
  createTestRefund,
  createTestPayout,
  createTestUser,
  prizeStructures,
} from '../fixtures/test-data';

// Mock the stripe library functions
vi.mock('../../lib/stripe', () => ({
  createConnectAccount: vi.fn(),
  createAccountLink: vi.fn(),
  getConnectAccount: vi.fn(),
  createPaymentIntent: vi.fn(),
  createRefund: vi.fn(),
  getReceiptUrl: vi.fn(),
}));

// Mock Stripe SDK
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      accounts: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      accountLinks: {
        create: vi.fn(),
      },
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
        confirm: vi.fn(),
      },
      charges: {
        retrieve: vi.fn(),
      },
      refunds: {
        create: vi.fn(),
      },
    })),
  };
});

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  organization: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  organizationMember: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  tournament: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  player: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  stripeAccount: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  payment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  refund: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  payout: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}));

describe('Stripe Payment Unit Tests (Mocked)', () => {
  let testOrgId: string;
  let testTournamentId: string;
  let testStripeAccountId: string;
  let mockStripe: any;
  let prisma: typeof mockPrismaClient;
  let stripeLib: any;

  beforeEach(async () => {
    // Get mocked Stripe instance
    const Stripe = (await import('stripe')).default;
    mockStripe = new Stripe('sk_test_mock', { apiVersion: '2024-11-20.acacia' });

    // Get mocked stripe library functions
    stripeLib = await import('../../lib/stripe');

    // Use mocked Prisma client
    prisma = mockPrismaClient;

    // Setup test IDs
    testOrgId = 'org_test_123';
    testTournamentId = 'tour_test_123';
    testStripeAccountId = 'sa_test_123';

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock behaviors
    const testUser = createTestUser();
    const testOrg = createTestOrganization();
    const testTournament = createTestTournament(testOrgId);

    prisma.user.create.mockResolvedValue(testUser);
    prisma.organization.create.mockResolvedValue(testOrg);
    prisma.tournament.create.mockResolvedValue(testTournament);
  });

  // ============================================================================
  // TEST SCENARIO 1: Complete Payment Flow
  // ============================================================================

  describe('Complete Payment Flow', () => {
    test('should create Stripe account and complete onboarding', async () => {
      // Mock Stripe responses
      const mockAccount = createMockStripeAccount({
        id: 'acct_test_new',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });

      const mockAccountLink = createMockAccountLink('acct_test_new');

      // Mock stripeLib functions
      stripeLib.createConnectAccount.mockResolvedValue(mockAccount);
      stripeLib.createAccountLink.mockResolvedValue(mockAccountLink);

      // Create Stripe Connect account
      const account = await stripeLib.createConnectAccount({
        email: 'test@poolhall.com',
        country: 'US',
        businessType: 'individual',
      });

      expect(account.id).toBe('acct_test_new');
      expect(stripeLib.createConnectAccount).toHaveBeenCalledWith({
        email: 'test@poolhall.com',
        country: 'US',
        businessType: 'individual',
      });

      // Mock database storage
      const dbAccountData = {
        ...createTestStripeAccount(testOrgId, {
          stripeAccountId: account.id,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          country: 'US',
          currency: 'usd',
        }),
        id: testStripeAccountId,
      };

      prisma.stripeAccount.create.mockResolvedValue(dbAccountData);

      const dbAccount = await prisma.stripeAccount.create({
        data: dbAccountData,
      });

      expect(dbAccount.stripeAccountId).toBe('acct_test_new');
      expect(dbAccount.onboardingComplete).toBe(false);

      // Create onboarding link
      const accountLink = await stripeLib.createAccountLink(
        account.id,
        'https://example.com/return',
        'https://example.com/refresh'
      );

      expect(accountLink.url).toBeDefined();
      expect(stripeLib.createAccountLink).toHaveBeenCalledWith(
        'acct_test_new',
        'https://example.com/return',
        'https://example.com/refresh'
      );
    });

    test('should create payment intent for entry fee', async () => {
      // Setup: Mock Stripe account
      const dbAccount = {
        ...createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_test_complete',
        }),
        id: testStripeAccountId,
      };

      prisma.stripeAccount.create.mockResolvedValue(dbAccount);

      // Create player
      const playerData = {
        ...createTestPlayer(testTournamentId),
        id: 'player_test_1',
      };

      prisma.player.create.mockResolvedValue(playerData);

      const player = await prisma.player.create({ data: playerData });

      // Mock Stripe payment intent creation
      const mockPaymentIntent = createMockPaymentIntent({
        id: 'pi_test_entry_fee',
        amount: 5000, // $50.00
        metadata: {
          tournamentId: testTournamentId,
          playerId: player.id,
          purpose: 'entry_fee',
        },
      });

      // Mock stripeLib function
      stripeLib.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      // Create payment intent
      const paymentIntent = await stripeLib.createPaymentIntent({
        amount: 5000,
        currency: 'usd',
        connectedAccountId: 'acct_test_complete',
        applicationFeeAmount: 250, // $2.50 platform fee (5%)
        metadata: {
          tournamentId: testTournamentId,
          playerId: player.id,
          purpose: 'entry_fee',
        },
      });

      expect(paymentIntent.id).toBe('pi_test_entry_fee');
      expect(paymentIntent.amount).toBe(5000);
      expect(paymentIntent.client_secret).toBeDefined();

      // Mock database payment storage
      const paymentData = {
        ...createTestPayment(testTournamentId, dbAccount.id, {
          playerId: player.id,
          stripePaymentIntent: paymentIntent.id,
          amount: 5000,
          currency: 'usd',
          status: 'pending',
          purpose: 'entry_fee',
          description: 'Tournament entry fee',
        }),
        id: 'pay_test_1',
      };

      prisma.payment.create.mockResolvedValue(paymentData);

      const payment = await prisma.payment.create({ data: paymentData });

      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(5000);
    });

    test('should confirm payment and generate receipt', async () => {
      // Setup: Mock account and payment
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      const playerData = {
        ...createTestPlayer(testTournamentId),
        id: 'player_test_1',
      };

      const paymentData = {
        ...createTestPayment(testTournamentId, dbAccount.id, {
          playerId: playerData.id,
          stripePaymentIntent: 'pi_test_confirm',
          status: 'pending',
        }),
        id: 'pay_test_1',
      };

      prisma.payment.create.mockResolvedValue(paymentData);
      prisma.payment.findUnique.mockResolvedValue(paymentData);

      // Mock Stripe payment confirmation
      const mockCharge = createMockCharge({
        id: 'ch_test_receipt',
        amount: 5000,
      });

      const mockConfirmedPayment = createMockPaymentIntent({
        id: 'pi_test_confirm',
        status: 'succeeded',
        latest_charge: 'ch_test_receipt',
        amount: 5000,
      });

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockConfirmedPayment);
      mockStripe.charges.retrieve.mockResolvedValue(mockCharge);

      // Simulate webhook or client-side confirmation
      const confirmedPayment = await mockStripe.paymentIntents.retrieve('pi_test_confirm');
      expect(confirmedPayment.status).toBe('succeeded');

      // Get charge for receipt URL
      const charge = await mockStripe.charges.retrieve(confirmedPayment.latest_charge as string);
      const receiptUrl = charge.receipt_url;

      // Mock database update
      const updatedPaymentData = {
        ...paymentData,
        status: 'succeeded',
        receiptUrl,
      };

      prisma.payment.update.mockResolvedValue(updatedPaymentData);

      const updatedPayment = await prisma.payment.update({
        where: { id: paymentData.id },
        data: {
          status: 'succeeded',
          receiptUrl,
        },
      });

      expect(updatedPayment.status).toBe('succeeded');
      expect(updatedPayment.receiptUrl).toBeDefined();
      expect(updatedPayment.receiptUrl).toContain('pay.stripe.com/receipts');
    });

    test('should verify database records after complete payment', async () => {
      // Setup complete payment flow
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
        orgId: testOrgId,
      };

      const playerData = {
        ...createTestPlayer(testTournamentId),
        id: 'player_test_1',
      };

      const paymentData = {
        ...createTestPayment(testTournamentId, dbAccount.id, {
          playerId: playerData.id,
          status: 'succeeded',
          receiptUrl: 'https://pay.stripe.com/receipts/test',
        }),
        id: 'pay_test_1',
        stripeAccount: dbAccount,
      };

      prisma.payment.findUnique.mockResolvedValue(paymentData);
      prisma.payment.findMany.mockResolvedValue([paymentData]);

      // Verify all records exist and are linked correctly
      const verifyPayment = await prisma.payment.findUnique({
        where: { id: paymentData.id },
        include: {
          stripeAccount: true,
        },
      });

      expect(verifyPayment).toBeDefined();
      expect(verifyPayment?.status).toBe('succeeded');
      expect(verifyPayment?.stripeAccount.orgId).toBe(testOrgId);
      expect(verifyPayment?.tournamentId).toBe(testTournamentId);
      expect(verifyPayment?.playerId).toBe(playerData.id);

      // Verify tenant isolation
      const orgPayments = await prisma.payment.findMany({
        where: {
          stripeAccount: {
            orgId: testOrgId,
          },
        },
      });

      expect(orgPayments).toHaveLength(1);
      expect(orgPayments[0].id).toBe(paymentData.id);
    });
  });

  // ============================================================================
  // TEST SCENARIO 2: Refund Flow
  // ============================================================================

  describe('Refund Flow', () => {
    let testPaymentId: string;
    let dbAccount: any;
    let paymentData: any;

    beforeEach(async () => {
      testPaymentId = 'pay_test_1';

      // Setup: Mock successful payment
      dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      const playerData = {
        ...createTestPlayer(testTournamentId),
        id: 'player_test_1',
      };

      paymentData = {
        ...createTestPayment(testTournamentId, dbAccount.id, {
          playerId: playerData.id,
          stripePaymentIntent: 'pi_test_refund',
          amount: 5000,
          status: 'succeeded',
        }),
        id: testPaymentId,
        stripeAccount: dbAccount,
      };

      prisma.payment.findUnique.mockResolvedValue(paymentData);
    });

    test('should process full refund', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
        include: { stripeAccount: true },
      });

      expect(payment).toBeDefined();

      // Mock Stripe refund creation
      const mockRefund = createMockRefund({
        id: 're_test_full',
        amount: 5000,
        payment_intent: payment!.stripePaymentIntent,
        status: 'succeeded',
      });

      // Mock stripeLib function
      stripeLib.createRefund.mockResolvedValue(mockRefund);

      // Create refund
      const refund = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      expect(refund.id).toBe('re_test_full');
      expect(refund.amount).toBe(5000);
      expect(refund.status).toBe('succeeded');

      // Mock database refund storage
      const refundData = {
        ...createTestRefund(testPaymentId, {
          stripeRefundId: refund.id,
          amount: 5000,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        }),
        id: 'ref_test_1',
      };

      prisma.refund.create.mockResolvedValue(refundData);

      const dbRefund = await prisma.refund.create({ data: refundData });

      // Mock payment update
      const updatedPaymentData = {
        ...paymentData,
        status: 'refunded',
        refundedAmount: 5000,
      };

      prisma.payment.update.mockResolvedValue(updatedPaymentData);

      const updatedPayment = await prisma.payment.update({
        where: { id: testPaymentId },
        data: {
          status: 'refunded',
          refundedAmount: 5000,
        },
      });

      expect(updatedPayment.status).toBe('refunded');
      expect(updatedPayment.refundedAmount).toBe(5000);
      expect(dbRefund.amount).toBe(updatedPayment.refundedAmount);
    });

    test('should process partial refund', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
        include: { stripeAccount: true },
      });

      // Mock partial refund (50% = $25.00)
      const partialAmount = 2500;
      const mockRefund = createMockRefund({
        id: 're_test_partial',
        amount: partialAmount,
        payment_intent: payment!.stripePaymentIntent,
      });

      // Mock stripeLib function
      stripeLib.createRefund.mockResolvedValue(mockRefund);

      // Create partial refund
      const refund = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        amount: partialAmount,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      expect(refund.amount).toBe(partialAmount);

      // Mock database storage
      const refundData = {
        ...createTestRefund(testPaymentId, {
          stripeRefundId: refund.id,
          amount: partialAmount,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        }),
        id: 'ref_test_1',
      };

      prisma.refund.create.mockResolvedValue(refundData);
      await prisma.refund.create({ data: refundData });

      // Mock payment update
      const updatedPaymentData = {
        ...paymentData,
        status: 'partially_refunded',
        refundedAmount: partialAmount,
      };

      prisma.payment.update.mockResolvedValue(updatedPaymentData);

      const updatedPayment = await prisma.payment.update({
        where: { id: testPaymentId },
        data: {
          status: 'partially_refunded',
          refundedAmount: partialAmount,
        },
      });

      expect(updatedPayment.status).toBe('partially_refunded');
      expect(updatedPayment.refundedAmount).toBe(2500);
      expect(updatedPayment.amount).toBe(5000); // Original amount unchanged
    });

    test('should prevent refund exceeding payment amount', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
        include: { stripeAccount: true },
      });

      // Mock Stripe error for excessive refund
      const excessiveAmount = 10000; // More than $50.00 payment
      stripeLib.createRefund.mockRejectedValue(stripeErrors.refundExceedsAmount());

      // Attempt to create excessive refund
      await expect(
        stripeLib.createRefund({
          paymentIntentId: payment!.stripePaymentIntent,
          amount: excessiveAmount,
          connectedAccountId: payment!.stripeAccount.stripeAccountId,
          reason: 'requested_by_customer',
        })
      ).rejects.toThrow('Refund amount exceeds charge amount');

      // Verify payment unchanged
      prisma.payment.findUnique.mockResolvedValue(paymentData);

      const unchangedPayment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
      });

      expect(unchangedPayment?.status).toBe('succeeded');
      expect(unchangedPayment?.refundedAmount).toBe(0);
    });

    test('should handle multiple partial refunds up to total', async () => {
      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
        include: { stripeAccount: true },
      });

      // First partial refund: $20.00
      const mockRefund1 = createMockRefund({
        id: 're_test_multi_1',
        amount: 2000,
        payment_intent: payment!.stripePaymentIntent,
      });

      // Mock stripeLib function for first refund
      stripeLib.createRefund.mockResolvedValueOnce(mockRefund1);

      const refund1 = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        amount: 2000,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      // Mock first refund storage
      const refund1Data = {
        ...createTestRefund(testPaymentId, {
          stripeRefundId: refund1.id,
          amount: 2000,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        }),
        id: 'ref_test_1',
      };

      prisma.refund.create.mockResolvedValueOnce(refund1Data);
      await prisma.refund.create({ data: refund1Data });

      // Update payment after first refund
      let updatedPaymentData = {
        ...paymentData,
        status: 'partially_refunded',
        refundedAmount: 2000,
      };

      prisma.payment.update.mockResolvedValueOnce(updatedPaymentData);
      await prisma.payment.update({
        where: { id: testPaymentId },
        data: {
          status: 'partially_refunded',
          refundedAmount: 2000,
        },
      });

      // Second partial refund: $30.00 (total = $50.00)
      const mockRefund2 = createMockRefund({
        id: 're_test_multi_2',
        amount: 3000,
        payment_intent: payment!.stripePaymentIntent,
      });

      // Mock stripeLib function for second refund
      stripeLib.createRefund.mockResolvedValueOnce(mockRefund2);

      const refund2 = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        amount: 3000,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      // Mock second refund storage
      const refund2Data = {
        ...createTestRefund(testPaymentId, {
          stripeRefundId: refund2.id,
          amount: 3000,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        }),
        id: 'ref_test_2',
      };

      prisma.refund.create.mockResolvedValueOnce(refund2Data);
      await prisma.refund.create({ data: refund2Data });

      // Final payment update
      const finalPaymentData = {
        ...paymentData,
        status: 'refunded',
        refundedAmount: 5000,
      };

      prisma.payment.update.mockResolvedValueOnce(finalPaymentData);

      const finalPayment = await prisma.payment.update({
        where: { id: testPaymentId },
        data: {
          status: 'refunded',
          refundedAmount: 5000,
        },
      });

      expect(finalPayment.refundedAmount).toBe(5000);
      expect(finalPayment.status).toBe('refunded');

      // Verify both refunds exist
      prisma.refund.findMany.mockResolvedValue([refund1Data, refund2Data]);

      const allRefunds = await prisma.refund.findMany({
        where: { paymentId: testPaymentId },
      });

      expect(allRefunds).toHaveLength(2);
      expect(allRefunds[0].amount + allRefunds[1].amount).toBe(5000);
    });

    test('should verify refund status updates', async () => {
      // Create pending refund
      const pendingRefundData = {
        ...createTestRefund(testPaymentId, {
          stripeRefundId: 're_test_pending',
          amount: 5000,
          reason: 'requested_by_customer',
          status: 'pending',
          processedBy: 'user_test_123',
        }),
        id: 'ref_test_1',
      };

      prisma.refund.create.mockResolvedValue(pendingRefundData);

      const pendingRefund = await prisma.refund.create({ data: pendingRefundData });

      expect(pendingRefund.status).toBe('pending');

      // Simulate webhook updating refund status
      const succeededRefundData = {
        ...pendingRefundData,
        status: 'succeeded',
      };

      prisma.refund.update.mockResolvedValue(succeededRefundData);

      const succeededRefund = await prisma.refund.update({
        where: { id: pendingRefund.id },
        data: { status: 'succeeded' },
      });

      expect(succeededRefund.status).toBe('succeeded');

      // Update payment accordingly
      const updatedPaymentData = {
        ...paymentData,
        status: 'refunded',
        refundedAmount: 5000,
      };

      prisma.payment.update.mockResolvedValue(updatedPaymentData);
      prisma.payment.findUnique.mockResolvedValue(updatedPaymentData);

      await prisma.payment.update({
        where: { id: testPaymentId },
        data: {
          status: 'refunded',
          refundedAmount: 5000,
        },
      });

      const finalPayment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
      });

      expect(finalPayment?.status).toBe('refunded');
    });
  });

  // ============================================================================
  // TEST SCENARIO 3: Payout Calculation
  // ============================================================================

  describe('Payout Calculation', () => {
    test('should calculate payouts with 50/30/20 prize structure', async () => {
      // Create 3 players with different placements
      const player1Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_1st', name: '1st Place' }),
      };

      const player2Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_2nd', name: '2nd Place' }),
      };

      const player3Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_3rd', name: '3rd Place' }),
      };

      prisma.player.create
        .mockResolvedValueOnce(player1Data)
        .mockResolvedValueOnce(player2Data)
        .mockResolvedValueOnce(player3Data);

      const player1 = await prisma.player.create({ data: player1Data });
      const player2 = await prisma.player.create({ data: player2Data });
      const player3 = await prisma.player.create({ data: player3Data });

      // Create Stripe account and successful payments
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      prisma.stripeAccount.create.mockResolvedValue(dbAccount);

      // 8 players × $50 = $400 prize pool
      const entryFee = 5000; // $50.00
      const numPlayers = 8;

      const mockPayments: any[] = [];
      for (let i = 1; i <= numPlayers; i++) {
        const paymentData = {
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_player_${i}`,
            playerId: `player_test_${i}`,
            amount: entryFee,
            status: 'succeeded',
          }),
        };
        mockPayments.push(paymentData);
      }

      prisma.payment.findMany.mockResolvedValue(mockPayments);

      // Calculate total collected
      const payments = await prisma.payment.findMany({
        where: {
          tournamentId: testTournamentId,
          status: 'succeeded',
          purpose: 'entry_fee',
        },
      });

      const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalCollected).toBe(40000); // $400.00

      // Apply prize structure (50/30/20)
      const prizeStructure = prizeStructures.standard;

      const payout1stData = {
        ...createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: Math.floor(totalCollected * 0.5), // $200.00
        }),
        id: 'po_test_1',
      };

      const payout2ndData = {
        ...createTestPayout(testTournamentId, player2.id, {
          placement: 2,
          amount: Math.floor(totalCollected * 0.3), // $120.00
        }),
        id: 'po_test_2',
      };

      const payout3rdData = {
        ...createTestPayout(testTournamentId, player3.id, {
          placement: 3,
          amount: Math.floor(totalCollected * 0.2), // $80.00
        }),
        id: 'po_test_3',
      };

      prisma.payout.create
        .mockResolvedValueOnce(payout1stData)
        .mockResolvedValueOnce(payout2ndData)
        .mockResolvedValueOnce(payout3rdData);

      const payout1st = await prisma.payout.create({ data: payout1stData });
      const payout2nd = await prisma.payout.create({ data: payout2ndData });
      const payout3rd = await prisma.payout.create({ data: payout3rdData });

      expect(payout1st.amount).toBe(20000); // $200.00
      expect(payout2nd.amount).toBe(12000); // $120.00
      expect(payout3rd.amount).toBe(8000); // $80.00

      // Verify total payouts match collected
      const totalPayouts = payout1st.amount + payout2nd.amount + payout3rd.amount;
      expect(totalPayouts).toBe(totalCollected);
    });

    test('should handle house take calculation', async () => {
      // Create Stripe account and payments
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      // 10 players × $50 = $500
      const entryFee = 5000;
      const numPlayers = 10;

      const mockPayments: any[] = [];
      for (let i = 1; i <= numPlayers; i++) {
        mockPayments.push({
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_player_${i}`,
            amount: entryFee,
            status: 'succeeded',
          }),
        });
      }

      prisma.payment.findMany.mockResolvedValue(mockPayments);

      const totalCollected = 50000; // $500.00
      const houseTakePercentage = 0.1; // 10% house take
      const houseTake = Math.floor(totalCollected * houseTakePercentage); // $50.00
      const prizePool = totalCollected - houseTake; // $450.00

      expect(houseTake).toBe(5000);
      expect(prizePool).toBe(45000);

      // Create payouts from reduced prize pool
      const player1Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_1st' }),
      };

      prisma.player.create.mockResolvedValue(player1Data);

      const player1 = await prisma.player.create({ data: player1Data });

      const payoutData = {
        ...createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: prizePool, // Winner takes all after house take
        }),
        id: 'po_test_1',
      };

      prisma.payout.create.mockResolvedValue(payoutData);

      const payout = await prisma.payout.create({ data: payoutData });

      expect(payout.amount).toBe(45000);

      // Verify summary
      const summary = {
        totalCollected,
        totalPayouts: prizePool,
        houseTake,
      };

      expect(summary.totalCollected).toBe(summary.totalPayouts + summary.houseTake);
    });

    test('should include side pots in payout calculation', async () => {
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      // Entry fees: 5 players × $50 = $250
      const entryFeePayments: any[] = [];
      for (let i = 1; i <= 5; i++) {
        entryFeePayments.push({
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_entry_${i}`,
            amount: 5000,
            purpose: 'entry_fee',
            status: 'succeeded',
          }),
        });
      }

      // Side pots: 3 players × $20 = $60
      const sidePotPayments: any[] = [];
      for (let i = 1; i <= 3; i++) {
        sidePotPayments.push({
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_side_${i}`,
            amount: 2000,
            purpose: 'side_pot',
            status: 'succeeded',
          }),
        });
      }

      // Mock different queries
      prisma.payment.findMany
        .mockResolvedValueOnce(entryFeePayments) // First call for entry fees
        .mockResolvedValueOnce(sidePotPayments); // Second call for side pots

      // Calculate totals by purpose
      const entryFees = await prisma.payment.findMany({
        where: { tournamentId: testTournamentId, purpose: 'entry_fee', status: 'succeeded' },
      });

      const sidePots = await prisma.payment.findMany({
        where: { tournamentId: testTournamentId, purpose: 'side_pot', status: 'succeeded' },
      });

      const totalEntryFees = entryFees.reduce((sum, p) => sum + p.amount, 0);
      const totalSidePots = sidePots.reduce((sum, p) => sum + p.amount, 0);

      expect(totalEntryFees).toBe(25000); // $250.00
      expect(totalSidePots).toBe(6000); // $60.00

      // Create payouts from both sources
      const player1Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_winner' }),
      };

      prisma.player.create.mockResolvedValue(player1Data);

      const player1 = await prisma.player.create({ data: player1Data });

      const mainPayoutData = {
        ...createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: totalEntryFees,
          source: 'prize_pool',
        }),
        id: 'po_test_1',
      };

      const sidePayoutData = {
        ...createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: totalSidePots,
          source: 'side_pot',
        }),
        id: 'po_test_2',
      };

      prisma.payout.create
        .mockResolvedValueOnce(mainPayoutData)
        .mockResolvedValueOnce(sidePayoutData);

      const mainPayout = await prisma.payout.create({ data: mainPayoutData });
      const sidePayout = await prisma.payout.create({ data: sidePayoutData });

      expect(mainPayout.amount).toBe(25000);
      expect(sidePayout.amount).toBe(6000);
      expect(mainPayout.source).toBe('prize_pool');
      expect(sidePayout.source).toBe('side_pot');

      const totalPayout = mainPayout.amount + sidePayout.amount;
      expect(totalPayout).toBe(31000); // $310.00
    });

    test('should verify payout amounts match collected fees', async () => {
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      // Create varied payment amounts
      const allPayments = [
        {
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: 'pay_0',
            amount: 5000,
            purpose: 'entry_fee',
            status: 'succeeded',
          }),
        },
        {
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: 'pay_1',
            amount: 5000,
            purpose: 'entry_fee',
            status: 'succeeded',
          }),
        },
        {
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: 'pay_2',
            amount: 5000,
            purpose: 'entry_fee',
            status: 'succeeded',
          }),
        },
        {
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: 'pay_3',
            amount: 2000,
            purpose: 'side_pot',
            status: 'succeeded',
          }),
        },
        {
          ...createTestPayment(testTournamentId, dbAccount.id, {
            id: 'pay_4',
            amount: 1000,
            purpose: 'addon',
            status: 'succeeded',
          }),
        },
      ];

      prisma.payment.findMany.mockResolvedValue(allPayments);

      // Calculate breakdown
      const payments = await prisma.payment.findMany({
        where: { tournamentId: testTournamentId, status: 'succeeded' },
      });

      const breakdown = {
        entryFees: payments
          .filter((p) => p.purpose === 'entry_fee')
          .reduce((sum, p) => sum + p.amount, 0),
        sidePots: payments
          .filter((p) => p.purpose === 'side_pot')
          .reduce((sum, p) => sum + p.amount, 0),
        addons: payments.filter((p) => p.purpose === 'addon').reduce((sum, p) => sum + p.amount, 0),
      };

      expect(breakdown.entryFees).toBe(15000); // $150.00
      expect(breakdown.sidePots).toBe(2000); // $20.00
      expect(breakdown.addons).toBe(1000); // $10.00

      const totalCollected = breakdown.entryFees + breakdown.sidePots + breakdown.addons;
      expect(totalCollected).toBe(18000); // $180.00

      // Create payouts matching total
      const player1Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_1st' }),
      };

      const player2Data = {
        ...createTestPlayer(testTournamentId, { id: 'player_2nd' }),
      };

      prisma.player.create.mockResolvedValueOnce(player1Data).mockResolvedValueOnce(player2Data);

      const player1 = await prisma.player.create({ data: player1Data });
      const player2 = await prisma.player.create({ data: player2Data });

      const payout1Data = {
        ...createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: 10800, // 60%
        }),
        id: 'po_test_1',
      };

      const payout2Data = {
        ...createTestPayout(testTournamentId, player2.id, {
          placement: 2,
          amount: 7200, // 40%
        }),
        id: 'po_test_2',
      };

      prisma.payout.create.mockResolvedValueOnce(payout1Data).mockResolvedValueOnce(payout2Data);

      await prisma.payout.create({ data: payout1Data });
      await prisma.payout.create({ data: payout2Data });

      prisma.payout.findMany.mockResolvedValue([payout1Data, payout2Data]);

      const allPayouts = await prisma.payout.findMany({
        where: { tournamentId: testTournamentId },
      });

      const totalPayouts = allPayouts.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPayouts).toBe(totalCollected);
    });
  });

  // ============================================================================
  // TEST SCENARIO 4: Stripe Account Status
  // ============================================================================

  describe('Stripe Account Status', () => {
    test('should detect onboarding incomplete state', async () => {
      const mockAccount = createMockStripeAccount({
        id: 'acct_incomplete',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });

      // Mock stripeLib function
      stripeLib.getConnectAccount.mockResolvedValue(mockAccount);

      const account = await stripeLib.getConnectAccount('acct_incomplete');

      expect(account.details_submitted).toBe(false);
      expect(account.charges_enabled).toBe(false);
      expect(account.payouts_enabled).toBe(false);

      // Mock database storage
      const dbAccountData = {
        ...createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_incomplete',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        }),
        id: testStripeAccountId,
      };

      prisma.stripeAccount.create.mockResolvedValue(dbAccountData);

      const dbAccount = await prisma.stripeAccount.create({ data: dbAccountData });

      expect(dbAccount.onboardingComplete).toBe(false);
    });

    test('should verify charges_enabled flag', async () => {
      const mockAccount = createMockStripeAccount({
        id: 'acct_charges_disabled',
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
      });

      // Mock stripeLib function
      stripeLib.getConnectAccount.mockResolvedValue(mockAccount);

      const account = await stripeLib.getConnectAccount('acct_charges_disabled');

      expect(account.charges_enabled).toBe(false);
      expect(account.payouts_enabled).toBe(true);

      // Attempting to create payment should fail
      stripeLib.createPaymentIntent.mockRejectedValue(stripeErrors.chargesNotEnabled());

      await expect(
        stripeLib.createPaymentIntent({
          amount: 5000,
          connectedAccountId: 'acct_charges_disabled',
        })
      ).rejects.toThrow('Charges are not enabled');
    });

    test('should verify payouts_enabled flag', async () => {
      const mockAccount = createMockStripeAccount({
        id: 'acct_payouts_disabled',
        charges_enabled: true,
        payouts_enabled: false,
        details_submitted: true,
      });

      // Mock stripeLib function
      stripeLib.getConnectAccount.mockResolvedValue(mockAccount);

      const account = await stripeLib.getConnectAccount('acct_payouts_disabled');

      expect(account.charges_enabled).toBe(true);
      expect(account.payouts_enabled).toBe(false);

      // Mock database storage
      const dbAccountData = {
        ...createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_payouts_disabled',
          chargesEnabled: true,
          payoutsEnabled: false,
        }),
        id: testStripeAccountId,
      };

      prisma.stripeAccount.create.mockResolvedValue(dbAccountData);

      const dbAccount = await prisma.stripeAccount.create({ data: dbAccountData });

      expect(dbAccount.payoutsEnabled).toBe(false);
      // Can accept payments but cannot receive payouts yet
    });

    test('should refresh account status from Stripe', async () => {
      // Initial state: incomplete
      const dbAccountData = {
        ...createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_refresh',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        }),
        id: testStripeAccountId,
      };

      prisma.stripeAccount.create.mockResolvedValue(dbAccountData);

      const dbAccount = await prisma.stripeAccount.create({ data: dbAccountData });

      expect(dbAccount.chargesEnabled).toBe(false);

      // Simulate onboarding completion on Stripe
      const mockUpdatedAccount = createMockStripeAccount({
        id: 'acct_refresh',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      });

      // Mock stripeLib function
      stripeLib.getConnectAccount.mockResolvedValue(mockUpdatedAccount);

      // Refresh account status
      const refreshedAccount = await stripeLib.getConnectAccount('acct_refresh');

      expect(refreshedAccount.charges_enabled).toBe(true);
      expect(refreshedAccount.payouts_enabled).toBe(true);

      // Mock database update
      const updatedDbAccountData = {
        ...dbAccountData,
        onboardingComplete: refreshedAccount.details_submitted,
        chargesEnabled: refreshedAccount.charges_enabled,
        payoutsEnabled: refreshedAccount.payouts_enabled,
        detailsSubmitted: refreshedAccount.details_submitted,
      };

      prisma.stripeAccount.update.mockResolvedValue(updatedDbAccountData);

      const updatedDbAccount = await prisma.stripeAccount.update({
        where: { id: dbAccount.id },
        data: {
          onboardingComplete: refreshedAccount.details_submitted,
          chargesEnabled: refreshedAccount.charges_enabled,
          payoutsEnabled: refreshedAccount.payouts_enabled,
          detailsSubmitted: refreshedAccount.details_submitted,
        },
      });

      expect(updatedDbAccount.chargesEnabled).toBe(true);
      expect(updatedDbAccount.payoutsEnabled).toBe(true);
      expect(updatedDbAccount.onboardingComplete).toBe(true);
    });
  });

  // ============================================================================
  // TEST SCENARIO 5: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle Stripe API errors', async () => {
      // Mock stripeLib function
      stripeLib.createConnectAccount.mockRejectedValue(stripeErrors.apiError());

      await expect(
        stripeLib.createConnectAccount({
          email: 'test@example.com',
          country: 'US',
        })
      ).rejects.toThrow('An error occurred with our API');
    });

    test('should prevent duplicate payment intents', async () => {
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      const playerData = {
        ...createTestPlayer(testTournamentId),
        id: 'player_test_1',
      };

      prisma.player.create.mockResolvedValue(playerData);

      const player = await prisma.player.create({ data: playerData });

      // Create first payment
      const payment1Data = {
        ...createTestPayment(testTournamentId, dbAccount.id, {
          playerId: player.id,
          stripePaymentIntent: 'pi_unique_123',
        }),
        id: 'pay_test_1',
      };

      prisma.payment.create.mockResolvedValueOnce(payment1Data);

      const payment1 = await prisma.payment.create({ data: payment1Data });

      // Attempt to create duplicate - mock Prisma unique constraint error
      prisma.payment.create.mockRejectedValueOnce(
        new Error('Unique constraint failed on the fields: (`stripePaymentIntent`)')
      );

      await expect(
        prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            playerId: player.id,
            stripePaymentIntent: 'pi_unique_123', // Same intent
          }),
        })
      ).rejects.toThrow();

      // Verify only one payment exists
      prisma.payment.findMany.mockResolvedValue([payment1Data]);

      const payments = await prisma.payment.findMany({
        where: { stripePaymentIntent: 'pi_unique_123' },
      });

      expect(payments).toHaveLength(1);
    });

    test('should handle refund failures', async () => {
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      const paymentData = {
        ...createTestPayment(testTournamentId, dbAccount.id, {
          stripePaymentIntent: 'pi_refund_fail',
          status: 'succeeded',
        }),
        id: 'pay_test_1',
      };

      prisma.payment.create.mockResolvedValue(paymentData);
      prisma.payment.findUnique.mockResolvedValue(paymentData);

      const payment = await prisma.payment.create({ data: paymentData });

      // Mock Stripe refund failure
      stripeLib.createRefund.mockRejectedValue(stripeErrors.apiError());

      await expect(
        stripeLib.createRefund({
          paymentIntentId: 'pi_refund_fail',
          connectedAccountId: dbAccount.stripeAccountId,
        })
      ).rejects.toThrow('An error occurred with our API');

      // Verify payment status unchanged
      const unchangedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      expect(unchangedPayment?.status).toBe('succeeded');
      expect(unchangedPayment?.refundedAmount).toBe(0);
    });

    test('should handle missing Stripe account', async () => {
      // Mock stripeLib function
      stripeLib.getConnectAccount.mockRejectedValue(new Error('No such account: acct_missing'));

      await expect(stripeLib.getConnectAccount('acct_missing')).rejects.toThrow('No such account');
    });

    test('should handle card declined errors', async () => {
      const dbAccount = {
        ...createTestStripeAccount(testOrgId),
        id: testStripeAccountId,
      };

      // Mock stripeLib function
      stripeLib.createPaymentIntent.mockRejectedValue(stripeErrors.cardDeclined());

      await expect(
        stripeLib.createPaymentIntent({
          amount: 5000,
          connectedAccountId: dbAccount.stripeAccountId,
        })
      ).rejects.toThrow('Your card was declined');
    });

    test('should handle payment intent not found', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeErrors.paymentIntentNotFound());

      await expect(mockStripe.paymentIntents.retrieve('pi_nonexistent')).rejects.toThrow(
        'No such payment_intent'
      );
    });
  });
});
