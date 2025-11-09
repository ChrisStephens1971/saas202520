/**
 * GET /api/v1/tournaments
 * List tournaments with pagination and filtering
 *
 * Sprint 10 Week 3 - Public API & Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tournament/shared';
import {
  apiPaginated,
  internalError,
  validationError,
  calculatePaginationMeta,
  calculateSkip,
  getRateLimitHeaders,
} from '@/lib/api/public-api-helpers';
import {
  tournamentListQuerySchema,
  safeValidateQuery,
} from '@/lib/api/validation/public-api.validation';
import type { TournamentSummary } from '@/lib/api/types/public-api.types';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

/**
 * GET /api/v1/tournaments
 *
 * List tournaments with pagination and optional filtering.
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by status (upcoming, active, completed)
 * - format: Filter by format (single_elimination, double_elimination, etc.)
 *
 * @example
 * GET /api/v1/tournaments?page=1&limit=20&status=active
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error.message },
        { status: 401 }
      );
    }

    const tenantId = auth.context.tenantId;

    // Validate query parameters
    const validation = safeValidateQuery(
      tournamentListQuerySchema,
      request.nextUrl.searchParams
    );

    if (!validation.success) {
      return validationError(
        'Invalid query parameters',
        { errors: validation.error.errors }
      );
    }

    const { page, limit, status, format } = validation.data;

    // Build where clause for filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      orgId: tenantId,
    };

    // Filter by status
    if (status) {
      switch (status) {
        case 'upcoming':
          where.status = { in: ['draft', 'registration'] };
          break;
        case 'active':
          where.status = { in: ['active', 'paused'] };
          break;
        case 'completed':
          where.status = 'completed';
          break;
      }
    }

    // Filter by format
    if (format) {
      where.format = format;
    }

    // Get total count for pagination
    const total = await prisma.tournament.count({ where });

    // Get tournaments with pagination
    const tournaments = await prisma.tournament.findMany({
      where,
      skip: calculateSkip(page, limit),
      take: limit,
      orderBy: [
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        status: true,
        startedAt: true,
        createdAt: true,
        _count: {
          select: {
            players: true,
          },
        },
      },
    });

    // Transform to API response format
    const data: TournamentSummary[] = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      format: t.format,
      status: t.status,
      startDate: t.startedAt?.toISOString() || null,
      playerCount: t._count.players,
      description: t.description || undefined,
    }));

    // Calculate pagination metadata
    const pagination = calculatePaginationMeta(total, page, limit);

    // Mock rate limit headers (will be replaced by actual middleware)
    const rateLimitHeaders = getRateLimitHeaders(1000, 999, Date.now() + 3600000);

    return apiPaginated(data, pagination, rateLimitHeaders);

  } catch (error) {
    console.error('[API Error] GET /api/v1/tournaments:', error);
    return internalError(
      'Failed to fetch tournaments',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
