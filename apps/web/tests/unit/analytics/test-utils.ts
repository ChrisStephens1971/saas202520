/**
 * Test Utilities
 * Sprint 10 Week 1 Day 5 - Testing Infrastructure
 *
 * Shared utilities, mocks, and fixtures for analytics tests.
 */

import { vi, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

/**
 * Mock Prisma Client
 */
export function createMockPrismaClient(): Partial<PrismaClient> {
  return {
    $transaction: vi.fn(async (callback: any) => {
      return callback({
        revenueMetrics: mockRevenueMetricsModel,
        subscription: mockSubscriptionModel,
        user: mockUserModel,
        tournament: mockTournamentModel,
        analyticsEvent: mockAnalyticsEventModel,
      });
    }),
    revenueMetrics: mockRevenueMetricsModel as any,
    subscription: mockSubscriptionModel as any,
    user: mockUserModel as any,
    tournament: mockTournamentModel as any,
    analyticsEvent: mockAnalyticsEventModel as any,
    $disconnect: vi.fn(),
  } as any;
}

/**
 * Mock Revenue Metrics Model
 */
export const mockRevenueMetricsModel = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  aggregate: vi.fn(),
};

/**
 * Mock Subscription Model
 */
export const mockSubscriptionModel = {
  findMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
};

/**
 * Mock User Model
 */
export const mockUserModel = {
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
};

/**
 * Mock Tournament Model
 */
export const mockTournamentModel = {
  findMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
};

/**
 * Mock Analytics Event Model
 */
export const mockAnalyticsEventModel = {
  findMany: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
};

/**
 * Mock Redis Client
 */
export function createMockRedisClient(): Partial<Redis> {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    set: vi.fn(async (key: string, value: string, ..._args: any[]) => {
      store.set(key, value);
      return 'OK';
    }),
    setex: vi.fn(async (key: string, ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let deleted = 0;
      keys.forEach((key) => {
        if (store.delete(key)) deleted++;
      });
      return deleted;
    }),
    keys: vi.fn(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return Array.from(store.keys()).filter((key) => regex.test(key));
    }),
    flushdb: vi.fn(async () => {
      store.clear();
      return 'OK';
    }),
    info: vi.fn(async () => 'redis_version:7.0.0\nused_memory:1000000'),
    quit: vi.fn(async () => 'OK'),
  } as any;
}

/**
 * Test Fixtures - Revenue Data
 */
export const fixtures = {
  revenueMetrics: {
    current: {
      id: 'rev-001',
      tenantId: 'tenant-001',
      period: new Date('2024-11-01'),
      mrr: 15000,
      arr: 180000,
      newRevenue: 2000,
      expansionRevenue: 500,
      contractionRevenue: 200,
      churnedRevenue: 300,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    previous: {
      id: 'rev-002',
      tenantId: 'tenant-001',
      period: new Date('2024-10-01'),
      mrr: 14000,
      arr: 168000,
      newRevenue: 1800,
      expansionRevenue: 400,
      contractionRevenue: 150,
      churnedRevenue: 250,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },

  subscriptions: {
    active: [
      {
        id: 'sub-001',
        tenantId: 'tenant-001',
        userId: 'user-001',
        status: 'active',
        plan: 'professional',
        amount: 99,
        interval: 'month',
        currentPeriodStart: new Date('2024-11-01'),
        currentPeriodEnd: new Date('2024-12-01'),
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'sub-002',
        tenantId: 'tenant-001',
        userId: 'user-002',
        status: 'active',
        plan: 'enterprise',
        amount: 299,
        interval: 'month',
        currentPeriodStart: new Date('2024-11-01'),
        currentPeriodEnd: new Date('2024-12-01'),
        createdAt: new Date('2024-02-01'),
      },
    ],
    churned: [
      {
        id: 'sub-003',
        tenantId: 'tenant-001',
        userId: 'user-003',
        status: 'canceled',
        plan: 'professional',
        amount: 99,
        interval: 'month',
        currentPeriodStart: new Date('2024-10-01'),
        currentPeriodEnd: new Date('2024-11-01'),
        canceledAt: new Date('2024-10-25'),
        createdAt: new Date('2024-05-01'),
      },
    ],
  },

  users: {
    cohort202401: [
      {
        id: 'user-001',
        tenantId: 'tenant-001',
        email: 'user1@example.com',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'user-002',
        tenantId: 'tenant-001',
        email: 'user2@example.com',
        createdAt: new Date('2024-01-20'),
      },
    ],
    cohort202402: [
      {
        id: 'user-003',
        tenantId: 'tenant-001',
        email: 'user3@example.com',
        createdAt: new Date('2024-02-10'),
      },
    ],
  },

  tournaments: [
    {
      id: 'tour-001',
      tenantId: 'tenant-001',
      name: 'Spring Championship',
      format: 'swiss',
      status: 'completed',
      maxPlayers: 32,
      registeredPlayers: 28,
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-05'),
      createdAt: new Date('2024-09-01'),
    },
    {
      id: 'tour-002',
      tenantId: 'tenant-001',
      name: 'Weekly League',
      format: 'round_robin',
      status: 'active',
      maxPlayers: 16,
      registeredPlayers: 16,
      startDate: new Date('2024-11-01'),
      createdAt: new Date('2024-10-20'),
    },
  ],

  analyticsEvents: [
    {
      id: 'event-001',
      tenantId: 'tenant-001',
      userId: 'user-001',
      eventType: 'tournament_joined',
      eventData: { tournamentId: 'tour-001' },
      createdAt: new Date('2024-10-01'),
    },
    {
      id: 'event-002',
      tenantId: 'tenant-001',
      userId: 'user-001',
      eventType: 'subscription_upgraded',
      eventData: { from: 'basic', to: 'professional' },
      createdAt: new Date('2024-10-15'),
    },
  ],
};

/**
 * Mock Session (for API tests)
 */
export const mockSession = {
  user: {
    id: 'user-001',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
  },
  tenantId: 'tenant-001',
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Create mock Next.js request
 */
export function createMockRequest(
  method: string,
  url: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
) {
  const urlObj = new URL(url, 'http://localhost:3000');

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
  }

  return new Request(urlObj.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Helper to assert error response
 */
export function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedMessage?: string
) {
  expect(response.status).toBe(expectedStatus);
  if (expectedMessage) {
    expect(response.statusText).toContain(expectedMessage);
  }
}

/**
 * Helper to parse JSON response
 */
export async function parseJsonResponse(response: Response) {
  const text = await response.text();
  return JSON.parse(text);
}

/**
 * Date helpers for tests
 */
export const dateHelpers = {
  today: () => new Date(),
  yesterday: () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  },
  lastMonth: () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  },
  nextMonth: () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  },
  startOfMonth: (date: Date = new Date()) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },
  endOfMonth: (date: Date = new Date()) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  },
};

/**
 * Wait helper for async tests
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  Object.values(mockRevenueMetricsModel).forEach((mock) => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockSubscriptionModel).forEach((mock) => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockUserModel).forEach((mock) => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockTournamentModel).forEach((mock) => {
    if (typeof mock === 'function') mock.mockReset();
  });
  Object.values(mockAnalyticsEventModel).forEach((mock) => {
    if (typeof mock === 'function') mock.mockReset();
  });
}
