/**
 * Unit Tests for POST /api/payments/create-intent
 * Tests PAY-002 (Payment intent creation for entry fees)
 */

import { vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createMockSession, createMockPrisma, createMockStripe, factories } from '../../__tests__/utils/test-helpers';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/prisma');
vi.mock('@/lib/stripe');

const mockGetServerSession = (await import('@/auth')).getServerSession as any;
const mockPrisma = createMockPrisma();
const mockStripe = createMockStripe();
const mockCreatePaymentIntent = (await import('@/lib/stripe')).createPaymentIntent as any;

// Setup mocks
(await import('@/lib/prisma')).prisma = mockPrisma as any;

describe('POST /api/payments/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePaymentIntent.mockResolvedValue({
      id: 'pi_test123',
      client_secret: 'pi_test123_secret_abc',
    });
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return 400 if tournamentId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if amount is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if purpose is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if amount is zero or negative', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 0, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Amount must be greater than 0');
    });
  });

  describe('Tournament and Organization Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return 404 if tournament not found', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tournament not found');
    });

    it('should return 403 if user not member of organization', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue(
        factories.tournament({
          organization: {
            ...factories.organization(),
            members: [], // No members
          },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized: You do not have access to this tournament');
    });
  });

  describe('Stripe Account Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.tournament.findUnique.mockResolvedValue(factories.tournament());
    });

    it('should return 400 if organization has no Stripe account', async () => {
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Payment processing is not enabled for this organization');
    });

    it('should return 400 if charges not enabled on Stripe account', async () => {
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(
        factories.stripeAccount({ chargesEnabled: false })
      );

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Payment processing is not enabled for this organization');
    });
  });

  describe('Payment Intent Creation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.tournament.findUnique.mockResolvedValue(factories.tournament());
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(factories.stripeAccount());
      mockPrisma.payment.create.mockResolvedValue(factories.payment());
    });

    it('should create Stripe payment intent with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          tournamentId: 'tournament-123',
          playerId: 'player-123',
          amount: 5000,
          currency: 'usd',
          purpose: 'entry_fee',
          description: 'Entry fee for Test Tournament',
        }),
      });

      await POST(request);

      expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        connectedAccountId: 'acct_test123',
        metadata: {
          tournamentId: 'tournament-123',
          playerId: 'player-123',
          purpose: 'entry_fee',
          description: 'Entry fee for Test Tournament',
        },
      });
    });

    it('should default currency to usd if not provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      await POST(request);

      expect(mockCreatePaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        })
      );
    });

    it('should save payment record to database', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          tournamentId: 'tournament-123',
          playerId: 'player-123',
          amount: 5000,
          purpose: 'entry_fee',
          description: 'Entry fee',
        }),
      });

      await POST(request);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tournamentId: 'tournament-123',
          playerId: 'player-123',
          stripePaymentIntent: 'pi_test123',
          amount: 5000,
          currency: 'usd',
          status: 'pending',
          purpose: 'entry_fee',
          description: 'Entry fee',
        }),
      });
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.tournament.findUnique.mockResolvedValue(factories.tournament());
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(factories.stripeAccount());
      mockPrisma.payment.create.mockResolvedValue(factories.payment());
    });

    it('should return payment and clientSecret in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('payment');
      expect(data).toHaveProperty('clientSecret');
      expect(data.clientSecret).toBe('pi_test123_secret_abc');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.tournament.findUnique.mockResolvedValue(factories.tournament());
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(factories.stripeAccount());
    });

    it('should return 500 on Stripe API error', async () => {
      mockCreatePaymentIntent.mockRejectedValue(new Error('Stripe API error'));

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Stripe API error');
    });

    it('should return 500 on database error', async () => {
      mockPrisma.payment.create.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ tournamentId: 'tournament-123', amount: 5000, purpose: 'entry_fee' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });
});
