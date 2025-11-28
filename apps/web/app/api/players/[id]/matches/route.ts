/**
 * GET /api/players/[id]/matches
 * Get player match history with pagination
 * Sprint 10 Week 2 - Player Data Retrieval API
 *
 * Multi-tenant: Validates player belongs to tenant
 * Features: Paginated match history, opponent info, results, tournament context
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractTenantContext } from '@/lib/auth/tenant';
import { z } from 'zod';
import { getPlayerMatchHistory } from '@/lib/player-profiles/services/player-profile-service';
import { prisma } from '@/lib/prisma';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const GetMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['completed', 'active', 'all']).default('all'),
  tournamentId: z.string().optional(),
});

type _GetMatchesQuery = z.infer<typeof GetMatchesQuerySchema>;

// ============================================================================
// GET /api/players/[id]/matches
// ============================================================================

/**
 * Get player match history
 * Returns paginated match history with opponent info, results, and tournament context
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Extract tenant context (authentication + org validation)
    const tenantResult = await extractTenantContext();
    if (!tenantResult.success) {
      return tenantResult.response;
    }

    const { orgId: tenantId } = tenantResult.context;
    const { id: playerId } = await params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      status: searchParams.get('status'),
      tournamentId: searchParams.get('tournamentId'),
    };

    const validationResult = GetMatchesQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const query = validationResult.data;

    // Verify player exists and belongs to tenant
    const playerProfile = await prisma.playerProfile.findFirst({
      where: {
        playerId,
        tenantId,
      },
    });

    if (!playerProfile) {
      return NextResponse.json(
        {
          error: {
            code: 'PLAYER_NOT_FOUND',
            message: 'Player not found or does not belong to your organization',
          },
        },
        { status: 404 }
      );
    }

    // Build where clause for additional filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const additionalWhere: any = {};

    if (query.tournamentId) {
      additionalWhere.tournamentId = query.tournamentId;
    }

    // Get match history count for pagination
    const totalMatches = await prisma.matchHistory.count({
      where: {
        playerId,
        tenantId,
        ...additionalWhere,
      },
    });

    // Get match history
    const matchHistory = await getPlayerMatchHistory(playerId, tenantId, query.limit, query.offset);

    // Filter by status if specified
    let filteredMatches = matchHistory;
    if (query.status !== 'all') {
      // Note: The status filtering logic depends on your match status tracking
      // This is a placeholder - adjust based on your actual implementation
      filteredMatches = matchHistory.filter((_match) => {
        // If you track match status in metadata or have a status field
        return true; // Adjust filtering logic
      });
    }

    // Format response
    return NextResponse.json(
      {
        playerId,
        matches: filteredMatches.map((match) => ({
          id: match.id,
          matchId: match.matchId,
          result: match.result,
          score: {
            player: match.playerScore,
            opponent: match.opponentScore,
          },
          opponent: {
            id: match.opponent.id,
            name: match.opponent.name,
            photoUrl: match.opponent.photoUrl,
            skillLevel: match.opponent.skillLevel,
          },
          tournament: {
            id: match.tournament.id,
            name: match.tournament.name,
            format: match.tournament.format,
            date: match.tournament.date.toISOString(),
          },
          metadata: {
            round: match.metadata?.round,
            bracket: match.metadata?.bracket,
            tableNumber: match.metadata?.tableNumber,
            duration: match.duration,
          },
          playedAt: match.matchDate.toISOString(),
        })),
        pagination: {
          total: totalMatches,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + filteredMatches.length < totalMatches,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[GET /api/players/[id]/matches] Error:', error);

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
          message: 'Failed to fetch match history',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
