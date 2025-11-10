/**
 * GET /api/v1/tournaments/[id]
 * Get single tournament details
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tournament/shared';
import {
  apiSuccess,
  notFoundError,
  internalError,
  validationError,
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import { cuidSchema } from '@/lib/api/validation/public-api.validation';
import type { TournamentDetails } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/tournaments/:id
 *
 * Get detailed information about a specific tournament.
 *
 * @example
 * GET /api/v1/tournaments/clx1234567890
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: 401 }
      );
    }

    const tenantId = auth.context.tenantId;

    // Validate tournament ID
    const validation = cuidSchema.safeParse(id);
    if (!validation.success) {
      return validationError('Invalid tournament ID format');
    }

    const tournamentId = validation.data;

    // Fetch tournament with related data
    const tournament = await prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        orgId: tenantId, // Multi-tenant isolation
      },
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        status: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        _count: {
          select: {
            players: true,
            matches: true,
          },
        },
        matches: {
          select: {
            round: true,
          },
          orderBy: {
            round: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!tournament) {
      return notFoundError('Tournament');
    }

    // Calculate current round
    const currentRound = tournament.matches[0]?.round || null;

    // Transform to API response format
    const data: TournamentDetails = {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      format: tournament.format,
      status: tournament.status,
      startDate: tournament.startedAt?.toISOString() || null,
      completedDate: tournament.completedAt?.toISOString() || null,
      playerCount: tournament._count.players,
      matchCount: tournament._count.matches,
      currentRound,
      createdAt: tournament.createdAt.toISOString(),
    };

    // Mock rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(1000, 998, Date.now() + 3600000);

    return apiSuccess(data, rateLimitHeaders);

  } catch (error) {
    const { id } = await params;
    console.error(`[API Error] GET /api/v1/tournaments/${id}:`, error);
    return internalError(
      'Failed to fetch tournament',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
