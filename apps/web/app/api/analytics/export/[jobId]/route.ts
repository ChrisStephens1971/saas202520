/**
 * Analytics Export Status API Route
 * Sprint 10 Week 1 Day 4
 *
 * GET /api/analytics/export/[jobId] - Check export job status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as ExportService from '@/lib/analytics/services/export-service';

/**
 * GET /api/analytics/export/[jobId]
 * Get export job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authenticate user
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Get job status
    const status = await ExportService.getExportStatus(jobId);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[API] Export status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get export status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
