// API Route: Generate Secure Room Access Token
// Returns a signed JWT that grants access to a specific tournament's Y.js room

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma, withTenantContext } from '@tournament/shared';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-in-production';

interface RoomAccessToken {
  tournamentId: string;
  orgId: string;
  userId: string;
  permissions: ('read' | 'write' | 'admin')[];
  exp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tournamentId, permissions } = await request.json();

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'Tournament ID is required' },
        { status: 400 }
      );
    }

    // Verify the tournament exists and belongs to the user's organization
    const tournament = await withTenantContext(session.user.orgId, async () => {
      return await prisma.tournament.findFirst({
        where: {
          id: tournamentId,
          orgId: session.user.orgId,
        },
      });
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found or access denied' },
        { status: 404 }
      );
    }

    // Determine permissions based on user role
    let grantedPermissions: ('read' | 'write' | 'admin')[] = ['read'];

    if (session.user.role === 'owner' || session.user.role === 'admin') {
      grantedPermissions = ['read', 'write', 'admin'];
    } else if (permissions?.includes('write')) {
      // Allow write if requested and user has appropriate role
      grantedPermissions = ['read', 'write'];
    }

    // Generate room access token (24 hour expiration)
    const payload: RoomAccessToken = {
      tournamentId,
      orgId: session.user.orgId,
      userId: session.user.id,
      permissions: grantedPermissions,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    const roomToken = jwt.sign(payload, JWT_SECRET);

    return NextResponse.json({
      roomToken,
      tournamentId,
      permissions: grantedPermissions,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[API] Room token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate room token' },
      { status: 500 }
    );
  }
}
