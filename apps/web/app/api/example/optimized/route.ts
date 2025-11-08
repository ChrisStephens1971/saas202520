/**
 * Example API Route - Optimized Response Demo
 * Sprint 9 Phase 3 - API Compression and Optimization
 *
 * This example demonstrates how to use the compression and optimization
 * utilities in your API routes.
 */

import { NextRequest } from 'next/server';
import {
  createOptimizedResponse,
  createPaginatedResponse,
  withOptimization,
  createErrorResponse,
} from '@/lib/api/response-helpers';

/**
 * Example 1: Basic optimized response with auto-compression and ETag
 *
 * Usage:
 * GET /api/example/optimized
 *
 * Features:
 * - Automatic gzip/brotli compression based on Accept-Encoding
 * - ETag generation for cache validation
 * - Conditional request handling (If-None-Match)
 * - Performance metrics headers
 */
export async function GET(request: NextRequest) {
  try {
    // Simulate fetching data
    const data = {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: i % 3 === 0 ? 'admin' : 'user',
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      })),
      total: 100,
      timestamp: new Date().toISOString(),
    };

    // Return optimized response with compression and ETag
    return createOptimizedResponse(request, data, {
      compress: true,
      etag: true,
    });
  } catch {
    return createErrorResponse('Failed to fetch data', 500);
  }
}

/**
 * Example 2: Paginated response with field selection and sorting
 *
 * Usage:
 * GET /api/example/optimized?page=1&pageSize=20&sortBy=createdAt&sortDir=desc&fields=id,name,email
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: id)
 * - sortDir: Sort direction (asc/desc, default: asc)
 * - fields: Comma-separated list of fields to include
 * - excludeFields: Comma-separated list of fields to exclude
 *
 * Features:
 * - Automatic pagination with metadata
 * - Field selection (GraphQL-style)
 * - Sorting by any field
 * - Compression and ETag support
 */
export async function POST(request: NextRequest) {
  try {
    // Simulate fetching all users
    const allUsers = Array.from({ length: 250 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      password: 'hashed_password', // This will be excluded if requested
      role: i % 3 === 0 ? 'admin' : 'user',
      bio: `Biography for user ${i + 1}`.repeat(10), // Large field
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));

    // Return paginated response with all optimizations
    return createPaginatedResponse(request, allUsers, {
      compress: true,
      etag: true,
      selectFields: true, // Enable field selection
      sort: true, // Enable sorting
    });
  } catch {
    return createErrorResponse('Failed to fetch paginated data', 500);
  }
}

/**
 * Example 3: Using withOptimization middleware wrapper
 *
 * This demonstrates the simpler API where you just return data
 * and the wrapper handles all optimizations.
 */
const simpleHandler = async (_request: NextRequest) => {
  // Just return your data - no need to call createOptimizedResponse
  return {
    message: 'This response is automatically optimized',
    data: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      value: Math.random(),
    })),
  };
};

// Export with optimization wrapper
export const PUT = withOptimization(simpleHandler, {
  compress: true,
  etag: true,
  paginate: true,
});
