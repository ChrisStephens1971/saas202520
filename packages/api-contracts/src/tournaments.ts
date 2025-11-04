/**
 * Tournament API Contracts
 *
 * TypeScript interfaces and Zod schemas for tournament management endpoints.
 * Tournaments are the core entity for managing pool/billiards competitions.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Tournament Status
 *
 * Lifecycle states of a tournament:
 * - draft: Being set up, not visible to players
 * - registration: Open for player registration
 * - active: Tournament in progress
 * - paused: Temporarily stopped
 * - completed: Tournament finished
 * - cancelled: Tournament cancelled before completion
 */
export const TournamentStatus = z.enum([
  'draft',
  'registration',
  'active',
  'paused',
  'completed',
  'cancelled',
]);
export type TournamentStatus = z.infer<typeof TournamentStatus>;

/**
 * Tournament Format
 *
 * Bracket/match structure types:
 * - single_elimination: Traditional single-elim bracket
 * - double_elimination: Winners + Losers brackets
 * - round_robin: Every player plays every other player
 * - modified_single: Single-elim with modifications (e.g., third-place match)
 * - chip_format: Players collect chips, top X advance
 */
export const TournamentFormat = z.enum([
  'single_elimination',
  'double_elimination',
  'round_robin',
  'modified_single',
  'chip_format',
]);
export type TournamentFormat = z.infer<typeof TournamentFormat>;

/**
 * Sport Type
 *
 * Currently supports pool/billiards variants.
 * Future: darts, cornhole, etc.
 */
export const SportType = z.enum([
  'pool',
]);
export type SportType = z.infer<typeof SportType>;

/**
 * Game Type (Pool-specific)
 *
 * Specific game variants within pool:
 * - eight-ball: Standard 8-ball
 * - nine-ball: 9-ball
 * - ten-ball: 10-ball
 * - straight-pool: 14.1 continuous
 */
export const GameType = z.enum([
  'eight-ball',
  'nine-ball',
  'ten-ball',
  'straight-pool',
]);
export type GameType = z.infer<typeof GameType>;

// ============================================================================
// Entity Schemas
// ============================================================================

/**
 * Tournament Entity Schema
 *
 * Core tournament data returned from API.
 * Matches Prisma Tournament model with additional computed fields.
 */
export const TournamentSchema = z.object({
  id: z.string().cuid(),
  orgId: z.string().cuid(),
  name: z.string().min(1).max(255),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).nullable(),
  status: TournamentStatus,
  format: TournamentFormat,

  // Simplified config for MVP (v1)
  // Later versions will use sportConfigId + sportConfigVersion
  sport: SportType,
  gameType: GameType,
  raceToWins: z.number().int().min(1).max(21),
  maxPlayers: z.number().int().min(8).max(128).nullable(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),

  // Metadata
  createdBy: z.string().cuid(),
});

export type Tournament = z.infer<typeof TournamentSchema>;

/**
 * Tournament with Stats
 *
 * Extended tournament entity with computed statistics.
 * Used in list views for quick status overview.
 */
export const TournamentWithStatsSchema = TournamentSchema.extend({
  playerCount: z.number().int().min(0),
  matchCount: z.number().int().min(0),
  completedMatchCount: z.number().int().min(0),
});

export type TournamentWithStats = z.infer<typeof TournamentWithStatsSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create Tournament Request
 *
 * POST /api/tournaments
 * Creates a new tournament in draft status.
 * Creator must be owner or td role.
 */
export const CreateTournamentRequestSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(255, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .transform(val => val.toLowerCase()),
  description: z.string().max(2000).optional(),
  format: TournamentFormat,

  // Game configuration
  sport: SportType.default('pool'),
  gameType: GameType,
  raceToWins: z.number().int().min(1, 'Race to wins must be at least 1').max(21, 'Race to wins cannot exceed 21'),
  maxPlayers: z.number().int().min(8).max(128).optional(),

  // Optional scheduling
  startDate: z.string().datetime().optional(),
});

export type CreateTournamentRequest = z.infer<typeof CreateTournamentRequestSchema>;

/**
 * Update Tournament Request
 *
 * PUT /api/tournaments/:id
 * Partial updates allowed. Only owner or td can update.
 * Some fields restricted based on tournament status (e.g., can't change format after started).
 */
export const UpdateTournamentRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .transform(val => val.toLowerCase())
    .optional(),
  description: z.string().max(2000).nullable().optional(),
  status: TournamentStatus.optional(),

  // Game configuration (restricted after tournament starts)
  format: TournamentFormat.optional(),
  gameType: GameType.optional(),
  raceToWins: z.number().int().min(1).max(21).optional(),
  maxPlayers: z.number().int().min(8).max(128).nullable().optional(),

  // Scheduling
  startDate: z.string().datetime().nullable().optional(),
});

export type UpdateTournamentRequest = z.infer<typeof UpdateTournamentRequestSchema>;

/**
 * Get Tournament Params
 *
 * GET /api/tournaments/:id
 */
export const GetTournamentParamsSchema = z.object({
  id: z.string().cuid(),
});

export type GetTournamentParams = z.infer<typeof GetTournamentParamsSchema>;

/**
 * List Tournaments Query Parameters
 *
 * GET /api/tournaments
 * Returns tournaments for current organization (filtered by tenant context).
 */
export const ListTournamentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: TournamentStatus.optional(), // Filter by status
  format: TournamentFormat.optional(), // Filter by format
});

export type ListTournamentsQuery = z.infer<typeof ListTournamentsQuerySchema>;

/**
 * Delete Tournament Params
 *
 * DELETE /api/tournaments/:id
 * Only owners can delete tournaments.
 */
export const DeleteTournamentParamsSchema = z.object({
  id: z.string().cuid(),
});

export type DeleteTournamentParams = z.infer<typeof DeleteTournamentParamsSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Create Tournament Response
 *
 * Returns newly created tournament.
 */
export const CreateTournamentResponseSchema = z.object({
  tournament: TournamentSchema,
});

export type CreateTournamentResponse = z.infer<typeof CreateTournamentResponseSchema>;

/**
 * Get Tournament Response
 *
 * Returns single tournament with stats.
 */
export const GetTournamentResponseSchema = z.object({
  tournament: TournamentWithStatsSchema,
});

export type GetTournamentResponse = z.infer<typeof GetTournamentResponseSchema>;

/**
 * Update Tournament Response
 *
 * Returns updated tournament.
 */
export const UpdateTournamentResponseSchema = z.object({
  tournament: TournamentSchema,
});

export type UpdateTournamentResponse = z.infer<typeof UpdateTournamentResponseSchema>;

/**
 * List Tournaments Response
 *
 * Returns paginated list of tournaments with stats.
 */
export const ListTournamentsResponseSchema = z.object({
  tournaments: z.array(TournamentWithStatsSchema),
  total: z.number().int().min(0),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type ListTournamentsResponse = z.infer<typeof ListTournamentsResponseSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Slug generation from name
 *
 * Utility function to generate URL-safe slug from tournament name.
 * Used in frontend forms and can be overridden by user.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Tournament state transition validation
 *
 * Defines valid status transitions to prevent invalid state changes.
 * Example: Cannot go from 'completed' to 'active'
 */
export const VALID_STATUS_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  draft: ['registration', 'cancelled'],
  registration: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Validate status transition
 *
 * @param currentStatus Current tournament status
 * @param newStatus Desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidStatusTransition(
  currentStatus: TournamentStatus,
  newStatus: TournamentStatus
): boolean {
  if (currentStatus === newStatus) return true;
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}