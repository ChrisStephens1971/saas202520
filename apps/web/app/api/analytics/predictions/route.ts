/**
 * Analytics Predictions API Route
 * Sprint 10 Week 1 Day 4
 *
 * GET /api/analytics/predictions/revenue?months=6 - Revenue forecast
 * GET /api/analytics/predictions/users?months=6 - User growth forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as PredictiveModels from '@/lib/analytics/services/predictive-models';

/**
 * GET /api/analytics/predictions
 * Get predictions based on type query parameter
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
    const type = searchParams.get('type'); // 'revenue' or 'users'
    const months = parseInt(searchParams.get('months') || '6');
    const tenantId = searchParams.get('tenantId');

    // Validate required fields
    if (!type || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameters: type, tenantId' },
        { status: 400 }
      );
    }

    // Validate months
    if (months < 1 || months > 12) {
      return NextResponse.json(
        { error: 'Months must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Get predictions based on type
    let predictions;

    if (type === 'revenue') {
      predictions = await PredictiveModels.predictRevenue(tenantId, months);
    } else if (type === 'users') {
      predictions = await PredictiveModels.predictUserGrowth(tenantId, months);
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "revenue" or "users"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      type,
      months,
      predictions,
    });
  } catch (error) {
    console.error('[API] Predictions error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate predictions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
