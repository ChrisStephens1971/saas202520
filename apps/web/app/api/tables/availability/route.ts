/**
 * Table Availability API
 * Sprint 2
 *
 * Endpoint for checking table availability and status
 *
 * Routes:
 * - GET /api/tables/availability?tournamentId=xxx - Get availability for all tables
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { getAvailableTables } from '@/lib/tournament/table-manager';
import type { TableAvailabilityResponse } from '@/lib/tournament/types';

/**
 * GET /api/tables/availability
 *
 * Get availability status for all tables in a tournament
 *
 * Query Parameters:
 * - tournamentId: string (required)
 *
 * @returns {TableAvailabilityResponse} Table availability data
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
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

    // Get organization context from headers
    const headersList = await headers();
    const orgId = headersList.get('x-org-id');

    if (!orgId) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected',
          },
        },
        { status: 400 }
      );
    }

    // Get tournament ID from query params
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_PARAM',
            message: 'tournamentId query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    // Get table availability
    const tables = await getAvailableTables(tournamentId, orgId);

    // Calculate counts by status
    const availableCount = tables.filter((t) => t.isAvailable).length;
    const inUseCount = tables.filter((t) => t.status === 'in_use').length;
    const maintenanceCount = tables.filter((t) => t.status === 'maintenance').length;

    const response: TableAvailabilityResponse = {
      tables,
      availableCount,
      inUseCount,
      maintenanceCount,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching table availability:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch table availability',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
