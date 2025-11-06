/**
 * Scheduled Reports API Route
 * Sprint 10 Week 1 Day 4
 *
 * GET /api/analytics/reports - List scheduled reports
 * POST /api/analytics/reports - Create scheduled report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as ScheduledReportsService from '@/lib/analytics/services/scheduled-reports-service';

/**
 * GET /api/analytics/reports
 * List all scheduled reports for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const includeDisabled = searchParams.get('includeDisabled') === 'true';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tenantId' },
        { status: 400 }
      );
    }

    // Get reports
    const reports = await ScheduledReportsService.getScheduledReports(
      tenantId,
      includeDisabled
    );

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error('[API] Get reports error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/reports
 * Create a new scheduled report
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const config: ScheduledReportsService.ReportConfig = await request.json();

    // Validate required fields
    if (!config.tenantId || !config.name || !config.schedule || !config.recipients) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: tenantId, name, schedule, recipients',
        },
        { status: 400 }
      );
    }

    // Set createdBy to current user
    config.createdBy = session.user.id || 'unknown';

    // Create report
    const report = await ScheduledReportsService.createScheduledReport(config);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[API] Create report error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
