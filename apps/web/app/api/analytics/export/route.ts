/**
 * Analytics Export API Route
 * Sprint 10 Week 1 Day 4
 *
 * POST /api/analytics/export - Queue export job
 * GET /api/analytics/export/[jobId] - Check export status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as ExportService from '@/lib/analytics/services/export-service';

/**
 * POST /api/analytics/export
 * Queue an analytics export job
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      tenantId,
      exportType,
      format,
      dateRange: _dateRange,
    }: {
      tenantId: string;
      exportType: 'revenue' | 'tournaments' | 'users';
      format: 'csv' | 'excel' | 'pdf';
      dateRange?: { start: string; end: string };
    } = body;

    // Validate required fields
    if (!tenantId || !exportType || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, exportType, format' },
        { status: 400 }
      );
    }

    // Queue export job
    const jobId = await ExportService.queueExportJob(tenantId, exportType, {
      userId: session.user.id || 'unknown',
      email: session.user.email || '',
      format,
      uploadToS3: true,
      notifyOnComplete: true,
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Export job queued successfully',
    });
  } catch (error) {
    console.error('[API] Export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to queue export',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
