/**
 * Tenant Extraction Utility
 *
 * Provides centralized tenant context extraction for multi-tenant isolation.
 * Ensures consistent orgId validation across all API routes.
 */

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Tenant context extracted from request
 */
export interface TenantContext {
  orgId: string;
  userId: string;
  userEmail: string;
  userRole: string | null;
}

/**
 * Result of tenant extraction - either success with context or error response
 */
export type TenantExtractionResult =
  | { success: true; context: TenantContext }
  | { success: false; response: NextResponse };

/**
 * Extract tenant context from Next.js request
 *
 * Validates:
 * - User is authenticated
 * - Organization context exists (x-org-id header)
 *
 * @returns {Promise<TenantExtractionResult>} Either tenant context or error response
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const tenantResult = await extractTenantContext();
 *
 *   if (!tenantResult.success) {
 *     return tenantResult.response; // Return error response
 *   }
 *
 *   const { orgId, userId } = tenantResult.context;
 *   // ... use tenant context
 * }
 * ```
 */
export async function extractTenantContext(): Promise<TenantExtractionResult> {
  // Authenticate user
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      ),
    };
  }

  // Get organization context from headers (set by middleware)
  const headersList = await headers();
  const orgId = headersList.get('x-org-id');
  const userRole = headersList.get('x-user-role');

  if (!orgId) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'NO_ORG_CONTEXT',
            message: 'No organization selected. Please select an organization first.',
          },
        },
        { status: 400 }
      ),
    };
  }

  // Return validated tenant context
  return {
    success: true,
    context: {
      orgId,
      userId: session.user.id,
      userEmail: session.user.email || session.user.name || 'Unknown',
      userRole,
    },
  };
}

/**
 * Extract tenant context and verify user has required role
 *
 * @param {string[]} allowedRoles - Roles that are allowed (e.g., ['owner', 'td'])
 * @returns {Promise<TenantExtractionResult>} Either tenant context or error response
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const tenantResult = await extractTenantContextWithRole(['owner', 'td']);
 *
 *   if (!tenantResult.success) {
 *     return tenantResult.response;
 *   }
 *
 *   const { orgId, userId } = tenantResult.context;
 *   // User is authenticated, has org context, and has required role
 * }
 * ```
 */
export async function extractTenantContextWithRole(
  allowedRoles: string[]
): Promise<TenantExtractionResult> {
  const result = await extractTenantContext();

  if (!result.success) {
    return result;
  }

  const { userRole } = result.context;

  // Check if user has one of the allowed roles
  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
          },
        },
        { status: 403 }
      ),
    };
  }

  return result;
}
