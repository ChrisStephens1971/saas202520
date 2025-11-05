/**
 * Stripe Payment Integration Tests
 * Tests complete payment workflows including Connect onboarding, payments, refunds, and payouts
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';
import * as stripeLib from '../../lib/stripe';
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

// Initialize Prisma client for tests
const prisma = new PrismaClient();

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

describe('Stripe Payment Integration Tests', () => {
  let testOrgId: string;
  let testTournamentId: string;
  let testStripeAccountId: string;
  let mockStripe: any;

  beforeAll(async () => {
    // Get mocked Stripe instance
    const Stripe = (await import('stripe')).default;
    mockStripe = new Stripe('sk_test_mock', { apiVersion: '2024-11-20.acacia' });
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.payout.deleteMany({});
    await prisma.refund.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.stripeAccount.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.organizationMember.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const user = await prisma.user.create({
      data: createTestUser(),
    });

    // Create test organization
    const org = await prisma.organization.create({
      data: createTestOrganization(),
    });
    testOrgId = org.id;

    // Create organization member
    await prisma.organizationMember.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: 'owner',
      },
    });

    // Create test tournament
    const tournament = await prisma.tournament.create({
      data: createTestTournament(org.id),
    });
    testTournamentId = tournament.id;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.payout.deleteMany({});
    await prisma.refund.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.stripeAccount.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.organizationMember.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
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

      mockStripe.accounts.create.mockResolvedValue(mockAccount);

      const mockAccountLink = createMockAccountLink('acct_test_new');
      mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink);

      // Create Stripe Connect account
      const account = await stripeLib.createConnectAccount({
        email: 'test@poolhall.com',
        country: 'US',
        businessType: 'individual',
      });

      expect(account.id).toBe('acct_test_new');
      expect(mockStripe.accounts.create).toHaveBeenCalledWith({
        type: 'standard',
        email: 'test@poolhall.com',
        country: 'US',
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Store in database
      const dbAccount = await prisma.stripeAccount.create({
        data: {
          orgId: testOrgId,
          stripeAccountId: account.id,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          country: 'US',
          currency: 'usd',
        },
      });

      testStripeAccountId = dbAccount.id;

      expect(dbAccount.stripeAccountId).toBe('acct_test_new');
      expect(dbAccount.onboardingComplete).toBe(false);

      // Create onboarding link
      const accountLink = await stripeLib.createAccountLink(
        account.id,
        'https://example.com/return',
        'https://example.com/refresh'
      );

      expect(accountLink.url).toBeDefined();
      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_test_new',
        return_url: 'https://example.com/return',
        refresh_url: 'https://example.com/refresh',
        type: 'account_onboarding',
      });
    });

    test('should create payment intent for entry fee', async () => {
      // Setup: Create Stripe account first
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_test_complete',
        }),
      });

      testStripeAccountId = dbAccount.id;

      // Create player
      const player = await prisma.player.create({
        data: createTestPlayer(testTournamentId),
      });

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

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

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

      // Store payment in database
      const payment = await prisma.payment.create({
        data: {
          tournamentId: testTournamentId,
          playerId: player.id,
          stripeAccountId: dbAccount.id,
          stripePaymentIntent: paymentIntent.id,
          amount: 5000,
          currency: 'usd',
          status: 'pending',
          purpose: 'entry_fee',
          description: 'Tournament entry fee',
        },
      });

      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(5000);
    });

    test('should confirm payment and generate receipt', async () => {
      // Setup: Create account and payment
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      const player = await prisma.player.create({
        data: createTestPlayer(testTournamentId),
      });

      const payment = await prisma.payment.create({
        data: createTestPayment(testTournamentId, dbAccount.id, {
          playerId: player.id,
          stripePaymentIntent: 'pi_test_confirm',
          status: 'pending',
        }),
      });

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

      // Update payment in database
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
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
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      const player = await prisma.player.create({
        data: createTestPlayer(testTournamentId),
      });

      const payment = await prisma.payment.create({
        data: createTestPayment(testTournamentId, dbAccount.id, {
          playerId: player.id,
          status: 'succeeded',
          receiptUrl: 'https://pay.stripe.com/receipts/test',
        }),
      });

      // Verify all records exist and are linked correctly
      const verifyPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
        include: {
          stripeAccount: true,
        },
      });

      expect(verifyPayment).toBeDefined();
      expect(verifyPayment?.status).toBe('succeeded');
      expect(verifyPayment?.stripeAccount.orgId).toBe(testOrgId);
      expect(verifyPayment?.tournamentId).toBe(testTournamentId);
      expect(verifyPayment?.playerId).toBe(player.id);

      // Verify tenant isolation
      const orgPayments = await prisma.payment.findMany({
        where: {
          stripeAccount: {
            orgId: testOrgId,
          },
        },
      });

      expect(orgPayments).toHaveLength(1);
      expect(orgPayments[0].id).toBe(payment.id);
    });
  });

  // ============================================================================
  // TEST SCENARIO 2: Refund Flow
  // ============================================================================

  describe('Refund Flow', () => {
    let testPaymentId: string;

    beforeEach(async () => {
      // Setup: Create successful payment
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      const player = await prisma.player.create({
        data: createTestPlayer(testTournamentId),
      });

      const payment = await prisma.payment.create({
        data: createTestPayment(testTournamentId, dbAccount.id, {
          playerId: player.id,
          stripePaymentIntent: 'pi_test_refund',
          amount: 5000,
          status: 'succeeded',
        }),
      });

      testPaymentId = payment.id;
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

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      // Create refund
      const refund = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      expect(refund.id).toBe('re_test_full');
      expect(refund.amount).toBe(5000);
      expect(refund.status).toBe('succeeded');

      // Store refund in database
      const dbRefund = await prisma.refund.create({
        data: {
          paymentId: testPaymentId,
          stripeRefundId: refund.id,
          amount: 5000,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        },
      });

      // Update payment status
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

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      // Create partial refund
      const refund = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        amount: partialAmount,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      expect(refund.amount).toBe(partialAmount);

      // Store in database
      await prisma.refund.create({
        data: {
          paymentId: testPaymentId,
          stripeRefundId: refund.id,
          amount: partialAmount,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        },
      });

      // Update payment
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
      mockStripe.refunds.create.mockRejectedValue(stripeErrors.refundExceedsAmount());

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

      mockStripe.refunds.create.mockResolvedValueOnce(mockRefund1);

      const refund1 = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        amount: 2000,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      await prisma.refund.create({
        data: {
          paymentId: testPaymentId,
          stripeRefundId: refund1.id,
          amount: 2000,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        },
      });

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

      mockStripe.refunds.create.mockResolvedValueOnce(mockRefund2);

      const refund2 = await stripeLib.createRefund({
        paymentIntentId: payment!.stripePaymentIntent,
        amount: 3000,
        connectedAccountId: payment!.stripeAccount.stripeAccountId,
        reason: 'requested_by_customer',
      });

      await prisma.refund.create({
        data: {
          paymentId: testPaymentId,
          stripeRefundId: refund2.id,
          amount: 3000,
          reason: 'requested_by_customer',
          status: 'succeeded',
          processedBy: 'user_test_123',
        },
      });

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
      const allRefunds = await prisma.refund.findMany({
        where: { paymentId: testPaymentId },
      });

      expect(allRefunds).toHaveLength(2);
      expect(allRefunds[0].amount + allRefunds[1].amount).toBe(5000);
    });

    test('should verify refund status updates', async () => {
      // Create pending refund
      const payment = await prisma.payment.findUnique({
        where: { id: testPaymentId },
      });

      const pendingRefund = await prisma.refund.create({
        data: {
          paymentId: testPaymentId,
          stripeRefundId: 're_test_pending',
          amount: 5000,
          reason: 'requested_by_customer',
          status: 'pending',
          processedBy: 'user_test_123',
        },
      });

      expect(pendingRefund.status).toBe('pending');

      // Simulate webhook updating refund status
      const succeededRefund = await prisma.refund.update({
        where: { id: pendingRefund.id },
        data: { status: 'succeeded' },
      });

      expect(succeededRefund.status).toBe('succeeded');

      // Update payment accordingly
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
      const player1 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_1st', name: '1st Place' }),
      });

      const player2 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_2nd', name: '2nd Place' }),
      });

      const player3 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_3rd', name: '3rd Place' }),
      });

      // Create Stripe account and successful payments
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      // 8 players × $50 = $400 prize pool
      const entryFee = 5000; // $50.00
      const numPlayers = 8;

      for (let i = 1; i <= numPlayers; i++) {
        await prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_player_${i}`,
            playerId: `player_test_${i}`,
            amount: entryFee,
            status: 'succeeded',
          }),
        });
      }

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

      const payout1st = await prisma.payout.create({
        data: createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: Math.floor(totalCollected * 0.5), // $200.00
        }),
      });

      const payout2nd = await prisma.payout.create({
        data: createTestPayout(testTournamentId, player2.id, {
          placement: 2,
          amount: Math.floor(totalCollected * 0.3), // $120.00
        }),
      });

      const payout3rd = await prisma.payout.create({
        data: createTestPayout(testTournamentId, player3.id, {
          placement: 3,
          amount: Math.floor(totalCollected * 0.2), // $80.00
        }),
      });

      expect(payout1st.amount).toBe(20000); // $200.00
      expect(payout2nd.amount).toBe(12000); // $120.00
      expect(payout3rd.amount).toBe(8000);  // $80.00

      // Verify total payouts match collected
      const totalPayouts = payout1st.amount + payout2nd.amount + payout3rd.amount;
      expect(totalPayouts).toBe(totalCollected);
    });

    test('should handle house take calculation', async () => {
      // Create Stripe account and payments
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      // 10 players × $50 = $500
      const entryFee = 5000;
      const numPlayers = 10;

      for (let i = 1; i <= numPlayers; i++) {
        await prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_player_${i}`,
            amount: entryFee,
            status: 'succeeded',
          }),
        });
      }

      const totalCollected = 50000; // $500.00
      const houseTakePercentage = 0.1; // 10% house take
      const houseTake = Math.floor(totalCollected * houseTakePercentage); // $50.00
      const prizePool = totalCollected - houseTake; // $450.00

      expect(houseTake).toBe(5000);
      expect(prizePool).toBe(45000);

      // Create payouts from reduced prize pool
      const player1 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_1st' }),
      });

      const payout = await prisma.payout.create({
        data: createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: prizePool, // Winner takes all after house take
        }),
      });

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
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      // Entry fees: 5 players × $50 = $250
      for (let i = 1; i <= 5; i++) {
        await prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_entry_${i}`,
            amount: 5000,
            purpose: 'entry_fee',
            status: 'succeeded',
          }),
        });
      }

      // Side pots: 3 players × $20 = $60
      for (let i = 1; i <= 3; i++) {
        await prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_side_${i}`,
            amount: 2000,
            purpose: 'side_pot',
            status: 'succeeded',
          }),
        });
      }

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
      expect(totalSidePots).toBe(6000);   // $60.00

      // Create payouts from both sources
      const player1 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_winner' }),
      });

      const mainPayout = await prisma.payout.create({
        data: createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: totalEntryFees,
          source: 'prize_pool',
        }),
      });

      const sidePayout = await prisma.payout.create({
        data: createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: totalSidePots,
          source: 'side_pot',
        }),
      });

      expect(mainPayout.amount).toBe(25000);
      expect(sidePayout.amount).toBe(6000);
      expect(mainPayout.source).toBe('prize_pool');
      expect(sidePayout.source).toBe('side_pot');

      const totalPayout = mainPayout.amount + sidePayout.amount;
      expect(totalPayout).toBe(31000); // $310.00
    });

    test('should verify payout amounts match collected fees', async () => {
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      // Create varied payment amounts
      const payments = [
        { amount: 5000, purpose: 'entry_fee' },
        { amount: 5000, purpose: 'entry_fee' },
        { amount: 5000, purpose: 'entry_fee' },
        { amount: 2000, purpose: 'side_pot' },
        { amount: 1000, purpose: 'addon' },
      ];

      for (let i = 0; i < payments.length; i++) {
        await prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            id: `pay_${i}`,
            amount: payments[i].amount,
            purpose: payments[i].purpose as any,
            status: 'succeeded',
          }),
        });
      }

      // Calculate breakdown
      const allPayments = await prisma.payment.findMany({
        where: { tournamentId: testTournamentId, status: 'succeeded' },
      });

      const breakdown = {
        entryFees: allPayments
          .filter(p => p.purpose === 'entry_fee')
          .reduce((sum, p) => sum + p.amount, 0),
        sidePots: allPayments
          .filter(p => p.purpose === 'side_pot')
          .reduce((sum, p) => sum + p.amount, 0),
        addons: allPayments
          .filter(p => p.purpose === 'addon')
          .reduce((sum, p) => sum + p.amount, 0),
      };

      expect(breakdown.entryFees).toBe(15000); // $150.00
      expect(breakdown.sidePots).toBe(2000);   // $20.00
      expect(breakdown.addons).toBe(1000);     // $10.00

      const totalCollected = breakdown.entryFees + breakdown.sidePots + breakdown.addons;
      expect(totalCollected).toBe(18000); // $180.00

      // Create payouts matching total
      const player1 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_1st' }),
      });

      const player2 = await prisma.player.create({
        data: createTestPlayer(testTournamentId, { id: 'player_2nd' }),
      });

      await prisma.payout.create({
        data: createTestPayout(testTournamentId, player1.id, {
          placement: 1,
          amount: 10800, // 60%
        }),
      });

      await prisma.payout.create({
        data: createTestPayout(testTournamentId, player2.id, {
          placement: 2,
          amount: 7200, // 40%
        }),
      });

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

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const account = await stripeLib.getConnectAccount('acct_incomplete');

      expect(account.details_submitted).toBe(false);
      expect(account.charges_enabled).toBe(false);
      expect(account.payouts_enabled).toBe(false);

      // Store in database
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_incomplete',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        }),
      });

      expect(dbAccount.onboardingComplete).toBe(false);
    });

    test('should verify charges_enabled flag', async () => {
      const mockAccount = createMockStripeAccount({
        id: 'acct_charges_disabled',
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
      });

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const account = await stripeLib.getConnectAccount('acct_charges_disabled');

      expect(account.charges_enabled).toBe(false);
      expect(account.payouts_enabled).toBe(true);

      // Attempting to create payment should fail
      mockStripe.paymentIntents.create.mockRejectedValue(stripeErrors.chargesNotEnabled());

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

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const account = await stripeLib.getConnectAccount('acct_payouts_disabled');

      expect(account.charges_enabled).toBe(true);
      expect(account.payouts_enabled).toBe(false);

      // Store in database
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_payouts_disabled',
          chargesEnabled: true,
          payoutsEnabled: false,
        }),
      });

      expect(dbAccount.payoutsEnabled).toBe(false);
      // Can accept payments but cannot receive payouts yet
    });

    test('should refresh account status from Stripe', async () => {
      // Initial state: incomplete
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId, {
          stripeAccountId: 'acct_refresh',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        }),
      });

      expect(dbAccount.chargesEnabled).toBe(false);

      // Simulate onboarding completion on Stripe
      const mockUpdatedAccount = createMockStripeAccount({
        id: 'acct_refresh',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      });

      mockStripe.accounts.retrieve.mockResolvedValue(mockUpdatedAccount);

      // Refresh account status
      const refreshedAccount = await stripeLib.getConnectAccount('acct_refresh');

      expect(refreshedAccount.charges_enabled).toBe(true);
      expect(refreshedAccount.payouts_enabled).toBe(true);

      // Update database
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
      mockStripe.accounts.create.mockRejectedValue(stripeErrors.apiError());

      await expect(
        stripeLib.createConnectAccount({
          email: 'test@example.com',
          country: 'US',
        })
      ).rejects.toThrow('An error occurred with our API');
    });

    test('should prevent duplicate payment intents', async () => {
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      const player = await prisma.player.create({
        data: createTestPlayer(testTournamentId),
      });

      // Create first payment
      const payment1 = await prisma.payment.create({
        data: createTestPayment(testTournamentId, dbAccount.id, {
          playerId: player.id,
          stripePaymentIntent: 'pi_unique_123',
        }),
      });

      // Attempt to create duplicate
      await expect(
        prisma.payment.create({
          data: createTestPayment(testTournamentId, dbAccount.id, {
            playerId: player.id,
            stripePaymentIntent: 'pi_unique_123', // Same intent
          }),
        })
      ).rejects.toThrow();

      // Verify only one payment exists
      const payments = await prisma.payment.findMany({
        where: { stripePaymentIntent: 'pi_unique_123' },
      });

      expect(payments).toHaveLength(1);
    });

    test('should handle refund failures', async () => {
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      const payment = await prisma.payment.create({
        data: createTestPayment(testTournamentId, dbAccount.id, {
          stripePaymentIntent: 'pi_refund_fail',
          status: 'succeeded',
        }),
      });

      // Mock Stripe refund failure
      mockStripe.refunds.create.mockRejectedValue(stripeErrors.apiError());

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
      mockStripe.accounts.retrieve.mockRejectedValue(
        new Error('No such account: acct_missing')
      );

      await expect(
        stripeLib.getConnectAccount('acct_missing')
      ).rejects.toThrow('No such account');
    });

    test('should handle card declined errors', async () => {
      const dbAccount = await prisma.stripeAccount.create({
        data: createTestStripeAccount(testOrgId),
      });

      mockStripe.paymentIntents.create.mockRejectedValue(stripeErrors.cardDeclined());

      await expect(
        stripeLib.createPaymentIntent({
          amount: 5000,
          connectedAccountId: dbAccount.stripeAccountId,
        })
      ).rejects.toThrow('Your card was declined');
    });

    test('should handle payment intent not found', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(
        stripeErrors.paymentIntentNotFound()
      );

      await expect(
        mockStripe.paymentIntents.retrieve('pi_nonexistent')
      ).rejects.toThrow('No such payment_intent');
    });
  });
});
