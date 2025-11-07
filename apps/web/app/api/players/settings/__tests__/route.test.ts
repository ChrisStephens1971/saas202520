/**
 * Player Settings API Tests
 * Sprint 10 Week 2: Player Profiles & Enhanced Experience
 *
 * Tests for GET and PUT /api/players/settings endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';

// Mock Prisma client
const mockPrisma = {
  playerSettings: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('GET /api/players/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing settings', async () => {
    const mockSettings = {
      id: 'settings_1',
      playerId: 'player_123',
      tenantId: 'org_123',
      isProfilePublic: true,
      showStatistics: true,
      showAchievements: true,
      showHistory: false,
      emailNotifications: {
        email: true,
        sms: false,
        push: true,
        categories: {
          tournaments: true,
          matches: true,
          achievements: true,
          social: false,
        },
      },
      pushNotifications: {
        email: false,
        sms: false,
        push: true,
        categories: {
          tournaments: true,
          matches: true,
          achievements: true,
          social: false,
        },
      },
      smsNotifications: {
        email: false,
        sms: false,
        push: false,
        categories: {
          tournaments: false,
          matches: false,
          achievements: false,
          social: false,
        },
      },
      theme: 'LIGHT',
      language: 'en',
      timezone: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    mockPrisma.playerSettings.findFirst.mockResolvedValueOnce(mockSettings);

    const request = new NextRequest('http://localhost/api/players/settings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.privacy.isProfilePublic).toBe(true);
    expect(data.settings.privacy.showHistory).toBe(false);
    expect(data.settings.display.theme).toBe('LIGHT');
  });

  it('should create default settings if none exist', async () => {
    const mockSettings = {
      id: 'settings_new',
      playerId: 'player_123',
      tenantId: 'org_123',
      isProfilePublic: true,
      showStatistics: true,
      showAchievements: true,
      showHistory: true,
      emailNotifications: { email: true, sms: false, push: true, categories: {} },
      pushNotifications: { email: false, sms: false, push: true, categories: {} },
      smsNotifications: { email: false, sms: true, push: false, categories: {} },
      theme: 'LIGHT',
      language: 'en',
      timezone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.playerSettings.findFirst.mockResolvedValueOnce(null);
    mockPrisma.playerSettings.create.mockResolvedValueOnce(mockSettings);

    const request = new NextRequest('http://localhost/api/players/settings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.playerSettings.create).toHaveBeenCalled();
    expect(data.settings.privacy.isProfilePublic).toBe(true);
  });

  it('should handle unauthorized access', async () => {
    mockPrisma.playerSettings.findFirst.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = new NextRequest('http://localhost/api/players/settings');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

describe('PUT /api/players/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update privacy settings', async () => {
    const existingSettings = {
      id: 'settings_1',
      playerId: 'player_123',
      tenantId: 'org_123',
      isProfilePublic: true,
      showStatistics: true,
      showAchievements: true,
      showHistory: true,
      emailNotifications: {},
      pushNotifications: {},
      smsNotifications: {},
      theme: 'LIGHT',
      language: 'en',
      timezone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedSettings = {
      ...existingSettings,
      isProfilePublic: false,
      showHistory: false,
      updatedAt: new Date(),
    };

    mockPrisma.playerSettings.findFirst.mockResolvedValueOnce(existingSettings);
    mockPrisma.playerSettings.update.mockResolvedValueOnce(updatedSettings);

    const request = new NextRequest('http://localhost/api/players/settings', {
      method: 'PUT',
      body: JSON.stringify({
        isProfilePublic: false,
        showHistory: false,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.privacy.isProfilePublic).toBe(false);
    expect(data.settings.privacy.showHistory).toBe(false);
    expect(data.message).toBe('Settings updated successfully');
  });

  it('should update notification preferences', async () => {
    const existingSettings = {
      id: 'settings_1',
      playerId: 'player_123',
      tenantId: 'org_123',
      isProfilePublic: true,
      showStatistics: true,
      showAchievements: true,
      showHistory: true,
      emailNotifications: { email: true, sms: false, push: true, categories: {} },
      pushNotifications: { email: false, sms: false, push: false, categories: {} },
      smsNotifications: { email: false, sms: false, push: false, categories: {} },
      theme: 'LIGHT',
      language: 'en',
      timezone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedSettings = {
      ...existingSettings,
      pushNotifications: {
        email: false,
        sms: false,
        push: true,
        categories: { tournaments: true, matches: true, achievements: false, social: false },
      },
      updatedAt: new Date(),
    };

    mockPrisma.playerSettings.findFirst.mockResolvedValueOnce(existingSettings);
    mockPrisma.playerSettings.update.mockResolvedValueOnce(updatedSettings);

    const request = new NextRequest('http://localhost/api/players/settings', {
      method: 'PUT',
      body: JSON.stringify({
        pushNotifications: {
          push: true,
          categories: {
            tournaments: true,
            matches: true,
          },
        },
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.notifications.push.push).toBe(true);
  });

  it('should update display preferences', async () => {
    const existingSettings = {
      id: 'settings_1',
      playerId: 'player_123',
      tenantId: 'org_123',
      isProfilePublic: true,
      showStatistics: true,
      showAchievements: true,
      showHistory: true,
      emailNotifications: {},
      pushNotifications: {},
      smsNotifications: {},
      theme: 'LIGHT',
      language: 'en',
      timezone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedSettings = {
      ...existingSettings,
      theme: 'DARK',
      language: 'es',
      timezone: 'America/New_York',
      updatedAt: new Date(),
    };

    mockPrisma.playerSettings.findFirst.mockResolvedValueOnce(existingSettings);
    mockPrisma.playerSettings.update.mockResolvedValueOnce(updatedSettings);

    const request = new NextRequest('http://localhost/api/players/settings', {
      method: 'PUT',
      body: JSON.stringify({
        theme: 'DARK',
        language: 'es',
        timezone: 'America/New_York',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings.display.theme).toBe('DARK');
    expect(data.settings.display.language).toBe('es');
    expect(data.settings.display.timezone).toBe('America/New_York');
  });

  it('should validate request body', async () => {
    const request = new NextRequest('http://localhost/api/players/settings', {
      method: 'PUT',
      body: JSON.stringify({
        theme: 'INVALID_THEME',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('should handle unauthorized access', async () => {
    mockPrisma.playerSettings.findFirst.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = new NextRequest('http://localhost/api/players/settings', {
      method: 'PUT',
      body: JSON.stringify({
        isProfilePublic: false,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
