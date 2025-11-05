/**
 * Unit Tests for POST /api/payments/stripe/onboarding
 * Tests PAY-001 (Stripe Connect account creation and onboarding)
 */

import { vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createMockSession, createMockPrisma, createMockStripe, factories } from '../../../../__tests__/utils/test-helpers';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/prisma');
vi.mock('@/lib/stripe');

const mockGetServerSession = (await import('@/auth')).getServerSession as any;
const mockPrisma = createMockPrisma();
const mockStripe = createMockStripe();
const mockCreateConnectAccount = (await import('@/lib/stripe')).createConnectAccount as any;
const mockCreateAccountLink = (await import('@/lib/stripe')).createAccountLink as any;

// Setup mocks
(await import('@/lib/prisma')).prisma = mockPrisma as any;

describe('POST /api/payments/stripe/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateConnectAccount.mockResolvedValue({ id: 'acct_test123' });
    mockCreateAccountLink.mockResolvedValue({ url: 'https://connect.stripe.com/setup/e/acct_test123/abc123' });
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3020';
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
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

    it('should return 400 if orgId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required field: orgId');
    });
  });

  describe('Permission Checks', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return 403 if user is not an owner or TD', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized: You must be an owner or TD to set up payments');
    });

    it('should allow owners to create Stripe account', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'owner' })
      );
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(factories.stripeAccount());

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.organizationMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: ['owner', 'td'] },
          }),
        })
      );
    });

    it('should allow TDs to create Stripe account', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'td' })
      );
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(factories.stripeAccount());

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Existing Account Checks', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'owner' })
      );
    });

    it('should return 400 if Stripe account already exists and is onboarded', async () => {
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(
        factories.stripeAccount({ onboardingComplete: true })
      );

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Stripe account already exists and is onboarded');
    });

    it('should reuse existing Stripe account if not onboarded', async () => {
      const existingAccount = factories.stripeAccount({
        stripeAccountId: 'acct_existing123',
        onboardingComplete: false,
      });
      mockPrisma.stripeAccount.findUnique
        .mockResolvedValueOnce(existingAccount) // First check
        .mockResolvedValueOnce(existingAccount); // Final fetch

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockCreateConnectAccount).not.toHaveBeenCalled();
      expect(mockCreateAccountLink).toHaveBeenCalledWith(
        'acct_existing123',
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Stripe Account Creation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'owner' })
      );
      mockPrisma.stripeAccount.findUnique
        .mockResolvedValueOnce(null) // No existing account
        .mockResolvedValueOnce(factories.stripeAccount()); // After creation
    });

    it('should create new Stripe Connect account', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123', country: 'US' }),
      });

      await POST(request);

      expect(mockCreateConnectAccount).toHaveBeenCalledWith({
        country: 'US',
        businessType: 'individual',
      });
    });

    it('should default country to US if not provided', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      await POST(request);

      expect(mockCreateConnectAccount).toHaveBeenCalledWith({
        country: 'US',
        businessType: 'individual',
      });
    });

    it('should save Stripe account to database', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());
      mockCreateConnectAccount.mockResolvedValue({ id: 'acct_new123' });

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123', country: 'CA' }),
      });

      await POST(request);

      expect(mockPrisma.stripeAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: 'org-123',
          stripeAccountId: 'acct_new123',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          country: 'CA',
          currency: 'usd',
        }),
      });
    });
  });

  describe('Onboarding Link Generation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'owner' })
      );
      mockPrisma.stripeAccount.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(factories.stripeAccount({ stripeAccountId: 'acct_test123' }));
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());
    });

    it('should create account link with correct URLs', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      await POST(request);

      expect(mockCreateAccountLink).toHaveBeenCalledWith(
        'acct_test123',
        'http://localhost:3020/settings/payments/onboarding/return?org=org-123',
        'http://localhost:3020/settings/payments/onboarding/refresh?org=org-123'
      );
    });

    it('should include onboardingUrl in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('onboardingUrl');
      expect(data.onboardingUrl).toBe('https://connect.stripe.com/setup/e/acct_test123/abc123');
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'owner' })
      );
      mockPrisma.stripeAccount.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(factories.stripeAccount());
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockPrisma.stripeAccount.create.mockResolvedValue(factories.stripeAccount());
    });

    it('should return account and onboardingUrl in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('account');
      expect(data).toHaveProperty('onboardingUrl');
      expect(data.account).toHaveProperty('orgId');
      expect(data.account).toHaveProperty('stripeAccountId');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.organizationMember.findFirst.mockResolvedValue(
        factories.organizationMember({ role: 'owner' })
      );
    });

    it('should return 500 on Stripe API error', async () => {
      mockPrisma.stripeAccount.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(factories.organization());
      mockCreateConnectAccount.mockRejectedValue(new Error('Stripe API error'));

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Stripe API error');
    });

    it('should return 500 on database error', async () => {
      mockPrisma.stripeAccount.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/onboarding', {
        method: 'POST',
        body: JSON.stringify({ orgId: 'org-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });
});
