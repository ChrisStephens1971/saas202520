/**
 * GET /api/v1/venues/[id]
 * Get single venue details
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api/public-api-auth';
import { prisma } from '@/lib/prisma';

interface VenueDetails {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  statistics: {
    total_tournaments: number;
    active_tournaments: number;
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate API request and get tenant context
    const auth = await authenticateApiRequest(request);

    if (!auth.success) {
      return NextResponse.json({ error: auth.error.message }, { status: 401 });
    }

    const tenantId = auth.context.tenantId;

    const { id: venueId } = await params;

    // Query venue with tournament statistics
    const venue = await prisma.venue.findFirst({
      where: {
        id: venueId,
        orgId: tenantId,
      },
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
        tournaments: {
          where: {
            status: {
              in: ['registration', 'active'],
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Venue not found',
          },
        },
        { status: 404 }
      );
    }

    // Format response
    const response: VenueDetails = {
      id: venue.id,
      name: venue.name,
      address: venue.address || undefined,
      city: venue.city || undefined,
      state: venue.state || undefined,
      zip: venue.zip || undefined,
      contact: {
        phone: venue.phone || undefined,
        email: venue.email || undefined,
        website: venue.website || undefined,
      },
      statistics: {
        total_tournaments: venue._count.tournaments,
        active_tournaments: venue.tournaments.length,
      },
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Venue details API error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'internal_error',
          message: 'An error occurred while fetching venue details',
        },
      },
      { status: 500 }
    );
  }
}
