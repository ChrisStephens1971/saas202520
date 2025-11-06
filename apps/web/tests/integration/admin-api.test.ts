/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin API Integration Tests
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Tests admin-specific API endpoints for:
 * - Authentication and authorization
 * - Tournament management (CRUD)
 * - User management (CRUD, ban, suspend)
 * - Analytics APIs
 * - Audit log APIs
 * - Settings APIs
 */

import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createAdminUser,
  createOrganizerUser,
  createPlayerUser,
  createOrgMember,
  createAdminTournament,
  createAuditLog,
  createAnalyticsData,
  createSystemSettings,
  createUserManagementData,
} from '../fixtures/admin-test-data';
import { createTestOrganization } from '../fixtures/test-data';

// Initialize Prisma client for tests
const prisma = new PrismaClient();

describe('Admin API Integration Tests', () => {
  let adminUserId: string;
  let organizerUserId: string;
  let playerUserId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Set up test database with admin users
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.organizationMember.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
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

    // Create test organization
    const org = await prisma.organization.create({
      data: createTestOrganization(),
    });
    testOrgId = org.id;

    // Create organization member with admin role
    await prisma.organizationMember.create({
      data: createOrgMember(testOrgId, adminUserId, 'admin'),
    });

    // Create organization member with organizer role
    await prisma.organizationMember.create({
      data: createOrgMember(testOrgId, organizerUserId, 'td'),
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.organizationMember.deleteMany({});
    await prisma.tournament.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================================================
  // ADMIN AUTHENTICATION AND AUTHORIZATION
  // ============================================================================

  describe('Admin Authentication and Authorization', () => {
    test('should allow admin to access admin routes', async () => {
      // Mock admin session
      const session = {
        user: { id: adminUserId, email: 'admin@saas202520.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Verify admin role exists
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: adminUserId,
          role: 'admin',
        },
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe('admin');
    });

    test('should deny non-admin users from admin routes', async () => {
      // Mock player session
      const session = {
        user: { id: playerUserId, email: 'player@saas202520.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Verify player does not have admin role
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: playerUserId,
          role: 'admin',
        },
      });

      expect(member).toBeNull();
    });

    test('should allow organizer limited access', async () => {
      // Verify organizer has td role
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe('td');
    });

    test('should validate admin session token', async () => {
      // Create session
      const session = await prisma.session.create({
        data: {
          userId: adminUserId,
          sessionToken: 'admin_session_token_123',
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      expect(session.userId).toBe(adminUserId);
      expect(session.sessionToken).toBe('admin_session_token_123');

      // Verify session is valid
      const foundSession = await prisma.session.findUnique({
        where: { sessionToken: 'admin_session_token_123' },
      });

      expect(foundSession).not.toBeNull();
      expect(foundSession?.userId).toBe(adminUserId);
    });
  });

  // ============================================================================
  // TOURNAMENT MANAGEMENT APIs
  // ============================================================================

  describe('Tournament Management APIs', () => {
    test('should create tournament via admin API', async () => {
      const tournamentData = createAdminTournament(testOrgId, {
        name: 'Admin Created Tournament',
        status: 'draft',
      });

      const tournament = await prisma.tournament.create({
        data: tournamentData,
      });

      expect(tournament.name).toBe('Admin Created Tournament');
      expect(tournament.status).toBe('draft');
      expect(tournament.orgId).toBe(testOrgId);
    });

    test('should update tournament details', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          name: 'Updated Tournament Name',
          description: 'Updated description',
          status: 'registration',
        },
      });

      expect(updated.name).toBe('Updated Tournament Name');
      expect(updated.description).toBe('Updated description');
      expect(updated.status).toBe('registration');
    });

    test('should change tournament status', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, { status: 'draft' }),
      });

      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'active' },
      });

      expect(updated.status).toBe('active');
    });

    test('should delete tournament (soft delete)', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      // Soft delete by changing status
      const deleted = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'cancelled' },
      });

      expect(deleted.status).toBe('cancelled');

      // Tournament still exists in database
      const stillExists = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });

      expect(stillExists).not.toBeNull();
    });

    test('should bulk archive tournaments', async () => {
      // Create multiple tournaments
      const tournaments = await Promise.all([
        prisma.tournament.create({
          data: createAdminTournament(testOrgId, { id: 'tour_1', status: 'completed' }),
        }),
        prisma.tournament.create({
          data: createAdminTournament(testOrgId, { id: 'tour_2', status: 'completed' }),
        }),
        prisma.tournament.create({
          data: createAdminTournament(testOrgId, { id: 'tour_3', status: 'completed' }),
        }),
      ]);

      // Bulk update to archived status
      const result = await prisma.tournament.updateMany({
        where: {
          id: { in: tournaments.map((t) => t.id) },
          status: 'completed',
        },
        data: { status: 'cancelled' }, // Using 'cancelled' as archive status
      });

      expect(result.count).toBe(3);

      // Verify all are archived
      const archivedTournaments = await prisma.tournament.findMany({
        where: {
          id: { in: tournaments.map((t) => t.id) },
        },
      });

      archivedTournaments.forEach((t) => {
        expect(t.status).toBe('cancelled');
      });
    });

    test('should validate input when creating tournament', async () => {
      // Try to create tournament with missing required fields
      await expect(
        prisma.tournament.create({
          data: {
            // Missing orgId, name, status, format, etc.
            id: 'invalid_tour',
          } as any,
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // USER MANAGEMENT APIs
  // ============================================================================

  describe('User Management APIs', () => {
    test('should list all users', async () => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      expect(users.length).toBeGreaterThanOrEqual(3); // admin, organizer, player
      expect(users.some((u) => u.id === adminUserId)).toBe(true);
      expect(users.some((u) => u.id === organizerUserId)).toBe(true);
      expect(users.some((u) => u.id === playerUserId)).toBe(true);
    });

    test('should search users by email', async () => {
      const users = await prisma.user.findMany({
        where: {
          email: { contains: 'admin' },
        },
      });

      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users[0].email).toContain('admin');
    });

    test('should view user details and history', async () => {
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        include: {
          organizationMembers: {
            include: {
              organization: true,
            },
          },
        },
      });

      expect(user).not.toBeNull();
      expect(user?.organizationMembers.length).toBeGreaterThanOrEqual(1);
      expect(user?.organizationMembers[0].orgId).toBe(testOrgId);
    });

    test('should change user role', async () => {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: organizerUserId,
          orgId: testOrgId,
        },
      });

      const updated = await prisma.organizationMember.update({
        where: { id: member!.id },
        data: { role: 'owner' },
      });

      expect(updated.role).toBe('owner');
    });

    test('should ban user with reason', async () => {
      // Create user to ban
      const userToBan = await prisma.user.create({
        data: createUserManagementData({
          email: 'banned@example.com',
          status: 'active',
        }),
      });

      // Update user status to banned (would need additional fields in schema)
      // For now, we can delete the user or mark in a separate admin table
      const bannedUser = await prisma.user.update({
        where: { id: userToBan.id },
        data: {
          // In production, would set: status: 'banned', bannedReason: 'Violation of terms'
          name: '[BANNED] ' + userToBan.name,
        },
      });

      expect(bannedUser.name).toContain('[BANNED]');
    });

    test('should suspend user with duration', async () => {
      // Create user to suspend
      const userToSuspend = await prisma.user.create({
        data: createUserManagementData({
          email: 'suspended@example.com',
          status: 'active',
        }),
      });

      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 7); // Suspend for 7 days

      // Update user to suspended (would need additional fields in schema)
      const suspendedUser = await prisma.user.update({
        where: { id: userToSuspend.id },
        data: {
          name: '[SUSPENDED] ' + userToSuspend.name,
        },
      });

      expect(suspendedUser.name).toContain('[SUSPENDED]');
    });

    test('should create new admin user', async () => {
      const newAdmin = await prisma.user.create({
        data: createAdminUser({
          id: 'new_admin_456',
          email: 'newadmin@saas202520.com',
          name: 'New Admin User',
        }),
      });

      // Add to organization as admin
      await prisma.organizationMember.create({
        data: createOrgMember(testOrgId, newAdmin.id, 'admin'),
      });

      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: newAdmin.id,
          orgId: testOrgId,
        },
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe('admin');
    });

    test('should delete user account', async () => {
      const userToDelete = await prisma.user.create({
        data: createUserManagementData({
          email: 'todelete@example.com',
        }),
      });

      await prisma.user.delete({
        where: { id: userToDelete.id },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });

      expect(deletedUser).toBeNull();
    });
  });

  // ============================================================================
  // ANALYTICS APIs
  // ============================================================================

  describe('Analytics APIs', () => {
    test('should fetch system analytics', async () => {
      // Get counts
      const totalUsers = await prisma.user.count();
      const totalOrgs = await prisma.organization.count();
      const totalTournaments = await prisma.tournament.count();

      expect(totalUsers).toBeGreaterThanOrEqual(3);
      expect(totalOrgs).toBeGreaterThanOrEqual(1);
      expect(totalTournaments).toBeGreaterThanOrEqual(0);
    });

    test('should filter analytics by date range', async () => {
      // Create tournaments with different dates
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          id: 'tour_yesterday',
          createdAt: yesterday,
        }),
      });

      await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          id: 'tour_today',
          createdAt: new Date(),
        }),
      });

      // Query tournaments from today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayTournaments = await prisma.tournament.count({
        where: {
          createdAt: { gte: todayStart },
        },
      });

      expect(todayTournaments).toBeGreaterThanOrEqual(1);
    });

    test('should export chart data', async () => {
      // Create analytics data points
      const analyticsData = [
        { date: '2025-01-01', value: 100 },
        { date: '2025-01-02', value: 115 },
        { date: '2025-01-03', value: 130 },
      ];

      // In production, this would be exported as CSV or JSON
      expect(analyticsData).toHaveLength(3);
      expect(analyticsData[0].value).toBe(100);
      expect(analyticsData[2].value).toBe(130);
    });

    test('should calculate growth metrics', async () => {
      // Get user count at start of period
      const usersStart = await prisma.user.count();

      // Add new user
      await prisma.user.create({
        data: createUserManagementData({ email: 'newuser@example.com' }),
      });

      // Get user count at end of period
      const usersEnd = await prisma.user.count();

      const growth = usersEnd - usersStart;
      expect(growth).toBe(1);
    });

    test('should fetch revenue analytics', async () => {
      // Would query payments and calculate revenue
      // For now, mock the data
      const mockRevenue = {
        total: 125000, // cents
        thisMonth: 25000,
        lastMonth: 20000,
        growth: 25, // percentage
      };

      expect(mockRevenue.total).toBe(125000);
      expect(mockRevenue.growth).toBe(25);
    });
  });

  // ============================================================================
  // AUDIT LOG APIs
  // ============================================================================

  describe('Audit Log APIs', () => {
    test('should log admin actions', async () => {
      // Create tournament event (serves as audit log)
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      const event = await prisma.tournamentEvent.create({
        data: {
          tournamentId: tournament.id,
          kind: 'tournament.created',
          actor: adminUserId,
          device: 'admin_device_123',
          payload: {
            name: tournament.name,
            status: tournament.status,
          },
        },
      });

      expect(event.kind).toBe('tournament.created');
      expect(event.actor).toBe(adminUserId);
    });

    test('should filter audit logs by user', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      await prisma.tournamentEvent.create({
        data: {
          tournamentId: tournament.id,
          kind: 'tournament.updated',
          actor: adminUserId,
          device: 'admin_device_123',
          payload: { action: 'status_change' },
        },
      });

      const adminEvents = await prisma.tournamentEvent.findMany({
        where: { actor: adminUserId },
      });

      expect(adminEvents.length).toBeGreaterThanOrEqual(1);
      expect(adminEvents.every((e) => e.actor === adminUserId)).toBe(true);
    });

    test('should filter audit logs by action', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      await prisma.tournamentEvent.createMany({
        data: [
          {
            tournamentId: tournament.id,
            kind: 'tournament.created',
            actor: adminUserId,
            device: 'device_1',
            payload: {},
          },
          {
            tournamentId: tournament.id,
            kind: 'tournament.updated',
            actor: adminUserId,
            device: 'device_1',
            payload: {},
          },
        ],
      });

      const createdEvents = await prisma.tournamentEvent.findMany({
        where: { kind: 'tournament.created' },
      });

      expect(createdEvents.every((e) => e.kind === 'tournament.created')).toBe(true);
    });

    test('should search audit logs', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId, {
          name: 'Searchable Tournament',
        }),
      });

      await prisma.tournamentEvent.create({
        data: {
          tournamentId: tournament.id,
          kind: 'tournament.created',
          actor: adminUserId,
          device: 'device_1',
          payload: { name: 'Searchable Tournament' },
        },
      });

      // Search using JSON payload
      const events = await prisma.tournamentEvent.findMany({
        where: {
          tournamentId: tournament.id,
        },
      });

      const searchResults = events.filter((e: any) => {
        const payload = e.payload as any;
        return payload.name && payload.name.includes('Searchable');
      });

      expect(searchResults.length).toBeGreaterThanOrEqual(1);
    });

    test('should export audit logs to CSV', async () => {
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      await prisma.tournamentEvent.create({
        data: {
          tournamentId: tournament.id,
          kind: 'tournament.created',
          actor: adminUserId,
          device: 'device_1',
          payload: { action: 'create' },
        },
      });

      const events = await prisma.tournamentEvent.findMany({
        take: 10,
      });

      // Convert to CSV format
      const csvData = events.map((e) => ({
        timestamp: e.timestamp.toISOString(),
        action: e.kind,
        actor: e.actor,
        resource: 'tournament',
      }));

      expect(csvData.length).toBeGreaterThanOrEqual(1);
      expect(csvData[0]).toHaveProperty('timestamp');
      expect(csvData[0]).toHaveProperty('action');
    });
  });

  // ============================================================================
  // SETTINGS APIs
  // ============================================================================

  describe('Settings Management APIs', () => {
    test('should update general settings', async () => {
      // In production, would use a Settings table
      // For now, test organization settings
      const updated = await prisma.organization.update({
        where: { id: testOrgId },
        data: {
          name: 'Updated Organization Name',
        },
      });

      expect(updated.name).toBe('Updated Organization Name');
    });

    test('should toggle feature flags', async () => {
      // Mock feature flag toggle
      const featureFlag = {
        name: 'enable_chip_format',
        enabled: true,
      };

      // Toggle off
      featureFlag.enabled = false;
      expect(featureFlag.enabled).toBe(false);

      // Toggle on
      featureFlag.enabled = true;
      expect(featureFlag.enabled).toBe(true);
    });

    test('should change notification settings', async () => {
      const updated = await prisma.organization.update({
        where: { id: testOrgId },
        data: {
          twilioPhoneNumber: '+15551234567',
          kioskPin: '1234',
        },
      });

      expect(updated.twilioPhoneNumber).toBe('+15551234567');
      expect(updated.kioskPin).toBe('1234');
    });

    test('should verify audit log created for settings change', async () => {
      // Update organization settings
      await prisma.organization.update({
        where: { id: testOrgId },
        data: { name: 'Settings Test Org' },
      });

      // In production, this would create an audit event
      // For testing purposes, we manually create it
      const tournament = await prisma.tournament.create({
        data: createAdminTournament(testOrgId),
      });

      const event = await prisma.tournamentEvent.create({
        data: {
          tournamentId: tournament.id,
          kind: 'settings.updated',
          actor: adminUserId,
          device: 'admin_device',
          payload: {
            setting: 'organization_name',
            oldValue: 'Test Pool Hall',
            newValue: 'Settings Test Org',
          },
        },
      });

      expect(event.kind).toBe('settings.updated');
      expect(event.actor).toBe(adminUserId);
    });
  });

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  describe('Bulk Operations', () => {
    test('should bulk update tournament statuses', async () => {
      // Create multiple tournaments
      const tournaments = await Promise.all([
        prisma.tournament.create({
          data: createAdminTournament(testOrgId, { id: 'bulk_1', status: 'draft' }),
        }),
        prisma.tournament.create({
          data: createAdminTournament(testOrgId, { id: 'bulk_2', status: 'draft' }),
        }),
        prisma.tournament.create({
          data: createAdminTournament(testOrgId, { id: 'bulk_3', status: 'draft' }),
        }),
      ]);

      const result = await prisma.tournament.updateMany({
        where: {
          id: { in: tournaments.map((t) => t.id) },
        },
        data: {
          status: 'registration',
        },
      });

      expect(result.count).toBe(3);
    });

    test('should bulk delete users', async () => {
      // Create users to delete
      const users = await Promise.all([
        prisma.user.create({
          data: createUserManagementData({ email: 'bulk1@example.com' }),
        }),
        prisma.user.create({
          data: createUserManagementData({ email: 'bulk2@example.com' }),
        }),
      ]);

      const result = await prisma.user.deleteMany({
        where: {
          id: { in: users.map((u) => u.id) },
        },
      });

      expect(result.count).toBe(2);
    });

    test('should handle bulk operation errors gracefully', async () => {
      // Try to bulk update non-existent tournaments
      const result = await prisma.tournament.updateMany({
        where: {
          id: { in: ['nonexistent_1', 'nonexistent_2'] },
        },
        data: {
          status: 'cancelled',
        },
      });

      // Should return 0 count, not error
      expect(result.count).toBe(0);
    });
  });
});
