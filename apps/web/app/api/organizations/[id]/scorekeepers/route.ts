/**
 * Scorekeeper Management API (SCORE-007)
 * GET /api/organizations/[id]/scorekeepers - List scorekeepers
 * POST /api/organizations/[id]/scorekeepers - Assign scorekeeper role
 * DELETE /api/organizations/[id]/scorekeepers - Remove scorekeeper role
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getScorekeepers,
  assignScorekeeperRole,
  removeScorekeeperRole,
  canManageTournament,
} from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = params.id;

    // Verify user has access to organization
    const canManage = await canManageTournament(session.user.id, orgId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be an owner or TD to view scorekeepers' },
        { status: 403 }
      );
    }

    const scorekeepers = await getScorekeepers(orgId);

    return NextResponse.json({ scorekeepers }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching scorekeepers:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = params.id;
    const body = await request.json();
    const { userId, userEmail } = body;

    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: 'Missing required field: userId or userEmail' },
        { status: 400 }
      );
    }

    // Find user if email provided
    let targetUserId = userId;
    if (!targetUserId && userEmail) {
      const { prisma } = await import('@/lib/prisma');
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found with that email' },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    // Assign scorekeeper role
    await assignScorekeeperRole(targetUserId, orgId, session.user.id);

    return NextResponse.json(
      { message: 'Scorekeeper role assigned successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error assigning scorekeeper role:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    // Remove scorekeeper role
    await removeScorekeeperRole(userId, orgId, session.user.id);

    return NextResponse.json(
      { message: 'Scorekeeper role removed successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error removing scorekeeper role:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
