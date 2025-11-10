/**
 * Scheduled Report Details API Route
 * Sprint 10 Week 1 Day 4
 *
 * GET /api/analytics/reports/[id] - Get report details
 * PATCH /api/analytics/reports/[id] - Update report
 * DELETE /api/analytics/reports/[id] - Delete report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as ScheduledReportsService from '@/lib/analytics/services/scheduled-reports-service';

/**
 * GET /api/analytics/reports/[id]
 * Get a specific scheduled report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    // Get report
    const report = await ScheduledReportsService.getScheduledReport(id);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[API] Get report error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/reports/[id]
 * Update a scheduled report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    // Parse request body
    const updates: Partial<ScheduledReportsService.ReportConfig> =
      await request.json();

    // Update report
    const report = await ScheduledReportsService.updateScheduledReport(id, updates);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[API] Update report error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/analytics/reports/[id]
 * Delete (disable) a scheduled report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    // Delete report
    await ScheduledReportsService.deleteScheduledReport(id);

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('[API] Delete report error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
