/**
 * API Response Helper Functions
 * Sprint 9 Phase 3 - API Compression and Optimization
 *
 * Provides helper functions for creating optimized API responses
 * with automatic compression, ETag support, and performance tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  compressResponse,
  formatCompressionMetrics,
  isCompressionBeneficial,
  type CompressionResult,
} from './compression';
import {
  generateETag,
  etagMatches,
  parsePaginationParams,
  paginateArray,
  parseFieldSelection,
  selectFieldsArray,
  parseSortParams,
  sortArray,
  type PaginatedResponse,
} from './optimization';

/**
 * Response options for optimized JSON responses
 */
export interface OptimizedResponseOptions {
  /** Enable compression (default: true) */
  compress?: boolean;
  /** Enable ETag generation (default: true) */
  etag?: boolean;
  /** Enable pagination (requires pagination params in request) */
  paginate?: boolean;
  /** Enable field selection (requires fields param in request) */
  selectFields?: boolean;
  /** Enable sorting (requires sort params in request) */
  sort?: boolean;
  /** Custom headers to add */
  headers?: Record<string, string>;
  /** HTTP status code (default: 200) */
  status?: number;
}

/**
 * Create an optimized JSON response with compression and caching
 *
 * This is the main helper function for API routes. It automatically:
 * - Compresses response with gzip or brotli
 * - Generates ETags for cache validation
 * - Handles conditional requests (If-None-Match)
 * - Adds performance metrics headers
 * - Supports pagination, field selection, and sorting
 *
 * @param request - Next.js request object
 * @param data - Response data (will be JSON stringified)
 * @param options - Response options
 * @returns Next.js response with optimizations applied
 *
 * @example
 * ```typescript
 * // Basic usage (auto-compression + ETag)
 * export async function GET(request: NextRequest) {
 *   const users = await db.user.findMany();
 *   return createOptimizedResponse(request, users);
 * }
 *
 * // With pagination
 * export async function GET(request: NextRequest) {
 *   const users = await db.user.findMany();
 *   return createOptimizedResponse(request, users, {
 *     paginate: true,
 *     sort: true,
 *   });
 * }
 *
 * // With field selection
 * export async function GET(request: NextRequest) {
 *   const users = await db.user.findMany();
 *   return createOptimizedResponse(request, users, {
 *     selectFields: true,
 *   });
 * }
 * ```
 */
export function createOptimizedResponse(
  request: NextRequest,
  data: any,
  options: OptimizedResponseOptions = {}
): NextResponse {
  const {
    compress = true,
    etag = true,
    paginate = false,
    selectFields = false,
    sort = false,
    headers: customHeaders = {},
    status = 200,
  } = options;

  let processedData = data;

  // Apply sorting
  if (sort && Array.isArray(processedData)) {
    const sortParams = parseSortParams(request.nextUrl.searchParams);
    processedData = sortArray(processedData, sortParams);
  }

  // Apply field selection
  if (selectFields && Array.isArray(processedData)) {
    const fieldOptions = parseFieldSelection(request.nextUrl.searchParams);
    if (fieldOptions.include || fieldOptions.exclude) {
      processedData = selectFieldsArray(processedData, fieldOptions);
    }
  }

  // Apply pagination
  if (paginate && Array.isArray(processedData)) {
    const paginationParams = parsePaginationParams(request.nextUrl.searchParams);
    processedData = paginateArray(processedData, paginationParams);
  }

  // Generate ETag
  let etagValue: string | undefined;
  if (etag) {
    etagValue = generateETag(processedData);

    // Check if client has cached version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (etagMatches(etagValue, ifNoneMatch)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etagValue,
          'Cache-Control': 'public, max-age=60, must-revalidate',
        },
      });
    }
  }

  // Apply compression
  let compressionResult: CompressionResult | undefined;
  let responseBody: Buffer | string;

  if (compress) {
    const acceptEncoding = request.headers.get('accept-encoding');
    compressionResult = compressResponse(processedData, acceptEncoding);

    // Only use compression if beneficial
    if (isCompressionBeneficial(compressionResult)) {
      responseBody = compressionResult.data;
    } else {
      responseBody = JSON.stringify(processedData);
      compressionResult = undefined;
    }
  } else {
    responseBody = JSON.stringify(processedData);
  }

  // Build response headers
  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add compression headers
  if (compressionResult && compressionResult.encoding !== 'identity') {
    responseHeaders['Content-Encoding'] = compressionResult.encoding;
    responseHeaders['Vary'] = 'Accept-Encoding';
    responseHeaders['X-Original-Size'] = compressionResult.originalSize.toString();
    responseHeaders['X-Compressed-Size'] = compressionResult.compressedSize.toString();
    responseHeaders['X-Compression-Ratio'] = (compressionResult.ratio * 100).toFixed(1) + '%';

    // Log compression metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Compression]', formatCompressionMetrics(compressionResult));
    }
  }

  // Add ETag header
  if (etagValue) {
    responseHeaders['ETag'] = etagValue;
    responseHeaders['Cache-Control'] = 'public, max-age=60, must-revalidate';
  }

  // Add CORS headers (if needed)
  if (process.env.ENABLE_CORS === 'true') {
    responseHeaders['Access-Control-Allow-Origin'] = process.env.CORS_ORIGIN || '*';
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }

  return new NextResponse(responseBody, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create a paginated response with optimizations
 *
 * Convenience wrapper for paginated responses.
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const users = await db.user.findMany();
 *   return createPaginatedResponse(request, users);
 * }
 * ```
 */
export function createPaginatedResponse<T>(
  request: NextRequest,
  data: T[],
  options: Omit<OptimizedResponseOptions, 'paginate'> = {}
): NextResponse {
  return createOptimizedResponse(request, data, {
    ...options,
    paginate: true,
  });
}

/**
 * Create an error response
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param details - Additional error details
 * @returns Error response
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   try {
 *     const users = await db.user.findMany();
 *     return createOptimizedResponse(request, users);
 *   } catch (error) {
 *     return createErrorResponse('Failed to fetch users', 500, { error });
 *   }
 * }
 * ```
 */
export function createErrorResponse(
  message: string,
  status = 500,
  details?: Record<string, any>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    },
    { status }
  );
}

/**
 * Create a success response with message
 *
 * @param message - Success message
 * @param data - Optional response data
 * @param status - HTTP status code (default: 200)
 * @returns Success response
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const user = await db.user.create({ data: ... });
 *   return createSuccessResponse('User created successfully', user, 201);
 * }
 * ```
 */
export function createSuccessResponse(
  message: string,
  data?: any,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Middleware wrapper for API routes with automatic compression and tracking
 *
 * @param handler - API route handler
 * @param options - Response options
 * @returns Wrapped handler with optimizations
 *
 * @example
 * ```typescript
 * // In your API route
 * const handler = async (request: NextRequest) => {
 *   const users = await db.user.findMany();
 *   return users; // Return data directly
 * };
 *
 * export const GET = withOptimization(handler, {
 *   compress: true,
 *   etag: true,
 *   paginate: true,
 * });
 * ```
 */
export function withOptimization(
  handler: (request: NextRequest) => Promise<any>,
  options: OptimizedResponseOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const data = await handler(request);

      // If handler returns a Response, return it as-is
      if (data instanceof NextResponse || data instanceof Response) {
        return data;
      }

      // Otherwise, create optimized response
      return createOptimizedResponse(request, data, options);
    } catch (error) {
      console.error('[API Error]', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500,
        { error: error instanceof Error ? error.stack : undefined }
      );
    }
  };
}
