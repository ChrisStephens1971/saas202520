/**
 * Payment System Types (Sprint 3)
 * Stripe Connect integration for entry fees, refunds, and payouts
 */

export interface StripeAccount {
  id: string;
  orgId: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  tournamentId: string;
  playerId?: string;
  stripeAccountId: string;
  stripePaymentIntent: string;
  amount: number; // cents
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  purpose: 'entry_fee' | 'side_pot' | 'addon';
  description?: string;
  refundedAmount: number; // cents
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  stripeRefundId: string;
  amount: number; // cents
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  processedBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  tournamentId: string;
  playerId: string;
  placement: number; // 1st, 2nd, 3rd, etc.
  amount: number; // cents
  source: 'prize_pool' | 'side_pot';
  status: 'pending' | 'paid' | 'voided';
  paidAt?: Date;
  paidBy?: string; // User ID
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types

// Stripe Connect Onboarding
export interface CreateStripeAccountRequest {
  orgId: string;
  country?: string;
}

export interface CreateStripeAccountResponse {
  account: StripeAccount;
  onboardingUrl: string;
}

export interface GetStripeAccountStatusResponse {
  account: StripeAccount;
  requiresOnboarding: boolean;
  onboardingUrl?: string;
}

// Entry Fee Collection
export interface CreatePaymentIntentRequest {
  tournamentId: string;
  playerId?: string;
  amount: number; // cents
  currency?: string;
  purpose: 'entry_fee' | 'side_pot' | 'addon';
  description?: string;
}

export interface CreatePaymentIntentResponse {
  payment: Payment;
  clientSecret: string; // For Stripe Elements
}

export interface ConfirmPaymentRequest {
  paymentId: string;
  stripePaymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  payment: Payment;
  receiptUrl?: string;
}

// Refunds
export interface CreateRefundRequest {
  paymentId: string;
  amount?: number; // Optional partial refund amount in cents
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export interface CreateRefundResponse {
  refund: Refund;
  payment: Payment; // Updated payment with new refundedAmount
}

// Payouts
export interface CalculatePayoutsRequest {
  tournamentId: string;
  prizeStructure: {
    placement: number;
    percentage: number;
  }[];
  includeEntryFees: boolean;
  includeSidePots: boolean;
}

export interface CalculatePayoutsResponse {
  payouts: Payout[];
  summary: {
    totalCollected: number; // cents
    totalPayouts: number; // cents
    houseTake: number; // cents (if any)
    breakdown: {
      entryFees: number;
      sidePots: number;
    };
  };
}

export interface GetPayoutsRequest {
  tournamentId: string;
}

export interface GetPayoutsResponse {
  payouts: Payout[];
  summary: {
    totalPending: number;
    totalPaid: number;
    totalVoided: number;
  };
}

export interface MarkPayoutPaidRequest {
  payoutId: string;
  notes?: string;
}

export interface MarkPayoutPaidResponse {
  payout: Payout;
}

// Payout Sheet (PDF)
export interface GeneratePayoutSheetRequest {
  tournamentId: string;
  includePaymentDetails: boolean;
}

export interface GeneratePayoutSheetResponse {
  pdfUrl: string;
  pdfBuffer?: Buffer; // For direct download
}

// Dispute Evidence
export interface GetDisputeEvidenceRequest {
  paymentId: string;
}

export interface GetDisputeEvidenceResponse {
  payment: Payment;
  refunds: Refund[];
  auditTrail: {
    timestamp: Date;
    actor: string;
    action: string;
    details: Record<string, unknown>;
  }[];
  summary: string; // Formatted text summary
}
