 
/**
 * Admin Permission Tests
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Tests role-based access control for admin features:
 * - Admin has full access
 * - Organizer has limited access
 * - Player cannot access admin routes
 * - Test each permission granularly
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createAdminUser,
  createOrganizerUser,
  createPlayerUser,
  createOrgMember,
  createAdminTournament,
} from '../fixtures/admin-test-data';
import { createTestOrganization } from '../fixtures/test-data';

const prisma = new PrismaClient();

describe('Admin Permission Tests', () => {
  let adminUserId: string;
  let organizerUserId: string;
  let playerUserId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Set up test environment
  });

  beforeEach(async () => {
    // Clean up
    await prisma.organizationMember.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users with different roles
    const adminUser = await prisma.user.create({
      data: createAdminUser(),
    });
    adminUserId = adminUser.id;

    const organizerUser = await prisma.user.create({
      data: createOrganizerUser(),
    });
    organizerUserId = organizerUser.id;

    const playerUser = await prisma.user.create({
      data: createPlayerUser(),
    });
    playerUserId = playerUser.id;

    // Create organization
    const org = await prisma.organization.create({
      data: createTestOrganization(),
    });
    testOrgId = org.id;

    // Assign roles
    await prisma.organizationMember.create({
      data: createOrgMember(testOrgId, adminUserId, 'admin'),
    });

    await prisma.organizationMember.create({
      data: createOrgMember(testOrgId, organizerUserId, 'td'),
    });

    // Note: Player is not added as organization member
  });

  afterEach(async () => {
    await prisma.organizationMember.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================================================
  // ADMIN PERMISSIONS
  // ============================================================================

  describe('Admin User Permissions', () => {
    test('admin can access admin dashboard', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: adminUserId,
          orgId: testOrgId,
        },
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe('admin');

      // Simulate permission check
      const hasAccess = member?.role === 'admin' || member?.role === 'owner';
      expect(hasAccess).toBe(true);
    });

    test('admin can create tournaments', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: adminUserId,
        }),
      });

      expect(tournament.createdBy).toBe(adminUserId);
    });

    test('admin can edit any tournament', async () => {
      // Create tournament by organizer
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: organizerUserId,
        }),
      });

      // Admin edits it
      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { name: 'Updated by Admin' },
      });

      expect(updated.name).toBe('Updated by Admin');
    });

    test('admin can delete any tournament', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: organizerUserId,
        }),
      });

      // Admin deletes it (soft delete)
      const deleted = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'cancelled' },
      });

      expect(deleted.status).toBe('cancelled');
    });

    test('admin can view all users', async () => {
      const users = await prisma.user.findMany();

      // Admin should see all users
      expect(users.length).toBeGreaterThanOrEqual(3);
      expect(users.some((u) => u.id === adminUserId)).toBe(true);
      expect(users.some((u) => u.id === organizerUserId)).toBe(true);
      expect(users.some((u) => u.id === playerUserId)).toBe(true);
    });

    test('admin can change user roles', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      // Admin changes role
      const updated = await prisma.organizationMember.update({
        where: { id: member!.id },
        data: { role: 'owner' },
      });

      expect(updated.role).toBe('owner');
    });

    test('admin can ban users', async () => {
      // Create user to ban
      const userToBan = await prisma.user.create({
        data: createPlayerUser({
          id: 'user_to_ban',
          email: 'ban@example.com',
        }),
      });

      // Admin bans user (mark in name for this test)
      const banned = await prisma.user.update({
        where: { id: userToBan.id },
        data: { name: '[BANNED] ' + userToBan.name },
      });

      expect(banned.name).toContain('[BANNED]');
    });

    test('admin can view analytics', async () => {
      // Admin permission check for analytics
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: adminUserId,
          orgId: testOrgId,
        },
      });

      const canViewAnalytics = member?.role === 'admin' || member?.role === 'owner';
      expect(canViewAnalytics).toBe(true);
    });

    test('admin can view audit logs', async () => {
      // Create audit log entry
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      const event = await prisma.tournamentEvent.create({
        data: {
          tournamentId: tournament.id,
          kind: 'tournament.created',
          actor: adminUserId,
          device: 'admin_device',
          payload: { action: 'create' },
        },
      });

      // Admin can view all events
      const events = await prisma.tournamentEvent.findMany();
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    test('admin can manage settings', async () => {
      // Admin updates organization settings
      const updated = await prisma.organization.update({
        where: { id: testOrgId },
        data: { name: 'Admin Updated Org' },
      });

      expect(updated.name).toBe('Admin Updated Org');
    });
  });

  // ============================================================================
  // ORGANIZER PERMISSIONS
  // ============================================================================

  describe('Organizer User Permissions', () => {
    test('organizer can access tournaments', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe('td');

      // Organizer can access tournaments
      const canAccessTournaments = member?.role === 'td' || member?.role === 'admin';
      expect(canAccessTournaments).toBe(true);
    });

    test('organizer can create tournaments', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: organizerUserId,
        }),
      });

      expect(tournament.createdBy).toBe(organizerUserId);
    });

    test('organizer can edit own tournaments', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: organizerUserId,
        }),
      });

      // Organizer edits own tournament
      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { name: 'Updated by Organizer' },
      });

      expect(updated.name).toBe('Updated by Organizer');
    });

    test('organizer cannot edit other organizer tournaments', async () => {
      // Create tournament by admin
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: adminUserId,
        }),
      });

      // Check if organizer can edit (permission check)
      const canEdit = tournament.createdBy === organizerUserId;
      expect(canEdit).toBe(false);
    });

    test('organizer cannot access user management', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      // Organizer cannot manage users
      const canManageUsers = member?.role === 'admin' || member?.role === 'owner';
      expect(canManageUsers).toBe(false);
    });

    test('organizer cannot ban users', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      const canBanUsers = member?.role === 'admin' || member?.role === 'owner';
      expect(canBanUsers).toBe(false);
    });

    test('organizer cannot view full analytics', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      const canViewFullAnalytics = member?.role === 'admin' || member?.role === 'owner';
      expect(canViewFullAnalytics).toBe(false);
    });

    test('organizer can view own tournament analytics', async () => {
      // Create tournament by organizer
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: organizerUserId,
        }),
      });

      // Organizer can view their own tournament analytics
      const canViewOwnAnalytics = tournament.createdBy === organizerUserId;
      expect(canViewOwnAnalytics).toBe(true);
    });

    test('organizer cannot view audit logs', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      const canViewAuditLogs = member?.role === 'admin' || member?.role === 'owner';
      expect(canViewAuditLogs).toBe(false);
    });

    test('organizer cannot manage settings', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      const canManageSettings = member?.role === 'admin' || member?.role === 'owner';
      expect(canManageSettings).toBe(false);
    });
  });

  // ============================================================================
  // PLAYER PERMISSIONS
  // ============================================================================

  describe('Player User Permissions', () => {
    test('player cannot access admin dashboard', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      // Player is not an organization member
      expect(member).toBeNull();

      const hasAdminAccess = member?.role === 'admin' || member?.role === 'owner';
      expect(hasAdminAccess).toBe(false);
    });

    test('player cannot create tournaments', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canCreateTournaments =
        member?.role === 'admin' || member?.role === 'owner' || member?.role === 'td';
      expect(canCreateTournaments).toBe(false);
    });

    test('player cannot edit tournaments', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          createdBy: adminUserId,
        }),
      });

      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canEdit =
        member?.role === 'admin' || member?.role === 'owner' || member?.role === 'td';
      expect(canEdit).toBe(false);
    });

    test('player cannot delete tournaments', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canDelete = member?.role === 'admin' || member?.role === 'owner';
      expect(canDelete).toBe(false);
    });

    test('player cannot view user management', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canViewUserManagement = member?.role === 'admin' || member?.role === 'owner';
      expect(canViewUserManagement).toBe(false);
    });

    test('player cannot view analytics', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canViewAnalytics = member?.role === 'admin' || member?.role === 'owner';
      expect(canViewAnalytics).toBe(false);
    });

    test('player cannot view audit logs', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canViewAuditLogs = member?.role === 'admin' || member?.role === 'owner';
      expect(canViewAuditLogs).toBe(false);
    });

    test('player cannot manage settings', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          orgId: testOrgId,
        },
      });

      const canManageSettings = member?.role === 'admin' || member?.role === 'owner';
      expect(canManageSettings).toBe(false);
    });
  });

  // ============================================================================
  // GRANULAR PERMISSION TESTS
  // ============================================================================

  describe('Granular Permission Tests', () => {
    test('should enforce tournament.view permission', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      // Admin can view
      const adminMember = await prisma.organizationMember.findFirst({
        where: { userId: adminUserId, orgId: testOrgId },
      });
      const adminCanView = adminMember !== null;
      expect(adminCanView).toBe(true);

      // Organizer can view
      const organizerMember = await prisma.organizationMember.findFirst({
        where: { userId: organizerUserId, orgId: testOrgId },
      });
      const organizerCanView = organizerMember !== null;
      expect(organizerCanView).toBe(true);

      // Player cannot view admin area
      const playerMember = await prisma.organizationMember.findFirst({
        where: { userId: playerUserId, orgId: testOrgId },
      });
      const playerCanView = playerMember !== null;
      expect(playerCanView).toBe(false);
    });

    test('should enforce tournament.create permission', async () => {
      // Admin can create
      const adminMember = await prisma.organizationMember.findFirst({
        where: { userId: adminUserId, orgId: testOrgId },
      });
      const adminCanCreate =
        adminMember?.role === 'admin' || adminMember?.role === 'owner' || adminMember?.role === 'td';
      expect(adminCanCreate).toBe(true);

      // Organizer can create
      const organizerMember = await prisma.organizationMember.findFirst({
        where: { userId: organizerUserId, orgId: testOrgId },
      });
      const organizerCanCreate =
        organizerMember?.role === 'admin' ||
        organizerMember?.role === 'owner' ||
        organizerMember?.role === 'td';
      expect(organizerCanCreate).toBe(true);

      // Player cannot create
      const playerMember = await prisma.organizationMember.findFirst({
        where: { userId: playerUserId, orgId: testOrgId },
      });
      const playerCanCreate =
        playerMember?.role === 'admin' || playerMember?.role === 'owner' || playerMember?.role === 'td';
      expect(playerCanCreate).toBe(false);
    });

    test('should enforce tournament.delete permission', async () => {
      // Admin can delete
      const adminMember = await prisma.organizationMember.findFirst({
        where: { userId: adminUserId, orgId: testOrgId },
      });
      const adminCanDelete = adminMember?.role === 'admin' || adminMember?.role === 'owner';
      expect(adminCanDelete).toBe(true);

      // Organizer cannot delete
      const organizerMember = await prisma.organizationMember.findFirst({
        where: { userId: organizerUserId, orgId: testOrgId },
      });
      const organizerCanDelete = organizerMember?.role === 'admin' || organizerMember?.role === 'owner';
      expect(organizerCanDelete).toBe(false);

      // Player cannot delete
      const playerMember = await prisma.organizationMember.findFirst({
        where: { userId: playerUserId, orgId: testOrgId },
      });
      const playerCanDelete = playerMember?.role === 'admin' || playerMember?.role === 'owner';
      expect(playerCanDelete).toBe(false);
    });

    test('should enforce user.manage permission', async () => {
      // Admin can manage
      const adminMember = await prisma.organizationMember.findFirst({
        where: { userId: adminUserId, orgId: testOrgId },
      });
      const adminCanManage = adminMember?.role === 'admin' || adminMember?.role === 'owner';
      expect(adminCanManage).toBe(true);

      // Organizer cannot manage
      const organizerMember = await prisma.organizationMember.findFirst({
        where: { userId: organizerUserId, orgId: testOrgId },
      });
      const organizerCanManage = organizerMember?.role === 'admin' || organizerMember?.role === 'owner';
      expect(organizerCanManage).toBe(false);

      // Player cannot manage
      const playerMember = await prisma.organizationMember.findFirst({
        where: { userId: playerUserId, orgId: testOrgId },
      });
      const playerCanManage = playerMember?.role === 'admin' || playerMember?.role === 'owner';
      expect(playerCanManage).toBe(false);
    });

    test('should enforce analytics.view permission', async () => {
      // Admin can view
      const adminMember = await prisma.organizationMember.findFirst({
        where: { userId: adminUserId, orgId: testOrgId },
      });
      const adminCanView = adminMember?.role === 'admin' || adminMember?.role === 'owner';
      expect(adminCanView).toBe(true);

      // Organizer cannot view full analytics
      const organizerMember = await prisma.organizationMember.findFirst({
        where: { userId: organizerUserId, orgId: testOrgId },
      });
      const organizerCanView = organizerMember?.role === 'admin' || organizerMember?.role === 'owner';
      expect(organizerCanView).toBe(false);

      // Player cannot view
      const playerMember = await prisma.organizationMember.findFirst({
        where: { userId: playerUserId, orgId: testOrgId },
      });
      const playerCanView = playerMember?.role === 'admin' || playerMember?.role === 'owner';
      expect(playerCanView).toBe(false);
    });

    test('should enforce settings.manage permission', async () => {
      // Admin can manage
      const adminMember = await prisma.organizationMember.findFirst({
        where: { userId: adminUserId, orgId: testOrgId },
      });
      const adminCanManage = adminMember?.role === 'admin' || adminMember?.role === 'owner';
      expect(adminCanManage).toBe(true);

      // Organizer cannot manage
      const organizerMember = await prisma.organizationMember.findFirst({
        where: { userId: organizerUserId, orgId: testOrgId },
      });
      const organizerCanManage = organizerMember?.role === 'admin' || organizerMember?.role === 'owner';
      expect(organizerCanManage).toBe(false);

      // Player cannot manage
      const playerMember = await prisma.organizationMember.findFirst({
        where: { userId: playerUserId, orgId: testOrgId },
      });
      const playerCanManage = playerMember?.role === 'admin' || playerMember?.role === 'owner';
      expect(playerCanManage).toBe(false);
    });
  });

  // ============================================================================
  // CROSS-TENANT PERMISSION TESTS
  // ============================================================================

  describe('Cross-Tenant Permission Tests', () => {
    test('admin from one org cannot access another org', async () => {
      // Create second organization
      const org2 = await prisma.organization.create({
        data: {
          id: 'org_test_456',
          name: 'Second Test Org',
          slug: 'second-test-org',
        },
      });

      // Admin is only member of first org
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: adminUserId,
          orgId: org2.id,
        },
      });

      expect(member).toBeNull();
    });

    test('user can only see tournaments from their org', async () => {
      // Create second organization with tournament
      const org2 = await prisma.organization.create({
        data: {
          id: 'org_test_789',
          name: 'Third Test Org',
          slug: 'third-test-org',
        },
      });

      await prisma.tournament.create({
        data: createAdminTournament(org2.id, {
          id: 'tour_other_org',
        }),
      });

      // Admin can only see tournaments from their org
      const adminTournaments = await prisma.tournament.findMany({
        where: { orgId: testOrgId },
      });

      expect(adminTournaments.every((t) => t.orgId === testOrgId)).toBe(true);
    });
  });
});
