/**
 * Unit Tests for Scorekeeper Management API (SCORE-007)
 * GET /api/organizations/[id]/scorekeepers
 * POST /api/organizations/[id]/scorekeepers
 * DELETE /api/organizations/[id]/scorekeepers
 */

import { vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from './route';
import { createMockSession, createMockPrisma, factories } from '../../../__tests__/utils/test-helpers';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/prisma');
vi.mock('@/lib/permissions');

const mockGetServerSession = (await import('@/auth')).getServerSession as any;
const mockPrisma = createMockPrisma();
const mockCanManageTournament = (await import('@/lib/permissions')).canManageTournament as any;
const mockGetScorekeepers = (await import('@/lib/permissions')).getScorekepers as any;
const mockAssignScorekeeperRole = (await import('@/lib/permissions')).assignScorekeeperRole as any;
const mockRemoveScorekeeperRole = (await import('@/lib/permissions')).removeScorekeeperRole as any;

// Setup mocks
(await import('@/lib/prisma')).prisma = mockPrisma as any;

describe('Scorekeeper Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/organizations/[id]/scorekeepers', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await GET(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Permission Checks', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(createMockSession());
      });

      it('should return 403 if user cannot manage tournament', async () => {
        mockCanManageTournament.mockResolvedValue(false);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await GET(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Unauthorized: You must be an owner or TD to view scorekeepers');
      });

      it('should allow owners to list scorekeepers', async () => {
        mockCanManageTournament.mockResolvedValue(true);
        mockGetScorekeepers.mockResolvedValue([]);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await GET(request, { params: { id: 'org-123' } });

        expect(response.status).toBe(200);
        expect(mockCanManageTournament).toHaveBeenCalledWith('user-123', 'org-123');
      });

      it('should allow TDs to list scorekeepers', async () => {
        mockCanManageTournament.mockResolvedValue(true);
        mockGetScorekeepers.mockResolvedValue([]);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await GET(request, { params: { id: 'org-123' } });

        expect(response.status).toBe(200);
      });
    });

    describe('Scorekeeper Listing', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(createMockSession());
        mockCanManageTournament.mockResolvedValue(true);
      });

      it('should return list of scorekeepers', async () => {
        const mockScorekeepers = [
          {
            ...factories.organizationMember({ role: 'scorekeeper' }),
            user: { id: 'user-1', name: 'Scorekeeper 1', email: 'sk1@example.com' },
          },
          {
            ...factories.organizationMember({ role: 'scorekeeper', userId: 'user-2' }),
            user: { id: 'user-2', name: 'Scorekeeper 2', email: 'sk2@example.com' },
          },
        ];
        mockGetScorekeepers.mockResolvedValue(mockScorekeepers);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await GET(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.scorekeepers).toHaveLength(2);
        expect(mockGetScorekeepers).toHaveBeenCalledWith('org-123');
      });

      it('should return empty array if no scorekeepers exist', async () => {
        mockGetScorekeepers.mockResolvedValue([]);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await GET(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.scorekeepers).toHaveLength(0);
      });
    });
  });

  describe('POST /api/organizations/[id]/scorekeepers', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-456' }),
        });

        const response = await POST(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(createMockSession());
      });

      it('should return 400 if neither userId nor userEmail provided', async () => {
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        const response = await POST(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required field: userId or userEmail');
      });

      it('should accept userId', async () => {
        mockAssignScorekeeperRole.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-456' }),
        });

        const response = await POST(request, { params: { id: 'org-123' } });

        expect(response.status).toBe(200);
        expect(mockAssignScorekeeperRole).toHaveBeenCalledWith('user-456', 'org-123', 'user-123');
      });

      it('should look up user by email if provided', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-789', email: 'new@example.com' });
        mockAssignScorekeeperRole.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({ userEmail: 'new@example.com' }),
        });

        const response = await POST(request, { params: { id: 'org-123' } });

        expect(response.status).toBe(200);
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'new@example.com' },
        });
        expect(mockAssignScorekeeperRole).toHaveBeenCalledWith('user-789', 'org-123', 'user-123');
      });

      it('should return 404 if user email not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({ userEmail: 'notfound@example.com' }),
        });

        const response = await POST(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('User not found with that email');
      });
    });

    describe('Role Assignment', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(createMockSession());
        mockAssignScorekeeperRole.mockResolvedValue(undefined);
      });

      it('should assign scorekeeper role successfully', async () => {
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-456' }),
        });

        const response = await POST(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Scorekeeper role assigned successfully');
      });

      it('should return 500 if assignment fails with permission error', async () => {
        mockAssignScorekeeperRole.mockRejectedValue(new Error('Only owners and TDs can assign scorekeeper roles'));

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-456' }),
        });

        const response = await POST(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Only owners and TDs can assign scorekeeper roles');
      });
    });
  });

  describe('DELETE /api/organizations/[id]/scorekeepers', () => {
    describe('Authentication', () => {
      it('should return 401 if not authenticated', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers?userId=user-456');

        const response = await DELETE(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(createMockSession());
      });

      it('should return 400 if userId is missing from query parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

        const response = await DELETE(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required parameter: userId');
      });
    });

    describe('Role Removal', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(createMockSession());
        mockRemoveScorekeeperRole.mockResolvedValue(undefined);
      });

      it('should remove scorekeeper role successfully', async () => {
        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers?userId=user-456');

        const response = await DELETE(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Scorekeeper role removed successfully');
        expect(mockRemoveScorekeeperRole).toHaveBeenCalledWith('user-456', 'org-123', 'user-123');
      });

      it('should return 500 if removal fails with permission error', async () => {
        mockRemoveScorekeeperRole.mockRejectedValue(new Error('Only owners and TDs can remove scorekeeper roles'));

        const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers?userId=user-456');

        const response = await DELETE(request, { params: { id: 'org-123' } });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Only owners and TDs can remove scorekeeper roles');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('GET should return 500 on database error', async () => {
      mockCanManageTournament.mockResolvedValue(true);
      mockGetScorekeepers.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers');

      const response = await GET(request, { params: { id: 'org-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('POST should return 500 on database error', async () => {
      mockAssignScorekeeperRole.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers', {
        method: 'POST',
        body: JSON.stringify({ userId: 'user-456' }),
      });

      const response = await POST(request, { params: { id: 'org-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('DELETE should return 500 on database error', async () => {
      mockRemoveScorekeeperRole.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/scorekeepers?userId=user-456');

      const response = await DELETE(request, { params: { id: 'org-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });
});
