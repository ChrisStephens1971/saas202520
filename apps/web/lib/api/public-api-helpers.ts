/**
 * Public API Helper Functions
 * Sprint 10 Week 3 - Public API & Webhooks
 *
 * Helper functions for public API endpoints including
 * response formatting, pagination, and error handling.
 */

import { NextResponse } from 'next/server';
import type {
  PaginationMeta,
  PaginatedApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from './types/public-api.types';

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create standardized API success response
 *
 * @param data - Response data
 * @param headers - Optional additional headers
 * @returns NextResponse with formatted data
 */
export function apiSuccess<T>(data: T, headers?: Record<string, string>): NextResponse {
  const response: ApiSuccessResponse<T> = { data };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create standardized paginated API response
 *
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param headers - Optional additional headers
 * @returns NextResponse with formatted paginated data
 */
export function apiPaginated<T>(
  data: T[],
  pagination: PaginationMeta,
  headers?: Record<string, string>
): NextResponse {
  const response: PaginatedApiResponse<T> = {
    data,
    pagination,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create standardized API error response
 *
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Optional error details
 * @param headers - Optional additional headers
 * @returns NextResponse with formatted error
 */
export function apiError(
  code: string,
  message: string,
  status: number = 500,
  details?: Record<string, any>,
  headers?: Record<string, string>
): NextResponse {
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Calculate pagination metadata
 *
 * @param total - Total number of items
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Calculate skip value for Prisma queries
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Number of items to skip
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

// ============================================================================
// RATE LIMIT HEADERS
// ============================================================================

/**
 * Add rate limit headers to response
 *
 * @param limit - Rate limit (requests per window)
 * @param remaining - Remaining requests
 * @param reset - Reset timestamp (seconds since epoch)
 * @returns Headers object
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };
}

// ============================================================================
// ERROR CODE CONSTANTS
// ============================================================================

export const ApiErrorCode = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',

  // Validation errors (400)
  INVALID_REQUEST: 'INVALID_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================================================
// COMMON ERROR RESPONSES
// ============================================================================

/**
 * Return 401 Unauthorized error
 */
export function unauthorizedError(message: string = 'Authentication required'): NextResponse {
  return apiError(ApiErrorCode.UNAUTHORIZED, message, 401);
}

/**
 * Return 403 Forbidden error
 */
export function forbiddenError(message: string = 'Access forbidden'): NextResponse {
  return apiError(ApiErrorCode.FORBIDDEN, message, 403);
}

/**
 * Return 404 Not Found error
 */
export function notFoundError(resource: string = 'Resource'): NextResponse {
  return apiError(ApiErrorCode.NOT_FOUND, `${resource} not found`, 404);
}

/**
 * Return 400 Validation Error
 */
export function validationError(message: string, details?: Record<string, any>): NextResponse {
  return apiError(ApiErrorCode.VALIDATION_ERROR, message, 400, details);
}

/**
 * Return 429 Rate Limit Exceeded error
 */
export function rateLimitError(
  retryAfter: number,
  message: string = 'Rate limit exceeded'
): NextResponse {
  return apiError(
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
    message,
    429,
    { retryAfter },
    { 'Retry-After': retryAfter.toString() }
  );
}

/**
 * Return 500 Internal Server Error
 */
export function internalError(
  message: string = 'Internal server error',
  details?: Record<string, any>
): NextResponse {
  // Log error details but don't expose to client
  if (details) {
    console.error('[API Error]', message, details);
  }

  return apiError(ApiErrorCode.INTERNAL_ERROR, message, 500);
}
