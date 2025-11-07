/**
 * Admin Tournament Bulk Operations API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Bulk operations for tournament management.
 *
 * Routes:
 * - POST /api/admin/tournaments/bulk - Bulk operations (delete, archive, status change)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';
import { logBulkOperation } from '@/lib/audit/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BulkOperationSchema = z.object({
  operation: z.enum(['delete', 'archive', 'changeStatus']),
  tournamentIds: z.array(z.string()).min(1).max(100),
  newStatus: z
    .enum(['draft', 'registration', 'active', 'paused', 'completed', 'cancelled'])
    .optional(),
});

// ============================================================================
// POST /api/admin/tournaments/bulk
// ============================================================================

/**
 * Perform bulk operations on tournaments
 */
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = BulkOperationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { operation, tournamentIds, newStatus } = validation.data;

    // Verify all tournaments exist
    const tournaments = await prisma.tournament.findMany({
      where: {
        id: {
          in: tournamentIds,
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (tournaments.length !== tournamentIds.length) {
      return NextResponse.json(
        {
          error: {
            code: 'TOURNAMENTS_NOT_FOUND',
            message: 'Some tournaments were not found',
            found: tournaments.length,
            requested: tournamentIds.length,
          },
        },
        { status: 404 }
      );
    }

    const result = { success: 0, failed: 0 };

    // Perform bulk operation
    switch (operation) {
      case 'delete':
        // Soft delete: Set status to cancelled
        const deleteResult = await prisma.tournament.updateMany({
          where: {
            id: {
              in: tournamentIds,
            },
          },
          data: {
            status: 'cancelled',
          },
        });

        result.success = deleteResult.count;

        // Log audit trail
        await logBulkOperation(
          authResult.user.id,
          authResult.user.email,
          'BULK_DELETE',
          'TOURNAMENT',
          tournamentIds,
          { operation: 'soft delete (cancelled)' },
          request
        );
        break;

      case 'archive':
        // Archive: Set status to completed
        const archiveResult = await prisma.tournament.updateMany({
          where: {
            id: {
              in: tournamentIds,
            },
          },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        result.success = archiveResult.count;

        // Log audit trail
        await logBulkOperation(
          authResult.user.id,
          authResult.user.email,
          'BULK_UPDATE',
          'TOURNAMENT',
          tournamentIds,
          { operation: 'archive', newStatus: 'completed' },
          request
        );
        break;

      case 'changeStatus':
        if (!newStatus) {
          return NextResponse.json(
            {
              error: {
                code: 'MISSING_STATUS',
                message: 'newStatus is required for changeStatus operation',
              },
            },
            { status: 400 }
          );
        }

        const statusResult = await prisma.tournament.updateMany({
          where: {
            id: {
              in: tournamentIds,
            },
          },
          data: {
            status: newStatus,
          },
        });

        result.success = statusResult.count;

        // Log audit trail
        await logBulkOperation(
          authResult.user.id,
          authResult.user.email,
          'BULK_UPDATE',
          'TOURNAMENT',
          tournamentIds,
          { operation: 'changeStatus', newStatus },
          request
        );
        break;
    }

    return NextResponse.json(
      {
        success: true,
        operation,
        result: {
          processed: tournamentIds.length,
          successful: result.success,
          failed: result.failed,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk operation',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
