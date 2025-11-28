/**
 * Stripe Mock Factories
 * Factory functions to create mock Stripe objects for testing
 */

import type Stripe from 'stripe';

/**
 * Create a mock Stripe Account (Connect account)
 */
export function createMockStripeAccount(overrides?: Partial<Stripe.Account>): Stripe.Account {
  return {
    id: overrides?.id || `acct_${generateRandomId()}`,
    object: 'account',
    business_type: 'individual',
    charges_enabled: overrides?.charges_enabled ?? true,
    payouts_enabled: overrides?.payouts_enabled ?? true,
    country: overrides?.country || 'US',
    created: Math.floor(Date.now() / 1000),
    default_currency: 'usd',
    details_submitted: overrides?.details_submitted ?? true,
    email: overrides?.email || 'test@example.com',
    type: 'standard',
    capabilities: {
      card_payments: overrides?.capabilities?.card_payments || 'active',
      transfers: overrides?.capabilities?.transfers || 'active',
    },
    requirements: {
      currently_due: [],
      eventually_due: [],
      past_due: [],
      pending_verification: [],
      disabled_reason: null,
      current_deadline: null,
      alternatives: null,
      errors: [],
    },
    settings: {
      branding: {
        icon: null,
        logo: null,
        primary_color: null,
        secondary_color: null,
      },
      card_issuing: {
        tos_acceptance: {
          date: null,
          ip: null,
        },
      },
      card_payments: {
        decline_on: {
          avs_failure: false,
          cvc_failure: false,
        },
        statement_descriptor_prefix: null,
        statement_descriptor_prefix_kana: null,
        statement_descriptor_prefix_kanji: null,
      },
      dashboard: {
        display_name: 'Test Organization',
        timezone: 'America/Los_Angeles',
      },
      payments: {
        statement_descriptor: null,
        statement_descriptor_kana: null,
        statement_descriptor_kanji: null,
      },
      payouts: {
        debit_negative_balances: false,
        schedule: {
          delay_days: 2,
          interval: 'daily',
          monthly_anchor: null,
          weekly_anchor: null,
        },
        statement_descriptor: null,
      },
      sepa_debit_payments: {},
    },
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    },
    ...overrides,
  } as Stripe.Account;
}

/**
 * Create a mock Stripe AccountLink (for onboarding)
 */
export function createMockAccountLink(
  accountId: string,
  overrides?: Partial<Stripe.AccountLink>
): Stripe.AccountLink {
  return {
    object: 'account_link',
    created: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    url: overrides?.url || `https://connect.stripe.com/setup/${accountId}`,
    ...overrides,
  };
}

/**
 * Create a mock Stripe PaymentIntent
 */
export function createMockPaymentIntent(
  overrides?: Partial<Stripe.PaymentIntent>
): Stripe.PaymentIntent {
  const amount = overrides?.amount || 5000; // $50.00
  const currency = overrides?.currency || 'usd';

  return {
    id: overrides?.id || `pi_${generateRandomId()}`,
    object: 'payment_intent',
    amount,
    amount_capturable: 0,
    amount_details: {
      tip: {},
    },
    amount_received: overrides?.status === 'succeeded' ? amount : 0,
    application: null,
    application_fee_amount: overrides?.application_fee_amount || null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    client_secret:
      overrides?.client_secret || `pi_${generateRandomId()}_secret_${generateRandomId()}`,
    confirmation_method: 'automatic',
    created: Math.floor(Date.now() / 1000),
    currency,
    customer: null,
    description: overrides?.description || null,
    invoice: null,
    last_payment_error: null,
    latest_charge:
      overrides?.latest_charge ||
      (overrides?.status === 'succeeded' ? `ch_${generateRandomId()}` : null),
    livemode: false,
    metadata: overrides?.metadata || {},
    next_action: null,
    on_behalf_of: overrides?.on_behalf_of || null,
    payment_method: overrides?.payment_method || null,
    payment_method_options: {},
    payment_method_types: ['card'],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    source: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: overrides?.status || 'requires_payment_method',
    transfer_data: null,
    transfer_group: null,
    ...overrides,
  } as Stripe.PaymentIntent;
}

/**
 * Create a mock Stripe Charge (for receipt URLs)
 */
