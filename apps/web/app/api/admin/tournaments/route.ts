/**
 * Admin Tournament Management API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Admin-only endpoints for managing tournaments across all organizations.
 * Requires admin role authentication.
 *
 * Routes:
 * - GET /api/admin/tournaments - List all tournaments with filters
 * - POST /api/admin/tournaments - Create tournament (admin creation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';
import { logTournamentCreated } from '@/lib/audit/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ListTournamentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum(['draft', 'registration', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
  format: z
    .enum(['single_elimination', 'double_elimination', 'round_robin', 'modified_single', 'chip_format'])
    .optional(),
  orgId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'name', 'status', 'playerCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const CreateTournamentSchema = z.object({
  orgId: z.string().min(1, 'Organization ID is required'),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'modified_single', 'chip_format']),
  sportConfigId: z.string().min(1),
  sportConfigVersion: z.string().min(1),
  status: z.enum(['draft', 'registration', 'active']).default('draft'),
});

// ============================================================================
// GET /api/admin/tournaments
// ============================================================================

/**
 * List all tournaments with pagination, search, and filters
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    const validation = ListTournamentsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      status,
      format,
      orgId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = validation.data;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (format) {
      where.format = format;
    }

    if (orgId) {
      where.orgId = orgId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get total count
    const total = await prisma.tournament.count({ where });

    // Get tournaments with pagination
    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            players: true,
            matches: true,
          },
        },
      },
      orderBy:
        sortBy === 'playerCount'
          ? { players: { _count: sortOrder } }
          : { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Format response
    const tournamentList = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.status,
      format: t.format,
      organization: t.organization,
      playerCount: t._count.players,
      matchCount: t._count.matches,
      createdAt: t.createdAt.toISOString(),
      startedAt: t.startedAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
    }));

    return NextResponse.json(
      {
        tournaments: tournamentList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tournaments',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/admin/tournaments
// ============================================================================

/**
 * Create tournament (admin creation)
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = CreateTournamentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.orgId },
    });

    if (!organization) {
      return NextResponse.json(
        {
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found',
          },
        },
        { status: 404 }
      );
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        description: data.description,
        format: data.format,
        status: data.status,
        sportConfigId: data.sportConfigId,
        sportConfigVersion: data.sportConfigVersion,
        createdBy: authResult.user.id,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log audit trail
    await logTournamentCreated(
      authResult.user.id,
      authResult.user.email,
      tournament.id,
      {
        name: tournament.name,
        orgId: tournament.orgId,
        format: tournament.format,
        status: tournament.status,
      },
      request
    );

    return NextResponse.json(
      {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          status: tournament.status,
          format: tournament.format,
          organization: tournament.organization,
          createdAt: tournament.createdAt.toISOString(),
          createdBy: tournament.createdBy,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create tournament',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
