/**
 * Public API Types
 * Type definitions for API keys, webhooks, rate limiting, and responses
 *
 * @module lib/api/types/api
 */

// ============================================================================
// API KEY TYPES
// ============================================================================

/**
 * API Key Tier with rate limits
 */
export type ApiTier = 'free' | 'pro' | 'enterprise';

/**
 * API Key Status
 */
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

/**
 * Rate limit for each tier (requests per hour)
 */
export const RATE_LIMITS: Record<ApiTier, number> = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

/**
 * API Key information
 */
export interface ApiKey {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  tier: ApiTier;
  rateLimit: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Key creation input
 */
export interface CreateApiKeyInput {
  tenantId: string;
  userId: string;
  name: string;
  tier?: ApiTier;
  expiresAt?: Date;
}

/**
 * Generated API key result (includes plaintext key - shown only once)
 */
export interface GeneratedApiKey {
  id: string;
  key: string; // Full plaintext key (sk_live_... or sk_test_...)
  keyPrefix: string;
  keyHash: string;
  tier: ApiTier;
  rateLimit: number;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (seconds)
  resetDate: Date;
}

/**
 * Rate limit error details
 */
export interface RateLimitError {
  code: 'rate_limit_exceeded';
  message: string;
  limit: number;
  remaining: number;
  reset: number;
  resetDate: string;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Webhook event types
 */
export enum WebhookEvent {
  TOURNAMENT_CREATED = 'tournament.created',
  TOURNAMENT_STARTED = 'tournament.started',
  TOURNAMENT_COMPLETED = 'tournament.completed',
  TOURNAMENT_CANCELLED = 'tournament.cancelled',
  MATCH_STARTED = 'match.started',
  MATCH_COMPLETED = 'match.completed',
  PLAYER_REGISTERED = 'player.registered',
  PLAYER_CHECKED_IN = 'player.checked_in',
  PLAYER_ELIMINATED = 'player.eliminated',
}

/**
 * Webhook status
 */
export type WebhookStatus = 'active' | 'paused' | 'disabled';

/**
 * Webhook subscription
 */
export interface Webhook {
  id: string;
  tenantId: string;
  apiKeyId: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  deliverySuccessCount: number;
  deliveryFailureCount: number;
  lastDeliveryAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook creation input
 */
export interface CreateWebhookInput {
  tenantId: string;
  apiKeyId: string;
  url: string;
  events: WebhookEvent[];
  description?: string;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload<T = any> {
  id: string; // Event ID (evt_...)
  type: WebhookEvent;
  createdAt: string; // ISO timestamp
  data: T;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  url: string;
  payload: any;
  signature: string;
  attemptNumber: number;
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard success response structure
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: any;
  };
}

/**
 * Standard error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

/**
 * Error codes for API responses
 */
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'unauthorized',
  INVALID_API_KEY = 'invalid_api_key',
  API_KEY_EXPIRED = 'api_key_expired',
  API_KEY_REVOKED = 'api_key_revoked',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Resource errors
  RESOURCE_NOT_FOUND = 'resource_not_found',
  RESOURCE_CONFLICT = 'resource_conflict',

  // Validation errors
  VALIDATION_ERROR = 'validation_error',
  INVALID_REQUEST = 'invalid_request',

  // Server errors
  INTERNAL_ERROR = 'internal_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
}

// ============================================================================
// API CONTEXT TYPES
// ============================================================================

/**
 * API request context (attached by middleware)
 */
export interface ApiContext {
  apiKey: ApiKey;
  tenantId: string;
  userId: string;
  tier: ApiTier;
  rateLimit: RateLimitResult;
}

/**
 * HTTP headers for API responses
 */
export interface ApiHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Content-Type': 'application/json';
  'X-API-Version'?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * API key format validation
 */
export interface ApiKeyValidation {
  isValid: boolean;
  isLive: boolean;
  isTest: boolean;
  error?: string;
}

/**
 * Webhook URL validation
 */
export interface WebhookUrlValidation {
  isValid: boolean;
  isHttps: boolean;
  isReachable: boolean;
  error?: string;
}
