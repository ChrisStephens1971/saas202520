/**
 * Leaderboard API Tests
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * Tests for GET /api/leaderboards/[type] endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../[type]/route';

// Mock the player profile service
vi.mock('@/lib/player-profiles/services/player-profile-service', () => ({
  getPlayerLeaderboard: vi.fn(),
}));

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getPlayerLeaderboard } from '@/lib/player-profiles/services/player-profile-service';

// Type for mocked function
type MockedGetPlayerLeaderboard = ReturnType<typeof vi.fn>;

describe('GET /api/leaderboards/[type]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 for invalid leaderboard type', async () => {
      const request = new NextRequest('http://localhost/api/leaderboards/invalid-type');
      const response = await GET(request, { params: { type: 'invalid-type' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid leaderboard type');
      expect(data.validTypes).toContain('win-rate');
    });

    it('should accept valid leaderboard types', async () => {
      const validTypes = ['win-rate', 'tournaments', 'prize-money', 'achievements'];

      for (const type of validTypes) {
        (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockResolvedValueOnce({
          type: type === 'win-rate' ? 'winRate' : type === 'prize-money' ? 'prizes' : type,
          entries: [],
          updatedAt: new Date(),
          totalPlayers: 0,
        });

        const request = new NextRequest(`http://localhost/api/leaderboards/${type}`);
        const response = await GET(request, { params: { type } });

        expect(response.status).toBe(200);
      }
    });

    it('should validate limit parameter', async () => {
      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockResolvedValueOnce({
        type: 'winRate',
        entries: [],
        updatedAt: new Date(),
        totalPlayers: 0,
      });

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate?limit=1000');
      const response = await GET(request, { params: { type: 'win-rate' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should use default limit if not provided', async () => {
      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockResolvedValueOnce({
        type: 'winRate',
        entries: [],
        updatedAt: new Date(),
        totalPlayers: 0,
      });

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate');
      const response = await GET(request, { params: { type: 'win-rate' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.limit).toBe(100);
    });
  });

  describe('Leaderboard Data', () => {
    it('should return leaderboard data for win-rate', async () => {
      const mockLeaderboard = {
        type: 'winRate',
        entries: [
          {
            rank: 1,
            playerId: 'player_1',
            playerName: 'John Doe',
            photoUrl: null,
            skillLevel: 'EXPERT',
            value: 85.5,
            formattedValue: '85.5%',
            change: 2,
          },
          {
            rank: 2,
            playerId: 'player_2',
            playerName: 'Jane Smith',
            photoUrl: 'https://example.com/photo.jpg',
            skillLevel: 'ADVANCED',
            value: 82.0,
            formattedValue: '82.0%',
            change: -1,
          },
        ],
        updatedAt: new Date('2025-01-01'),
        totalPlayers: 150,
      };

      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockResolvedValueOnce(
        mockLeaderboard
      );

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate?limit=10');
      const response = await GET(request, { params: { type: 'win-rate' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type).toBe('win-rate');
      expect(data.leaderboard.entries).toHaveLength(2);
      expect(data.leaderboard.entries[0].rank).toBe(1);
      expect(data.leaderboard.entries[0].playerName).toBe('John Doe');
      expect(data.leaderboard.totalPlayers).toBe(150);
    });

    it('should handle empty leaderboards', async () => {
      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockResolvedValueOnce({
        type: 'winRate',
        entries: [],
        updatedAt: new Date(),
        totalPlayers: 0,
      });

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate');
      const response = await GET(request, { params: { type: 'win-rate' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard.entries).toHaveLength(0);
      expect(data.leaderboard.totalPlayers).toBe(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter leaderboard by tenant ID', async () => {
      const mockLeaderboard = {
        type: 'winRate',
        entries: [
          {
            rank: 1,
            playerId: 'player_1',
            playerName: 'John Doe',
            photoUrl: null,
            skillLevel: 'EXPERT',
            value: 85.5,
            formattedValue: '85.5%',
          },
        ],
        updatedAt: new Date(),
        totalPlayers: 50,
      };

      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockResolvedValueOnce(
        mockLeaderboard
      );

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate');
      await GET(request, { params: { type: 'win-rate' } });

      // Verify the service was called with tenant ID
      expect(getPlayerLeaderboard).toHaveBeenCalledWith(
        'org_123', // Mock tenant ID
        'winRate',
        100
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockRejectedValueOnce(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate');
      const response = await GET(request, { params: { type: 'win-rate' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch leaderboard');
    });

    it('should handle unauthorized access', async () => {
      (getPlayerLeaderboard as unknown as MockedGetPlayerLeaderboard).mockRejectedValueOnce(
        new Error('Unauthorized')
      );

      const request = new NextRequest('http://localhost/api/leaderboards/win-rate');
      const response = await GET(request, { params: { type: 'win-rate' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
