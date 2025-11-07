/**
 * Public API Validation Schemas
 * Sprint 10 Week 3 - Public API & Webhooks
 *
 * Zod validation schemas for public API endpoints.
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATION SCHEMAS
// ============================================================================

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * CUID validation
 */
export const cuidSchema = z.string().cuid();

// ============================================================================
// TOURNAMENT VALIDATION SCHEMAS
// ============================================================================

/**
 * Tournament list query parameters
 */
export const tournamentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['upcoming', 'active', 'completed']).optional(),
  format: z.string().optional(),
});

/**
 * Tournament matches query parameters
 */
export const tournamentMatchesQuerySchema = z.object({
  round: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
});

/**
 * Tournament players query parameters
 */
export const tournamentPlayersQuerySchema = z.object({
  status: z.enum(['registered', 'checked_in', 'eliminated', 'winner']).optional(),
});

// ============================================================================
// PLAYER VALIDATION SCHEMAS
// ============================================================================

/**
 * Player list query parameters
 */
export const playerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  skillLevel: z.string().optional(),
});

/**
 * Player history query parameters
 */
export const playerHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['completed']).optional(),
});

// ============================================================================
// MATCH VALIDATION SCHEMAS
// ============================================================================

/**
 * Match list query parameters
 */
export const matchListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['in_progress', 'completed']).optional(),
  tournamentId: z.string().cuid().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and parse query parameters
 *
 * @param schema - Zod schema to validate against
 * @param params - URLSearchParams or object to validate
 * @returns Validated and parsed data
 * @throws ZodError if validation fails
 */
export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  params: URLSearchParams | Record<string, any>
): z.infer<T> {
  const data = params instanceof URLSearchParams
    ? Object.fromEntries(params.entries())
    : params;

  return schema.parse(data);
}

/**
 * Safe validation that returns success/error result
 *
 * @param schema - Zod schema to validate against
 * @param params - URLSearchParams or object to validate
 * @returns SafeParseReturnType with success boolean and data/error
 */
export function safeValidateQuery<T extends z.ZodTypeAny>(
  schema: T,
  params: URLSearchParams | Record<string, any>
): z.SafeParseReturnType<unknown, z.infer<T>> {
  const data = params instanceof URLSearchParams
    ? Object.fromEntries(params.entries())
    : params;

  return schema.safeParse(data);
}
