/**
 * Organization API Contracts
 *
 * TypeScript interfaces and Zod schemas for organization management endpoints.
 * Organizations represent tenants in the multi-tenant architecture.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Organization Member Roles
 *
 * Defines access levels within an organization:
 * - owner: Full access, can delete organization, manage members
 * - td: Tournament Director, can create/manage tournaments
 * - scorekeeper: Can update scores and match results
 * - streamer: Can view tournaments for streaming purposes
 */
export const OrganizationRoleEnum = z.enum(['owner', 'td', 'scorekeeper', 'streamer']);
export type OrganizationRole = z.infer<typeof OrganizationRoleEnum>;

// ============================================================================
// Entity Schemas
// ============================================================================

/**
 * Organization Entity Schema
 *
 * Organizations are tenants in the multi-tenant architecture.
 * Each organization has its own tournaments, players, and data.
 */
export const OrganizationSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(255),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

/**
 * Organization Member Entity Schema
 *
 * Links users to organizations with specific roles.
 * Determines access control within the organization.
 */
export const OrganizationMemberSchema = z.object({
  id: z.string().cuid(),
  orgId: z.string().cuid(),
  userId: z.string().cuid(),
  role: OrganizationRole,
  createdAt: z.string().datetime(),
});

export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

/**
 * Organization with Member Info
 *
 * Used when returning organizations with the current user's role.
 */
export const OrganizationWithRoleSchema = OrganizationSchema.extend({
  userRole: OrganizationRole,
  memberCount: z.number().int().min(0).optional(),
});

export type OrganizationWithRole = z.infer<typeof OrganizationWithRoleSchema>;

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Create Organization Request
 *
 * POST /api/organizations
 * Creates a new organization and makes the creator an owner.
 */
export const CreateOrganizationRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .transform(val => val.toLowerCase())
    .refine(val => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val), {
      message: 'Slug must be lowercase alphanumeric with hyphens'
    }),
});

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;

/**
 * Update Organization Request
 *
 * PUT /api/organizations/:id
 * All fields optional for partial updates.
 * Only owners can update organizations.
 */
export const UpdateOrganizationRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string()
    .min(1)
    .max(100)
    .transform(val => val.toLowerCase())
    .refine(val => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val))
    .optional(),
});

export type UpdateOrganizationRequest = z.infer<typeof UpdateOrganizationRequestSchema>;

/**
 * Get Organization Request (URL params)
 *
 * GET /api/organizations/:id
 */
export const GetOrganizationParamsSchema = z.object({
  id: z.string().cuid(),
});

export type GetOrganizationParams = z.infer<typeof GetOrganizationParamsSchema>;

/**
 * List Organizations Query Parameters
 *
 * GET /api/organizations
 * Returns only organizations the user is a member of.
 */
export const ListOrganizationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListOrganizationsQuery = z.infer<typeof ListOrganizationsQuerySchema>;

/**
 * Add Member Request
 *
 * POST /api/organizations/:id/members
 * Only owners can add members.
 */
export const AddOrganizationMemberRequestSchema = z.object({
  userId: z.string().cuid(),
  role: OrganizationRole,
});

export type AddOrganizationMemberRequest = z.infer<typeof AddOrganizationMemberRequestSchema>;

/**
 * Update Member Request
 *
 * PUT /api/organizations/:id/members/:userId
 * Only owners can update member roles.
 */
export const UpdateOrganizationMemberRequestSchema = z.object({
  role: OrganizationRole,
});

export type UpdateOrganizationMemberRequest = z.infer<typeof UpdateOrganizationMemberRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Create Organization Response
 *
 * Returns newly created organization with user's role.
 */
export const CreateOrganizationResponseSchema = z.object({
  organization: OrganizationWithRoleSchema,
});

export type CreateOrganizationResponse = z.infer<typeof CreateOrganizationResponseSchema>;

/**
 * Get Organization Response
 *
 * Returns single organization with user's role.
 */
export const GetOrganizationResponseSchema = z.object({
  organization: OrganizationWithRoleSchema,
});

export type GetOrganizationResponse = z.infer<typeof GetOrganizationResponseSchema>;

/**
 * Update Organization Response
 *
 * Returns updated organization with user's role.
 */
export const UpdateOrganizationResponseSchema = z.object({
  organization: OrganizationWithRoleSchema,
});

export type UpdateOrganizationResponse = z.infer<typeof UpdateOrganizationResponseSchema>;

/**
 * List Organizations Response
 *
 * Returns paginated list of organizations user is a member of.
 */
export const ListOrganizationsResponseSchema = z.object({
  organizations: z.array(OrganizationWithRoleSchema),
  total: z.number().int().min(0),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type ListOrganizationsResponse = z.infer<typeof ListOrganizationsResponseSchema>;

/**
 * List Members Response
 *
 * GET /api/organizations/:id/members
 */
export const ListOrganizationMembersResponseSchema = z.object({
  members: z.array(OrganizationMemberSchema.extend({
    user: z.object({
      id: z.string().cuid(),
      name: z.string().nullable(),
      email: z.string().email(),
    }),
  })),
  total: z.number().int().min(0),
});

export type ListOrganizationMembersResponse = z.infer<typeof ListOrganizationMembersResponseSchema>;

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
