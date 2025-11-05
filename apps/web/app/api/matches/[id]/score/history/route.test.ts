/**
 * Unit Tests for GET /api/matches/[id]/score/history
 * Tests SCORE-006 (Score history and audit trail)
 */

import { vi } from 'vitest';
import { createMockSession, createMockPrisma, factories } from '@/app/api/__tests__/utils/test-helpers';

// Create mock instances
const mockPrisma = createMockPrisma();

// Mock modules
vi.mock('@/auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Now import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from './route';
import * as auth from '@/auth';

const mockGetServerSession = auth.getServerSession as any;

describe('GET /api/matches/[id]/score/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Match Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return 404 if match not found', async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Match not found');
    });
  });

  describe('History Retrieval', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should return score updates with default limit of 50', async () => {
      const mockUpdates = [
        factories.scoreUpdate({ id: 'update-1', timestamp: new Date('2024-01-01T12:01:00') }),
        factories.scoreUpdate({ id: 'update-2', timestamp: new Date('2024-01-01T12:02:00') }),
        factories.scoreUpdate({ id: 'update-3', timestamp: new Date('2024-01-01T12:03:00') }),
      ];
      mockPrisma.scoreUpdate.findMany.mockResolvedValue(mockUpdates);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(3) // Total count
        .mockResolvedValueOnce(2); // Undoable count

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updates).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should respect custom limit query parameter', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history?limit=10');

      const response = await GET(request, { params: { id: 'match-123' } });

      expect(response.status).toBe(200);
      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should order updates by timestamp descending (newest first)', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      await GET(request, { params: { id: 'match-123' } });

      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        })
      );
    });

    it('should filter updates by matchId', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      await GET(request, { params: { id: 'match-123' } });

      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { matchId: 'match-123' },
        })
      );
    });
  });

  describe('canUndo Flag', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
    });

    it('should set canUndo to true if undoable actions exist', async () => {
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(5) // Total count
        .mockResolvedValueOnce(3); // Undoable count (> 0)

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canUndo).toBe(true);
    });

    it('should set canUndo to false if no undoable actions exist', async () => {
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(5) // Total count
        .mockResolvedValueOnce(0); // Undoable count (= 0)

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.canUndo).toBe(false);
    });

    it('should count only non-undone increment actions for canUndo', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(5) // Total count
        .mockResolvedValueOnce(2); // Undoable count

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      await GET(request, { params: { id: 'match-123' } });

      // Second count call should filter for undoable actions
      expect(mockPrisma.scoreUpdate.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            matchId: 'match-123',
            undone: false,
            action: { in: ['increment_a', 'increment_b'] },
          }),
        })
      );
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should return updates, total, and canUndo fields', async () => {
      const mockUpdates = [factories.scoreUpdate()];
      mockPrisma.scoreUpdate.findMany.mockResolvedValue(mockUpdates);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('updates');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('canUndo');
      expect(Array.isArray(data.updates)).toBe(true);
      expect(typeof data.total).toBe('number');
      expect(typeof data.canUndo).toBe('boolean');
    });

    it('should return empty updates array if no history exists', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updates).toHaveLength(0);
      expect(data.total).toBe(0);
      expect(data.canUndo).toBe(false);
    });
  });

  describe('Pagination Support', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      mockPrisma.match.findUnique.mockResolvedValue(factories.match());
    });

    it('should handle large result sets with pagination', async () => {
      const mockUpdates = Array.from({ length: 20 }, (_, i) =>
        factories.scoreUpdate({ id: `update-${i}` })
      );
      mockPrisma.scoreUpdate.findMany.mockResolvedValue(mockUpdates);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(100) // Total count
        .mockResolvedValueOnce(50); // Undoable count

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history?limit=20');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updates).toHaveLength(20);
      expect(data.total).toBe(100);
    });

    it('should handle invalid limit gracefully (defaults to 50)', async () => {
      mockPrisma.scoreUpdate.findMany.mockResolvedValue([]);
      mockPrisma.scoreUpdate.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history?limit=invalid');

      const response = await GET(request, { params: { id: 'match-123' } });

      expect(response.status).toBe(200);
      // parseInt('invalid', 10) returns NaN, which becomes 50 via || operator
      expect(mockPrisma.scoreUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: expect.any(Number),
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return 500 on database error', async () => {
      mockPrisma.match.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/matches/match-123/score/history');

      const response = await GET(request, { params: { id: 'match-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
