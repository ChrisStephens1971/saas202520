/**
 * Player API Endpoints Tests
 * Sprint 10 Week 2 - Player Data Retrieval API
 *
 * Tests for search, statistics, and match history endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as searchPlayers } from '../search/route';
import { GET as getStatistics } from '../[id]/statistics/route';
import { GET as getMatches } from '../[id]/matches/route';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'test-user-id' },
      organizationId: 'test-org-id',
    })
  ),
}));

// Mock services
vi.mock('@/lib/player-profiles/services/player-profile-service', () => ({
  searchPlayers: vi.fn(() =>
    Promise.resolve({
      players: [
        {
          id: 'player-1',
          name: 'Test Player 1',
          photoUrl: null,
          skillLevel: 'INTERMEDIATE',
          location: 'New York',
          winRate: 65.5,
          totalTournaments: 10,
          lastPlayed: new Date('2025-01-01'),
        },
        {
          id: 'player-2',
          name: 'Test Player 2',
          photoUrl: null,
          skillLevel: 'ADVANCED',
          location: 'Los Angeles',
          winRate: 72.3,
          totalTournaments: 15,
          lastPlayed: new Date('2025-01-05'),
        },
      ],
      total: 2,
      hasMore: false,
    })
  ),
  getPlayerStatistics: vi.fn(() =>
    Promise.resolve({
      playerId: 'player-1',
      tenantId: 'test-org-id',
      totalTournaments: 10,
      totalMatches: 50,
      totalWins: 32,
      totalLosses: 18,
      winRate: 64.0,
      currentStreak: 3,
      longestStreak: 7,
      averageFinish: 4.5,
      favoriteFormat: '8-ball',
      totalPrizeWon: 1500.0,
      lastPlayedAt: new Date('2025-01-01'),
      updatedAt: new Date(),
    })
  ),
  getPlayerMatchHistory: vi.fn(() =>
    Promise.resolve([
      {
        id: 'match-1',
        matchId: 'match-1',
        playerId: 'player-1',
        tenantId: 'test-org-id',
        tournamentId: 'tournament-1',
        opponentId: 'player-2',
        result: 'WIN',
        playerScore: 7,
        opponentScore: 5,
        format: '8-ball',
        matchDate: new Date('2025-01-01'),
        duration: 45,
        metadata: { round: 1, bracket: 'winners' },
        opponent: {
          id: 'player-2',
          name: 'Test Player 2',
          photoUrl: null,
          skillLevel: 'ADVANCED',
        },
        tournament: {
          id: 'tournament-1',
          name: 'Test Tournament',
          format: 'single_elimination',
          date: new Date('2025-01-01'),
        },
      },
    ])
  ),
}));

vi.mock('@/lib/player-profiles/services/statistics-calculator', () => ({
  recalculatePlayerStatistics: vi.fn(() =>
    Promise.resolve({
      playerId: 'player-1',
      tenantId: 'test-org-id',
      totalTournaments: 10,
      totalMatches: 50,
      totalWins: 32,
      totalLosses: 18,
      winRate: 64.0,
      currentStreak: 3,
      longestStreak: 7,
      averageFinish: 4.5,
      favoriteFormat: '8-ball',
      totalPrizeWon: 1500.0,
      lastPlayedAt: new Date('2025-01-01'),
      updatedAt: new Date(),
    })
  ),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    playerProfile: {
      findFirst: vi.fn(() =>
        Promise.resolve({
          playerId: 'player-1',
          tenantId: 'test-org-id',
        })
      ),
    },
    playerStatistics: {
      count: vi.fn(() => Promise.resolve(5)),
    },
    matchHistory: {
      count: vi.fn(() => Promise.resolve(50)),
    },
  },
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

// ============================================================================
// SEARCH ENDPOINT TESTS
// ============================================================================

describe('POST /api/players/search', () => {
  it('should return paginated search results', async () => {
    const request = createRequest('/api/players/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'test',
        limit: 20,
        offset: 0,
      }),
    });

    const response = await searchPlayers(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.players).toHaveLength(2);
    expect(data.pagination).toMatchObject({
      total: 2,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });

  it('should filter by skill level', async () => {
    const request = createRequest('/api/players/search', {
      method: 'POST',
      body: JSON.stringify({
        skillLevel: ['INTERMEDIATE', 'ADVANCED'],
        limit: 20,
        offset: 0,
      }),
    });

    const response = await searchPlayers(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.players).toBeDefined();
  });

  it('should validate invalid skill level', async () => {
    const request = createRequest('/api/players/search', {
      method: 'POST',
      body: JSON.stringify({
        skillLevel: ['INVALID_LEVEL'],
      }),
    });

    const response = await searchPlayers(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should enforce maximum limit', async () => {
    const request = createRequest('/api/players/search', {
      method: 'POST',
      body: JSON.stringify({
        limit: 150, // Exceeds max of 100
      }),
    });

    const response = await searchPlayers(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should require authentication', async () => {
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce(null);

    const request = createRequest('/api/players/search', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await searchPlayers(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});

// ============================================================================
// STATISTICS ENDPOINT TESTS
// ============================================================================

describe('GET /api/players/[id]/statistics', () => {
  it('should return player statistics', async () => {
    const request = createRequest('/api/players/player-1/statistics');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getStatistics(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.playerId).toBe('player-1');
    expect(data.statistics).toBeDefined();
    expect(data.statistics.matches.total).toBe(50);
    expect(data.statistics.matches.wins).toBe(32);
  });

  it('should include ranking information', async () => {
    const request = createRequest('/api/players/player-1/statistics');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getStatistics(request, { params });
    const data = await response.json();

    expect(data.statistics.matches.rank).toBeDefined();
    expect(data.statistics.tournaments.rank).toBeDefined();
    expect(data.statistics.prizes.rank).toBeDefined();
  });

  it('should support recalculation', async () => {
    const request = createRequest('/api/players/player-1/statistics?recalculate=true');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getStatistics(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.recalculated).toBe(true);
  });

  it('should return 404 for non-existent player', async () => {
    vi.mocked(await import('@/lib/prisma')).prisma.playerProfile.findFirst.mockResolvedValueOnce(
      null
    );

    const request = createRequest('/api/players/nonexistent/statistics');
    const params = Promise.resolve({ id: 'nonexistent' });

    const response = await getStatistics(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should enforce tenant isolation', async () => {
    vi.mocked(await import('@/lib/prisma')).prisma.playerProfile.findFirst.mockResolvedValueOnce(
      null
    );

    const request = createRequest('/api/players/other-tenant-player/statistics');
    const params = Promise.resolve({ id: 'other-tenant-player' });

    const response = await getStatistics(request, { params });

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// MATCH HISTORY ENDPOINT TESTS
// ============================================================================

describe('GET /api/players/[id]/matches', () => {
  it('should return paginated match history', async () => {
    const request = createRequest('/api/players/player-1/matches?limit=20&offset=0');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getMatches(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.playerId).toBe('player-1');
    expect(data.matches).toHaveLength(1);
    expect(data.pagination).toBeDefined();
  });

  it('should include opponent and tournament details', async () => {
    const request = createRequest('/api/players/player-1/matches');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getMatches(request, { params });
    const data = await response.json();

    expect(data.matches[0].opponent).toBeDefined();
    expect(data.matches[0].opponent.name).toBe('Test Player 2');
    expect(data.matches[0].tournament).toBeDefined();
    expect(data.matches[0].tournament.name).toBe('Test Tournament');
  });

  it('should filter by tournament', async () => {
    const request = createRequest('/api/players/player-1/matches?tournamentId=tournament-1');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getMatches(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
  });

  it('should validate limit parameter', async () => {
    const request = createRequest('/api/players/player-1/matches?limit=150');
    const params = Promise.resolve({ id: 'player-1' });

    const response = await getMatches(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 for non-existent player', async () => {
    vi.mocked(await import('@/lib/prisma')).prisma.playerProfile.findFirst.mockResolvedValueOnce(
      null
    );

    const request = createRequest('/api/players/nonexistent/matches');
    const params = Promise.resolve({ id: 'nonexistent' });

    const response = await getMatches(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('PLAYER_NOT_FOUND');
  });

  it('should enforce tenant isolation', async () => {
    vi.mocked(await import('@/lib/prisma')).prisma.playerProfile.findFirst.mockResolvedValueOnce(
      null
    );

    const request = createRequest('/api/players/other-tenant-player/matches');
    const params = Promise.resolve({ id: 'other-tenant-player' });

    const response = await getMatches(request, { params });

    expect(response.status).toBe(404);
  });
});
