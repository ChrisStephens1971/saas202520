'use client';

/**
 * Notification Bell Icon with Unread Count Badge
 * Shows unread in-app notifications and links to notification center
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.orgId) return;

    async function fetchUnreadCount() {
      try {
        const orgId = session.user.orgId;
        const response = await fetch(
          `/api/notifications?orgId=${orgId}&type=in_app&status=sent&limit=100`
        );

        if (response.ok) {
          const data = await response.json();
          // Count notifications that aren't delivered yet (unread)
          const unread = data.notifications.filter(
            (n: Notification) => n.status !== 'delivered'
          ).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUnreadCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label="View notifications"
    >
      {/* Bell Icon (Heroicons bell) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6 text-gray-700"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>

      {/* Unread Count Badge */}
      {!loading && unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[18px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