export function createMockCharge(overrides?: Partial<Stripe.Charge>): Stripe.Charge {
  return {
    id: overrides?.id || `ch_${generateRandomId()}`,
    object: 'charge',
    amount: overrides?.amount || 5000,
    amount_captured: overrides?.amount_captured || 5000,
    amount_refunded: overrides?.amount_refunded || 0,
    application: null,
    application_fee: null,
    application_fee_amount: null,
    balance_transaction: `txn_${generateRandomId()}`,
    billing_details: {
      address: {
        city: null,
        country: null,
        line1: null,
        line2: null,
        postal_code: null,
        state: null,
      },
      email: null,
      name: null,
      phone: null,
    },
    calculated_statement_descriptor: 'TEST PAYMENT',
    captured: true,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    customer: null,
    description: null,
    destination: null,
    dispute: null,
    disputed: false,
    failure_balance_transaction: null,
    failure_code: null,
    failure_message: null,
    fraud_details: {},
    invoice: null,
    livemode: false,
    metadata: {},
    on_behalf_of: null,
    order: null,
    outcome: {
      network_status: 'approved_by_network',
      reason: null,
      risk_level: 'normal',
      risk_score: 10,
      seller_message: 'Payment complete.',
      type: 'authorized',
    },
    paid: true,
    payment_intent: null,
    payment_method: `pm_${generateRandomId()}`,
    payment_method_details: {
      card: {
        brand: 'visa',
        checks: {
          address_line1_check: null,
          address_postal_code_check: null,
          cvc_check: 'pass',
        },
        country: 'US',
        exp_month: 12,
        exp_year: 2025,
        fingerprint: generateRandomId(),
        funding: 'credit',
        installments: null,
        last4: '4242',
        mandate: null,
        network: 'visa',
        three_d_secure: null,
        wallet: null,
      },
      type: 'card',
    },
    receipt_email: null,
    receipt_number: null,
    receipt_url: `https://pay.stripe.com/receipts/payment/${generateRandomId()}`,
    refunded: overrides?.refunded || false,
    refunds: {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: `/v1/charges/${overrides?.id || 'ch_test'}/refunds`,
    },
    review: null,
    shipping: null,
    source: null,
    source_transfer: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: 'succeeded',
    transfer_data: null,
    transfer_group: null,
    ...overrides,
  } as Stripe.Charge;
}

/**
 * Create a mock Stripe Refund
 */
export function createMockRefund(overrides?: Partial<Stripe.Refund>): Stripe.Refund {
  return {
    id: overrides?.id || `re_${generateRandomId()}`,
    object: 'refund',
    amount: overrides?.amount || 5000,
    balance_transaction: overrides?.balance_transaction || null,
    charge: overrides?.charge || `ch_${generateRandomId()}`,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    destination_details: null,
    metadata: {},
    payment_intent: overrides?.payment_intent || `pi_${generateRandomId()}`,
    reason: overrides?.reason || null,
    receipt_number: null,
    source_transfer_reversal: null,
    status: overrides?.status || 'succeeded',
    transfer_reversal: null,
    ...overrides,
  } as Stripe.Refund;
}

/**
 * Generate a random Stripe-like ID
 */
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Mock Stripe errors
 */
export class MockStripeError extends Error {
  type: string;
  code?: string;
  statusCode?: number;
  charge?: string;
  decline_code?: string;

  constructor(message: string, type: string = 'StripeError', code?: string, statusCode?: number) {
    super(message);
    this.name = 'StripeError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Create common Stripe error scenarios
 */
export const stripeErrors = {
  cardDeclined: () =>
    new MockStripeError('Your card was declined.', 'StripeCardError', 'card_declined', 402),
  insufficientFunds: () =>
    new MockStripeError(
      'Your card has insufficient funds.',
      'StripeCardError',
      'insufficient_funds',
      402
    ),
  accountNotOnboarded: () =>
    new MockStripeError(
      'The account has not completed onboarding.',
      'StripeInvalidRequestError',
      'account_invalid',
      400
    ),
  chargesNotEnabled: () =>
    new MockStripeError(
      'Charges are not enabled on this account.',
      'StripeInvalidRequestError',
      'account_charges_not_enabled',
      400
    ),
  refundExceedsAmount: () =>
    new MockStripeError(
      'Refund amount exceeds charge amount.',
      'StripeInvalidRequestError',
      'refund_exceeds_charge',
      400
    ),
  paymentIntentNotFound: () =>
    new MockStripeError(
      'No such payment_intent.',
      'StripeInvalidRequestError',
      'resource_missing',
      404
    ),
  apiError: () =>
    new MockStripeError('An error occurred with our API.', 'StripeAPIError', 'api_error', 500),
};
