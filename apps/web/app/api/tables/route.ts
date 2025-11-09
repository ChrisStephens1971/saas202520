/**
 * Table Resource Management API
 * Sprint 2
 *
 * CRUD endpoints for managing table resources in tournaments
 * All endpoints require authentication and enforce tenant isolation
 *
 * Routes:
 * - GET /api/tables?tournamentId=xxx - List all tables for a tournament
 * - POST /api/tables - Create a new table
 * - POST /api/tables/bulk - Create multiple tables at once
 * - GET /api/tables/availability?tournamentId=xxx - Get table availability status
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  createTable,
  createTablesBulk,
  getAllTables,
  getAvailableTables,
} from '@/lib/tournament/table-manager';
import type {
  TableListResponse,
  TableAvailabilityResponse,
} from '@/lib/tournament/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateTableSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
});

const CreateTablesBulkSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  labels: z
    .array(z.string().min(1).max(100))
    .min(1, 'At least one label required')
    .max(50, 'Maximum 50 tables at once'),
});

// ============================================================================
// GET /api/tables
// ============================================================================

/**
 * List all tables for a tournament
 *
 * Query Parameters:
 * - tournamentId: string (required)
 *
 * @returns {TableListResponse} List of tables
 */
export async function GET(request: NextRequest) {
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

    // Get organization context from headers
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

    // Get tournament ID from query params
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

    // Get all tables for the tournament
    const tables = await getAllTables(tournamentId, orgId);

    const response: TableListResponse = {
      tables,
      count: tables.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching tables:', error);

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
          message: 'Failed to fetch tables',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/tables
// ============================================================================

/**
 * Create a new table resource
 *
 * Request Body:
 * - tournamentId: string
 * - label: string (e.g., "Table 1", "Back Corner")
 *
 * @returns {TableResource} Created table
 */
export async function POST(request: NextRequest) {
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
            message: 'Only organization owners and TDs can create tables',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();

    // Check if this is a bulk create request
    if ('labels' in body && Array.isArray(body.labels)) {
      const validation = CreateTablesBulkSchema.safeParse(body);

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

      const { tournamentId, labels } = validation.data;

      // Create tables in bulk
      const tables = await createTablesBulk(tournamentId, labels, orgId);

      const response: TableListResponse = {
        tables,
        count: tables.length,
      };

      return NextResponse.json(response, { status: 201 });
    } else {
      // Single table creation
      const validation = CreateTableSchema.safeParse(body);

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

      const { tournamentId, label } = validation.data;

      // Create table
      const table = await createTable(tournamentId, label, orgId);

      return NextResponse.json(table, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating table:', error);

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

      if (error.message.includes('already exists')) {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_LABEL',
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
          message: 'Failed to create table',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for dynamic routes
export const dynamic = 'force-dynamic';
