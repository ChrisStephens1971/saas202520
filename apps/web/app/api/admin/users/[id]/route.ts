/**
 * Admin User Detail API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Admin endpoints for individual user management.
 *
 * Routes:
 * - GET /api/admin/users/:id - Get user details with full history
 * - PATCH /api/admin/users/:id - Update user (role, status, permissions)
 * - DELETE /api/admin/users/:id - Soft delete user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';
import { logUserUpdated, logAdminAction } from '@/lib/audit/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['owner', 'admin', 'td', 'scorekeeper', 'streamer']).optional(),
  orgId: z.string().optional(), // For updating role in specific org
});

// ============================================================================
// GET /api/admin/users/:id
// ============================================================================

/**
 * Get user details with full history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch user with detailed information
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organizationMembers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        accounts: {
          select: {
            provider: true,
            type: true,
            createdAt: true,
          },
        },
        sessions: {
          select: {
            id: true,
            expires: true,
          },
          orderBy: {
            expires: 'desc',
          },
          take: 5, // Show 5 most recent sessions
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Get user activity statistics
    const tournamentsCreated = await prisma.tournament.count({
      where: {
        createdBy: id,
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          organizations: user.organizationMembers.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
            joinedAt: m.createdAt.toISOString(),
          })),
          accounts: user.accounts.map((a) => ({
            provider: a.provider,
            type: a.type,
          })),
          recentSessions: user.sessions.map((s) => ({
            id: s.id,
            expires: s.expires.toISOString(),
          })),
          statistics: {
            tournamentsCreated,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/admin/users/:id
// ============================================================================

/**
 * Update user (admin override)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        organizationMembers: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateUserSchema.safeParse(body);

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

    const data = validation.data;

    // If email is being changed, check uniqueness
    if (data.email && data.email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailTaken) {
        return NextResponse.json(
          {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email is already in use by another user',
            },
          },
          { status: 409 }
        );
      }
    }

    // Update user basic info
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
      },
      include: {
        organizationMembers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Update role in specific organization if requested
    if (data.role && data.orgId) {
      const membership = existingUser.organizationMembers.find(
        (m) => m.orgId === data.orgId
      );

      if (membership) {
        await prisma.organizationMember.update({
          where: { id: membership.id },
          data: { role: data.role },
        });
      }
    }

    // Log audit trail
    await logUserUpdated(
      authResult.user.id,
      authResult.user.email,
      id,
      {
        name: existingUser.name,
        email: existingUser.email,
      },
      {
        name: updated.name,
        email: updated.email,
        ...(data.role && { role: data.role }),
      },
      request
    );

    return NextResponse.json(
      {
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          emailVerified: updated.emailVerified?.toISOString() ?? null,
          organizations: updated.organizationMembers.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          })),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/admin/users/:id
// ============================================================================

/**
 * Soft delete user account
 * Removes all organization memberships and marks email as deleted
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch existing user
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organizationMembers: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Soft delete: Anonymize user data
    await prisma.user.update({
      where: { id },
      data: {
        name: 'Deleted User',
        email: `deleted_${id}@deleted.local`,
        password: null,
        image: null,
        emailVerified: null,
      },
    });

    // Remove all organization memberships
    await prisma.organizationMember.deleteMany({
      where: { userId: id },
    });

    // Delete all sessions
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    // Log audit trail
    await logAdminAction({
      userId: authResult.user.id,
      userEmail: authResult.user.email,
      action: 'DELETE',
      resource: 'USER',
      resourceId: id,
      changes: {
        old: {
          name: user.name,
          email: user.email,
          organizationCount: user.organizationMembers.length,
        },
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
