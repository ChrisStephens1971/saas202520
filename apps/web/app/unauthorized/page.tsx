/**
 * Unauthorized Access Page
 * Sprint 9 Phase 2 - Admin Dashboard
 *
 * Shown when user tries to access admin routes without proper permissions
 */

import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function UnauthorizedPage() {
  const session = await auth();

  // If not logged in, redirect to login
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          <span className="text-8xl">🔒</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don&apos;t have permission to access this page. Admin features are only available to
          organization owners.
        </p>

        {/* User Info */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Logged in as:</p>
          <p className="font-medium text-gray-900 dark:text-white">{session.user.email}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Role: <span className="font-medium">{session.user.role}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Organization: <span className="font-medium">{session.user.orgSlug}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/tournaments"
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            View Tournaments
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
          If you believe you should have access to this page, please contact your organization
          owner.
        </p>
      </div>
    </div>
  );
}
