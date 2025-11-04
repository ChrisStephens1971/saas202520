/**
 * Tournament API Contracts
 *
 * TypeScript interfaces and Zod schemas for tournament management endpoints.
 * All endpoints are tenant-scoped and require tenant_id validation.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const GameType = z.enum(['eight-ball', 'nine-ball', 'ten-ball', 'straight-pool']);
export type GameType = z.infer<typeof GameType>;

export const TournamentFormat = z.enum(['single-elimination', 'double-elimination', 'round-robin']);
export type TournamentFormat = z.infer<typeof TournamentFormat>;

export const TournamentStatus = z.enum(['draft', 'active', 'completed', 'cancelled']);
export type TournamentStatus = z.infer<typeof TournamentStatus>;

// ============================================================================
// Entity Schemas
// ============================================================================

/**
 * Tournament Entity Schema
 *
 * Core tournament data structure with all required fields.
 * Always includes tenant_id for multi-tenant isolation.
 */
export const TournamentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  game_type: GameType,
  format: TournamentFormat,
  status: TournamentStatus,
  start_date: z.string().datetime(),
  end_date: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Tournament = z.infer<typeof TournamentSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create Tournament Request
 *
 * POST /api/tournaments
 * Tenant ID is extracted from authentication context (headers).
 */
export const CreateTournamentRequestSchema = z.object({
  name: z.string().min(1).max(255),
  game_type: GameType,
  format: TournamentFormat,
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
});

export type CreateTournamentRequest = z.infer<typeof CreateTournamentRequestSchema>;

/**
 * Update Tournament Request
 *
 * PUT /api/tournaments/:id
 * All fields optional for partial updates.
 */
export const UpdateTournamentRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  game_type: GameType.optional(),
  format: TournamentFormat.optional(),
  status: TournamentStatus.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().nullable().optional(),
});

export type UpdateTournamentRequest = z.infer<typeof UpdateTournamentRequestSchema>;

/**
 * Get Tournament Request (URL params)
 *
 * GET /api/tournaments/:id
 */
export const GetTournamentParamsSchema = z.object({
  id: z.string().uuid(),
});

export type GetTournamentParams = z.infer<typeof GetTournamentParamsSchema>;

/**
 * List Tournaments Query Parameters
 *
 * GET /api/tournaments
 * All tournaments are automatically filtered by tenant_id from auth context.
 */
export const ListTournamentsQuerySchema = z.object({
  status: TournamentStatus.optional(),
  game_type: GameType.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListTournamentsQuery = z.infer<typeof ListTournamentsQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Create Tournament Response
 *
 * Returns newly created tournament entity.
 */
export const CreateTournamentResponseSchema = z.object({
  tournament: TournamentSchema,
});

export type CreateTournamentResponse = z.infer<typeof CreateTournamentResponseSchema>;

/**
 * Get Tournament Response
 *
 * Returns single tournament entity.
 */
export const GetTournamentResponseSchema = z.object({
  tournament: TournamentSchema,
});

export type GetTournamentResponse = z.infer<typeof GetTournamentResponseSchema>;

/**
 * Update Tournament Response
 *
 * Returns updated tournament entity.
 */
export const UpdateTournamentResponseSchema = z.object({
  tournament: TournamentSchema,
});

export type UpdateTournamentResponse = z.infer<typeof UpdateTournamentResponseSchema>;

/**
 * List Tournaments Response
 *
 * Returns paginated list of tournaments (tenant-scoped).
 */
export const ListTournamentsResponseSchema = z.object({
  tournaments: z.array(TournamentSchema),
  total: z.number().int().min(0),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type ListTournamentsResponse = z.infer<typeof ListTournamentsResponseSchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

/**
 * Standard API Error Response
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
