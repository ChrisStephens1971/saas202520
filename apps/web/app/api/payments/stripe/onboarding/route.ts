/**
 * POST /api/payments/stripe/onboarding
 * Create Stripe Connect account and onboarding link (PAY-001)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createConnectAccount, createAccountLink } from '@/lib/stripe';
import type { CreateStripeAccountRequest, CreateStripeAccountResponse } from '@repo/shared/types/payment';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateStripeAccountRequest = await request.json();
    const { orgId, country } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing required field: orgId' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        orgId,
        userId: session.user.id,
        role: { in: ['owner', 'td'] }, // Only owners and TDs can setup payments
      },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an owner or TD to set up payments' },
        { status: 403 }
      );
    }

    // Check if Stripe account already exists
    const existingAccount = await prisma.stripeAccount.findUnique({
      where: { orgId },
    });

    if (existingAccount && existingAccount.onboardingComplete) {
      return NextResponse.json(
        { error: 'Stripe account already exists and is onboarded' },
        { status: 400 }
      );
    }

    let stripeAccountId: string;

    if (existingAccount) {
      // Use existing Stripe account
      stripeAccountId = existingAccount.stripeAccountId;
    } else {
      // Create new Stripe Connect account
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      const stripeAccount = await createConnectAccount({
        country: country || 'US',
        businessType: 'individual', // Can be customized
      });

      stripeAccountId = stripeAccount.id;

      // Save to database
      await prisma.stripeAccount.create({
        data: {
          orgId,
          stripeAccountId,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          country: country || 'US',
          currency: 'usd',
        },
      });
    }

    // Create onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3020';
    const returnUrl = `${baseUrl}/settings/payments/onboarding/return?org=${orgId}`;
    const refreshUrl = `${baseUrl}/settings/payments/onboarding/refresh?org=${orgId}`;

    const accountLink = await createAccountLink(
      stripeAccountId,
      returnUrl,
      refreshUrl
    );

    const account = await prisma.stripeAccount.findUnique({
      where: { orgId },
    });

    const response: CreateStripeAccountResponse = {
      account: account as any,
      onboardingUrl: accountLink.url,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error creating Stripe onboarding:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
