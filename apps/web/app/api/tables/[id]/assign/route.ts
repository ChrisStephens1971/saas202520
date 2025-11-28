/**
 * Table Assignment API
 * Sprint 2
 *
 * Endpoint for assigning matches to tables with conflict checking
 *
 * Routes:
 * - POST /api/tables/:id/assign - Assign a match to a table
 * - DELETE /api/tables/:id/assign - Release a table (unassign current match)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  assignMatchToTable,
  releaseTable,
  checkTableAvailability,
} from '@/lib/tournament/table-manager';
import type { TableAssignmentResponse } from '@/lib/tournament/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AssignTableSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  checkOnly: z.boolean().optional(), // For conflict checking without assignment
});

// ============================================================================
// POST /api/tables/:id/assign
// ============================================================================

/**
 * Assign a match to a table
 *
 * Request Body:
 * - matchId: string
 * - checkOnly?: boolean (if true, only checks for conflicts without assigning)
 *
 * @param {string} id - Table ID
 * @returns {TableAssignmentResponse} Assignment result
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get organization context and role
    const headersList = await headers();
    const orgId = headersList.get('x-org-id');
    const userRole = headersList.get('x-user-role');

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

    // Check permissions (owner, td, or scorekeeper)
    if (!['owner', 'td', 'scorekeeper'].includes(userRole || '')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners, TDs, and scorekeepers can assign tables',
          },
        },
        { status: 403 }
      );
    }

    const { id: tableId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = AssignTableSchema.safeParse(body);

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

    const { matchId, checkOnly } = validation.data;

    // If checkOnly, just check for conflicts
    if (checkOnly) {
      const result = await checkTableAvailability(tableId, matchId, orgId);
      return NextResponse.json(result, { status: 200 });
    }

    // Assign the match to the table
    const assignment = await assignMatchToTable(matchId, tableId, orgId);

    const response: TableAssignmentResponse = {
      assignment,
      success: true,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error assigning table:', error);

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

      // Table conflict errors
      if (
        error.message.includes('already assigned') ||
        error.message.includes('blocked') ||
        error.message.includes('maintenance')
      ) {
        return NextResponse.json(
          {
            error: {
              code: 'TABLE_CONFLICT',
              message: error.message,
            },
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to assign table',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/tables/:id/assign
// ============================================================================

/**
 * Release a table (unassign current match)
 *
 * @param {string} id - Table ID
 * @returns {TableResource} Updated table (now available)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get organization context and role
    const headersList = await headers();
    const orgId = headersList.get('x-org-id');
    const userRole = headersList.get('x-user-role');

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

    // Check permissions (owner, td, or scorekeeper)
    if (!['owner', 'td', 'scorekeeper'].includes(userRole || '')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners, TDs, and scorekeepers can release tables',
          },
        },
        { status: 403 }
      );
    }

    const { id: tableId } = await params;

    // Release the table
    const table = await releaseTable(tableId, orgId);

    return NextResponse.json(table, { status: 200 });
  } catch (error) {
    console.error('Error releasing table:', error);

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
          message: 'Failed to release table',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
