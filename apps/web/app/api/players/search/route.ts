/**
 * POST /api/players/search
 * Search players with filters and pagination
 * Sprint 10 Week 2 - Player Data Retrieval API
 *
 * Multi-tenant: Filters by tenant_id from session
 * Features: Search, skill level filter, location filter, pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { searchPlayers } from '@/lib/player-profiles/services/player-profile-service';
import { SkillLevel } from '@/lib/player-profiles/types';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const SearchPlayersSchema = z.object({
  query: z.string().optional(),
  skillLevel: z.array(z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])).optional(),
  location: z.string().optional(),
  minWinRate: z.number().min(0).max(100).optional(),
  sortBy: z.enum(['name', 'winRate', 'tournaments', 'lastPlayed']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

type SearchPlayersRequest = z.infer<typeof SearchPlayersSchema>;

// ============================================================================
// POST /api/players/search
// ============================================================================

/**
 * Search players with filters
 * Returns paginated list of player profiles matching criteria
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Get tenant ID from session
    // TODO: Update this when proper tenant extraction is implemented
    const tenantId = (session as { organizationId?: string; user: { id: string } }).organizationId || session.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = SearchPlayersSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const searchRequest = validationResult.data;

    // Perform search using service
    const result = await searchPlayers(tenantId, searchRequest);

    // Return search results
    return NextResponse.json(
      {
        players: result.players.map((player) => ({
          id: player.id,
          name: player.name,
          photoUrl: player.photoUrl,
          skillLevel: player.skillLevel,
          location: player.location,
          winRate: player.winRate,
          totalTournaments: player.totalTournaments,
          lastPlayed: player.lastPlayed?.toISOString() || null,
        })),
        pagination: {
          total: result.total,
          limit: searchRequest.limit,
          offset: searchRequest.offset,
          hasMore: result.hasMore,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[POST /api/players/search] Error:', error);

    // Handle known errors
    const err = error as { name?: string; code?: string; message?: string; statusCode?: number };
    if (err.name === 'PlayerProfileError') {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status: err.statusCode || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search players',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
