/**
 * API Response Utilities
 * Standard response formatters for API endpoints
 *
 * @module lib/api/utils/response.utils
 */

import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginatedResponse,
  ApiErrorCode,
} from '../types/api';

const API_VERSION = '1.0';

/**
 * Create a standard success response
 *
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Formatted success response
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, any>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      ...meta,
    },
  };
}

/**
 * Create a standard error response
 *
 * @param code - Error code (from ApiErrorCode enum)
 * @param message - Human-readable error message
 * @param details - Optional error details
 * @returns Formatted error response
 */
export function apiError(
  code: ApiErrorCode | string,
  message: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Create a paginated response
 *
 * @param data - Array of items
 * @param total - Total number of items (across all pages)
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Formatted paginated response
 */
export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const pages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: API_VERSION,
    },
  };
}

/**
 * Create a 401 Unauthorized response
 *
 * @param message - Optional custom message
 * @param details - Optional error details
 * @returns Unauthorized error response
 */
export function apiUnauthorized(
  message: string = 'Authentication required',
  details?: Record<string, any>
): ApiErrorResponse {
  return apiError('unauthorized', message, details);
}

/**
 * Create a 403 Forbidden response
 *
 * @param message - Optional custom message
 * @param details - Optional error details
 * @returns Forbidden error response
 */
export function apiForbidden(
  message: string = 'Access denied',
  details?: Record<string, any>
): ApiErrorResponse {
  return apiError('forbidden', message, details);
}

/**
 * Create a 404 Not Found response
 *
 * @param resource - Name of the resource
 * @param identifier - Optional resource identifier
 * @returns Not found error response
 */
export function apiNotFound(
  resource: string,
  identifier?: string
): ApiErrorResponse {
  const message = identifier
    ? `${resource} with ID "${identifier}" not found`
    : `${resource} not found`;

  return apiError('resource_not_found', message, {
    resource,
    ...(identifier && { identifier }),
  });
}

/**
 * Create a 429 Rate Limit Exceeded response
 *
 * @param limit - Rate limit (requests per hour)
 * @param reset - Unix timestamp when limit resets
 * @returns Rate limit error response
 */
export function apiRateLimitExceeded(
  limit: number,
  reset: number
): ApiErrorResponse {
  const resetDate = new Date(reset * 1000);

  return apiError(
    'rate_limit_exceeded',
    `You have exceeded your rate limit of ${limit} requests per hour`,
    {
      limit,
      remaining: 0,
      reset,
      resetDate: resetDate.toISOString(),
    }
  );
}

/**
 * Create a 400 Bad Request response
 *
 * @param message - Error message
 * @param details - Validation errors or other details
 * @returns Bad request error response
 */
export function apiBadRequest(
  message: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return apiError('validation_error', message, details);
}

/**
 * Create a 500 Internal Server Error response
 *
 * @param message - Optional custom message
 * @param includeDetails - Whether to include error details (only in development)
 * @param errorDetails - Error details
 * @returns Internal error response
 */
export function apiInternalError(
  message: string = 'An internal server error occurred',
  includeDetails: boolean = false,
  errorDetails?: Record<string, any>
): ApiErrorResponse {
  return apiError(
    'internal_error',
    message,
    includeDetails ? errorDetails : undefined
  );
}

/**
 * Create a 503 Service Unavailable response
 *
 * @param message - Optional custom message
 * @returns Service unavailable error response
 */
export function apiServiceUnavailable(
  message: string = 'Service temporarily unavailable'
): ApiErrorResponse {
  return apiError('service_unavailable', message);
}

/**
 * Create a 409 Conflict response
 *
 * @param message - Error message
 * @param details - Conflict details
 * @returns Conflict error response
 */
export function apiConflict(
  message: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return apiError('resource_conflict', message, details);
}

/**
 * Convert an error object to an API error response
 * Useful for catch blocks
 *
 * @param error - Error object
 * @param includeStack - Whether to include stack trace (only in development)
 * @returns API error response
 */
export function errorToApiResponse(
  error: Error,
  includeStack: boolean = false
): ApiErrorResponse {
  return apiInternalError(
    error.message || 'An unexpected error occurred',
    includeStack,
    {
      name: error.name,
      ...(includeStack && error.stack && { stack: error.stack }),
    }
  );
}

/**
 * Format rate limit headers for HTTP response
 *
 * @param limit - Rate limit (requests per hour)
 * @param remaining - Remaining requests
 * @param reset - Unix timestamp when limit resets
 * @returns Header object
 */
export function formatRateLimitHeaders(
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

/**
 * Calculate pagination offset from page and limit
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset for database query (0-indexed)
 */
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate pagination parameters
 *
 * @param page - Page number
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit
 * @returns Validated page and limit
 */
export function validatePagination(
  page: number,
  limit: number,
  maxLimit: number = 100
): { page: number; limit: number } {
  const validatedPage = Math.max(1, Math.floor(page));
  const validatedLimit = Math.max(1, Math.min(maxLimit, Math.floor(limit)));

  return {
    page: validatedPage,
    limit: validatedLimit,
  };
}
