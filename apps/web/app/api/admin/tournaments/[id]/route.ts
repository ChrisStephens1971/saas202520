/**
 * Admin Tournament Detail API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Admin endpoints for individual tournament management.
 *
 * Routes:
 * - GET /api/admin/tournaments/:id - Get tournament details
 * - PATCH /api/admin/tournaments/:id - Update tournament
 * - DELETE /api/admin/tournaments/:id - Soft delete tournament
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';
import {
  logTournamentUpdated,
  logTournamentDeleted,
} from '@/lib/audit/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateTournamentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z
    .enum(['draft', 'registration', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
  format: z
    .enum(['single_elimination', 'double_elimination', 'round_robin', 'modified_single', 'chip_format'])
    .optional(),
});

// ============================================================================
// GET /api/admin/tournaments/:id
// ============================================================================

/**
 * Get tournament details with full admin context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch tournament with detailed information
    const tournament = await prisma.tournament.findUnique({
      where: { id },
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
            tables: true,
            events: true,
          },
        },
        players: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            chipCount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Show latest 10 players
        },
        matches: {
          where: {
            state: 'completed',
          },
          select: {
            id: true,
            state: true,
            completedAt: true,
          },
          orderBy: {
            completedAt: 'desc',
          },
          take: 5, // Show latest 5 completed matches
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          status: tournament.status,
          format: tournament.format,
          organization: tournament.organization,
          sportConfigId: tournament.sportConfigId,
          sportConfigVersion: tournament.sportConfigVersion,
          createdBy: tournament.createdBy,
          createdAt: tournament.createdAt.toISOString(),
          startedAt: tournament.startedAt?.toISOString() ?? null,
          completedAt: tournament.completedAt?.toISOString() ?? null,
          counts: {
            players: tournament._count.players,
            matches: tournament._count.matches,
            tables: tournament._count.tables,
            events: tournament._count.events,
          },
          recentPlayers: tournament.players.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            status: p.status,
            chipCount: p.chipCount,
            createdAt: p.createdAt.toISOString(),
          })),
          recentMatches: tournament.matches.map((m) => ({
            id: m.id,
            state: m.state,
            completedAt: m.completedAt?.toISOString() ?? null,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tournament',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/admin/tournaments/:id
// ============================================================================

/**
 * Update tournament (admin override)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch existing tournament
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!existingTournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          },
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTournamentSchema.safeParse(body);

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

    // Update tournament
    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.format && { format: data.format }),
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
    await logTournamentUpdated(
      authResult.user.id,
      authResult.user.email,
      id,
      {
        name: existingTournament.name,
        description: existingTournament.description,
        status: existingTournament.status,
        format: existingTournament.format,
      },
      {
        name: updated.name,
        description: updated.description,
        status: updated.status,
        format: updated.format,
      },
      request
    );

    return NextResponse.json(
      {
        tournament: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          status: updated.status,
          format: updated.format,
          organization: updated.organization,
          createdAt: updated.createdAt.toISOString(),
          startedAt: updated.startedAt?.toISOString() ?? null,
          completedAt: updated.completedAt?.toISOString() ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update tournament',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/admin/tournaments/:id
// ============================================================================

/**
 * Soft delete tournament (admin override)
 * Sets status to 'cancelled' instead of hard delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch existing tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          },
        },
        { status: 404 }
      );
    }

    // Soft delete: Update status to cancelled
    await prisma.tournament.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });

    // Log audit trail
    await logTournamentDeleted(
      authResult.user.id,
      authResult.user.email,
      id,
      {
        name: tournament.name,
        orgId: tournament.orgId,
        status: tournament.status,
      },
      request
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete tournament',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
