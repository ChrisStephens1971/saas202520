/**
 * Notifications Page Tests
 * Tests for notification center page (Task B)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import NotificationsPage from '../page';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('NotificationsPage', () => {
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
    it('should redirect to login if user is not authenticated', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(redirect).toHaveBeenCalledWith('/login');
      });
    });

    it('should render page when user is authenticated', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading message while fetching', () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'loading',
        update: vi.fn(),
      });

      render(<NotificationsPage />);
      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    });
  });

  describe('Notification Display', () => {
    it('should fetch and display notifications', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Test Subject',
          message: 'Test message 1',
          status: 'sent',
          createdAt: new Date('2025-11-08T10:00:00Z').toISOString(),
          deliveredAt: null,
          metadata: null,
        },
        {
          id: 'notif-2',
          type: 'in_app',
          subject: null,
          message: 'Test message 2',
          status: 'delivered',
          createdAt: new Date('2025-11-08T09:00:00Z').toISOString(),
          deliveredAt: new Date('2025-11-08T09:01:00Z').toISOString(),
          metadata: null,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Subject')).toBeInTheDocument();
        expect(screen.getByText('Test message 1')).toBeInTheDocument();
        expect(screen.getByText('Test message 2')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications?orgId=org-123&type=in_app&limit=50')
      );
    });

    it('should show empty state when no notifications', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
        expect(
          screen.getByText("You're all caught up! No new notifications at this time.")
        ).toBeInTheDocument();
      });
    });

    it('should highlight unread notifications with blue border', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Unread',
          message: 'This is unread',
          status: 'sent',
          createdAt: new Date().toISOString(),
          deliveredAt: null,
          metadata: null,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        const unreadNotification = screen.getByText('This is unread').closest('div');
        expect(unreadNotification?.parentElement).toHaveClass('border-l-4', 'border-blue-500');
      });
    });

    it('should display "New" badge for unread notifications', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Unread',
          message: 'This is unread',
          status: 'sent',
          createdAt: new Date().toISOString(),
          deliveredAt: null,
          metadata: null,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });
    });
  });

  describe('Mark as Read Functionality', () => {
    it('should call API and update notification when marked as read', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Test',
          message: 'Test message',
          status: 'sent',
          createdAt: new Date().toISOString(),
          deliveredAt: null,
          metadata: null,
        },
      ];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: mockNotifications }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Mark as read')).toBeInTheDocument();
      });

      const markAsReadButton = screen.getByText('Mark as read');
      fireEvent.click(markAsReadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/notif-1/read',
          expect.objectContaining({ method: 'PATCH' })
        );
      });

      // Button should disappear after marking as read
      await waitFor(() => {
        expect(screen.queryByText('Mark as read')).not.toBeInTheDocument();
      });
    });

    it('should not show mark as read button for already read notifications', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Test',
          message: 'Test message',
          status: 'delivered',
          createdAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString(),
          metadata: null,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      expect(screen.queryByText('Mark as read')).not.toBeInTheDocument();
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

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('orgId=org-456'));
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
        expect(screen.getByText(/Failed to fetch notifications/)).toBeInTheDocument();
      });
    });

    it('should handle mark as read errors gracefully', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Test',
          message: 'Test message',
          status: 'sent',
          createdAt: new Date().toISOString(),
          deliveredAt: null,
          metadata: null,
        },
      ];

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: mockNotifications }),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Mark as read')).toBeInTheDocument();
      });

      const markAsReadButton = screen.getByText('Mark as read');
      fireEvent.click(markAsReadButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error marking notification as read:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Time Formatting', () => {
    it('should display relative time for notifications', async () => {
      vi.mocked(useSession).mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
        update: vi.fn(),
      });

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'in_app',
          subject: 'Recent',
          message: 'Test message',
          status: 'sent',
          createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          deliveredAt: null,
          metadata: null,
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      } as Response);

      render(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/ago/)).toBeInTheDocument();
      });
    });
  });
});
