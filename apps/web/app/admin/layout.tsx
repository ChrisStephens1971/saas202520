/**
 * Admin Layout
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Layout for admin section with sidebar navigation
 * Only accessible to users with 'owner' role
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { isOwner } from '@/lib/permissions';
import NotificationBell from '@/components/NotificationBell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  // Require authentication
  if (!session?.user) {
    redirect('/login?callbackUrl=/admin');
  }

  // Check if user is owner (admin access)
  const userIsOwner = await isOwner(session.user.id, session.user.orgId);

  if (!userIsOwner) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <AdminNav user={session.user} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Header Space */}
        <header className="border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>

            {/* User Info */}
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="text-sm text-right">
                <p className="font-medium text-gray-900 dark:text-white">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {session.user.orgSlug} • {session.user.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
