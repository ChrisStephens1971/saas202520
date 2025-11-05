/**
 * Unit Tests for POST /api/matches/[id]/score/undo
 * Tests SCORE-005 (Undo functionality with 3-action limit)
 */

import { vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createMockSession, createMockPrisma, factories } from '../../../__tests__/utils/test-helpers';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/prisma');
vi.mock('@/lib/permissions');

const mockGetServerSession = (await import('@/auth')).getServerSession as any;
const mockPrisma = createMockPrisma();
const mockCanScoreMatches = (await import('@/lib/permissions')).canScoreMatches as any;

// Setup mocks
(await import('@/lib/prisma')).prisma = mockPrisma as any;

describe('POST /api/matches/[id]/score/undo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return 400 if device is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if rev is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device' }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('Match Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 404 if match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Match not found');
    });

    it('should allow undo on active matches', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(factories.match({ state: 'active' }));
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
            update: vi.fn().mockResolvedValue({}),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });

      expect(response.status).toBe(200);
    });

    it('should allow undo on completed matches', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(factories.match({ state: 'completed' }));
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
            update: vi.fn().mockResolvedValue({}),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });

      expect(response.status).toBe(200);
    });

    it('should reject undo on pending matches', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(factories.match({ state: 'pending' }));

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot undo score on match in state: pending');
    });
  });

  describe('Permission Checks', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should return 403 if user does not have scorekeeper permission', async () => {
      mockCanScoreMatches.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('You must be a scorekeeper, TD, or owner');
    });
  });

  describe('Optimistic Locking', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 409 if rev mismatch', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(factories.match({ rev: 5 }));

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 3 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Match was updated by another user');
      expect(data.currentRev).toBe(5);
    });
  });

  describe('Undo Functionality', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should return 400 if no actions available to undo', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No actions available to undo');
    });

    it('should undo the most recent score update', async () => {
      const recentUpdates = [
        factories.scoreUpdate({
          id: 'update-3',
          timestamp: new Date('2024-01-01T12:03:00'),
          previousScore: { playerA: 2, playerB: 1, raceTo: 9, games: [] },
          newScore: { playerA: 3, playerB: 1, raceTo: 9, games: [] },
        }),
        factories.scoreUpdate({
          id: 'update-2',
          timestamp: new Date('2024-01-01T12:02:00'),
        }),
        factories.scoreUpdate({
          id: 'update-1',
          timestamp: new Date('2024-01-01T12:01:00'),
        }),
      ];
      mockPrisma.scoreUpdate.findMany.mockResolvedValue(recentUpdates);
      mockPrisma.scoreUpdate.count.mockResolvedValue(2);

      const updateScoreUpdateMock = vi.fn().mockResolvedValue({});
      const createScoreUpdateMock = vi.fn().mockResolvedValue(factories.scoreUpdate());
      const updateMatchMock = vi.fn().mockResolvedValue(factories.match({ rev: 2 }));

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: updateScoreUpdateMock,
            create: createScoreUpdateMock,
          },
          match: { update: updateMatchMock },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      // Should mark most recent update as undone
      expect(updateScoreUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'update-3' },
          data: { undone: true },
        })
      );

      // Should restore previous score
      expect(updateMatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            score: { playerA: 2, playerB: 1, raceTo: 9, games: [] },
          }),
        })
      );
    });

    it('should query only the last 3 undoable actions (MAX_UNDO_DEPTH)', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        })
      );
    });

    it('should only undo increment actions (not undo actions)', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { in: ['increment_a', 'increment_b'] },
          }),
        })
      );
    });
  });

  describe('Match State Restoration', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(
        factories.match({ state: 'completed', winnerId: 'player-a' })
      );
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
    });

    it('should revert match to active state when undoing', async () => {
      const updateMatchMock = vi.fn().mockResolvedValue(factories.match({ state: 'active' }));
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: updateMatchMock },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(updateMatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            state: 'active',
            winnerId: null,
            completedAt: null,
          }),
        })
      );
    });

    it('should increment rev for optimistic locking', async () => {
      const updateMatchMock = vi.fn().mockResolvedValue(factories.match({ rev: 2 }));
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: updateMatchMock },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(updateMatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rev: { increment: 1 },
          }),
        })
      );
    });
  });

  describe('Audit Trail Preservation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
    });

    it('should create undo action record', async () => {
      const createScoreUpdateMock = vi.fn().mockResolvedValue(factories.scoreUpdate());
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: createScoreUpdateMock,
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(createScoreUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'undo',
            actor: 'user-123',
            device: 'test-device',
          }),
        })
      );
    });

    it('should create tournament event for undo', async () => {
      const createEventMock = vi.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: createEventMock },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(createEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'match.score_undone',
          }),
        })
      );
    });
  });

  describe('canUndo Flag', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([
        factories.scoreUpdate({ timestamp: new Date('2024-01-01T12:03:00') }),
      ]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });
    });

    it('should set canUndo to true if more actions are available', async () => {
      mockPrisma.scoreUpdate.count.mockResolvedValue(2); // 2 more undoable actions

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canUndo).toBe(true);
    });

    it('should set canUndo to false if no more actions available', async () => {
      mockPrisma.scoreUpdate.count.mockResolvedValue(0); // No more undoable actions

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canUndo).toBe(false);
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([factories.scoreUpdate()]);
      mockPrisma.scoreUpdate.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue(factories.scoreUpdate()),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });
    });

    it('should return match, undoneUpdates, and canUndo in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('match');
      expect(data).toHaveProperty('undoneUpdates');
      expect(data).toHaveProperty('canUndo');
      expect(Array.isArray(data.undoneUpdates)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 500 on database error', async () => {
      mockPrisma.match.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/undo', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
