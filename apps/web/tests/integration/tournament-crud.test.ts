import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@tournament/shared';
import { getOrgIdFromSession, ensureOrgAccess } from '@/lib/auth/server-auth';
import { getTournamentsForOrg } from '@/lib/data/tournaments';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

describe('Tournament CRUD Integration Tests', () => {
  const testOrgId = 'test-org-123';
  const otherOrgId = 'other-org-456';
  let createdTournamentIds: string[] = [];

  beforeEach(() => {
    // Mock successful auth with test org
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'test-user', orgId: testOrgId, role: 'owner' },
    } as any);
  });

  afterEach(async () => {
    // Cleanup: Delete test tournaments
    if (createdTournamentIds.length > 0) {
      await prisma.tournament.deleteMany({
        where: { id: { in: createdTournamentIds } },
      });
      createdTournamentIds = [];
    }
    vi.clearAllMocks();
  });

  describe('getTournamentsForOrg', () => {
    it('should fetch tournaments for the authenticated org', async () => {
      // Create test tournament
      const tournament = await prisma.tournament.create({
        data: {
          name: 'Test Tournament',
          orgId: testOrgId,
          status: 'draft',
          format: 'single_elimination',
          createdBy: 'test-user',
        },
      });
      createdTournamentIds.push(tournament.id);

      const tournaments = await getTournamentsForOrg();

      expect(tournaments).toBeDefined();
      expect(tournaments.length).toBeGreaterThan(0);
      expect(tournaments.some((t) => t.id === tournament.id)).toBe(true);
      expect(tournaments.every((t) => t.orgId === testOrgId)).toBe(true);
    });

    it('should not return tournaments from other orgs', async () => {
      // Create tournament in another org
      const otherTournament = await prisma.tournament.create({
        data: {
          name: 'Other Org Tournament',
          orgId: otherOrgId,
          status: 'draft',
          format: 'single_elimination',
          createdBy: 'other-user',
        },
      });
      createdTournamentIds.push(otherTournament.id);

      const tournaments = await getTournamentsForOrg();

      expect(tournaments.every((t) => t.orgId === testOrgId)).toBe(true);
      expect(tournaments.some((t) => t.id === otherTournament.id)).toBe(false);
    });

    it('should redirect if user has no org', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user', orgId: null },
      } as any);

      await getTournamentsForOrg();

      expect(redirect).toHaveBeenCalledWith('/login');
    });
  });

  describe('Security: ensureOrgAccess', () => {
    it('should allow access to resources in same org', async () => {
      const result = await ensureOrgAccess(testOrgId);
      expect(result).toBe(testOrgId);
    });

    it('should throw error for resources in different org', async () => {
      await expect(ensureOrgAccess(otherOrgId)).rejects.toThrow('Forbidden');
    });

    it('should throw error when trying to access another orgs tournament', async () => {
      // Create tournament in another org
      const otherTournament = await prisma.tournament.create({
        data: {
          name: 'Other Org Tournament',
          orgId: otherOrgId,
          status: 'draft',
          format: 'single_elimination',
          createdBy: 'other-user',
        },
      });
      createdTournamentIds.push(otherTournament.id);

      // Fetch tournament
      const tournament = await prisma.tournament.findUnique({
        where: { id: otherTournament.id },
      });

      // Try to ensure access - should fail
      await expect(ensureOrgAccess(tournament!.orgId)).rejects.toThrow('Forbidden');
    });
  });

  describe('Full CRUD Flow', () => {
    it('should complete full tournament lifecycle', async () => {
      // 1. CREATE
      const newTournament = await prisma.tournament.create({
        data: {
          name: 'Integration Test Tournament',
          description: 'Test tournament for integration testing',
          orgId: testOrgId,
          status: 'draft',
          format: 'double_elimination',
          createdBy: 'test-user',
        },
      });
      createdTournamentIds.push(newTournament.id);

      expect(newTournament.id).toBeDefined();
      expect(newTournament.orgId).toBe(testOrgId);
      expect(newTournament.status).toBe('draft');

      // 2. READ - List
      const tournaments = await getTournamentsForOrg();
      expect(tournaments.some((t) => t.id === newTournament.id)).toBe(true);

      // 3. READ - Single with org validation
      const fetchedTournament = await prisma.tournament.findFirst({
        where: { id: newTournament.id, orgId: testOrgId },
      });
      expect(fetchedTournament).toBeDefined();
      expect(fetchedTournament!.id).toBe(newTournament.id);

      // Validate org access
      await ensureOrgAccess(fetchedTournament!.orgId);

      // 4. UPDATE
      const updatedTournament = await prisma.tournament.update({
        where: { id: newTournament.id },
        data: { status: 'registration' },
      });
      expect(updatedTournament.status).toBe('registration');

      // 5. DELETE with org check
      const tournamentToDelete = await prisma.tournament.findFirst({
        where: { id: newTournament.id, orgId: testOrgId },
      });
      expect(tournamentToDelete).toBeDefined();

      await prisma.tournament.delete({
        where: { id: newTournament.id },
      });

      // Verify deletion
      const deletedTournament = await prisma.tournament.findUnique({
        where: { id: newTournament.id },
      });
      expect(deletedTournament).toBeNull();

      // Remove from cleanup list since we already deleted it
      createdTournamentIds = createdTournamentIds.filter((id) => id !== newTournament.id);
    });
  });

  describe('Multi-Tenant Security', () => {
    it('should prevent cross-org data access via findFirst with orgId', async () => {
      // Create tournament in another org
      const otherTournament = await prisma.tournament.create({
        data: {
          name: 'Other Org Tournament',
          orgId: otherOrgId,
          status: 'draft',
          format: 'single_elimination',
          createdBy: 'other-user',
        },
      });
      createdTournamentIds.push(otherTournament.id);

      // Try to fetch with wrong org - should return null
      const result = await prisma.tournament.findFirst({
        where: { id: otherTournament.id, orgId: testOrgId },
      });

      expect(result).toBeNull();
    });

    it('should enforce org validation pattern', async () => {
      // This test ensures the pattern: fetch by id, then validate org
      const otherTournament = await prisma.tournament.create({
        data: {
          name: 'Other Org Tournament',
          orgId: otherOrgId,
          status: 'draft',
          format: 'single_elimination',
          createdBy: 'other-user',
        },
      });
      createdTournamentIds.push(otherTournament.id);

      // Fetch by ID only (simulating a potential vulnerability)
      const tournament = await prisma.tournament.findUnique({
        where: { id: otherTournament.id },
      });

      // MUST validate org access before using data
      await expect(ensureOrgAccess(tournament!.orgId)).rejects.toThrow('Forbidden');
    });
  });
});
