/**
 * Unit Tests for POST /api/matches/[id]/score/increment
 * Tests SCORE-002, SCORE-003, SCORE-004, SCORE-006, SCORE-007
 */

import { vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createMockSession, createMockPrisma, factories } from '../../../__tests__/utils/test-helpers';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/prisma');
vi.mock('@/lib/permissions');
vi.mock('@repo/shared/lib/scoring-validation');

const mockGetServerSession = (await import('@/auth')).getServerSession as any;
const mockPrisma = createMockPrisma();
const mockCanScoreMatches = (await import('@/lib/permissions')).canScoreMatches as any;
const mockValidateScoreIncrement = (await import('@repo/shared/lib/scoring-validation')).validateScoreIncrement as any;
const mockIsMatchComplete = (await import('@repo/shared/lib/scoring-validation')).isMatchComplete as any;
const mockGetMatchWinner = (await import('@repo/shared/lib/scoring-validation')).getMatchWinner as any;

// Setup mocks
(await import('@/lib/prisma')).prisma = mockPrisma as any;

describe('POST /api/matches/[id]/score/increment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateScoreIncrement.mockReturnValue({ valid: true });
    mockIsMatchComplete.mockReturnValue(false);
    mockGetMatchWinner.mockReturnValue(null);
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
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
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 400 if player is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if device is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if rev is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device' }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 if player is invalid (not A or B)', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'C', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid player: must be A or B');
    });
  });

  describe('Match Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 404 if match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Match not found');
    });

    it('should return 400 if match is not active', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(
        factories.match({ state: 'completed' })
      );

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot score match in state: completed');
    });
  });

  describe('Permission Checks (SCORE-007)', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should return 403 if user does not have scorekeeper permission', async () => {
      mockCanScoreMatches.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('You must be a scorekeeper, TD, or owner');
    });

    it('should allow scorekeepers to increment score', async () => {
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });

      expect(response.status).toBe(200);
      expect(mockCanScoreMatches).toHaveBeenCalledWith('user-123', 'org-123');
    });
  });

  describe('Optimistic Locking', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 409 if rev mismatch (concurrent update)', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(
        factories.match({ rev: 5 }) // Server has rev 5
      );

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 3 }), // Client has rev 3
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Match was updated by another user');
      expect(data.currentRev).toBe(5);
    });

    it('should succeed if rev matches', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(
        factories.match({ rev: 3 })
      );
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 4 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 3 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });

      expect(response.status).toBe(200);
    });
  });

  describe('Score Validation (SCORE-002, SCORE-003, SCORE-004)', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should return 400 if score validation fails', async () => {
      mockValidateScoreIncrement.mockReturnValue({
        valid: false,
        error: 'Score exceeds race-to limit',
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid score');
      expect(data.validation.valid).toBe(false);
    });

    it('should call validateScoreIncrement with correct parameters', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(
        factories.match({ score: { playerA: 5, playerB: 3, raceTo: 9, games: [] } })
      );
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(mockValidateScoreIncrement).toHaveBeenCalledWith(
        { playerA: 5, playerB: 3, raceTo: 9, games: [] },
        'A',
        {
          raceTo: 9,
          allowHillHill: true,
          requireConfirmation: true,
        }
      );
    });
  });

  describe('Score Increment', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should increment player A score', async () => {
      const initialMatch = factories.match({
        score: { playerA: 3, playerB: 2, raceTo: 9, games: [] },
      });
      mockPrisma.match.findUnique.mockResolvedValue(initialMatch);

      let capturedNewScore: any = null;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          scoreUpdate: {
            create: vi.fn().mockImplementation((data) => {
              capturedNewScore = data.data.newScore;
              return Promise.resolve(factories.scoreUpdate());
            }),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(capturedNewScore.playerA).toBe(4);
      expect(capturedNewScore.playerB).toBe(2);
    });

    it('should increment player B score', async () => {
      const initialMatch = factories.match({
        score: { playerA: 3, playerB: 2, raceTo: 9, games: [] },
      });
      mockPrisma.match.findUnique.mockResolvedValue(initialMatch);

      let capturedNewScore: any = null;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          scoreUpdate: {
            create: vi.fn().mockImplementation((data) => {
              capturedNewScore = data.data.newScore;
              return Promise.resolve(factories.scoreUpdate());
            }),
          },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'B', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(capturedNewScore.playerA).toBe(3);
      expect(capturedNewScore.playerB).toBe(3);
    });
  });

  describe('Match Completion', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should mark match as completed when race-to is reached', async () => {
      const initialMatch = factories.match({
        score: { playerA: 8, playerB: 5, raceTo: 9, games: [] },
      });
      mockPrisma.match.findUnique.mockResolvedValue(initialMatch);
      mockIsMatchComplete.mockReturnValue(true);
      mockGetMatchWinner.mockReturnValue('A');

      let capturedMatchUpdate: any = null;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: {
            update: vi.fn().mockImplementation((data) => {
              capturedMatchUpdate = data.data;
              return Promise.resolve(factories.match({ state: 'completed', winnerId: 'player-a' }));
            }),
          },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(capturedMatchUpdate.state).toBe('completed');
      expect(capturedMatchUpdate.winnerId).toBe('player-a');
      expect(capturedMatchUpdate.completedAt).toBeInstanceOf(Date);
    });

    it('should create match.completed event when match finishes', async () => {
      const initialMatch = factories.match({
        score: { playerA: 8, playerB: 5, raceTo: 9, games: [] },
      });
      mockPrisma.match.findUnique.mockResolvedValue(initialMatch);
      mockIsMatchComplete.mockReturnValue(true);
      mockGetMatchWinner.mockReturnValue('A');

      const createEventMock = vi.fn();
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: { update: vi.fn().mockResolvedValue(factories.match({ state: 'completed' })) },
          tournamentEvent: { create: createEventMock },
        };
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      // Should create 2 events: score_updated and match.completed
      expect(createEventMock).toHaveBeenCalledTimes(2);
      expect(createEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'match.completed',
          }),
        })
      );
    });
  });

  describe('Audit Trail (SCORE-006)', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should create score update record', async () => {
      const createScoreUpdateMock = vi.fn().mockResolvedValue(factories.scoreUpdate());
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          scoreUpdate: { create: createScoreUpdateMock },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        };
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(createScoreUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matchId: 'match-123',
            actor: 'user-123',
            device: 'test-device',
            action: 'increment_a',
          }),
        })
      );
    });

    it('should create tournament event', async () => {
      const createEventMock = vi.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: createEventMock },
        };
        return await callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'B', device: 'test-device', rev: 1 }),
      });

      await POST(request, { params: { id: 'match-123' } });

      expect(createEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'match.score_updated',
            actor: 'user-123',
            device: 'test-device',
          }),
        })
      );
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          scoreUpdate: { create: vi.fn().mockResolvedValue(factories.scoreUpdate()) },
          match: { update: vi.fn().mockResolvedValue(factories.match({ rev: 2 })) },
          tournamentEvent: { create: vi.fn().mockResolvedValue({}) },
        });
      });
    });

    it('should return match, scoreUpdate, and validation in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('match');
      expect(data).toHaveProperty('scoreUpdate');
      expect(data).toHaveProperty('validation');
      expect(data.match.rev).toBe(2); // Rev incremented
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockCanScoreMatches.mockResolvedValue(true);
    });

    it('should return 500 on database error', async () => {
      mockPrisma.match.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/increment', {
        method: 'POST',
        body: JSON.stringify({ player: 'A', device: 'test-device', rev: 1 }),
      });

      const response = await POST(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
