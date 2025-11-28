/**
 * Individual Table API
 * Sprint 2
 *
 * Operations on individual table resources
 *
 * Routes:
 * - GET /api/tables/:id - Get table details
 * - PUT /api/tables/:id - Update table status or block/unblock
 * - DELETE /api/tables/:id - Delete table
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  updateTableStatus,
  blockTableUntil,
  unblockTable,
  deleteTable,
  getAllTables,
} from '@/lib/tournament/table-manager';
import type { TableStatus } from '@/lib/tournament/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateTableSchema = z.object({
  status: z.enum(['available', 'in_use', 'maintenance']).optional(),
  blockedUntil: z.string().datetime().optional(),
  unblock: z.boolean().optional(),
});

// ============================================================================
// GET /api/tables/:id
// ============================================================================

/**
 * Get a specific table by ID
 *
 * @param {string} id - Table ID
 * @returns {TableResource} Table details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get organization context
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

    const { id } = await params;

    // Get the table's tournament and then get all tables to find this one
    // This ensures tenant isolation
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

    const tables = await getAllTables(tournamentId, orgId);
    const table = tables.find((t) => t.id === id);

    if (!table) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Table not found or access denied',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(table, { status: 200 });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch table',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/tables/:id
// ============================================================================

/**
 * Update a table's status or block/unblock it
 *
 * Request Body:
 * - status?: 'available' | 'in_use' | 'maintenance'
 * - blockedUntil?: ISO datetime string (blocks table until this time)
 * - unblock?: boolean (unblocks table and sets to available)
 *
 * @param {string} id - Table ID
 * @returns {TableResource} Updated table
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check permissions (owner or td)
    if (userRole !== 'owner' && userRole !== 'td') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners and TDs can update tables',
          },
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTableSchema.safeParse(body);

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

    const { status, blockedUntil, unblock } = validation.data;

    // Handle unblock operation
    if (unblock) {
      const table = await unblockTable(id, orgId);
      return NextResponse.json(table, { status: 200 });
    }

    // Handle block operation
    if (blockedUntil) {
      const table = await blockTableUntil(id, new Date(blockedUntil), orgId);
      return NextResponse.json(table, { status: 200 });
    }

    // Handle status update
    if (status) {
      const table = await updateTableStatus(id, status as TableStatus, orgId);
      return NextResponse.json(table, { status: 200 });
    }

    return NextResponse.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Must provide status, blockedUntil, or unblock',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating table:', error);

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
          message: 'Failed to update table',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/tables/:id
// ============================================================================

/**
 * Delete a table
 * Only allowed if table is not currently in use
 *
 * @param {string} id - Table ID
 * @returns {Response} 204 No Content on success
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

    // Check permissions (owner only)
    if (userRole !== 'owner') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only organization owners can delete tables',
          },
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    await deleteTable(id, orgId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting table:', error);

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

      if (error.message.includes('in use')) {
        return NextResponse.json(
          {
            error: {
              code: 'TABLE_IN_USE',
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
          message: 'Failed to delete table',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
