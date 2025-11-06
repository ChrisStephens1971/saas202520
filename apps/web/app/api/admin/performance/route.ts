/**
 * Admin Performance Metrics API
 *
 * Endpoint: /api/admin/performance
 * Method: GET
 *
 * Returns database performance metrics for the admin dashboard.
 * Requires admin authentication.
 *
 * Sprint 9 Phase 3: Scale & Performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDatabaseHealth,
  getSlowQueryAnalysis,
  checkDatabaseHealth,
  formatBytes,
  formatNumber,
} from '@/lib/db/performance-monitor';

/**
 * GET /api/admin/performance
 *
 * Returns comprehensive database performance metrics
 *
 * Query Parameters:
 * - type: 'health' | 'slow-queries' | 'status' (default: 'health')
 *
 * Response:
 * ```json
 * {
 *   "connections": { "active": 5, "idle": 3, "total": 8 },
 *   "performance": {
 *     "totalQueries": 1234,
 *     "slowQueries": 45,
 *     "avgDuration": 25.5,
 *     "maxDuration": 250,
 *     "slowQueryPercentage": 3.6
 *   },
 *   "tables": [
 *     { "name": "tournaments", "rowCount": 1500, "sizeBytes": 524288 }
 *   ],
 *   "indexes": [
 *     { "tableName": "tournaments", "indexName": "idx_tournaments_status", "scans": 1234 }
 *   ]
 * }
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (adjust based on your auth implementation)
    // TODO: Implement proper role check
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Forbidden: Admin access required' },
    //     { status: 403 }
    //   );
    // }

    // Get query parameter
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'health';

    // Handle different metric types
    switch (type) {
      case 'health': {
        const health = await getDatabaseHealth();

        // Format response for better readability
        return NextResponse.json({
          connections: health.connections,
          performance: health.performance,
          tables: health.tables.map(table => ({
            name: table.name,
            rowCount: formatNumber(table.rowCount),
            size: formatBytes(table.sizeBytes),
            sizeBytes: table.sizeBytes,
          })),
          indexes: health.indexes.slice(0, 20), // Top 20 most-used indexes
        });
      }

      case 'slow-queries': {
        const analysis = await getSlowQueryAnalysis();
        return NextResponse.json(analysis);
      }

      case 'status': {
        const status = await checkDatabaseHealth();
        return NextResponse.json(status);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: health, slow-queries, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Performance metrics error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
