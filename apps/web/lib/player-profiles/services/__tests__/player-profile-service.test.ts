/**
 * Player Profile Service Tests
 * Sprint 10 Week 2 - Day 5: Tests
 *
 * Comprehensive tests for player profile service functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPlayerProfile,
  updatePlayerProfile,
  getPlayerStatistics,
  getPlayerMatchHistory,
  getHeadToHeadRecord,
  getPlayerLeaderboard,
  searchPlayers,
} from '../player-profile-service';

// Mock Prisma Client
const mockPrismaClient = {
  playerProfile: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  playerStatistics: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  playerAchievement: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  matchHistory: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  tournament: {
    findUnique: vi.fn(),
  },
};

// Mock data
const mockTenantId = 'tenant-123';
const mockPlayerId = 'player-123';
const mockViewerId = 'viewer-456';

const mockProfile = {
  id: 'profile-123',
  playerId: mockPlayerId,
  tenantId: mockTenantId,
  bio: 'Test bio',
  photoUrl: 'https://example.com/photo.jpg',
  location: 'New York, NY',
  skillLevel: 'INTERMEDIATE',
  privacySettings: {
    profilePublic: true,
    showStats: true,
    showHistory: true,
    showAchievements: true,
  },
  socialLinks: null,
  customFields: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockStatistics = {
  id: 'stats-123',
  playerId: mockPlayerId,
  tenantId: mockTenantId,
  totalTournaments: 10,
  totalMatches: 50,
  totalWins: 30,
  totalLosses: 20,
  winRate: 60.0,
  currentStreak: 3,
  longestStreak: 5,
  averageFinish: 5.5,
  favoriteFormat: '8-ball',
  totalPrizeWon: 500.0,
  lastPlayedAt: new Date('2024-11-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-11-01'),
};

describe('Player Profile Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlayerProfile', () => {
    it('should return complete player profile for owner', async () => {
      mockPrismaClient.playerProfile.findFirst.mockResolvedValue(mockProfile);
      mockPrismaClient.playerStatistics.findFirst.mockResolvedValue(mockStatistics);
      mockPrismaClient.playerAchievement.findMany.mockResolvedValue([]);
      mockPrismaClient.matchHistory.findMany.mockResolvedValue([]);

      const result = await getPlayerProfile(mockPlayerId, mockTenantId, mockPlayerId);

      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('achievements');
      expect(result.profile.playerId).toBe(mockPlayerId);
    });

    it('should throw error for non-existent profile', async () => {
      mockPrismaClient.playerProfile.findFirst.mockResolvedValue(null);

      await expect(getPlayerProfile('non-existent', mockTenantId, mockViewerId)).rejects.toThrow('Player profile not found');
    });

    it('should respect privacy settings for non-owner', async () => {
      const privateProfile = {
        ...mockProfile,
        privacySettings: {
          profilePublic: false,
          showStats: false,
          showHistory: false,
          showAchievements: false,
        },
      };

      mockPrismaClient.playerProfile.findFirst.mockResolvedValue(privateProfile);

      await expect(getPlayerProfile(mockPlayerId, mockTenantId, mockViewerId)).rejects.toThrow('Profile is private');
    });

    it('should hide achievements when privacy setting is false', async () => {
      const profile = {
        ...mockProfile,
        privacySettings: {
          profilePublic: true,
          showStats: true,
          showHistory: true,
          showAchievements: false,
        },
      };

      mockPrismaClient.playerProfile.findFirst.mockResolvedValue(profile);
      mockPrismaClient.playerStatistics.findFirst.mockResolvedValue(mockStatistics);
      mockPrismaClient.playerAchievement.findMany.mockResolvedValue([]);
      mockPrismaClient.matchHistory.findMany.mockResolvedValue([]);

      const result = await getPlayerProfile(mockPlayerId, mockTenantId, mockViewerId);

      expect(result.achievements).toHaveLength(0);
    });
  });

  describe('updatePlayerProfile', () => {
    it('should update profile with valid data', async () => {
      const updateData = {
        bio: 'Updated bio',
        location: 'Los Angeles, CA',
        skillLevel: 'ADVANCED' as any,
      };

      const updatedProfile = {
        ...mockProfile,
        ...updateData,
      };

      mockPrismaClient.playerProfile.upsert.mockResolvedValue(updatedProfile);

      const result = await updatePlayerProfile(mockPlayerId, mockTenantId, updateData);

      expect(result.bio).toBe(updateData.bio);
      expect(result.location).toBe(updateData.location);
      expect(result.skillLevel).toBe(updateData.skillLevel);
    });

    it('should create profile if it does not exist', async () => {
      const newProfileData = {
        bio: 'New player',
        skillLevel: 'BEGINNER' as any,
      };

      mockPrismaClient.playerProfile.upsert.mockResolvedValue({
        ...mockProfile,
        ...newProfileData,
      });

      const result = await updatePlayerProfile('new-player', mockTenantId, newProfileData);

      expect(result).toBeDefined();
      expect(mockPrismaClient.playerProfile.upsert).toHaveBeenCalled();
    });
  });

  describe('getPlayerStatistics', () => {
    it('should return existing statistics', async () => {
      mockPrismaClient.playerStatistics.findFirst.mockResolvedValue(mockStatistics);

      const result = await getPlayerStatistics(mockPlayerId, mockTenantId);

      expect(result).toEqual(mockStatistics);
      expect(result.totalTournaments).toBe(10);
      expect(result.totalWins).toBe(30);
    });

    it('should create statistics if not found', async () => {
      mockPrismaClient.playerStatistics.findFirst.mockResolvedValue(null);
      mockPrismaClient.playerStatistics.create.mockResolvedValue({
        ...mockStatistics,
        totalTournaments: 0,
        totalMatches: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
      });

      const result = await getPlayerStatistics('new-player', mockTenantId);

      expect(result).toBeDefined();
      expect(mockPrismaClient.playerStatistics.create).toHaveBeenCalled();
    });
  });

  describe('getPlayerMatchHistory', () => {
    it('should return paginated match history', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          playerId: mockPlayerId,
          opponentId: 'opponent-1',
          result: 'WIN',
          playerScore: 7,
          opponentScore: 5,
          matchDate: new Date('2024-11-01'),
        },
        {
          id: 'match-2',
          playerId: mockPlayerId,
          opponentId: 'opponent-2',
          result: 'LOSS',
          playerScore: 4,
          opponentScore: 7,
          matchDate: new Date('2024-10-28'),
        },
      ];

      mockPrismaClient.matchHistory.findMany.mockResolvedValue(mockMatches);
      mockPrismaClient.playerProfile.findFirst.mockResolvedValue({ playerId: 'opponent-1' });
      mockPrismaClient.tournament.findUnique.mockResolvedValue({
        id: 'tournament-1',
        name: 'Test Tournament',
        format: '8-ball',
        startDateTime: new Date('2024-11-01'),
      });

      const result = await getPlayerMatchHistory(mockPlayerId, mockTenantId, 10, 0);

      expect(result).toHaveLength(mockMatches.length);
      expect(result[0]).toHaveProperty('opponent');
      expect(result[0]).toHaveProperty('tournament');
    });

    it('should respect pagination limits', async () => {
      const mockMatches = Array(25)
        .fill(null)
        .map((_, i) => ({
          id: `match-${i}`,
          playerId: mockPlayerId,
          opponentId: `opponent-${i}`,
          result: 'WIN',
          playerScore: 7,
          opponentScore: 5,
          matchDate: new Date(),
        }));

      mockPrismaClient.matchHistory.findMany.mockResolvedValue(mockMatches.slice(0, 10));

      const result = await getPlayerMatchHistory(mockPlayerId, mockTenantId, 10, 0);

      expect(result.length).toBeLessThanOrEqual(10);
      expect(mockPrismaClient.matchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        })
      );
    });
  });

  describe('getHeadToHeadRecord', () => {
    it('should calculate correct head-to-head statistics', async () => {
      const player1Matches = [
        { result: 'WIN', matchDate: new Date('2024-11-01') },
        { result: 'WIN', matchDate: new Date('2024-10-15') },
        { result: 'LOSS', matchDate: new Date('2024-09-20') },
      ];

      const player2Matches = [
        { result: 'LOSS', matchDate: new Date('2024-11-01') },
        { result: 'LOSS', matchDate: new Date('2024-10-15') },
        { result: 'WIN', matchDate: new Date('2024-09-20') },
      ];

      mockPrismaClient.matchHistory.findMany
        .mockResolvedValueOnce(player1Matches)
        .mockResolvedValueOnce(player2Matches)
        .mockResolvedValue([]);

      const result = await getHeadToHeadRecord(mockPlayerId, 'player-2', mockTenantId);

      expect(result.totalMatches).toBe(3);
      expect(result.wins).toBe(2);
      expect(result.losses).toBe(1);
      expect(result.winRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('getPlayerLeaderboard', () => {
    it('should return win rate leaderboard', async () => {
      const mockStats = [
        {
          playerId: 'player-1',
          winRate: 75.0,
          totalMatches: 20,
        },
        {
          playerId: 'player-2',
          winRate: 70.0,
          totalMatches: 15,
        },
      ];

      mockPrismaClient.playerStatistics.findMany.mockResolvedValue(mockStats);
      mockPrismaClient.playerStatistics.count.mockResolvedValue(100);

      const result = await getPlayerLeaderboard(mockTenantId, 'winRate', 50);

      expect(result.type).toBe('winRate');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
      expect(result.totalPlayers).toBe(100);
    });

    it('should return tournaments leaderboard', async () => {
      const mockStats = [
        {
          playerId: 'player-1',
          totalTournaments: 50,
        },
        {
          playerId: 'player-2',
          totalTournaments: 45,
        },
      ];

      mockPrismaClient.playerStatistics.findMany.mockResolvedValue(mockStats);
      mockPrismaClient.playerStatistics.count.mockResolvedValue(100);

      const result = await getPlayerLeaderboard(mockTenantId, 'tournaments', 50);

      expect(result.type).toBe('tournaments');
      expect(result.entries[0].value).toBe(50);
    });
  });

  describe('searchPlayers', () => {
    it('should search players with filters', async () => {
      const mockProfiles = [
        {
          playerId: 'player-1',
          skillLevel: 'INTERMEDIATE',
          location: 'New York',
          privacySettings: { profilePublic: true },
        },
        {
          playerId: 'player-2',
          skillLevel: 'ADVANCED',
          location: 'Los Angeles',
          privacySettings: { profilePublic: true },
        },
      ];

      mockPrismaClient.playerProfile.findMany.mockResolvedValue(mockProfiles);
      mockPrismaClient.playerProfile.count.mockResolvedValue(2);
      mockPrismaClient.playerStatistics.findFirst.mockResolvedValue({
        winRate: 60.0,
        totalTournaments: 10,
        lastPlayedAt: new Date(),
      });

      const result = await searchPlayers(mockTenantId, {
        skillLevel: ['INTERMEDIATE', 'ADVANCED'],
        limit: 20,
      });

      expect(result.players).toBeDefined();
      expect(result.total).toBe(2);
    });

    it('should filter by minimum win rate', async () => {
      mockPrismaClient.playerProfile.findMany.mockResolvedValue([mockProfile]);
      mockPrismaClient.playerProfile.count.mockResolvedValue(1);
      mockPrismaClient.playerStatistics.findFirst.mockResolvedValue({
        winRate: 45.0,
        totalTournaments: 10,
        lastPlayedAt: new Date(),
      });

      const result = await searchPlayers(mockTenantId, {
        minWinRate: 50,
        limit: 20,
      });

      // Player should be filtered out due to low win rate
      expect(result.players).toHaveLength(0);
    });
  });
});

export { mockPrismaClient };
