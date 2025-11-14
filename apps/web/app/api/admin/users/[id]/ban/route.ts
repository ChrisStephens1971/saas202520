/**
 * Admin User Ban API
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Endpoint for banning users.
 *
 * Routes:
 * - POST /api/admin/users/:id/ban - Ban user permanently
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import { prisma } from '@tournament/shared';
import { logUserBanned } from '@/lib/audit/logger';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const BanUserSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ============================================================================
// POST /api/admin/users/:id/ban
// ============================================================================

/**
 * Ban user permanently
 * Removes all organization memberships and invalidates all sessions
 */
export async function POST(
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

    // Parse and validate request body
    const body = await request.json();
    const validation = BanUserSchema.safeParse(body);

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

    const { reason } = validation.data;

    // Fetch existing user
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organizationMembers: {
          select: {
            orgId: true,
          },
          take: 1,
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

    // Get orgId from first organization membership
    const orgId = user.organizationMembers[0]?.orgId || 'system';

    // Ban user: Update email to mark as banned and prevent login
    await prisma.user.update({
      where: { id },
      data: {
        email: `banned_${id}@banned.local`,
        password: null, // Remove password to prevent login
      },
    });

    // Remove all organization memberships
    await prisma.organizationMember.deleteMany({
      where: { userId: id },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    // Log audit trail
    await logUserBanned(
      orgId,
      authResult.user.id,
      authResult.user.email,
      id,
      reason,
      request
    );

    return NextResponse.json(
      {
        success: true,
        message: 'User has been banned',
        userId: id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error banning user:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to ban user',
        },
      },
      { status: 500 }
    );
  }
}

// Disable static optimization
export const dynamic = 'force-dynamic';
