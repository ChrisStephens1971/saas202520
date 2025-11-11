/**
 * GET /api/v1/venues/[id]/tournaments
 * List tournaments at venue
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  start_date: string;
  player_count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: venueId } = await params;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const skip = (page - 1) * limit;

    // Build query filters
    const whereClause: any = {
      orgId: tenantId,
      venueId: venueId,
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    // Query tournaments at venue
    const [tournamentData, total] = await Promise.all([
      prisma.tournament.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          format: true,
          status: true,
          startedAt: true,
          createdAt: true,
          _count: {
            select: { players: true },
          },
        },
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.tournament.count({ where: whereClause }),
    ]);

    // Transform to API response format
    const tournaments: Tournament[] = tournamentData.map((t) => ({
      id: t.id,
      name: t.name,
      format: t.format,
      status: t.status,
      start_date: t.startedAt?.toISOString() || t.createdAt.toISOString(),
      player_count: t._count.players,
    }));

    return NextResponse.json({
      data: tournaments,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        venue_id: venueId,
      },
    });
  } catch (error) {
    console.error('Venue tournaments API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: 'An error occurred while fetching venue tournaments',
        },
      },
      { status: 500 }
    );
  }
}
