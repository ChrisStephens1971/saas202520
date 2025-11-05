/**
 * Unit tests for rate limiting and compliance features
 * Sprint 4 - NOTIFY-006, NOTIFY-007
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkEmailRateLimit,
  checkSMSRateLimit,
  getRateLimitStats,
  getDeliveryStats,
  isPlayerOptedOut,
  isWithinQuietHours,
  validateNotificationDelivery,
  trackNotificationDelivery,
} from '@/lib/rate-limiter';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Upstash
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({
    setex: vi.fn().mockResolvedValue('OK'),
    keys: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('@upstash/ratelimit', () => {
  const RatelimitMock = vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 5,
      reset: Date.now() + 60000,
    }),
  }));
  RatelimitMock.slidingWindow = vi.fn();
  return { Ratelimit: RatelimitMock };
});

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkEmailRateLimit', () => {
    it('should return success when within rate limit', async () => {
      const result = await checkEmailRateLimit('org-123');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.retryAfter).toBeUndefined();
    });
  });

  describe('checkSMSRateLimit', () => {
    it('should return success when within rate limit', async () => {
      const result = await checkSMSRateLimit('org-123');

      expect(result.success).toBe(true);
      expect(result.limit).toBeDefined();
      expect(result.remaining).toBeDefined();
    });
  });

  describe('getRateLimitStats', () => {
    it('should return rate limit statistics', async () => {
      const stats = await getRateLimitStats('org-123', 'email');

      expect(stats).toHaveProperty('current');
      expect(stats).toHaveProperty('limit');
      expect(stats).toHaveProperty('remaining');
      expect(stats).toHaveProperty('resetAt');
      expect(stats).toHaveProperty('violations24h');
      expect(stats.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics for a period', async () => {
      const mockNotifications = [
        { status: 'delivered', type: 'email' },
        { status: 'delivered', type: 'sms' },
        { status: 'failed', type: 'email' },
        { status: 'pending', type: 'in_app' },
      ];

      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce(
        mockNotifications as never
      );

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-07');
      const stats = await getDeliveryStats('org-123', start, end);

      expect(stats.total).toBe(4);
      expect(stats.delivered).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.byType.email.total).toBe(2);
      expect(stats.byType.email.delivered).toBe(1);
      expect(stats.byType.email.failed).toBe(1);
      expect(stats.byType.sms.total).toBe(1);
      expect(stats.byType.sms.delivered).toBe(1);
      expect(stats.byType.in_app.total).toBe(1);
    });

    it('should return zero stats when no notifications found', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce([]);

      const start = new Date('2025-01-01');
      const end = new Date('2025-01-07');
      const stats = await getDeliveryStats('org-123', start, end);

      expect(stats.total).toBe(0);
      expect(stats.delivered).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('trackNotificationDelivery', () => {
    it('should update notification status on success', async () => {
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        id: 'notif-123',
        status: 'delivered',
      } as never);

      await trackNotificationDelivery('notif-123', 'success');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          status: 'delivered',
          deliveredAt: expect.any(Date),
          errorMessage: undefined,
        },
      });
    });

    it('should update notification status on failure with error message', async () => {
      vi.mocked(prisma.notification.update).mockResolvedValueOnce({
        id: 'notif-123',
        status: 'failed',
      } as never);

      await trackNotificationDelivery('notif-123', 'failure', 'SMTP error');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          status: 'failed',
          deliveredAt: null,
          errorMessage: 'SMTP error',
        },
      });
    });
  });

  describe('isPlayerOptedOut', () => {
    it('should return true when player has opted out', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce({
        playerId: 'player-123',
        smsOptedOut: true,
      } as never);

      const result = await isPlayerOptedOut('player-123');

      expect(result).toBe(true);
    });

    it('should return false when player has not opted out', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce({
        playerId: 'player-123',
        smsOptedOut: false,
      } as never);

      const result = await isPlayerOptedOut('player-123');

      expect(result).toBe(false);
    });

    it('should return false when no preferences found', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        null
      );

      const result = await isPlayerOptedOut('player-123');

      expect(result).toBe(false);
    });
  });

  describe('isWithinQuietHours', () => {
    it('should return true when current time is within quiet hours', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce({
        playerId: 'player-123',
        quietHoursStart: '00:00', // Midnight
        quietHoursEnd: '23:59', // Almost midnight
        timezone: 'America/New_York',
      } as never);

      const result = await isWithinQuietHours('player-123');

      expect(result).toBe(true); // Should always be true with this range
    });

    it('should return false when no quiet hours set', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce({
        playerId: 'player-123',
        quietHoursStart: null,
        quietHoursEnd: null,
      } as never);

      const result = await isWithinQuietHours('player-123');

      expect(result).toBe(false);
    });

    it('should return false when no preferences found', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce(
        null
      );

      const result = await isWithinQuietHours('player-123');

      expect(result).toBe(false);
    });
  });

  describe('validateNotificationDelivery', () => {
    it('should allow email notification when no restrictions', async () => {
      const result = await validateNotificationDelivery('player-123', 'email');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block SMS when player has opted out', async () => {
      vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValueOnce({
        playerId: 'player-123',
        smsOptedOut: true,
      } as never);

      const result = await validateNotificationDelivery('player-123', 'sms');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('opted out');
    });

    it('should block SMS when within quiet hours', async () => {
      // Mock opt-out check (not opted out)
      vi.mocked(prisma.notificationPreference.findUnique)
        .mockResolvedValueOnce({
          playerId: 'player-123',
          smsOptedOut: false,
        } as never)
        // Mock quiet hours check (within quiet hours)
        .mockResolvedValueOnce({
          playerId: 'player-123',
          quietHoursStart: '00:00',
          quietHoursEnd: '23:59',
          timezone: 'America/New_York',
        } as never);

      const result = await validateNotificationDelivery('player-123', 'sms');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('quiet hours');
    });

    it('should allow SMS when all checks pass', async () => {
      // Mock opt-out check (not opted out)
      vi.mocked(prisma.notificationPreference.findUnique)
        .mockResolvedValueOnce({
          playerId: 'player-123',
          smsOptedOut: false,
        } as never)
        // Mock quiet hours check (no quiet hours)
        .mockResolvedValueOnce({
          playerId: 'player-123',
          quietHoursStart: null,
          quietHoursEnd: null,
        } as never);

      const result = await validateNotificationDelivery('player-123', 'sms');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
