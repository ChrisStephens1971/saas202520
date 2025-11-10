/**
 * GET /api/v1/venues
 * List all venues
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';
import { Prisma } from '@tournament/shared';

interface Venue {
  id: string;
  name: string;
  location: string;
  tournament_count: number;
}

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

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';

    const _skip = (page - 1) * limit;

    // Note: This assumes venues table exists in schema
    // If not, this will need to be added
    // For now, returning mock data structure

    // Build query filters
    const whereClause: any = {
      orgId: tenantId,
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (city) {
      whereClause.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    // Mock response - replace with actual venue query when schema is updated
    const venues: Venue[] = [];
    const total = 0;

    // TODO: Implement actual venue query when venues table is added:
    // const venues = await prisma.venue.findMany({
    //   where: whereClause,
    //   select: {
    //     id: true,
    //     name: true,
    //     address: true,
    //     city: true,
    //     _count: {
    //       select: { tournaments: true }
    //     }
    //   },
    //   skip,
    //   take: limit,
    // });

    return NextResponse.json({
      data: venues,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Venues API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: 'An error occurred while fetching venues',
        },
      },
      { status: 500 }
    );
  }
}
