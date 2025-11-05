/**
 * GET /api/payments/stripe/account?orgId={id}
 * Get Stripe Connect account status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getConnectAccount } from '@/lib/stripe';
import type { GetStripeAccountStatusResponse } from '@tournament/shared/types/payment';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orgId' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        orgId,
        userId: session.user.id,
      },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Get Stripe account from database
    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { orgId },
    });

    if (!stripeAccount) {
      return NextResponse.json(
        {
          account: null,
          requiresOnboarding: true,
        },
        { status: 200 }
      );
    }

    // Fetch latest status from Stripe
    const stripeAccountDetails = await getConnectAccount(stripeAccount.stripeAccountId);

    // Update database with latest status
    const updatedAccount = await prisma.stripeAccount.update({
      where: { orgId },
      data: {
        onboardingComplete: stripeAccountDetails.details_submitted || false,
        chargesEnabled: stripeAccountDetails.charges_enabled || false,
        payoutsEnabled: stripeAccountDetails.payouts_enabled || false,
        detailsSubmitted: stripeAccountDetails.details_submitted || false,
      },
    });

    const response: GetStripeAccountStatusResponse = {
      account: {
        id: updatedAccount.id,
        orgId: updatedAccount.orgId,
        stripeAccountId: updatedAccount.stripeAccountId,
        onboardingComplete: updatedAccount.onboardingComplete,
        chargesEnabled: updatedAccount.chargesEnabled,
        payoutsEnabled: updatedAccount.payoutsEnabled,
        detailsSubmitted: updatedAccount.detailsSubmitted,
        country: updatedAccount.country ?? undefined,
        currency: updatedAccount.currency ?? 'usd',
        createdAt: updatedAccount.createdAt,
        updatedAt: updatedAccount.updatedAt,
      },
      requiresOnboarding: !updatedAccount.onboardingComplete,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching Stripe account status:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
