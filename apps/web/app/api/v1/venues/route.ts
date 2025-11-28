/**
 * GET /api/v1/venues
 * List all venues
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';
import { prisma } from '@/lib/prisma';

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
      return NextResponse.json({ error: auth.error.message }, { status: 401 });
    }

    const tenantId = auth.context.tenantId;

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';

    const skip = (page - 1) * limit;

    // Build query filters
    const whereClause: any = {
      orgId: tenantId,
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive' as const,
      };
    }

    if (city) {
      whereClause.city = {
        contains: city,
        mode: 'insensitive' as const,
      };
    }

    // Query venues from database
    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          phone: true,
          email: true,
          _count: {
            select: { tournaments: true },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.venue.count({ where: whereClause }),
    ]);

    // Transform to API response format
    const formattedVenues: Venue[] = venues.map((v) => ({
      id: v.id,
      name: v.name,
      location: [v.city, v.state].filter(Boolean).join(', ') || 'Unknown',
      tournament_count: v._count.tournaments,
    }));

    return NextResponse.json({
      data: formattedVenues,
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
