/**
 * API Response Optimization Utilities
 * Sprint 9 Phase 3 - API Compression and Optimization
 *
 * Provides utilities for request batching, response pagination,
 * field selection (GraphQL-style), and ETag-based caching.
 */

import { createHash } from 'crypto';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Optional cursor for cursor-based pagination */
  cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /** Page data */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page */
    page: number;
    /** Items per page */
    pageSize: number;
    /** Total items across all pages */
    total: number;
    /** Total pages */
    totalPages: number;
    /** Has next page */
    hasNext: boolean;
    /** Has previous page */
    hasPrev: boolean;
    /** Next cursor (for cursor-based pagination) */
    nextCursor?: string;
    /** Previous cursor (for cursor-based pagination) */
    prevCursor?: string;
  };
}

/**
 * Parse pagination parameters from request
 *
 * @param searchParams - URL search params
 * @param defaultPageSize - Default page size (default: 20)
 * @param maxPageSize - Maximum page size (default: 100)
 * @returns Parsed pagination parameters
 *
 * @example
 * ```typescript
 * const params = parsePaginationParams(request.nextUrl.searchParams);
 * // { page: 1, pageSize: 20 }
 * ```
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize = 20,
  maxPageSize = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10))
  );
  const cursor = searchParams.get('cursor') || undefined;

  return { page, pageSize, cursor };
}

/**
 * Paginate array of items
 *
 * @param items - Array of items to paginate
 * @param params - Pagination parameters
 * @returns Paginated response with metadata
 *
 * @example
 * ```typescript
 * const users = await db.user.findMany();
 * const paginated = paginateArray(users, { page: 2, pageSize: 10 });
 *
 * return Response.json(paginated);
 * // {
 * //   data: [...10 users],
 * //   pagination: { page: 2, pageSize: 10, total: 45, ... }
 * // }
 * ```
 */
