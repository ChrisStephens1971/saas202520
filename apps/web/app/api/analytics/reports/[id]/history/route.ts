/**
 * Report History API Route
 * Sprint 10 Week 1 Day 4
 *
 * GET /api/analytics/reports/[id]/history - Get report delivery history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as ScheduledReportsService from '@/lib/analytics/services/scheduled-reports-service';

/**
 * GET /api/analytics/reports/[id]/history
 * Get delivery history for a scheduled report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get history
    const history = await ScheduledReportsService.getReportHistory(id, limit);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('[API] Get report history error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get report history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
