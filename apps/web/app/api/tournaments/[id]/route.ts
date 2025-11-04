/**
 * Tournament Detail API Endpoints
 *
 * Handles operations on individual tournaments.
 * All endpoints require authentication and verify tenant access.
 *
 * Routes:
 * - GET /api/tournaments/:id - Get tournament details
 * - PUT /api/tournaments/:id - Update tournament (owner/td only)
 * - DELETE /api/tournaments/:id - Delete tournament (owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import {
  UpdateTournamentRequestSchema,
  type GetTournamentResponse,
  type UpdateTournamentResponse,
  isValidStatusTransition,
} from '@tournament/api-contracts';

/**
 * GET /api/tournaments/:id
 *
 * Retrieves a single tournament by ID with computed statistics.
 * Tournament must belong to user's current organization.
 *
 * @param {string} id - Tournament ID (from URL)
 * @returns {GetTournamentResponse} Tournament details with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get organization context from headers
    const headersList = await headers();
    const orgId = headersList.get('x-org-id');

    if (!orgId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Fetch tournament and verify it belongs to user's org
    const tournament = await prisma.tournament.findFirst({
      where: {
        id,
        orgId, // Tenant isolation
      },
      include: {
        _count: {
          select: {
            players: true,
            matches: true,
          },
        },
        matches: {
          where: { state: 'completed' },
          select: { id: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    const response: GetTournamentResponse = {
      tournament: {
        id: tournament.id,
        orgId: tournament.orgId,
        name: tournament.name,
        slug: tournament.name.toLowerCase().replace(/\s+/g, '-'),
        description: tournament.description,
        status: tournament.status as 'draft' | 'registration' | 'active' | 'paused' | 'completed' | 'cancelled',
        format: tournament.format as 'single_elimination' | 'double_elimination' | 'round_robin' | 'modified_single' | 'chip_format',
        sport: 'pool' as const,
        gameType: 'eight-ball' as const,
        raceToWins: 7,
        maxPlayers: null,
        createdAt: tournament.createdAt.toISOString(),
        updatedAt: new Date().toISOString(), // TODO: Add updatedAt to schema
        startedAt: tournament.startedAt?.toISOString() ?? null,
        completedAt: tournament.completedAt?.toISOString() ?? null,
        createdBy: tournament.createdBy,
        playerCount: tournament._count.players,
        matchCount: tournament._count.matches,
        completedMatchCount: tournament.matches.length,
      },
    };

    return NextResponse.json(response, { status: 200 });
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

/**
 * PUT /api/tournaments/:id
 *
 * Updates a tournament's details.
 * Only organization owners and TDs can update tournaments.
 * Validates status transitions and enforces business rules.
 *
 * Request Body:
 * - name?: string (optional, 1-255 characters)
 * - slug?: string (optional, URL-safe format)
 * - description?: string (optional, max 2000 characters, nullable)
 * - status?: TournamentStatus (optional, validated for valid transitions)
 * - format?: TournamentFormat (optional, cannot change after started)
 * - gameType?: GameType (optional, cannot change after started)
 * - raceToWins?: number (optional, 1-21)
 * - maxPlayers?: number (optional, 8-128, nullable)
 * - startDate?: datetime string (optional, nullable)
 *
 * @param {string} id - Tournament ID (from URL)
 * @returns {UpdateTournamentResponse} Updated tournament
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get organization context and role from headers
    const headersList = await headers();
    const orgId = headersList.get('x-org-id');
    const userRole = headersList.get('x-user-role');

    if (!orgId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Fetch tournament and verify access
    const tournament = await prisma.tournament.findFirst({
      where: {
        id,
        orgId, // Tenant isolation
      },
    });

    if (!tournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    // Check role permissions (owner or td only)
    if (userRole !== 'owner' && userRole !== 'td') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners and TDs can update tournaments',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTournamentRequestSchema.safeParse(body);

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

    const updateData = validation.data;

    // Validate status transition if status is being changed
    if (updateData.status && updateData.status !== tournament.status) {
      const currentStatus = tournament.status as
        | 'draft'
        | 'registration'
        | 'active'
        | 'paused'
        | 'completed'
        | 'cancelled';
      const newStatus = updateData.status as
        | 'draft'
        | 'registration'
        | 'active'
        | 'paused'
        | 'completed'
        | 'cancelled';

      if (!isValidStatusTransition(currentStatus, newStatus)) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_STATUS_TRANSITION',
              message: `Cannot transition tournament from "${currentStatus}" to "${newStatus}"`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Prevent changing format or game configuration after tournament starts
    if (
      (updateData.format || updateData.gameType) &&
      (tournament.status === 'active' || tournament.status === 'completed')
    ) {
      return NextResponse.json(
        {
          error: {
            code: 'TOURNAMENT_STARTED',
            message: 'Cannot change format or game type after tournament has started',
          },
        },
        { status: 400 }
      );
    }

    // If slug is being changed, check uniqueness within org
    if (updateData.slug && updateData.slug !== tournament.name) {
      const existingTournament = await prisma.tournament.findFirst({
        where: {
          orgId,
          name: updateData.slug,
          id: { not: id },
        },
      });

      if (existingTournament) {
        return NextResponse.json(
          {
            error: {
              code: 'SLUG_TAKEN',
              message: `Tournament slug "${updateData.slug}" is already in use in this organization`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Update tournament
    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.format && { format: updateData.format }),
        ...(updateData.startDate !== undefined && {
          startedAt: updateData.startDate ? new Date(updateData.startDate) : null,
        }),
      },
    });

    const response: UpdateTournamentResponse = {
      tournament: {
        id: updated.id,
        orgId: updated.orgId,
        name: updated.name,
        slug: updateData.slug || updated.name.toLowerCase().replace(/\s+/g, '-'),
        description: updated.description,
        status: updated.status as 'draft' | 'registration' | 'active' | 'paused' | 'completed' | 'cancelled',
        format: updated.format as 'single_elimination' | 'double_elimination' | 'round_robin' | 'modified_single' | 'chip_format',
        sport: 'pool' as const,
        gameType: 'eight-ball' as const,
        raceToWins: 7,
        maxPlayers: null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: new Date().toISOString(), // TODO: Add updatedAt to schema
        startedAt: updated.startedAt?.toISOString() ?? null,
        completedAt: updated.completedAt?.toISOString() ?? null,
        createdBy: updated.createdBy,
      },
    };

    return NextResponse.json(response, { status: 200 });
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

/**
 * DELETE /api/tournaments/:id
 *
 * Deletes a tournament and all related data.
 * Only organization owners can delete tournaments.
 * Cascades to players, matches, tables, and events.
 *
 * @param {string} id - Tournament ID (from URL)
 * @returns {Response} 204 No Content on success
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get organization context and role from headers
    const headersList = await headers();
    const orgId = headersList.get('x-org-id');
    const userRole = headersList.get('x-user-role');

    if (!orgId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Verify tournament exists and belongs to user's org
    const tournament = await prisma.tournament.findFirst({
      where: {
        id,
        orgId, // Tenant isolation
      },
    });

    if (!tournament) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    // Check role permissions (owner only)
    if (userRole !== 'owner') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners can delete tournaments',
          },
        },
        { status: 403 }
      );
    }

    // Delete tournament (cascades to players, matches, tables, events via Prisma schema)
    await prisma.tournament.delete({
      where: { id },
    });

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

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
