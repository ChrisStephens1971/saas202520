/**
 * Admin Authentication Middleware
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Provides role-based authentication for admin-only API routes.
 * Verifies JWT token and checks for admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@tournament/shared';
import { checkAPIRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AdminAuthResult {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Verify user is authenticated and has admin role
 *
 * @param _request - Next.js request object
 * @returns AdminAuthResult with user info or error
 */
export async function verifyAdmin(_request: NextRequest): Promise<AdminAuthResult> {
  try {
    // 1. Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return {
        authorized: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in.',
          status: 401,
        },
      };
    }

    // 2. Check rate limiting (100 requests per minute per admin)
    const rateLimitResult = await checkAPIRateLimit(session.user.id);
    if (!rateLimitResult.success) {
      return {
        authorized: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds.`,
          status: 429,
        },
      };
    }

    // 3. Fetch user with organization memberships
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizationMembers: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return {
        authorized: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found.',
          status: 404,
        },
      };
    }

    // 4. Check if user has admin role in at least one organization
    const hasAdminRole = user.organizationMembers.some(
      (member) => member.role === 'admin' || member.role === 'owner'
    );

    if (!hasAdminRole) {
      return {
        authorized: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required. You do not have sufficient permissions.',
          status: 403,
        },
      };
    }

    // 5. Return authorized user
    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.organizationMembers.find((m) => m.role === 'admin' || m.role === 'owner')!
          .role,
      },
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return {
      authorized: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during authentication.',
        status: 500,
      },
    };
  }
}

// ============================================================================
// ADMIN MIDDLEWARE
// ============================================================================

/**
 * Middleware function to protect admin routes
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireAdmin(request);
 *   if (!authResult.authorized) {
 *     return authResult.response;
 *   }
 *   // Admin user is authorized, proceed with route logic
 *   const user = authResult.user;
 * }
 * ```
 */
export async function requireAdmin(
  request: NextRequest
): Promise<
  | { authorized: true; user: NonNullable<AdminAuthResult['user']> }
  | { authorized: false; response: NextResponse }
> {
  const authResult = await verifyAdmin(request);

  if (!authResult.authorized) {
    const error = authResult.error!;
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
      ),
    };
  }

  return {
    authorized: true,
    user: authResult.user!,
  };
}

// ============================================================================
// SYSTEM ADMIN CHECK
// ============================================================================

/**
 * Check if user is a system admin (owner role)
 * System admins have unrestricted access to all admin features
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizationMembers: {
        where: {
          role: 'owner',
        },
      },
    },
  });

  return (user?.organizationMembers.length ?? 0) > 0;
}

// ============================================================================
// ADMIN PERMISSION HELPERS
// ============================================================================

/**
 * Check specific admin permissions
 */
export interface AdminPermissions {
  canManageTournaments: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageOrganizations: boolean;
  canAccessAuditLogs: boolean;
}

/**
 * Get admin permissions based on role
 */
export function getAdminPermissions(role: string): AdminPermissions {
  if (role === 'owner') {
    // System admins have all permissions
    return {
      canManageTournaments: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canManageOrganizations: true,
      canAccessAuditLogs: true,
    };
  }

  if (role === 'admin') {
    // Regular admins have most permissions except org management
    return {
      canManageTournaments: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canManageOrganizations: false,
      canAccessAuditLogs: true,
    };
  }

  // Non-admin roles have no admin permissions
  return {
    canManageTournaments: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageOrganizations: false,
    canAccessAuditLogs: false,
  };
}
