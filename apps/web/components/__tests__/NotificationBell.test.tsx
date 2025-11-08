/**
 * NotificationBell Component Tests
 * Tests for notification bell icon with unread count badge (Task B)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import NotificationBell from '../NotificationBell';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('NotificationBell', () => {
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
    global.fetch = vi.fn();
  });

  describe('Authentication', () => {
    it('should not render if user is not authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { container } = render(<NotificationBell />);
      expect(container.firstChild).toBeNull();
    });

    it('should render bell icon when user is authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response);

      render(<NotificationBell />);
      expect(screen.getByLabelText('View notifications')).toBeInTheDocument();
    });
  });

  describe('Unread Count Display', () => {
    it('should fetch and display unread notification count', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        { id: '1', type: 'in_app', message: 'Test 1', status: 'sent', createdAt: new Date().toISOString() },
        { id: '2', type: 'in_app', message: 'Test 2', status: 'sent', createdAt: new Date().toISOString() },
        { id: '3', type: 'in_app', message: 'Test 3', status: 'delivered', createdAt: new Date().toISOString() },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications?orgId=org-123&type=in_app')
      );
    });

    it('should display 99+ for counts greater than 99', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = Array.from({ length: 105 }, (_, i) => ({
        id: `${i}`,
        type: 'in_app',
        message: `Test ${i}`,
        status: 'sent',
        createdAt: new Date().toISOString(),
      }));

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });

    it('should not display badge if no unread notifications', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        { id: '1', type: 'in_app', message: 'Test 1', status: 'delivered', createdAt: new Date().toISOString() },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Organization Isolation', () => {
    it('should only fetch notifications for user organization', async () => {
      const customSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          orgId: 'org-456',
        },
      };

      vi.mocked(useSession).mockReturnValue({
        data: customSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('orgId=org-456')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<NotificationBell />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching unread notifications:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle non-ok response', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<NotificationBell />);

      // Component should render without badge on error
      await waitFor(() => {
        expect(screen.getByLabelText('View notifications')).toBeInTheDocument();
        expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh', () => {
    it('should refresh unread count every 30 seconds', async () => {
      vi.useFakeTimers();

      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response);

      render(<NotificationBell />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('Link Navigation', () => {
    it('should link to notifications page', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response);

      render(<NotificationBell />);

      await waitFor(() => {
        const link = screen.getByLabelText('View notifications');
        expect(link).toHaveAttribute('href', '/notifications');
      });
    });
  });
});
