/**
 * GET /api/v1/venues/[id]/tournaments
 * List tournaments at venue
 */

import { NextRequest, NextResponse } from 'next/server';
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

    const _skip = (page - 1) * limit;

    // Note: This assumes tournaments have a venue_id field
    // If not, this endpoint will need to be updated

    // Build query filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      orgId: tenantId,
      // venueId: venueId, // Uncomment when venue_id is added to tournaments
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    // Mock response - replace with actual tournament query
    // TODO: Implement actual tournament query:
    // const tournaments = await prisma.tournament.findMany({
    //   where: whereClause,
    //   select: {
    //     id: true,
    //     name: true,
    //     format: true,
    //     status: true,
    //     startedAt: true,
    //     _count: {
    //       select: { players: true }
    //     }
    //   },
    //   orderBy: [
    //     { startedAt: 'desc' },
    //   ],
    //   skip,
    //   take: limit,
    // });

    const tournaments: Tournament[] = [];
    const total = 0;

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
