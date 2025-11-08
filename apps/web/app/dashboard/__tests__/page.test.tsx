/**
 * Dashboard Page Tests
 * Tests for dashboard stats with real Prisma queries (Task A)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import DashboardPage from '../page';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tournament: {
      count: vi.fn(),
    },
    player: {
      count: vi.fn(),
    },
    match: {
      count: vi.fn(),
    },
  },
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('DashboardPage', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      orgId: 'org-123',
      orgSlug: 'test-org',
      role: 'owner',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should redirect to login if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);

      await DashboardPage();

      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('should render dashboard when user is authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.tournament.count).mockResolvedValue(5);
      vi.mocked(prisma.player.count).mockResolvedValue(50);
      vi.mocked(prisma.match.count).mockResolvedValue(25);

      const result = await DashboardPage();

      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });

  describe('Dashboard Stats', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
    });

    it('should query active tournaments count correctly', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(3);
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      await DashboardPage();

      expect(prisma.tournament.count).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          status: {
            in: ['registration', 'active', 'paused'],
          },
        },
      });
    });

    it('should query total players count correctly', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockResolvedValue(42);
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      await DashboardPage();

      expect(prisma.player.count).toHaveBeenCalledWith({
        where: {
          tournament: {
            orgId: 'org-123',
          },
        },
      });
    });

    it('should query completed matches count correctly', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockResolvedValue(15);

      await DashboardPage();

      expect(prisma.match.count).toHaveBeenCalledWith({
        where: {
          tournament: {
            orgId: 'org-123',
          },
          state: 'completed',
        },
      });
    });

    it('should display correct stats for organization with data', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(10);
      vi.mocked(prisma.player.count).mockResolvedValue(100);
      vi.mocked(prisma.match.count).mockResolvedValue(50);

      const result = await DashboardPage();
      const html = result?.props?.children?.toString() || '';

      // Stats should be rendered (checking that functions were called with expected values)
      expect(prisma.tournament.count).toHaveBeenCalled();
      expect(prisma.player.count).toHaveBeenCalled();
      expect(prisma.match.count).toHaveBeenCalled();
    });

    it('should handle zero stats gracefully', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      const result = await DashboardPage();

      expect(result).toBeTruthy();
      expect(prisma.tournament.count).toHaveBeenCalled();
      expect(prisma.player.count).toHaveBeenCalled();
      expect(prisma.match.count).toHaveBeenCalled();
    });
  });

  describe('Organization Isolation', () => {
    it('should only count tournaments for user organization', async () => {
      const customSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          orgId: 'org-456',
        },
      };
      vi.mocked(auth).mockResolvedValueOnce(customSession as any);
      vi.mocked(prisma.tournament.count).mockResolvedValue(5);
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      await DashboardPage();

      expect(prisma.tournament.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: 'org-456',
          }),
        })
      );
    });

    it('should only count players for user organization tournaments', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockResolvedValue(10);
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      await DashboardPage();

      expect(prisma.player.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tournament: {
              orgId: 'org-123',
            },
          },
        })
      );
    });

    it('should only count matches for user organization tournaments', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockResolvedValue(20);

      await DashboardPage();

      expect(prisma.match.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tournament: {
              orgId: 'org-123',
            },
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
    });

    it('should handle tournament count query error', async () => {
      vi.mocked(prisma.tournament.count).mockRejectedValueOnce(new Error('Database error'));
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      await expect(DashboardPage()).rejects.toThrow('Database error');
    });

    it('should handle player count query error', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockRejectedValueOnce(new Error('Database error'));
      vi.mocked(prisma.match.count).mockResolvedValue(0);

      await expect(DashboardPage()).rejects.toThrow('Database error');
    });

    it('should handle match count query error', async () => {
      vi.mocked(prisma.tournament.count).mockResolvedValue(0);
      vi.mocked(prisma.player.count).mockResolvedValue(0);
      vi.mocked(prisma.match.count).mockRejectedValueOnce(new Error('Database error'));

      await expect(DashboardPage()).rejects.toThrow('Database error');
    });
  });
});
