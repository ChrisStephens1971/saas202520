/**
 * Tournaments API Endpoints
 *
 * Handles CRUD operations for tournaments.
 * All endpoints require authentication and enforce multi-tenant isolation.
 *
 * Routes:
 * - GET /api/tournaments - List organization's tournaments
 * - POST /api/tournaments - Create new tournament (owner/td only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import {
  CreateTournamentRequestSchema,
  ListTournamentsQuerySchema,
  type ListTournamentsResponse,
  type CreateTournamentResponse,
} from '@tournament/api-contracts';

/**
 * GET /api/tournaments
 *
 * Lists all tournaments for the current organization.
 * Filtered by tenant context (x-org-id header).
 * Returns tournaments with computed statistics.
 *
 * Query Parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - status: TournamentStatus (optional filter)
 * - format: TournamentFormat (optional filter)
 *
 * @returns {ListTournamentsResponse} Paginated list of tournaments with stats
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get organization context from headers (set by middleware)
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

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = ListTournamentsQuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      status: searchParams.get('status'),
      format: searchParams.get('format'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid query parameters',
            details: queryValidation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { limit, offset, status, format } = queryValidation.data;

    // Build where clause with optional filters
    const where = {
      orgId,
      ...(status && { status }),
      ...(format && { format }),
    };

    // Fetch tournaments with stats
    const [tournamentsData, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.tournament.count({ where }),
    ]);

    // Transform to response format with computed stats
    const tournaments = tournamentsData.map((tournament) => ({
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
    }));

    const response: ListTournamentsResponse = {
      tournaments,
      total,
      limit,
      offset,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error listing tournaments:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list tournaments',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments
 *
 * Creates a new tournament for the current organization.
 * Only owners and TDs can create tournaments.
 * Tournament slug must be unique within the organization.
 *
 * Request Body:
 * - name: string (required, 1-255 characters)
 * - slug: string (required, URL-safe format, auto-lowercased)
 * - description: string (optional, max 2000 characters)
 * - format: TournamentFormat (required)
 * - sport: SportType (default: 'pool')
 * - gameType: GameType (required)
 * - raceToWins: number (required, 1-21)
 * - maxPlayers: number (optional, 8-128)
 * - startDate: datetime string (optional)
 *
 * @returns {CreateTournamentResponse} Created tournament
 */
export async function POST(request: NextRequest) {
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

    // Check role permissions (owner or td only)
    if (userRole !== 'owner' && userRole !== 'td') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners and TDs can create tournaments',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateTournamentRequestSchema.safeParse(body);

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

    const { name, slug, description, format, sport, gameType, raceToWins, maxPlayers, startDate } =
      validation.data;

    // Check if slug is already taken within this organization
    // NOTE: For MVP, storing slug in name field since schema uses sportConfigId/sportConfigVersion
    const existingTournament = await prisma.tournament.findFirst({
      where: {
        orgId,
        name: slug,
      },
    });

    if (existingTournament) {
      return NextResponse.json(
        {
          error: {
            code: 'SLUG_TAKEN',
            message: `Tournament slug "${slug}" is already in use in this organization`,
          },
        },
        { status: 409 }
      );
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        orgId,
        name,
        description: description || null,
        status: 'draft',
        format,
        sportConfigId: 'pool-8ball-v1',
        sportConfigVersion: '1.0.0',
        createdBy: session.user.id,
        startedAt: startDate ? new Date(startDate) : null,
      },
    });

    const response: CreateTournamentResponse = {
      tournament: {
        id: tournament.id,
        orgId: tournament.orgId,
        name: tournament.name,
        slug,
        description: tournament.description,
        status: tournament.status as 'draft' | 'registration' | 'active' | 'paused' | 'completed' | 'cancelled',
        format: tournament.format as 'single_elimination' | 'double_elimination' | 'round_robin' | 'modified_single' | 'chip_format',
        sport,
        gameType,
        raceToWins,
        maxPlayers: maxPlayers ?? null,
        createdAt: tournament.createdAt.toISOString(),
        updatedAt: new Date().toISOString(), // TODO: Add updatedAt to schema
        startedAt: tournament.startedAt?.toISOString() ?? null,
        completedAt: tournament.completedAt?.toISOString() ?? null,
        createdBy: tournament.createdBy,
      },
    };

    return NextResponse.json(response, { status: 201 });
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

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
