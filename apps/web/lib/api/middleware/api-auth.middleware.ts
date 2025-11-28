/**
 * API Authentication Middleware
 * Validates API keys and attaches context to requests
 *
 * @module lib/api/middleware/api-auth.middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, validateApiKeyFormat, updateLastUsed } from '../services/api-key.service';
import { checkRateLimit, type RateLimitResult } from '../services/rate-limiter.service';
import {
  apiUnauthorized,
  apiRateLimitExceeded,
  formatRateLimitHeaders,
  apiInternalError,
} from '../utils/response.utils';
import type { ApiKey, ApiContext, ApiTier } from '../types/api';

/**
 * API Authentication Result - Success Case
 */
interface ApiAuthSuccess {
  success: true;
  apiKey: ApiKey;
  rateLimit: RateLimitResult;
}

/**
 * API Authentication Result - Failure Case
 */
interface ApiAuthFailure {
  success: false;
  error: {
    status: number;
    response: NextResponse;
  };
}

/**
 * API Authentication Result - Discriminated Union
 */
type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

/**
 * Extract API key from Authorization header
 *
 * @param request - Next.js request object
 * @returns API key or null if not found
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer sk_live_..."
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate API request
 * Validates API key and checks rate limit
 *
 * @param request - Next.js request object
 * @returns Authentication result with API key and rate limit info
 */
async function authenticateRequest(request: NextRequest): Promise<ApiAuthResult> {
  // Extract API key from Authorization header
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      success: false,
      error: {
        status: 401,
        response: NextResponse.json(apiUnauthorized('Missing API key in Authorization header'), {
          status: 401,
        }),
      },
    };
  }

  // Validate API key format
  if (!validateApiKeyFormat(apiKey)) {
    return {
      success: false,
      error: {
        status: 401,
        response: NextResponse.json(apiUnauthorized('Invalid API key format'), { status: 401 }),
      },
    };
  }

  // Validate API key in database
  const validatedKey = await validateApiKey(apiKey);

  if (!validatedKey) {
    return {
      success: false,
      error: {
        status: 401,
        response: NextResponse.json(apiUnauthorized('Invalid or expired API key'), { status: 401 }),
      },
    };
  }

  // Check if key is expired
  if (validatedKey.expiresAt && validatedKey.expiresAt < new Date()) {
    return {
      success: false,
      error: {
        status: 401,
        response: NextResponse.json(
          apiUnauthorized('API key has expired', {
            expiredAt: validatedKey.expiresAt.toISOString(),
          }),
          { status: 401 }
        ),
      },
    };
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(validatedKey.id, validatedKey.tier as ApiTier);

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: {
        status: 429,
        response: NextResponse.json(apiRateLimitExceeded(rateLimit.limit, rateLimit.reset), {
          status: 429,
          headers: {
            ...formatRateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.reset),
            'Retry-After': (rateLimit.reset - Math.floor(Date.now() / 1000)).toString(),
          },
        }),
      },
    };
  }

  // Update last used timestamp (async, non-blocking)
  updateLastUsed(validatedKey.id).catch((error) =>
    console.error('Error updating last used timestamp:', error)
  );

  return {
    success: true,
    apiKey: validatedKey,
    rateLimit,
  };
}

/**
 * API Authentication Middleware
 * Higher-order function that wraps API route handlers
 *
 * Usage:
 * ```typescript
 * export const GET = withApiAuth(async (request, context) => {
 *   // Access authenticated context
 *   const { apiKey, tenantId, rateLimit } = context;
 *   // ... your API logic
 * });
 * ```
 *
 * @param handler - API route handler function
 * @returns Wrapped handler with authentication
 */
export function withApiAuth<T = any>(
  handler: (
    request: NextRequest,
    context: ApiContext & { params?: T }
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, routeContext?: { params: T }): Promise<NextResponse> => {
    try {
      // Authenticate request
      const authResult = await authenticateRequest(request);

      if (!authResult.success) {
        return authResult.error.response;
      }

      // Create API context
      const apiContext: ApiContext = {
        apiKey: authResult.apiKey,
        tenantId: authResult.apiKey.tenantId,
        userId: authResult.apiKey.userId,
        tier: authResult.apiKey.tier as ApiTier,
        rateLimit: authResult.rateLimit,
      };

      // Call handler with context
      const response = await handler(request, {
        ...apiContext,
        ...(routeContext && { params: routeContext.params }),
      });

      // Add rate limit headers to response
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', apiContext.rateLimit.limit.toString());
      headers.set('X-RateLimit-Remaining', apiContext.rateLimit.remaining.toString());
      headers.set('X-RateLimit-Reset', apiContext.rateLimit.reset.toString());
      headers.set('X-API-Version', '1.0');

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error('API authentication error:', error);

      return NextResponse.json(
        apiInternalError(
          'Authentication error',
          process.env.NODE_ENV === 'development',
          error instanceof Error ? { message: error.message, name: error.name } : undefined
        ),
        { status: 500 }
      );
    }
  };
}

/**
 * Optional: API Authentication Middleware with custom error handler
 *
 * @param handler - API route handler function
 * @param onError - Custom error handler
 * @returns Wrapped handler with authentication
 */
export function withApiAuthCustomError<T = any>(
  handler: (
    request: NextRequest,
    context: ApiContext & { params?: T }
  ) => Promise<NextResponse> | NextResponse,
  onError: (error: Error) => NextResponse
) {
  return async (request: NextRequest, routeContext?: { params: T }): Promise<NextResponse> => {
    try {
      // Authenticate request
      const authResult = await authenticateRequest(request);

      if (!authResult.success) {
        return authResult.error.response;
      }

      // Create API context
      const apiContext: ApiContext = {
        apiKey: authResult.apiKey,
        tenantId: authResult.apiKey.tenantId,
        userId: authResult.apiKey.userId,
        tier: authResult.apiKey.tier as ApiTier,
        rateLimit: authResult.rateLimit,
      };

      // Call handler with context
      const response = await handler(request, {
        ...apiContext,
        ...(routeContext && { params: routeContext.params }),
      });

      // Add rate limit headers
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', apiContext.rateLimit.limit.toString());
      headers.set('X-RateLimit-Remaining', apiContext.rateLimit.remaining.toString());
      headers.set('X-RateLimit-Reset', apiContext.rateLimit.reset.toString());
      headers.set('X-API-Version', '1.0');

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error('API error:', error);
      return onError(error as Error);
    }
  };
}