export function paginateArray<T>(
  items: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const { page, pageSize } = params;
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const data = items.slice(offset, offset + pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Create cursor-based pagination response
 *
 * Cursor-based pagination is more efficient for large datasets
 * as it doesn't require counting total items.
 *
 * @param items - Array of items for current page
 * @param params - Pagination parameters
 * @param getCursor - Function to extract cursor from item
 * @returns Paginated response with cursors
 *
 * @example
 * ```typescript
 * const users = await db.user.findMany({
 *   take: pageSize + 1,
 *   cursor: cursor ? { id: cursor } : undefined,
 * });
 *
 * const paginated = paginateCursor(
 *   users,
 *   { pageSize: 20 },
 *   (user) => user.id
 * );
 * ```
 */
export function paginateCursor<T>(
  items: T[],
  params: Pick<PaginationParams, 'pageSize'>,
  getCursor: (item: T) => string
): Omit<PaginatedResponse<T>, 'pagination'> & {
  pagination: Omit<PaginatedResponse<T>['pagination'], 'page' | 'total' | 'totalPages' | 'hasPrev'>;
} {
  const { pageSize } = params;

  // Fetch one extra item to check if there's a next page
  const hasNext = items.length > pageSize;
  const data = hasNext ? items.slice(0, pageSize) : items;

  const nextCursor = hasNext && data.length > 0 ? getCursor(data[data.length - 1]) : undefined;

  return {
    data,
    pagination: {
      pageSize,
      hasNext,
      nextCursor,
    },
  };
}

/**
 * Field selection options
 */
export interface FieldSelectionOptions {
  /** Fields to include (whitelist) */
  include?: string[];
  /** Fields to exclude (blacklist) */
  exclude?: string[];
  /** Nested field separator (default: '.') */
  separator?: string;
}

/**
 * Parse field selection from request
 *
 * Supports GraphQL-style field selection via query params.
 *
 * @param searchParams - URL search params
 * @returns Field selection options
 *
 * @example
 * ```typescript
 * // Request: /api/users?fields=id,name,email
 * const fields = parseFieldSelection(request.nextUrl.searchParams);
 * // { include: ['id', 'name', 'email'] }
 *
 * // Request: /api/users?excludeFields=password,salt
 * const fields = parseFieldSelection(request.nextUrl.searchParams);
 * // { exclude: ['password', 'salt'] }
 * ```
 */
export function parseFieldSelection(searchParams: URLSearchParams): FieldSelectionOptions {
  const includeParam = searchParams.get('fields');
  const excludeParam = searchParams.get('excludeFields');

  const include = includeParam ? includeParam.split(',').map(f => f.trim()) : undefined;
  const exclude = excludeParam ? excludeParam.split(',').map(f => f.trim()) : undefined;

  return { include, exclude };
}

/**
 * Apply field selection to object
 *
 * @param obj - Object to filter
 * @param options - Field selection options
 * @returns Filtered object
 *
 * @example
 * ```typescript
 * const user = {
 *   id: '123',
 *   name: 'John',
 *   email: 'john@example.com',
 *   password: 'hashed',
 * };
 *
 * const filtered = selectFields(user, { exclude: ['password'] });
 * // { id: '123', name: 'John', email: 'john@example.com' }
 * ```
 */
export function selectFields<T extends Record<string, unknown>>(
  obj: T,
  options: FieldSelectionOptions
): Partial<T> {
  const { include, exclude, separator = '.' } = options;

  // If no selection specified, return all fields
  if (!include && !exclude) {
    return obj;
  }

  const result: Record<string, unknown> = {};

  // Include whitelist
  if (include) {
    for (const field of include) {
      const path = field.split(separator);
      const value = getNestedValue(obj, path);
      if (value !== undefined) {
        setNestedValue(result, path, value);
      }
    }
    return result;
  }

  // Exclude blacklist
  if (exclude) {
    Object.assign(result, obj);
    for (const field of exclude) {
      const path = field.split(separator);
      deleteNestedValue(result, path);
    }
    return result;
  }

  return result;
}

/**
 * Apply field selection to array of objects
 *
 * @param items - Array of objects to filter
 * @param options - Field selection options
 * @returns Array of filtered objects
 */
export function selectFieldsArray<T extends Record<string, unknown>>(
  items: T[],
  options: FieldSelectionOptions
): Partial<T>[] {
  return items.map(item => selectFields(item, options));
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set nested value in object
 */
function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0) return;

  if (path.length === 1) {
    obj[path[0]] = value;
    return;
  }

  const [first, ...rest] = path;
  if (!obj[first]) {
    obj[first] = {};
  }
  setNestedValue(obj[first] as Record<string, unknown>, rest, value);
}

/**
 * Delete nested value from object
 */
function deleteNestedValue(obj: Record<string, unknown>, path: string[]): void {
  if (path.length === 0) return;

  if (path.length === 1) {
    delete obj[path[0]];
    return;
  }

  const [first, ...rest] = path;
  if (obj[first] && typeof obj[first] === 'object') {
    deleteNestedValue(obj[first] as Record<string, unknown>, rest);
  }
}

/**
 * Generate ETag for response data
 *
 * ETags enable conditional requests and cache validation.
 *
 * @param data - Data to generate ETag for
 * @returns ETag string
 *
 * @example
 * ```typescript
 * const users = await db.user.findMany();
 * const etag = generateETag(users);
 *
 * // Check if client has cached version
 * if (request.headers.get('if-none-match') === etag) {
 *   return new Response(null, { status: 304 }); // Not Modified
 * }
 *
 * return Response.json(users, {
 *   headers: { 'ETag': etag },
 * });
 * ```
 */
export function generateETag(data: unknown): string {
  const json = JSON.stringify(data);
  const hash = createHash('sha256').update(json).digest('hex');
  return `"${hash.substring(0, 32)}"`;
}

/**
 * Check if ETag matches
 *
 * @param etag - Generated ETag
 * @param ifNoneMatch - Value of If-None-Match header
 * @returns True if ETags match (client has cached version)
 */
export function etagMatches(etag: string, ifNoneMatch: string | null): boolean {
  if (!ifNoneMatch) return false;

  // Handle multiple ETags in If-None-Match
  const clientETags = ifNoneMatch.split(',').map(e => e.trim());
  return clientETags.includes(etag) || clientETags.includes('*');
}

/**
 * Batch request configuration
 */
export interface BatchRequest {
  /** Unique request ID */
  id: string;
  /** Request method */
  method: string;
  /** Request URL (relative to API base) */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
}

/**
 * Batch response
 */
export interface BatchResponse {
  /** Request ID matching BatchRequest.id */
  id: string;
  /** Response status code */
  status: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Response body */
  body?: unknown;
  /** Error message if request failed */
  error?: string;
}

/**
 * Execute batch of requests
 *
 * Allows clients to send multiple API requests in a single HTTP request,
 * reducing network overhead.
 *
 * @param requests - Array of batch requests
 * @param executor - Function to execute individual request
 * @returns Array of batch responses
 *
 * @example
 * ```typescript
 * // Client sends:
 * // POST /api/batch
 * // [
 * //   { id: '1', method: 'GET', url: '/users' },
 * //   { id: '2', method: 'GET', url: '/posts' },
 * // ]
 *
 * const responses = await executeBatch(
 *   requests,
 *   async (req) => {
 *     const response = await fetch(apiBase + req.url);
 *     return {
 *       status: response.status,
 *       body: await response.json(),
 *     };
 *   }
 * );
 * ```
 */
export async function executeBatch(
  requests: BatchRequest[],
  executor: (request: BatchRequest) => Promise<Omit<BatchResponse, 'id'>>
): Promise<BatchResponse[]> {
  const responses = await Promise.allSettled(
    requests.map(async (request) => {
      try {
        const result = await executor(request);
        return {
          id: request.id,
          ...result,
        };
      } catch (error) {
        return {
          id: request.id,
          status: 500,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return responses.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      id: requests[index].id,
      status: 500,
      error: 'Request failed to execute',
    };
  });
}

/**
 * Sort parameters
 */
export interface SortParams {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Parse sort parameters from request
 *
 * @param searchParams - URL search params
 * @param defaultField - Default sort field
 * @param defaultDirection - Default sort direction
 * @returns Sort parameters
 *
 * @example
 * ```typescript
 * // Request: /api/users?sortBy=createdAt&sortDir=desc
 * const sort = parseSortParams(request.nextUrl.searchParams, 'id', 'asc');
 * // { field: 'createdAt', direction: 'desc' }
 * ```
 */
export function parseSortParams(
  searchParams: URLSearchParams,
  defaultField = 'id',
  defaultDirection: 'asc' | 'desc' = 'asc'
): SortParams {
  const field = searchParams.get('sortBy') || defaultField;
  const direction = (searchParams.get('sortDir') || defaultDirection) as 'asc' | 'desc';

  return {
    field,
    direction: direction === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * Sort array by field
 *
 * @param items - Array to sort
 * @param params - Sort parameters
 * @returns Sorted array
 */
export function sortArray<T extends Record<string, unknown>>(
  items: T[],
  params: SortParams
): T[] {
  const { field, direction } = params;

  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === bVal) return 0;

    let comparison = 0;
    if (aVal < bVal) comparison = -1;
    if (aVal > bVal) comparison = 1;

    return direction === 'desc' ? -comparison : comparison;
  });
}
