/**
 * Permissions and Authorization Helper (SCORE-007)
 * Role-based access control for tournament operations
 */

import { prisma } from '@/lib/prisma';

export type UserRole = 'owner' | 'td' | 'scorekeeper' | 'streamer';

export interface PermissionCheck {
  userId: string;
  orgId: string;
  requiredRoles: UserRole[];
}

/**
 * Check if user has required role in organization
 */
export async function hasRole(check: PermissionCheck): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId: check.userId,
      orgId: check.orgId,
      role: {
        in: check.requiredRoles,
      },
    },
  });

  return member !== null;
}

/**
 * Get user's role in organization
 */
export async function getUserRole(userId: string, orgId: string): Promise<UserRole | null> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      userId,
      orgId,
    },
  });

  return member ? (member.role as UserRole) : null;
}

/**
 * Check if user can score matches (scorekeepers, TDs, and owners)
 */
export async function canScoreMatches(userId: string, orgId: string): Promise<boolean> {
  return await hasRole({
    userId,
    orgId,
    requiredRoles: ['owner', 'td', 'scorekeeper'],
  });
}

/**
 * Check if user can manage payments (TDs and owners only)
 */
export async function canManagePayments(userId: string, orgId: string): Promise<boolean> {
  return await hasRole({
    userId,
    orgId,
    requiredRoles: ['owner', 'td'],
  });
}

/**
 * Check if user can manage tournament settings (TDs and owners only)
 */
export async function canManageTournament(userId: string, orgId: string): Promise<boolean> {
  return await hasRole({
    userId,
    orgId,
    requiredRoles: ['owner', 'td'],
  });
}

/**
 * Check if user is organization owner
 */
export async function isOwner(userId: string, orgId: string): Promise<boolean> {
  return await hasRole({
    userId,
    orgId,
    requiredRoles: ['owner'],
  });
}

/**
 * Assign scorekeeper role to user
 */
export async function assignScorekeeperRole(
  userId: string,
  orgId: string,
  assignedBy: string
): Promise<void> {
  // Verify assignedBy is owner or TD
  const canAssign = await canManageTournament(assignedBy, orgId);
  if (!canAssign) {
    throw new Error('Only owners and TDs can assign scorekeeper roles');
  }

  // Check if user is already a member
  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId, orgId },
  });

  if (existingMember) {
    // Update role if member exists
    await prisma.organizationMember.update({
      where: { id: existingMember.id },
      data: { role: 'scorekeeper' },
    });
  } else {
    // Create new member with scorekeeper role
    await prisma.organizationMember.create({
      data: {
        userId,
        orgId,
        role: 'scorekeeper',
      },
    });
  }
}

/**
 * Remove scorekeeper role from user
 */
export async function removeScorekeeperRole(
  userId: string,
  orgId: string,
  removedBy: string
): Promise<void> {
  // Verify removedBy is owner or TD
  const canRemove = await canManageTournament(removedBy, orgId);
  if (!canRemove) {
    throw new Error('Only owners and TDs can remove scorekeeper roles');
  }

  const member = await prisma.organizationMember.findFirst({
    where: { userId, orgId, role: 'scorekeeper' },
  });

  if (member) {
    await prisma.organizationMember.delete({
      where: { id: member.id },
    });
  }
}

/**
 * Get all scorekeepers for an organization
 */
export async function getScorek eepers(orgId: string) {
  return await prisma.organizationMember.findMany({
    where: {
      orgId,
      role: 'scorekeeper',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
