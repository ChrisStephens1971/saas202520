/**
 * Stripe Service Helper
 * Handles Stripe SDK initialization and common operations
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with API version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

/**
 * Create a Stripe Connect account for an organization
 */
export async function createConnectAccount(params: {
  email?: string;
  country?: string;
  businessType?: 'individual' | 'company' | 'non_profit';
}): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'standard', // Use Standard Connect for full independence
    email: params.email,
    country: params.country || 'US',
    business_type: params.businessType || 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account;
}

/**
 * Create an onboarding link for a Connect account
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Retrieve Connect account details
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  return await stripe.accounts.retrieve(accountId);
}

/**
 * Create a payment intent
 */
export async function createPaymentIntent(params: {
  amount: number; // in cents
  currency?: string;
  connectedAccountId: string;
  applicationFeeAmount?: number; // Platform fee in cents
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency || 'usd',
    application_fee_amount: params.applicationFeeAmount,
    metadata: params.metadata || {},
  }, {
    stripeAccount: params.connectedAccountId, // Create payment on connected account
  });

  return paymentIntent;
}

/**
 * Create a refund
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // Optional partial refund in cents
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  connectedAccountId: string;
}): Promise<Stripe.Refund> {
  const refund = await stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amount,
    reason: params.reason,
  }, {
    stripeAccount: params.connectedAccountId,
  });

  return refund;
}

/**
 * Get payment receipt URL
 */
export function getReceiptUrl(chargeId: string): string {
  return `https://dashboard.stripe.com/charges/${chargeId}`;
}
